"use strict";

console.log( '-- cookies ' + document.cookie );

var cookie = getSaveSettings();
var includeCore = ( cookie.includeCore !== undefined ? cookie.includeCore : false );
var isAdmin     = ( cookie.isAdmin     !== undefined ? cookie.isAdmin     : true  );
var debugMode   = ( cookie.debugMode   !== undefined ? cookie.debugMode   : true  );

updateSaveSettings(function(obj) {
    obj.includeCore = includeCore;
    obj.isAdmin     = isAdmin;
    obj.debugMode   = debugMode;
});

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
    debugMode = ! debugMode;
    setSaveSetting( 'debugMode', debugMode );
}

function switchIncludeCore() {
    includeCore = !includeCore;
    setSaveSetting( 'includeCore', includeCore );
}

function switchIsAdmin() {
    isAdmin = !isAdmin;
    setSaveSetting( 'isAdmin', isAdmin );
}
    
function setCheckbox( id, checked ) {
    document.getElementById( id ).checked = !! checked ;
}

/// 
///     Save Settings
/// 
/// Settings and options are saved to a cookie as a JSON object.
/// 

function getSaveSettings() {
    var cookie = document.cookie;

    if ( cookie ) {
        if ( cookie.indexOf('settings=') !== 0 ) {
            document.cookie = 'settings=;expires=' + +new Date() ;
        } else {
            cookie = cookie.replace('settings=', '');
            cookie = cookie.replace(/;.*/, '');

            try {
                return JSON.parse( cookie ) || {};
            } catch ( ex ) {
                // Something has gone wrong with parsing so wipe the settings.
                // We can't parse them so whatever they are they must be corrupt.
                documeent.cookie = 'settings=;expires=' + +new Date() ;
            }
        }
    }

    return {};
}

function setSaveSettings( obj ) {
    var date = new Date();
    date.setYear( date.getFullYear() + 1 );

    document.cookie = 'settings=' + JSON.stringify( obj ) + ';expires=' + +date ;
}

function setSaveSetting( key, value ) {
    var obj = getSaveSettings();
    obj[key + ''] = value;
    setSaveSettings(obj);
}

function updateSaveSettings( callback ) {
    var obj = getSaveSettings();
    callback( obj );
    setSaveSettings( obj );
}


/**
 * WARNING! This is a BLOCKING function!
 *
 * This is a blocking function. It does not take a callback, instead it blocks
 * processing of the script until the request has finished.
 *
 * This is done for ease of programming.
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

function numDigitsInInt( num ) {
    if (typeof num === 'string') {
        return num.length;
    } else {
        num = num | 0;
        var n = 1;

        if (num >= 100000000) { num /= 100000000; n += 8; }
        if (num >= 10000) { num /= 10000; n += 4; }
        if (num >= 100) { num /= 100; n += 2; }
        if (num >= 10) { num /= 10; n += 1; }

        return n;
    }
}

function padStr( time, padLen ) {
    time = "" + time;
    var len = time.length;

    while ( padLen -- > len ) {
        time = "&#x2002;" + time;
    }

    return time;
}

function parseCode( callback ) {
    setTimeout(function() {
        try {
            parseCodeInner( callback );
        } catch ( err ) {
            handleError( err );
        }
    });
}

function parseCodeInner( callback ) {
    var outputCode = document.getElementById("js-output-code"),
        outputError = document.getElementById("js-output-error"),
        outputSymbols = document.getElementById("js-output-symbols");

    outputSymbols.value = '';

    var parser = new quby.main.Parser();
    parser.errorHandler( handleError );

    var compileTime     = -1,
        symbolsTime     = -1,
        rulesTime       = -1,
        parseTotal      = -1,
        validateTime    = -1,
        printTime       = -1,
        finalizeTime    = -1,
        pageTime = Date.now();

    var updateControlsTime = function( times ) {
        console.log(' -- times');
        console.log( times );
        console.log('');

        compileTime += ( times.parseCompile !== undefined ) ? times.parseCompile : 0;
        symbolsTime += ( times.parseSymbols !== undefined ) ? times.parseSymbols : 0;
        rulesTime   += ( times.parseRules   !== undefined ) ? times.parseRules   : 0;
        parseTotal  += ( times.parseTotal   !== undefined ) ? times.parseTotal   : 0;

        if (times.validateTime !== undefined) {
            validateTime = times.validateTime;
        }
        if (times.print !== undefined) {
            printTime = times.print;
        }
        if (times.finalise !== undefined) {
            finalizeTime = times.finalise;
        }

        var strCompileTime     = compileTime    !== -1 ? compileTime  : '?',
            strSymbolsTime     = symbolsTime    !== -1 ? symbolsTime  : '?',
            strRulesTime       = rulesTime      !== -1 ? rulesTime    : '?',
            strParseTotal      = parseTotal     !== -1 ? parseTotal   : '?',
            strValidateTime    = validateTime   !== -1 ? validateTime : '?',
            strPrintTime       = printTime      !== -1 ? printTime    : '?',
            strFinalizeTime    = finalizeTime   !== -1 ? finalizeTime : '?'

        var timeLen = Math.max(
                numDigitsInInt( strCompileTime  ),
                numDigitsInInt( strSymbolsTime  ),
                numDigitsInInt( strRulesTime    ),
                numDigitsInInt( strParseTotal   ),
                numDigitsInInt( strValidateTime ),
                numDigitsInInt( strPrintTime    ),
                numDigitsInInt( strFinalizeTime )
        ) + 1;

        document.getElementsByClassName('controls-time-info')[0].innerHTML =
                "compile " + padStr(strCompileTime  , timeLen)      + "ms<br/>" +
                "symbols " + padStr(strSymbolsTime  , timeLen)      + "ms<br/>" +
                  "rules " + padStr(strRulesTime    , timeLen)      + "ms<br/>" +
            "parse total " + padStr(strParseTotal   , timeLen)      + "ms<br/>" +
                                                                        "<br/>" +
             "validation " + padStr(strValidateTime , timeLen)      + "ms<br/>" +
                  "print " + padStr(strPrintTime    , timeLen)      + "ms<br/>" +
               "finalize " + padStr(strFinalizeTime , timeLen)      + "ms<br/>" +
                                                                        "<br/>" +
             "page total " + padStr(Date.now() - pageTime, timeLen) + "ms"      ;
    };

    if ( includeCore ) {
        var core = getSourceFile( "./core.qb" );

        parser.
                parse(core).
                adminMode(true).
                onDebug( updateControlsTime );
    }

    var sourceCode = getCodePane();
    if (debugMode) {
        parser.
                parse(sourceCode).
                adminMode(isAdmin).
                onDebug( updateControlsTime );
    } else {
        parser.
                parse(sourceCode).
                adminMode(isAdmin);
    }

    parser.
            finalize(function(result, times) {
                updateControlsTime( times );

                outputCode.value = result.getCode();
                handleError(
                        result.hasErrors() ?
                                result.getErrors().map(function(e) { return e.message }).join("\r\n") + "\r\n" :
                                ''
                );

                _result = result;

                if (callback) {
                    callback();
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

    /*
     * Handle the file switching selector.
     */

    var qbFileCache = {};
    var currentOption = null;
    var filesDom = document.querySelector( '.js-code-files' );

    var setQbSrc = function( nextOption ) {
        if ( currentOption !== nextOption ) {
            qbFileCache[ currentOption ] = getCodePane();

            if ( qbFileCache.hasOwnProperty(nextOption) ) {
                setCodePane( qbFileCache[nextOption] );
            } else if ( nextOption === '' ) {
                setCodePane( '' );
            } else {
                setCodePane( getSourceFile(nextOption) );
            }

            currentOption = nextOption;
            setSaveSetting( 'qbFile', nextOption );

            var options = filesDom.querySelectorAll( 'option' );
            for ( var i = 0; i < options.length; i++ ) {
                var option = options[i];

                if ( option.value === nextOption ) {
                    option.selected = true;
                } else if ( option.selected ) {
                    option.selected = false;
                }
            }
        }
    };

    for ( var i = 0; i < qubyFiles.length; i++ ) {
        var qbFile = qubyFiles[i];
        var optionDom = document.createElement( 'option' );

        optionDom.textContent = qbFile.name;
        optionDom.value = qbFile.src;

        filesDom.appendChild( optionDom );
    }

    // if a selected file is saved then select it
    // or select the first item
    var qbCookieFile = getSaveSettings().qbFile;
    if ( qbCookieFile ) {
        setQbSrc( qbCookieFile );
    } else if ( qubyFiles.length > 0 ) {
        setQbSrc( qubyFiles[0].src );
    }

    filesDom.addEventListener( 'change', function(ev) {
        var selectedOption = this.selectedOptions.item(0);

        if ( selectedOption !== null ) {
            setQbSrc( selectedOption.value );
        }
    });
} );

