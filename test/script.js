"use strict";

var includeCore = false, isAdmin = false, debugMode = false, isSymbolizeOn = false;

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

function switchIsSymbolizeOn() {
    isSymbolizeOn = !isSymbolizeOn;
    setSaveSetting( 'isSymbolizeOn', isSymbolizeOn );
}

function switchIncludeCore() {
    includeCore = !includeCore;
    setSaveSetting( 'includeCore', includeCore );
}

function switchIsAdmin() {
    isAdmin = !isAdmin;
    setSaveSetting( 'isAdmin', isAdmin );
}
    
function setCheckboxes( obj ) {
    for ( var id in obj ) {
        if ( obj.hasOwnProperty(id) ) {
            document.getElementById( id ).checked = !! obj[id] ;
        }
    }
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

function parseCode() {
    setTimeout(function() {
        try {
            parseCodeInner();
        } catch ( err ) {
            handleError( err );
        }
    }, 0);
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
        parseRealTotal      = -1,
        validateTime    = -1,
        finalizeTime    = -1,
        printTime       = -1,

        parseTotalTime  = -1,
        totalTime       = -1,

        pageTime = Date.now();

    var updateTimeValue = function( currentVal, newVal ) {
        // no change
        if ( (typeof newVal) !== "number" ) {
            return currentVal;
        } else if ( currentVal === -1 ) {
            return newVal;
        } else {
            return currentVal + newVal;
        }
    }

    var updateControlsTime = function( times ) {
        console.log(' -- times', times);
        console.log();

        // update the indevidual values
        compileTime     = updateTimeValue( compileTime   , times.parseCompile     );
        symbolsTime     = updateTimeValue( symbolsTime   , times.parseSymbols     );
        rulesTime       = updateTimeValue( rulesTime     , times.parseRules       );
        parseRealTotal  = updateTimeValue( parseRealTotal, times.parseTotal       );
        validateTime    = updateTimeValue( validateTime  , times.validatorTotal   );
        finalizeTime    = updateTimeValue( finalizeTime  , times.finalize         );
        printTime       = updateTimeValue( printTime     , times.print            );

        parseTotalTime  = updateTimeValue( parseTotalTime, times.parseCompile   );
        parseTotalTime  = updateTimeValue( parseTotalTime, times.parseSymbols   );
        parseTotalTime  = updateTimeValue( parseTotalTime, times.parseRules     );

        // now add it all to the total time
        totalTime       = updateTimeValue( totalTime     , times.parseCompile     );
        totalTime       = updateTimeValue( totalTime     , times.parseSymbols     );
        totalTime       = updateTimeValue( totalTime     , times.parseRules       );
        totalTime       = updateTimeValue( totalTime     , times.validatorTotal   );
        totalTime       = updateTimeValue( totalTime     , times.finalize         );
        totalTime       = updateTimeValue( totalTime     , times.print            );

        // now convert from number to "number" or a "?" if no value
        var strCompileTime     = compileTime    !== -1 ? compileTime    : '?',
            strSymbolsTime     = symbolsTime    !== -1 ? symbolsTime    : '?',
            strRulesTime       = rulesTime      !== -1 ? rulesTime      : '?',
            strParseRealTime   = parseRealTotal !== -1 ? parseRealTotal : '?',
            strParseTotalTime  = parseTotalTime !== -1 ? parseTotalTime : '?',
            strValidateTime    = validateTime   !== -1 ? validateTime   : '?',
            strFinalizeTime    = finalizeTime   !== -1 ? finalizeTime   : '?',
            strPrintTime       = printTime      !== -1 ? printTime      : '?',
            strTotalTime       = totalTime      !== -1 ? totalTime      : '?';

        // work out any padding
        
        var timeLen1 = Math.max(
                numDigitsInInt( strCompileTime  ),
                numDigitsInInt( strSymbolsTime  ),
                numDigitsInInt( strRulesTime    ),
                numDigitsInInt( strParseTotalTime),
                numDigitsInInt( strParseRealTime)
        ) + 1;

        var timeLen2 = Math.max(
                numDigitsInInt( strValidateTime ),
                numDigitsInInt( strFinalizeTime ),
                numDigitsInInt( strPrintTime    )
        ) + 1;

        var realTotalTime = Date.now() - pageTime;
        var timeLen3 = Math.max(
                numDigitsInInt( strTotalTime    ),
                numDigitsInInt( realTotalTime   )
        ) + 1;

        // build the HTML
        document.querySelector('.controls-time-info').innerHTML =
                "<div class='controls-time-info-inner'>" +
                            "compile " + padStr(strCompileTime  , timeLen1)      + "ms<br>" +
                            "symbols " + padStr(strSymbolsTime  , timeLen1)      + "ms<br>" +
                              "rules " + padStr(strRulesTime    , timeLen1)      + "ms<br>" +
                        "parse total " + padStr(strParseTotalTime, timeLen1)      + "ms<br>" +
                   "real parse total " + padStr(strParseRealTime, timeLen1)      + "ms" +
                "</div>" +

                "<div class='controls-time-info-inner'>" +
                         "validation " + padStr(strValidateTime , timeLen2)      + "ms<br>" +
                           "finalize " + padStr(strFinalizeTime , timeLen2)      + "ms<br>" +
                              "print " + padStr(strPrintTime    , timeLen2)      + "ms" +
                "</div>" +

                "<div class='controls-time-info-inner'>" +
                        // how long did it take when ignoring setTimeouts and pauses
                         "total time " + padStr(strTotalTime    , timeLen3)      + "ms<br>" +
                        // how long did it really take for the users (this includes pauses)
                    "real total time " + padStr(realTotalTime   , timeLen3) + "ms"      +
                "</div>" ;
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

                if ( isSymbolizeOn ) {
                    quby.parser.symbolize( sourceCode, function(symbols) {
                        outputSymbols.value = symbols.join("\n");
                    });
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
    var saveSettings = getSaveSettings();
    console.log( '-- cookies ' + document.saveSettings );

    includeCore     = ( saveSettings.includeCore   !== undefined ? saveSettings.includeCore   : false );
    isAdmin         = ( saveSettings.isAdmin       !== undefined ? saveSettings.isAdmin       : true  );
    debugMode       = ( saveSettings.debugMode     !== undefined ? saveSettings.debugMode     : true  );
    isSymbolizeOn   = ( saveSettings.isSymbolizeOn !== undefined ? saveSettings.isSymbolizeOn : true  );

    updateSaveSettings(function(obj) {
        obj.includeCore     = includeCore;
        obj.isAdmin         = isAdmin;
        obj.debugMode       = debugMode;
        obj.isSymbolizeOn   = isSymbolizeOn;
    });

    setCheckboxes({
            'checkbox_include'          : includeCore,
            'checkbox_debug'            : debugMode,
            'checkbox_is_admin'         : isAdmin,
            'checkbox_is_symbolize_on'  : isSymbolizeOn
    });

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
    if ( saveSettings.qbFile ) {
        setQbSrc( saveSettings.qbFile );
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

