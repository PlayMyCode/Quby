///<reference path='lib/util.ts' />

"use strict";

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
module quby.main {
    export function runScriptTagsDisplay() {
        runScriptTags(function(r:Result) {
            r.runOrDisplayErrors();
        });
    }

    /**
     * Looks for scripts tags with the type
     * 'text/quby'. They are then pulled out,
     * and parsed in order.
     *
     * The result is then passed into the
     * callback given.
     *
     * If no callback is given, then the result
     * is just run automatically, or throws an
     * error if the source is incorrect.
     */
    export function runScriptTags(onResult?:(result:Result) => void) {
        if (!onResult) {
            onResult = function(result) {
                if (result.hasErrors()) {
                    throw new Error( result.getErrors()[0].error );
                } else {
                    result.run();
                }
            };
        }

        var scripts = document.getElementsByTagName('script');
        var parser = new Parser();

        var inlineScriptCount = 1;

        for (var i = 0; i < scripts.length; i++) {
            var script = <HTMLScriptElement> scripts[i],
                name:string = script.getAttribute('data-name') || null,
                type:string = script.getAttribute('type');

            if (type === 'text/quby' || type === 'quby') {
                var instance:ParserInstance = null;
                var isAdmin = (script.getAttribute('data-admin') === 'true') ?
                        true :
                        false;

                var contents = script.innerHTML;

                // inlined tags
                if (contents !== '' && contents !== undefined) {
                    /**
                     * If no name given, work out a suitable one.
                     */
                    if (name === null) {
                        if (script.id) {
                            name = '#' + script.id;
                        } else if (script.className) {
                            name = '.' + util.str.trim(script.className.replace(/ +/g, ', .'));
                        } else {
                            name = 'inline script ' + inlineScriptCount++;
                        }
                    }

                    // remove the CDATA wrap, if present
                    contents = contents.
                          replace(/^\/\/<!\[CDATA\[/, "").
                          replace(/\/\/\]\]>$/, "");

                    instance = parser.parse(contents);

                    // src tags
                } else {
                    var src = script.getAttribute('src');

                    if (src === undefined) {
                        throw new Error('cannot read script tag');
                    } else {
                        instance = parser.parseUrl(src);
                    }
                }

                instance.adminMode(isAdmin);
                if (name !== null) {
                    instance.name(name);
                }
            }
        }

        parser.finalize(onResult);
    }

    /**
     *
     */
    export function parse(source:string, adminMode:boolean, callback:(result:Result) => void) {
        var parser = new Parser();

        parser.
                parse(source).
                adminMode(adminMode);
        parser.finalize(callback);
    }

    function handleError( errHandler:(err:Error) => void, err: Error): void {
        if (errHandler !== null) {
            errHandler(err);
        } else {
            throw err;
        }
    }

    export class ParserInstance {
        private isStrictFlag:boolean;
        private isAdminFlag:boolean;

        private whenFinished:() => void;
        private debugCallback:parse.DebugCallback;

        private strName:string;

        private isExplicitelyNamed:boolean;

        private hasParsed:boolean;

        private source:string;

        constructor(source: string) {
            this.source = source;

            this.isStrictFlag = true;
            this.isAdminFlag = true;

            this.strName = '<Unknown Script>';
            this.isExplicitelyNamed = false;
            this.hasParsed = false;

            this.whenFinished = null;
            this.debugCallback = null;
        }

        private ensureCanParse() {
            if (this.hasParsed) {
                throw new Error("adding new properties to an instance which has finished parsing");
            }
        }

        adminMode(isAdmin: boolean = true) {
            this.ensureCanParse();

            return this;
        }

        isAdmin(): boolean {
            return this.isAdminFlag;
        }

        /**
         * Disables strict mode for the current bout of parsing.
         */
        strictMode(isStrict: boolean = true) {
            this.ensureCanParse();

            return this;
        }

        isStrict(): boolean {
            return this.isStrictFlag;
        }

        /**
         * Gives this parser a name, for use in the error messages.
         * i.e. 'main.qb', or 'some-game'.
         *
         * The name can be anything you want.
         */
        name(name: string, isExplicitelyNamed: boolean = true) {
            this.ensureCanParse();

            this.strName = name;
            this.isExplicitelyNamed = isExplicitelyNamed;

            return this;
        }

        getName(): string {
            return this.strName;
        }

        getSource(): string {
            return this.source;
        }

        /**
         * A callback to run for when *just this file*
         * has finished being parsed.
         *
         * Note that this will happen before you call
         * 'finalise'.
         */
        onFinish(fun:() => void) {
            this.ensureCanParse();

            this.whenFinished = fun;

            return this;
        }

        getFinishedFun():() => void {
            return this.whenFinished;
        }

        /**
         * Once called, properties can no longer be changed
         * on this object.
         * 
         * It's to indicate that it's started being parsed.
         */
        lock() {
            this.hasParsed = true;
        }

        /**
         * If a debugCallback is provided, then it will be called during
         * the parsing process. This makes parsing a tad slower, but provides
         * you with information on how it wen't (like the symbols generated
         * and how long the different stages took).
         *
         * If no debugCallback is provided, then it is run normally.
         */
        onDebug(fun:parse.DebugCallback) {
            this.ensureCanParse();

            this.debugCallback = fun;

            return this;
        }

        getDebugFun() {
            return this.debugCallback;
        }
    }

    /**
     * This is for using multiple parsers together, for parsing multiple files.
     *
     * You can imagine a program is built from multiple files.
     * This is how parsing is based; you call a method to provide
     * a file until they are all provided. Then you call 'finalize'
     * to finish compilation and generate the actual JS application.
     *
     * Some of these files may have different permissions;
     * core files with admin rights, and user files without these rights.
     * The various methods allow you to state what can do what.
     * 
     * 'Strict mode' adds some extra errors, for common bugs.
     * This is mostly used to cover up differences between versions,
     * where having strict mode off, will try not to error on a
     * breaking change (if possible).
     * 
     * It also adds errors for some common code bugs.
     */
    export class Parser {
        private validator: quby.core.Validator;
        private isStrict: boolean;
        private errHandler: (err: Error) => void;

        constructor() {
            this.validator = new quby.core.Validator();
            this.isStrict = true;
            this.errHandler = null;
        }

        private newParserInstance(src: string = null) : ParserInstance {
            try {
                var instance = new ParserInstance(src);
                instance.strictMode(this.isStrict);

                return instance;
            } catch (err) {
                handleError(this.errHandler, err);
            }

            return null;
        }

        public errorHandler(handler: (err: Error) => void ) : void {
            this.errHandler = handler;
        }

        /**
         * Enabled strict mode, for all parsing,
         * which is on by default.
         *
         * Note that you can disable it for indevidual
         * files with 'strictMode'.
         */
        strictModeAll(isStrict: boolean = true): void {
            this.isStrict = isStrict;
        }

        /**
         * Parse a single file, adding it to the program being built.
         *
         * A ParseInstance is returned, allowing you to customize
         * the setup of how the files should be parsed.
         */
        parse(source: string) : ParserInstance {
            var instance = this.newParserInstance(source),
                validator = this.validator;

            var self = this;
            util.future.run(
                    function() {
                        quby.core.runParser(instance, validator, self.errHandler);
                    }
            );

            return instance;
        }

        parseUrl(url: string) : ParserInstance {
            var instance = this.newParserInstance(),
                validator = this.validator,
                name = util.url.stripDomain(url),
                questionMark = name.indexOf('?');

            if (questionMark !== -1) {
                name = name.substring(0, questionMark);
            }

            instance.name(name);

            util.ajax.getFuture(
                    url,
                    function(status, text) {
                        if (status >= 200 && status < 400) {
                            quby.core.runParser(instance, validator, this.errHandler);
                        } else {
                            throw new Error("failed to load script: " + url);
                        }
                    }
            );

            return instance;
        }

        parseUrls(urls: string[]) : Parser {
            for (var i = 0; i < urls.length; i++) {
                this.parseUrl(urls[i]);
            }

            return this;
        }

        parseArgs(source: string, adminMode: boolean, callback:() => void, debugCallback: parse.DebugCallback) : ParserInstance {
            return this.
                    parse(source).
                    adminMode(adminMode).
                    onFinish(callback).
                    onDebug(debugCallback);
        }

        parseSources(sources: string[], adminMode: boolean, callback?: (result: Result) => void ) {
            util.future.map(sources, (source: string) => {
                this.parse(source).adminMode(adminMode);
            });

            if (callback) {
                this.finalize(callback);
            }
        }

        /**
         * Call when you are done parsing files.
         * 
         * This finishes the process, and
         * finalises the program.
         * 
         * The callback given is then called
         * with the resulting program, or errors.
         *
         * As a UK citizen, spelling this 'finalize',
         * makes me feel dirty : ( .
         */
        finalize( callback: ( result: Result, times?: { finalise: number; print: number; }) => void ): void {
            util.future.run(
                    () => {
                        var times = {
                            finalise: 0,
                            print: 0
                        };

                        var output = this.validator.finaliseProgram(times);
                        var result = new Result(
                                output,
                                this.validator.getErrors()
                        );
                        
                        util.future.runFun(function() {
                            callback( result, times );
                        });
                    }
            );
        }
    }

    /**
     * Result
     *
     * Handles creation and the structures for the object you get back from the parser.
     *
     * Essentially anything which crosses from the parser to the caller is stored and
     * handled by the contents of this script.
     */
    export class Result {
        private program: string;
        private errors: quby.core.ErrorInfo[];
        private onErrorFun: (ex:Error) => void;

        constructor(program: string, errors: quby.core.ErrorInfo[]) {
            this.program = program;
            this.errors = errors;

            // default error behaviour
            this.onErrorFun = function(ex: Error) {
                var errorMessage = ex.name + ': ' + ex.message;

                if (ex['stack']) {
                    errorMessage += '\n\n' + ex['stack'];
                }

                alert(errorMessage);
            };
        }

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
        setOnError(fun: (ex: Error) =>void ): Result {
            this.onErrorFun = fun;

            return this;
        }

        /**
         * @return Returns the Quby application in it's compiled JavaScript form.
         */
        getCode() : string {
            return this.program;
        }

        /**
         * @return True if there were errors within the result, otherwise false if there are no errors.
         */
        hasErrors() : boolean {
            return this.errors.length > 0;
        }

        getErrors() : quby.core.ErrorInfo[] {
            return this.errors;
        }

        runOrDisplayErrors() : void {
            if (this.hasErrors()) {
                this.displayErrors();
            } else {
                this.run();
            }
        }

        /**
         * This will display all of the errors within the
         * current web page.
         *
         * This is meant for development purposes.
         */
        displayErrors() {
            var errors = this.getErrors();

            var iframe = new HTMLIFrameElement();
            iframe.setAttribute('width', '800px');
            iframe.setAttribute('height', '400px');
            iframe.setAttribute('frameborder', '0');
            iframe.setAttribute('src', 'about:blank');

            iframe.style.transition =
            iframe.style['OTransition'] =
            iframe.style['MsTransition'] =
            iframe.style['MozTransition'] =
            iframe.style['WebkitTransition'] = 'opacity 200ms linear';

            iframe.style.background = 'transparent';
            iframe.style.opacity = '0';
            iframe.style.zIndex = '100000';
            iframe.style.top = '100px';
            iframe.style.right = '0';
            iframe.style.left = '50%';
            iframe.style.bottom = '0';
            iframe.style.position = 'fixed';
            iframe.style.marginLeft = '-400px';

            iframe.onload = function () {
                var iDoc: Document = <Document> ( iframe.contentWindow || iframe.contentDocument );
                if ( iDoc['document'] ) {
                    iDoc = < Document > iDoc['document'];
                }

                var html = [];

                html.push('<div style="background: rgba(0,0,0,0.5); border-radius: 4px; width: 100%; height: 100%; position: absolute; top: 0; left: 0;">');
                html.push('<div style="width: 700px; margin: 12px auto; scroll: auto; color: whitesmoke; font-family: \'DejaVu Sans Mono\', monospaced; font-size: 14px;">');
                var currentName = null;

                for (var i = 0; i < errors.length; i++) {
                    var error = errors[i],
                        name = error.name;

                    if (currentName !== name) {
                        html.push('<h1>');
                        html.push(util.str.htmlToText(name));
                        html.push('</h1>');

                        currentName = name;
                    }

                    html.push('<div style="width: 100%">')
                    html.push(error.message)
                    html.push('</div>');
                }
                html.push('</div>');
                html.push('</div>');

                var iBody = iDoc.getElementsByTagName('body')[0];
                iBody.innerHTML = html.join('');
                iBody.style.margin = '0';
                iBody.style.padding = '0';

                iframe.style.opacity = '1';
            }

            var body = document.getElementsByTagName('body')[0];
            if (body) {
                body.appendChild(iframe);
            } else {
                setTimeout(function() {
                    document.getElementsByTagName('body')[0].appendChild(iframe);
                }, 1000);
            }
        }

        /**
         * This is boiler plate to call quby.runtime.runCode for you using the
         * code stored in this Result object and the onError function set.
         */
        run() : void {
            if (!this.hasErrors()) {
                quby.runtime.runCode(this.getCode(), this.onErrorFun);
            }
        }
    }
}
