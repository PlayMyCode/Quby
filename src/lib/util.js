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

        contains: function (arr, val) {
            return (arr[val] ? true : false);
        },

        randomSort: function (arr) {
            arr.sort(function () {
                return (Math.round(Math.random()) - 0.5);
            });
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

    util.future = {
        DEFAULT_INTERVAL: 10,
        isRunning: false,
        funs: [],

        addFuns: function( fs ) {
            for ( var i = 0; i < fs.length; i++ ) {
                util.future.runFun( fs[i] );
            }
        },

        run: function() {
            util.future.addFuns( arguments );

            if ( ! util.future.isRunning ) {
                util.future.once( util.future.next );
            }
        },

        runFun: function( f ) {
            util.future.ensureFun( f );

            if ( util.future.isRunning ) {
                util.future.funs.unshift( f );
            } else {
                util.future.funs.push( f );
            }
        },

        map: function( values, f ) {
            util.future.ensureFun( f );

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

            util.future.addFuns( fs );
            util.future.run();
        },

        next: function() {
            if ( util.future.funs.length > 0 ) {
                if ( util.future.isRunning === false ) {
                    util.future.isRunning = true;

                    var fun = util.future.funs.shift();

                    util.future.once(
                            function() {
                                fun();
                                util.future.isRunning = false;

                                util.future.next();
                            }
                    );
                }
            } else {
                util.future.isRunning = false;
            }
        },

        ensureFun: function(f) {
            if ( ! (f instanceof Function) ) {
                throw new Error("Function expected.");
            }
        },

        interval: function( callback, element ) {
            var requestAnimFrame = util.future.getRequestAnimationFrame();

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
                return setInterval( callback, util.future.DEFAULT_INTERVAL );
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
            var request = util.future.getRequestAnimationFrame();

            for ( var i = 0, len = arguments.length; i < len; i++ ) {
                var fun = arguments[i];

                if ( request !== null ) {
                    request( fun );
                } else {
                    setTimeout( fun, util.future.DEFAULT_INTERVAL );
                }
            }
        }
    };
})( util );
