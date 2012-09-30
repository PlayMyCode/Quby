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
        runScriptTags: function( onResult ) {
            if ( ! onResult ) {
                onResult = function( result ) {
                    if ( result.hasErrors() ) {
                        throw new Error( result.errors[0] );
                    } else {
                        result.run();
                    }
                };
            }

            var scripts = document.getElementsByTagName( 'script' );
            var scriptCount        = 0,
                loadedScripts      = [],
                loadedScriptsAdmin = [];

            var addParseScripts = function( index, text, isAdmin ) {
                loadedScripts[index]      = text;
                loadedScriptsAdmin[index] = isAdmin;
            };

            /*
             * This variables ensures it should only run once,
             * however I am pretty certain it is not needed,
             * due to the way it's structured.
             *
             * This is just kept as a fallback, in case I am wrong.
             */
            var isParsed = false;
            var runParseScripts = function() {
                if ( !isParsed && scriptCount === loadedScripts.length ) {
                    isParsed = true;

                    var parser = new quby.main.Parser();

                    for ( var i = 0; i < scriptCount; i++ ) {
                        parser.parse( loadedScripts[i], loadedScriptsAdmin[i] );
                    }

                    parser.finish( onResult );
                }
            }

            for ( var i = 0; i < scripts.length; i++ ) {
                var script = scripts[i],
                    type   = script.getAttribute('type');

                if ( type === 'text/quby' || type === 'quby' ) {
                    var isAdmin = ( script.getAttribute( 'data-admin' ) === 'true' ) ?
                            true  :
                            false ;

                    var contents = script.innerHTML;

                    var scriptIndex = scriptCount;
                    scriptCount++;

                    // inlined tags
                    if ( contents !== '' && contents !== undefined ) {
                        // remove the CDATA wrap, if present
                        contents = contents.
                              replace(/^\/\/<!\[CDATA\[/, "").
                              replace(/\/\/\]\]>$/, "");

                        addParseScripts( scriptIndex, contents, isAdmin );
                        contents = null;

                    // src tags
                    } else {
                        var src = script.getAttribute('src');

                        if ( src === undefined ) {
                            throw new Error('cannot read script tag');
                        } else {
                            (function( src, scriptIndex, isAdmin ) {
                                util.ajax.get( src,
                                        function(text, status) {
                                            if ( status >= 200 && status < 400 ) {
                                                addParseScripts( scriptIndex, text, isAdmin );
                                                runParseScripts();
                                            } else {
                                                throw new Error( "failed to load script: " + src );
                                            }
                                        }
                                );
                            })( src, scriptIndex, isAdmin );
                        }
                    }
                }
            }

            runParseScripts();
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
         * 
         * 'Strict mode' adds some extra errors, for common bugs.
         * This is mostly used to cover up differences between versions,
         * where having strict mode off, will try not to error on a
         * breaking change (if possible).
         * 
         * It also adds errors for some common code bugs.
         */
        Parser: (function () {
            var Parser = function() {
                this.validator = new quby.core.Validator();
            };

            Parser.prototype = {
                    /**
                     * Enabled strict mode, which is on by default.
                     */
                    enableStrictMode: function() {
                        this.validator.setStrictMode( true );
                    },

                    /**
                     * Disabled strict mode, note that strict mode is on by default.
                     */
                    disableStrictMode: function() {
                        this.validator.setStrictMode( false );
                    },

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
                    parse: function( source, adminMode, callback, debugCallback ) {
                        this.validator.isAdminMode = adminMode;

                        var self   = this,
                            parser = new quby.core.ParserInner( source );

                        util.future.run(
                                function() {
                                    parser.run(
                                            function( program, errors, srcData ) {
                                                self.validator.validate( program, errors, srcData );

                                                if ( callback !== undefined && callback !== null ) {
                                                    util.future.runFun( callback );
                                                }
                                            },
                                            debugCallback
                                    );
                                }
                        );
                    },

                    parseSources: function(sources, adminMode, callback) {
                        var _this = this;
                        util.future.map( sources, function(source) {
                            _this.parse( source, adminMode );
                        } );

                        if ( callback != undefined ) {
                            util.future.runFun( callback );
                        }
                    },

                    /**
                     * Call when you are done parsing files.
                     * 
                     * This finishes the process,
                     * and finalises the program.
                     * 
                     * The callback given is then called
                     * with the resulting program, or errors.
                     */
                    finish: function( callback ) {
                        var _this = this;

                        util.future.run(
                                function() {
                                    var output = _this.validator.finaliseProgram();
                                    var result = new quby.main.Result(
                                            output,
                                            _this.validator.getErrors()
                                    );

                                    util.future.runFun( function() {
                                        callback( result );
                                    } );
                                }
                        );
                    }
            };

            return Parser;
        })(),

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

                // default error behaviour
                this.onErrorFun = function( ex ) {
                    var errorMessage = ex.name + ': ' + ex.message;

                    if ( ex.stack ) {
                        errorMessage += '\n\n' + ex.stack;
                    }

                    alert( errorMessage );
                };
            };

            Result.prototype = {
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
                    this.onErrorFun = fun;
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
                    if ( ! this.hasErrors() ) {
                        quby.runtime.runCode( this.getCode(), this.onErrorFun );
                    }
                }
            };

            return Result;
        })()
    };
})( quby, util );
