"use strict";
var quby = window['quby'] || {};

(function( quby, util ) {
    /**
     * Main
     *
     * Entry point for running the parser. Also handles recording
     * which is the current parser (to allow them to run
     * recursively).
     *
     * Users should simply call the 'parse' entry point
     * function for starting the parser.
     */
    quby.main = {
        UNKNOWN_SYNTAX_PREFIX: "Incorrect syntax around",
        UNKNOWN_SYNTAX_ERROR : "Incorrect syntax encountered.",

        parserStack: [],

        /**
         * Main parser engine running code.
         */
        currentParser: function () {
            return quby.main.parserStack[quby.main.parserStack.length - 1];
        },

        /**
         *
         */
        parse: function (source, adminMode, callback) {
            var factory = new quby.main.Parser();

            factory.parse(source, adminMode, function() {
                factory.finish(callback);
            });
        },

        /**
         * This is for using multiple parsers together, for parsing multiple files.
         *
         * You can imagine a program is built from multiple files.
         * This is how parsing is based; you call a method to provide
         * a file until they are all provided. Then you call 'finish'
         * to finish compilation and generate the actual JS application.
         *
         * Some of these files may have different permissions;
         * core files with admin rights, and user files without these rights.
         * The various methods allow you to state what can do what.
         */
        Parser: function () {
            this.validator = new quby.main.Validator();

            /**
             * Parse a single file, adding it to the program being built.
             *
             * If a debugCallback is provided, then it will be called during
             * the parsing process. This makes parsing a tad slower, but provides
             * you with information on how it wen't (like the symbols generated
             * and how long the different stages took).
             *
             * If no debugCallback is provided, then it is run normally.
             */
            this.parse = function( source, adminMode, callback, debugCallback ) {
                this.validator.isAdminMode = adminMode;
                var _this  = this,
                    parser = new quby.main.ParserInner( source );

                util.future.run(
                        function() {
                            quby.main.parserStack.push( parser );

                            parser.run(
                                    function() {
                                        parser.validate( _this.validator );
                                        quby.main.parserStack.pop();

                                        if ( callback !== undefined && callback !== null ) {
                                            util.future.runFun( callback );
                                        }
                                    },
                                    debugCallback
                            );
                        }
                );
            };

            this.parseSources = function (sources, adminMode, callback) {
                var _this = this;
                util.future.map( sources, function(source) {
                    _this.parse( source, adminMode );
                } );

                if ( callback != undefined ) {
                    util.future.runFun( callback );
                }
            };

            this.parseFiles = function (urls, adminMode, callback) {
                var _this = this;
                util.future.map( urls, function(url) {
                    _this.parseFile( url, adminMode );
                } );

                if ( callback != undefined ) {
                    util.future.runFun( callback );
                }
            };

            this.parseFile = function (url, adminMode) {
                var xmlhttp = new XMLHttpRequest();
                xmlhttp.open( "GET", url, false );
                xmlhttp.send();

                var source = xmlhttp.responseText;

                this.parse( source, adminMode );
            };

            this.finish = function ( callback ) {
                var _this = this;

                util.future.run(
                        function() {
                            var output = _this.validator.finaliseProgram();
                            var result = new quby.main.Result(
                                    output, _this.validator.getErrors()
                            );

                            util.future.runFun( function() {
                                callback( result );
                            } );
                        }
                );
            };
        },

        /**
         * Result
         *
         * Handles creation and the structures for the object you get back from the parser.
         *
         * Essentially anything which crosses from the parser to the caller is stored and
         * handled by the contents of this script.
         */
        Result: (function() {
            var Result = function( code, errors ) {
                this.program = code;
                this.errors  = errors;
            }

            Result.prototype = {
                // default error behaviour
                onError: function( ex ) {
                    var errorMessage = ex.name + ': ' + ex.message;

                    if ( ex.stack ) {
                        errorMessage += '\n\n' + ex.stack;
                    }

                    alert( errorMessage );
                },

                /**
                 * Sets the function to run when this fails to run.
                 * By default this is an alert message displaying the error that has
                 * occurred.
                 *
                 * The function needs one parameter for taking an Error object that was
                 * caught.
                 *
                 * @param fun The function to run when an error has occurred at runtime.
                 */
                setOnError: function( fun ) {
                    this.onError = fun;
                },

                /**
                 * @return Returns the Quby application in it's compiled JavaScript form.
                 */
                getCode: function() {
                    return this.program;
                },

                /**
                 * @return True if there were errors within the result, otherwise false if there are no errors.
                 */
                hasErrors: function() {
                    return this.errors.length > 0;
                },

                /**
                 * This is boiler plate to call quby.runtime.runCode for you using the
                 * code stored in this Result object and the onError function set.
                 */
                run: function() {
                    if (!this.hasErrors()) {
                        quby.runtime.runCode(this.getCode(), this.onError);
                    }
                }
            }

            return Result;
        })(),

        /**
         * For creating a new Parser object.
         *
         * @param source The source code to parse.
         */
        ParserInner: (function() {
            var ParserInner = function( source ) {
                this.errors   = null;
                this.program  = null;
                this.parseErr = null;
                this.source   = new quby.main.SourceLines( source );
            }

            ParserInner.prototype = {
                run: function( callback, debugCallback ) {
                    var _this = this;

                    quby.parser.parse(
                            _this.source.getSource(),
                            function(program, errors) {
                                if ( errors.length > 0 ) {
                                    _this.errors = _this.formatErrors( _this.source, errors );
                                }

                                _this.program = program;

                                callback();
                            },
                            debugCallback
                    );
                },

                /*
                 * TODO update this to use the new parser error format.
                 */
                /**
                 * Turns the given errors into the output string
                 * that should be displayed for the user.
                 *
                 * You can imagine that this is the checkpoint
                 * between whatever internal format we use, and
                 * what the outside world is going to see.
                 *
                 * @param src The source code object used for finding the lines.
                 * @param errors The errors to parse.
                 * @return An array containing the information for each error to display.
                 */
                formatErrors: function( src, errors ) {
                    var errs = [];

                    for (var i = 0; i < errors.length; i++) {
                        var error   = errors[i],
                            errLine = src.getLine( error.offset ),
                            strErr;

                        if ( error.isSymbol ) {
                            strErr = "error parsing '" + error.match + "'";
                        } else if ( error.isTerminal ) {
                            if ( error.isLiteral || util.string.trim(error.match) === '' ) {
                                strErr = "syntax error near '" + error.terminalName + "'";
                            } else {
                                strErr = "syntax error near " + error.terminalName + " '" + error.match + "'";
                            }
                        } else {
                            throw new Error("Unknown parse.js error given to format");
                        }

                        errs.push({
                                line: errLine,
                                msg : strErr
                        });
                    }

                    return errs;
                },

                validate: function (validator) {
                    var es = this.errors;

                    if ( es === null ) {
                        validator.addProgram( this.program );
                    } else {
                        for (var i = 0; i < es.length; i++) {
                            validator.parseErrorLine(es[i].line, es[i].msg);
                        }
                    }
                }
            }

            return ParserInner;
        })(),

        /**
        * SourceLines deals with translations made to an original source code file.
        * It also deals with managing the conversions from an offset given from the
        * parser, to a line number in the original source code.
        */
        /*
        * In practice this works through two steps:
        *
        *  1) The source code is 'prepped' where certain changes are made. This
        * happens as soon as this is created and the result should be used by the
        * parser.
        *
        *  2) The source code is scanned and indexed. This is for converting
        * character offsets to line locations. This only occurres if a line number
        * has been requested, which in turn should only happen when there is an
        * error. This is to ensure it's never done unless needed.
        */
        SourceLines: function (src) {
            this.index = function (src) {
                var len = src.length;
                var lastIndex = 0;
                var lines = [];
                var running = true;

                /*
                 * Look for 1 slash n, if it's found, we use it
                 * otherwise we use \r.
                 *
                 * This is so we can index any code, without having to alter it.
                 */
                var searchIndex = (src.indexOf("\n", lastIndex) !== -1) ?
                        "\n" :
                        "\r" ;

                while ( running ) {
                    var index = src.indexOf( searchIndex, lastIndex );

                    if (index != -1) {
                        lines.push(index);
                        lastIndex = index + 1;
                        // the last line
                    } else {
                        lines.push(len);
                        running = false;
                    }

                    this.numLines++;
                }

                return lines;
            };

            this.getLine = function (offset) {
                // index source code on the fly, only if needed
                if (this.lineOffsets == null) {
                    this.lineOffsets = this.index( this.source );
                }

                for (var line = 0; line < this.lineOffsets.length; line++) {
                    // lineOffset is from the end of the line.
                    // If it's greater then offset, then we return that line.
                    // It's +1 to start lines from 1 rather then 0.
                    if (this.lineOffsets[line] > offset) {
                        return line + 1;
                    }
                }

                return this.numLines;
            };

            this.getSource = function () {
                return this.source;
            };

            // altered when indexed ...
            this.numLines = 0;
            this.lineOffsets = null;

            // source code altered and should be used for indexing
            this.source = src;
        },

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
        LateFunctionBinder: function (validator) {
            this.validator = validator;
            // class validators
            this.classVals = [];

            this.classFuns = [];
            this.currentClassV = null;

            this.setClassVal = function (klass) {
                this.currentClassV = klass;
            };

            this.addFun = function (fun) {
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
            };

            this.endValidate = function (globalFuns) {
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
            };
        },

        /**
        * Used to store callName to display name mappings for all functions
        * and methods.
        *
        * This is used at runtime to allow it to lookup functions that
        * have been called but don't exist on the object.
        */
        FunctionTable: function () {
            this.funs = {};
            this.size = 0;

            this.add = function (callName, displayName) {
                this.funs[callName] = displayName;
                this.size++;
            };

            this.getFuns = function() {
                return this.funs;
            };

            this.print = function (p) {
                var fs = this.funs;

                p.append(quby.runtime.FUNCTION_TABLE_NAME, '={');

                // We print a comma between each entry
                // and we achieve this by always printing it before the next item,
                // except on the first one!
                var printComma = false;
                for (var callName in fs) {
                    var name = fs[callName];

                    // from second iteration onwards, this if is called
                    if ( printComma ) {
                        p.append( ',', callName, ":'", name, "'");
                    // this else is run on first iteration
                    } else {
                        p.append(callName, ":'", name, "'");
                        printComma = true;
                    }
                }

                p.append('}');
                p.endStatement();
            };
        },

        /**
        * This table is used for the symbol mappings.
        * Symbols are the :symbol code you can use in Quby/Ruby.
        *
        * This is printed into the resulting code for use at runtime.
        */
        SymbolTable: function () {
            this.symbols = {};

            this.add = function (sym) {
                this.symbols[sym.callName] = sym.value;
            };

            this.print = function (p) {
                var symbolsLength = this.symbols.length;

                for (var callName in this.symbols) {
                    var sym = this.symbols[callName];

                    p.append('var ', callName, " = '", sym, "'");
                    p.endStatement();
                }
            };
        },

        Validator: function () {
            // the various program trees that have been parsed
            this.programs = [];

            this.classes = {};
            this.currentClass = null;
            this.rootClass = new quby.main.RootClassProxy();

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
            this.methodNames = new quby.main.FunctionTable();

            this.lateUsedFuns = new quby.main.LateFunctionBinder(this);
            this.errors = [];

            this.isParameters = false;
            this.isFunParameters = false;

            this.isConstructor = false;

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

            this.symbols = new quby.main.SymbolTable();

            this.addPreInline = function(inline) {
                this.preInlines.push( inline );
            };

            this.addSymbol = function (sym) {
                this.symbols.add(sym);
            };

            this.setInConstructor = function (inC) {
                this.inConstructor = inC;
            };
            this.isInConstructor = function () {
                return this.inConstructor;
            };

            this.setClass = function (klass) {
                if (this.currentClass != null) {
                    this.parseError(klass.offset, "Class '" + klass.name + "' is defined inside '" + this.currentClass.klass.name + "', cannot define a class within a class.");
                }

                var klassName = klass.callName;
                var kVal = this.classes[klassName];

                if (!kVal) {
                    kVal = new quby.main.ClassValidator(this, klass);
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

                if (klass.callName == quby.runtime.ROOT_CLASS_CALL_NAME) {
                    this.rootClass.setClass(kVal);
                }
                this.lateUsedFuns.setClassVal(kVal);

                return (this.currentClass = kVal);
            };
            this.getClass = function (callName) {
                return this.classes[callName];
            };
            this.getCurrentClass = function () {
                return this.currentClass;
            };
            this.getRootClass = function () {
                return this.rootClass;
            };
            this.unsetClass = function () {
                this.currentClass = null;
            };
            this.isInsideClass = function () {
                return this.currentClass != null;
            };
            this.isInsideExtensionClass = function () {
                return this.currentClass != null && this.currentClass.klass.isExtensionClass;
            };
            this.useField = function (field) {
                this.currentClass.useField(field);
            };
            this.assignField = function (field) {
                this.currentClass.assignField(field);
            };
            this.useThisClassFun = function (fun) {
                this.currentClass.useFun(fun);
            };

            this.setParameters = function (isParameters, isFun) {
                this.isParameters = isParameters;
                this.isFunParameters = !!isFun;
            };

            this.isInsideParameters = function () {
                return this.isParameters;
            };
            this.isInsideFunParameters = function () {
                return this.isParameters && this.isFunParameters;
            };
            this.isInsideBlockParameters = function () {
                return this.isParameters && !this.isFunParameters;
            };

            this.isInsideClassDefinition = function () {
                return this.isInsideClass() && !this.isInsideFun();
            };

            this.pushScope = function () {
                this.vars.push({});
                this.isBlock.push(false);

                if (this.isInsideFun()) {
                    this.funCount++;
                }
            };
            this.pushFunScope = function (fun) {
                if (this.currentFun != null) {
                    quby.runtime.error("Fun within Fun", "Defining a function whilst already inside another function.");
                }

                this.currentFun = fun;
                this.funCount++;
                this.vars.push({});
                this.isBlock.push(false);
            };
            this.pushBlockScope = function () {
                this.pushScope();
                this.isBlock[this.isBlock.length - 1] = true;
            };

            this.popScope = function () {
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
            };

            /**
            * Returns true or false stating if the validator is within a scope
            * somewhere within a function. This could be within the root scope of
            * the function, or within a scope within that.
            *
            * @return True if the validator is within a function, somewhere.
            */
            this.isInsideFun = function (stmt) {
                return this.currentFun != null;
            };

            /**
            * Returns true or false stating if the validator is currently inside of
            * a block function.
            *
            * @return True if the validator is inside a block, otherwise false.
            */
            this.isInsideBlock = function () {
                return this.isBlock[this.isBlock.length - 1];
            };

            this.getCurrentFun = function () {
                return this.currentFun;
            };
            this.isConstructor = function () {
                return this.currentFun != null && this.currentFun.isConstructor;
            };

            this.assignVar = function (variable) {
                this.vars[this.vars.length - 1][variable.callName] = variable;
            };
            this.containsVar = function (variable) {
                var id = variable.callName;

                var stop;
                if (this.isInsideFun()) {
                    stop = this.vars.length - this.funCount;
                } else {
                    stop = 0;
                }

                for (var i = this.vars.length - 1; i >= stop; i--) {
                    if ( this.vars[i][id] != undefined ) {
                        return true;
                    }
                }

                return false;
            };
            this.containsLocalVar = function (variable) {
                var id = variable.callName;
                var scope = this.vars[this.vars.length - 1];

                return util.array.contains(scope, id);
            };
            this.containsLocalBlock = function () {
                var localVars = this.vars[this.vars.length - 1];

                for (var key in localVars) {
                    var blockVar = localVars[key];
                    if (blockVar.isBlockVar) {
                        return true;
                    }
                }

                return false;
            };

            this.assignGlobal = function (global) {
                this.globals[global.callName] = true;
            };
            this.useGlobal = function (global) {
                this.usedGlobals[global.callName] = global;
            };

            /**
             * Declares a function.
             *
             * By 'function' I mean function, constructor, method or function-generator.
             *
             * @param func
             */
            this.defineFun = function (func) {
                var klass = this.currentClass;

                // Methods / Constructors
                if (klass !== null) {
                    // Constructors
                    if ( func.isConstructor ) {
                        klass.addNew( func );
                        // Methods
                    } else {
                        klass.addFun( func );
                        this.methodNames.add( func.callName, func.name );
                    }
                // Functions
                } else {
                    if (util.array.contains(this.funs, func.callName)) {
                        this.parseError(func.offset, "Function is already defined: '" + func.name + "', with " + func.getNumParameters() + " parameters.");
                    }

                    this.funs[func.callName] = func;
                }
            };

            /* Store any functions which have not yet been defined.
            * Note that this will include valid function calls which are defined after
            * the call, but this is sorted in the endValidate section. */
            this.useFun = function (fun) {
                if ( fun.isMethod ) {
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
            };

            this.pushScope();

            this.parseError = function (lineInfo, msg) {
                if (lineInfo) {
                    this.parseErrorLine(lineInfo.source.getLine(lineInfo.offset), msg);
                } else {
                    this.errors.push(msg);
                }
            };

            this.parseErrorLine = function (line, msg) {
                this.errors.push("line " + line + ", " + msg);
            };

            this.getErrors = function () {
                return this.errors;
            };

            this.hasErrors = function() {
                return this.errors.length > 0;
            };

            // adds a program to be validated by this Validator
            this.addProgram = function (program) {
                if ( ! program ) {
                    // avoid unneeded error messages
                    if (this.errors.length == 0) {
                        this.parseError(null, 'Unknown parse error; source code cannot be parsed!');
                    }
                } else {
                    try {
                        program.validate(this);
                        this.programs.push(program);
                    } catch ( err ) {
                        this.parseError(null, 'Unknown issue with your code has caused the parser to crash!');

                        if ( window.console && window.console.log ) {
                            window.console.log( err );

                            if ( err.stack ) {
                                window.console.log( err.stack );
                            }
                        }
                    }
                }
            };

            /**
            * Pass in a function and it will be called by the validator at the
            * end of validation. Note that all other validation occurres before
            * these callbacks are called.
            *
            * These are called in a FIFO order, but bear in mind that potentially
            * anything could have been added before your callback.
            */
            this.onEndValidate = function (callback) {
                this.endValidateCallbacks.push(callback);
            };

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
            this.finaliseProgram = function () {
                this.endValidate();

                if ( this.hasErrors() ) {
                    return '';
                } else {
                    return this.generateCode();
                }
            };

            /**
            * Private.
            *
            * Runs all final validation checks.
            * After this step the program is fully validated.
            */
            this.endValidate = function () {
                try {
                    /* Go through all function calls we have stored, which have not been
                    * confirmed as being defined. Note this can include multiple calls
                    * to the same functions. */
                    for (var usedFunsI in this.usedFunsStack) {
                        var fun = this.usedFunsStack[usedFunsI];
                        var callName = fun.callName;

                        // check if the function is not defined
                        if (!util.array.contains(this.funs, callName)) {
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

                        if ( !methodFound ) {
                            var found = this.searchForMethodLike( method ),
                                name = method.name.toLowerCase(),
                                errMsg = null;

                            if ( found !== null ) {
                                if ( name === found.name.toLowerCase() ) {
                                    errMsg = "Method '" + method.name + "' called with incorrect number of parameters, " + method.getNumParameters() + " instead of " + found.getNumParameters() ;
                                } else {
                                    errMsg = "Method '" + method.name + "' called with " + method.getNumParameters() + " parameters, but is not defined in any class. Did you mean: '" + found.name + "'?" ;
                                }
                            } else {
                                // no alternative method found
                                errMsg = "Method '" + method.name + "' called with " + method.getNumParameters() + " parameters, but is not defined in any class." ;
                            }

                            this.parseError(method.offset, errMsg );
                        }
                    }

                    this.lateUsedFuns.endValidate(this.funs);

                    // finally, run the callbacks
                    while (this.endValidateCallbacks.length > 0) {
                        var callback = this.endValidateCallbacks.shift();
                        callback(this);
                    }
                } catch ( err ) {
                    this.parseError(null, 'Unknown issue with your code has caused the parser to crash!');

                    if ( window.console && window.console.log ) {
                        window.console.log( err );

                        if ( err.stack ) {
                            window.console.log( err.stack );
                        }
                    }
                }
            };

            /**
            * Turns all stored programs into
            */
            this.generateCode = function () {
                var printer = new quby.main.Printer(this);

                printer.setCodeMode(false);
                this.generatePreCode(printer);
                printer.setCodeMode(true);

                for (var i = 0; i < this.programs.length; i++) {
                    this.programs[i].print(printer);
                }

                return printer.toString();
            };

            this.generateNoSuchMethodStubs = function(p) {
                // generate the noSuchMethod function stubs
                if ( ! quby.compilation.hints.useMethodMissing() ) {
                    var rootKlass = this.getRootClass().getClass();
                    var callNames = [];
                    var extensionStr = [];
                    var ms = this.methodNames.getFuns();

                    p.append(quby.runtime.FUNCTION_DEFAULT_TABLE_NAME,'={');

                    var errFun = ":function(){quby_errFunStub(this,arguments);}";
                    var printComma = false;
                    for ( var callName in ms ) {
                        if (
                                rootKlass === null ||
                                !rootKlass.hasFunCallName(callName)
                        ) {
                            // from second iteration onwards, this if is called
                            if ( printComma ) {
                                p.append( ',', callName, ':function(){noSuchMethodError(this,"' + callName + '");}' );
                            // this else is run on first iteration
                            } else {
                                p.append( callName, ':function(){noSuchMethodError(this,"' + callName + '");}' );
                                printComma = true;
                            }

                            callNames[ callNames.length ] = callName;
                            extensionStr[ extensionStr.length ] = ['.prototype.', callName, '=', quby.runtime.FUNCTION_DEFAULT_TABLE_NAME, '.', callName].join('');
                        }
                    }

                    p.append('}');
                    p.endStatement();

                    // print empty funs for each Extension class
                    var classes = quby.runtime.CORE_CLASSES;
                    var numNames = callNames.length;
                    for (var i = 0; i < classes.length; i++) {
                        var name = classes[i];
                        var transName = quby.runtime.translateClassName( name );
                        var thisKlass = this.getClass( name );

                        for ( var j = 0; j < callNames.length; j++ ) {
                            var callName = callNames[j];

                            if ( thisKlass === undefined || !thisKlass.hasFunCallName(callName) ) {
                                p.append( transName, extensionStr[j] );
                                p.endStatement();
                            }
                        }
                    }

                    if ( rootKlass !== null ) {
                        rootKlass.setNoMethPrintFuns( callNames );
                    }
                }
            };

            this.generatePreCode = function (p) {
                this.methodNames.print(p);
                this.symbols.print(p);
                p.printArray( this.preInlines );

                this.generateNoSuchMethodStubs(p);

                // print the Object functions for each of the extension classes
                var classes = quby.runtime.CORE_CLASSES;
                var stmts = this.rootClass.getPrintStmts();
                for (var i = 0; i < classes.length; i++) {
                    var name = classes[i];
                    p.appendExtensionClassStmts(name, stmts);
                }
            };

            /* Validation Helper Methods */

            this.ensureInConstructor = function (syn, errorMsg) {
                return this.ensureTest(!this.isInsideFun() || !this.isInsideClass() || !this.isConstructor(), syn, errorMsg);
            };
            this.ensureInMethod = function (syn, errorMsg) {
                return this.ensureTest(!this.isInsideFun() || !this.isInsideClass(), syn, errorMsg);
            };
            this.ensureAdminMode = function (syn, errorMsg) {
                return this.ensureTest(!this.isAdminMode, syn, errorMsg);
            };
            this.ensureInFun = function (syn, errorMsg) {
                return this.ensureTest(!this.isInsideFun(), syn, errorMsg);
            };
            this.ensureOutFun = function (syn, errorMsg) {
                return this.ensureTest(this.isInsideFun(), syn, errorMsg);
            };
            this.ensureOutBlock = function (syn, errorMsg) {
                return this.ensureTest(this.isInsideBlock(), syn, errorMsg);
            };
            this.ensureInClass = function (syn, errorMsg) {
                return this.ensureTest(!this.isInsideClass(), syn, errorMsg);
            };
            this.ensureOutClass = function (syn, errorMsg) {
                return this.ensureTest(this.isInsideClass(), syn, errorMsg);
            };
            this.ensureOutParameters = function (syn, errorMsg) {
                return this.ensureTest(this.isInsideParameters(), syn, errorMsg);
            };
            this.ensureInFunParameters = function (syn, errorMsg) {
                return this.ensureTest(!this.isInsideFunParameters(), syn, errorMsg);
            };
            this.ensureTest = function (errCondition, syn, errorMsg) {
                if (errCondition) {
                    this.parseError(syn.offset, errorMsg);
                    return false;
                } else {
                    return true;
                }
            };

            /**
             * Searches through all classes,
             * for a method which is similar to the one given.
             *
             * @param method The method to search for one similar too.
             * @param klassVal An optional ClassValidator to restrict the search, otherwise searches through all classes.
             */
            this.searchForMethodLike = function( method, klassVal ) {
                if ( klassVal ) {
                    return this.searchMissingFun( method, klassVal.funs );
                } else {
                    var searchKlassVals = this.classes,
                        altMethod = null,
                        methodName = method.name.toLowerCase() ;
                    // check for same method, but different number of parameters

                    for ( var i in searchKlassVals ) {
                        var found = this.searchMissingFunWithName( methodName, searchKlassVals[i].funs );

                        if ( found !== null ) {
                            // wrong number of parameters
                            if ( found.name.toLowerCase() == methodName ) {
                                return found;
                            // alternative name
                            } else if ( altMethod === null ) {
                                altMethod = found;
                            }
                        }
                    }

                    return altMethod;
                }
            };

            /**
             * Note that this uses name, and not callName!
             *
             * 'incorrect parameters' comes first, and takes priority when it comes to being returned.
             * 'alternative name' is returned, only if 'incorrect parameters' does not come first.
             * Otherwise null is returned.
             */
            this.searchMissingFunWithName = function (name, searchFuns) {
                var altNames = [],
                    altFun = null;
                var nameLen = name.length;

                if (
                        nameLen > 3 &&
                        ( name.indexOf('get') === 0 || name.indexOf('set') === 0 )

                ) {
                    altNames.push( name.substr(3) );
                } else {
                    altNames.push( 'get' + name );
                    altNames.push( 'set' + name );
                }

                for (var funIndex in searchFuns) {
                    var searchFun = searchFuns[funIndex];
                    var searchName = searchFun.name.toLowerCase();

                    if (searchName === name) {
                        return searchFun;
                    } else if ( altFun === null ) {
                        for ( var i = 0; i < altNames.length; i++ ) {
                            var altName = altNames[i];

                            if ( searchName == altName ) {
                                altFun = searchFun;
                                break;
                            }
                        }
                    }
                }

                return altFun;
            };

            this.searchMissingFun = function( fun, searchFuns ) {
                return this.searchMissingFunWithName( fun.name.toLowerCase(), searchFuns );
            };

            /**
             *
             */
            this.searchMissingFunAndError = function (fun, searchFuns, strFunctionType) {
                var name = fun.name.toLowerCase();
                var found = this.searchMissingFunWithName( name, searchFuns ),
                    errMsg;

                if ( found !== null ) {
                    if ( name === found.name.toLowerCase() ) {
                        errMsg = "Called " + strFunctionType + " '" + fun.name + "' with wrong number of parameters.";
                    } else {
                        errMsg = "Called " + strFunctionType + " '" + fun.name + "', but it is not defined, did you mean: '" + found.name + "'." ;
                    }
                } else {
                    errMsg = "Undefined " + strFunctionType + " called: '" + fun.name + "'.";
                }

                this.parseError(fun.offset, errMsg);
            };
        },

        /**
        * Whilst validating sub-classes will want to grab the root class.
        * If it has not been hit yet then we can't return it.
        * So instead we use a proxy which always exists.
        *
        * This allows us to set the root class later.
        */
        RootClassProxy: function () {
            this.rootClass = null;

            this.setClass = function (klass) {
                if (this.rootClass == null) {
                    this.rootClass = klass;
                }
            };
            this.getClass = function () {
                return this.rootClass;
            };

            /**
            * Should only be called after validation (during printing).
            */
            this.getPrintStmts = function (p, className) {
                if (this.rootClass == null) {
                    return [];
                } else {
                    return this.rootClass.klass.statements.getStmts();
                }
            };
        },

        ClassValidator: function (validator, klass) {
            this.validator = validator;
            this.klass = klass;

            this.funs = {};
            this.usedFuns = {};
            this.news = [];

            this.isPrinted = false;

            this.usedFields = {};
            this.assignedFields = {};

            this.useField = function (field) {
                this.usedFields[field.callName] = field;
            };
            this.assignField = function (field) {
                this.assignedFields[field.callName] = field;
            };
            this.hasField = function (field) {
                var fieldCallName = quby.runtime.formatField(
                        this.klass.name,
                        field.identifier
                );

                return this.hasFieldCallName( fieldCallName );
            };
            this.hasFieldCallName = function(callName) {
                return this.assignedFields[ callName ] != undefined;
            };

            this.addFun = function (fun) {
                var index = fun.callName;

                if ( this.funs.hasOwnProperty(index) ) {
                    validator.parseError(fun.offset, "Duplicate method '" + fun.name + "' definition in class '" + this.klass.name + "'.");
                }

                this.funs[index] = fun;
            };
            this.hasFunInHierarchy = function (fun) {
                if ( this.hasFun(fun) ) {
                    return true;
                } else {
                    var parentName = klass.getSuperCallName();
                    var parentVal;

                    // if has a parent class, pass the call on to that
                    if (
                        parentName != null &&
                        (parentVal = this.validator.getClass(parentName)) != undefined
                    ) {
                        return parentVal.hasFunInHierarchy( fun );
                    } else {
                        return false;
                    }
                }
            };

            /**
             * States if this class has the given function or not.
             *
             * Ignores parent classes.
             */
            this.hasFun = function (fun) {
                return this.hasFunCallName( fun.callName );
            };

            /**
             * States if this class has a method with the given call name, or not.
             *
             * Ignores parent classes.
             */
            this.hasFunCallName = function(callName) {
                return this.funs.hasOwnProperty(callName);
            };
            this.useFun = function (fun) {
                if (!this.funs[fun.callName]) {
                    this.usedFuns[fun.callName] = fun;
                }
            };

            this.getFun = function( callName ) {
                var f = this.funs[ callName ];
                return ( f === undefined ) ? null : f ;
            };

            this.addNew = function (fun) {
                var index = fun.getNumParameters();

                if ( this.news[index] != undefined ) {
                    validator.parseError(fun.offset, "Duplicate constructor for class '" + this.klass.name + "' with " + index + " parameters.");
                }

                this.news[index] = fun;
            };
            this.hasNew = function (fun) {
                return this.news[fun.getNumParameters()] != undefined;
            };
            this.noNews = function () {
                return this.news.length == 0;
            };

            this.setNoMethPrintFuns = function( callNames ) {
                this.noMethPrintFuns = callNames;
            };

            this.printOnce = function (p) {
                if (!this.isPrinted) {
                    this.isPrinted = true;
                    this.print(p);
                }
            };
            /**
            * In practice, this is only ever called by non-extension classes.
            */
            this.print = function (p) {
                p.setCodeMode(false);

                var klassName = this.klass.callName;
                var superKlass = this.klass.getSuperCallName();

                // class definition itself
                p.append('function ', klassName, '() {');
                if (superKlass != null) {
                    p.append(superKlass, '.apply(this);');
                }
                // set 'this' to '_this'
                p.append('var ', quby.runtime.THIS_VARIABLE, ' = this;');

                if ( this.noMethPrintFuns ) {
                    for ( var i = 0; i < this.noMethPrintFuns.length; i++ ) {
                        var callName = this.noMethPrintFuns[i];

                        p.append( 'this.', callName, '=', quby.runtime.FUNCTION_DEFAULT_TABLE_NAME, '.', callName );
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
            };

            this.endValidate = function () {
                var thisKlass = this.klass;

                // if no constructors, add a default no-args constructor
                // but only for non-core classes
                if (this.news.length == 0 && !this.klass.isExtensionClass) {
                    var constructor = new quby.syntax.Constructor(
                            quby.lexer.EmptySym(thisKlass.offset, "new"),
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

                while (head.hasSuper()) {
                    var superKlassV = this.validator.getClass(head.getSuperCallName());

                    if (!superKlassV) {
                        if (!quby.runtime.isCoreClass(head.getSuperName().toLowerCase())) {
                            this.validator.parseError(thisKlass.offset,
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
                            this.validator.parseError(
                                    thisKlass.offset,
                                    "Circular inheritance tree is found for class '" + thisKlass.name + "'."
                            );

                            break;
                        } else {
                            superClassVs.push( superKlassV );
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
                        if ( thisKlass.header.hasSuper() ) {
                            for ( var i = 0; i < superClassVs.length; i++ ) {
                                var superClassV = superClassVs[ i ];

                                if ( superClassV.hasField(field) ) {
                                    this.validator.parseError( field.offset,
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

                        if ( ! fieldErrorHandled ) {
                            this.validator.parseError( field.offset,
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

                        if ( ! this.hasFunInHierarchy(fun) ) {
                            this.validator.searchMissingFunAndError(
                                    fun, this.funs, thisKlass.name + ' method'
                            );
                        }
                    }
                }
            };
        },

        Printer: (function() {
            var STATEMENT_END = ';\n';

            var Printer = function (validator) {
                this.validator = validator;

                this.tempVarCounter = 0;

                this.isCode = true;
                this.pre   = [];
                this.stmts = [];
                this.preOrStmts = this.stmts;

                this.currentPre  = new quby.main.PrinterStatement();
                this.currentStmt = new quby.main.PrinterStatement();
                this.current     = this.currentStmts;

                Object.preventExtensions( this );
            }

            Printer.prototype = {
                getTempVariable: function() {
                    return quby.runtime.TEMP_VARIABLE + (this.tempVarCounter++);
                },

                getValidator: function () {
                    return this.validator;
                },

                setCodeMode: function (isCode) {
                    if ( isCode ) {
                        this.current = this.currentStmt;
                        this.preOrStmts = this.stmts;
                    } else {
                        this.current = this.currentPre;
                        this.preOrStmts = this.pre;
                    }

                    this.isCode = isCode;
                },

                appendExtensionClassStmts: function (name, stmts) {
                    var stmtsStart = quby.runtime.translateClassName(name) + '.prototype.';

                    for (var key in stmts) {
                        var fun = stmts[key];

                        if ( fun.isConstructor ) {
                            fun.print( this );
                        } else {
                            this.append(stmtsStart);
                            fun.print( this );
                        }

                        this.endStatement();
                    }
                },

                printArray: function(arr) {
                    for (
                            var i = 0, len = arr.length;
                            i < len;
                            i++
                    ) {
                        arr[i].print( this );
                        this.endStatement();
                    }
                },

                addStatement: function() {
                    this.stmts.push( arguments.join('') );
                },

                flush: function() {
                    this.current.flush( this.preOrStmts );

                    return this;
                },

                endStatement: function () {
                    this.append( STATEMENT_END );

                    return this.flush();
                },

                toString: function () {
                    // concat everything into this.pre ...
                    this.currentPre.flush( this.pre );
                    util.array.addAll( this.pre, this.stmts );
                    this.currentStmt.flush( this.pre ); // yes, pass in pre!

                    return this.pre.join('');
                }
            }

            // Chrome is much faster at iterating over the arguments array,
            // maybe I'm hitting an optimization???
            // see: http://jsperf.com/skip-arguments-check
            if ( util.browser.isChrome ) {
                Printer.prototype.appendPre = function () {
                    for ( var i = 0; i < arguments.length; i++ ) {
                        this.current.appendPre(arguments[i]);
                    }

                    return this;
                };
                Printer.prototype.append = function () {
                    for ( var i = 0; i < arguments.length; i++ ) {
                        this.current.appendNow(arguments[i]);
                    }

                    return this;
                };
                Printer.prototype.appendPost = function () {
                    for ( var i = 0; i < arguments.length; i++ ) {
                        this.current.appendPost(arguments[i]);
                    }

                    return this;
                };
            } else {
                Printer.prototype.appendPre = function (a) {
                    if ( arguments.length === 1 ) {
                        this.current.appendPre( a );
                    } else {
                        for ( var i = 0; i < arguments.length; i++ ) {
                            this.current.appendPre(arguments[i]);
                        }
                    }

                    return this;
                };
                Printer.prototype.append = function (a) {
                    if ( arguments.length === 1 ) {
                        this.current.appendNow( a );
                    } else {
                        for ( var i = 0; i < arguments.length; i++ ) {
                            this.current.appendNow(arguments[i]);
                        }
                    }

                    return this;
                };
                Printer.prototype.appendPost = function (a) {
                    if ( arguments.length === 1 ) {
                        this.current.appendPost( a );
                    } else {
                        for ( var i = 0; i < arguments.length; i++ ) {
                            this.current.appendPost(arguments[i]);
                        }
                    }

                    return this;
                };
            }

            return Printer;
        })(),

        PrinterStatement: (function() {
            var PrinterStatement = function () {
                this.preStatement     = null;
                this.currentStatement = null;
                this.postStatement    = null;

                Object.preventExtensions( this );
            }

            PrinterStatement.prototype = {
                appendPre: function (e) {
                    if (this.preStatement === null) {
                        this.preStatement = [e];
                    } else {
                        this.preStatement.push( e );
                    }
                },
                appendNow: function (e) {
                    if (this.currentStatement === null) {
                        this.currentStatement = [e];
                    } else {
                        this.currentStatement.push( e );
                    }
                },
                appendPost: function (e) {
                    if (this.postStatement === null) {
                        this.postStatement = [e];
                    } else {
                        this.postStatement.push( e );
                    }
                },

                endAppend: function( dest, src ) {
                    for (
                            var i = 0, len = src.length;
                            i < len;
                            i++
                    ) {
                        dest[ dest.length ] = src[i];
                    }
                },

                flush: function ( stmts ) {
                    if (this.preStatement !== null) {
                        if (this.currentStatement !== null) {
                            if (this.postStatement !== null) {
                                this.endAppend( stmts, this.preStatement );
                                this.endAppend( stmts, this.currentStatement );
                                this.endAppend( stmts, this.postStatement );
                            } else {
                                this.endAppend( stmts, this.preStatement );
                                this.endAppend( stmts, this.currentStatement );
                            }
                        } else if (this.postStatement !== null) {
                            this.endAppend( stmts, this.preStatement );
                            this.endAppend( stmts, this.postStatement );
                        } else {
                            this.endAppend( stmts, this.preStatement );
                        }

                        this.clear();
                    } else if (this.currentStatement !== null) {
                        if (this.postStatement !== null) {
                            this.endAppend( stmts, this.currentStatement );
                            this.endAppend( stmts, this.postStatement );
                        } else {
                            this.endAppend( stmts, this.currentStatement );
                        }

                        this.clear();
                    } else if ( this.postStatement !== null ) {
                        this.endAppend( stmts, this.postStatement );

                        this.clear();
                    }
                },

                clear: function () {
                    this.preStatement     = null;
                    this.currentStatement = null;
                    this.postStatement    = null;
                }
            }

            return PrinterStatement;
        })(),

        LineInfo: (function() {
            var LineInfo = function (offset, source) {
                this.offset = offset;
                this.source = source;

                Object.preventExtensions( this );
            }

            LineInfo.prototype.getLine = function () {
                return this.source.getLine(this.offset);
            }

            return LineInfo;
        })()
    };
})( quby, util );
