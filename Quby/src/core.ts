"use strict";

///<reference path='../quby.ts' />

/**
 * quby.core
 * 
 * This is the guts of the Quby parser,
 * which binds the rest of it together.
 * 
 * It includes the internal parser,
 * the verifier, and the printing mechanism.
 * 
 * It's mostly stuff that doesn't really
 * belong in main (because that is public),
 * whilst not really belonging in any other
 * section.
 */
module quby {
    export module core {
        var util = utilTs.util;

        var qubyParser = qubyParserTs.quby.parser;
        var qubyMain = qubyMainTs.quby.main;
        var qubyRuntime = qubyRuntimeTs.quby.runtime;

        var STATEMENT_END = ';\n';

        /**
         * This is the point that joins together
         * quby.main to quby.core.
         *
         * Given a quby.main.ParserInstance, and a
         * quby.core.Validator, this will run the
         * actual parse process and pump the results
         * through the validator.
         *
         * It accesses the internal properties of
         * objects freely, because this is to hide
         * their access from teh public API (namely
         * the ParserInstance).
         */
        export function runParser(instance, validator: Validator) {
            var callback = instance.whenFinished,
                debugCallback = instance.debugCallback,
                source = instance.source,
                name = instance.getName();

            qubyParser.parse(
                    source,
                    instance,

                    function(program, errors) {
                        validator.adminMode(instance.isAdmin);
                        validator.strictMode(instance.isStrict);

                        validator.validate(program, errors);

                        if (callback !== undefined && callback !== null) {
                            util.future.runFun(callback);
                        }

                        instance.hasParsed = true;
                    },

                    debugCallback
            );
        }

        /**
         * Turns the given error into the output string
         * that should be displayed for the user.
         *
         * You can imagine that this is the checkpoint
         * between whatever internal format we use, and
         * what the outside world is going to see.
         *
         * @param src The source code object used for finding the lines.
         * @param error The error to parse.
         * @return Info on the error, for display purposes.
         */
        var formatError = function(error): { line: number; msg: string; } {
            var errLine = error.getLine(),
                strErr;

            if (error.isSymbol) {
                strErr = "error parsing '" + error.match + "'";
            } else if (error.isTerminal) {
                if (error.isLiteral || util.string.trim(error.match) === '') {
                    strErr = "syntax error near '" + error.terminalName + "'";
                } else {
                    strErr = "syntax error near " + error.terminalName + " '" + error.match + "'";
                }
            } else {
                throw new Error("Unknown parse.js error given to format");
            }

            return {
                line: errLine,
                msg: strErr
            };
        }

        export class Validator {
            constructor() {
                // the various program trees that have been parsed
                this.programs = [];

                this.lastErrorName = null;

                this.isStrict = true;

                this.classes = {};
                this.currentClass = null;
                this.rootClass = new RootClassProxy();

                this.calledMethods = {};

                this.vars = [];
                this.funVars = [];
                this.isBlock = [];

                this.globals = {};
                this.usedGlobals = {};

                this.funs = {};
                this.usedFunsStack = [];

                /**
                 * This is a list of every method name in existance,
                 * across all code.
                 * 
                 * This is for printing the empty method stubs,
                 * for when no methods are present for a class.
                 */
                this.methodNames = new FunctionTable();

                this.lateUsedFuns = new LateFunctionBinder(this);
                this.errors = [];

                this.isParameters = false;
                this.isFunParameters = false;

                this.inConstructor = false;

                this.endValidateCallbacks = [];

                this.preInlines = [];

                // When 0, we are outside of a function's scope.
                // The scope is added when we enter a function definition.
                // From then on every extra layer of scope increments it further,
                // and every time we move down it is decremented until we exit the function.

                // Why??? When 0, we can scan all layers of this.vars looking for local variables.
                // When greater then 0 we can scan all layers (decrementing on each) until funCount == 0.
                this.funCount = 0;
                this.currentFun = null;
                this.isAdminMode = false;

                this.symbols = new SymbolTable();

                this.pushScope();
            }

            strictMode(mode) {
                this.isStrict = !!mode;
            }

            adminMode(mode) {
                this.isAdminMode = !!mode;
            }

            addPreInline(inline) {
                this.preInlines.push(inline);
            }

            addSymbol(sym) {
                this.symbols.add(sym);
            }

            setInConstructor(inC) {
                this.inConstructor = inC;
            }
            isInConstructor() {
                return this.inConstructor;
            }

            setClass(klass) {
                if (this.currentClass != null) {
                    this.parseError(klass.offset, "Class '" + klass.name + "' is defined inside '" + this.currentClass.klass.name + "', cannot define a class within a class.");
                }

                var klassName = klass.callName;
                var kVal = this.classes[klassName];

                if (!kVal) {
                    kVal = new ClassValidator(this, klass);
                    this.classes[klassName] = kVal;
                } else {
                    var oldKlass = kVal.klass;
                    var oldKlassHead = oldKlass.header;
                    var klassHead = klass.header;

                    // if super relationship is set later in the app
                    if (!oldKlassHead.hasSuper() && klassHead.hasSuper()) {
                        oldKlass.header = klassHead;
                    } else if (oldKlassHead.hasSuper() && klassHead.hasSuper()) {
                        if (oldKlassHead.getSuperCallName() != klassHead.getSuperCallName()) {
                            this.parseError(klass.offset, "Super class cannot be redefined for class '" + klass.name + "'.");
                        }
                    }
                }

                if (klass.callName == qubyRuntime.ROOT_CLASS_CALL_NAME) {
                    this.rootClass.setClass(kVal);
                }
                this.lateUsedFuns.setClassVal(kVal);

                return (this.currentClass = kVal);
            }
            getClass(callName) {
                return this.classes[callName];
            }
            getCurrentClass() {
                return this.currentClass;
            }
            getRootClass() {
                return this.rootClass;
            }
            unsetClass() {
                this.currentClass = null;
            }
            isInsideClass() {
                return this.currentClass != null;
            }
            isInsideExtensionClass() {
                return this.currentClass != null && this.currentClass.klass.isExtensionClass;
            }
            useField(field) {
                this.currentClass.useField(field);
            }
            assignField(field) {
                this.currentClass.assignField(field);
            }
            useThisClassFun(fun) {
                this.currentClass.useFun(fun);
            }

            setParameters(isParameters, isFun) {
                this.isParameters = isParameters;
                this.isFunParameters = !!isFun;
            }

            isInsideParameters() {
                return this.isParameters;
            }
            isInsideFunParameters() {
                return this.isParameters && this.isFunParameters;
            }
            isInsideBlockParameters() {
                return this.isParameters && !this.isFunParameters;
            }

            isInsideClassDefinition() {
                return this.isInsideClass() && !this.isInsideFun();
            }

            pushScope() {
                this.vars.push({});
                this.isBlock.push(false);

                if (this.isInsideFun()) {
                    this.funCount++;
                }
            }
            pushFunScope(fun) {
                if (this.currentFun != null) {
                    qubyRuntime.error("Fun within Fun", "Defining a function whilst already inside another function.");
                }

                this.currentFun = fun;
                this.funCount++;
                this.vars.push({});
                this.isBlock.push(false);
            }
            pushBlockScope() {
                this.pushScope();
                this.isBlock[this.isBlock.length - 1] = true;
            }

            popScope() {
                this.isBlock.pop();

                if (this.isInsideFun()) {
                    this.funCount--;

                    if (this.funCount <= 0) {
                        var rootFVars = this.vars.pop();

                        for (var i = 0; i < this.funVars.length; i++) {
                            var fVars = this.funVars[i];

                            for (var key in fVars) {
                                if (rootFVars[key] == undefined) {
                                    this.currentFun.addPreVariable(fVars[key]);
                                }
                            }
                        }

                        this.currentFun = null;
                        this.funVars = [];
                    } else {
                        this.funVars.push(this.vars.pop());
                    }
                } else {
                    this.vars.pop();
                }
            }

            /**
            * Returns true or false stating if the validator is within a scope
            * somewhere within a function. This could be within the root scope of
            * the function, or within a scope within that.
            *
            * @return True if the validator is within a function, somewhere.
            */
            isInsideFun(stmt) {
                return this.currentFun != null;
            }

            /**
            * Returns true or false stating if the validator is currently inside of
            * a block function.
            *
            * @return True if the validator is inside a block, otherwise false.
            */
            isInsideBlock() {
                return this.isBlock[this.isBlock.length - 1];
            }

            getCurrentFun() {
                return this.currentFun;
            }
            isConstructor() {
                return this.currentFun != null && this.currentFun.isConstructor;
            }

            assignVar(variable) {
                this.vars[this.vars.length - 1][variable.callName] = variable;
            }
            containsVar(variable) {
                var id = variable.callName;

                var stop;
                if (this.isInsideFun()) {
                    stop = this.vars.length - this.funCount;
                } else {
                    stop = 0;
                }

                for (var i = this.vars.length - 1; i >= stop; i--) {
                    if (this.vars[i][id] != undefined) {
                        return true;
                    }
                }

                return false;
            }
            containsLocalVar(variable) {
                var id = variable.callName;
                var scope = this.vars[this.vars.length - 1];

                return !!scope[id];
            }
            containsLocalBlock() {
                var localVars = this.vars[this.vars.length - 1];

                for (var key in localVars) {
                    var blockVar = localVars[key];
                    if (blockVar.isBlockVar) {
                        return true;
                    }
                }

                return false;
            }

            assignGlobal(global) {
                this.globals[global.callName] = true;
            }
            useGlobal(global) {
                this.usedGlobals[global.callName] = global;
            }

            /**
             * Declares a function.
             *
             * By 'function' I mean function, constructor, method or function-generator.
             *
             * @param func
             */
            defineFun(func) {
                var klass = this.currentClass;

                // Methods / Constructors
                if (klass !== null) {
                    // Constructors
                    if (func.isConstructor) {
                        klass.addNew(func);
                        // Methods
                    } else {
                        klass.addFun(func);
                        this.methodNames.add(func.callName, func.name);
                    }
                    // Functions
                } else {
                    if (this.funs[func.callName]) {
                        this.parseError(func.offset, "Function is already defined: '" + func.name + "', with " + func.getNumParameters() + " parameters.");
                    }

                    this.funs[func.callName] = func;
                }
            }

            /* Store any functions which have not yet been defined.
            * Note that this will include valid function calls which are defined after
            * the call, but this is sorted in the endValidate section. */
            useFun(fun) {
                if (fun.isMethod) {
                    this.calledMethods[fun.callName] = fun;
                } else if (this.isInsideClass()) {
                    if (this.currentClass.hasFun(fun)) {
                        fun.setIsMethod();
                    } else {
                        this.lateUsedFuns.addFun(fun);
                    }
                } else if (!this.funs[fun.callName]) {
                    this.usedFunsStack.push(fun);
                }
            }

            /**
             * Strict Errors are errors which we can live with,
             * and will not impact on the resulting program,
             * but should really be fixed.
             *
             * This is mostly here to smooth over the cracks
             * when breaking changes are made.
             *
             * Old version can stay, and the new one can be
             * enforced as a strict error (presuming that
             * behaviour does not change).
             */
            strictError(lineInfo, msg) {
                if (this.isStrict) {
                    this.parseError(lineInfo, msg);
                }
            }

            parseError(sym, msg) {
                if (sym) {
                    this.parseErrorLine(sym.getLine(), msg, sym.name);
                } else {
                    this.parseErrorLine(null, msg);
                }
            }

            parseErrorLine(line, error, name) {
                var msg;

                if (line !== null && line !== undefined || line < 1) {
                    msg = "line " + line + ", " + error;
                } else {
                    msg = error
                    line = -1;
                }

                if (!name && name !== '') {
                    name = this.lastErrorName;
                } else {
                    this.lastErrorName = name;
                }

                this.errors.push({
                    name: name,
                    line: line,
                    message: msg,
                    error: error
                });
            }

            getErrors() {
                var errors = this.errors;

                if (errors.length > 0) {
                    errors.sort(function(a, b) {
                        if (a.name === b.name) {
                            return a.line - b.line;
                        } else {
                            return a.name.localeCompare(b.name);
                        }
                    });
                }

                return errors;
            }

            hasErrors() {
                return this.errors.length > 0;
            }

            /**
             * Pass in a function and it will be called by the validator at the
             * end of validation. Note that all other validation occurres before
             * these callbacks are called.
             *
             * These are called in a FIFO order, but bear in mind that potentially
             * anything could have been added before your callback.
             */
            onEndValidate(callback) {
                this.endValidateCallbacks.push(callback);
            }

            /**
             * Validator should no longer be used after this is called.
             * It performs all of the final steps needed on the program and then
             * returns the output code.
             *
             * Note that output code is only returned if the program is valid.
             *
             * If it is not valid, then an empty string is returned. This is
             * done because printing an invalid program will either lead to
             * random errors (validation items being missing during the print),
             * or at best, you will receive an incomplete program with random
             * bits missing (which shouldn't be used).
             */
            finaliseProgram() {
                this.endValidate();

                if (this.hasErrors()) {
                    return '';
                } else {
                    return this.generateCode();
                }
            }

            // adds a program to be validated by this Validator
            validate(program, errors) {
                // clear this, so errors don't seap across multiple validations
                this.lastErrorName = null;

                if (errors === null || errors.length === 0) {
                    if (!program) {
                        // avoid unneeded error messages
                        if (this.errors.length === 0) {
                            this.strictError(null, "No source code provided");
                        }
                    } else {
                        try {
                            program.validate(this);
                            this.programs.push(program);
                        } catch (err) {
                            this.parseError(null, 'Unknown issue with your code has caused the parser to crash!');

                            if (window.console && window.console.log) {
                                window.console.log(err);

                                if (err.stack) {
                                    window.console.log(err.stack);
                                }
                            }
                        }
                    }
                } else {
                    for (var i = 0; i < errors.length; i++) {
                        var error = formatError(errors[i]);
                        this.parseErrorLine(error.line, error.msg);
                    }
                }
            }

            /**
             * Private.
             *
             * Runs all final validation checks.
             * After this step the program is fully validated.
             */
            endValidate() {
                try {
                    /* Go through all function calls we have stored, which have not been
                     * confirmed as being defined. Note this can include multiple calls
                     * to the same functions. */
                    for (var usedFunsI in this.usedFunsStack) {
                        var fun = this.usedFunsStack[usedFunsI];
                        var callName = fun.callName;

                        // check if the function is not defined
                        if (!this.funs[callName]) {
                            this.searchMissingFunAndError(fun, this.funs, 'function');
                        }
                    }

                    /* Check all used globals were assigned to, at some point. */
                    for (var strGlobal in this.usedGlobals) {
                        if (!this.globals[strGlobal]) {
                            var global = this.usedGlobals[strGlobal];
                            this.parseError(global.offset, "Global used but never assigned to: '" + global.identifier + "'.");
                        }
                    }

                    /* finalise all classes */
                    for (var klassI in this.classes) {
                        var klass = this.classes[klassI];
                        klass.endValidate();
                    }

                    /* Ensure all called methods do exist (somewhere) */
                    for (var methodI in this.calledMethods) {
                        var methodFound = false;
                        var method = this.calledMethods[methodI];

                        for (var klassI in this.classes) {
                            if (this.classes[klassI].hasFun(method)) {
                                methodFound = true;
                                break;
                            }
                        }

                        if (!methodFound) {
                            var found = this.searchForMethodLike(method),
                                name = method.name.toLowerCase(),
                                errMsg = null;

                            if (found !== null) {
                                if (name === found.name.toLowerCase()) {
                                    errMsg = "Method '" + method.name + "' called with incorrect number of parameters, " + method.getNumParameters() + " instead of " + found.getNumParameters();
                                } else {
                                    errMsg = "Method '" + method.name + "' called with " + method.getNumParameters() + " parameters, but is not defined in any class. Did you mean: '" + found.name + "'?";
                                }
                            } else {
                                // no alternative method found
                                errMsg = "Method '" + method.name + "' called with " + method.getNumParameters() + " parameters, but is not defined in any class.";
                            }

                            this.parseError(method.offset, errMsg);
                        }
                    }

                    this.lateUsedFuns.endValidate(this.funs);

                    // finally, run the callbacks
                    while (this.endValidateCallbacks.length > 0) {
                        var callback = this.endValidateCallbacks.shift();
                        callback(this);
                    }
                } catch (err) {
                    this.parseError(null, 'Unknown issue with your code has caused the parser to crash!');

                    if (window.console && window.console.log) {
                        if (err.stack) {
                            window.console.log(err.stack);
                        } else {
                            window.console.log(err);
                        }
                    }
                }
            }

            /**
             * Turns all stored programs into
             */
            generateCode() {
                var printer = new Printer();

                printer.setCodeMode(false);
                this.generatePreCode(printer);
                printer.setCodeMode(true);

                for (var i = 0; i < this.programs.length; i++) {
                    this.programs[i].print(printer);
                }

                return printer.toString();
            }

            generateNoSuchMethodStubs(p) {
                // generate the noSuchMethod function stubs
                if (!quby.compilation.hints.useMethodMissing()) {
                    var rootKlass = this.getRootClass().getClass();
                    var callNames = [];
                    var extensionStr = [];
                    var ms = this.methodNames.getFuns();

                    p.append(qubyRuntime.FUNCTION_DEFAULT_TABLE_NAME, "={");

                    var errFun = ":function(){quby_errFunStub(this,arguments);}";
                    var printComma = false;
                    for (var callName in ms) {
                        if (
                                rootKlass === null ||
                                !rootKlass.hasFunCallName(callName)
                        ) {
                            // from second iteration onwards, this if is called
                            if (printComma) {
                                p.append(',', callName, ':function(){noSuchMethodError(this,"' + callName + '");}');
                                // this else is run on first iteration
                            } else {
                                p.append(callName, ':function(){noSuchMethodError(this,"' + callName + '");}');
                                printComma = true;
                            }

                            callNames[callNames.length] = callName;
                            extensionStr[extensionStr.length] = ['.prototype.', callName, '=', qubyRuntime.FUNCTION_DEFAULT_TABLE_NAME, '.', callName].join('');
                        }
                    }

                    p.append("}");
                    p.endStatement();

                    // print empty funs for each Extension class
                    var classes = qubyRuntime.CORE_CLASSES;
                    var numNames = callNames.length;
                    for (var i = 0; i < classes.length; i++) {
                        var name = classes[i];
                        var transName = qubyRuntime.translateClassName(name);
                        var thisKlass = this.getClass(name);

                        for (var j = 0; j < callNames.length; j++) {
                            var callName = callNames[j];

                            if (thisKlass === undefined || !thisKlass.hasFunCallName(callName)) {
                                p.append(transName, extensionStr[j]);
                                p.endStatement();
                            }
                        }
                    }

                    if (rootKlass !== null) {
                        rootKlass.setNoMethPrintFuns(callNames);
                    }
                }
            }

            generatePreCode(p) {
                this.methodNames.print(p);
                this.symbols.print(p);
                p.printArray(this.preInlines);

                this.generateNoSuchMethodStubs(p);

                // print the Object functions for each of the extension classes
                var classes = qubyRuntime.CORE_CLASSES;
                var stmts = this.rootClass.getPrintStmts();
                for (var i = 0; i < classes.length; i++) {
                    var name = classes[i];
                    p.appendExtensionClassStmts(name, stmts);
                }
            }

            /* Validation Helper Methods */

            ensureInConstructor(syn, errorMsg) {
                return this.ensureTest(!this.isInsideFun() || !this.isInsideClass() || !this.isConstructor(), syn, errorMsg);
            }
            ensureInMethod(syn, errorMsg) {
                return this.ensureTest(!this.isInsideFun() || !this.isInsideClass(), syn, errorMsg);
            }
            ensureAdminMode(syn, errorMsg) {
                return this.ensureTest(!this.isAdminMode, syn, errorMsg);
            }
            ensureInFun(syn, errorMsg) {
                return this.ensureTest(!this.isInsideFun(), syn, errorMsg);
            }
            ensureOutFun(syn, errorMsg) {
                return this.ensureTest(this.isInsideFun(), syn, errorMsg);
            }
            ensureOutBlock(syn, errorMsg) {
                return this.ensureTest(this.isInsideBlock(), syn, errorMsg);
            }
            ensureInClass(syn, errorMsg) {
                return this.ensureTest(!this.isInsideClass(), syn, errorMsg);
            }
            ensureOutClass(syn, errorMsg) {
                return this.ensureTest(this.isInsideClass(), syn, errorMsg);
            }
            ensureOutParameters(syn, errorMsg) {
                return this.ensureTest(this.isInsideParameters(), syn, errorMsg);
            }
            ensureOutFunParameters(syn, errorMsg) {
                return this.ensureTest(this.isInsideFunParameters(), syn, errorMsg);
            }
            ensureInFunParameters(syn, errorMsg) {
                return this.ensureTest(!this.isInsideFunParameters(), syn, errorMsg);
            }
            ensureTest(errCondition, syn, errorMsg) {
                if (errCondition) {
                    this.parseError(syn.offset, errorMsg);
                    return false;
                } else {
                    return true;
                }
            }

            /**
             * Searches through all classes,
             * for a method which is similar to the one given.
             *
             * @param method The method to search for one similar too.
             * @param klassVal An optional ClassValidator to restrict the search, otherwise searches through all classes.
             */
            searchForMethodLike(method, klassVal) {
                if (klassVal) {
                    return this.searchMissingFun(method, klassVal.funs);
                } else {
                    var searchKlassVals = this.classes,
                        altMethod = null,
                        methodName = method.name.toLowerCase();
                    // check for same method, but different number of parameters

                    for (var i in searchKlassVals) {
                        var found = this.searchMissingFunWithName(methodName, searchKlassVals[i].funs);

                        if (found !== null) {
                            // wrong number of parameters
                            if (found.name.toLowerCase() == methodName) {
                                return found;
                                // alternative name
                            } else if (altMethod === null) {
                                altMethod = found;
                            }
                        }
                    }

                    return altMethod;
                }
            }

            /**
             * Note that this uses name, and not callName!
             *
             * 'incorrect parameters' comes first, and takes priority when it comes to being returned.
             * 'alternative name' is returned, only if 'incorrect parameters' does not come first.
             * Otherwise null is returned.
             */
            searchMissingFunWithName(name, searchFuns) {
                var altNames = [],
                    altFun = null;
                var nameLen = name.length;

                if (
                        nameLen > 3 &&
                        (name.indexOf('get') === 0 || name.indexOf('set') === 0)

                ) {
                    altNames.push(name.substr(3));
                } else {
                    altNames.push('get' + name);
                    altNames.push('set' + name);
                }

                for (var funIndex in searchFuns) {
                    var searchFun = searchFuns[funIndex];
                    var searchName = searchFun.name.toLowerCase();

                    if (searchName === name) {
                        return searchFun;
                    } else if (altFun === null) {
                        for (var i = 0; i < altNames.length; i++) {
                            var altName = altNames[i];

                            if (searchName == altName) {
                                altFun = searchFun;
                                break;
                            }
                        }
                    }
                }

                return altFun;
            }

            searchMissingFun(fun, searchFuns) {
                return this.searchMissingFunWithName(fun.name.toLowerCase(), searchFuns);
            }

            /**
             *
             */
            searchMissingFunAndError(fun, searchFuns, strFunctionType) {
                var name = fun.name.toLowerCase();
                var found = this.searchMissingFunWithName(name, searchFuns),
                    errMsg;

                if (found !== null) {
                    if (name === found.name.toLowerCase()) {
                        errMsg = "Called " + strFunctionType + " '" + fun.name + "' with wrong number of parameters.";
                    } else {
                        errMsg = "Called " + strFunctionType + " '" + fun.name + "', but it is not defined, did you mean: '" + found.name + "'.";
                    }
                } else {
                    errMsg = "Undefined " + strFunctionType + " called: '" + fun.name + "'.";
                }

                this.parseError(fun.offset, errMsg);
            }
        }

        /**
         * Here is some example code:
         * class Foo
         *     def bar()
         *         foobar()
         *     end
         * end
         *
         * How do we know if 'foobar' is a call to a method or a function?
         * We don't! But this, class works it out, during 'endValidate'.
         */
        class LateFunctionBinder {
            private validator: Validator;

            private classVals = [];
            private classFuns = [];

            private currentClassV: ClassValidator = null;

            constructor(validator: Validator) {
                this.validator = validator;
            }

            setClassVal(klass) {
                this.currentClassV = klass;
            }

            addFun(fun) {
                var callName = this.currentClassV.klass.callName;
                var funs = this.classFuns[callName];

                if (!funs) {
                    funs = [];
                    this.classFuns[callName] = funs;
                    this.classVals[callName] = this.currentClassV;
                }

                var innerFuns = funs[fun.callName];
                if (!innerFuns) {
                    innerFuns = [];
                    funs[fun.callName] = innerFuns;
                }

                innerFuns.push(fun);
            }

            endValidate(globalFuns) {
                for (var className in this.classVals) {
                    var klassV = this.classVals[className];
                    var funs = this.classFuns[className];

                    for (var funName in funs) {
                        var innerFuns = funs[funName];
                        var fun = innerFuns[0];

                        if (klassV.hasFunInHierarchy(fun)) {
                            for (var i = 0; i < innerFuns.length; i++) {
                                innerFuns[i].setIsMethod();
                            }
                        } else if (!globalFuns[funName]) {
                            for (var i = 0; i < innerFuns.length; i++) {
                                var f = innerFuns[i];
                                this.validator.parseError(f.offset, "Function '" + f.name + "' called with " + f.getNumParameters() + " parameters, but is not defined in this class or as a function.");
                            }
                        }
                    }
                }
            }
        }

        /**
         * Used to store callName to display name mappings for all functions
         * and methods.
         *
         * This is used at runtime to allow it to lookup functions that
         * have been called but don't exist on the object.
         */
        class FunctionTable {
            private funs = {};
            private size: number = 0;

            constructor() {
            }

            add(callName: string, displayName: string) {
                this.funs[callName] = displayName;
                this.size++;
            }

            getFuns() {
                return this.funs;
            }

            print(p: Printer) {
                var fs = this.funs;

                p.append(qubyRuntime.FUNCTION_TABLE_NAME, '={');

                // We print a comma between each entry
                // and we achieve this by always printing it before the next item,
                // except on the first one!
                var printComma = false;
                for (var callName in fs) {
                    var name = fs[callName];

                    // from second iteration onwards, this if is called
                    if (printComma) {
                        p.append(',', callName, ":'", name, "'");
                        // this else is run on first iteration
                    } else {
                        p.append(callName, ":'", name, "'");
                        printComma = true;
                    }
                }

                p.append('}');
                p.endStatement();
            }
        }

        /**
         * This table is used for the symbol mappings.
         * Symbols are the :symbol code you can use in Quby/Ruby.
         *
         * This is printed into the resulting code for use at runtime.
         */
        class SymbolTable {
            private symbols: Object;

            constructor() {
                this.symbols = {};
            }

            add(sym: qubyAst.quby.ast.Symbol) {
                this.symbols[sym.callName] = sym.match;
            }

            print(p: Printer) {
                var symbolsLength: number = this.symbols.length;

                for (var callName in this.symbols) {
                    var sym: qubyAst.quby.ast.Symbol = this.symbols[callName];

                    p.append('var ', callName, " = '", sym, "'");
                    p.endStatement();
                }
            }
        }

        /**
         * Whilst validating sub-classes will want to grab the root class.
         * If it has not been hit yet then we can't return it.
         * So instead we use a proxy which always exists.
         *
         * This allows us to set the root class later.
         */
        class RootClassProxy {
            private rootClass = null;

            constructor() {
            }

            setClass(klass) {
                if (this.rootClass == null) {
                    this.rootClass = klass;
                }
            }

            getClass() {
                return this.rootClass;
            }

            /**
             * Should only be called after validation (during printing).
             */
            getPrintStmts(p, className) {
                if (this.rootClass == null) {
                    return [];
                } else {
                    return this.rootClass.klass.statements.getStmts();
                }
            }
        }

        class ClassValidator {
            private isPrinted: bool = false;

            private validator: Validator;
            private klass;

            private funs;
            private usedFuns;
            private news;

            private usedFields;
            private assignedFields;

            constructor(validator: Validator, klass) {
                this.validator = validator;
                this.klass = klass;

                this.funs = {};
                this.usedFuns = {};
                this.news = [];

                this.usedFields = {};
                this.assignedFields = {};
            }

            useField(field) {
                this.usedFields[field.callName] = field;
            }
            assignField(field) {
                this.assignedFields[field.callName] = field;
            }
            hasField(field) {
                var fieldCallName = qubyRuntime.formatField(
                        this.klass.name,
                        field.identifier
                );

                return this.hasFieldCallName(fieldCallName);
            }
            hasFieldCallName(callName: string) {
                return this.assignedFields[callName] != undefined;
            }

            addFun(fun) {
                var index = fun.callName;

                if (this.funs.hasOwnProperty(index)) {
                    this.validator.parseError(fun.offset, "Duplicate method '" + fun.name + "' definition in class '" + this.klass.name + "'.");
                }

                this.funs[index] = fun;
            }
            hasFunInHierarchy(fun) {
                if (this.hasFun(fun)) {
                    return true;
                } else {
                    var parentName = this.klass.getSuperCallName();
                    var parentVal;

                    // if has a parent class, pass the call on to that
                    if (
                        parentName != null &&
                        (parentVal = this.validator.getClass(parentName)) != undefined
                    ) {
                        return parentVal.hasFunInHierarchy(fun);
                    } else {
                        return false;
                    }
                }
            }

            /**
             * States if this class has the given function or not.
             *
             * Ignores parent classes.
             */
            hasFun(fun) {
                return this.hasFunCallName(fun.callName);
            }

            /**
             * States if this class has a method with the given call name, or not.
             *
             * Ignores parent classes.
             */
            hasFunCallName(callName: string) {
                return this.funs.hasOwnProperty(callName);
            }
            useFun(fun) {
                if (!this.funs[fun.callName]) {
                    this.usedFuns[fun.callName] = fun;
                }
            }

            getFun(callName: string) {
                var f = this.funs[callName];
                return (f === undefined) ? null : f;
            }

            addNew(fun) {
                var index = fun.getNumParameters();

                if (this.news[index] != undefined) {
                    this.validator.parseError(fun.offset, "Duplicate constructor for class '" + this.klass.name + "' with " + index + " parameters.");
                }

                this.news[index] = fun;
            }

            /**
             * Returns an array containing all of the number of
             * parameters, that this expects.
             */
            getNewParameterList(): number[] {
                if (this.news.length === 0) {
                    return [0];
                } else {
                    var numParams = [];

                    for (var k in this.news) {
                        numParams.push(k);
                    }

                    return numParams;
                }
            }

            hasNew(fun): bool {
                return this.news[fun.getNumParameters()] != undefined;
            }
            noNews(): bool {
                return this.news.length == 0;
            }

            setNoMethPrintFuns(callNames) {
                this.noMethPrintFuns = callNames;
            }

            printOnce(p: Printer) {
                if (!this.isPrinted) {
                    this.isPrinted = true;
                    this.print(p);
                }
            }

            /**
            * In practice, this is only ever called by non-extension classes.
            */
            print(p: Printer) {
                p.setCodeMode(false);

                var klassName = this.klass.callName;
                var superKlass = this.klass.getSuperCallName();

                // class definition itself
                p.append('function ', klassName, '() {');
                if (superKlass != null) {
                    p.append(superKlass, '.apply(this);');
                }
                // set 'this' to '_this'
                p.append('var ', qubyRuntime.THIS_VARIABLE, ' = this;');

                if (this.noMethPrintFuns) {
                    for (var i = 0; i < this.noMethPrintFuns.length; i++) {
                        var callName = this.noMethPrintFuns[i];

                        p.append('this.', callName, '=', qubyRuntime.FUNCTION_DEFAULT_TABLE_NAME, '.', callName);
                        p.endStatement();
                    }
                }

                for (var strFun in this.funs) {
                    var fun = this.funs[strFun];

                    p.append('this.');
                    fun.print(p);
                    p.endStatement();
                }
                p.append('}');

                // class constructors
                for (var newIndex in this.news) {
                    var newFun = this.news[newIndex];

                    newFun.print(p);
                }

                p.setCodeMode(true);
            }

            endValidate() {
                var thisKlass = this.klass;

                // if no constructors, add a default no-args constructor
                // but only for non-core classes
                if (this.news.length == 0 && !this.klass.isExtensionClass) {
                    var constructor = new quby.ast.Constructor(
                            thisKlass.offset.clone("new"),
                            null,
                            null
                    );
                    constructor.setClass(thisKlass);

                    this.addNew(constructor);
                }

                // Check for circular inheritance trees.
                // Travel up the inheritance tree marking all classes we've seen.
                // If we see one we've already seen, then we break with a parse error.
                var seenClasses = {};
                seenClasses[thisKlass.callName] = true;

                var head = thisKlass.header;
                var superClassVs = []; // cache the order of super classes

                var validator = this.validator;

                while (head.hasSuper()) {
                    var superKlassV = validator.getClass(head.getSuperCallName());

                    if (!superKlassV) {
                        if (!qubyRuntime.isCoreClass(head.getSuperName().toLowerCase())) {
                            validator.parseError(thisKlass.offset,
                                    "Super class not found: '" +
                                    head.getSuperName() +
                                    "', for class '" +
                                    thisKlass.name +
                                    "'."
                            );
                        }

                        break;
                    } else {
                        var superKlass = superKlassV.klass;

                        if (seenClasses[superKlass.callName]) {
                            validator.parseError(
                                    thisKlass.offset,
                                    "Circular inheritance tree is found for class '" + thisKlass.name + "'."
                            );

                            break;
                        } else {
                            superClassVs.push(superKlassV);
                            seenClasses[superKlass.callName] = true;
                            head = superKlass.header;
                        }
                    }
                }

                // validate fields
                for (var fieldI in this.usedFields) {
                    if (this.assignedFields[fieldI] == undefined) {
                        var field = this.usedFields[fieldI];
                        var fieldErrorHandled = false;

                        // search up the super class tree for a field of the same name
                        if (thisKlass.header.hasSuper()) {
                            for (var i = 0; i < superClassVs.length; i++) {
                                var superClassV = superClassVs[i];

                                if (superClassV.hasField(field)) {
                                    validator.parseError(field.offset,
                                            "Field '@" +
                                            field.identifier +
                                            "' from class '" +
                                            superClassV.klass.name +
                                            "' is accessd in sub-class '" +
                                            thisKlass.name +
                                            "', however fields are private to each class."
                                    );

                                    fieldErrorHandled = true;
                                    break;
                                }
                            }
                        }

                        if (!fieldErrorHandled) {
                            validator.parseError(field.offset,
                                    "Field '@" +
                                    field.identifier +
                                    "' is used in class '" +
                                    thisKlass.name +
                                    "' without ever being assigned to."
                            );
                        }
                    }
                }

                // Search for funs used on this class.
                // This is more strict then other method checks,
                // as it takes into account that the target is 'this'.
                for (var funName in this.usedFuns) {
                    if (!this.funs[funName]) {
                        var fun = this.usedFuns[funName];

                        if (!this.hasFunInHierarchy(fun)) {
                            validator.searchMissingFunAndError(
                                    fun, this.funs, thisKlass.name + ' method'
                            );
                        }
                    }
                }
            }
        }

        /*
         *  \o/ Printing! \o/
         * 
         *           ~ I7I??                        
         *         I++??+++++                       
         *        ,+======++,                       
         *        :~~~~~====~~                      
         *        :~~~~~~~~==:                      
         *        :~~~~~~~~~::::~? :,~:?:           
         *        ::~~~,~::~~~~~~~~~~~~:~~7,        
         *      :::?=~ ~+===~~~~~~~~~~~=~?+7,       
         *     ,=,~,=====+==~~~~~~~~=++==~,7I,      
         *   ~I~II~~~~========~~I+===:::::,7I       
         *  ~:,~??I7,~~~:?I?+===~:::::==+,?~+       
         *  ~::~,=+I77~ +==::::::~======+,I~=       
         *  ::~~~:=++77   ,:~========,,,,,I?:       
         *  ::~~~~,?++    ~~~~~== ,:~=+,=,,~        
         *   ,:~~~:?++   I~~:,,,~=?II7I7II===       
         *   ,:::::=++      ,+III7IIIIIIIIII+=~::   
         *   ,,,:::=++     ==~:7IIIIIIII77777  ~=~  
         *      ,,:~++   ~ ======III7777   ==~~     
         *       ,,~==~~,,,  ,::  ~I    ==:~        
         *         ~:               , =+            
         */

        class Printer {
            private tempVarCounter = 0;

            private isCode = true;

            private pre: string[];
            private stmts: string[];
            private preOrStmts: string[];

            private currentPre: PrinterStatement;
            private currentStmt: PrinterStatement;
            private current: PrinterStatement;

            constructor() {
                this.pre = [];
                this.stmts = [];
                this.preOrStmts = this.stmts;

                this.currentPre = new PrinterStatement();
                this.currentStmt = new PrinterStatement();
                this.current = this.currentStmt;
            }

            getTempVariable(): string {
                return qubyRuntime.TEMP_VARIABLE + (this.tempVarCounter++);
            }

            setCodeMode(isCode: bool) {
                if (isCode) {
                    this.current = this.currentStmt;
                    this.preOrStmts = this.stmts;
                } else {
                    this.current = this.currentPre;
                    this.preOrStmts = this.pre;
                }

                this.isCode = isCode;
            }

            appendExtensionClassStmts(name: string, stmts) {
                var stmtsStart = qubyRuntime.translateClassName(name) + '.prototype.';

                for (var key in stmts) {
                    var fun = stmts[key];

                    if (fun.isConstructor) {
                        fun.print(this);
                    } else {
                        this.append(stmtsStart);
                        fun.print(this);
                    }

                    this.endStatement();
                }
            }

            printArray(arr: { print: (p: Printer) =>void; }[]) {
                for (
                        var i = 0, len = arr.length;
                        i < len;
                        i++
                ) {
                    arr[i].print(this);
                    this.endStatement();
                }
            }

            addStatement(...strs: string[]);
            addStatement() {
                this.stmts.push(arguments.join(''));
            }

            flush() {
                this.current.flush(this.preOrStmts);

                return this;
            }

            endStatement() {
                this.append(STATEMENT_END);

                return this.flush();
            }

            toString() {
                // concat everything into this.pre ...
                this.currentPre.flush(this.pre);
                util.array.addAll(this.pre, this.stmts);
                this.currentStmt.flush(this.pre); // yes, pass in pre!

                return this.pre.join('');
            }

            appendPre(...strs: string[]);
            append(...strs: string[]);
            appendPost(...strs: string[]);
        }

        // Chrome is much faster at iterating over the arguments array,
        // maybe I'm hitting an optimization???
        // see: http://jsperf.com/skip-arguments-check
        if (util.browser.isChrome) {
            Printer.prototype.appendPre = function() {
                for (var i = 0; i < arguments.length; i++) {
                    this.current.appendPre(arguments[i]);
                }

                return this;
            };
            Printer.prototype.append = function() {
                for (var i = 0; i < arguments.length; i++) {
                    this.current.appendNow(arguments[i]);
                }

                return this;
            };
            Printer.prototype.appendPost = function() {
                for (var i = 0; i < arguments.length; i++) {
                    this.current.appendPost(arguments[i]);
                }

                return this;
            };
        } else {
            Printer.prototype.appendPre = function(a: string) {
                if (arguments.length === 1) {
                    this.current.appendPre(a);
                } else {
                    for (var i = 0; i < arguments.length; i++) {
                        this.current.appendPre(arguments[i]);
                    }
                }

                return this;
            };
            Printer.prototype.append = function(a: string) {
                if (arguments.length === 1) {
                    this.current.appendNow(a);
                } else {
                    for (var i = 0; i < arguments.length; i++) {
                        this.current.appendNow(arguments[i]);
                    }
                }

                return this;
            };
            Printer.prototype.appendPost = function(a: string) {
                if (arguments.length === 1) {
                    this.current.appendPost(a);
                } else {
                    for (var i = 0; i < arguments.length; i++) {
                        this.current.appendPost(arguments[i]);
                    }
                }

                return this;
            };
        }

        class PrinterStatement {
            private preStatement: string[] = null;
            private currentStatement: string[] = null;
            private postStatement: string[] = null;

            constructor() {
            }

            appendPre(e: string) {
                if (this.preStatement === null) {
                    this.preStatement = [e];
                } else {
                    this.preStatement.push(e);
                }
            }
            appendNow(e: string) {
                if (this.currentStatement === null) {
                    this.currentStatement = [e];
                } else {
                    this.currentStatement.push(e);
                }
            }
            appendPost(e: string) {
                if (this.postStatement === null) {
                    this.postStatement = [e];
                } else {
                    this.postStatement.push(e);
                }
            }

            endAppend(dest: string[], src: string[]) {
                for (
                        var i = 0, len = src.length;
                        i < len;
                        i++
                ) {
                    dest[dest.length] = src[i];
                }
            }

            flush(stmts) {
                if (this.preStatement !== null) {
                    if (this.currentStatement !== null) {
                        if (this.postStatement !== null) {
                            this.endAppend(stmts, this.preStatement);
                            this.endAppend(stmts, this.currentStatement);
                            this.endAppend(stmts, this.postStatement);
                        } else {
                            this.endAppend(stmts, this.preStatement);
                            this.endAppend(stmts, this.currentStatement);
                        }
                    } else if (this.postStatement !== null) {
                        this.endAppend(stmts, this.preStatement);
                        this.endAppend(stmts, this.postStatement);
                    } else {
                        this.endAppend(stmts, this.preStatement);
                    }

                    this.clear();
                } else if (this.currentStatement !== null) {
                    if (this.postStatement !== null) {
                        this.endAppend(stmts, this.currentStatement);
                        this.endAppend(stmts, this.postStatement);
                    } else {
                        this.endAppend(stmts, this.currentStatement);
                    }

                    this.clear();
                } else if (this.postStatement !== null) {
                    this.endAppend(stmts, this.postStatement);

                    this.clear();
                }
            }

            clear() {
                this.preStatement = null;
                this.currentStatement = null;
                this.postStatement = null;
            }
        }
    }
}
