"use strict";

var util = window['util'] = {};

(function(Date) {
    if ( Date['now'] === undefined ) {
        Date['now'] = function() {
            return (new Date()).getTime();
        }
    }
})(window['Date']);

(function(Object) {
    if ( Object['preventExtensions'] === undefined ) {
        /**
         * AFAIK Object.preventExtensions cannot be faked,
         * so we just add an empty stub,
         * so we can still call it where it's not supported.
         *
         * Personally I don't really care if it's not always
         * supported, as long as it works when I am developing.
         */
        Object['preventExtensions'] = function() { /* do nothing */ }
    }
})(window['Object']);

(function( util ) {
    var calculateName = function() {
        if ( navigator.appName === 'Opera' ) {
            return 'opera';
        } else if ( navigator.appName === 'Microsoft Internet Explorer' ) {
            return 'ie';
        } else {
            var agent = navigator.userAgent.toString();

            if ( agent.indexOf("Chrome/") != -1 ) {
                return 'chrome';
            } else if ( agent.indexOf("Safari/") != -1 ) {
                return 'safari';
            } else if ( navigator.appName === 'Netscape' ) {
                return 'mozilla';
            } else {
                return 'unknown';
            }
        }
    };

    var browserName = calculateName();

    util.klass = function( init ) {
        var proto = init.prototype;

        for ( var i = 1; i < arguments.length; i++ ) {
            var funs = arguments[i];

            if ( funs === undefined ) {
                throw new Error("undefined function info given");
            }

            if ( typeof funs === 'function' || funs instanceof Function ) {
                funs = funs.prototype;
            }

            for ( var k in funs ) {
                if ( funs.hasOwnProperty(k) ) {
                    proto[k] = funs[k];
                }
            }
        }

        return init;
    }

    util.browser = {
            isIE      : browserName === 'ie'     ,
            isMozilla : browserName === 'mozilla',
            isChrome  : browserName === 'chrome' ,
            isOpera   : browserName === 'opera'  ,
            isSafari  : browserName === 'safari'
    };

    /**
     * Creates a new JS object, copies all the properties across from source
     * to the clone, and then returns the object.
     *
     * Note that the type of the object will be different.
     */
    util.clone = function( source ) {
        if ( source ) {
            if ( source instanceof Array ) {
                return source.splice(0);
            } else {
                var ClonePrototype = function() {};
                ClonePrototype.prototype = source;

                var copy = new ClonePrototype();

                // copy all attributes across,
                // but skip prototype items
                for ( var k in source ) {
                    if ( source.hasOwnProperty(k) ) {
                        copy[k] = source[k];
                    }
                }

                return copy;
            }
        } else {
            return source;
        }
    };

    var SLASH_CHAR = '/'.charCodeAt(0);

    var anchor = null;

    util.htmlToText = function( html ) {
        if ( anchor === null ) {
            anchor = document.createElement('a');
        }

        anchor.innerHTML = html;

        return anchor.textContent || anchor.innerText;
    };

    util.url = (function() {
            return {
                    /**
                     * Given an url, this will turn it into an absolute url.
                     */
                    absolute: function( url ) {
                        if ( anchor === null ) {
                            anchor = document.createElement('a');
                        }

                        anchor.href = url;
                        return anchor.href;
                    },

                    /**
                     * @param url The url to test.
                     * @param domain Optional, the domain to test for, defaults to the current domain of the document.
                     * @return True if the url is of the domain given, otherwise false.
                     */
                    isDomain: function( url, domain ) {
                        if ( domain === undefined ) {
                            domain = document.domain;
                        }

                        return ( url.toLowerCase().indexOf(domain.toLowerCase()) === 0 );
                    },

                    /**
                     * Removes the domain section from the
                     * beginning of the url given.
                     *
                     * If the domain is not found, then it is ignored.
                     *
                     * @param url The url to strip the domain from.
                     */
                    stripDomain: function( url ) {
                        url = util.url.absolute( url );

                        if ( url.charCodeAt(0) === SLASH_CHAR && url.charCodeAt(1) !== SLASH_CHAR ) {
                            return url;
                        } else {
                            /*
                             * begins with either:
                             *      //
                             *      http:// (or something very similar, like https or ftp)
                             * then ...
                             *      everything up till the first slash
                             */
                            return url.replace(
                                    /((\/\/)|([a-zA-Z]+:\/\/))([a-zA-Z0-9_\-.+]+)/,
                                    ''
                            );
                        }
                    }
            };
    })();

    util.array = {
        /**
         * Given the 'arguments' variable, this will convert it to a proper
         * JavaScript Array and return it.
         *
         * @param args An 'arguments' object to convert.
         * @param offset Optional, defaults to 0. Where in the array to start iteration.
         * @return An array containing all the values in the given 'arguments'.
         */
        /* Online blogs advise Array.slice, but most arguments are short (less then
         * 10 elements) and in those situations a brute force approach is actually
         * much faster!
         */
        argumentsToArray: function( args, i ) {
            var len, arr;

            // iterating from the start to the end
            if ( i === undefined || i === 0 ) {
                len = args.length;
                arr = new Array( len );

                for ( ; i < len; i++ ) {
                    arr[i] = args[i];
                }
            // offset is past the end of the arguments array
            } else if ( i >= args.length ) {
                return [];
            } else {
                len = args.length - i;
                arr = new Array( len );

                for ( var j = 0; j < len; j++ ) {
                    arr[j] = args[j+i];
                }
            }

            return arr;
        },

        remove: function (arr, arrayIndex) {
            arr.splice(arrayIndex, 1);
        },

        addAll: function( dest, src ) {
            var destI = dest.length;
            var newLen = (dest.length += src.length);
            var srcI = 0;
            
            for ( ; destI < newLen; destI++ ) {
                dest[destI] = src[srcI++];
            }
        }
    };

    util.string = {
        trim : function(str) {
            str = str.replace( /^\s\s*/, '' );
            var ws = /\s/;
            var i = str.length;

            while (ws.test(str.charAt(--i))) { }
            return str.slice(0, i + 1);
        },

        /**
         * If given a string, then a new string with the first letter capitalized is returned.
         *
         * Otherwise whatever was given is returned, with no error reported.
         */
        capitalize : function(str) {
            if ( typeof(str) == 'string' && str.length > 0 ) {
                // capitalize the first letter
                return str.charAt(0).toUpperCase() + str.slice(1);
            } else {
                return str;
            }
        }
    };

    util.future = (function() {
        /**
         * @const
         * @private
         * @type {number}
         */
        var DEFAULT_INTERVAL = 10;

        var isFutureRunning = false;

        var futureFuns     = [],
            futureBlocking = [];

        var futureBlockingOffset  = 0,
            blockingCount = 1;

        /**
         * Used to run the next function,
         * in the scheduler. It will run right now,
         * within this frame.
         *
         * @private
         * @const
         */
        var runNextFuture = function( args ) {
            if ( futureFuns.length > 0 ) {
                utilFuture.once( function() {
                    if ( isFutureRunning === false && futureBlocking[0] === 0 ) {
                        isFutureRunning = true;

                        futureBlocking.shift();
                        if ( args !== undefined ) {
                            futureFuns.shift().apply( null, args );
                        } else {
                            futureFuns.shift()();
                        }

                        isFutureRunning = false;

                        runNextFuture();
                    }
                } );
            } else {
                isFutureRunning = false;
            }
        };

        /**
         *
         *
         * @private
         * @const
         */
        var ensureFun = function(f) {
            if ( ! (f instanceof Function) ) {
                throw new Error("Function expected.");
            }
        };

        var utilFuture = {
            block: function( f ) {
                ensureFun( f );

                var index = 0;

                if ( this.isRunning ) {
                    index = 0;
                    futureFuns.unshift( f );
                    futureBlocking.unshift( blockingCount );
                    futureBlockingOffset++;
                } else {
                    index = futureFuns.length;
                    futureFuns.push( f );
                    futureBlocking.push( blockingCount );
                }

                index += futureBlockingOffset;
                index |= ( blockingCount << 16 );

                blockingCount = Math.max( 0, (blockingCount+1) % 0xfff );

                return index;
            },

            unblock: function( tag ) {
                var index = tag & 0xffff;
                var check = ( tag >> 16 ) & 0xfff;

                if ( index < 0 || index >= futureBlocking.length ) {
                    throw new Error( "state inconsistency!" );
                } else {
                    if ( futureBlocking[index] !== check ) {
                        throw new Error( "wrong tag given" );
                    } else {
                        futureBlocking[index] = 0;

                        if ( arguments.length > 1 ) {
                            var fun  = futureFuns[index],
                                args = util.array.argumentsToArray(arguments, 1);

                            futureFuns[index] = function() {
                                fun.apply( null, args );
                            };
                        }
                    }
                }

                runNextFuture();
            },

            hasWork: function() {
                return futureFuns.length > 0;
            },

            addFuns: function( fs ) {
                for ( var i = 0; i < fs.length; i++ ) {
                    utilFuture.runFun( fs[i] );
                }
            },

            run: function() {
                utilFuture.addFuns( arguments );

                if ( ! isFutureRunning ) {
                    runNextFuture();
                }
            },

            runFun: function( f ) {
                ensureFun( f );

                if ( isFutureRunning ) {
                    futureFuns.unshift( f );
                    futureBlocking.unshift( 0 );
                    futureBlockingOffset++;
                } else {
                    futureFuns.push( f );
                    futureBlocking.push( 0 );
                }
            },

            map: function( values, f ) {
                ensureFun( f );

                var fs = [];
                // this is to ensure all values are in their own unique scope
                var addFun = function( value, f, fs ) {
                    fs.push( function() {
                        f( value );
                    } );
                };

                for (var i = 0; i < values.length; i++) {
                    addFun( values[i], f, fs );
                }

                utilFuture.addFuns( fs );
                utilFuture.run();
            },

            interval: function( callback, element ) {
                var requestAnimFrame = utilFuture.getRequestAnimationFrame();

                if ( requestAnimFrame !== null ) {
                    var isRunningHolder = {isRunning: true};

                    var recursiveCallback = function() {
                        if ( isRunningHolder.isRunning ) {
                            callback();
                            requestAnimFrame( recursiveCallback, element );
                        }
                    }

                    requestAnimFrame( recursiveCallback, element );

                    return isRunningHolder;
                } else {
                    return setInterval( callback, DEFAULT_INTERVAL );
                }
            },

            clearInterval: function( tag ) {
                if ( tag.isRunning ) {
                    tag.isRunning = false;
                } else {
                    clearInterval( tag );
                }
            },

            getRequestAnimationFrame : function() {
                return  window.requestAnimationFrame       ||
                        window.webkitRequestAnimationFrame ||
                        window.mozRequestAnimationFrame    ||
                        window.oRequestAnimationFrame      ||
                        window.msRequestAnimationFrame     ||
                        null ;
            },

            once: function() {
                var request = utilFuture.getRequestAnimationFrame();

                for ( var i = 0, len = arguments.length; i < len; i++ ) {
                    var fun = arguments[i];

                    if ( request !== null ) {
                        request( fun );
                    } else {
                        setTimeout( fun, DEFAULT_INTERVAL );
                    }
                }
            }
        };

        return utilFuture;
    })( util );

    util.ajax = {
            post: function(url, callback, data, isBlocking, timestamp) {
                return util.ajax.call(
                        'POST',
                        url,
                        callback,
                        data,
                        isBlocking,
                        timestamp
                );
            },

            postFuture: function(url, callback, data, isBlocking, timestamp) {
                var tag = util.future.block( function(status, text, xml) {
                    callback( status, text, xml );
                } );

                return util.ajax.post(
                        url,
                        function(status, text, xml) {
                            util.future.unblock( tag, status, text, xml );
                        },
                        data,
                        isBlocking,
                        timestamp
                );
            },

            get: function(url, callback, data, isBlocking, timestamp) {
                return util.ajax.call(
                        'GET',
                        url,
                        callback,
                        data,
                        isBlocking,
                        timestamp
                );
            },

            getFuture: function(url, callback, data, isBlocking, timestamp) {
                var tag = util.future.block( function(status, text, xml) {
                    callback( status, text, xml );
                } );

                return util.ajax.get(
                        url,
                        function(status, text, xml) {
                            util.future.unblock( tag, status, text, xml );
                        },
                        data,
                        isBlocking,
                        timestamp
                );
            },

            call: function(method, url, callback, passData, async, timestamp) {
                method = method.toLowerCase();

                var ajaxObj = window.XMLHttpRequest ? new window.XMLHttpRequest              :
                        ActiveXObject         ? new ActiveXObject("Microsoft.XMLHTTP") :
                        null ;

                if ( ! ajaxObj ) {
                    return null;
                } else {
                    ajaxObj.onreadystatechange = function() {
                        if ( ajaxObj.readyState == 4 ) {
                            callback(
                                    ajaxObj.status,
                                    ajaxObj.responseText,
                                    ajaxObj.responseXML
                            );
                        }
                    }

                    if ( method === 'post' ) {
                        if ( timestamp ) {
                            if ( url.indexOf('?') === -1 ) {
                                url += '?timestamp=' + Date.now();
                            } else {
                                url += '&timestamp=' + Date.now();
                            }
                        }

                        ajaxObj.open( "POST", url, async );
                        ajaxObj.setRequestHeader( "Content-type", "application/x-www-form-urlencoded" );
                        ajaxObj.setRequestHeader( "Content-Length", passData.length );
                        ajaxObj.send(passData);
                    } else if ( method === 'get' ) {
                        if ( passData ) {
                            if ( url.indexOf('?') === -1 ) {
                                url += '?' + passData;
                            } else {
                                url += '&' + passData;
                            }
                        }

                        if ( timestamp ) {
                            if ( url.indexOf('?') === -1 ) {
                                url += '?timestamp=' + Date.now();
                            } else {
                                url += '&timestamp=' + Date.now();
                            }
                        }

                        ajaxObj.open( "GET", url, async );
                        ajaxObj.send( null );
                    } else {
                        throw new Error( "unknown method given, should be 'get' or 'post'" );
                    }

                    return ajaxObj;
                }
            }
    };
})( util );
