"use strict";

var util = window['util'] = {};

(function( util ) {
    var calculateName = function() {
        if ( navigator.appName == 'Opera' ) {
            return 'opera';
        } else if ( navigator.appName == 'Microsoft Internet Explorer' ) {
            return 'ie';
        } else {
            var agent = navigator.userAgent.toString();

            if ( agent.indexOf("Chrome/") != -1 ) {
                return 'chrome';
            } else if ( agent.indexOf("Safari/") != -1 ) {
                return 'safari';
            } else if ( navigator.appName == 'Netscape' ) {
                return 'mozilla';
            } else {
                return 'unknown';
            }
        }
    };

    var browserName = calculateName();

    util.browser = {
            isIE      : browserName == 'ie'     ,
            isMozilla : browserName == 'mozilla',
            isChrome  : browserName == 'chrome' ,
            isOpera   : browserName == 'opera'  ,
            isSafari  : browserName == 'safari'
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
         * @return An array containing all the values in the given 'arguments'.
         */
        /* Online blogs advise Array.slice, but most arguments are short (less then
         * 10 elements) and in those situations a brute force approach is actually
         * much faster!
         */
        argumentsToArray: null,

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

        // filled in at the end
        addAll: null
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

            if ( requestAnimFrame ) {
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
                    null ; // null isn't actually needed, but at least you know that null is the fallback!
        },

        once: function() {
            var request = util.future.getRequestAnimationFrame();

            for ( var i = 0, len = arguments.length; i < len; i++ ) {
                var fun = arguments[i];

                if ( request ) {
                    request( fun );
                } else {
                    setTimeout( fun, util.future.DEFAULT_INTERVAL );
                }
            }
        }
    };

    // add browser specific implementations of these
    if ( util.browser.isMozilla ) {
        util.array.argumentsToArray = function(args) {
            var arr = [];
            for (
                var
                        i = (arguments.length > 1) ? arguments[1] : 0,
                        len = args.length;
                i < len;
                i++
            ) {
                arr[arr.length] = args[i];
            }

            return arr;
        };

        util.array.addAll = function( dest, src ) {
            for ( var i = 0, len = src.length; i < len; i++ ) {
                dest[dest.length] = src[i];
            }
        };
    } else {
        util.array.argumentsToArray = function() {
            var arr = [];
            for (
                var
                        i = (arguments.length > 1) ? arguments[1] : 0,
                        args = arguments[0],
                        len = args.length;
                i < len;
                i++
            ) {
                arr.push( args[i] );
            }

            return arr;
        };

        util.array.addAll = function( dest, src ) {
            for ( var i = 0, len = src.length; i < len; i++ ) {
                dest.push( src[i] );
            }
        };
    }
})( util );