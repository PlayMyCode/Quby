"use strict";

var includeCore = false;
var isAdmin = true;
var debugMode = true;

var scriptsLoading = 0,
    scriptsLoadFuns = [],
    scriptsLoadFun = function() {
        for ( var i = 0; i < scriptsLoadFuns.length; i++ ) {
            scriptsLoadFuns[i]();
        }
    };

/**
 * Counts and tracks the number of external scripts currently being loaded,
 * and when they are all loaded, calls the 'scriptsLoadFun'.
 * 
 * This can also be used to set the scriptsLoadFun, by just passing a
 * function in. It can also take multiple function calls.
 */
function scriptLoad( inc ) {
    if ( typeof inc === 'number' ) {
        scriptsLoading += inc;

        if ( scriptsLoading === 0 && scriptsLoadFun ) {
            scriptsLoadFun();
            scriptsLoadFun = null;
        }

    // store the fun to call it later
    } else if ( inc instanceof Function ) {
        scriptsLoadFuns.push( inc );

    } else {
        console.log( inc );

        throw new Error( "unknown parameter given " + inc );
    }
}

/**
 * Creates new Script tags to inject scripts, which should be loaded.
 * 
 * This is used because it adds on a timestamp, to prevent caching.
 */
function addScripts( prefix, libs, type ) {
    var time = Date.now();
    
    if ( typeof libs === 'string' || (libs instanceof String ) ) {
        libs = [ libs ];
    }

    // ensure it ends with a slash
    if ( prefix !== '' && prefix.charAt(prefix.length-1) !== '/' ) {
        prefix += '/';
    }

    // generate the script tags to insert, then insert them
    for ( var i = 0; i < libs.length; i++ ) {
        (function(prefix, lib, type) {
            scriptLoad( 1 );

            var ajaxObj = new XMLHttpRequest();

            ajaxObj.onreadystatechange = function() {
                if ( ajaxObj.readyState === 4 ) {
                    var err    = undefined,
                        status = ajaxObj.status;

                    // ERROR!
                    if ( ! (status >= 200 && status < 300 || status === 304) ) {
                        console.error([
                                '-----------------------',
                                '  error ' + lib,
                                '-----------------------',
                                '',
                                ajaxObj.responseText,
                                ''
                        ].join("\n"))

                        scriptLoad( -1 );

                    // SUCCESS!
                    } else {
                        var scriptTag = document.createElement( 'script' );
                        scriptTag.innerHTML = ajaxObj.responseText;

                        if ( type ) {
                            scriptTag.setAttribute( 'type', type );
                        }

                        setTimeout( function() {
                            scriptLoad( -1 );
                        }, 0 );

                        document.head.appendChild( scriptTag );
                    }
                }
            }

            ajaxObj.open( 'GET', prefix + lib + '?' + time, true );

            ajaxObj.send( '' );
        })( prefix, libs[i], type );
    }
}

function switchDebugMode() {
    debugMode = !debugMode;
}

function switchIncludeCore() {
    includeCore = !includeCore;
}

function switchIsAdmin() {
    isAdmin = !isAdmin;
}
    
function setCheckbox( id, checked ) {
    document.getElementById( id ).checked = checked;
}

/**
 * WARNING! This is a blocking function. It does not take a callback, instead
 * it blocks processing of the script until the request has finished.
 */
function getSourceFile(url) {
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.overrideMimeType( 'text/plain' );
    xmlhttp.open("GET", url, false);
    xmlhttp.send();

    return xmlhttp.responseText;
}
    
var _result = null;

function handleError( err ) {
    var outputError = document.getElementById("js-output-error")

    if ( err instanceof Error ) {
        var strErr = [
                err.message,
                err.stack
        ].join("\n");

        outputError.classList.add( 'error' );
        outputError.value = strErr;
        console.error( strErr );
        console.log( err.stack );
    } else {
        outputError.classList.remove( 'error' );
        outputError.value = err;
    }
}

/**
 * Sets the code to be displayed in the code panel.
 *
 * @param code The code to show in the panel.
 */
function setCodePane( code ) {
    document.getElementById("js-source-code").value = code;
}

/**
 * @return The code currently inside of the code panel.
 */
function getCodePane() {
    return document.getElementById("js-source-code").value;
}

function parseCode( callback ) {
    setTimeout(function() {
        try {
            var outputCode = document.getElementById("js-output-code"),
                outputError = document.getElementById("js-output-error"),
                outputSymbols = document.getElementById("js-output-symbols");

            outputSymbols.value = '';

            var parser = new quby.main.Parser();
            parser.errorHandler( handleError );

            var compileTime = 0,
                symbolsTime = 0,
                rulesTime = 0,
                totalTime = 0,
                printTime = 0,
                finalizeTime = 0;

            var updateControlsTime = function() {
                var timeLen = Math.max(
                        (compileTime+"").length,
                        (symbolsTime+"").length,
                        (rulesTime+"").length,
                        (totalTime+"").length,
                        (printTime+"").length,
                        (finalizeTime+"").length
                ) + 1;

                var pad = function( time ) {
                    var padLen = timeLen;
                    var len = (""+time).length;

                    while ( padLen -- > len ) {
                        time = "&#x2002;" + time;
                    }

                    return time;
                }

                document.getElementsByClassName('controls-time-info')[0].innerHTML =
                        "compile " + pad(compileTime) + "ms<br/>" +
                        "symbols " + pad(symbolsTime) + "ms<br/>" +
                          "rules " + pad(  rulesTime) + "ms<br/>" +
                          "total " + pad(  totalTime) + "ms<br/>" +
                                                          "<br/>" +
                          "print " + pad(  printTime) + "ms<br/>" +
                       "finalize " + pad(finalizeTime) + "ms" ;
            };

            if (includeCore) {
                var core = getSourceFile("./core.qb");

                parser.
                        parse(core).
                        adminMode(true).
                        onDebug(function(symbols, times) {
                            compileTime += times.compile;
                            symbolsTime += times.symbols;
                            rulesTime += times.rules;
                            totalTime += times.total;

                            updateControlsTime();
                        });
            }

            var sourceCode = getCodePane();
            if (debugMode) {
                parser.
                        parse(sourceCode).
                        adminMode(isAdmin).
                        onDebug(function(symbols, times) {
                            var displaySymbols = new Array(symbols.length);

                            for (var i = 0; i < symbols.length; i++) {
                                displaySymbols[i] = symbols[i].name();
                            }

                            outputSymbols.value = displaySymbols.join("\n");

                            compileTime += times.compile;
                            symbolsTime += times.symbols;
                            rulesTime += times.rules;
                            totalTime += times.total;

                            updateControlsTime();
                        });
            } else {
                parser.
                        parse(sourceCode).
                        adminMode(isAdmin);
            }

            parser.
                    finalize(function(result, times) {
                        outputCode.value = result.getCode();
                        handleError(
                                ( outputError.value = result.hasErrors() ?
                                        result.errors.map(function(e) { return e.message }).join("\r\n") + "\r\n" :
                                        '' )
                        );

                        _result = result;

                        printTime = times.print;
                        finalizeTime = times.finalise;

                        updateControlsTime();

                        if (callback) {
                            callback();
                        }
                    });
        } catch ( err ) {
            handleError( err );
        }
    });
}

function runCode() {
    if ( _result == null ) {
        parseCode()
    } else {
        _result.run();
    }
}

function addNumbersToCodePanes() {
    var numbers = '';
    for (var i = 1; i < 50; i++) {
        numbers += i + "<br/>";
    }
    var objs = document.getElementsByClassName( 'js-line-numbers' );
    
    for (i = 0; i < objs.length; i++) {
        var obj = objs[i];

        obj.innerHTML = numbers;
    }
}

var qubyFiles = [];
function addQubyFiles( name, src ) {
    if ( arguments.length === 2 ) {
        qubyFiles.push({ name: name, src: src });
    } else {
        for ( var k in name ) {
            if ( name.hasOwnProperty(k) ) {
                addQubyFiles( k, name[k] );
            }
        }
    }
}

window.addEventListener( 'load', function() {
    setCheckbox( 'checkbox_include' , includeCore );
    setCheckbox( 'checkbox_debug'   , debugMode   );
    setCheckbox( 'checkbox_is_admin', isAdmin     );

    document.getElementById('js-output-code').value = '';
    document.getElementById('js-output-error').value = '';

    addNumbersToCodePanes();

    var filesDom = document.querySelector( '.js-code-files' );
    for ( var i = 0; i < qubyFiles.length; i++ ) {
        var qbFile = qubyFiles[i];
        var optionDom = document.createElement( 'option' );

        optionDom.textContent = qbFile.name;
        optionDom.value = qbFile.src;

        filesDom.appendChild( optionDom );
    }

    /*
     * Handle the file switching selector.
     */

    var qbFileCache = {};
    var currentOption = null;

    var setQbSrc = function( nextOption ) {
        if ( currentOption !== nextOption ) {
            if ( qbFileCache.hasOwnProperty(nextOption) ) {
                qbFileCache[ currentOption ] = getCodePane();
                setCodePane( qbFileCache[nextOption] );
                currentOption = nextOption;
            } else if ( nextOption === '' ) {
                qbFileCache[ currentOption ] = getCodePane();
                setCodePane( '' );
                currentOption = nextOption;
            } else {
                qbFileCache[ currentOption ] = getCodePane();
                setCodePane( getSourceFile(nextOption) );
                currentOption = nextOption;
            }
        }
    };

    filesDom.addEventListener( 'change', function(ev) {
        var selectedOption = this.selectedOptions.item(0);

        if ( selectedOption !== null ) {
            setQbSrc( selectedOption.value );
        }
    });
} );

