"use strict";
(function () {
    if (Date.now === undefined) {
        Date.now = function () {
            return new Date().getTime();
        };
    }
})();

var util;
(function (util) {
    "use strict";

    var calculateName = function () {
        if (navigator.appName === "Opera") {
            return "opera";
        } else if (navigator.appName === "Microsoft Internet Explorer") {
            return "ie";
        } else {
            var agent = navigator.userAgent.toString();

            if (agent.indexOf("Chrome/") !== -1) {
                return "chrome";
            } else if (agent.indexOf("Safari/") !== -1) {
                return "safari";
            } else if (navigator.appName === "Netscape") {
                return "mozilla";
            } else {
                return "unknown";
            }
        }
    };

    var browserName = calculateName();

    var anchor = null;

    util.browser = {
        isIE: browserName === "ie",
        isMozilla: browserName === "mozilla",
        isChrome: browserName === "chrome",
        isOpera: browserName === "opera",
        isSafari: browserName === "safari"
    };

    (function (_url) {
        var SLASH_CHAR = "//".charCodeAt(0);

        /**
        * Given an url, this will turn it into an absolute url.
        */
        function absolute(url) {
            if (anchor === null) {
                anchor = new HTMLAnchorElement();
            }

            anchor.href = url;

            return anchor.href;
        }
        _url.absolute = absolute;

        /**
        * @param url The url to test.
        * @param domain Optional, the domain to test for, defaults to the current domain of the document.
        * @return True if the url is of the domain given, otherwise false.
        */
        function isDomain(url, domain) {
            if (domain === undefined) {
                domain = document.domain;
            }

            return (url.toLowerCase().indexOf(domain.toLowerCase()) === 0);
        }
        _url.isDomain = isDomain;

        /**
        * Removes the domain section from the
        * beginning of the url given.
        *
        * If the domain is not found, then it is ignored.
        *
        * @param url The url to strip the domain from.
        */
        function stripDomain(url) {
            url = util.url.absolute(url);

            if (url.charCodeAt(0) === SLASH_CHAR && url.charCodeAt(1) !== SLASH_CHAR) {
                return url;
            } else {
                /*
                * begins with either:
                *      //
                *      http:// (or something very similar, like https or ftp)
                * then ...
                *      everything up till the first slash
                */
                return url.replace(/((\/\/)|([a-zA-Z]+:\/\/))([a-zA-Z0-9_\-.+]+)/, '');
            }
        }
        _url.stripDomain = stripDomain;
    })(util.url || (util.url = {}));
    var url = util.url;

    (function (array) {
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
        function argumentsToArray(args, i) {
            if (typeof i === "undefined") { i = 0; }
            var len, arr;

            // iterating from the start to the end
            if (i === 0) {
                len = args.length;
                arr = new Array(len);

                for (; i < len; i++) {
                    arr[i] = args[i];
                }
                // offset is past the end of the arguments array
            } else if (i >= args.length) {
                return [];
            } else {
                len = args.length - i;
                arr = new Array(len);

                for (var j = 0; j < len; j++) {
                    arr[j] = args[j + i];
                }
            }

            return arr;
        }
        array.argumentsToArray = argumentsToArray;

        /**
        * Sorts the array given, randomly.
        */
        /*
        * Warning! This is used in core.qb
        */
        function randomSort(arr) {
            arr.sort(function () {
                return (Math.round(Math.random()) - 0.5);
            });
        }
        array.randomSort = randomSort;

        function remove(arr, arrayIndex) {
            arr.splice(arrayIndex, 1);
        }
        array.remove = remove;

        function addAll(dest, src) {
            var destI = dest.length;
            var newLen = (dest.length += src.length);
            var srcI = 0;

            for (; destI < newLen; destI++) {
                dest[destI] = src[srcI++];
            }
        }
        array.addAll = addAll;
    })(util.array || (util.array = {}));
    var array = util.array;

    (function (_str) {
        function htmlToText(html) {
            if (anchor === null) {
                anchor = new HTMLAnchorElement();
            }

            anchor.innerHTML = html;

            return anchor.textContent || anchor.innerText;
        }
        _str.htmlToText = htmlToText;

        /**
        * Trims whitespace off the string given,
        * and returns the result.
        */
        function trim(s) {
            s = s.replace(/^\s\s*/, "");
            var ws = /\s/;
            var i = s.length;

            while (ws.test(s.charAt(--i))) {
            }
            return s.slice(0, i + 1);
        }
        _str.trim = trim;

        /**
        * If given a string, then a new string with the first letter capitalized is returned.
        *
        * Otherwise whatever was given is returned, with no error reported.
        */
        function capitalize(str) {
            if (typeof (str) === "string" && str.length > 0) {
                // capitalize the first letter
                return str.charAt(0).toUpperCase() + str.slice(1);
            } else {
                return str;
            }
        }
        _str.capitalize = capitalize;
    })(util.str || (util.str = {}));
    var str = util.str;

    (function (future) {
        /**
        * @const
        * @private
        * @type {number}
        */
        var DEFAULT_INTERVAL = 10;

        var isFutureRunning = false;

        var futureFuns = [], futureBlocking = [];

        var futureBlockingOffset = 0, blockingCount = 1;

        var requestAnimFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || null;

        var intervalFuns = [], intervalFunID = 1;

        /**
        *
        *
        * @private
        * @const
        */
        var ensureFun = function (f) {
            if (!(f instanceof Function)) {
                throw new Error("Function expected.");
            }
        };

        function addFuns(fs) {
            for (var i = 0; i < fs.length; i++) {
                util.future.runFun(fs[i]);
            }
        }

        /**
        * Used to run the next function,
        * in the scheduler. It will run right now,
        * within this frame.
        *
        * @private
        * @const
        */
        function runNextFuture(args) {
            if (futureFuns.length > 0) {
                util.future.once(function () {
                    if (isFutureRunning === false && futureBlocking[0] === 0) {
                        isFutureRunning = true;

                        futureBlocking.shift();
                        if (args !== undefined) {
                            futureFuns.shift().apply(null, args);
                        } else {
                            futureFuns.shift()();
                        }

                        isFutureRunning = false;

                        runNextFuture();
                    }
                });
            } else {
                isFutureRunning = false;
            }
        }

        function getRequestAnimationFrame() {
            return requestAnimFrame;
        }
        future.getRequestAnimationFrame = getRequestAnimationFrame;

        function block(f) {
            ensureFun(f);

            var index = 0;

            if (this.isRunning) {
                index = 0;
                futureFuns.unshift(f);
                futureBlocking.unshift(blockingCount);
                futureBlockingOffset++;
            } else {
                index = futureFuns.length;
                futureFuns.push(f);
                futureBlocking.push(blockingCount);
            }

            index += futureBlockingOffset;
            index |= (blockingCount << 16);

            blockingCount = Math.max(0, (blockingCount + 1) % 0xfff);

            return index;
        }
        future.block = block;

        function unblock(tag) {
            var args = [];
            for (var _i = 0; _i < (arguments.length - 1); _i++) {
                args[_i] = arguments[_i + 1];
            }
            var index = tag & 0xffff;
            var check = (tag >> 16) & 0xfff;

            if (index < 0 || index >= futureBlocking.length) {
                throw new Error("state inconsistency!");
            } else {
                if (futureBlocking[index] !== check) {
                    throw new Error("wrong tag given");
                } else {
                    futureBlocking[index] = 0;

                    // replace the next fun with one that uses args,
                    // if args is supplied
                    if (args.length > 0) {
                        var fun = futureFuns[index];

                        futureFuns[index] = function () {
                            fun.apply(null, args);
                        };
                    }
                }
            }

            runNextFuture();
        }
        future.unblock = unblock;

        function hasWork() {
            return futureFuns.length > 0;
        }
        future.hasWork = hasWork;

        function run() {
            var fs = [];
            for (var _i = 0; _i < (arguments.length - 0); _i++) {
                fs[_i] = arguments[_i + 0];
            }
            addFuns(fs);

            if (!isFutureRunning) {
                runNextFuture();
            }
        }
        future.run = run;

        function runFun(f) {
            ensureFun(f);

            if (isFutureRunning) {
                futureFuns.unshift(f);
                futureBlocking.unshift(0);
                futureBlockingOffset++;
            } else {
                futureFuns.push(f);
                futureBlocking.push(0);
            }
        }
        future.runFun = runFun;

        function map(values, f) {
            ensureFun(f);

            for (var i = 0; i < values.length; i++) {
                var value = values[i];

                util.future.runFun((function (value) {
                    return function () {
                        return f(value);
                    };
                })(value));
            }

            util.future.run();
        }
        future.map = map;

        function interval(callback) {
            if (requestAnimFrame !== null) {
                var isRunningHolder = { isRunning: true };

                var recursiveCallback = function () {
                    if (isRunningHolder.isRunning) {
                        callback();
                        requestAnimFrame(recursiveCallback);
                    }
                };

                requestAnimFrame(recursiveCallback);

                var id = intervalFunID++;
                intervalFuns[id] = isRunningHolder;

                return id;
            } else {
                return setInterval(callback, DEFAULT_INTERVAL);
            }
        }
        future.interval = interval;

        function clear(tag) {
            if (requestAnimFrame === null) {
                var f = intervalFuns[tag];

                if (f !== undefined) {
                    f.isRunning = false;
                    delete intervalFuns[tag];
                }
            } else {
                clearInterval(tag);
            }
        }
        future.clear = clear;

        function once(f) {
            var request = util.future.getRequestAnimationFrame();

            if (request !== null) {
                request(f);
            } else {
                setTimeout(f, DEFAULT_INTERVAL);
            }
        }
        future.once = once;
    })(util.future || (util.future = {}));
    var future = util.future;

    (function (ajax) {
        function post(url, callback, data, isBlocking, timestamp) {
            return ajax.call('POST', url, callback, data, isBlocking, timestamp);
        }
        ajax.post = post;

        function postFuture(url, callback, data, isBlocking, timestamp) {
            var tag = util.future.block(function (status, text, xml) {
                callback(status, text, xml);
            });

            return ajax.post(url, function (status, text, xml) {
                util.future.unblock(tag, status, text, xml);
            }, data, isBlocking, timestamp);
        }
        ajax.postFuture = postFuture;

        function get(url, callback, data, isBlocking, timestamp) {
            return ajax.call('GET', url, callback, data, isBlocking, timestamp);
        }
        ajax.get = get;

        function getFuture(url, callback, data, isBlocking, timestamp) {
            var tag = util.future.block(function (status, text, xml) {
                callback(status, text, xml);
            });

            return ajax.get(url, function (status, text, xml) {
                util.future.unblock(tag, status, text, xml);
            }, data, isBlocking, timestamp);
        }
        ajax.getFuture = getFuture;

        function call(method, url, callback, passData, async, timestamp) {
            if (typeof passData === "undefined") { passData = ""; }
            if (typeof async === "undefined") { async = true; }
            if (typeof timestamp === "undefined") { timestamp = false; }
            if (passData === undefined || passData === null) {
                passData = "";
            } else if (!(typeof passData === "string" || passData instanceof String)) {
                passData = String(passData);
            }

            method = method.toLowerCase();

            // fuck IE 6 \o/
            var ajaxObj = new XMLHttpRequest();

            ajaxObj.onreadystatechange = function () {
                if (ajaxObj.readyState === 4) {
                    callback(ajaxObj.status, ajaxObj.responseText, ajaxObj.responseXML);
                }
            };

            if (method === "post") {
                if (timestamp) {
                    if (url.indexOf("?") === -1) {
                        url += "?timestamp=" + Date.now();
                    } else {
                        url += "&timestamp=" + Date.now();
                    }
                }

                ajaxObj.open("POST", url, async);
                ajaxObj.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
                ajaxObj.setRequestHeader("Content-Length", String(passData.length));
                ajaxObj.send(passData);
            } else if (method === "get") {
                if (passData) {
                    if (url.indexOf("?") === -1) {
                        url += "?" + passData;
                    } else {
                        url += "&" + passData;
                    }
                }

                if (timestamp) {
                    if (url.indexOf("?") === -1) {
                        url += "?timestamp=" + Date.now();
                    } else {
                        url += "&timestamp=" + Date.now();
                    }
                }

                ajaxObj.open("GET", url, async);
                ajaxObj.send(null);
            } else {
                throw new Error("unknown method given, should be 'get' or 'post'");
            }

            return ajaxObj;
        }
        ajax.call = call;
    })(util.ajax || (util.ajax = {}));
    var ajax = util.ajax;
})(util || (util = {}));
///<reference path="util.ts" />
"use strict";
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
/*
* TODO Optimizations:
*
* re-add the symbol id to rule lookup. So...
*
* IParserRule.parseRules add:
*      var rules = this.compiled.rules[ symbol.id ]
*
* ... and use that to know which set of rules to jump to, and
* so skip some others.
*/
/**
* @license
*
* parse.js | A parser building framework
* by Joseph Lenton
*/
/**
*
* All of Parse lives under the 'parse' variable.
* It's a bit like jQuery, parse can be used as a function or
* you can call one of it's provided methods.
*
* It also tries to be natural to read and write. For example:
*
*  parse.
*          either( thisThing, orThat ).
*          onMatch( doSomething );
*
*  parse.
*          a( foo ).
*          then( bar ).
*          thenEither( foobar, foobarAlt );
*
* == Terminal Functions | Character Comparisons ==
*
* Before we begin, it's important you know one thing:
*
*  !!! Character comparsions are done by 'character code' !!!
*
* Character codes are the integer that represents a code,
* which is returned with 'string.charCodeAt( i )'.
*
* see: https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/String/charCodeAt
*
* This means that instead of:
*
*      c === '&'
*
* ... you do ...
*
*      code === 38 // the code for an ampersand
*
* You can find a list of JS character codes here:
*
* // TODO insert character code listings
*
* Why? There are a few reasons:
*
*  = character codes are faster to get out from a string
*  = dealing with just codes is faster then supplying both
*    code and character.
*  = comparisons is faster with codes then characters
*
* At the date of writing, the above rules would save as much
* as 50ms, on 300kb of code, in Firefox 9 on my 2.5ghz PC.
*
* parse.js was built for my Quby language, where it's common
* for code to take up more then 300kb (standard library +
* a whole game).
*
* There are games built in Quby which take up as much as 1mb;
* so although it's a small optimization, that speed
* improvement quickly becomes noticeable.
*
* There are advantages with this. For example you can do range
* comparisons with codes. Such as:
*
*      if (
*              (code >=  97 && code <= 122) || // it's a lower case a-z
*              (code >=  65 && code <=  90)    // it's an uppper case a-z
*      ) {
*          // we have an a-z letter
*      }
*
* The above is much shorter then:
*
*      if (
*              c === 'a' || c === 'b' || c === 'c' ||
*              c === 'd' || c === 'e' || c === 'f' ||
*              c === 'g' || c === 'h' || c === 'i' || ...
*
* == Terminal Functions | Building ==
*
* When a terminal function is called, all source code is
* passed in, along with the current position in the parsing.
*
* The index points to the current character the terminal
* should be looking at. The terminal function then returns
* a new location, which is greater then i, stating how many
* characters it is taking.
*
* So for example if you want to take 1 character, then you
* return i+1.
*
* Another example. Lets say the word at the beginning of the
* code is '&&', and you want to accept '&&', then you return
* i+2. 2 is the length of '&&' (it's two characters long).
*
* For example here is the function for parsing and:
*
*      var AMPERSAND = 38;
*      var logicalAnd = parse.terminal(
*              function(src, i, code, len) {
*                  if (
*                                         code === AMPERSAND &&
*                          src.charCodeAt(i+1) === AMPERSAND
*                  ) {
*                      return i+2;
*                  }
*              }
*      );
*
* Lets break that down a little. When the function is called,
* calling 'src.charCodeAt(i)' will return the first '&'.
* However the given parameter 'c' is this already, so you
* don't have to call it in every terminal (minor optimization).
*
* To clarify: code === src.charCharAt(i)
*
* So then we look ahead, by performing src.charCodeAt(i+1). By
* looking ahead, adding 1 to i, we can then check the
* following character, and see if this also points to '&'.
*
* If they are both '&', and so we have found '&&', then we
* return i+2 to say we are matching 2 characters.
*
* If you don't want to move, then either return the value of
* i, or undefined. Just calling return, without any value, is
* enough to automatically give you no match.
*
* Finally 'len' is the total length of src. It's useful for
* when you run any loops that continously chomp, to help
* avoiding infinite loops.
*
* == What happens if no terminals match? ==
*
* It'll move on by just 1 char at a time until one does match.
* Once it reaches the end of the error section, it will then
* call the 'symbol error handler'.
*
* By default this just raises an exception, and stops parsing.
* So you must set one!
*
* This can done through:
*
*      parse.onSymbolError( function( input, start, end ) {
*          // error handling code here
*      } );
*
* Where:
*
*  = Input - the text we are parsing
*  = start - the index of the start of the error, in input
*  = end   - the index of the end of the error, in input
*
* The return value is ignored.
*
* == What is "infinite resursion rule" ? ==
*
* Take this piece of code:
*
*     var expression = parse();
*     expression.then( expression );
*
* It will look for it's self, which in turn looks for it's
* self, which looks for it's self, and then again, and
* continues looking for it's self, forever.
*
* 'Infinite recursion rule' is a way of stopping this when
* the parser is built, but only works if you try it directly.
*
* For example it will not prevent:
*
*      var foo = parse(),
*          bar = parse();
*
*      foo.then( bar );
*      bar.then( foo );
*
* This will not be caused, because the infinite recursion is
* not direct. It is up to you to prevent the above from
* happening!
*
* Another example:
*
*      var foo = parse(),
*          bar = parse();
*
*      foo.or( foo, bar );
*
* Here it will always test 'foo', before 'bar', which in turn
* means it will end up being infinitely recursive. The
* correct code is to use 'this' as the last or, such as:
*
*      foo.or( bar, foo );
*
* As long as bar is not recursive, then this will always
* succeed.
*
* What if bar doesn't match? At runtime it will check for
* parsing 'this' against 'this', and this will cause a syntax
* error.
*
* == How do I get more parse's? ==
*
* The provided parse object, at window.parse, is a global
* parse and secretly shares data with it's rules. It should
* only be used for building _one_ parser!
*
* If you want more then one parser, then you need to make a
* new parse. You can make a new parse through:
*
*     var newParse = new parse();
*
* Both 'newParse' and 'window.parse' are both different
* Parse instances.
*
* This works thanks to some JS hackery, allowing parse to be
* use as a constructor as well as the other magical things it
* can do.
*/
/*
* = Notes on parameters =
*
* Lots of functions take parameters as 'a' and 'b'. This is
* undescriptive because I don't know what those parameters
* are. This happens if the function can be called in
* different ways.
*
* Any functions that take this should define the 'actual'
* parameters at the top, and then sort them out asap.
*
* They should _not_ be worked out later, in order to help
* keep the code clean and better laid out (i.e. parameters
* go at the top).
*
* Constructors should also be defined in a way so they can be
* called with no args, this is needed for Terminal, Terminals
* and IParserRule constructors.
*
* = Symbol vs Terminal =
*
* A terminal is something we plan to match. For example 'if'
* is a terminal.
*
* A symbol is a matching terminal. For example there could be
* 4 'if' symbols, at different locations in the source code,
* but only one 'if' terminal, which is used to find them all.
*/
var parse;
(function (_parse) {
    

    ;

    ;

    /**
    * ASCII codes for characters.
    *
    * @type {number}
    * @const
    */
    var TAB = 9, SLASH_N = 10, SLASH_R = 13, SPACE = 32, EXCLAMATION = 33, DOUBLE_QUOTE = 34, HASH = 35, DOLLAR = 36, PERCENT = 37, AMPERSAND = 38, SINGLE_QUOTE = 39, LEFT_PAREN = 40, RIGHT_PAREN = 41, STAR = 42, PLUS = 43, COMMA = 44, MINUS = 45, FULL_STOP = 46, SLASH = 47, ZERO = 48, ONE = 49, TWO = 50, THREE = 51, FOUR = 52, FIVE = 53, SIX = 54, SEVEN = 55, EIGHT = 56, NINE = 57, COLON = 58, SEMI_COLON = 59, LESS_THAN = 60, EQUAL = 61, GREATER_THAN = 62, QUESTION_MARK = 63, AT = 64, UPPER_A = 65, UPPER_F = 70, UPPER_Z = 90, LEFT_SQUARE = 91, BACKSLASH = 92, RIGHT_SQUARE = 93, CARET = 94, UNDERSCORE = 95, LOWER_A = 97, LOWER_B = 98, LOWER_C = 99, LOWER_D = 100, LOWER_E = 101, LOWER_F = 102, LOWER_G = 103, LOWER_H = 104, LOWER_I = 105, LOWER_J = 106, LOWER_K = 107, LOWER_L = 108, LOWER_M = 109, LOWER_N = 110, LOWER_O = 111, LOWER_P = 112, LOWER_Q = 113, LOWER_R = 114, LOWER_S = 115, LOWER_T = 116, LOWER_U = 117, LOWER_V = 118, LOWER_W = 119, LOWER_X = 120, LOWER_Y = 121, LOWER_Z = 122, LEFT_BRACE = 123, BAR = 124, RIGHT_BRACE = 125, TILDA = 126;

    /**
    * @nosideeffects
    * @const
    * @param {number} code
    * @return {boolean}
    */
    var isHexCode = function (code) {
        return (code >= ZERO && code <= NINE) || (code >= LOWER_A && code <= LOWER_F) || (code >= UPPER_A && code <= UPPER_F);
    };

    var isAlphaNumericCode = function (code) {
        return ((code >= LOWER_A && code <= LOWER_Z) || (code >= UPPER_A && code <= UPPER_Z) || (code === UNDERSCORE) || (code >= ZERO && code <= NINE));
    };

    var isAlphaCode = function (code) {
        return (code >= LOWER_A && code <= LOWER_Z) || (code >= UPPER_A && code <= UPPER_Z);
    };

    /**
    * @nosideeffects
    * @const
    * @param {number} code
    * @return {boolean}
    */
    var isNumericCode = function (code) {
        return (code >= ZERO && code <= NINE);
    };

    /**
    * @return True if f is a function object, and false if not.
    */
    function isFunction(f) {
        return (typeof f === "function") || (f instanceof Function);
    }

    /**
    * By 'code', it means the actual number that
    * represents the character. This is the value
    * returned by 'charCodeAt' by the String object.
    *
    * Characters which are for words includes:
    * underscore, the letter a to z (upper and lower),
    * and the numbers 0 to 9.
    *
    * @nosideeffects
    * @const
    * @param {number} A code for a character.
    * @return {boolean} True if it is a word character, and false if not.
    */
    function isWordCode(code) {
        return ((code >= 97 && code <= 122) || (code >= 48 && code <= 57) || (code === 95) || (code >= 65 && code <= 90));
    }

    /**
    * This is a helper version of 'isWordCode'.
    *
    * The parameters might look odd, but this is
    * to avoid having to also call 'charCodeAt'
    * every time I want to use this whilst parsing.
    *
    * i can lie outside of src, it'll just return
    * false.
    *
    * @nosideeffects
    * @const
    * @param {string} src A string to check the character of.
    * @param {number} i The index of the character to check in the string.
    * @return {boolean}
    */
    function isWordCharAt(src, i) {
        return isWordCode(src.charCodeAt(i));
    }

    /**
    * The value used to denote a terminal with no ID.
    *
    * These terminals are hidden from the outside world, and
    * so shouldn't be tracked or exposed in any way.
    *
    * They also don't directly relate to the parsing rules,
    * hence why they cannot be indexed by ID.
    */
    var INVALID_TERMINAL = 0;

    /**
    * The multiple types for a terminal.
    */
    var TYPE_FUNCTION = 1, TYPE_CODE_ALPHANUMERIC = 2, TYPE_CODE = 3, TYPE_STRING = 4, TYPE_ARRAY = 5;

    var BLANK_TERMINAL_FUNCTION = function (src, i, code, len) {
        return i;
    };

    /**
    * Given a string, this turns it into an array of char codes,
    * and returns the result.
    *
    * Note that it's 'character codes', not 'characters'.
    * So that means the underlying ASCII/Unicode numbers,
    * not the actual characters themselves.
    *
    * @param {string} str The string to convert to an array.
    * @return An array of character codes for the string given.
    */
    function stringToCodes(str) {
        var len = str.length, arr = new Array(len);

        for (var i = 0; i < len; i++) {
            arr[i] = str.charCodeAt(i);
        }

        return arr;
    }

    /**
    * Format the terminal name into a readable one, i.e.
    *     'ELSE_IF' => 'else if'
    *      'leftBracket' => 'left bracket'
    */
    function formatTerminalName(str) {
        /*
        * - reaplce camelCase in the middle to end of the string,
        * - lowerCase anything left (start of string)
        * - turn underscores into spaces
        * - uppercase the first letter of each word
        */
        return str.replace(/([^A-Z])([A-Z]+)/g, function (t, a, b) {
            return a + ' ' + b;
        }).replace('_', ' ').toLowerCase().replace(/\b([a-z])/g, function (t, letter) {
            return letter.toUpperCase();
        });
    }

    function processResult(arg) {
        if (arg === null) {
            return null;
        } else if (arg instanceof Symbol) {
            return arg.onFinish();
        } else if (typeof arg === 'function') {
            return arg();
        } else if (arg instanceof Array) {
            for (var i = 0; i < arg.length; i++) {
                arg[i] = processResult(arg[i]);
            }

            return arg;
        } else if (arg.apply) {
            var args = arg.args;
            var argsLen = args.length;

            if (argsLen === 0) {
                return arg.onFinish();
            } else if (argsLen === 1) {
                return arg.onFinish(processResult(args[0]));
            } else if (argsLen === 2) {
                return arg.onFinish(processResult(args[0]), processResult(args[1]));
            } else if (argsLen === 3) {
                return arg.onFinish(processResult(args[0]), processResult(args[1]), processResult(args[2]));
            } else if (argsLen === 4) {
                return arg.onFinish(processResult(args[0]), processResult(args[1]), processResult(args[2]), processResult(args[3]));
            } else if (argsLen === 5) {
                return arg.onFinish(processResult(args[0]), processResult(args[1]), processResult(args[2]), processResult(args[3]), processResult(args[4]));
            } else if (argsLen === 6) {
                return arg.onFinish(processResult(args[0]), processResult(args[1]), processResult(args[2]), processResult(args[3]), processResult(args[4]), processResult(args[5]));
            } else if (argsLen === 7) {
                return arg.onFinish(processResult(args[0]), processResult(args[1]), processResult(args[2]), processResult(args[3]), processResult(args[4]), processResult(args[5]), processResult(args[6]));
            } else if (argsLen === 8) {
                return arg.onFinish(processResult(args[0]), processResult(args[1]), processResult(args[2]), processResult(args[3]), processResult(args[4]), processResult(args[5]), processResult(args[6]), processResult(args[7]));
            } else if (argsLen === 9) {
                return arg.onFinish(processResult(args[0]), processResult(args[1]), processResult(args[2]), processResult(args[3]), processResult(args[4]), processResult(args[5]), processResult(args[6]), processResult(args[7]), processResult(args[8]));
            } else if (argsLen === 10) {
                return arg.onFinish(processResult(args[0]), processResult(args[1]), processResult(args[2]), processResult(args[3]), processResult(args[4]), processResult(args[5]), processResult(args[6]), processResult(args[7]), processResult(args[8]), processResult(args[9]));
            } else {
                return arg.onFinish.apply(null, processResult(arg.args));
            }
        } else {
            return arg.onFinish(processResult(arg.args));
        }
    }

    /*  **  **  **  **  **  **  **  **  **  **  **  **  **
    *
    *          Terminal
    *
    * The Terminal prototype, for representing a terminal
    * symbol to match.
    *
    *  **  **  **  **  **  **  **  **  **  **  **  **  */
    /**
    * If given a string, it will match if it is
    * followed by a word boundary.
    *
    * If a function is given, then you can run the test
    * yourself, and decide it's behaviour.
    *
    * If a number is given, it's presumed to be a code
    * character. In this case it is matched against 'code'.
    *
    * If an array is given, then each element is turned into
    * a terminal, and then the test for this terminal is to
    * match one of those terminals.
    *
    * About the 'returnMatch' flag. If the given match is a function,
    * then it will return the match. If the flag is not a function,
    * then it will return this terminal.
    *
    * The idea is that if your supplying the character, such as to match '+',
    * then you don't need the substring (you already know it's going to be '+').
    * So this allows this to avoid the cost of making 1,000s of substrings out
    * of the given input.
    *
    * @param match The item to use for the matching test.
    * @param name Optional, a name for this terminal (for error reporting).
    */
    var Term = (function () {
        function Term(match, name) {
            /**
            * The id for being able to index this terminal.
            */
            this.id = INVALID_TERMINAL;
            /**
            * A name for this terminal.
            *
            * Used for error reporting, so you can have something readable,
            * rather then things like 'E_SOMETHING_END_BLAH_TERMINAL'.
            */
            this.termName = "<Anonymous Terminal>";
            /**
            * When true, this has been explicitely named.
            *
            * When false, this has been named as a result
            * of this constructor.
            *
            * It's a flag that exists so other code knows
            * if it should, or shouldn't, override the name
            * automatically.
            */
            this.isExplicitelyNamed = false;
            /**
            * The type of this terminal.
            *
            * Default is zero, which is invalid.
            */
            this.type = 0;
            /**
            * A post match callback that can be run,
            * when a match has been found.
            *
            * Optional.
            */
            this.onMatchFun = null;
            /**
            * The type of this terminal.
            *
            * This determines the algorithm used to match,
            * or not match, bits against the source code
            * when parsing symbols.
            */
            this.isLiteral = false;
            /**
            * The literal value this is matching, if provided.
            * Otherwise null.
            */
            this.literal = null;
            /**
            * If this is a literal, then this will give the length
            * of that literal being searched for.
            *
            * For a string, this is the length of that string.
            * For a number, this is 1.
            *
            * For non-literals, this is 0, but should not be used.
            */
            this.literalLength = 0;
            /**
            * There are two ways to work out if a terminal matches
            * or not.
            *
            * The first is by overriding the 'test' with it's own
            * function.
            *
            * The other is to apply a special type, such as TYPE_CODE,
            * and then place the data for it here.
            *
            * When it has no data, it is null.
            */
            this.typeTestFunction = BLANK_TERMINAL_FUNCTION;
            this.typeTestArray = [];
            this.typeTestCode = 0;
            this.typeTestString = [];
            /**
            * An optional event to run after a symbol has been matched.
            *
            * Gives the option to move the offset on further, whilst ignoring
            * symbols.
            */
            this.postMatch = null;
            /**
            * Some terminals are silently hidden away,
            * this is so they can still see their parents.
            */
            this.terminalParent = null;
            var nameSupplied = (name !== undefined);
            if (name) {
                this.termName = name;
            }

            var literal = null;

            if (match instanceof Term) {
                return match;
            } else if (isFunction(match)) {
                this.type = TYPE_FUNCTION;
                this.isLiteral = false;
                this.typeTestFunction = match;
            } else {
                this.isLiteral = true;

                if (match instanceof String || match instanceof Number) {
                    match = match.valueOf();
                }

                var matchType = typeof match;

                /*
                * A single character.
                * - a character code (number)
                * - a single character (1 length string)
                */
                if (matchType === 'number' || (matchType === 'string' && match.length === 1)) {
                    if (matchType === 'string') {
                        literal = match;

                        if (!nameSupplied) {
                            this.termName = "'" + match + "'";
                        }

                        match = match.charCodeAt(0);
                    } else {
                        literal = String.fromCharCode(match);

                        if (!nameSupplied) {
                            this.termName = "'" + literal + "'";
                        }
                    }

                    this.literalLength = 1;
                    this.isLiteral = true;
                    this.literal = literal;

                    this.type = isWordCode(match) ? TYPE_CODE_ALPHANUMERIC : TYPE_CODE;

                    this.typeTestCode = match;
                    /*
                    * String primative, or string object.
                    *
                    * This is a string with a length longer than 1,
                    * a length of zero will raise an error,
                    * and 1 length is caught by the clause above.
                    */
                } else if (matchType === 'string') {
                    this.type = TYPE_STRING;

                    this.literalLength = match.length;
                    this.isLiteral = true;
                    this.literal = match;

                    if (match.length === 0) {
                        throw new Error("Empty string given for Terminal");
                    } else {
                        this.typeTestString = stringToCodes(match);

                        if (!nameSupplied) {
                            if (match > 20) {
                                this.termName = "'" + match.substring(0, 20) + "'";
                            } else {
                                this.termName = "'" + match + "'";
                            }
                        }
                    }
                    /*
                    * An array of matches to match against.
                    * For example, multiple string keywords
                    * in an array.
                    */
                } else if (match instanceof Array) {
                    this.type = TYPE_ARRAY;

                    var mTerminals = [];
                    var isLiteral = true, literalLength = Number.MAX_VALUE;

                    for (var i = 0; i < match.length; i++) {
                        var innerTerm = new Term(match[i], name);

                        if (innerTerm.isLiteral) {
                            literalLength = Math.min(literalLength, innerTerm.literalLength);
                        } else {
                            isLiteral = false;
                        }

                        innerTerm.setParentTerm(this);
                        mTerminals[i] = innerTerm;
                    }

                    this.isLiteral = isLiteral;
                    this.literalLength = literalLength;
                    this.typeTestArray = mTerminals;
                    // errors!
                } else if (match === undefined) {
                    throw new Error("undefined match given");
                } else if (match === null) {
                    throw new Error("null match given");
                } else {
                    throw new Error("unknown match given");
                }
            }
        }
        Term.prototype.getParentTerm = function () {
            if (this.terminalParent !== null) {
                return this.terminalParent.getParentTerm();
            } else {
                return this;
            }
        };

        Term.prototype.setParentTerm = function (parent) {
            this.terminalParent = parent;
            return this;
        };

        Term.prototype.name = function (name) {
            if (name === undefined) {
                return this.termName;
            } else {
                this.termName = name;
                return this;
            }
        };

        Term.prototype.setName = function (name) {
            this.termName = name;
            return this;
        };

        Term.prototype.getName = function () {
            return this.termName;
        };

        Term.prototype.setID = function (id) {
            this.id = id;

            /*
            * Arrays are silently removed,
            * so pass the id on,
            * otherwise the grammar breaks.
            */
            if (this.type === TYPE_ARRAY) {
                var arr = this.typeTestArray;

                for (var i = 0; i < arr.length; i++) {
                    arr[i].setID(id);
                }
            }

            return this;
        };

        /**
        * The 'symbolMatch' event allows you to run a callback straight after the
        * symbol has been matched, and before any others.
        *
        * Optionall you can also move the offset on further, by returning a new
        * index.
        *
        * One use for this is to allow certain symbols to eat end of line
        * characters after they have been matched, such as '+' or '='.
        *
        * @param callback The callback to run; null for no callback, or a valid function.
        */
        Term.prototype.symbolMatch = function (callback) {
            if (callback !== null && !isFunction(callback)) {
                throw new Error("symbolMatch callback is not valid: " + callback);
            }

            this.postMatch = callback;

            return this;
        };

        /**
        * This callback is run when the symbol is matched.
        *
        * If takes the form:
        *  function( str, offset ) { }
        *
        * Where:
        *  str - this is the string that matches, if this is a terminal that will
        *        grab a match.
        *  offset - The index position of the match.
        *
        * The 'str' thing might seem odd, but basicly matches which are certain,
        * don't bother supplying a string. For example if you have a symbol that
        * matches 'if', then there is no point in supplying the 'if' text for the
        * 'if' symbol. We know it's going to be 'if'!
        *
        * @param callback The function to call (or null to clear a previous one).
        * @return This object to allow chaining.
        */
        Term.prototype.onMatch = function (callback) {
            if (!callback) {
                this.onMatchFun = null;
            } else {
                this.onMatchFun = callback;
            }

            return this;
        };
        return Term;
    })();
    _parse.Term = Term;

    /*  **  **  **  **  **  **  **  **  **  **  **  **  **
    *
    *          Parser
    *
    * This includes the parser rules for building the
    * expressions, and the core 'Parser' interface.
    *
    *  **  **  **  **  **  **  **  **  **  **  **  **  */
    var ParseError = (function () {
        function ParseError(source, offset, endI) {
            this.isSymbol = false;
            this.isTerminal = false;
            this.source = source;
            this.offset = offset;
            this.endOffset = endI;
        }
        ParseError.prototype.getMatch = function () {
            return this.source.substring(this.offset, this.endOffset);
        };

        ParseError.prototype.getLine = function () {
            return this.source.getLine(this.offset);
        };
        return ParseError;
    })();
    _parse.ParseError = ParseError;

    /**
    * This is a type of error generated when parsing the
    * source code, into a list of symbols.
    *
    * That is during the symbolization stage, before the
    * grammar rules are checked.
    */
    var SymbolError = (function (_super) {
        __extends(SymbolError, _super);
        function SymbolError(sourceLines, i, endI) {
            _super.call(this, sourceLines, i, endI);
            this.isSymbol = true;

            this.isSymbol = true;
        }
        return SymbolError;
    })(ParseError);
    _parse.SymbolError = SymbolError;

    /**
    * This is a type of error generated whilst the grammar
    * rules are worked on.
    */
    var TerminalError = (function (_super) {
        __extends(TerminalError, _super);
        function TerminalError(symbol, expected) {
            _super.call(this, symbol.source, symbol.offset, symbol.endOffset);
            this.isTerminal = true;

            var term = symbol.terminal;

            this.terminal = term;
            this.terminalName = term.getName();
            this.isLiteral = term.isLiteral;
            this.expected = expected;
        }
        return TerminalError;
    })(ParseError);
    _parse.TerminalError = TerminalError;
    ;

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
    var SourceLines = (function () {
        function SourceLines(src, name) {
            // source code altered and should be used for indexing
            this.source = src;
            this.name = name || '<Unknown Script>';

            // these get altered when indexing occurres ...
            this.numLines = 0;
            this.lineOffsets = null;
        }
        SourceLines.prototype.index = function () {
            // index source code on the fly, only if needed
            if (this.lineOffsets == null) {
                var src = this.source;

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
                var searchIndex = (src.indexOf("\n", lastIndex) !== -1) ? "\n" : "\r";

                while (running) {
                    var index = src.indexOf(searchIndex, lastIndex);

                    if (index !== -1) {
                        lines.push(index);
                        lastIndex = index + 1;
                        // the last line
                    } else {
                        lines.push(len);
                        running = false;
                    }

                    this.numLines++;
                }

                this.lineOffsets = lines;
            }
        };

        SourceLines.prototype.substr = function (i, len) {
            return this.source.substr(i, len);
        };

        SourceLines.prototype.substring = function (i, end) {
            return this.source.substring(i, end);
        };

        SourceLines.prototype.getSourceName = function () {
            return this.name;
        };

        SourceLines.prototype.getLine = function (offset) {
            this.index();

            for (var line = 0; line < this.lineOffsets.length; line++) {
                // LineOffset is from the end of the line.
                // If it's greater then offset, then we return that line.
                // It's +1 to start lines from 1 rather then 0.
                if (this.lineOffsets[line] > offset) {
                    return line + 1;
                }
            }

            return this.numLines;
        };

        SourceLines.prototype.getSource = function () {
            return this.source;
        };
        return SourceLines;
    })();
    _parse.SourceLines = SourceLines;
    ;

    /**
    * A wrapper for holding the Symbol result information.
    *
    * It's essentially a struct like object.
    */
    var Symbol = (function () {
        function Symbol(terminal, sourceLines, offset, endOffset) {
            this.terminal = terminal;
            this.offset = offset;
            this.endOffset = endOffset;
            this.source = sourceLines;

            this.match = undefined;
            this.lower = undefined;
        }
        Symbol.prototype.clone = function (newMatch) {
            var sym = new Symbol(this.terminal, this.source, this.offset, this.endOffset);

            sym.match = this.match;
            sym.lower = this.lower;

            return sym;
        };

        Symbol.prototype.chompLeft = function (offset) {
            return this.source.substring(this.offset + offset, this.endOffset);
        };

        Symbol.prototype.chompRight = function (offset) {
            return this.source.substring(this.offset, this.endOffset - offset);
        };

        Symbol.prototype.chomp = function (left, right) {
            return this.source.substring(this.offset + left, this.endOffset - right);
        };

        Symbol.prototype.getMatch = function () {
            if (this.match === undefined) {
                this.match = this.source.substring(this.offset, this.endOffset);
            }

            return this.match;
        };

        Symbol.prototype.getLower = function () {
            if (this.lower === undefined) {
                return (this.lower = this.getMatch().toLowerCase());
            } else {
                return this.lower;
            }
        };

        Symbol.prototype.onFinish = function () {
            var onMatch = this.terminal.onMatchFun;

            if (onMatch !== null) {
                return onMatch(this);
            } else {
                return this;
            }
        };

        Symbol.prototype.getLine = function () {
            return this.source.getLine(this.offset);
        };

        Symbol.prototype.getSourceName = function () {
            return this.source.getSourceName();
        };
        return Symbol;
    })();
    _parse.Symbol = Symbol;

    function findPossibleTerms(e, terms) {
        if (e instanceof Array) {
            for (var i = 0; i < e.length; i++) {
                findPossibleTerms(e[i], terms);
            }
        } else {
            var name = e.name();

            if (name) {
                terms[name] = true;
            } else if (e instanceof ParserRuleImplementation) {
                findPossibleTerms(e.rules, terms);
            }
        }
    }

    /**
    * This wraps the output from parsing the symbols.
    *
    * Errors are stored here to allow them to be returned
    * with the symbols that got parsed.
    *
    * Moving through the symbols can be done in two ways.
    * First you can move along by the 'id index', which allows
    * you to 'peekID'. You can use this to check for maching
    * terminals, and you can move 'back'.
    *
    * Once you've got a match, you call 'finalizeMove', and
    * you can now get out the current symbol.
    *
    * It might seem like an odd API, but all this hackery is
    * done so the SymbolResult can do less work if the parser
    * is shifting back and forth. They end up becomming i++
    * and i-- operations.
    *
    * @param errors Any errors that occurred during parsing.
    * @param symbols The symbol result object.
    * @param symbolIDs The ID of the symbol found, in order of symbols found.
    * @param symbolLength The number of symbols found.
    */
    /*
    * Note that strings is compacted down. This means you
    * need to know if a string is to be skipped or not.
    */
    var SymbolResult = (function () {
        function SymbolResult(errors, symbols, symbolIDs, symbolLength, symbolIDToTerms) {
            this.errors = errors;

            this.symbols = symbols;
            this.symbolIDs = symbolIDs;

            this.length = symbolLength;
            this.symbolIndex = 0;
            this.i = 0;
            this.maxI = 0;

            this.currentString = null;
            this.stringI = -1;

            this.currentID = INVALID_TERMINAL;

            this.symbolIDToTerms = symbolIDToTerms;

            if (symbolLength > 0) {
                this.currentID = this.symbolIDs[0];
            }

            this.maxRule = null;
        }
        SymbolResult.prototype.expected = function () {
            if (this.maxRule === null) {
                return [];
            } else {
                // the point of this is to find _unique_ term items,
                // which is why the terms are put into an object and then an array
                var rules = this.maxRule.compiledLookups[this.maxRuleI], terms = {}, termsArr = [];

                var i;
                var rulesLen = rules.length;
                for (i = 0; i < rulesLen; i++) {
                    var rule = rules[i];

                    if (rule !== null) {
                        findPossibleTerms(rule, terms);
                    }
                }

                var keys = Object.keys(terms), keysLen = keys.length;
                for (i = 0; i < keysLen; i++) {
                    var k = keys[i];

                    termsArr.push(k);
                }

                return termsArr;
            }
        };

        /**
        * @return The maximum id value the symbol result has moved up to.
        */
        SymbolResult.prototype.maxID = function () {
            if (this.i > this.maxI) {
                return this.i;
            } else {
                return this.maxI;
            }
        };

        SymbolResult.prototype.maxSymbol = function () {
            var maxID = Math.max(0, this.maxID() - 1);
            return this.symbols[maxID];
        };

        SymbolResult.prototype.hasErrors = function () {
            return this.errors.length > 0;
        };

        SymbolResult.prototype.getTerminals = function () {
            var length = this.length;
            var thisSymbols = this.symbols;
            var symbols = new Array(length);

            for (var i = 0; i < length; i++) {
                symbols[i] = thisSymbols[i].terminal;
            }

            return symbols;
        };

        SymbolResult.prototype.getErrors = function () {
            return this.errors;
        };

        /**
        * @return True if this currently points to a symbol.
        */
        SymbolResult.prototype.hasMore = function () {
            return this.symbolIndex < this.length;
        };

        SymbolResult.prototype.isMoving = function () {
            return this.i !== this.symbolIndex;
        };

        SymbolResult.prototype.finalizeMove = function () {
            var i = this.i;

            if (i < this.length) {
                this.currentID = this.symbolIDs[i];
                this.symbolIndex = i;
            } else {
                this.currentID = INVALID_TERMINAL;
                this.i = this.symbolIndex = this.length;
            }
        };

        SymbolResult.prototype.next = function () {
            this.i++;

            if (this.i < this.length) {
                this.currentID = this.symbolIDs[this.i];
                return this.symbols[this.i - 1];
            } else if (this.i === this.length) {
                this.currentID = INVALID_TERMINAL;
                return this.symbols[this.i - 1];
            } else {
                this.currentID = INVALID_TERMINAL;
                return null;
            }
        };

        SymbolResult.prototype.back = function (increments, maxRule, maxRuleI) {
            var i = this.i;

            if (i > this.maxI) {
                this.maxI = i;
                this.maxRule = maxRule;
                this.maxRuleI = maxRuleI;
            }

            this.i = (i -= increments);

            if (i < this.symbolIndex) {
                throw new Error("Moved back by more increments then the last finalize move location");
            } else {
                this.currentID = this.symbolIDs[i];
            }
        };

        SymbolResult.prototype.skip = function () {
            this.i++;
            this.finalizeMove();

            return this.symbols[this.i - 1];
        };

        SymbolResult.prototype.index = function () {
            return this.symbolIndex;
        };

        /**
        * @return The current index for the current symbol ID.
        */
        SymbolResult.prototype.idIndex = function () {
            return this.i;
        };

        SymbolResult.prototype.peekID = function () {
            if (this.i >= this.length) {
                return INVALID_TERMINAL;
            }

            return this.currentID;
        };
        return SymbolResult;
    })();

    /**
    * Given a list of terminals, and terminals to rule
    * mappings. Both of these are expected to be sparse
    * arrays, so this compressed them down.
    *
    * Note that compression is based on 'terminals'. Each
    * element in the given terminals is expected to relate
    * to each mapping in terminalsToRules.
    *
    * For example the terminal located at 'terminals[3]',
    * should also be the same terminal used in 'terminalsToRules[3]'.
    *
    * As a result, if terminalsToRules[3] is actually empty
    * (there is no mapping to any rules), then this is
    * preserved.
    *
    * The only bits that are chucked out is if 'terminals[3]'
    * is undefined, in which case all elements from 3 onwards
    * are shifted down.
    *
    * Returned is an object holding:
    *  = terminals - the compressed list of terminals
    *  = idToTerms - a sparse array of terminal ID's to terminals.
    */
    function compressTerminals(terminals) {
        var termIDToTerms = [];

        /*
        * Compact the lists down to exclude any terminals
        * we didn't capture, these are terminals that
        * were created, but never used in any rules.
        *
        * But both tables _must_ be kept in sync, so only
        * delete when missing from both.
        *
        * As 'terminals' is a list of _all_ terminals,
        * then it is the complete list.
        */
        var literalTerms = [], nonLiteralTerms = [];

        compressTerminalsInner(termIDToTerms, literalTerms, nonLiteralTerms, terminals);

        literalTerms.sort(function (a, b) {
            return b.literalLength - a.literalLength;
        });

        return {
            literals: literalTerms,
            terminals: nonLiteralTerms,
            idToTerms: termIDToTerms
        };
    }

    function compressTerminalsInner(termIDToTerms, literalTerms, nonLiteralTerms, terminals) {
        var keys = Object.keys(terminals), keysLen = keys.length;

        for (var i = 0; i < keysLen; i++) {
            var k = keys[i];
            var term = terminals[k];

            if (term.type === TYPE_ARRAY) {
                compressTerminalsInner(termIDToTerms, literalTerms, nonLiteralTerms, term.typeTestArray);
            } else {
                termIDToTerms[term.id] = term;

                if (term.isLiteral) {
                    literalTerms.push(term);
                } else {
                    nonLiteralTerms.push(term);
                }
            }
        }
    }

    function bruteScan(parserRule, seenRules, idsFound) {
        if (seenRules[parserRule.compiledId] !== true) {
            seenRules[parserRule.compiledId] = true;

            var rules = parserRule.rules, isOptional = parserRule.isOptional;

            /*
            * We are interested in all branches on the left side, up to and
            * including, the first non-optional branch.
            *
            * This is because we might have to come down here for an optional
            * term, or skip it.
            */
            var i = 0;
            do {
                var rule = rules[i];

                if (rule instanceof Term) {
                    if (rule.id !== INVALID_TERMINAL) {
                        idsFound[rule.id] = true;
                    }
                } else if (rule instanceof Array) {
                    for (var j = 0; j < rule.length; j++) {
                        var r = rule[j];

                        if (r instanceof Term) {
                            if (r.id !== INVALID_TERMINAL) {
                                idsFound[r.id] = true;
                            }
                        } else {
                            bruteScan(r, seenRules, idsFound);
                        }
                    }
                } else {
                    bruteScan(rule, seenRules, idsFound);
                }

                i++;
            } while(i < rules.length && isOptional[i - 1]);
        } else {
            return;
        }
    }

    

    function addRule(rule, terminals, id, allRules) {
        if (rule instanceof Term) {
            var termID = rule.id;

            if (termID !== INVALID_TERMINAL) {
                terminals[termID] = rule;
            }

            return id;
        } else {
            return rule.optimizeScan(terminals, id, allRules);
        }
    }
    ;

    function addRuleToLookup(id, ruleLookup, term) {
        var ruleLookupLen = ruleLookup.length;

        if (ruleLookupLen <= id) {
            for (var i = ruleLookupLen; i < id; i++) {
                ruleLookup.push(null);
            }

            ruleLookup.push(term);
        } else {
            var arrLookup = ruleLookup[id];

            if (arrLookup === null) {
                ruleLookup[id] = term;
            } else if (arrLookup instanceof Array) {
                arrLookup.push(term);
            } else {
                ruleLookup[id] = [arrLookup, term];
            }
        }
    }

    function newTimeResult(compileTime, symbolTime, rulesTime, totalTime) {
        return {
            compile: compileTime,
            symbols: symbolTime,
            rules: rulesTime,
            total: totalTime
        };
    }

    /**
    * @const
    * @private
    * @type {number}
    */
    var NO_RECURSION = 0;

    /**
    * @const
    * @private
    * @type {number}
    */
    var RECURSION = 1;

    /**
    * Used to denote when no internal compileID has been set.
    *
    * As this is a positive number, a negative number is used
    * to denote when no compilation has taken place.
    *
    * @const
    * @private
    * @type {number}
    */
    var NO_COMPILE_ID = -1;

    /**
    *
    */
    /*
    * = What is 'compiledLookups' ? =
    *
    * The grammar is built into a big tree. Technically it's not, because it
    * includes recursive rules, but lets just imagine recursion isn't present.
    *
    * When symbols come in, the standard algorithm is to search all branches in
    * order until a matching set of rules are found. The problem is that this
    * includes searching on branches where there is no possibility of matching.
    *
    * For example if you had 'a = 1+1', the 'a' variable symbol will be used to
    * search the branches for while loops, if statements, function definitions,
    * class definitions, and so on. This is even though none of those could
    * possibly match.
    *
    * So to cut down on all this searching, 'compiledLookups' is a version of the
    * 'rules' which maps symbolID to rules. That way a IParserRule can jump straight
    * to the branches which match; or return if none of them match.
    *
    * SymbolID and TerminalID are also interchangeable. SymbolID is the id of the
    * terminal which that symbol represents.
    *
    * This allows it to cut down on the amount of searching needed.
    */
    var ParserRuleImplementation = (function () {
        function ParserRuleImplementation(parse) {
            /**
            * A callback to call when this is done.
            */
            this.finallyFun = null;
            /**
            * States if this is compiled yet, or not.
            *
            * When null, no compilation has taken place. When not
            * null, it has.
            */
            this.compiled = null;
            this.compiledLookups = null;
            this.compiledId = NO_COMPILE_ID;
            /**
            * The parser rules, includes terminals.
            *
            * @const
            */
            this.rules = [];
            this.isOptional = [];
            /**
            * Choice parser rules can be built from multiple 'or' calls,
            * so we store them, and then push them onto 'rules' when they are done.
            *
            * They are stored here.
            */
            this.currentOr = null;
            /**
            * A flag to say 'or this expression' in the or list.
            * This expression is always added at the end.
            *
            * @type {boolean}
            */
            this.orThisFlag = false;
            /**
            * A flag used to denote if this is being called recursively.
            * This is used in two places:
            *  = grabbingTerminals
            *  = when parsing symbols
            *
            * This to avoid calling it recursively, as we only
            * need to visit each IParserRule once.
            */
            this.isRecursive = NO_RECURSION;
            /**
            * This flag is for when we recursively clear the recursion flag, but we
            * can't use 'isRecursive' to track cyclic routes, becasue we are
            * clearing it. So we use this one instead.
            */
            this.isClearingRecursion = false;
            /**
            * Used to count how many times we have re-entered the parseInner whilst
            * parsing.
            *
            * However this is cleared when the number of symbol position is changed.
            * This way recursion is allowed, as we chomp symbols.
            */
            this.recursiveCount = 0;
            /**
            * A true recursive counter.
            *
            * This states how many times we are currently inside of this parser.
            * Unlike 'recursiveCount', this never lies.
            *
            * It exists so we can clear some items when we _first_ enter a rule.
            */
            this.internalCount = 0;
            this.isCyclic = false;
            this.isSeperator = false;
            this.hasBeenUsed = false;
            this.parseParent = parse;

            this.strName = '';
        }
        ParserRuleImplementation.prototype.name = function (name) {
            if (name !== undefined) {
                this.strName = name;
                return this;
            } else {
                return this.strName;
            }
        };

        /**
        * This is short-hand for generating a repeatSeperator, using the main Parse,
        * and adding it as a 'then' rule.
        *
        * Note that at least 1 rule must match.
        *
        * @param match The rule to be matching and collecting.
        * @param seperator The seperator between each match.
        * @return This parser rule.
        */
        ParserRuleImplementation.prototype.repeatSeperator = function (match, seperator) {
            return this.seperatingRule(match, seperator);
        };

        /**
        * The same as 'repeatSeperator', only matching is optional.
        *
        * @param match The rule to be matching and collecting.
        * @param seperator The seperator between each match.
        * @return This parser rule.
        */
        ParserRuleImplementation.prototype.optionalSeperator = function (match, seperator) {
            return this.seperatingRule(match, seperator).markOptional(true);
        };

        ParserRuleImplementation.prototype.seperatingRule = function (match, seperator) {
            this.endCurrentOr();

            return this.thenSingle(new ParserRuleImplementation(this.parseParent).markSeperatingRule(match, seperator));
        };

        /**
        * Parses the next items as being optional to each other.
        *
        * Multiple arguments can be given, or you can follow with more
        * 'or' options.
        */
        ParserRuleImplementation.prototype.or = function () {
            var argsLen = arguments.length, args = new Array(argsLen);
            while (argsLen-- > 0) {
                args[argsLen] = arguments[argsLen];
            }

            return this.orAll(args);
        };

        /**
        * 'either' is _exactly_ the same as 'or'.
        *
        * It is supported to allow parser code to be easier to read.
        * For example:
        *  operator = parse().either( plus ).or( subtract );
        *
        * It reads outlod as:
        *  "operator equals parse either plus or subtract"
        *
        * Ok it's not perfect, but it's nicer then if it was:
        *  "operator equals parse or plus or subtract"
        *
        * Internally, 'either' is just set to 'or', so it is
        * _literally_ the same method, with no added overhead.
        *
        * See 'or' for usage details.
        */
        ParserRuleImplementation.prototype.either = function () {
            var argsLen = arguments.length, args = new Array(argsLen);
            while (argsLen-- > 0) {
                args[argsLen] = arguments[argsLen];
            }

            return this.orAll(args);
        };

        /**
        * Breaks with the previous rule, to start an entirely new 'or'.
        *
        * For example if you did:
        *
        *  parse.
        *          either( foos ).
        *          thenEither( bars );
        *
        * You will have it grab any of the 'foos' rules, and then followed by any
        * of the 'bars' rules.
        *
        * 'thenOr' is an alias for 'thenEither'.
        */
        ParserRuleImplementation.prototype.thenOr = function () {
            var argsLen = arguments.length, args = new Array(argsLen);
            while (argsLen-- > 0) {
                args[argsLen] = arguments[argsLen];
            }

            return this.endCurrentOr().orAll(args);
        };
        ParserRuleImplementation.prototype.thenEither = function () {
            var argsLen = arguments.length, args = new Array(argsLen);
            while (argsLen-- > 0) {
                args[argsLen] = arguments[argsLen];
            }

            return this.endCurrentOr().orAll(args);
        };

        /**
        * This is an optional 'then' rule.
        *
        * Each of the values given is marked as being 'optional', and chomped if
        * a match is found, and skipped if a match fails.
        */
        ParserRuleImplementation.prototype.optional = function () {
            var argsLen = arguments.length, args = new Array(argsLen);
            while (argsLen-- > 0) {
                args[argsLen] = arguments[argsLen];
            }

            return this.optionalAll(arguments);
        };

        /**
        * Same as 'either', except all values given are optional.
        * With this having no-match is acceptable.
        *
        * @return This IParserRule instance.
        */
        ParserRuleImplementation.prototype.maybe = function () {
            var argsLen = arguments.length, args = new Array(argsLen);
            while (argsLen-- > 0) {
                args[argsLen] = arguments[argsLen];
            }

            return this.optionalAll(args);
        };

        /**
        * States the next items to parse.
        */
        ParserRuleImplementation.prototype.a = function () {
            var argsLen = arguments.length, args = new Array(argsLen);
            while (argsLen-- > 0) {
                args[argsLen] = arguments[argsLen];
            }

            return this.thenAll(args);
        };

        /**
        * States the next items to parse.
        */
        ParserRuleImplementation.prototype.then = function () {
            var argsLen = arguments.length, args = new Array(argsLen);
            while (argsLen-- > 0) {
                args[argsLen] = arguments[argsLen];
            }

            return this.thenAll(args);
        };

        /**
        *
        */
        ParserRuleImplementation.prototype.onMatch = function (callback) {
            this.endCurrentOr();

            this.finallyFun = callback;

            return this;
        };

        /**
        * The same as 'parse', but the string used internally is in
        * lowercase. This is useful for simplifying your parser,
        * if the syntax is case insensetive.
        *
        * The matches returned are not lower-cased, they will be taken
        * from the input given.
        *
        * The lowercase only affects the terminals, and nothing else.
        *
        * @param {string} input The text to parse.
        * @param callback A function to call when parsing is complete.
        */
        ParserRuleImplementation.prototype.parseLowerCase = function (input, callback) {
            this.parseInner(input, input.toLowerCase(), callback);
        };

        /**
        * The same as 'parseLowerCase', only this hands your terminals
        * upper case source instead of lower case.
        *
        * Like 'parseLowerCase', this only affects what the terminals
        * see, and doesn't not affect the values that get matched.
        *
        * @param {string} input The text to parse.
        * @param callback A function to call when parsing is complete.
        */
        ParserRuleImplementation.prototype.parseUpperCase = function (input, callback) {
            this.parseInner(input, input.toUpperCase(), callback);
        };

        /**
        * Compiles this rule and then parses the given input.
        *
        * This rule, or any children, should not be altered once
        * this has been compiled.
        *
        * A call needs to be provided which the result and any errors will be
        * passed into. Both of these are arrays.
        *
        * The errors is an array containing every error that has occurred, and will
        * be an empty array when there are no errors.
        *
        * The rules of this IParserRule will be applied repeatedly on every symbol
        * found. The result array given contains the results from each of these
        * runs.
        *
        * = Options =
        *
        * - src The source code to parse.
        *
        * @param options An object listing the options to parse. Can also be a string.
        */
        ParserRuleImplementation.prototype.parse = function (options) {
            var displaySrc, parseSrc, name = null, callback = null;

            if (options instanceof String) {
                displaySrc = parseSrc = options.valueOf();
            } else if (typeof options === 'string') {
                displaySrc = parseSrc = options;
            } else {
                displaySrc = options['src'];
                parseSrc = options['inputSrc'] || displaySrc;

                name = options['name'] || null;
                callback = options['onFinish'] || null;
            }

            this.parseInner(displaySrc, parseSrc, callback, name);
        };

        ParserRuleImplementation.prototype.symbolize = function (input, callback) {
            this.symbolizeInner(input, input, callback);
        };

        ParserRuleImplementation.prototype.symbolizeLowerCase = function (input, callback) {
            this.symbolizeInner(input, input.toLowerCase(), callback);
        };

        ParserRuleImplementation.prototype.symbolizeUpperCase = function (input, callback) {
            this.symbolizeInner(input, input.toUpperCase(), callback);
        };

        ParserRuleImplementation.prototype.optionalThis = function () {
            return this.optionalSingle(this);
        };

        ParserRuleImplementation.prototype.maybeThis = function () {
            return this.optionalSingle(this);
        };

        ParserRuleImplementation.prototype.orThis = function () {
            var argsLen = arguments.length, args = new Array(argsLen);
            while (argsLen-- > 0) {
                args[argsLen] = arguments[argsLen];
            }

            this.orAll(args);

            this.orThisFlag = true;

            return this;
        };

        /**
        *
        *      PRIVATE METHODS
        *
        */
        ParserRuleImplementation.prototype.cyclicOrSingle = function (rule) {
            this.orSingle(rule);

            return this.cyclicDone();
        };

        ParserRuleImplementation.prototype.cyclicOrAll = function (rules) {
            this.orAll(rules);

            return this.cyclicDone();
        };

        ParserRuleImplementation.prototype.cyclicDone = function () {
            if (this.rules.length > 1) {
                throw new Error("Cyclic rules cannot have any other rules");
            }

            this.endCurrentOr();

            this.isCyclic = true;

            if (this.rules.length === 1 && this.rules[0] instanceof Array) {
                this.rules = this.rules[0];
            } else {
                throw new Error("Internal error, cyclic rule setup has gone wrong (this is a parse.js bug)");
            }

            return this;
        };

        ParserRuleImplementation.prototype.markSeperatingRule = function (match, seperator) {
            this.thenAll(match).thenAll(seperator).endCurrentOr();

            this.isSeperator = true;

            return this;
        };

        ParserRuleImplementation.prototype.errorIfInLeftBranch = function (rule) {
            if (this.rules.length !== 0) {
                var left = this.rules[0];

                if (left instanceof Array) {
                    for (var i = 0; i < left.length; i++) {
                        var leftRule = left[i];

                        if (leftRule === rule) {
                            throw new Error("First sub-rule given leads to a recursive definition (infinite loop at runtime)");
                        } else if (leftRule instanceof ParserRuleImplementation) {
                            leftRule.errorIfInLeftBranch(rule);
                        }
                    }
                } else {
                    if (left === rule) {
                        throw new Error("First sub-rule given leads to a recursive definition (infinite loop at runtime)");
                    } else if (left instanceof ParserRuleImplementation) {
                        left.errorIfInLeftBranch(rule);
                    }
                }
            }
        };

        /**
        * @param ignoreSpecial Pass in true to skip the cyclic check.
        */
        ParserRuleImplementation.prototype.errorIfEnded = function (ignoreSpecial) {
            if (typeof ignoreSpecial === "undefined") { ignoreSpecial = false; }
            if (this.compiled !== null) {
                throw new Error("New rule added, but 'finally' has already been called");
            }

            if ((this.isCyclic || this.isSeperator) && !ignoreSpecial) {
                throw new Error("Cannot add more rules to a special IParserRule");
            }
        };

        /**
        * Marks the last item in the rules set as being optional, or not optional.
        *
        * Optional rules can be skipped.
        */
        ParserRuleImplementation.prototype.markOptional = function (isOptional) {
            var rulesLen = this.rules.length;

            if (rulesLen === 0) {
                throw new Error("Item being marked as optional, when there are no rules.");
            }

            this.isOptional[rulesLen - 1] = isOptional;

            return this;
        };

        ParserRuleImplementation.prototype.optionalAll = function (obj) {
            return this.endCurrentOr().helperAll('optionalSingle', obj);
        };

        ParserRuleImplementation.prototype.optionalSingle = function (obj) {
            this.thenSingle(obj);
            this.markOptional(true);

            return this;
        };

        ParserRuleImplementation.prototype.endCurrentOr = function () {
            var currentOr = this.currentOr;

            if (this.orThisFlag) {
                if (currentOr === null) {
                    throw new Error("infinite recursive parse rule, this given as 'or/either' condition, with no alternatives.");
                } else {
                    currentOr.push(this);
                }

                this.orThisFlag = false;
            }

            if (currentOr !== null) {
                /*
                * If still building the left branch,
                * check if we are cyclic.
                */
                if (this.rules.length === 0) {
                    for (var j = 0; j < currentOr.length; j++) {
                        var or = currentOr[j];

                        if (or instanceof ParserRuleImplementation) {
                            or.errorIfInLeftBranch(this);
                        }
                    }
                }

                this.rules.push(currentOr);
                this.markOptional(false);

                this.currentOr = null;
            }

            return this;
        };

        ParserRuleImplementation.prototype.orAll = function (obj) {
            return this.helperAll('orSingle', obj);
        };

        ParserRuleImplementation.prototype.orSingle = function (other) {
            if (this.currentOr !== null) {
                this.currentOr.push(other);
            } else {
                this.currentOr = [other];
            }
        };

        ParserRuleImplementation.prototype.thenSingle = function (rule) {
            if (rule === this && this.rules.length === 0) {
                throw new Error("infinite recursive parse rule, 'this' given as 'then' parse rule.");
            } else {
                if (this.rules.length === 0 && rule instanceof ParserRuleImplementation) {
                    rule.errorIfInLeftBranch(this);
                }

                this.rules.push(rule);
                this.markOptional(false);
            }

            return this;
        };

        ParserRuleImplementation.prototype.thenAll = function (obj) {
            return this.endCurrentOr().helperAll('thenSingle', obj);
        };

        ParserRuleImplementation.prototype.helperAll = function (singleMethod, obj) {
            this.errorIfEnded();

            if (!obj) {
                if (obj === undefined) {
                    throw new Error("Undefined 'then' rule given.");
                } else {
                    throw new Error("Unknown 'then' rule given of type " + typeof (obj));
                }
            } else if (obj instanceof ParserRuleImplementation || obj instanceof Term) {
                this[singleMethod](obj);
                // something that can be used as a terminal
            } else {
                if (obj instanceof String || obj instanceof Number) {
                    obj = obj.valueOf();
                }

                var objType = typeof obj;

                if (objType === 'string' || objType === 'number' || objType === 'function') {
                    this[singleMethod](this.parseParent['terminal'](obj));
                    // array
                } else if (obj instanceof Array) {
                    for (var i = 0; i < obj.length; i++) {
                        this.helperAll(singleMethod, obj[i]);
                    }
                    // ??? maybe an object of terminals?
                } else {
                    var keys = Object.keys(obj), keysLen = keys.length;

                    for (var i = 0; i < keysLen; i++) {
                        var k = keys[i];

                        this.helperAll(singleMethod, obj[k]);
                    }
                }
            }

            return this;
        };

        /**
        * Sets up this parser to be ready for use.
        *
        * This is called automatically when the parser is first
        * used, so calling this manually is optional.
        *
        * The advantage of calling this manually is that you can
        * chose to take the 'hit' of any expense from calling it.
        *
        * You should _not_ add any more rules to this parser rule,
        * or to any of it's children, or create any new terminals
        * with 'Parse', after this has been called!
        *
        * In short, once this is called, do not build any more on
        * to this parser!
        *
        * If called multiple times, then subsequent calls are
        * ignored.
        */
        ParserRuleImplementation.prototype.compile = function () {
            if (this.compiled === null) {
                this.compiled = this.optimize();
            }
        };

        ParserRuleImplementation.prototype.terminalScan = function () {
            if (this.compiledLookups === null) {
                var rules = this.rules, len = rules.length, lookups = new Array(len);

                for (var i = 0; i < len; i++) {
                    var rule = rules[i], ruleLookup = [];

                    // an 'or' rule
                    if (rule instanceof Array) {
                        for (var j = 0; j < rule.length; j++) {
                            var r = rule[j];

                            if (r instanceof Term) {
                                addRuleToLookup(r.id, ruleLookup, r);
                            } else {
                                var ids = [], seen = [];

                                bruteScan(r, seen, ids);

                                for (var id in ids) {
                                    addRuleToLookup(parseInt(id), ruleLookup, r);
                                }
                            }
                        }
                        // an 'then' rule
                    } else if (rule instanceof Term) {
                        addRuleToLookup(rule.id, ruleLookup, rule);
                        // nested parser rule (I think)
                    } else {
                        var ids = [], seen = [];

                        bruteScan(rule, seen, ids);

                        for (var id in ids) {
                            addRuleToLookup(parseInt(id), ruleLookup, rule);
                        }
                    }

                    lookups[i] = ruleLookup;
                }

                this.compiledLookups = lookups;
            }
        };

        /**
        * Where optimizations are placed.
        */
        /*
        * // TODO Implement this comment.
        *
        * If the IParserRule only contains one Terminal,
        * or one IParserRule, then it's moved up.
        *
        * This way when it comes to the actual parsing,
        * have managed to chop out a few functions calls.
        */
        ParserRuleImplementation.prototype.optimize = function () {
            var terminals = new Array(this.parseParent.getNumTerminals());

            var allRules = [];
            var len = this.optimizeScan(terminals, 0, allRules);

            for (var i = 0; i < len; i++) {
                allRules[i].terminalScan();
            }

            return compressTerminals(terminals);
        };

        /**
        * Converts the rules stored in this parser into a trie
        * of rules.
        */
        ParserRuleImplementation.prototype.optimizeScan = function (terminals, id, allRules) {
            if (this.isRecursive === NO_RECURSION) {
                if (this.compiledId === NO_COMPILE_ID) {
                    this.compiledId = id;
                    allRules[id] = this;

                    id++;
                }

                this.endCurrentOr();

                this.isRecursive = RECURSION;

                var rules = this.rules, len = rules.length;

                if (len === 0) {
                    throw new Error("No rules in parserRule");
                } else if (len > 1 && this.finallyFun === null && !this.isSeperator) {
                    throw new Error("No onMatch provided for parser rule, when there are multiple conditions");
                } else {
                    for (var i = 0; i < len; i++) {
                        var rule = rules[i];

                        // an 'or' rule
                        if (rule instanceof Array) {
                            for (var j = 0; j < rule.length; j++) {
                                id = addRule(rule[j], terminals, id, allRules);
                            }
                            // an 'then' rule
                        } else {
                            id = addRule(rule, terminals, id, allRules);
                        }
                    }
                }

                this.isRecursive = NO_RECURSION;
            }

            return id;
        };

        ParserRuleImplementation.prototype.parseInner = function (input, parseInput, callback, name) {
            if (input === undefined || input === null) {
                throw new Error("no 'input' value provided");
            }

            var self = this, start = Date.now();

            this.parseSymbols(input, parseInput, name, function (symbols, compileTime, symbolsTime) {
                if (symbols.hasErrors()) {
                    callback([], symbols.getErrors(), newTimeResult(compileTime, symbolsTime, 0, Date.now() - start));
                } else {
                    var rulesStart = Date.now();
                    var result = self.parseRules(symbols, input, parseInput);
                    var rulesTime = Date.now() - rulesStart;

                    var preUtil = Date.now();
                    util.future.run(function () {
                        callback(result.result, result.errors, newTimeResult(compileTime, symbolsTime, rulesTime, Date.now() - start));
                    });
                }
            });
        };

        ParserRuleImplementation.prototype.symbolizeInner = function (input, parseInput, callback) {
            this.parseSymbols(input, parseInput, null, function (symbols, _compileTime, _symbolsTime) {
                callback(symbols.getTerminals(), symbols.getErrors());
            });
        };

        /**
        * Does the actual high level organisation or parsing the
        * source code.
        *
        * Callbacks are used internally, so it gets spread across
        * multiple JS executions.
        */
        ParserRuleImplementation.prototype.parseSymbols = function (input, parseInput, name, callback) {
            if (!isFunction(callback)) {
                throw new Error("No callback provided for parsing");
            }

            this.endCurrentOr();

            var compileTime = Date.now();
            this.compile();
            compileTime = Date.now() - compileTime;

            if (this.hasBeenUsed) {
                this.clearRecursionFlag();
                this.hasBeenUsed = false;
            }

            var _this = this;

            util.future.run(function () {
                var symbolsTime = Date.now();
                var symbols = _this.parseSymbolsInner(input, parseInput, name);
                symbolsTime = Date.now() - symbolsTime;

                callback(symbols, compileTime, symbolsTime);
            });
        };

        /**
        * Resets the internal recursion flags.
        *
        * The flags are used to ensure the parser cannot run away,
        * but can be left in a strange state between use.
        */
        ParserRuleImplementation.prototype.clearRecursionFlag = function () {
            if (!this.isClearingRecursion) {
                this.isClearingRecursion = true;

                this.isRecursive = NO_RECURSION;
                this.recursiveCount = 0;

                for (var i = 0; i < this.rules.length; i++) {
                    var rule = this.rules[i];

                    if (rule instanceof Array) {
                        for (var j = 0; j < rule.length; j++) {
                            var r = rule[j];

                            if (r instanceof ParserRuleImplementation) {
                                r.clearRecursionFlag();
                            }
                        }
                    } else if (rule instanceof ParserRuleImplementation) {
                        rule.clearRecursionFlag();
                    }
                }

                this.isClearingRecursion = false;
            }
        };

        ParserRuleImplementation.prototype.parseRules = function (symbols, inputSrc, src) {
            this.hasBeenUsed = true;

            /*
            * Iterate through all symbols found, then going
            * through the grammar rules in order.
            * We jump straight to grammar rules using the
            * 'termsToRules' lookup.
            */
            var errors = [], hasError = null;

            if (symbols.hasMore()) {
                var onFinish = this.ruleTest(symbols, inputSrc);

                if (onFinish !== null) {
                    symbols.finalizeMove();

                    if (!symbols.hasMore()) {
                        return {
                            result: processResult(onFinish),
                            errors: errors
                        };
                    } else {
                        errors.push(new TerminalError(symbols.maxSymbol(), symbols.expected()));
                    }
                } else {
                    errors.push(new TerminalError(symbols.maxSymbol(), symbols.expected()));
                }
            }

            return {
                result: null,
                errors: errors
            };
        };

        ParserRuleImplementation.prototype.ruleTest = function (symbols, inputSrc) {
            var args;

            if (this.isSeperator || this.isCyclic) {
                if (this.isSeperator) {
                    args = this.ruleTestSeperator(symbols, inputSrc);
                } else {
                    args = this.ruleTestCyclic(symbols, inputSrc);
                }

                if (args === null) {
                    return null;
                } else {
                    var finallyFun = this.finallyFun;

                    if (finallyFun === null) {
                        return args;
                    } else {
                        return {
                            onFinish: finallyFun,
                            args: args,
                            apply: false
                        };
                    }
                }
            } else {
                var finallyFun = this.finallyFun;

                if (finallyFun === null) {
                    return this.ruleTestNormal(symbols, inputSrc, true);
                } else {
                    args = this.ruleTestNormal(symbols, inputSrc, false);

                    if (args === null) {
                        return null;
                    } else {
                        return {
                            onFinish: finallyFun,
                            args: args,
                            apply: true
                        };
                    }
                }
            }
        };

        ParserRuleImplementation.prototype.ruleTestSeperator = function (symbols, inputSrc) {
            var lookups = this.compiledLookups, peekID = symbols.peekID(), onFinish = null, rules = lookups[0], rulesLen = rules.length;

            var rule = null;

            if (rules.length <= peekID || (rule = rules[peekID]) === null) {
                return null;
            } else {
                var symbolI = symbols.idIndex(), args = null;

                if (this.isRecursive === symbolI) {
                    if (this.recursiveCount > 2) {
                        return null;
                    } else {
                        this.recursiveCount++;
                    }
                } else {
                    this.recursiveCount = 0;
                    this.isRecursive = symbolI;
                }

                if (rule instanceof ParserRuleImplementation) {
                    onFinish = rule.ruleTest(symbols, inputSrc);

                    if (onFinish === null) {
                        this.isRecursive = symbolI;
                        if (this.recursiveCount > 0) {
                            this.recursiveCount--;
                        }

                        return null;
                    } else {
                        args = [onFinish];
                    }
                } else if (rule instanceof Array) {
                    var ruleLen = rule.length;

                    for (var j = 0; j < ruleLen; j++) {
                        var r = rule[j];

                        if (r instanceof ParserRuleImplementation) {
                            onFinish = r.ruleTest(symbols, inputSrc);

                            if (onFinish !== null) {
                                args = [onFinish];
                                break;
                            }
                        } else if (r.id === peekID) {
                            args = [symbols.next()];
                            break;
                        }
                    }
                } else if (rule.id === peekID) {
                    args = [symbols.next()];
                } else {
                    this.isRecursive = symbolI;
                    if (this.recursiveCount > 0) {
                        this.recursiveCount--;
                    }

                    return null;
                }

                var separators = lookups[1];
                var separatorsLen = separators.length;
                while (symbols.hasMore()) {
                    symbolI = symbols.idIndex();
                    peekID = symbols.peekID();

                    var separator = null, hasSeperator = false;

                    if (separatorsLen <= peekID || (separator = separators[peekID]) === null) {
                        break;
                    } else if (separator instanceof Array) {
                        for (var j = 0; j < separator.length; j++) {
                            var r = separator[j];

                            if (r instanceof ParserRuleImplementation && r.ruleTest(symbols, inputSrc) !== null) {
                                hasSeperator = true;
                                break;
                            } else if (r.id === peekID) {
                                symbols.next();
                                hasSeperator = true;
                                break;
                            }
                        }
                    } else if (((separator instanceof ParserRuleImplementation) && separator.ruleTest(symbols, inputSrc) !== null) || (separator.id === peekID && symbols.next())) {
                        hasSeperator = true;
                    }

                    if (hasSeperator) {
                        peekID = symbols.peekID();

                        // if rule not found
                        if (rulesLen <= peekID || (rule = rules[peekID]) === null) {
                            symbols.back(symbols.idIndex() - symbolI, this, 0);
                            break;
                        } else if (rule instanceof ParserRuleImplementation) {
                            onFinish = rule.ruleTest(symbols, inputSrc);

                            if (onFinish === null) {
                                symbols.back(symbols.idIndex() - symbolI, this, 0);
                                break;
                            } else {
                                args.push(onFinish);
                            }
                        } else if (rule instanceof Array) {
                            var ruleLen = rule.length, success = false;

                            for (var j = 0; j < ruleLen; j++) {
                                var r = rule[j];

                                if (r instanceof ParserRuleImplementation) {
                                    onFinish = r.ruleTest(symbols, inputSrc);

                                    if (onFinish !== null) {
                                        args.push(onFinish);
                                        success = true;
                                        break;
                                    }
                                } else if (r.id === peekID) {
                                    args.push(symbols.next());
                                    success = true;
                                    break;
                                }
                            }

                            if (!success) {
                                symbols.back(symbols.idIndex() - symbolI, this, 0);
                                break;
                            }
                        } else if (rule.id === peekID) {
                            args.push(symbols.next());
                        } else {
                            symbols.back(symbols.idIndex() - symbolI, this, 0);
                            break;
                        }
                    } else {
                        break;
                    }
                }

                if (args === null) {
                    // needs to remember it's recursive position when we leave
                    this.isRecursive = symbolI;
                    if (this.recursiveCount > 0) {
                        this.recursiveCount--;
                    }

                    return null;
                } else {
                    this.isRecursive = NO_RECURSION;

                    return args;
                }
            }
        };

        ParserRuleImplementation.prototype.ruleTestNormal = function (symbols, inputSrc, returnOnlyFirstArg) {
            /*
            * Recursive re-entrance rules.
            *
            * We need to prevent re-entry in order to disallow accidentally
            * infinitely recursive rules. These should be allowed in grammars, but
            * cannot be allowed in this.
            *
            * However we do allow some recursion, within limits. These rules are:
            *  = If the symbol position has moved on.
            *    In short this is an indicator that the previous rules are chomping
            *    symbols, and so the last time this was called, the symbol was
            *    different to how it's being called right now.
            *  = Recursiveness is allowed to occur twice.
            *    This is to allow searching into the sub-trees, in order for
            *    recursive grammars to be allowed.
            */
            var startSymbolI = symbols.idIndex(), peekID = symbols.peekID();

            if (this.internalCount === 0) {
                this.recursiveCount = 0;
            }

            this.internalCount++;

            if (this.isRecursive === startSymbolI) {
                if (this.recursiveCount > 2) {
                    this.internalCount--;

                    return null;
                } else {
                    this.recursiveCount++;
                }
            } else {
                this.recursiveCount = 0;
                this.isRecursive = startSymbolI;
            }

            var lookups = this.compiledLookups, optional = this.isOptional, onFinish = null, args = null;

            for (var i = 0, len = lookups.length; i < len; i++) {
                /*
                * Lookup used to jump straight to the rules we are interested in.
                * It also allows us to quit early, if we won't find what we are
                * after.
                */
                var lookupRules = lookups[i];
                var rule = null;

                // if rule is not found
                if (lookupRules.length <= peekID || (rule = lookupRules[peekID]) === null) {
                    if (optional[i]) {
                        if (!returnOnlyFirstArg) {
                            if (args === null) {
                                args = [null];
                                this.isRecursive = NO_RECURSION;
                            } else {
                                args.push(null);
                            }
                        }
                    } else {
                        if (i !== 0) {
                            symbols.back(symbols.idIndex() - startSymbolI, this, i);
                        }

                        // needs to remember it's recursive position when we leave
                        this.isRecursive = startSymbolI;
                        if (this.recursiveCount > 0) {
                            this.recursiveCount--;
                        }

                        args = null;
                        break;
                    }
                } else {
                    // 'or' rules
                    if (rule instanceof Array) {
                        var ruleLen = rule.length;

                        for (var j = 0; j < ruleLen; j++) {
                            var r = rule[j];

                            if (r instanceof ParserRuleImplementation) {
                                onFinish = r.ruleTest(symbols, inputSrc);

                                if (onFinish !== null) {
                                    break;
                                }
                            } else if (r.id === peekID) {
                                onFinish = symbols.next();
                                break;
                            }
                        }
                        // 'then' rules
                    } else if (rule instanceof ParserRuleImplementation) {
                        onFinish = rule.ruleTest(symbols, inputSrc);
                        // terminal rule
                    } else if (peekID === rule.id) {
                        onFinish = symbols.next();
                    }

                    // it is only the first iteration where recursiveness is not allowed,
                    // so we always turn it off
                    if (onFinish === null && !optional[i]) {
                        symbols.back(symbols.idIndex() - startSymbolI, this, i);

                        // needs to remember it's recursive position when we leave
                        this.isRecursive = startSymbolI;

                        args = null;
                        break;
                    } else {
                        if (returnOnlyFirstArg) {
                            if (args === null) {
                                args = onFinish;
                            }
                        } else if (args === null) {
                            args = [onFinish];
                            this.isRecursive = NO_RECURSION;
                        } else {
                            args.push(onFinish);
                        }

                        onFinish = null;
                        peekID = symbols.peekID();
                    }
                }
            }

            if (this.recursiveCount > 0) {
                this.recursiveCount--;
            }

            this.internalCount--;

            return args;
        };

        ParserRuleImplementation.prototype.ruleTestCyclic = function (symbols, inputSrc) {
            var args = null, lookups = this.compiledLookups, len = lookups.length, onFinish = null;

            while (symbols.hasMore()) {
                for (var i = 0; i < len; i++) {
                    var peekID = symbols.peekID();
                    var lookupRules = lookups[i];
                    var rule = null;

                    // if rule not found
                    if (lookupRules.length <= peekID || (rule = lookupRules[peekID]) === null) {
                        return args;
                    } else {
                        if (rule instanceof ParserRuleImplementation) {
                            onFinish = rule.ruleTest(symbols, inputSrc);
                        } else if (rule instanceof Array) {
                            for (var j = 0; j < rule.length; j++) {
                                var r = rule[j];

                                if (r instanceof ParserRuleImplementation) {
                                    onFinish = r.ruleTest(symbols, inputSrc);
                                    break;
                                } else if (r.id === peekID) {
                                    onFinish = symbols.next();
                                    break;
                                }
                            }
                        } else if (rule.id === peekID) {
                            onFinish = symbols.next();
                        }

                        if (onFinish !== null) {
                            break;
                        }
                    }
                }

                if (onFinish !== null) {
                    if (args === null) {
                        args = [onFinish];
                    } else {
                        args.push(onFinish);
                    }

                    onFinish = null;
                } else {
                    break;
                }
            }

            return args;
        };

        /**
        * Note that the number of symbols, strings, and indexes
        * returned may be larger then the length stated.
        *
        * This is because the arrays are created at larger sizes
        * then normal, as a speed optimization. This is except
        * for 'errors' and 'strings'.
        *
        * Errors is a list of all error matches.
        *
        * Strings contains each string, in order for each
        * terminal which stated to grab a match. If the terminal
        * did not state to grab a match, then nothing is stored.
        *
        * // todo should symbols store terminals instead of ids?
        *
        * Returned is an object containing:
        *   errors: all errors received during the parse
        *
        *   length: the number of symbols found
        *  symbols: the id of each symbol found
        *  indexes: index of each match in the src input
        *
        *  strings: a substrings for each symbol, where the terminal stated to return a string
        */
        ParserRuleImplementation.prototype.parseSymbolsInner = function (inputSrc, src, name) {
            var sourceLines = new SourceLines(inputSrc, name);

            var symbolI = 0, len = src.length, symbols = [], symbolIDs = [], ignores = getIgnores(this.parseParent), singleIgnore = (ignores.length === 1), multipleIgnores = (ignores.length > 1), ignoreTest = (ignores.length === 1 ? ignores[0].typeTestFunction : null), postIgnoreMatchEvent = (ignores.length === 1 ? ignores[0].postMatch : null), literals = this.compiled.literals, terminals = this.compiled.terminals, allTerms = ignores.concat(literals, terminals), ignoresLen = ignores.length, literalsLen = ignoresLen + literals.length, termsLen = literalsLen + terminals.length, literalsCharArrays = [], literalsType = [], symbolIDToTerms = this.compiled.idToTerms, postMatches = new Array(termsLen), termTests = [], termIDs = new Array(termsLen), NO_ERROR = -1, errorStart = NO_ERROR, errors = [];

            var literalsLookup = [];

            for (var i = 0; i < allTerms.length; i++) {
                var term = allTerms[i];

                if (i < ignoresLen) {
                    termTests.push(term.typeTestFunction);
                    literalsType.push(0);
                    literalsCharArrays.push(null);
                } else if (i < literalsLen) {
                    termTests.push(null);
                    literalsType.push(term.type);

                    var code;
                    if (term.type === TYPE_STRING) {
                        var stringCodes = term.typeTestString;
                        code = stringCodes[0];
                        literalsCharArrays.push(stringCodes);
                    } else {
                        code = term.typeTestCode;
                        literalsCharArrays.push(null);
                    }

                    var arr = literalsLookup[code];
                    if (arr === undefined) {
                        literalsLookup[code] = [i];
                    } else {
                        arr.push(i);
                    }
                } else {
                    termTests[i] = term.typeTestFunction;
                }

                var mostUpper = term.getParentTerm();
                if (mostUpper !== term) {
                    allTerms[i] = mostUpper;
                }

                postMatches[i] = mostUpper.postMatch;
                termIDs[i] = mostUpper.id;
            }

            if (terminals.length === 0) {
                throw new Error("No terminals provided");
            } else {
                var i = 0;

                scan:
                while (i < len) {
                    var code = src.charCodeAt(i);

                    /*
                    * All terminals are put in one array,
                    * with the ignores at the beginning,
                    * and the non-ignores taking up the second
                    * half.
                    *
                    * We iterate through, checking all ignores
                    * first, then automatically moving onto
                    * non ignores after.
                    *
                    * If anything is found, we jump back to
                    * the beginning (through 'j = 0'), so we
                    * check the ignores before _every_ symbol.
                    *
                    * This includes if we find an ignore,
                    * since ignore terminals might go in the
                    * order: 'whitespace', 'comment',
                    * 'whitespace', 'comment', etc.
                    */
                    var j = 0;
                    var r = 0;

                    /*
                    * Test the 'ignores', i.e. whitespace.
                    */
                    if (singleIgnore) {
                        r = ignoreTest(src, i, code, len);

                        if (r > i) {
                            code = src.charCodeAt(r);

                            if (postIgnoreMatchEvent !== null) {
                                var r2 = postIgnoreMatchEvent(src, r, code, len);

                                if (r2 > r) {
                                    code = src.charCodeAt(i = r2);
                                } else {
                                    i = r;
                                }
                            } else {
                                i = r;
                            }
                        }
                    } else if (multipleIgnores) {
                        while (j < ignoresLen) {
                            r = termTests[j](src, i, code, len);

                            if (r > i) {
                                code = src.charCodeAt(r);

                                var postMatchEvent = postMatches[j];
                                if (postMatchEvent !== null) {
                                    var r2 = postMatchEvent(src, r, code, len);

                                    if (r2 > r) {
                                        code = src.charCodeAt(i = r2);
                                    } else {
                                        i = r;
                                    }
                                } else {
                                    i = r;
                                }

                                j = (j === 0) ? 1 : 0;
                                continue;
                            } else {
                                j++;
                            }
                        }
                    }

                    /*
                    * Test 'literals', i.e. keywords like 'if'
                    */
                    r = 0;

                    var litsLookups = literalsLookup[code];
                    if (litsLookups !== undefined) {
                        scan_literals:
                        for (var k = 0; k < litsLookups.length; k++) {
                            var termI = litsLookups[k];
                            var type = literalsType[termI];

                            /*
                            * A string,
                            * but it is actually an array of code characters.
                            */
                            if (type === TYPE_STRING) {
                                termI = litsLookups[k];

                                var matchArray = literalsCharArrays[termI];
                                var testLen = matchArray.length;

                                for (var testI = 0; testI < testLen; testI++) {
                                    if (src.charCodeAt(i + testI) !== matchArray[testI]) {
                                        continue scan_literals;
                                    }
                                }

                                if (!isWordCharAt(src, i + testI)) {
                                    r = i + testI;
                                } else {
                                    continue scan_literals;
                                }
                                /*
                                * Non-alphanumeric codes, such as '+'.
                                */
                            } else if (type === TYPE_CODE) {
                                // no inner check needed here, because the lookup in the array it's self, is enough to confirm
                                r = i + 1;
                                /*
                                * Single alpha-numeric codes, such as 'a' or 'b'.
                                *
                                * I expect it is unpopular, which is why it is last.
                                */
                            } else if (type === TYPE_CODE_ALPHANUMERIC) {
                                if (!isWordCode(src.charCodeAt(i + 1))) {
                                    r = i + 1;
                                } else {
                                    continue scan_literals;
                                }
                            }

                            if (r > i) {
                                symbolIDs[symbolI] = termIDs[termI];

                                // If we were in error mode,
                                // report the error section.
                                //
                                // This is from the last terminal,
                                // to this one, but ignores whitespace.
                                if (errorStart !== NO_ERROR) {
                                    errors.push(new SymbolError(sourceLines, errorStart, i));

                                    errorStart = NO_ERROR;
                                }

                                var postMatchEvent = postMatches[termI];
                                if (postMatchEvent !== null) {
                                    code = src.charCodeAt(r);

                                    var r2 = postMatchEvent(src, r, code, len);

                                    if (r2 !== undefined && r2 > r) {
                                        r = r2;
                                    }
                                }

                                symbols[symbolI++] = new Symbol(allTerms[termI], sourceLines, i, r);

                                i = r;

                                continue scan;
                            }
                        }
                    }

                    j = literalsLen;

                    while (j < termsLen) {
                        r = termTests[j](src, i, code, len);

                        if (r > i) {
                            symbolIDs[symbolI] = termIDs[j];

                            // If we were in error mode,
                            // report the error section.
                            //
                            // This is from the last terminal,
                            // to this one, but ignores whitespace.
                            if (errorStart !== NO_ERROR) {
                                errors.push(new SymbolError(sourceLines, errorStart, i));

                                errorStart = NO_ERROR;
                            }

                            var postMatchEvent = postMatches[j];
                            if (postMatchEvent !== null) {
                                code = src.charCodeAt(r);

                                var r2 = postMatchEvent(src, r, code, len);

                                if (r2 !== 0 && r2 > r) {
                                    r = r2;
                                }
                            }

                            symbols[symbolI++] = new Symbol(allTerms[j], sourceLines, i, r);

                            i = r;

                            continue scan;
                        }

                        j++;
                    }

                    /*
                    * Deal with failure.
                    */
                    errorStart = i;
                    i++;
                }

                if (errorStart !== NO_ERROR && errorStart < len) {
                    errors.push(new SymbolError(sourceLines, errorStart, i));
                }

                return new SymbolResult(errors, symbols, symbolIDs, symbolI, symbolIDToTerms);
            }
        };
        return ParserRuleImplementation;
    })();

    /*  **  **  **  **  **  **  **  **  **  **  **  **  **
    *
    *          Parse
    *
    * This is the core Parse section, which is the API people
    * actually see.
    *
    * This includes the hidden ParseFactory, which builds
    * Parse instances (and allows them to be used
    * constructors).
    *
    * That is where Parse is defined, and built.
    *
    *  **  **  **  **  **  **  **  **  **  **  **  **  */
    /**
    * PRIVATE
    */
    var ignoreSingle = function (ps, term) {
        if (term instanceof Term) {
            ingoreInner(ps, term);
        } else {
            if (typeof term === 'string' || term instanceof String || isFunction(term)) {
                ignoreSingle(ps, terminal(term));
            } else if (term instanceof Array) {
                for (var i = 0; i < term.length; i++) {
                    ignoreSingle(ps, terminalsInner(term[i], null));
                }
            } else if (term instanceof Object) {
                var keys = Object.keys(term), keysLen = keys.length;

                for (var i = 0; i < keysLen; i++) {
                    var k = keys[i];

                    ignoreSingle(ps, terminalsInner(term[k], k));
                }
            } else {
                throw new Error("unknown ignore terminal given");
            }
        }
    };

    /**
    * @return A list of all ignores set to be used.
    */
    function getIgnores(ps) {
        return ps.ignores;
    }

    function ingoreInner(ps, t) {
        ps.ignores.push(t);
    }

    function terminalsInner(ps, t, termName) {
        if (t instanceof Object && !isFunction(t) && !(t instanceof Array)) {
            var terminals = {};

            var keys = Object.keys(t), keysLen = keys.length;
            for (var i = 0; i < keysLen; i++) {
                var name = keys[i];
                terminals[name] = terminalsInner(ps, t[name], name);
            }

            return terminals;
        } else {
            var term = new Term(t, termName).setID(ps.terminalID++);

            if (termName !== undefined) {
                term.setName(formatTerminalName(termName));
            }

            return term;
        }
    }

    /**
    * The point of the ParseFactory,
    * is that it allows Parse to create new Parse objects
    * within it's constructor.
    *
    * Parse can recursively build Parse.
    *
    * This is to support the ability to have multiple
    * versions of parse simultanously.
    *
    * @private
    */
    /*
    * This is to ensure the Parse 'instances' are always
    * callable functions, and not Objects.
    */
    var Parse = (function () {
        function Parse() {
            /**
            * A counting id used for easily and uniquely
            * identifying terminals.
            *
            * It's used over a hash code so we can place the
            * terminals inside of an array later.
            *
            * @type {number}
            */
            this.terminalID = INVALID_TERMINAL + 1;
            /**
            * An array of Terminals to ignore.
            *
            * These are tested before the main terminals.
            */
            this.ignores = [];
        }
        /**
        * @return {number} The number of terminals created with this Parse.
        */
        Parse.prototype.getNumTerminals = function () {
            /*
            * INVALID_TERMINAL+1 is added to terminalID at the start,
            * so removing it ensures we are only left with the number of terminals created
            */
            return this.terminalID - (INVALID_TERMINAL + 1);
        };

        Parse.prototype.rule = function () {
            return new ParserRuleImplementation(this);
        };

        Parse.prototype.name = function (name) {
            return new ParserRuleImplementation(this).name(name);
        };

        Parse.prototype.a = function () {
            var argsLen = arguments.length, args = new Array(argsLen);
            while (argsLen-- > 0) {
                args[argsLen] = arguments[argsLen];
            }

            return new ParserRuleImplementation(this).thenAll(args);
        };

        Parse.prototype.or = function () {
            var argsLen = arguments.length, args = new Array(argsLen);
            while (argsLen-- > 0) {
                args[argsLen] = arguments[argsLen];
            }

            return new ParserRuleImplementation(this).orAll(args);
        };

        Parse.prototype.either = function () {
            var argsLen = arguments.length, args = new Array(argsLen);
            while (argsLen-- > 0) {
                args[argsLen] = arguments[argsLen];
            }

            return new ParserRuleImplementation(this).orAll(args);
        };

        Parse.prototype.optional = function () {
            var argsLen = arguments.length, args = new Array(argsLen);
            while (argsLen-- > 0) {
                args[argsLen] = arguments[argsLen];
            }

            return new ParserRuleImplementation(this).optionalAll(args);
        };

        Parse.prototype.maybe = function () {
            var argsLen = arguments.length, args = new Array(argsLen);
            while (argsLen-- > 0) {
                args[argsLen] = arguments[argsLen];
            }

            return new ParserRuleImplementation(this).optionalAll(args);
        };

        Parse.prototype.ignore = function () {
            for (var i = 0; i < arguments.length; i++) {
                ignoreSingle(this, arguments[i]);
            }

            return this;
        };

        /**
        * Used for creating a special IParserRule, which cannot be altered,
        * that creates a list of rules.
        *
        * These rules are seperated by the seperator given. For example for
        * parameters:
        *  parse.repeatSeperator( variable, comma )
        *
        * and that will match:
        *  variable
        *  variable comma variable
        *  variable comma variable comma variable
        *
        * Note how the comma is always between each variable. It won't match
        * commas on the outside.
        */
        Parse.prototype.repeatSeperator = function (match, seperator) {
            return new ParserRuleImplementation(this).repeatSeperator(match, seperator);
        };

        Parse.prototype.optionalSeperator = function (match, seperator) {
            return new ParserRuleImplementation(this).optionalSeperator(match, seperator);
        };

        Parse.prototype.repeatEither = function () {
            var argsLen = arguments.length, args = new Array(argsLen);
            while (argsLen-- > 0) {
                args[argsLen] = arguments[argsLen];
            }

            return new ParserRuleImplementation(this).cyclicOrAll(args);
        };

        Parse.prototype.repeat = function () {
            var argsLen = arguments.length, args = new Array(argsLen);
            while (argsLen-- > 0) {
                args[argsLen] = arguments[argsLen];
            }

            return new ParserRuleImplementation(this).cyclicOrSingle(new ParserRuleImplementation(this).thenAll(args));
        };

        Parse.prototype.terminals = function (obj) {
            return terminalsInner(this, obj, null);
        };
        return Parse;
    })();
    _parse.Parse = Parse;

    var pInstance = new Parse();

    function rule() {
        return new ParserRuleImplementation(pInstance);
    }
    _parse.rule = rule;

    function name(name) {
        return new ParserRuleImplementation(pInstance).name(name);
    }
    _parse.name = name;

    function a() {
        var argsLen = arguments.length, args = new Array(argsLen);
        while (argsLen-- > 0) {
            args[argsLen] = arguments[argsLen];
        }

        return new ParserRuleImplementation(pInstance).thenAll(args);
    }
    _parse.a = a;

    function either() {
        var argsLen = arguments.length, args = new Array(argsLen);
        while (argsLen-- > 0) {
            args[argsLen] = arguments[argsLen];
        }

        return new ParserRuleImplementation(pInstance).orAll(args);
    }
    _parse.either = either;

    function optional() {
        var argsLen = arguments.length, args = new Array(argsLen);
        while (argsLen-- > 0) {
            args[argsLen] = arguments[argsLen];
        }

        return new ParserRuleImplementation(pInstance).optionalAll(args);
    }
    _parse.optional = optional;

    _parse.maybe = optional;

    function ignore() {
        for (var i = 0; i < arguments.length; i++) {
            ignoreSingle(pInstance, arguments[i]);
        }

        return pInstance;
    }
    _parse.ignore = ignore;

    function repeatSeperator(match, seperator) {
        return new ParserRuleImplementation(pInstance).repeatSeperator(match, seperator);
    }
    _parse.repeatSeperator = repeatSeperator;

    function optionalSeperator(match, seperator) {
        return new ParserRuleImplementation(pInstance).optionalSeperator(match, seperator);
    }
    _parse.optionalSeperator = optionalSeperator;

    function repeatEither() {
        var argsLen = arguments.length, args = new Array(argsLen);
        while (argsLen-- > 0) {
            args[argsLen] = arguments[argsLen];
        }

        return new ParserRuleImplementation(pInstance).cyclicOrAll(args);
    }
    _parse.repeatEither = repeatEither;

    function repeat() {
        var argsLen = arguments.length, args = new Array(argsLen);
        while (argsLen-- > 0) {
            args[argsLen] = arguments[argsLen];
        }

        return new ParserRuleImplementation(pInstance).cyclicOrSingle(new ParserRuleImplementation(pInstance).thenAll(args));
    }
    _parse.repeat = repeat;

    /**
    * Code checking utility functions.
    *
    * Each of these functions must be given the 'charCodeAt' value,
    * from a string, to check. Hence why they are listed under 'code'.
    */
    _parse.code = {
        'isNumeric': isNumericCode,
        'isHex': isHexCode,
        'isAlpha': isAlphaCode,
        'isAlphaNumeric': isAlphaNumericCode
    };

    function terminals(t) {
        return terminalsInner(pInstance, t, null);
    }
    _parse.terminals = terminals;

    

    function terminal(match, termName) {
        return terminalsInner(pInstance, match, termName);
    }
    _parse.terminal = terminal;

    (function (terminal) {
        /*
        * These are the terminals provided by Parse,
        * which people can use to quickly build a language.
        */
        terminal.WHITESPACE = function (src, i, code, len) {
            while (code === SPACE || code === TAB) {
                code = src.charCodeAt(++i);
            }

            return i;
        };

        /**
        * A terminal that matches: tabs, spaces, \n and \r characters.
        */
        terminal.WHITESPACE_END_OF_LINE = function (src, i, code, len) {
            while (code === SPACE || code === TAB || code === SLASH_N || code === SLASH_R) {
                code = src.charCodeAt(++i);
            }

            return i;
        };

        /**
        * A number terminal.
        */
        terminal.NUMBER = function (src, i, code, len) {
            if (ZERO <= code && code <= NINE) {
                // 0x hex number
                if (code === ZERO && src.charCodeAt(i + 1) === LOWER_X) {
                    i++;

                    do {
                        code = src.charCodeAt(++i);
                    } while(code === UNDERSCORE || isHexCode(code));
                    // normal number
                } else {
                    do {
                        code = src.charCodeAt(++i);
                    } while(code === UNDERSCORE || (code >= ZERO && code <= NINE));

                    // Look for Decimal Number
                    if (src.charCodeAt(i) === FULL_STOP && isNumericCode(src.charCodeAt(i + 1))) {
                        i++;

                        do {
                            code = src.charCodeAt(++i);
                        } while(code === UNDERSCORE || (code >= ZERO && code <= NINE));
                    }
                }

                return i;
            }

            return 0;
        };

        /**
        * A C-style single line comment terminal.
        *
        * Matches everything from a // onwards.
        */
        terminal.C_SINGLE_LINE_COMMENT = function (src, i, code, len) {
            if (code === SLASH && src.charCodeAt(i + 1) === SLASH) {
                i++;

                do {
                    code = src.charCodeAt(++i);
                } while(i < len && code !== SLASH_N);

                return i;
            }

            return 0;
        };

        /**
        * A C-like multi line comment, matches everything from '/ *' to a '* /', (without the spaces).
        */
        terminal.C_MULTI_LINE_COMMENT = function (src, i, code, len) {
            if (code === SLASH && src.charCodeAt(i + 1) === STAR) {
                // +1 is so we end up skipping two characters,
                // the / and the *, before we hit the next char to check
                i++;

                do {
                    i++;

                    // error!
                    if (i >= len) {
                        return 0;
                    }
                } while(!(src.charCodeAt(i) === STAR && src.charCodeAt(i + 1) === SLASH));

                // plus 2 to include the end of the comment
                return i + 2;
            }

            return 0;
        };

        /**
        * A terminal for a string, double or single quoted.
        */
        terminal.STRING = function (src, i, code, len) {
            // double quote string
            if (code === DOUBLE_QUOTE) {
                do {
                    i++;

                    // error!
                    if (i >= len) {
                        return 0;
                    }
                } while(!(src.charCodeAt(i) === DOUBLE_QUOTE && src.charCodeAt(i - 1) !== BACKSLASH));

                return i + 1;
                // single quote string
            } else if (code === SINGLE_QUOTE) {
                do {
                    i++;

                    // error!
                    if (i >= len) {
                        return 0;
                    }
                } while(!(src.charCodeAt(i) === SINGLE_QUOTE && src.charCodeAt(i - 1) !== BACKSLASH));

                return i + 1;
            }

            return 0;
        };
    })(_parse.terminal || (_parse.terminal = {}));
    var terminal = _parse.terminal;
})(parse || (parse = {}));
///<reference path='../quby.ts' />
"use strict";
var quby;
(function (quby) {
    /**
    * AST
    *
    * Objects for declaring the abstract syntax tree are defined
    * here. A new function is here for representing every aspect
    * of the possible source code that can be parsed.
    */
    /*
    * Functions, classes, variables and other items in Quby have both a 'name'
    * and a 'callName'. This describes some of their differences.
    *
    * = Names =
    * These are for display purposes. However names should be be considered to
    * be unique, and so entirely different names can refer to the same thing.
    *
    * For example 'object' and 'Object' are different names but can potentially
    * refer to the same thing. However what they refer to also depends on context,
    * for example one might be a function called object and the other might be
    * the Object class. In that context they refer to entirely different things.
    *
    * In short, Names are used for displaying information and should never be
    * used for comparison.
    *
    * = CallNames =
    * callNames however are unique. They are always in lower case, include no
    * spaces and include their context in their formatting. This means it is
    * safe to directly compare callNames (i.e. 'callName1 == callName2').
    * It is also safe to use them in defining JSON object properties.
    *
    * The format functions in quby.runtime should be used for creating callNames
    * from names. They are also designed to ensure that a callName of one context
    * cannot refer to a callName of a different context.
    *
    * This is achieved by appending context unique identifiers to the beginning
    * of the callName stating it's context (function, variable, class, etc).
    *
    * They are 'context unique' because one context prefix does not clash with
    * another contexts prefix.
    */
    (function (ast) {
        var EMPTY_ARRAY = [];

        var MAX_SAFE_INT = 9007199254740991, MIN_SAFE_INT = -9007199254740991;

        var ZERO = '0'.charCodeAt(0), ONE = '1'.charCodeAt(0), NINE = '9'.charCodeAt(0), UNDERSCORE = '_'.charCodeAt(0), FULL_STOP = '.'.charCodeAt(0), LOWER_A = 'a'.charCodeAt(0), LOWER_B = 'b'.charCodeAt(0), LOWER_F = 'f'.charCodeAt(0), LOWER_X = 'x'.charCodeAt(0);

        function errorIfIntSizeUnsafe(v, numObj, n) {
            if (n > MAX_SAFE_INT) {
                v.parseError(numObj.getOffset(), "Number value is too large (yes, too large); JS cannot safely represent '" + n + "'");
            } else if (n < MIN_SAFE_INT) {
                v.parseError(numObj.getOffset(), "Number value is too small (yes, too small); JS cannot safely represent '" + n + "'");
            }
        }

        /**
        * There are times when it's much easier to just pass
        * an empty, silently-do-nothing, object into out
        * abstract syntax tree.
        *
        * That is what this is for, it will silently do nothing
        * on both validate and print.
        *
        * Do not extend this! Extend the Syntax one instead.
        */
        var EmptyStub = (function () {
            function EmptyStub(offset) {
                if (typeof offset === "undefined") { offset = null; }
                this.offset = offset;
                this.isJSLiteralFlag = false;
            }
            EmptyStub.prototype.validate = function (v) {
            };
            EmptyStub.prototype.print = function (p) {
            };
            EmptyStub.prototype.getOffset = function () {
                return this.offset;
            };

            EmptyStub.prototype.isJSLiteral = function () {
                return this.isJSLiteralFlag;
            };

            EmptyStub.prototype.setJSLiteral = function (isLit) {
                this.isJSLiteralFlag = isLit;
            };
            return EmptyStub;
        })();

        /*
        * These functions do the actual modifications to the class.
        * They alter the class structure, inserting new nodes to add more functionality.
        *
        * They are run as methods of the FunctionGenerator prototype.
        *
        * Add more here to have more class modifiers.
        */
        var functionGeneratorFactories = {
            // prefix hard coded into these functions
            "get": function (fun, param) {
                return new FunctionReadGenerator(fun, 'get', param);
            },
            "set": function (fun, param) {
                return new FunctionWriteGenerator(fun, 'set', param);
            },
            "getset": function (fun, param) {
                return new FunctionReadWriteGenerator(fun, 'get', 'set', param);
            },
            "read": function (fun, param) {
                return new FunctionReadGenerator(fun, '', param);
            },
            "write": function (fun, param) {
                return new FunctionWriteGenerator(fun, '', param);
            },
            "attr": function (fun, param) {
                return new FunctionReadWriteGenerator(fun, '', '', param);
            }
        };

        /**
        * Class Modifiers are psudo-functions you can call within a class.
        * For example 'get x' to generate the method 'getX()'.
        *
        * @return A syntax object representing whatever this will generate.
        */
        /*
        * Lookup the function generator, and then expand the given function into multiple function generators.
        * So get x, y, z becomes three 'get' generators; getX, getY and getZ.
        */
        var getFunctionGenerator = function (v, fun) {
            var name = fun.getName().toLowerCase();
            var modifierFactory = functionGeneratorFactories[name];

            if (modifierFactory) {
                var params = fun.getParameters();

                if (params === null || params.length === 0) {
                    v.parseError(fun.getOffset(), "fields are missing for " + fun.getName());
                    // this is to avoid building a FactoryGenerators middle-man collection
                } else if (params.length === 1) {
                    return modifierFactory(fun, params.getFirstStmt());
                } else {
                    var generators = [];

                    // sort the good parameters from the bad
                    // they must all be Varaibles
                    var paramStmts = params.getStmts();
                    for (var i = 0; i < paramStmts.length; i++) {
                        generators.push(modifierFactory(fun, paramStmts[i]));
                    }

                    if (generators.length > 0) {
                        return new TransparentList(generators);
                    } else {
                        return new EmptyStub();
                    }
                }
            } else {
                return null;
            }
        };

        /*
        * ### PUBLIC ###
        */
        var Syntax = (function () {
            function Syntax(offset) {
                if (typeof offset === "undefined") { offset = null; }
                this.isJSLiteralFlag = false;
                this.offset = offset;
                this.isJSLiteralFlag = false;
            }
            Syntax.prototype.print = function (printer) {
                quby.runtime.error("Internal", "Error, print has not been overridden");
            };

            /**
            * Helper print function, for printing values in an if, while or loop condition.
            * When called, this will store the result in a temporary variable, and test against
            * Quby's idea of false ('false' and 'null').
            */
            Syntax.prototype.printAsCondition = function (p) {
                p.appendPre('var ', quby.runtime.TEMP_VARIABLE, ';');

                p.append('((', quby.runtime.TEMP_VARIABLE, '=');
                this.print(p);
                p.append(') !== null && ', quby.runtime.TEMP_VARIABLE, ' !== false)');

                // needed to prevent memory leaks
                p.appendPost('delete ', quby.runtime.TEMP_VARIABLE, ';');
            };

            Syntax.prototype.validate = function (v) {
                quby.runtime.error("Internal", "Error, validate has not been overridden");
            };

            /**
            * By 'offset', it means the offset within the source
            * file, that this comes from.
            *
            * This allows an offset to be set; either the first
            * offset this has seen, or an entirely new one to replace
            * an existing offset.
            *
            * @param offset The Symbol for use for displaying the file offset information.
            */
            Syntax.prototype.setOffset = function (offset) {
                this.offset = offset;
            };

            /**
            * @return Null if no offset, and otherwise an offset object.
            */
            Syntax.prototype.getOffset = function () {
                return this.offset;
            };

            Syntax.prototype.isJSLiteral = function () {
                return this.isJSLiteralFlag;
            };

            Syntax.prototype.setJSLiteral = function (isLit) {
                this.isJSLiteralFlag = isLit;
            };
            return Syntax;
        })();
        ast.Syntax = Syntax;

        /**
        * The most basic type of statement list.
        * Just wraps an array of statements,
        * and passes the calls to validate and print on to them.
        */
        var TransparentList = (function () {
            function TransparentList(stmts) {
                this.stmts = stmts;
                this.offset = null;

                for (var i = 0; i < stmts.length; i++) {
                    var off = stmts[i].getOffset();

                    if (off !== null) {
                        this.offset = off;
                        break;
                    }
                }

                this.isJSLiteralFlag = false;
            }
            TransparentList.prototype.isJSLiteral = function () {
                return this.isJSLiteralFlag;
            };

            TransparentList.prototype.setJSLiteral = function (isLit) {
                this.isJSLiteralFlag = isLit;
            };

            TransparentList.prototype.getStmts = function () {
                return this.stmts;
            };

            TransparentList.prototype.getOffset = function () {
                return this.offset;
            };

            TransparentList.prototype.validate = function (v) {
                var stmts = this.stmts;

                for (var i = 0; i < stmts.length; i++) {
                    stmts[i].validate(v);
                }
            };

            TransparentList.prototype.print = function (p) {
                var stmts = this.stmts;

                for (var i = 0; i < stmts.length; i++) {
                    stmts[i].print(p);
                    p.endStatement();
                }
            };
            return TransparentList;
        })();
        ast.TransparentList = TransparentList;

        var SyntaxList = (function () {
            function SyntaxList(strSeperator, appendToLast, stmts) {
                this.stmts = stmts;
                this.seperator = strSeperator;
                this.appendToLast = appendToLast;
                this.offset = null;

                var stmtsLen = this.length = stmts.length;

                for (var i = 0; i < stmtsLen; i++) {
                    var offset = stmts[i].getOffset();

                    if (offset) {
                        this.offset = offset;
                        break;
                    }
                }
            }
            SyntaxList.prototype.isJSLiteral = function () {
                return this.isJSLiteralFlag;
            };

            SyntaxList.prototype.setJSLiteral = function (isLit) {
                this.isJSLiteralFlag = isLit;
            };

            SyntaxList.prototype.setSeperator = function (seperator) {
                this.seperator = seperator;
            };

            SyntaxList.prototype.ensureOffset = function (stmt) {
                if (this.offset === null) {
                    this.offset = stmt.offset;
                }
            };

            SyntaxList.prototype.validate = function (v) {
                var length = this.length;

                if (length !== 0) {
                    var stmts = this.stmts;

                    for (var i = 0; i < length; i++) {
                        stmts[i].validate(v);
                    }
                }
            };

            SyntaxList.prototype.print = function (p) {
                var length = this.length;

                if (length !== 0) {
                    var stmts = this.stmts;

                    var appendToLast = this.appendToLast;
                    var seperator = this.seperator;

                    for (var i = 0; i < length; i++) {
                        stmts[i].print(p);

                        if (appendToLast || i < length - 1) {
                            p.append(seperator);
                        }
                    }
                }
            };

            SyntaxList.prototype.hasOneStmt = function () {
                return this.length === 0;
            };

            SyntaxList.prototype.getFirstStmt = function () {
                if (this.length === 0) {
                    return null;
                } else if (this.length === 1) {
                    return this.stmts[0];
                } else {
                    return this.stmts[0];
                }
            };

            SyntaxList.prototype.getStmts = function () {
                return this.stmts;
            };

            SyntaxList.prototype.getOffset = function () {
                return this.offset;
            };
            return SyntaxList;
        })();
        ast.SyntaxList = SyntaxList;

        var Statements = (function (_super) {
            __extends(Statements, _super);
            function Statements(stmtsArray) {
                _super.call(this, '', false, stmtsArray);
            }
            Statements.prototype.print = function (p) {
                var stmts = this.getStmts();

                if (stmts !== null) {
                    p.printArray(this.getStmts());
                }
            };
            return Statements;
        })(SyntaxList);
        ast.Statements = Statements;

        var Parameters = (function (_super) {
            __extends(Parameters, _super);
            function Parameters(params) {
                this.blockParam = null;
                this.errorParam = null;
                this.flagPostBlockParamError = false;

                if (params !== null) {
                    var paramsLen = params.length;

                    for (var i = 0; i < paramsLen; i++) {
                        var param = params[i];

                        if (param instanceof ParameterBlockVariable) {
                            var blockParam = param;

                            if (this.errorParam === null) {
                                if (this.blockParam === null) {
                                    this.blockParam = blockParam;
                                } else {
                                    this.errorParam = blockParam;
                                }
                            }

                            if (paramsLen === 1) {
                                params = EMPTY_ARRAY;
                                break;
                            } else {
                                params.splice(i--, 1);
                                paramsLen--;
                            }
                        } else if (this.blockParam !== null) {
                            this.flagPostBlockParamError = true;
                        }
                    }
                } else {
                    params = EMPTY_ARRAY;
                }

                _super.call(this, ',', false, params);
            }
            Parameters.prototype.hasDeclarationError = function () {
                return this.errorParam !== null || this.flagPostBlockParamError;
            };

            Parameters.prototype.getBlockParam = function () {
                return this.blockParam;
            };

            Parameters.prototype.validate = function (v) {
                if (this.blockParam !== null) {
                    if (this.errorParam !== null) {
                        v.parseError(this.errorParam.offset, "Only one block parameter is allowed.");
                    } else if (this.flagPostBlockParamError) {
                        v.parseError(this.blockParam.offset, "Block parameter must be the last parameter.");
                    }

                    _super.prototype.validate.call(this, v);
                    this.blockParam.validate(v);
                } else {
                    _super.prototype.validate.call(this, v);
                }
            };
            return Parameters;
        })(SyntaxList);
        ast.Parameters = Parameters;

        var Mappings = (function (_super) {
            __extends(Mappings, _super);
            function Mappings(mappings) {
                _super.call(this, ',', false, mappings);
            }
            return Mappings;
        })(SyntaxList);
        ast.Mappings = Mappings;

        /**
        * A common building block to create a list of statements,
        * which starts or ends with a conditional test.
        *
        * For example an if statement, while loop, until loop,
        * while until, and so on.
        */
        var StmtBlock = (function (_super) {
            __extends(StmtBlock, _super);
            function StmtBlock(condition, stmts) {
                if (condition !== null) {
                    _super.call(this, condition.offset);
                } else if (stmts !== null) {
                    _super.call(this, stmts.offset);
                } else {
                    _super.call(this, null);
                }

                this.condition = condition;
                this.stmts = stmts;
            }
            StmtBlock.prototype.validate = function (v) {
                if (this.condition !== null) {
                    this.condition.validate(v);
                }

                if (this.stmts !== null) {
                    this.stmts.validate(v);
                }
            };

            StmtBlock.prototype.getCondition = function () {
                return this.condition;
            };
            StmtBlock.prototype.getStmts = function () {
                return this.stmts;
            };

            StmtBlock.prototype.printBlockWrap = function (p, preCondition, postCondition, postBlock) {
                p.append(preCondition);
                this.getCondition().printAsCondition(p);
                p.append(postCondition).flush();

                if (this.stmts !== null) {
                    this.stmts.print(p);
                }

                p.append(postBlock);
            };
            return StmtBlock;
        })(Syntax);
        ast.StmtBlock = StmtBlock;

        var IfStmt = (function (_super) {
            __extends(IfStmt, _super);
            function IfStmt(ifs, elseIfs, elseBlock) {
                _super.call(this, ifs !== null ? ifs.getOffset() : null);

                this.ifStmts = ifs;
                this.elseIfStmts = elseIfs;
                this.elseStmt = elseBlock;
            }
            IfStmt.prototype.validate = function (v) {
                if (this.ifStmts !== null) {
                    this.ifStmts.validate(v);
                }

                if (this.elseIfStmts !== null) {
                    this.elseIfStmts.validate(v);
                }

                if (this.elseStmt !== null) {
                    this.elseStmt.validate(v);
                }
            };

            IfStmt.prototype.print = function (p) {
                if (this.ifStmts !== null) {
                    this.ifStmts.print(p);
                }

                if (this.elseIfStmts !== null) {
                    p.append('else ');
                    this.elseIfStmts.print(p);
                }

                if (this.elseStmt !== null) {
                    p.append('else{');
                    this.elseStmt.print(p);
                    p.append('}');
                }
            };
            return IfStmt;
        })(Syntax);
        ast.IfStmt = IfStmt;

        var IfElseIfs = (function (_super) {
            __extends(IfElseIfs, _super);
            function IfElseIfs(elseIfs) {
                _super.call(this, 'else ', false, elseIfs);
            }
            return IfElseIfs;
        })(SyntaxList);
        ast.IfElseIfs = IfElseIfs;

        var IfBlock = (function (_super) {
            __extends(IfBlock, _super);
            function IfBlock(condition, stmts) {
                _super.call(this, condition, stmts);
            }
            IfBlock.prototype.print = function (p) {
                _super.prototype.printBlockWrap.call(this, p, 'if(', '){', '}');
            };
            return IfBlock;
        })(StmtBlock);
        ast.IfBlock = IfBlock;

        var WhenClause = (function (_super) {
            __extends(WhenClause, _super);
            function WhenClause(exprs, stmts) {
                _super.call(this, exprs.getOffset());

                this.exprs = exprs;
                this.stmts = stmts;
            }
            WhenClause.prototype.validate = function (v) {
                if (this.exprs.length === 0) {
                    v.parseError(this.getOffset(), "no conditions provided for when clause");
                } else {
                    this.exprs.validate(v);

                    if (this.stmts !== null) {
                        this.stmts.validate(v);
                    }
                }
            };

            WhenClause.prototype.printClause = function (p, tempVar, isFirst) {
                if (!isFirst) {
                    p.append(' else');
                }
                p.append(' if (');

                var startExpr = '(' + tempVar + ' === ';
                p.append(startExpr);
                this.exprs.setSeperator(') || ' + startExpr);
                this.exprs.print(p);
                p.append(')');

                p.append(')'); // close whole if condition

                p.append('{');
                if (this.stmts !== null) {
                    this.stmts.print(p);
                }
                p.append('}');
            };
            return WhenClause;
        })(Syntax);
        ast.WhenClause = WhenClause;

        /**
        * The classic switch-case statement, or in Ruby, case-when.
        * Really it's just a big if-statement underneath, as JS's
        * standard switch-case is much slower than if.
        *
        * Example Code:
        *
        *      case n
        *          when 1, f(), 3 then doSomething()
        *          when abc; doThat()
        *          when 5
        *              doSomethingElse()
        *          else
        *              blah()
        *      end
        *
        */
        var CaseWhen = (function (_super) {
            __extends(CaseWhen, _super);
            function CaseWhen(caseSymbol, expr, whens, elseClause) {
                _super.call(this, caseSymbol);

                this.condition = expr;
                this.whenClauses = whens;
                this.elseClause = elseClause;
            }
            CaseWhen.prototype.validate = function (v) {
                var whenClauses = this.whenClauses;

                if (this.condition === null) {
                    if (whenClauses.length === 0) {
                        v.parseError(this.getOffset(), "case-when clause is entirely empty");
                    } else {
                        v.parseError(this.getOffset(), "no expression provided for case");
                    }

                    return;
                } else if (whenClauses.length === 0) {
                    v.parseError(this.getOffset(), "no when clauses provided for case");

                    return;
                }

                this.condition.validate(v);

                for (var i = 0; i < whenClauses.length; i++) {
                    whenClauses[i].validate(v);
                }

                if (this.elseClause !== null) {
                    this.elseClause.validate(v);
                }
            };

            CaseWhen.prototype.print = function (p) {
                var temp = p.getTempVariable();

                p.append('var ', temp, ' = ');
                this.condition.print(p);
                p.endStatement();

                var whenClauses = this.whenClauses;
                for (var i = 0; i < whenClauses.length; i++) {
                    whenClauses[i].printClause(p, temp, i === 0);
                }

                if (this.elseClause !== null) {
                    p.append(' else {');
                    this.elseClause.print(p);
                    p.append('}');
                }
            };
            return CaseWhen;
        })(Syntax);
        ast.CaseWhen = CaseWhen;

        var WhileLoop = (function (_super) {
            __extends(WhileLoop, _super);
            function WhileLoop(condition, stmts) {
                _super.call(this, condition, stmts);
            }
            WhileLoop.prototype.print = function (p) {
                this.printBlockWrap(p, 'while(', '){', '}');
            };
            return WhileLoop;
        })(StmtBlock);
        ast.WhileLoop = WhileLoop;

        var UntilLoop = (function (_super) {
            __extends(UntilLoop, _super);
            function UntilLoop(condition, stmts) {
                _super.call(this, condition, stmts);
            }
            UntilLoop.prototype.print = function (p) {
                this.printBlockWrap(p, 'while(!(', ')){', '}');
            };
            return UntilLoop;
        })(StmtBlock);
        ast.UntilLoop = UntilLoop;

        var LoopWhile = (function (_super) {
            __extends(LoopWhile, _super);
            function LoopWhile(condition, stmts) {
                _super.call(this, condition, stmts);
            }
            LoopWhile.prototype.print = function (p) {
                // flush isn't needed here,
                // because statements on the first line will always take place
                p.append('do{');
                var statements = this.getStmts();
                if (statements !== null) {
                    statements.print(p);
                }
                p.append('}while(');
                this.getCondition().printAsCondition(p);
                p.append(')');
            };
            return LoopWhile;
        })(StmtBlock);
        ast.LoopWhile = LoopWhile;

        var LoopUntil = (function (_super) {
            __extends(LoopUntil, _super);
            function LoopUntil(condition, stmts) {
                _super.call(this, condition, stmts);
            }
            LoopUntil.prototype.print = function (p) {
                p.append('do{');
                var statements = this.getStmts();
                if (statements !== null) {
                    statements.print(p);
                }
                p.append('}while(!(');
                this.getCondition().printAsCondition(p);
                p.append('))');
            };
            return LoopUntil;
        })(StmtBlock);
        ast.LoopUntil = LoopUntil;

        /**
        * This describes the signature of a class. This includes information
        * such as this classes identifier and it's super class identifier.
        */
        var ClassHeader = (function (_super) {
            __extends(ClassHeader, _super);
            function ClassHeader(identifier, extendsId) {
                _super.call(this, identifier);

                if (extendsId == null) {
                    this.extendsCallName = quby.runtime.ROOT_CLASS_CALL_NAME;
                    this.extendsName = quby.runtime.ROOT_CLASS_NAME;
                } else {
                    this.extendsCallName = quby.runtime.formatClass(extendsId.getMatch());
                    this.extendsName = extendsId.getMatch();
                }

                this.classId = identifier;
                this.extendId = extendsId;
                this.match = identifier.getMatch();
            }
            ClassHeader.prototype.getName = function () {
                return this.match;
            };

            /**
            * Returns the call name for the super class to this class header.
            */
            ClassHeader.prototype.getSuperCallName = function () {
                return this.extendsCallName;
            };

            /**
            * Returns the name of the super class to this class header.
            */
            ClassHeader.prototype.getSuperName = function () {
                return this.extendsName;
            };

            ClassHeader.prototype.validate = function (v) {
                var name = this.classId.getLower();

                if (this.hasSuper()) {
                    var extendName = this.extendId.getLower();
                    var extendStr = this.extendId.getMatch();

                    if (name === extendName) {
                        v.parseError(this.offset, "Class '" + this.match + "' is extending itself.");
                    } else if (quby.runtime.isCoreClass(name)) {
                        v.parseError(this.offset, "Core class '" + this.match + "' cannot extend alternate class '" + extendStr + "'.");
                    } else if (quby.runtime.isCoreClass(extendName)) {
                        v.parseError(this.offset, "Class '" + this.match + "' cannot extend core class '" + extendStr + "'.");
                    }
                }
            };

            /**
            * Returns true if there is a _declared_ super class.
            *
            * Note that if this returns false then 'getSuperCallName' and
            * 'getSuperName' will return the name of the root class (i.e.
            * Object).
            */
            ClassHeader.prototype.hasSuper = function () {
                return this.extendId !== null;
            };
            return ClassHeader;
        })(Syntax);
        ast.ClassHeader = ClassHeader;

        /**
        * TODO
        */
        var ModuleDeclaration = (function (_super) {
            __extends(ModuleDeclaration, _super);
            function ModuleDeclaration(symName, statements) {
                _super.call(this, symName);
            }
            ModuleDeclaration.prototype.print = function (p) {
                // TODO
            };
            ModuleDeclaration.prototype.validate = function (v) {
                // TODO
            };
            return ModuleDeclaration;
        })(Syntax);
        ast.ModuleDeclaration = ModuleDeclaration;

        var NamedSyntax = (function (_super) {
            __extends(NamedSyntax, _super);
            function NamedSyntax(offset, name, callName) {
                _super.call(this, offset);

                this.name = name;
                this.callName = callName;
            }
            NamedSyntax.prototype.getName = function () {
                return this.name;
            };

            NamedSyntax.prototype.setName = function (name) {
                this.name = name;
            };

            NamedSyntax.prototype.getCallName = function () {
                return this.callName;
            };

            NamedSyntax.prototype.setCallName = function (name) {
                this.callName = name;
            };
            return NamedSyntax;
        })(Syntax);
        ast.NamedSyntax = NamedSyntax;

        /**
        * For fully fledged pure 'Quby' classes.
        */
        var ClassDeclaration = (function (_super) {
            __extends(ClassDeclaration, _super);
            function ClassDeclaration(classHeader, statements) {
                var name = classHeader.getName();

                _super.call(this, classHeader.offset, name, quby.runtime.formatClass(name));

                this.header = classHeader;
                this.statements = statements;

                this.classValidator = null;
            }
            ClassDeclaration.prototype.getStatements = function () {
                return this.statements;
            };

            /**
            * @return False, always.
            */
            ClassDeclaration.prototype.isExtensionClass = function () {
                return false;
            };

            ClassDeclaration.prototype.getHeader = function () {
                return this.header;
            };

            ClassDeclaration.prototype.setHeader = function (header) {
                this.header = header;
            };

            ClassDeclaration.prototype.validate = function (v) {
                var name = this.getName();

                v.ensureOutFun(this, "Class '" + name + "' defined within a function, this is not allowed.");
                v.ensureOutBlock(this, "Class '" + name + "' defined within a block, this is not allowed.");

                // validator stored for printing later (validation check made inside)
                this.classValidator = v.setClass(this);
                this.header.validate(v);

                if (this.statements !== null) {
                    this.statements.validate(v);
                }

                v.unsetClass();
            };

            ClassDeclaration.prototype.print = function (p) {
                return this.classValidator.printOnce(p);
            };

            /**
            * This returns it's parents callName, unless this does not have
            * a parent class (such as if this is the root class).
            *
            * Then it will return null.
            *
            * @return The callName for the parent class of this class.
            */
            ClassDeclaration.prototype.getSuperCallName = function () {
                var superCallName = this.header.getSuperCallName();

                if (superCallName === this.getCallName()) {
                    return null;
                } else {
                    return superCallName;
                }
            };
            return ClassDeclaration;
        })(NamedSyntax);
        ast.ClassDeclaration = ClassDeclaration;

        /**
        * Extension Classes are ones that extend an existing prototype.
        * For example Number, String or Boolean.
        *
        * This also includes the extra Quby prototypes such as Array (really QubyArray)
        * and Hash (which is really a QubyHash).
        */
        var ExtensionClassDeclaration = (function (_super) {
            __extends(ExtensionClassDeclaration, _super);
            function ExtensionClassDeclaration(classHeader, statements) {
                var name = classHeader.getName();

                _super.call(this, classHeader.offset, name, quby.runtime.formatClass(name));

                this.header = classHeader;
                this.statements = statements;
            }
            ExtensionClassDeclaration.prototype.getStatements = function () {
                return this.statements;
            };

            /**
            * @Return True, always.
            */
            ExtensionClassDeclaration.prototype.isExtensionClass = function () {
                return true;
            };

            ExtensionClassDeclaration.prototype.getHeader = function () {
                return this.header;
            };

            ExtensionClassDeclaration.prototype.setHeader = function (header) {
                this.header = header;
            };

            /*
            * This prints out the methods which are added just for this class.
            */
            ExtensionClassDeclaration.prototype.print = function (p) {
                p.setCodeMode(false);

                if (this.statements !== null) {
                    p.appendExtensionClassStmts(this.getName(), this.statements.getStmts());
                }

                p.setCodeMode(true);
            };

            ExtensionClassDeclaration.prototype.validate = function (v) {
                v.ensureOutClass(this, "Classes cannot be defined within another class.");

                v.setClass(this);
                this.header.validate(v);

                if (this.statements !== null) {
                    this.statements.validate(v);
                }

                v.unsetClass();
            };

            /*
            * The parent class of all extension classes is the root class,
            * always.
            */
            ExtensionClassDeclaration.prototype.getSuperCallName = function () {
                return quby.runtime.ROOT_CLASS_CALL_NAME;
            };
            return ExtensionClassDeclaration;
        })(NamedSyntax);
        ast.ExtensionClassDeclaration = ExtensionClassDeclaration;

        /**
        * Incomplete!
        *
        * This is for 'Foo.class' identifiers.
        */
        var ClassIdentifier = (function (_super) {
            __extends(ClassIdentifier, _super);
            function ClassIdentifier(sym) {
                _super.call(this, sym);
            }
            ClassIdentifier.prototype.validate = function (v) {
                // todo, look up this class!
            };
            ClassIdentifier.prototype.print = function (p) {
                // todo print out a '_class_function' or whatever is needed for the check
            };
            return ClassIdentifier;
        })(Syntax);
        ast.ClassIdentifier = ClassIdentifier;

        /**
        * Defines a function or method declaration.
        */
        var FunctionDeclaration = (function (_super) {
            __extends(FunctionDeclaration, _super);
            function FunctionDeclaration(symName, parameters, stmtBody) {
                _super.call(this, symName, symName.getMatch(), '');

                this.type = FunctionDeclaration.FUNCTION;

                this.parameters = parameters;

                if (parameters !== null) {
                    this.blockParam = parameters.getBlockParam();
                    this.setCallName(quby.runtime.formatFun(symName.getMatch(), parameters.length));
                } else {
                    this.blockParam = null;
                    this.setCallName(quby.runtime.formatFun(symName.getMatch(), 0));
                }

                this.stmtBody = stmtBody;

                this.preVariables = null;

                this.autoReturn = false;
                this.isValid = true;
            }
            FunctionDeclaration.prototype.hasDeclarationError = function () {
                return !this.isValid || (this.parameters !== null && this.parameters.hasDeclarationError());
            };

            FunctionDeclaration.prototype.setInvalid = function () {
                this.isValid = false;
            };

            /**
            * When true, the last statement in a function or method
            * will automatically return it's value.
            */
            FunctionDeclaration.prototype.markAutoReturn = function () {
                this.autoReturn = true;
            };

            FunctionDeclaration.prototype.hasParameters = function () {
                return this.parameters !== null && this.parameters.length > 0;
            };

            FunctionDeclaration.prototype.getParameters = function () {
                return this.parameters;
            };

            FunctionDeclaration.prototype.getNumParameters = function () {
                return (this.parameters !== null) ? this.parameters.length : 0;
            };

            FunctionDeclaration.prototype.getStatements = function () {
                return this.stmtBody;
            };

            FunctionDeclaration.prototype.isMethod = function () {
                return this.type === FunctionDeclaration.METHOD;
            };

            FunctionDeclaration.prototype.isConstructor = function () {
                return this.type === FunctionDeclaration.CONSTRUCTOR;
            };

            FunctionDeclaration.prototype.isFunction = function () {
                return this.type === FunctionDeclaration.FUNCTION;
            };

            FunctionDeclaration.prototype.setType = function (type) {
                this.type = type;
            };

            FunctionDeclaration.prototype.addPreVariable = function (variable) {
                if (this.preVariables === null) {
                    this.preVariables = [variable];
                } else {
                    this.preVariables.push(variable);
                }
            };

            FunctionDeclaration.prototype.validate = function (v) {
                var isOutFun = true;

                if (this.isFunction() && v.isInsideClassDeclaration()) {
                    this.setType(FunctionDeclaration.METHOD);
                }

                if (v.isInsideFun()) {
                    var otherFun = v.getCurrentFun();
                    var strOtherType = (otherFun.isMethod() ? "method" : "function");

                    v.parseError(this.offset, "Function '" + this.getName() + "' is defined within " + strOtherType + " '" + otherFun.getName() + "', this is not allowed.");
                    this.isValid = false;

                    isOutFun = false;
                } else {
                    var strType = (this.isMethod() ? "Method" : "Function");

                    if (!v.ensureOutBlock(this, strType + " '" + this.getName() + "' is within a block, this is not allowed.")) {
                        this.isValid = false;
                    }
                }

                if (isOutFun) {
                    v.defineFun(this);
                    v.pushFunScope(this);
                }

                v.setParameters(true, true);
                if (this.parameters !== null) {
                    this.parameters.validate(v);
                }
                v.setParameters(false, false);

                if (this.stmtBody !== null) {
                    this.stmtBody.validate(v);
                }

                if (isOutFun) {
                    v.popScope();
                }
            };

            FunctionDeclaration.prototype.print = function (p) {
                if (this.isFunction()) {
                    p.setCodeMode(false);
                }

                if (this.isMethod()) {
                    p.append(this.getCallName(), '=function');
                } else {
                    p.append('function ', this.getCallName());
                }

                this.printParameters(p);
                this.printBody(p);

                if (this.isFunction()) {
                    p.setCodeMode(true);
                }
            };

            FunctionDeclaration.prototype.printParameters = function (p) {
                p.append('(');

                if (this.getNumParameters() > 0) {
                    this.parameters.print(p);
                    p.append(',');
                }

                p.append(quby.runtime.BLOCK_VARIABLE, ')');
            };

            FunctionDeclaration.prototype.printBody = function (p) {
                p.append('{');

                this.printPreVars(p);
                p.flush();

                if (this.stmtBody !== null) {
                    this.stmtBody.print(p);
                }

                // all functions must guarantee they return something...
                p.append('return null;', '}');
            };

            FunctionDeclaration.prototype.printPreVars = function (p) {
                var preVars = this.preVariables;

                /*
                * Either pre-print all local vars + the block var,
                * or print just the block var.
                */
                if (preVars !== null) {
                    p.append('var ');

                    for (var i = 0; i < preVars.length; i++) {
                        if (i > 0) {
                            p.append(',');
                        }

                        var variable = preVars[i];
                        p.append(variable.getCallName(), '=null');
                    }

                    if (this.blockParam != null) {
                        p.append(',');
                        this.blockParam.print(p);
                        p.append('=', quby.runtime.BLOCK_VARIABLE, ';');
                    }

                    p.endStatement();
                } else if (this.blockParam != null) {
                    p.append('var ');
                    this.blockParam.print(p);
                    p.append('=', quby.runtime.BLOCK_VARIABLE, ';');
                }
            };
            FunctionDeclaration.FUNCTION = 0;
            FunctionDeclaration.METHOD = 1;
            FunctionDeclaration.CONSTRUCTOR = 2;
            return FunctionDeclaration;
        })(NamedSyntax);
        ast.FunctionDeclaration = FunctionDeclaration;

        /**
        * Defines a constructor for a class.
        */
        var Constructor = (function (_super) {
            __extends(Constructor, _super);
            function Constructor(sym, parameters, stmtBody) {
                _super.call(this, sym, parameters, stmtBody);

                this.className = '';
                this.klass = null;

                this.setType(FunctionDeclaration.CONSTRUCTOR);
            }
            Constructor.prototype.setClass = function (klass) {
                this.klass = klass;

                this.setCallName(quby.runtime.formatNew(klass.getName(), this.getNumParameters()));

                this.className = klass.getCallName();
            };

            Constructor.prototype.validate = function (v) {
                if (v.ensureInClass(this, "Constructors must be defined within a class.")) {
                    this.setClass(v.getCurrentClass().getClass());

                    if (this.klass.isExtensionClass()) {
                        if (!v.ensureAdminMode(this, "Cannot add constructor to core class: '" + v.getCurrentClass().getClass().getName() + "'")) {
                            this.setInvalid();
                        }
                    }

                    v.setInConstructor(true);
                    _super.prototype.validate.call(this, v);
                    v.setInConstructor(false);
                } else {
                    this.setInvalid();
                }
            };

            Constructor.prototype.printParameters = function (p) {
                p.append('(');

                if (!this.klass.isExtensionClass()) {
                    p.append(quby.runtime.THIS_VARIABLE, ',');
                }

                if (this.hasParameters()) {
                    this.getParameters().print(p);
                    p.append(',');
                }

                p.append(quby.runtime.BLOCK_VARIABLE, ')');
            };

            Constructor.prototype.printBody = function (p) {
                p.append('{');

                this.printPreVars(p);
                p.endStatement();

                var stmts = this.getStatements();
                if (stmts !== null) {
                    stmts.print(p);
                }

                if (!this.klass.isExtensionClass()) {
                    p.append('return ', quby.runtime.THIS_VARIABLE, ';');
                }

                p.append('}');
            };
            return Constructor;
        })(FunctionDeclaration);
        ast.Constructor = Constructor;

        var AdminMethod = (function (_super) {
            __extends(AdminMethod, _super);
            function AdminMethod(name, parameters, stmtBody) {
                _super.call(this, name, parameters, stmtBody);

                this.setCallName(name.getMatch());
            }
            AdminMethod.prototype.validate = function (v) {
                v.ensureAdminMode(this, "Admin (or hash) methods cannot be defined without admin rights.");

                if (v.ensureInClass(this, "Admin methods can only be defined within a class.")) {
                    _super.prototype.validate.call(this, v);
                }
            };
            return AdminMethod;
        })(FunctionDeclaration);
        ast.AdminMethod = AdminMethod;

        /**
        * @param offset The source code offset for this Expr.
        * @param isResultBool An optimization flag.
        * Pass in true if the result of this Expression will always be a 'true' or 'false'.
        * Optional, and defaults to false.
        */
        var Expr = (function (_super) {
            __extends(Expr, _super);
            function Expr(offset, isResultBool) {
                if (typeof isResultBool === "undefined") { isResultBool = false; }
                _super.call(this, offset);

                this.isResultBool = isResultBool;
            }
            Expr.prototype.printAsCondition = function (p) {
                if (this.isResultBool) {
                    this.print(p);
                } else {
                    _super.prototype.printAsCondition.call(this, p);
                }
            };
            return Expr;
        })(Syntax);
        ast.Expr = Expr;

        var NamedExpr = (function (_super) {
            __extends(NamedExpr, _super);
            function NamedExpr(offset, name, callName, isResultBool) {
                if (typeof isResultBool === "undefined") { isResultBool = false; }
                _super.call(this, offset, name, callName);

                this.isResultBool = isResultBool;
            }
            NamedExpr.prototype.printAsCondition = function (p) {
                if (this.isResultBool) {
                    this.print(p);
                } else {
                    _super.prototype.printAsCondition.call(this, p);
                }
            };
            return NamedExpr;
        })(NamedSyntax);
        ast.NamedExpr = NamedExpr;

        /*
        * If this is used from within a class, then it doesn't know if it's a
        * function call, 'foo()', or a method call, 'this.foo()'.
        *
        * This is issue is resolved through 'lateBind' where the class resolves
        * it during validation.
        *
        * This function presumes it's calling a function (not a method) until
        * it is told otherwise.
        *
        * There is also a third case. It could be a special class function,
        * such as 'get x, y' or 'getset img' for generating accessors (and other things).
        */
        var FunctionCall = (function (_super) {
            __extends(FunctionCall, _super);
            function FunctionCall(sym, parameters, block) {
                _super.call(this, sym, sym.getMatch(), quby.runtime.formatFun(sym.getMatch(), (parameters !== null) ? parameters.length : 0));

                this.parameters = parameters;

                this.block = block;
                this.functionGenerator = null;

                this.isMethodFlag = false;

                this.isInsideExtensionClass = false;
            }
            FunctionCall.prototype.getParameters = function () {
                return this.parameters;
            };

            FunctionCall.prototype.getBlock = function () {
                return this.block;
            };

            FunctionCall.prototype.print = function (p) {
                if (this.functionGenerator) {
                    this.functionGenerator.print(p);
                } else {
                    if (this.isMethodFlag) {
                        p.append(quby.runtime.getThisVariable(this.isInsideExtensionClass), '.');
                    }

                    this.printFunCall(p);
                }
            };

            FunctionCall.prototype.printFunCall = function (p) {
                p.append(this.getCallName(), '(');
                this.printParams(p);
                p.append(')');
            };

            FunctionCall.prototype.printParams = function (p) {
                // parameters
                if (this.getNumParameters() > 0) {
                    this.parameters.print(p);
                    p.append(',');
                }

                // block parameter
                if (this.block !== null) {
                    this.block.print(p);
                } else {
                    p.append('null');
                }
            };

            FunctionCall.prototype.setIsMethod = function () {
                this.isMethodFlag = true;
            };

            FunctionCall.prototype.isMethod = function () {
                return this.isMethodFlag;
            };

            FunctionCall.prototype.isFunction = function () {
                return !this.isMethodFlag;
            };

            FunctionCall.prototype.isConstructor = function () {
                return false;
            };

            /**
            * This FunctionCall needs to declare it's self to the Validator,
            * so the Validator knows it exists. This is done in this call,
            * so it's detached from validating parameters and blocks.
            *
            * In practice, this means you can put your call to validate this as a method,
            * a 'this.method', or something else, by changing this method.
            *
            * By default, this states this is a function.
            */
            FunctionCall.prototype.validateThis = function (v) {
                v.useFun(this);
            };

            FunctionCall.prototype.validate = function (v) {
                var generator = null;

                if (v.isInsideClassDeclaration()) {
                    this.functionGenerator = generator = getFunctionGenerator(v, this);

                    if (generator === null) {
                        v.parseError(this.offset, "Function '" + this.getName() + "' called within the declaration of class '" + v.getCurrentClass().getClass().getName() + "', this is not allowed.");
                    } else if (this.block !== null) {
                        v.parseError(this.offset, "'" + this.getName() + "' modifier of class '" + v.getCurrentClass().getClass().getName() + "', cannot use a block.");
                    } else {
                        generator.validate(v);
                    }
                } else {
                    if (this.parameters !== null) {
                        this.parameters.validate(v);
                    }

                    this.isInsideExtensionClass = v.isInsideExtensionClass();

                    this.validateThis(v);

                    if (this.block != null) {
                        this.block.validate(v);
                    }
                }
            };

            FunctionCall.prototype.getNumParameters = function () {
                return (this.parameters !== null) ? this.parameters.length : 0;
            };
            return FunctionCall;
        })(NamedSyntax);
        ast.FunctionCall = FunctionCall;

        var MethodCall = (function (_super) {
            __extends(MethodCall, _super);
            function MethodCall(expr, name, parameters, block) {
                _super.call(this, name, parameters, block);

                this.expr = expr;
                this.setIsMethod();
            }
            MethodCall.prototype.print = function (p) {
                if (this.expr instanceof ThisVariable) {
                    _super.prototype.print.call(this, p);
                } else {
                    this.printExpr(p);
                    p.append('.');
                    this.printFunCall(p);
                }
            };

            MethodCall.prototype.printExpr = function (p) {
                p.append('(');
                this.expr.print(p);
                p.append(')');
            };

            MethodCall.prototype.validateThis = function (v) {
                if ((this.expr instanceof ThisVariable) && v.isInsideClass()) {
                    v.useThisClassFun(this);
                } else {
                    v.useFun(this);
                }
            };

            MethodCall.prototype.validate = function (v) {
                this.expr.validate(v);

                _super.prototype.validate.call(this, v);
            };

            MethodCall.prototype.appendLeft = function (expr) {
                if (this.expr !== null) {
                    if (this.expr["appendLeft"] !== undefined) {
                        this.expr["appendLeft"](expr);
                    }
                } else {
                    this.expr = expr;
                }

                return this;
            };
            return MethodCall;
        })(FunctionCall);
        ast.MethodCall = MethodCall;

        var SuperCall = (function (_super) {
            __extends(SuperCall, _super);
            function SuperCall(name, parameters, block) {
                _super.call(this, name, parameters, block);

                this.klassVal = null;
                this.superKlassVal = null;
            }
            SuperCall.prototype.isConstructor = function () {
                return true;
            };
            SuperCall.prototype.isMethod = function () {
                return false;
            };
            SuperCall.prototype.isFunction = function () {
                return false;
            };

            SuperCall.prototype.validate = function (v) {
                var _this = this;
                if (v.ensureInConstructor(this, "Super can only be called from within a constructor.")) {
                    this.klassVal = v.getCurrentClass();

                    v.onEndValidate(function (v) {
                        var header = _this.klassVal.getClass().getHeader();
                        var superCallName = header.getSuperCallName();
                        _this.superKlassVal = v.getClass(superCallName);

                        if (_this.superKlassVal === undefined) {
                            if (!quby.runtime.isCoreClass(header.getSuperName().toLowerCase())) {
                                v.parseError(_this.offset, "Calling super to a non-existant super class: '" + header.getSuperName() + "'.");
                            }
                        } else if (!_this.superKlassVal.hasNew(_this)) {
                            var superName = _this.superKlassVal.getClass().getName();

                            v.parseError(_this.offset, "No constructor found with " + _this.getNumParameters() + " parameters for super class: '" + superName + "'.");
                        }
                    });
                }

                var parameters = this.getParameters(), block = this.getBlock();

                if (parameters !== null) {
                    parameters.validate(v);
                }

                if (block !== null) {
                    block.validate(v);
                }
            };

            SuperCall.prototype.print = function (p) {
                if (this.superKlassVal !== undefined) {
                    var superKlass = this.superKlassVal.getClass().getName();
                    var superConstructor = quby.runtime.formatNew(superKlass, this.getNumParameters());

                    p.append(superConstructor, '(', quby.runtime.THIS_VARIABLE, ',');
                    this.printParams(p);
                    p.append(')');
                }
            };
            return SuperCall;
        })(FunctionCall);
        ast.SuperCall = SuperCall;

        var JSFunctionCall = (function (_super) {
            __extends(JSFunctionCall, _super);
            function JSFunctionCall(sym, parameters, block) {
                _super.call(this, sym, parameters, block);

                this.setJSLiteral(true);
            }
            return JSFunctionCall;
        })(FunctionCall);
        ast.JSFunctionCall = JSFunctionCall;

        /**
        * // todo
        */
        var JSMethodCall = (function (_super) {
            __extends(JSMethodCall, _super);
            function JSMethodCall(expr, sym, params, block) {
                _super.call(this, sym, params, block);

                this.setJSLiteral(true);
            }
            return JSMethodCall;
        })(FunctionCall);
        ast.JSMethodCall = JSMethodCall;

        /**
        * // todo
        */
        var JSProperty = (function (_super) {
            __extends(JSProperty, _super);
            function JSProperty(expr, sym) {
                _super.call(this, sym);

                this.setJSLiteral(true);
            }
            return JSProperty;
        })(Expr);
        ast.JSProperty = JSProperty;

        var JSNewInstance = (function (_super) {
            __extends(JSNewInstance, _super);
            function JSNewInstance(expr) {
                _super.call(this, expr.getOffset());

                this.expr = expr;
                this.setJSLiteral(true);
            }
            JSNewInstance.prototype.validate = function (v) {
                if (this.expr.isJSLiteral()) {
                    if (v.ensureAdminMode(this, "cannot create JS instances in Sandbox mode")) {
                        this.expr.validate(v);
                    }
                } else {
                    v.parseError(this.getOffset(), "invalid 'new' instance expression");
                }
            };

            JSNewInstance.prototype.print = function (p) {
                p.append('(new ');
                this.expr.print(p);
                p.append(')');
            };
            return JSNewInstance;
        })(Syntax);
        ast.JSNewInstance = JSNewInstance;

        var NewInstance = (function (_super) {
            __extends(NewInstance, _super);
            function NewInstance(name, parameters, block) {
                _super.call(this, name, parameters, block);

                var match = name.getMatch();

                this.isExtensionClass = false;
                this.className = quby.runtime.formatClass(match);

                this.setCallName(quby.runtime.formatNew(match, this.getNumParameters()));
            }
            NewInstance.prototype.print = function (p) {
                p.append(this.getCallName(), '(');

                // if a standard class,
                // make a new empty object and pass it in as the first parameter
                if (!this.isExtensionClass) {
                    p.append('new ', this.className, '(),');
                }

                this.printParams(p);

                p.append(')');
            };

            NewInstance.prototype.validate = function (v) {
                var _this = this;
                var parameters = this.getParameters(), block = this.getBlock();

                if (parameters !== null) {
                    parameters.validate(v);
                }

                if (block !== null) {
                    block.validate(v);
                }

                // this can only be validated after the classes have been fully defined
                v.onEndValidate(function (v) {
                    var klassVal = v.getClass(_this.className);

                    if (klassVal) {
                        var klass = klassVal.getClass();

                        if ((!klassVal.hasNew(_this)) || (klassVal.noNews() && _this.getNumParameters() > 0)) {
                            if (klassVal.noNews() && klass.isExtensionClass()) {
                                v.parseError(_this.getOffset(), "Cannot manually create new instances of '" + klass.getName() + "', it doesn't have a constructor.");
                            } else {
                                v.parseError(_this.offset, "Called constructor for class '" + klass.getName() + "' with wrong number of parameters: " + _this.getNumParameters());
                            }
                        } else {
                            _this.isExtensionClass = (klass instanceof ExtensionClassDeclaration);
                        }
                    } else {
                        v.parseError(_this.offset, "Making new instance of undefined class: '" + _this.getName());
                    }
                });
            };
            return NewInstance;
        })(FunctionCall);
        ast.NewInstance = NewInstance;

        var ReturnStmt = (function (_super) {
            __extends(ReturnStmt, _super);
            function ReturnStmt(expr) {
                _super.call(this, expr.offset);

                this.expr = expr;
            }
            ReturnStmt.prototype.print = function (p) {
                p.append('return ');

                this.expr.print(p);
            };
            ReturnStmt.prototype.validate = function (v) {
                if (!v.isInsideFun() && !v.isInsideBlock()) {
                    v.parseError(this.offset, "Return cannot be used outside a function or a block.");
                }

                this.expr.validate(v);
            };
            return ReturnStmt;
        })(Syntax);
        ast.ReturnStmt = ReturnStmt;

        var YieldStmt = (function (_super) {
            __extends(YieldStmt, _super);
            function YieldStmt(offsetObj, args) {
                if (typeof args === "undefined") { args = null; }
                _super.call(this, offsetObj);

                this.parameters = args;
            }
            YieldStmt.prototype.validate = function (v) {
                v.ensureInFun(this, "Yield can only be used from inside a function.");

                if (this.parameters !== null) {
                    this.parameters.validate(v);
                }
            };

            YieldStmt.prototype.print = function (p) {
                var paramsLen = (this.parameters !== null) ? this.parameters.length : 0;

                p.appendPre('quby_ensureBlock(', quby.runtime.BLOCK_VARIABLE, ', ', paramsLen.toString(), ');');
                p.append(quby.runtime.BLOCK_VARIABLE, '(');

                if (this.parameters !== null) {
                    this.parameters.print(p);
                }

                p.append(')');
            };
            return YieldStmt;
        })(Syntax);
        ast.YieldStmt = YieldStmt;

        var FunctionBlock = (function (_super) {
            __extends(FunctionBlock, _super);
            function FunctionBlock(parameters, statements) {
                // only pass in the offset if we have it,
                // otherwise a null value
                var offset = parameters !== null ? parameters.offset : null;

                _super.call(this, offset);

                this.parameters = parameters;
                this.statements = statements;

                this.mismatchedBraceWarning = false;
            }
            FunctionBlock.prototype.setMismatchedBraceWarning = function () {
                this.mismatchedBraceWarning = true;
            };

            FunctionBlock.prototype.print = function (p) {
                p.append('function(');

                if (this.parameters !== null) {
                    this.parameters.print(p);
                }

                p.append('){').flush();

                if (this.statements !== null) {
                    this.statements.print(p);
                }

                p.append('return null;', '}');
            };

            FunctionBlock.prototype.validate = function (v) {
                if (this.mismatchedBraceWarning) {
                    v.strictError(this.getOffset(), "mismatched do-block syntax (i.e. 'do something() }')");
                }

                v.pushBlockScope();

                if (this.parameters !== null) {
                    v.setParameters(true, false);
                    this.parameters.validate(v);
                    v.setParameters(false, false);
                }

                if (this.statements !== null) {
                    this.statements.validate(v);
                }

                v.popScope();
            };

            FunctionBlock.prototype.getNumParameters = function () {
                return (this.parameters !== null) ? this.parameters.length : 0;
            };
            return FunctionBlock;
        })(Syntax);
        ast.FunctionBlock = FunctionBlock;

        /*
        * todo: test a lambda as a condition, does it crash?
        *       I think this needs 'printCondition'.
        
        if ( def() end )
        */
        var Lambda = (function (_super) {
            __extends(Lambda, _super);
            function Lambda(parameters, statements) {
                _super.call(this, parameters, statements);
            }
            Lambda.prototype.print = function (p) {
                p.append('(');
                _super.prototype.print.call(this, p);
                p.append(')');
            };
            return Lambda;
        })(FunctionBlock);
        ast.Lambda = Lambda;

        var ExprParenthesis = (function (_super) {
            __extends(ExprParenthesis, _super);
            function ExprParenthesis(expr) {
                _super.call(this, expr.offset);

                this.expr = expr;
            }
            ExprParenthesis.prototype.validate = function (v) {
                this.expr.validate(v);
            };

            ExprParenthesis.prototype.print = function (p) {
                p.append('(');
                this.expr.print(p);
                p.append(')');
            };

            ExprParenthesis.prototype.printAsCondition = function (p) {
                p.append('(');
                this.expr.printAsCondition(p);
                p.append(')');
            };
            return ExprParenthesis;
        })(Syntax);
        ast.ExprParenthesis = ExprParenthesis;

        /**
        * This is to allow an expression, mostly an operation, to swap it's
        * self out and rebalance the expression tree.
        *
        * It does this by copying it's self, then inserting the copy deeper
        * into the expression tree, and this then referenced the expression
        * tree now references the top of the tree.
        */
        var GenericOp = (function (_super) {
            __extends(GenericOp, _super);
            function GenericOp(offset, isResultBool, precedence) {
                _super.call(this, offset, isResultBool);

                this.balanceDone = false;

                // for debugging
                //this.balanceDone = true;
                this.precedence = precedence;
                this.proxy = null;
            }
            GenericOp.prototype.setProxy = function (other) {
                this.proxy = other;
            };

            GenericOp.prototype.validateOp = function (v) {
                // do nothing
            };

            GenericOp.prototype.printOp = function (p) {
                // do nothing
            };

            GenericOp.prototype.printAsConditionOp = function (p) {
                _super.prototype.printAsCondition.call(this, p);
            };

            GenericOp.prototype.validate = function (v) {
                /*
                * As validation should only occur once,
                * this condition should never be reached.
                *
                * It's here to allow a repeated call, by disabling the proxy,
                * to remove a 'cyclic loop' in the tree.
                */
                if (this.proxy !== null) {
                    var proxy = this.proxy;
                    this.proxy = null;

                    proxy.validate(v);

                    this.proxy = proxy;
                } else if (this.balanceDone) {
                    this.validateOp(v);
                } else {
                    var self = this.rebalance();

                    /*
                    * the proxy causes a cyclic loop, so we validate the
                    * new item above us, so it will in turn validate this Op.
                    */
                    if (self !== this) {
                        self.validate(v);

                        this.proxy = self;
                    } else {
                        this.validateOp(v);
                    }
                }
            };

            GenericOp.prototype.print = function (p) {
                if (this.proxy !== null) {
                    var proxy = this.proxy;
                    this.proxy = null;

                    proxy.print(p);

                    this.proxy = proxy;
                } else {
                    this.printOp(p);
                }
            };

            GenericOp.prototype.printAsCondition = function (p) {
                this.printAsConditionOp(p);
            };

            GenericOp.prototype.getPrecedence = function () {
                return this.precedence;
            };

            GenericOp.prototype.testSwap = function (other) {
                if (other instanceof GenericOp) {
                    var precedence = other.getPrecedence();

                    if (precedence !== undefined) {
                        return this.precedence < precedence;
                    }
                }

                return false;
            };

            GenericOp.prototype.isBalanced = function () {
                return this.balanceDone;
            };

            GenericOp.prototype.rebalance = function () {
                if (this.balanceDone) {
                    return this;
                } else {
                    this.balanceDone = true;
                    return this.onRebalance();
                }
            };

            GenericOp.prototype.swapExpr = function (other) {
                throw new Error("swapExpr is not implemented");
            };

            GenericOp.prototype.onRebalance = function () {
                throw new Error("onRebalance is not implemented");
            };
            return GenericOp;
        })(Expr);
        ast.GenericOp = GenericOp;

        /*
        * All single operations have precedence of 1.
        */
        var SingleOp = (function (_super) {
            __extends(SingleOp, _super);
            function SingleOp(expr, strOp, isResultBool) {
                _super.call(this, expr.offset, isResultBool, 1);

                this.expr = expr;
                this.strOp = strOp;
            }
            SingleOp.prototype.getExpr = function () {
                return this.expr;
            };

            SingleOp.prototype.validateOp = function (v) {
                this.expr.validate(v);
            };

            SingleOp.prototype.printOp = function (p) {
                p.append('(', this.strOp, ' ');
                this.expr.print(p);
                p.append(' )');
            };

            SingleOp.prototype.swapExpr = function (other) {
                var temp = this.expr;
                this.expr = other;
                return temp;
            };

            SingleOp.prototype.onRebalance = function () {
                // swap if expr has higher precedence then this
                var expr = this.expr;

                if (expr instanceof GenericOp) {
                    expr = expr.rebalance();
                }

                // todo
                if (this.testSwap(expr)) {
                    this.expr = expr.swapExpr(this);

                    return expr;
                } else {
                    this.expr = expr;

                    return this;
                }
            };
            return SingleOp;
        })(GenericOp);
        ast.SingleOp = SingleOp;

        var SingleSub = (function (_super) {
            __extends(SingleSub, _super);
            function SingleSub(expr) {
                _super.call(this, expr, "-", false);
            }
            return SingleSub;
        })(SingleOp);
        ast.SingleSub = SingleSub;

        var Not = (function (_super) {
            __extends(Not, _super);
            function Not(expr) {
                _super.call(this, expr, "!", true);
            }
            Not.prototype.printOp = function (p) {
                var temp = p.getTempVariable();

                p.appendPre('var ', temp, ';');

                p.append('(((', temp, '=');
                this.getExpr().print(p);
                p.append(') === null || ', temp, ' === false) ? true : false)');

                // needed to prevent memory leaks
                p.appendPost('delete ', temp, ';');
            };
            return Not;
        })(SingleOp);
        ast.Not = Not;

        /**
        * 0 is the tightest, most binding precendence, often
        * known as the 'highest precedence'.
        *
        * Higher numbers lower the priority of the precedence.
        * For example * binds tighter than +, so you might
        * assign the precedences:
        *
        *      + -> 3
        *      * -> 4
        *
        * ... giving * a higher precedence than +.
        *
        * @param left
        * @param right
        * @param strOp
        * @param isResultBool
        * @param precedence Lower is higher, must be a number.
        */
        var Op = (function (_super) {
            __extends(Op, _super);
            function Op(left, right, strOp, isResultBool, precedence, bracketSurround) {
                if (typeof bracketSurround === "undefined") { bracketSurround = true; }
                var offset = left ? left.offset : null;

                if (precedence === undefined) {
                    throw new Error("undefined precedence given.");
                }

                _super.call(this, offset, isResultBool, precedence);

                this.left = left;
                this.right = right;

                this.strOp = strOp;

                this.bracketSurround = bracketSurround;
            }
            Op.prototype.getLeft = function () {
                return this.left;
            };

            Op.prototype.getRight = function () {
                return this.right;
            };

            Op.prototype.printOp = function (p) {
                var bracket = quby.compilation.hints.doubleBracketOps();

                if (this.bracketSurround) {
                    if (bracket) {
                        p.append('((');
                    } else {
                        p.append('(');
                    }
                } else if (bracket) {
                    p.append('(');
                }

                this.left.print(p);

                if (bracket) {
                    p.append(')');
                }

                p.append(this.strOp);

                if (bracket) {
                    p.append('(');
                }
                this.right.print(p);

                if (this.bracketSurround) {
                    if (bracket) {
                        p.append('))');
                    } else {
                        p.append(')');
                    }
                } else if (bracket) {
                    p.append(')');
                }
            };

            Op.prototype.validateOp = function (v) {
                this.right.validate(v);
                this.left.validate(v);
            };

            Op.prototype.swapExpr = function (other) {
                var left = this.left;
                this.left = other;
                return left;
            };

            Op.prototype.onRebalance = function () {
                var right = this.right;

                if (right instanceof GenericOp) {
                    right = right.rebalance();

                    if (right instanceof GenericOp) {
                        /*
                        * Either we swap with right,
                        * in which a replacement will be returned.
                        */
                        if (this.testSwap(right)) {
                            this.right = right.swapExpr(this);

                            return right;
                            /*
                            * Or no swapping should take place.
                            */
                        } else {
                            this.right = right;
                        }
                    } else {
                        this.right = right;
                    }
                }

                return this;
            };

            Op.prototype.appendLeft = function (left) {
                if (this.left !== null) {
                    if (this.left["appendLeft"] !== undefined) {
                        this.left["appendLeft"](left);
                    }
                } else if (left) {
                    this.setOffset(left.offset);
                    this.left = left;
                }

                return this;
            };
            return Op;
        })(GenericOp);
        ast.Op = Op;

        /**
        * Most of the operators just extend quby.syntax.Op,
        * without adding anything to it.
        *
        * This is a helper function to make that shorthand.
        *
        * @param {string} symbol The JS string symbol for when this operator is printed.
        * @param {number} precedence The precendence for this operator.
        * @param isResultBool Optional, true if the result is a boolean, otherwise it defaults to false.
        */
        function newShortOp(symbol, precedence, isResultBool) {
            return function (left, right) {
                return new Op(left, right, symbol, isResultBool, precedence);
            };
        }

        /*
        * These are in order of precedence,
        * numbers and order taken from: http://en.wikipedia.org/wiki/Order_of_operations
        *
        * Lower is higher!
        */
        /* Shifting Operations */
        ast.ShiftLeft = newShortOp("<<", 5, false);
        ast.ShiftRight = newShortOp(">>", 5, false);

        /* Greater/Less Comparison */
        ast.LessThan = newShortOp("<", 6, true);
        ast.LessThanEqual = newShortOp("<=", 6, true);
        ast.GreaterThan = newShortOp(">", 6, true);
        ast.GreaterThanEqual = newShortOp(">=", 6, true);

        /**
        * The JS version of 'instanceof', used as:
        *
        *  if ( a #instanceof #Foo ) {
        */
        var JSInstanceOf = (function (_super) {
            __extends(JSInstanceOf, _super);
            function JSInstanceOf(left, right) {
                _super.call(this, left, right, 'instanceof', true, 7);

                this.setJSLiteral(true);
            }
            JSInstanceOf.prototype.validateOp = function (v) {
                if (v.ensureAdminMode(this, "JS instanceof is not allowed in Sandbox mode")) {
                    _super.prototype.validateOp.call(this, v);
                }
            };
            return JSInstanceOf;
        })(Op);
        ast.JSInstanceOf = JSInstanceOf;

        var JSTypeOf = (function (_super) {
            __extends(JSTypeOf, _super);
            function JSTypeOf(right) {
                _super.call(this, right, "typeof", false);

                this.setJSLiteral(true);
            }
            JSTypeOf.prototype.validateOp = function (v) {
                if (v.ensureAdminMode(this, "JS typeof is not allowed in Sandbox mode")) {
                    _super.prototype.validateOp.call(this, v);
                }
            };
            return JSTypeOf;
        })(SingleOp);
        ast.JSTypeOf = JSTypeOf;

        /* Equality Comparison */
        ast.Equality = newShortOp("==", 8, true);
        ast.NotEquality = newShortOp("!=", 8, true);

        /* Bit Functions */
        ast.BitAnd = newShortOp('&', 9, false);
        ast.BitOr = newShortOp('|', 9, false);

        var BoolOp = (function (_super) {
            __extends(BoolOp, _super);
            function BoolOp(left, right, syntax, precedence) {
                _super.call(this, left, right, syntax, false, precedence);

                this.useSuperPrint = false;
            }
            /**
            * Temporarily swap to the old print, then print as a condition,
            * then swap back.
            */
            BoolOp.prototype.printOp = function (p) {
                if (this.useSuperPrint) {
                    _super.prototype.printOp.call(this, p);
                } else {
                    this.useSuperPrint = true;
                    this.printAsCondition(p);
                    this.useSuperPrint = false;
                }
            };
            return BoolOp;
        })(Op);
        ast.BoolOp = BoolOp;

        var BoolOr = (function (_super) {
            __extends(BoolOr, _super);
            function BoolOr(left, right) {
                _super.call(this, left, right, '||', 12);
            }
            BoolOr.prototype.printOp = function (p) {
                var temp = p.getTempVariable();

                p.appendPre('var ', temp, ';');

                p.append('(((', temp, '=');
                this.getLeft().print(p);
                p.append(') === null || ', temp, ' === false) ? (');
                this.getRight().print(p);
                p.append(') : ', temp, ')');

                // needed to prevent memory leaks
                p.appendPost('delete ', temp, ';');
            };
            return BoolOr;
        })(BoolOp);
        ast.BoolOr = BoolOr;

        var BoolAnd = (function (_super) {
            __extends(BoolAnd, _super);
            function BoolAnd(left, right) {
                _super.call(this, left, right, '&&', 11);
            }
            BoolAnd.prototype.printOp = function (p) {
                var temp = p.getTempVariable();

                p.appendPre('var ', temp, ';');

                p.append('(((', temp, '=');
                this.getLeft().print(p);
                p.append(') === null || ', temp, ' === false) ? ', temp, ' : (');
                this.getRight().print(p);
                p.append('))');

                // needed to prevent memory leaks
                p.appendPost('delete ', temp, ';');
            };
            return BoolAnd;
        })(BoolOp);
        ast.BoolAnd = BoolAnd;

        /* ### Maths ### */
        ast.Divide = newShortOp("/", 3, false);
        ast.Mult = newShortOp("*", 3, false);
        ast.Mod = newShortOp("%", 3, false);
        ast.Add = newShortOp("+", 4, false);
        ast.Sub = newShortOp("-", 4, false);

        var Power = (function (_super) {
            __extends(Power, _super);
            function Power(left, right) {
                _super.call(this, left, right, "**", false, 2);
            }
            Power.prototype.printOp = function (p) {
                p.append('Math.pow(');
                this.getLeft().print(p);
                p.append(',');
                this.getRight().print(p);
                p.append(')');
            };
            return Power;
        })(Op);
        ast.Power = Power;

        /*
        * ### Assignments ###
        */
        /*
        * Has the highest precedence, giving it the lowest priority.
        */
        var Mapping = (function (_super) {
            __extends(Mapping, _super);
            function Mapping(left, right) {
                _super.call(this, left, right, ',', false, 100, false);
            }
            return Mapping;
        })(Op);
        ast.Mapping = Mapping;

        var JSMapping = (function (_super) {
            __extends(JSMapping, _super);
            function JSMapping(left, right) {
                _super.call(this, left, right, ':', false, 100, false);
            }
            return JSMapping;
        })(Op);
        ast.JSMapping = JSMapping;

        var Assignment = (function (_super) {
            __extends(Assignment, _super);
            function Assignment(left, right) {
                _super.call(this, left, right, '=', false, 14);

                this.isCollectionAssignment = false;
            }
            Assignment.prototype.setCollectionMode = function () {
                this.isCollectionAssignment = true;
            };

            Assignment.prototype.validateOp = function (v) {
                var left = this.getLeft();

                if (left["setAssignment"] === undefined) {
                    v.parseError(left.getOffset() || this.getOffset(), "Illegal assignment");
                } else {
                    left.setAssignment(v, this);

                    _super.prototype.validateOp.call(this, v);
                }
            };

            Assignment.prototype.printOp = function (p) {
                if (this.isCollectionAssignment) {
                    p.append("quby_setCollection(");
                    this.getLeft().print(p);
                    p.append(",");
                    this.getRight().print(p);
                    p.append(")");
                } else {
                    this.getLeft().print(p);
                    p.append("=");
                    this.getRight().print(p);
                }
            };
            return Assignment;
        })(Op);
        ast.Assignment = Assignment;

        /**
        * The super class for 'all' types of variables.
        * These include globals, fields, locals, and even 'this'!.
        */
        var Variable = (function (_super) {
            __extends(Variable, _super);
            function Variable(identifier, callName) {
                _super.call(this, identifier, identifier.getMatch(), callName);

                this.isAssignmentFlag = false;
            }
            Variable.prototype.isAssignment = function () {
                return this.isAssignmentFlag;
            };

            Variable.prototype.print = function (p) {
                p.append(this.getCallName());
            };

            Variable.prototype.setAssignment = function (v, parent) {
                this.isAssignmentFlag = true;
            };
            return Variable;
        })(NamedExpr);
        ast.Variable = Variable;

        /*
        * ### Variables ###
        */
        var LocalVariable = (function (_super) {
            __extends(LocalVariable, _super);
            function LocalVariable(identifier) {
                _super.call(this, identifier, quby.runtime.formatVar(identifier.getMatch()));

                this.useVar = false;
            }
            LocalVariable.prototype.validate = function (v) {
                // assigning to this variable
                if (this.isAssignment()) {
                    v.assignVar(this);

                    // blocks can alter local variables, allowing var prevents this.
                    this.useVar = !v.isInsideBlock();
                    // used as a parameter
                } else if (v.isInsideParameters()) {
                    // it presumes scope has already been pushed by the function it's within
                    if (v.containsLocalVar(this)) {
                        v.parseError(this.offset, "parameter variable name used multiple times '" + this.getName() + "'");
                    }

                    v.assignVar(this);
                    // read from this, as non-parameter
                } else if (!this.isJSLiteral() && !v.containsVar(this)) {
                    v.parseError(this.offset, "variable used before it's assigned to '" + this.getName() + "'");
                }
            };

            /**
            * When called, this will not validate that this
            * variable really does exist. Instead it will
            * presume it exists, with no check done at compile time.
            */
            LocalVariable.prototype.print = function (p) {
                if (this.isAssignment() && this.useVar) {
                    p.append('var ');
                }

                _super.prototype.print.call(this, p);
            };
            return LocalVariable;
        })(Variable);
        ast.LocalVariable = LocalVariable;

        var GlobalVariable = (function (_super) {
            __extends(GlobalVariable, _super);
            function GlobalVariable(identifier) {
                _super.call(this, identifier, quby.runtime.formatGlobal(identifier.getMatch()));
            }
            GlobalVariable.prototype.print = function (p) {
                if (this.isAssignment) {
                    _super.prototype.print.call(this, p);
                } else {
                    p.append('quby_checkGlobal(', this.getCallName(), ',\'', this.getName(), '\')');
                }
            };

            GlobalVariable.prototype.validate = function (v) {
                var name = this.getName();

                if (this.isAssignment) {
                    // check if the name is blank, i.e. $
                    if (name.length === 0) {
                        v.parseError(this.offset, "Global variable name is blank");
                    } else {
                        v.assignGlobal(this);
                    }
                } else {
                    if (v.ensureOutFunParameters(this, "global variable '" + name + "' used as function parameter") && v.ensureOutParameters(this, "global variable '" + name + "' used as block parameter")) {
                        v.useGlobal(this);
                    }
                }
            };
            return GlobalVariable;
        })(Variable);
        ast.GlobalVariable = GlobalVariable;

        var ParameterBlockVariable = (function (_super) {
            __extends(ParameterBlockVariable, _super);
            function ParameterBlockVariable(identifier) {
                _super.call(this, identifier);
            }
            ParameterBlockVariable.prototype.validate = function (v) {
                v.ensureInFunParameters(this, "Block parameters must be defined within a functions parameters.");

                _super.prototype.validate.call(this, v);
            };
            return ParameterBlockVariable;
        })(LocalVariable);
        ast.ParameterBlockVariable = ParameterBlockVariable;

        var FieldVariable = (function (_super) {
            __extends(FieldVariable, _super);
            function FieldVariable(identifier) {
                _super.call(this, identifier, identifier.chompLeft(1));

                this.klass = null;
                this.isInsideExtensionClass = false;
            }
            FieldVariable.prototype.validate = function (v) {
                var name = this.getName();

                if (v.ensureOutFunParameters(this, "class field '" + name + "' used as function parameter.") && v.ensureOutParameters(this, "object field '" + name + "' used as block parameter") && v.ensureInClass(this, "field '" + name + "' is used outside of a class, they can only be used inside.") && v.ensureInMethod(this, "class field '" + name + "' is used outside of a method.")) {
                    var klass = v.getCurrentClass().getClass();
                    this.klass = klass;

                    // set the correct field callName
                    this.setCallName(quby.runtime.formatField(klass.getName(), name));

                    if (name.length === 0) {
                        v.parseError(this.offset, "no name provided for field of class " + klass.getName());
                    } else {
                        this.isInsideExtensionClass = v.isInsideExtensionClass();

                        this.validateField(v);
                    }
                }
            };

            FieldVariable.prototype.validateField = function (v) {
                if (this.isAssignment) {
                    v.assignField(this);
                } else {
                    v.useField(this);
                }
            };

            FieldVariable.prototype.print = function (p) {
                if (this.klass) {
                    var callName = this.getCallName();

                    if (this.isAssignment) {
                        p.append(quby.runtime.getThisVariable(this.isInsideExtensionClass), '.', callName);
                    } else {
                        var strName = this.getName() + quby.runtime.FIELD_NAME_SEPERATOR + this.klass.getName();

                        // this is about doing essentially either:
                        //     ( this.field == undefined ? error('my_field') : this.field )
                        //  ... or ...
                        //     getField( this.field, 'my_field' );
                        var thisVar = quby.runtime.getThisVariable(this.isInsideExtensionClass);
                        if (quby.compilation.hints.useInlinedGetField()) {
                            p.append('(', thisVar, ".", callName, '===undefined?quby.runtime.fieldNotFoundError(' + thisVar + ',"', strName, '"):', thisVar, ".", callName, ')');
                        } else {
                            p.append("quby_getField(", thisVar, ".", callName, ',', thisVar, ",'", strName, "')");
                        }
                    }
                }
            };
            return FieldVariable;
        })(Variable);
        ast.FieldVariable = FieldVariable;

        var ThisVariable = (function (_super) {
            __extends(ThisVariable, _super);
            function ThisVariable(sym) {
                _super.call(this, sym);

                this.isInsideExtensionClass = false;
            }
            ThisVariable.prototype.validate = function (v) {
                if (v.ensureOutFunParameters(this, "'this' used as function parameter") && v.ensureOutParameters(this, "'this' used as a block parameter")) {
                    v.ensureInMethod(this, "'this' is referenced outside of a class method (or you've named a variable 'this')");
                }

                this.isInsideExtensionClass = v.isInsideExtensionClass();
            };

            ThisVariable.prototype.print = function (p) {
                p.append(quby.runtime.getThisVariable(this.isInsideExtensionClass));
            };

            ThisVariable.prototype.setAssignment = function (v) {
                v.parseError(this.getOffset(), "cannot assign a value to 'this'");
            };
            return ThisVariable;
        })(Syntax);
        ast.ThisVariable = ThisVariable;

        var JSVariable = (function (_super) {
            __extends(JSVariable, _super);
            function JSVariable(identifier) {
                _super.call(this, identifier);

                this.setCallName(identifier.getMatch());
                this.setJSLiteral(true);
            }
            JSVariable.prototype.validate = function (v) {
                if (v.ensureOutBlock(this, "JS variable used as block parameter") && v.ensureAdminMode(this, "inlining JS values not allowed in sandboxed mode")) {
                    _super.prototype.validate.call(this, v);
                }
            };
            return JSVariable;
        })(LocalVariable);
        ast.JSVariable = JSVariable;

        /*
        * ### Arrays ###
        */
        var ArrayAccess = (function (_super) {
            __extends(ArrayAccess, _super);
            function ArrayAccess(array, index) {
                var offset = array !== null ? array.offset : null;

                _super.call(this, offset);

                this.array = array;
                this.index = index;

                this.isAssignment = false;
            }
            ArrayAccess.prototype.print = function (p) {
                if (this.isAssignment) {
                    this.array.print(p);
                    p.append(',');
                    this.index.print(p);
                } else {
                    p.append('quby_getCollection(');
                    this.array.print(p);
                    p.append(',');
                    this.index.print(p);
                    p.append(')');
                }
            };

            ArrayAccess.prototype.validate = function (v) {
                this.index.validate(v);
                this.array.validate(v);
            };

            ArrayAccess.prototype.appendLeft = function (array) {
                if (this.array !== null) {
                    if (this.array['appendLeft'] !== undefined) {
                        this.array['appendLeft'](array);
                    }
                } else if (array) {
                    this.setOffset(array.offset);
                    this.array = array;
                }

                return this;
            };

            ArrayAccess.prototype.setAssignment = function (v, parentAss) {
                this.isAssignment = true;

                parentAss.setCollectionMode();
            };
            return ArrayAccess;
        })(Expr);
        ast.ArrayAccess = ArrayAccess;

        /**
        * Complex Literal is the super class for 'complex'
        * data structures, namely arrays, hashes, and
        * JS objects.
        *
        * Essentially any object, that holds a list of
        * expressions, when defined.
        */
        var ComplexLiteral = (function (_super) {
            __extends(ComplexLiteral, _super);
            function ComplexLiteral(pre, parameters, post) {
                var offset;
                if (parameters !== null) {
                    offset = parameters.offset;
                } else {
                    parameters = null;
                    offset = null;
                }

                _super.call(this, offset);

                this.parameters = parameters;

                this.pre = pre;
                this.post = post;
            }
            ComplexLiteral.prototype.getParameters = function () {
                return this.parameters;
            };

            ComplexLiteral.prototype.print = function (p) {
                p.append(this.pre);

                if (this.parameters !== null) {
                    this.parameters.print(p);
                }

                p.append(this.post);
            };

            ComplexLiteral.prototype.validate = function (v) {
                if (this.parameters !== null) {
                    this.parameters.validate(v);
                }
            };
            return ComplexLiteral;
        })(Syntax);
        ast.ComplexLiteral = ComplexLiteral;

        var ArrayLiteral = (function (_super) {
            __extends(ArrayLiteral, _super);
            function ArrayLiteral(params) {
                _super.call(this, '(new QubyArray([', params, ']))');
            }
            return ArrayLiteral;
        })(ComplexLiteral);
        ast.ArrayLiteral = ArrayLiteral;

        var HashLiteral = (function (_super) {
            __extends(HashLiteral, _super);
            function HashLiteral(parameters) {
                _super.call(this, '(new QubyHash(', parameters, '))');
            }
            return HashLiteral;
        })(ComplexLiteral);
        ast.HashLiteral = HashLiteral;

        var JSArrayLiteral = (function (_super) {
            __extends(JSArrayLiteral, _super);
            function JSArrayLiteral(params) {
                _super.call(this, '([', params, '])');
            }
            JSArrayLiteral.prototype.validate = function (v) {
                v.ensureAdminMode(this, "cannot create JS array literals outside of admin mode");
                _super.prototype.validate.call(this, v);
            };
            return JSArrayLiteral;
        })(ComplexLiteral);
        ast.JSArrayLiteral = JSArrayLiteral;

        var JSObjectLiteral = (function (_super) {
            __extends(JSObjectLiteral, _super);
            function JSObjectLiteral(parameters) {
                _super.call(this, '({', parameters, '})');
            }
            return JSObjectLiteral;
        })(ComplexLiteral);
        ast.JSObjectLiteral = JSObjectLiteral;

        /* Literals */
        var Literal = (function (_super) {
            __extends(Literal, _super);
            function Literal(sym, isTrue, altMatch) {
                this.match = altMatch ? altMatch : sym.getMatch();

                _super.call(this, sym);

                this.isTrue = isTrue;
            }
            Literal.prototype.setMatch = function (newMatch) {
                this.match = newMatch;
            };

            Literal.prototype.getMatch = function () {
                return this.match;
            };

            Literal.prototype.validate = function (v) {
                // do nothing
            };

            Literal.prototype.print = function (p) {
                p.append(this.match);
            };

            /**
            * If this literal evaluates to true, then 'true' is printed.
            * Otherwise 'false'.
            */
            Literal.prototype.printAsCondition = function (p) {
                if (this.isTrue) {
                    p.append('true');
                } else {
                    p.append('false');
                }
            };
            return Literal;
        })(Expr);
        ast.Literal = Literal;

        var Symbol = (function (_super) {
            __extends(Symbol, _super);
            function Symbol(sym) {
                _super.call(this, sym, true);

                this.callName = quby.runtime.formatSymbol(sym.getMatch());
            }
            Symbol.prototype.getName = function () {
                return this.getMatch();
            };

            Symbol.prototype.getCallName = function () {
                return this.callName;
            };

            Symbol.prototype.validate = function (v) {
                v.addSymbol(this);
            };
            return Symbol;
        })(Literal);
        ast.Symbol = Symbol;

        var Number = (function (_super) {
            __extends(Number, _super);
            function Number(sym) {
                var match = sym.getMatch();

                _super.call(this, sym, true, match);
            }
            Number.prototype.validate = function (v) {
                // a bunch of flags to describe the number
                // store the number as a string, and it's replacement
                var numStr = this.getMatch();

                // stuff for iteration
                var numLen = numStr.length;
                var code = numStr.charCodeAt(0);
                var secondCode = numStr.charCodeAt(1);

                // skip for well known numbers like 0
                // currently this is only numbers 0 to 9
                if (numLen === 1 && code >= ZERO && code <= NINE) {
                    return;
                }

                /*
                * 0x - Hexadecimal
                */
                if (code === ZERO && secondCode === LOWER_X) {
                    var hasMore = false;

                    for (var i = 2; i < numLen; i++) {
                        code = numStr.charCodeAt(i);

                        if (code === FULL_STOP) {
                            v.parseError(this.getOffset(), "Invalid hexadecimal number, cannot include a decimal point '" + numStr + "'");
                            return;
                        } else if (code !== UNDERSCORE) {
                            if ((code < ZERO || NINE < code) && (code < LOWER_A || LOWER_F < code)) {
                                v.parseError(this.getOffset(), "Invalid hexadecimal number, '" + numStr + "'");
                                return;
                            }

                            hasMore = true;
                        }
                    }

                    if (!hasMore) {
                        v.parseError(this.getOffset(), "Invalid hexadecimal number, missing rest of the number '" + numStr + "'");
                        return;
                    } else {
                        errorIfIntSizeUnsafe(v, this, numStr | 0);
                    }
                } else if (code === ZERO && secondCode === LOWER_B) {
                    for (var i = 2; i < numLen; i++) {
                        code = numStr.charCodeAt(i);

                        if (code === FULL_STOP) {
                            v.parseError(this.getOffset(), "Invalid binary number, cannot include a decimal point '" + numStr + "'");
                            return;
                        } else if (code !== UNDERSCORE) {
                            if (code !== ZERO && code !== ONE) {
                                v.parseError(this.getOffset(), "Invalid binary number, '" + numStr + "'");
                                return;
                            }

                            hasMore = true;
                        }
                    }

                    if (!hasMore) {
                        v.parseError(this.getOffset(), "Invalid binary number, missing rest of the number '" + numStr + "'");
                        return;
                    } else {
                        // lose the '0b' section at the start
                        // then parse as a base 2 (binary) number
                        // test it's valid
                        // then set as it's base 10 value, as JS does not support binary numbers
                        var newNum = parseInt(numStr.substring(2), 2);
                        errorIfIntSizeUnsafe(v, this, newNum);
                        this.setMatch(newNum.toString());
                    }
                    /*
                    * regular base 10 number
                    */
                } else {
                    var isDecimal = false;

                    for (var i = 0; i < numLen; i++) {
                        code = numStr.charCodeAt(i);

                        // check for a decimal place,
                        // and a double decimal stop (which should never happen, but just to be safe)
                        if (code === FULL_STOP) {
                            if (isDecimal) {
                                v.parseError(this.getOffset(), "Number has two decimal places '" + numStr + "'");
                                return;
                            } else {
                                isDecimal = true;
                            }
                            // look for numbers outside of the 0 to 9 range
                        } else if (code < ZERO || NINE < code) {
                            v.parseError(this.getOffset(), "Invalid decimal number, '" + numStr + "'");
                            return;
                        }
                    }

                    // number size verification
                    if (!isDecimal) {
                        errorIfIntSizeUnsafe(v, this, numStr | 0);
                    }
                }
            };
            return Number;
        })(Literal);
        ast.Number = Number;

        var String = (function (_super) {
            __extends(String, _super);
            function String(sym) {
                // escape the \n's
                _super.call(this, sym, true, sym.getMatch().replace(/\n/g, "\\n"));
            }
            return String;
        })(Literal);
        ast.String = String;

        var BoolTrue = (function (_super) {
            __extends(BoolTrue, _super);
            function BoolTrue(sym) {
                _super.call(this, sym, true, 'true');
            }
            return BoolTrue;
        })(Literal);
        ast.BoolTrue = BoolTrue;

        var BoolFalse = (function (_super) {
            __extends(BoolFalse, _super);
            function BoolFalse(sym) {
                _super.call(this, sym, false, 'false');
            }
            return BoolFalse;
        })(Literal);
        ast.BoolFalse = BoolFalse;

        var Null = (function (_super) {
            __extends(Null, _super);
            function Null(sym) {
                _super.call(this, sym, false, 'null');
            }
            return Null;
        })(Literal);
        ast.Null = Null;

        var JSLiteral = (function (_super) {
            __extends(JSLiteral, _super);
            function JSLiteral(sym, str) {
                _super.call(this, sym, false, str);
            }
            JSLiteral.prototype.validate = function (v) {
                if (v.ensureAdminMode(this, "JS literals cannot be used outside of sandbox mode")) {
                    _super.prototype.validate.call(this, v);
                }
            };
            return JSLiteral;
        })(Literal);
        ast.JSLiteral = JSLiteral;

        var JSUndefined = (function (_super) {
            __extends(JSUndefined, _super);
            function JSUndefined(sym) {
                _super.call(this, sym, 'undefined');
            }
            return JSUndefined;
        })(JSLiteral);
        ast.JSUndefined = JSUndefined;

        var JSNull = (function (_super) {
            __extends(JSNull, _super);
            function JSNull(sym) {
                _super.call(this, sym, 'null');
            }
            return JSNull;
        })(JSLiteral);
        ast.JSNull = JSNull;

        /*
        * = Function Generating Stuff =
        */
        /**
        * The base FunctionGenerator prototype. This does basic checks to ensure
        * the function we want to create actually exists.
        *
        * It handles storing common items.
        */
        var FunctionGenerator = (function () {
            function FunctionGenerator(obj, methodName, numParams) {
                this.offset = obj.offset;

                this.klass = null;

                this.modifierName = obj.getName();

                this.isGenerator = true;

                this.name = methodName;
                this.numParams = numParams;

                this.callName = quby.runtime.formatFun(methodName, numParams);

                this.isJSLiteralFlag = false;

                this.isValid = true;
            }
            FunctionGenerator.prototype.hasDeclarationError = function () {
                return this.isValid;
            };

            FunctionGenerator.prototype.isJSLiteral = function () {
                return this.isJSLiteralFlag;
            };

            FunctionGenerator.prototype.setJSLiteral = function (isLit) {
                this.isJSLiteralFlag = isLit;
            };

            FunctionGenerator.prototype.isConstructor = function () {
                return false;
            };

            FunctionGenerator.prototype.isMethod = function () {
                return false;
            };

            FunctionGenerator.prototype.isFunction = function () {
                return true;
            };

            FunctionGenerator.prototype.getOffset = function () {
                return this.offset;
            };

            FunctionGenerator.prototype.getClassValidator = function () {
                return this.klass;
            };

            FunctionGenerator.prototype.getCallName = function () {
                return this.callName;
            };

            FunctionGenerator.prototype.getName = function () {
                return this.name;
            };

            FunctionGenerator.prototype.getModifier = function () {
                return this.modifierName;
            };

            FunctionGenerator.prototype.setInvalid = function () {
                this.isValid = false;
            };

            /* This validation code relies on the fact that when a function
            * is defined on a class, it becomes the current function for that
            * callname, regardless of if it's a diplicate function or not.
            */
            FunctionGenerator.prototype.validate = function (v) {
                var _this = this;
                this.klass = v.getCurrentClass();

                // checks for duplicate before this get
                if (this.validateNameClash(v)) {
                    v.defineFun(this);
                    v.pushFunScope(this);

                    this.validateInside(v);

                    v.popScope();

                    v.onEndValidate(function (v) {
                        return _this.onEndValidate(v);
                    });
                } else {
                    this.isValid = false;
                }
            };

            FunctionGenerator.prototype.print = function (p) {
            };

            FunctionGenerator.prototype.getNumParameters = function () {
                return this.numParams;
            };

            FunctionGenerator.prototype.onEndValidate = function (v) {
                this.validateNameClash(v);
            };

            FunctionGenerator.prototype.validateInside = function (v) {
                // do nothing
            };

            FunctionGenerator.prototype.validateNameClash = function (v) {
                var currentFun = this.klass.getFun(this.callName);

                if (currentFun !== null && currentFun !== this) {
                    // Give an error message depending on if we are
                    // dealing with a colliding modifier or function.
                    var errMsg = (currentFun instanceof FunctionGenerator) ? "'" + this.modifierName + "' modifier in class '" + this.klass.getClass().getName() + "' clashes with modifier '" + currentFun.getModifier() + '", for generating: "' + this.name + '" method' : "'" + this.modifierName + "' modifier in class '" + this.klass.getClass().getName() + "' clashes with defined method: '" + this.name + '"';

                    v.parseError(this.offset, errMsg);

                    this.isValid = false;

                    return false;
                } else {
                    return true;
                }
            };
            return FunctionGenerator;
        })();

        var FunctionAttrGenerator = (function (_super) {
            __extends(FunctionAttrGenerator, _super);
            function FunctionAttrGenerator(obj, methodName, numParams, fieldObj, proto) {
                var fieldName;
                if (fieldObj instanceof LocalVariable || fieldObj instanceof FieldVariable) {
                    fieldName = fieldObj.getName();
                } else if (fieldObj instanceof Symbol) {
                    fieldName = fieldObj.getMatch();
                } else {
                    fieldName = null;
                }

                var fullName = fieldName ? (methodName + util.str.capitalize(fieldName)) : methodName;

                // doesn't matter if fieldName is null for this, as it will be invalid laterz
                _super.call(this, obj, fullName, numParams);

                this.proto = proto;

                // the name of our field, null if invalid
                this.fieldName = fieldName;
                this.fieldObj = fieldObj;

                // this is our fake field
                this.field = new this.proto(this.offset.clone(this.fieldName));
            }
            FunctionAttrGenerator.prototype.withField = function (callback) {
                if (this.field !== null) {
                    callback(this.field);
                }
            };

            FunctionAttrGenerator.prototype.validate = function (v) {
                if (this.fieldName !== null) {
                    _super.prototype.validate.call(this, v);
                } else {
                    v.parseError(this.fieldObj.offset, " Invalid parameter for generating '" + this.getName() + "' method");
                    this.setInvalid();
                }
            };

            FunctionAttrGenerator.prototype.validateInside = function (v) {
                this.field.validate(v);
            };
            return FunctionAttrGenerator;
        })(FunctionGenerator);

        var FunctionReadGeneratorFieldVariable = (function (_super) {
            __extends(FunctionReadGeneratorFieldVariable, _super);
            function FunctionReadGeneratorFieldVariable(sym) {
                _super.call(this, sym);
            }
            FunctionReadGeneratorFieldVariable.prototype.validateField = function (v) {
            };
            return FunctionReadGeneratorFieldVariable;
        })(FieldVariable);

        var FunctionReadGenerator = (function (_super) {
            __extends(FunctionReadGenerator, _super);
            function FunctionReadGenerator(obj, methodPrefix, field) {
                _super.call(this, obj, methodPrefix, 0, field, FunctionReadGeneratorFieldVariable);
            }
            FunctionReadGenerator.prototype.onEndValidate = function (v) {
                var _this = this;
                _super.prototype.onEndValidate.call(this, v);

                this.withField(function (field) {
                    var klass = _this.getClassValidator();

                    if (!klass.hasFieldCallName(field.getCallName())) {
                        v.parseError(_this.offset, "field '" + field.getName() + "' never written to in class '" + klass.getClass().getName() + "' for generating method " + _this.getName());
                        _this.setInvalid();
                    }
                });
            };

            /*
            * This will be a method.
            */
            FunctionReadGenerator.prototype.print = function (p) {
                var _this = this;
                this.withField(function (field) {
                    p.append(_this.callName, '=function(){return ');
                    field.print(p);
                    p.append(';}');
                });
            };
            return FunctionReadGenerator;
        })(FunctionAttrGenerator);

        var FunctionWriteGenerator = (function (_super) {
            __extends(FunctionWriteGenerator, _super);
            function FunctionWriteGenerator(obj, methodPrefix, field) {
                _super.call(this, obj, methodPrefix, 1, field, FieldVariable);

                this.withField(function (field) {
                    return field.setAssignment();
                });
            }
            FunctionWriteGenerator.prototype.onEndValidate = function (v) {
                var _this = this;
                _super.prototype.onEndValidate.call(this, v);

                this.withField(function (field) {
                    if (!_this.getClassValidator().hasFieldCallName(field.getCallName())) {
                        v.parseError(_this.offset, "field '" + field.getName() + "' never written to in class '" + _this.getClassValidator().getClass().getName() + "' for generating method " + _this.getName());
                        _this.setInvalid();
                    }
                });
            };

            /*
            * This will be a method.
            */
            FunctionWriteGenerator.prototype.print = function (p) {
                var _this = this;
                this.withField(function (field) {
                    p.append(_this.callName, '=function(t){return ');
                    field.print(p);
                    p.append('=t;');
                    p.append('}');
                });
            };
            return FunctionWriteGenerator;
        })(FunctionAttrGenerator);

        var FunctionReadWriteGenerator = (function () {
            function FunctionReadWriteGenerator(obj, getPre, setPre, fieldObj) {
                this.getter = new FunctionReadGenerator(obj, getPre, fieldObj);
                this.setter = new FunctionWriteGenerator(obj, setPre, fieldObj);
            }
            FunctionReadWriteGenerator.prototype.validate = function (v) {
                this.getter.validate(v);
                this.setter.validate(v);
            };

            FunctionReadWriteGenerator.prototype.print = function (p) {
                this.getter.print(p);
                this.setter.print(p);
            };
            return FunctionReadWriteGenerator;
        })();

        /*
        *  = Admin Inlining =
        *
        * and other manipulation of code.
        */
        var PreInline = (function (_super) {
            __extends(PreInline, _super);
            function PreInline(sym) {
                _super.call(this, sym);

                this.isPrinted = false;
            }
            PreInline.prototype.print = function (p) {
                if (!this.isPrinted) {
                    p.append(this.offset.chomp(6, 3));

                    this.isPrinted = true;
                }
            };
            PreInline.prototype.validate = function (v) {
                v.ensureAdminMode(this, "inlining pre-JavaScript is not allowed outside of admin mode");

                v.addPreInline(this);
            };
            return PreInline;
        })(Syntax);
        ast.PreInline = PreInline;

        var Inline = (function (_super) {
            __extends(Inline, _super);
            function Inline(sym) {
                _super.call(this, sym);
            }
            Inline.prototype.print = function (p) {
                p.append(this.offset.chomp(3, 3));
            };
            Inline.prototype.printAsCondition = function (p) {
                this.print(p);
            };
            Inline.prototype.validate = function (v) {
                v.ensureAdminMode(this, "inlining JavaScript is not allowed outside of admin mode");
            };
            return Inline;
        })(Syntax);
        ast.Inline = Inline;
    })(quby.ast || (quby.ast = {}));
    var ast = quby.ast;
})(quby || (quby = {}));
///<reference path='lib/util.ts' />
"use strict";
var quby;
(function (quby) {
    (function (compilation) {
        /**
        * Compilation contains information and utility functions for the compilation of Quby.
        */
        /* hints refer to things we should take advantage of in specific browsers. */
        (function (hints) {
            var methodMissing = undefined;

            /**
            * @return True if the 'noSuchMethod' method is supported, and false if not.
            */
            function useMethodMissing() {
                if (methodMissing === undefined) {
                    // we deliberately cause method missing to get called
                    var obj = {
                        __noSuchMethod__: function () {
                            // do nothing
                        }
                    };

                    var supported = true;
                    try  {
                        obj['call_unknown_method']();
                    } catch (err) {
                        supported = false;
                    }

                    methodMissing = supported;
                }

                return methodMissing;
            }
            hints.useMethodMissing = useMethodMissing;

            function useInlinedGetField() {
                return util.browser.isMozilla || util.browser.isSafari;
            }
            hints.useInlinedGetField = useInlinedGetField;

            function doubleBracketOps() {
                return util.browser.isIE;
            }
            hints.doubleBracketOps = doubleBracketOps;
        })(compilation.hints || (compilation.hints = {}));
        var hints = compilation.hints;
    })(quby.compilation || (quby.compilation = {}));
    var compilation = quby.compilation;
})(quby || (quby = {}));
///<reference path='../quby.ts' />
"use strict";
var quby;
(function (quby) {
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
    (function (core) {
        var STATEMENT_END = ';\n';

        function newTimeResult(parseTime, validateTime, totalTime) {
            return {
                parseCompile: parseTime.compile,
                parseSymbols: parseTime.symbols,
                parseRules: parseTime.rules,
                parseTotal: parseTime.total,
                validatorTotal: validateTime,
                total: totalTime
            };
        }

        

        function handleError(errHandler, err, throwErr) {
            if (typeof throwErr === "undefined") { throwErr = true; }
            if (errHandler !== null) {
                errHandler(err);
            }

            if (throwErr) {
                throw err;
            }
        }

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
        function runParser(instance, validator, errHandler) {
            instance.lock();

            var debugFun = instance.getDebugFun();
            var start = Date.now();

            quby.parser.parseSource(instance.getSource(), instance.getName(), function (program, errors, parserTime) {
                var validateStart = Date.now();

                validator.errorHandler(errHandler);
                validator.adminMode(instance.isAdmin());
                validator.strictMode(instance.isStrict());

                try  {
                    validator.validate(program, errors);
                } catch (err) {
                    handleError(errHandler, err);
                }

                var callback = instance.getFinishedFun();
                var validateTime = Date.now() - validateStart;
                var totalTime = Date.now() - start;

                if (debugFun) {
                    debugFun(newTimeResult(parserTime, validateTime, totalTime));
                }

                if (callback) {
                    util.future.runFun(callback);
                }
            });
        }
        core.runParser = runParser;

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
        var formatError = function (error) {
            var errLine = error.getLine(), strErr;

            if (error.isSymbol) {
                strErr = "error parsing '" + error.getMatch() + "'";
            } else if (error.isTerminal) {
                var termError = error;

                if (termError.isLiteral || util.str.trim(termError.getMatch()) === '') {
                    strErr = "syntax error near '" + termError.terminalName + "'";
                } else {
                    strErr = "syntax error near " + termError.terminalName + " '" + error.getMatch() + "'";
                }

                var expected = termError.expected;
                if (expected.length > 0) {
                    strErr += ', expected ';

                    if (expected.length > 1) {
                        strErr += expected.slice(0, expected.length - 1).join(', ') + ' or ' + expected[expected.length - 1];
                    } else {
                        strErr += expected.join(' or ');
                    }
                }
            } else {
                throw new Error("Unknown parse.js error given to format");
            }

            return {
                line: errLine,
                msg: strErr
            };
        };

        var Validator = (function () {
            function Validator() {
                // the various program trees that have been parsed
                this.programs = [];

                this.lastErrorName = null;

                this.isStrictModeOn = true;

                this.classes = {};
                this.currentClass = null;
                this.rootClass = new RootClassProxy();

                this.calledMethods = {};

                this.vars = [];
                this.funVars = [];

                this.isBlockArr = [];

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
                // The scope is added when we enter a function declaration.
                // From then on every extra layer of scope increments it further,
                // and every time we move down it is decremented until we exit the function.
                // Why??? When 0, we can scan all layers of this.vars looking for local variables.
                // When greater then 0 we can scan all layers (decrementing on each) until funCount == 0.
                this.funCount = 0;
                this.currentFun = null;
                this.isAdminMode = false;

                this.errHandler = null;

                this.symbols = new SymbolTable();

                this.pushScope();
            }
            Validator.prototype.errorHandler = function (errHandler) {
                this.errHandler = errHandler;
            };

            Validator.prototype.strictMode = function (mode) {
                this.isStrictModeOn = mode;
            };

            Validator.prototype.adminMode = function (mode) {
                this.isAdminMode = mode;
            };

            Validator.prototype.addPreInline = function (inline) {
                this.preInlines.push(inline);
            };

            Validator.prototype.addSymbol = function (sym) {
                this.symbols.add(sym);
            };

            Validator.prototype.setInConstructor = function (inC) {
                this.inConstructor = inC;
            };
            Validator.prototype.isInConstructor = function () {
                return this.inConstructor;
            };

            Validator.prototype.setClass = function (klass) {
                if (this.currentClass != null) {
                    this.parseError(klass.getOffset(), "Class '" + klass.getName() + "' is defined inside '" + this.currentClass.getClass().getName() + "', cannot define a class within a class.");
                }

                var klassName = klass.getCallName();
                var kVal = this.classes[klassName];

                if (!kVal) {
                    kVal = new ClassValidator(this, klass);
                    this.classes[klassName] = kVal;
                } else {
                    var oldKlass = kVal.getClass();
                    var oldKlassHead = oldKlass.getHeader();
                    var klassHead = klass.getHeader();

                    // if super relationship is set later in the app
                    if (!oldKlassHead.hasSuper() && klassHead.hasSuper()) {
                        oldKlass.setHeader(klassHead);
                    } else if (oldKlassHead.hasSuper() && klassHead.hasSuper()) {
                        if (oldKlassHead.getSuperCallName() !== klassHead.getSuperCallName()) {
                            this.parseError(klass.getOffset(), "Super class cannot be redefined for class '" + klass.getName() + "'.");
                        }
                    }
                }

                if (klass.getCallName() === quby.runtime.ROOT_CLASS_CALL_NAME) {
                    this.rootClass.setClass(kVal);
                }
                this.lateUsedFuns.setClassVal(kVal);

                return (this.currentClass = kVal);
            };
            Validator.prototype.getClass = function (callName) {
                return this.classes[callName];
            };
            Validator.prototype.getCurrentClass = function () {
                return this.currentClass;
            };
            Validator.prototype.getRootClass = function () {
                return this.rootClass;
            };
            Validator.prototype.unsetClass = function () {
                this.currentClass = null;
            };
            Validator.prototype.isInsideClass = function () {
                return this.currentClass !== null;
            };
            Validator.prototype.isInsideExtensionClass = function () {
                return this.currentClass !== null && this.currentClass.getClass().isExtensionClass();
            };
            Validator.prototype.useField = function (field) {
                this.currentClass.useField(field);
            };
            Validator.prototype.assignField = function (field) {
                this.currentClass.assignField(field);
            };
            Validator.prototype.useThisClassFun = function (fun) {
                this.currentClass.useFun(fun);
            };

            Validator.prototype.setParameters = function (isParameters, isFun) {
                this.isParameters = isParameters;
                this.isFunParameters = isFun;
            };

            Validator.prototype.isInsideParameters = function () {
                return this.isParameters;
            };
            Validator.prototype.isInsideFunParameters = function () {
                return this.isParameters && this.isFunParameters;
            };
            Validator.prototype.isInsideBlockParameters = function () {
                return this.isParameters && !this.isFunParameters;
            };

            Validator.prototype.isInsideClassDeclaration = function () {
                return this.isInsideClass() && !this.isInsideFun();
            };

            Validator.prototype.pushScope = function () {
                this.vars.push({});
                this.isBlockArr.push(false);

                if (this.isInsideFun()) {
                    this.funCount++;
                }
            };
            Validator.prototype.pushFunScope = function (fun) {
                if (this.currentFun !== null) {
                    quby.runtime.error("Fun within Fun", "Defining a function whilst already inside another function.");
                }

                this.currentFun = fun;
                this.funCount++;
                this.vars.push({});
                this.isBlockArr.push(false);
            };
            Validator.prototype.pushBlockScope = function () {
                this.pushScope();
                this.isBlockArr[this.isBlockArr.length - 1] = true;
            };

            Validator.prototype.popScope = function () {
                this.isBlockArr.pop();

                if (this.isInsideFun()) {
                    this.funCount--;

                    if (this.funCount <= 0) {
                        var rootFVars = this.vars.pop();

                        for (var i = 0; i < this.funVars.length; i++) {
                            var fVars = this.funVars[i];

                            for (var key in fVars) {
                                if (rootFVars[key] === undefined) {
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
            Validator.prototype.isInsideFun = function () {
                return this.currentFun !== null;
            };

            /**
            * Returns true or false stating if the validator is currently inside of
            * a block function.
            *
            * @return True if the validator is inside a block, otherwise false.
            */
            Validator.prototype.isInsideBlock = function () {
                return this.isBlockArr[this.isBlockArr.length - 1];
            };

            Validator.prototype.getCurrentFun = function () {
                return this.currentFun;
            };
            Validator.prototype.isConstructor = function () {
                return this.currentFun !== null && this.currentFun.isConstructor();
            };

            Validator.prototype.assignVar = function (variable) {
                this.vars[this.vars.length - 1][variable.getCallName()] = variable;
            };
            Validator.prototype.containsVar = function (variable) {
                var id = variable.getCallName();

                var stop = this.isInsideFun() ? this.vars.length - this.funCount : 0;

                for (var i = this.vars.length - 1; i >= stop; i--) {
                    if (this.vars[i][id] !== undefined) {
                        return true;
                    }
                }

                return false;
            };
            Validator.prototype.containsLocalVar = function (variable) {
                var id = variable.getCallName();
                var scope = this.vars[this.vars.length - 1];

                return !!scope[id];
            };
            Validator.prototype.containsLocalBlock = function () {
                var localVars = this.vars[this.vars.length - 1];

                for (var key in localVars) {
                    var blockVar = localVars[key];

                    if (blockVar instanceof quby.ast.ParameterBlockVariable) {
                        return true;
                    }
                }

                return false;
            };

            Validator.prototype.assignGlobal = function (global) {
                this.globals[global.getCallName()] = true;
            };
            Validator.prototype.useGlobal = function (global) {
                this.usedGlobals[global.getCallName()] = global;
            };

            /**
            * Declares a function.
            *
            * By 'function' I mean function, constructor, method or function-generator.
            *
            * @param func
            */
            Validator.prototype.defineFun = function (fun) {
                var klass = this.currentClass;

                // Methods / Constructors
                if (klass !== null) {
                    // Constructors
                    if (fun.isConstructor()) {
                        klass.addNew(fun);
                        // Methods
                    } else {
                        klass.addFun(fun);
                        this.methodNames.add(fun.getCallName(), fun.getName());
                    }
                    // Functions
                } else {
                    if (this.funs[fun.getCallName()] !== undefined) {
                        this.parseError(fun.getOffset(), "Function is already defined: '" + fun.getName() + "', with " + fun.getNumParameters() + " parameters.");
                    }

                    this.funs[fun.getCallName()] = fun;
                }
            };

            /* Store any functions which have not yet been defined.
            * Note that this will include valid function calls which are defined after
            * the call, but this is sorted in the endValidate section. */
            Validator.prototype.useFun = function (funCall) {
                if (funCall.isMethod()) {
                    this.calledMethods[funCall.getCallName()] = funCall;
                } else if (this.isInsideClass()) {
                    if (this.currentClass.hasFun(funCall)) {
                        funCall.setIsMethod();
                    } else {
                        this.lateUsedFuns.addFun(funCall);
                    }
                } else if (!this.funs[funCall.getCallName()]) {
                    this.usedFunsStack.push(funCall);
                }
            };

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
            Validator.prototype.strictError = function (lineInfo, msg) {
                if (this.isStrictModeOn) {
                    this.parseError(lineInfo, msg);
                }
            };

            Validator.prototype.parseError = function (sym, msg) {
                if (sym) {
                    this.parseErrorLine(sym.getLine(), msg, sym.getSourceName());
                } else {
                    this.parseErrorLine(-1, msg);
                }
            };

            Validator.prototype.parseErrorLine = function (line, error, name) {
                if (line === null || line === undefined) {
                    line = -1;
                }
                line = line | 0;

                if (!name && name !== '') {
                    name = this.lastErrorName;
                } else {
                    this.lastErrorName = name;
                }

                var msg;

                if (line !== -1) {
                    msg = "line " + line + ", " + error;
                } else {
                    msg = error;
                }

                this.errors.push({
                    name: name,
                    line: line,
                    message: msg,
                    error: error
                });
            };

            Validator.prototype.getErrors = function () {
                var errors = this.errors;

                if (errors.length > 0) {
                    errors.sort(function (a, b) {
                        if (a.name === b.name) {
                            var aLine = a.line;
                            if (aLine === null) {
                                aLine = -1;
                            }

                            var bLine = b.line;
                            if (bLine === null) {
                                bLine = -1;
                            }

                            return aLine - bLine;
                        } else {
                            return a.name.localeCompare(b.name);
                        }
                    });
                }

                return errors;
            };

            Validator.prototype.hasErrors = function () {
                return this.errors.length > 0;
            };

            /**
            * Pass in a function and it will be called by the validator at the
            * end of validation. Note that all other validation occurres before
            * these callbacks are called.
            *
            * These are called in a FIFO order, but bear in mind that potentially
            * anything could have been added before your callback.
            */
            Validator.prototype.onEndValidate = function (callback) {
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
            Validator.prototype.finaliseProgram = function (times) {
                var start = Date.now();
                this.endValidate();
                var end = Date.now();

                var finaliseTime = end - start;
                times.finalise = finaliseTime;

                if (this.hasErrors()) {
                    return '';
                } else {
                    var code = this.generateCode();
                    times.print = Date.now() - end;

                    return code;
                }
            };

            // adds a program to be validated by this Validator
            Validator.prototype.validate = function (program, errors) {
                // clear this, so errors don't seap across multiple validations
                this.lastErrorName = null;

                if (errors === null || errors.length === 0) {
                    if (!program) {
                        // avoid unneeded error messages
                        if (this.errors.length === 0) {
                            this.strictError(null, "No source code provided");
                        }
                    } else {
                        try  {
                            program.validate(this);

                            this.programs.push(program);
                        } catch (err) {
                            this.parseError(null, 'Unknown issue with your code has caused the parser to crash!');

                            if (window.console && window.console.log) {
                                handleError(this.errHandler, err, false);

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
            };

            /**
            * Private.
            *
            * Runs all final validation checks.
            * After this step the program is fully validated.
            *
            * At the time of writing, Chrome fails to be able to optimize methods which include a try-catch
            * statement. So the statement must be pushed out into an outer method.
            */
            Validator.prototype.endValidate = function () {
                try  {
                    this.endValidateInner();
                } catch (err) {
                    this.parseError(null, 'Unknown issue with your code has caused the parser to crash!');

                    if (window.console && window.console.log) {
                        handleError(this.errHandler, err, false);

                        if (err.stack) {
                            window.console.log(err.stack);
                        } else {
                            window.console.log(err);
                        }
                    }
                }
            };

            Validator.prototype.endValidateInner = function () {
                /*
                * Go through all function calls we have stored, which have not been
                * confirmed as being defined. Note this can include multiple calls
                * to the same functions.
                */
                var funs = this.funs;
                var usedFunsStack = this.usedFunsStack;
                var usedFunsStackKeys = Object.keys(usedFunsStack);

                for (var i = 0; i < usedFunsStackKeys.length; i++) {
                    var fun = usedFunsStack[usedFunsStackKeys[i]];
                    var callName = fun.getCallName();

                    // check if the function is not defined
                    if (funs[callName] === undefined) {
                        this.searchMissingFunAndError(fun, funs, 'function');
                    }
                }

                /* Check all used globals were assigned to, at some point. */
                var globals = this.globals;
                var usedGlobals = this.usedGlobals;
                var usedGlobalsKeys = Object.keys(usedGlobals);

                for (var i = 0; i < usedGlobalsKeys.length; i++) {
                    var strGlobal = usedGlobalsKeys[i];

                    if (globals[strGlobal] === undefined) {
                        var global = usedGlobals[strGlobal];

                        this.parseError(global.getOffset(), "Global used but never assigned to: '" + global.getName() + "'.");
                    }
                }

                /* finalise all classes */
                var classes = this.classes;
                var classesKeys = Object.keys(classes);
                var classesKeysLength = classesKeys.length;

                for (var i = 0; i < classesKeysLength; i++) {
                    classes[classesKeys[i]].endValidate();
                }

                /* Ensure all called methods do exist (somewhere) */
                var calledMethods = this.calledMethods;
                var calledMethodKeys = Object.keys(calledMethods);

                for (var i = 0; i < calledMethodKeys.length; i++) {
                    var method = calledMethods[calledMethodKeys[i]];
                    var methodFound = false;

                    for (var j = 0; j < classesKeysLength; j++) {
                        if (classes[classesKeys[j]].hasFun(method)) {
                            methodFound = true;
                            break;
                        }
                    }

                    if (!methodFound) {
                        var found = this.searchForMethodLike(method), name = method.getName().toLowerCase(), errMsg = null;

                        if (found !== null) {
                            if (!found.hasDeclarationError()) {
                                if (name === found.getName().toLowerCase()) {
                                    errMsg = "Method '" + method.getName() + "' called with incorrect number of parameters, " + method.getNumParameters() + " instead of " + found.getNumParameters();
                                } else {
                                    errMsg = "Method '" + method.getName() + "' called with " + method.getNumParameters() + " parameters, but is not defined in any class. Did you mean: '" + found.getName() + "'?";
                                }
                            }
                        } else {
                            // no alternative method found
                            errMsg = "Method '" + method.getName() + "' called with " + method.getNumParameters() + " parameters, but is not defined in any class.";
                        }

                        this.parseError(method.getOffset(), errMsg);
                    }
                }

                this.lateUsedFuns.endValidate(this.funs);

                for (var i = 0; i < this.endValidateCallbacks.length; i++) {
                    this.endValidateCallbacks[i](this);
                }
                this.endValidateCallbacks = [];
            };

            /**
            * Turns all stored programs into
            */
            Validator.prototype.generateCode = function () {
                try  {
                    var printer = new Printer();

                    printer.setCodeMode(false);
                    this.generatePreCode(printer);
                    printer.setCodeMode(true);

                    for (var i = 0; i < this.programs.length; i++) {
                        this.programs[i].print(printer);
                    }
                } catch (err) {
                    handleError(this.errHandler, err);
                }

                return printer.toString();
            };

            Validator.prototype.generateNoSuchMethodStubs = function (p) {
                // generate the noSuchMethod function stubs
                if (!quby.compilation.hints.useMethodMissing()) {
                    var rootKlass = this.getRootClass().getClass(), callNames = [], extensionStr = [];

                    p.append('var ', quby.runtime.FUNCTION_DEFAULT_TABLE_NAME, "={");

                    var errFun = ":function(){quby_errFunStub(this,arguments);}";
                    var printComma = false;
                    this.methodNames.callNames(function (callName) {
                        if (rootKlass === null || !rootKlass.hasFunCallName(callName)) {
                            // from second iteration onwards, this if is called
                            if (printComma) {
                                p.append(',', callName, ':function(){noSuchMethodError(this,"' + callName + '");}');
                                // this else is run on first iteration
                            } else {
                                p.append(callName, ':function(){noSuchMethodError(this,"' + callName + '");}');
                                printComma = true;
                            }

                            callNames[callNames.length] = callName;
                            extensionStr[extensionStr.length] = ['.prototype.', callName, '=', quby.runtime.FUNCTION_DEFAULT_TABLE_NAME, '.', callName].join('');
                        }
                    });

                    p.append("}");
                    p.endStatement();

                    // print empty funs for each Extension class
                    var classes = quby.runtime.CORE_CLASSES;
                    var numNames = callNames.length;
                    for (var i = 0; i < classes.length; i++) {
                        var name = classes[i];
                        var transName = quby.runtime.translateClassName(name);
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
            };

            /*
            * Of all the things this does, it also prints out the methods which
            * classes inherit from the QubyObject (as this is the parent of all
            * objects).
            */
            Validator.prototype.generatePreCode = function (p) {
                this.methodNames.print(p);
                this.symbols.print(p);
                p.printArray(this.preInlines);

                this.generateNoSuchMethodStubs(p);

                // print the Object functions for each of the extension classes
                var classes = quby.runtime.CORE_CLASSES;
                var stmts = this.rootClass.getPrintStmts();

                if (stmts !== null) {
                    for (var i = 0; i < classes.length; i++) {
                        var name = classes[i];

                        p.appendExtensionClassStmts(name, stmts);
                    }
                }
            };

            /* Validation Helper Methods */
            Validator.prototype.ensureInConstructor = function (syn, errorMsg) {
                return this.ensureTest(!this.isInsideFun() || !this.isInsideClass() || !this.isConstructor(), syn, errorMsg);
            };
            Validator.prototype.ensureInMethod = function (syn, errorMsg) {
                return this.ensureTest(!this.isInsideFun() || !this.isInsideClass(), syn, errorMsg);
            };
            Validator.prototype.ensureAdminMode = function (syn, errorMsg) {
                return this.ensureTest(!this.isAdminMode, syn, errorMsg);
            };
            Validator.prototype.ensureInFun = function (syn, errorMsg) {
                return this.ensureTest(!this.isInsideFun(), syn, errorMsg);
            };
            Validator.prototype.ensureOutFun = function (syn, errorMsg) {
                return this.ensureTest(this.isInsideFun(), syn, errorMsg);
            };
            Validator.prototype.ensureOutBlock = function (syn, errorMsg) {
                return this.ensureTest(this.isInsideBlock(), syn, errorMsg);
            };
            Validator.prototype.ensureInClass = function (syn, errorMsg) {
                return this.ensureTest(!this.isInsideClass(), syn, errorMsg);
            };
            Validator.prototype.ensureOutClass = function (syn, errorMsg) {
                return this.ensureTest(this.isInsideClass(), syn, errorMsg);
            };
            Validator.prototype.ensureOutParameters = function (syn, errorMsg) {
                return this.ensureTest(this.isInsideParameters(), syn, errorMsg);
            };
            Validator.prototype.ensureOutFunParameters = function (syn, errorMsg) {
                return this.ensureTest(this.isInsideFunParameters(), syn, errorMsg);
            };
            Validator.prototype.ensureInFunParameters = function (syn, errorMsg) {
                return this.ensureTest(!this.isInsideFunParameters(), syn, errorMsg);
            };
            Validator.prototype.ensureTest = function (errCondition, syn, errorMsg) {
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
            Validator.prototype.searchForMethodLike = function (method, klassVal) {
                if (klassVal) {
                    return this.searchMissingFun(method, klassVal.getFunctions());
                } else {
                    var searchKlassVals = this.classes, altMethod = null, methodName = method.getName().toLowerCase();

                    for (var i in searchKlassVals) {
                        var found = this.searchMissingFunWithName(methodName, searchKlassVals[i].getFunctions());

                        if (found !== null) {
                            // wrong number of parameters
                            if (found.getName().toLowerCase() === methodName) {
                                return found;
                                // alternative name
                            } else if (altMethod === null) {
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
            Validator.prototype.searchMissingFunWithName = function (name, searchFuns) {
                var altNames = [], altFun = null;
                var nameLen = name.length;

                if (nameLen > 3 && (name.indexOf('get') === 0 || name.indexOf('set') === 0)) {
                    altNames.push(name.substr(3));
                } else {
                    altNames.push('get' + name);
                    altNames.push('set' + name);
                }

                var keys = Object.keys(searchFuns);
                var keysLen = keys.length;
                for (var i = 0; i < keysLen; i++) {
                    var funIndex = keys[i];

                    var searchFun = searchFuns[funIndex];
                    var searchName = searchFun.getName().toLowerCase();

                    if (searchName === name) {
                        return searchFun;
                    } else if (altFun === null) {
                        for (var j = 0; j < altNames.length; j++) {
                            var altName = altNames[j];

                            if (searchName === altName) {
                                altFun = searchFun;
                                break;
                            }
                        }
                    }
                }

                return altFun;
            };

            Validator.prototype.searchMissingFun = function (fun, searchFuns) {
                return this.searchMissingFunWithName(fun.getName().toLowerCase(), searchFuns);
            };

            /**
            *
            */
            Validator.prototype.searchMissingFunAndError = function (fun, searchFuns, strFunctionType) {
                var name = fun.getName(), lower = name.toLowerCase(), found = this.searchMissingFunWithName(name, searchFuns), errMsg;

                if (found !== null) {
                    if (lower === found.getName().toLowerCase()) {
                        errMsg = "Called " + strFunctionType + " '" + name + "' with wrong number of parameters.";
                    } else {
                        errMsg = "Called " + strFunctionType + " '" + name + "', but it is not defined, did you mean: '" + found.getName() + "'.";
                    }
                } else {
                    errMsg = "Undefined " + strFunctionType + " called: '" + name + "'.";
                }

                this.parseError(fun.offset, errMsg);
            };
            return Validator;
        })();
        core.Validator = Validator;

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
        var LateFunctionBinder = (function () {
            function LateFunctionBinder(validator) {
                this.currentClassV = null;
                this.validator = validator;

                this.classVals = {};
                this.classFuns = {};
            }
            LateFunctionBinder.prototype.setClassVal = function (klass) {
                this.currentClassV = klass;
            };

            LateFunctionBinder.prototype.addFun = function (fun) {
                var callName = this.currentClassV.getClass().getCallName();
                var funs = this.classFuns[callName];

                if (!funs) {
                    funs = {};
                    this.classFuns[callName] = funs;
                    this.classVals[callName] = this.currentClassV;
                }

                var funCallName = fun.getCallName(), innerFuns = funs[funCallName];

                if (!innerFuns) {
                    innerFuns = [];
                    funs[funCallName] = innerFuns;
                }

                innerFuns.push(fun);
            };

            LateFunctionBinder.prototype.endValidate = function (globalFuns) {
                var classFuns = this.classFuns;
                var classVals = this.classVals;
                var classValsKeys = Object.keys(classVals);

                for (var i = 0; i < classValsKeys.length; i++) {
                    var className = classValsKeys[i];
                    var klassV = classVals[className];
                    var funs = classFuns[className];
                    var funsKeys = Object.keys(funs);

                    for (var j = 0; j < funsKeys.length; j++) {
                        var funName = funsKeys[j];
                        var innerFuns = funs[funName];
                        var fun = innerFuns[0];

                        if (klassV.hasFunInHierarchy(fun)) {
                            for (var k = 0; k < innerFuns.length; k++) {
                                innerFuns[k].setIsMethod();
                            }
                        } else if (!globalFuns[funName]) {
                            for (var k = 0; k < innerFuns.length; k++) {
                                var f = innerFuns[k];

                                this.validator.parseError(f.getOffset(), "Undefined function '" + f.getName() + "' called with " + f.getNumParameters() + " parameters," + " but is not defined in this class or as a function.");
                            }
                        }
                    }
                }
            };
            return LateFunctionBinder;
        })();

        /**
        * Used to store callName to display name mappings for all functions
        * and methods.
        *
        * This is used at runtime to allow it to lookup functions that
        * have been called but don't exist on the object.
        */
        var FunctionTable = (function () {
            function FunctionTable() {
                this.funs = {};
                this.size = 0;
            }
            FunctionTable.prototype.add = function (callName, displayName) {
                this.funs[callName] = displayName;
                this.size++;
            };

            FunctionTable.prototype.callNames = function (callback) {
                for (var callName in this.funs) {
                    callback(callName);
                }
            };

            FunctionTable.prototype.print = function (p) {
                var fs = this.funs;

                p.append('var ', quby.runtime.FUNCTION_TABLE_NAME, '={');

                // We print a comma between each entry
                // and we achieve this by always printing it before the next item,
                // except on the first one!
                var printComma = false;
                for (var callName in fs) {
                    if (fs.hasOwnProperty(callName)) {
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
                }

                p.append('}');
                p.endStatement();
            };
            return FunctionTable;
        })();

        /**
        * This table is used for the symbol mappings.
        * Symbols are the :symbol code you can use in Quby/Ruby.
        *
        * This is printed into the resulting code for use at runtime.
        */
        var SymbolTable = (function () {
            function SymbolTable() {
                this.symbols = {};
            }
            SymbolTable.prototype.add = function (sym) {
                this.symbols[sym.getCallName()] = sym.getMatch();
            };

            SymbolTable.prototype.print = function (p) {
                for (var callName in this.symbols) {
                    var sym = this.symbols[callName];

                    p.append('var ', callName, " = '", sym, "'");
                    p.endStatement();
                }
            };
            return SymbolTable;
        })();

        /**
        * Whilst validating sub-classes will want to grab the root class.
        * If it has not been hit yet then we can't return it.
        * So instead we use a proxy which always exists.
        *
        * This allows us to set the root class later.
        */
        var RootClassProxy = (function () {
            function RootClassProxy() {
                this.rootClass = null;
            }
            RootClassProxy.prototype.setClass = function (klass) {
                if (this.rootClass === null) {
                    this.rootClass = klass;
                }
            };

            RootClassProxy.prototype.getClass = function () {
                return this.rootClass;
            };

            /**
            * Should only be called after validation (during printing).
            *
            * todo: this should be moved so it's neater
            */
            RootClassProxy.prototype.getPrintStmts = function () {
                if (this.rootClass === null) {
                    return null;
                } else {
                    var statements = this.rootClass.getClass().getStatements();

                    if (statements !== null) {
                        return statements.getStmts();
                    } else {
                        return null;
                    }
                }
            };
            return RootClassProxy;
        })();

        var ClassValidator = (function () {
            function ClassValidator(validator, klass) {
                this.isPrinted = false;

                this.validator = validator;
                this.klass = klass;

                this.funs = {};
                this.usedFuns = {};
                this.news = [];

                this.usedFields = {};
                this.assignedFields = {};

                this.noMethPrintFuns = null;
            }
            ClassValidator.prototype.getFunctions = function () {
                return this.funs;
            };

            ClassValidator.prototype.getClass = function () {
                return this.klass;
            };

            ClassValidator.prototype.useField = function (field) {
                this.usedFields[field.getCallName()] = field;
            };
            ClassValidator.prototype.assignField = function (field) {
                this.assignedFields[field.getCallName()] = field;
            };
            ClassValidator.prototype.hasField = function (field) {
                var fieldCallName = quby.runtime.formatField(this.klass.getName(), field.getName());

                return this.hasFieldCallName(fieldCallName);
            };
            ClassValidator.prototype.hasFieldCallName = function (callName) {
                return this.assignedFields[callName] !== undefined;
            };

            ClassValidator.prototype.addFun = function (fun) {
                var index = fun.getCallName();

                if (this.funs.hasOwnProperty(index)) {
                    this.validator.parseError(fun.offset, "Duplicate method '" + fun.getName() + "' declaration in class '" + this.klass.getName() + "'.");
                }

                this.funs[index] = fun;
            };
            ClassValidator.prototype.hasFunInHierarchy = function (fun) {
                if (this.hasFun(fun)) {
                    return true;
                } else {
                    var parentName = this.klass.getSuperCallName();

                    // if has a parent class, pass the call on to that
                    if (parentName !== null) {
                        var parentVal = this.validator.getClass(parentName);

                        if (parentVal !== undefined) {
                            return parentVal.hasFunInHierarchy(fun);
                        } else {
                            return false;
                        }
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
            ClassValidator.prototype.hasFun = function (fun) {
                return this.hasFunCallName(fun.getCallName());
            };

            /**
            * States if this class has a method with the given call name, or not.
            *
            * Ignores parent classes.
            */
            ClassValidator.prototype.hasFunCallName = function (callName) {
                return this.funs.hasOwnProperty(callName);
            };
            ClassValidator.prototype.useFun = function (fun) {
                var callName = fun.getCallName();

                if (!this.funs[callName]) {
                    this.usedFuns[callName] = fun;
                }
            };

            ClassValidator.prototype.getFun = function (callName) {
                var f = this.funs[callName];
                return (f === undefined) ? null : f;
            };

            ClassValidator.prototype.addNew = function (fun) {
                var index = fun.getNumParameters();

                if (this.news[index] !== undefined) {
                    this.validator.parseError(fun.offset, "Duplicate constructor for class '" + this.klass.getName() + "' with " + index + " parameters.");
                }

                this.news[index] = fun;
            };

            ClassValidator.prototype.eachConstructor = function (callback) {
                var news = this.news;

                for (var i = 0, len = news.length; i < len; i++) {
                    var c;

                    if ((c = news[i]) !== undefined) {
                        callback(i, c);
                    }
                }
            };

            /**
            * Returns an array containing all of the number of
            * parameters, that this expects.
            */
            ClassValidator.prototype.getNewParameterList = function () {
                var news = this.news;

                if (news.length === 0) {
                    return [0];
                } else {
                    var numParams = [];

                    this.eachConstructor(function (i) {
                        return numParams.push(i);
                    });

                    return numParams;
                }
            };

            ClassValidator.prototype.hasNew = function (fun) {
                return this.news[fun.getNumParameters()] !== undefined;
            };
            ClassValidator.prototype.noNews = function () {
                return this.news.length === 0;
            };

            ClassValidator.prototype.setNoMethPrintFuns = function (callNames) {
                this.noMethPrintFuns = callNames;
            };

            ClassValidator.prototype.printOnce = function (p) {
                if (!this.isPrinted) {
                    this.isPrinted = true;
                    this.print(p);
                }
            };

            /**
            * In practice, this is only ever called by non-extension classes.
            */
            ClassValidator.prototype.print = function (p) {
                p.setCodeMode(false);

                var klassName = this.klass.getCallName();
                var superKlass = this.klass.getSuperCallName();

                // class declaration itself
                p.append('function ', klassName, '() {');
                if (superKlass != null) {
                    p.append(superKlass, '.apply(this);');
                }

                // set 'this' to '_this'
                p.append('var ', quby.runtime.THIS_VARIABLE, ' = this;');

                if (this.noMethPrintFuns) {
                    for (var i = 0; i < this.noMethPrintFuns.length; i++) {
                        var callName = this.noMethPrintFuns[i];

                        p.append('this.', callName, '=', quby.runtime.FUNCTION_DEFAULT_TABLE_NAME, '.', callName);
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
                this.eachConstructor(function (i, c) {
                    return c.print(p);
                });

                p.setCodeMode(true);
            };

            ClassValidator.prototype.endValidate = function () {
                var thisKlass = this.klass;

                // if no constructors, add a default no-args constructor
                // but only for non-core classes
                if (this.news.length === 0 && !this.klass.isExtensionClass()) {
                    var constructorObj = new quby.ast.Constructor(thisKlass.offset.clone("new"), null, null);
                    constructorObj.setClass(thisKlass);

                    this.addNew(constructorObj);
                }

                // Check for circular inheritance trees.
                // Travel up the inheritance tree marking all classes we've seen.
                // If we see one we've already seen, then we break with a parse error.
                var seenClasses = {};
                seenClasses[thisKlass.getCallName()] = true;

                var head = thisKlass.getHeader();
                var superClassVs = [];

                var validator = this.validator;

                while (head.hasSuper()) {
                    var superKlassV = validator.getClass(head.getSuperCallName());

                    if (!superKlassV) {
                        if (!quby.runtime.isCoreClass(head.getSuperName().toLowerCase())) {
                            validator.parseError(thisKlass.offset, "Super class not found: '" + head.getSuperName() + "', for class '" + thisKlass.getName() + "'.");
                        }

                        break;
                    } else {
                        var superKlass = superKlassV.getClass();

                        if (seenClasses[superKlass.getCallName()]) {
                            validator.parseError(thisKlass.offset, "Circular inheritance tree is found for class '" + thisKlass.getName() + "'.");

                            break;
                        } else {
                            superClassVs.push(superKlassV);
                            seenClasses[superKlass.getCallName()] = true;
                            head = superKlass.getHeader();
                        }
                    }
                }

                for (var fieldI in this.usedFields) {
                    if (this.assignedFields[fieldI] === undefined) {
                        var field = this.usedFields[fieldI];
                        var fieldErrorHandled = false;

                        // search up the super class tree for a field of the same name
                        if (thisKlass.getHeader().hasSuper()) {
                            for (var i = 0; i < superClassVs.length; i++) {
                                var superClassV = superClassVs[i];

                                if (superClassV.hasField(field)) {
                                    validator.parseError(field.offset, "Field '@" + field.getName() + "' from class '" + superClassV.klass.getName() + "' is accessd in sub-class '" + thisKlass.getName() + "', however fields are private to each class.");

                                    fieldErrorHandled = true;
                                    break;
                                }
                            }
                        }

                        if (!fieldErrorHandled) {
                            validator.parseError(field.offset, "Field '@" + field.getName() + "' is used in class '" + thisKlass.getName() + "' without ever being assigned to.");
                        }
                    }
                }

                for (var funName in this.usedFuns) {
                    if (!this.funs[funName]) {
                        var fun = this.usedFuns[funName];

                        if (!this.hasFunInHierarchy(fun)) {
                            validator.searchMissingFunAndError(fun, this.funs, thisKlass.getName() + ' method');
                        }
                    }
                }
            };
            return ClassValidator;
        })();
        core.ClassValidator = ClassValidator;

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
        var Printer = (function () {
            function Printer() {
                this.pre = [];
                this.stmts = [];
                this.preOrStmts = this.stmts;

                this.currentPre = newPrinterStatement();
                this.currentStmt = newPrinterStatement();
                this.current = this.currentStmt;

                this.isCode = true;
                this.tempVarCounter = 0;
            }
            Printer.prototype.getTempVariable = function () {
                return quby.runtime.TEMP_VARIABLE + (this.tempVarCounter++);
            };

            /**
            * Sets this to enter, or more importantly leave, the 'code' printing mode.
            * Code printing is the normal statements, non-code appeares before the code
            * statements.
            *
            * Essentially 'setCodeMode(false)' allows you to inject code at the start of
            * the resulting JS.
            *
            * @param
            * @return The previous setting for code mode.
            */
            Printer.prototype.setCodeMode = function (isCode) {
                if (this.isCode !== isCode) {
                    if (isCode) {
                        this.current = this.currentStmt;
                        this.preOrStmts = this.stmts;
                        this.isCode = true;

                        return false;
                    } else {
                        this.current = this.currentPre;
                        this.preOrStmts = this.pre;
                        this.isCode = false;

                        return true;
                    }
                } else {
                    return isCode;
                }
            };

            Printer.prototype.appendExtensionClassStmts = function (name, stmts) {
                var stmtsStart = quby.runtime.translateClassName(name) + '.prototype.';

                for (var i = 0; i < stmts.length; i++) {
                    var fun = stmts[i];

                    // todo this shouldn't need a type check,
                    // should be more type safe
                    if (fun['isConstructor'] && fun.isConstructor()) {
                        fun.print(this);
                    } else {
                        this.append(stmtsStart);

                        if (!window['quby_doOnce']) {
                            console.log(fun);

                            window['quby_doOnce'] = true;
                        }
                        fun.print(this);
                    }

                    this.endStatement();
                }
            };

            Printer.prototype.printArray = function (arr) {
                for (var i = 0, len = arr.length; i < len; i++) {
                    arr[i].print(this);
                    this.endStatement();
                }
            };

            Printer.prototype.flush = function () {
                this.current.flush(this.preOrStmts);

                return this;
            };

            Printer.prototype.endStatement = function () {
                this.current.appendNow(STATEMENT_END);

                return this.flush();
            };

            Printer.prototype.toString = function () {
                // finish pre and stmts sections and then concat them out together
                this.currentPre.flush(this.pre);
                this.currentStmt.flush(this.stmts);

                return this.pre.join('') + this.stmts.join('');
            };

            Printer.prototype.appendPre = function (a) {
                for (var i = 0; i < arguments.length; i++) {
                    this.preOrStmts.push(arguments[i]);
                }

                return this;
            };

            Printer.prototype.append = function (a) {
                for (var i = 0; i < arguments.length; i++) {
                    this.current.appendNow(arguments[i]);
                }

                return this;
            };

            Printer.prototype.appendPost = function (a) {
                for (var i = 0; i < arguments.length; i++) {
                    this.current.appendPost(arguments[i]);
                }

                return this;
            };
            return Printer;
        })();
        core.Printer = Printer;

        

        function newPrinterStatement() {
            return {
                currentLength: 0,
                currentStatement: [],
                postLength: 0,
                postStatement: [],
                appendNow: function (e) {
                    this.currentStatement[this.currentLength++] = e;
                },
                appendPost: function (e) {
                    this.postStatement[this.postLength++] = e;
                },
                flush: function (dest) {
                    var currentLength = this.currentLength;
                    var postLength = this.postLength;

                    var destI = dest.length;

                    if (currentLength !== 0) {
                        var currentStatement = this.currentStatement;
                        for (var i = 0; i < currentLength; i++) {
                            dest[destI++] = currentStatement[i];
                        }
                        this.currentLength = 0;
                    }

                    if (postLength !== 0) {
                        var postStatement = this.postStatement;
                        for (var i = 0; i < postLength; i++) {
                            dest[destI++] = postStatement[i];
                        }
                        this.postLength = 0;
                    }
                }
            };
        }
    })(quby.core || (quby.core = {}));
    var core = quby.core;
})(quby || (quby = {}));
///<reference path='lib/util.ts' />
"use strict";
var quby;
(function (quby) {
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
    (function (main) {
        function runScriptTagsDisplay() {
            runScriptTags(function (r) {
                r.runOrDisplayErrors();
            });
        }
        main.runScriptTagsDisplay = runScriptTagsDisplay;

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
        function runScriptTags(onResult) {
            if (!onResult) {
                onResult = function (result) {
                    if (result.hasErrors()) {
                        throw new Error(result.getErrors()[0].error);
                    } else {
                        result.run();
                    }
                };
            }

            var scripts = document.getElementsByTagName('script');
            var parser = new Parser();

            var inlineScriptCount = 1;

            for (var i = 0; i < scripts.length; i++) {
                var script = scripts[i], name = script.getAttribute('data-name') || null, type = script.getAttribute('type');

                if (type === 'text/quby' || type === 'quby') {
                    var instance = null;
                    var isAdmin = (script.getAttribute('data-admin') === 'true') ? true : false;

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
                        contents = contents.replace(/^\/\/<!\[CDATA\[/, "").replace(/\/\/\]\]>$/, "");

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
        main.runScriptTags = runScriptTags;

        /**
        *
        */
        function parse(source, adminMode, callback) {
            var parser = new Parser();

            parser.parse(source).adminMode(adminMode);
            parser.finalize(callback);
        }
        main.parse = parse;

        function handleError(errHandler, err) {
            if (errHandler !== null) {
                errHandler(err);
            } else {
                throw err;
            }
        }

        var ParserInstance = (function () {
            function ParserInstance(source) {
                this.source = source;

                this.isStrictFlag = true;
                this.isAdminFlag = true;

                this.strName = '<Unknown Script>';
                this.isExplicitelyNamed = false;
                this.hasParsed = false;

                this.whenFinished = null;
                this.debugCallback = null;
            }
            ParserInstance.prototype.ensureCanParse = function () {
                if (this.hasParsed) {
                    throw new Error("adding new properties to an instance which has finished parsing");
                }
            };

            ParserInstance.prototype.adminMode = function (isAdmin) {
                if (typeof isAdmin === "undefined") { isAdmin = true; }
                this.ensureCanParse();

                return this;
            };

            ParserInstance.prototype.isAdmin = function () {
                return this.isAdminFlag;
            };

            /**
            * Disables strict mode for the current bout of parsing.
            */
            ParserInstance.prototype.strictMode = function (isStrict) {
                if (typeof isStrict === "undefined") { isStrict = true; }
                this.ensureCanParse();

                return this;
            };

            ParserInstance.prototype.isStrict = function () {
                return this.isStrictFlag;
            };

            /**
            * Gives this parser a name, for use in the error messages.
            * i.e. 'main.qb', or 'some-game'.
            *
            * The name can be anything you want.
            */
            ParserInstance.prototype.name = function (name, isExplicitelyNamed) {
                if (typeof isExplicitelyNamed === "undefined") { isExplicitelyNamed = true; }
                this.ensureCanParse();

                this.strName = name;
                this.isExplicitelyNamed = isExplicitelyNamed;

                return this;
            };

            ParserInstance.prototype.getName = function () {
                return this.strName;
            };

            ParserInstance.prototype.getSource = function () {
                return this.source;
            };

            /**
            * A callback to run for when *just this file*
            * has finished being parsed.
            *
            * Note that this will happen before you call
            * 'finalise'.
            */
            ParserInstance.prototype.onFinish = function (fun) {
                this.ensureCanParse();

                this.whenFinished = fun;

                return this;
            };

            ParserInstance.prototype.getFinishedFun = function () {
                return this.whenFinished;
            };

            /**
            * Once called, properties can no longer be changed
            * on this object.
            *
            * It's to indicate that it's started being parsed.
            */
            ParserInstance.prototype.lock = function () {
                this.hasParsed = true;
            };

            /**
            * If a debugCallback is provided, then it will be called during
            * the parsing process. This makes parsing a tad slower, but provides
            * you with information on how it wen't (like the symbols generated
            * and how long the different stages took).
            *
            * If no debugCallback is provided, then it is run normally.
            */
            ParserInstance.prototype.onDebug = function (fun) {
                this.ensureCanParse();

                this.debugCallback = fun;

                return this;
            };

            ParserInstance.prototype.getDebugFun = function () {
                return this.debugCallback;
            };
            return ParserInstance;
        })();
        main.ParserInstance = ParserInstance;

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
        var Parser = (function () {
            function Parser() {
                this.validator = new quby.core.Validator();
                this.isStrict = true;
                this.errHandler = null;
            }
            Parser.prototype.newParserInstance = function (src) {
                if (typeof src === "undefined") { src = null; }
                try  {
                    var instance = new ParserInstance(src);
                    instance.strictMode(this.isStrict);

                    return instance;
                } catch (err) {
                    handleError(this.errHandler, err);
                }

                return null;
            };

            Parser.prototype.errorHandler = function (handler) {
                this.errHandler = handler;
            };

            /**
            * Enabled strict mode, for all parsing,
            * which is on by default.
            *
            * Note that you can disable it for indevidual
            * files with 'strictMode'.
            */
            Parser.prototype.strictModeAll = function (isStrict) {
                if (typeof isStrict === "undefined") { isStrict = true; }
                this.isStrict = isStrict;
            };

            /**
            * Parse a single file, adding it to the program being built.
            *
            * A ParseInstance is returned, allowing you to customize
            * the setup of how the files should be parsed.
            */
            Parser.prototype.parse = function (source) {
                var instance = this.newParserInstance(source), validator = this.validator;

                var self = this;
                util.future.run(function () {
                    quby.core.runParser(instance, validator, self.errHandler);
                });

                return instance;
            };

            Parser.prototype.parseUrl = function (url) {
                var instance = this.newParserInstance(), validator = this.validator, name = util.url.stripDomain(url), questionMark = name.indexOf('?');

                if (questionMark !== -1) {
                    name = name.substring(0, questionMark);
                }

                instance.name(name);

                util.ajax.getFuture(url, function (status, text) {
                    if (status >= 200 && status < 400) {
                        quby.core.runParser(instance, validator, this.errHandler);
                    } else {
                        throw new Error("failed to load script: " + url);
                    }
                });

                return instance;
            };

            Parser.prototype.parseUrls = function (urls) {
                for (var i = 0; i < urls.length; i++) {
                    this.parseUrl(urls[i]);
                }

                return this;
            };

            Parser.prototype.parseArgs = function (source, adminMode, callback, debugCallback) {
                return this.parse(source).adminMode(adminMode).onFinish(callback).onDebug(debugCallback);
            };

            Parser.prototype.parseSources = function (sources, adminMode, callback) {
                var _this = this;
                util.future.map(sources, function (source) {
                    _this.parse(source).adminMode(adminMode);
                });

                if (callback) {
                    this.finalize(callback);
                }
            };

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
            Parser.prototype.finalize = function (callback) {
                var _this = this;
                util.future.run(function () {
                    var times = {
                        finalise: 0,
                        print: 0
                    };

                    var output = _this.validator.finaliseProgram(times);
                    var result = new Result(output, _this.validator.getErrors());

                    util.future.runFun(function () {
                        callback(result, times);
                    });
                });
            };
            return Parser;
        })();
        main.Parser = Parser;

        /**
        * Result
        *
        * Handles creation and the structures for the object you get back from the parser.
        *
        * Essentially anything which crosses from the parser to the caller is stored and
        * handled by the contents of this script.
        */
        var Result = (function () {
            function Result(program, errors) {
                this.program = program;
                this.errors = errors;

                // default error behaviour
                this.onErrorFun = function (ex) {
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
            Result.prototype.setOnError = function (fun) {
                this.onErrorFun = fun;

                return this;
            };

            /**
            * @return Returns the Quby application in it's compiled JavaScript form.
            */
            Result.prototype.getCode = function () {
                return this.program;
            };

            /**
            * @return True if there were errors within the result, otherwise false if there are no errors.
            */
            Result.prototype.hasErrors = function () {
                return this.errors.length > 0;
            };

            Result.prototype.getErrors = function () {
                return this.errors;
            };

            Result.prototype.runOrDisplayErrors = function () {
                if (this.hasErrors()) {
                    this.displayErrors();
                } else {
                    this.run();
                }
            };

            /**
            * This will display all of the errors within the
            * current web page.
            *
            * This is meant for development purposes.
            */
            Result.prototype.displayErrors = function () {
                var errors = this.getErrors();

                var iframe = new HTMLIFrameElement();
                iframe.setAttribute('width', '800px');
                iframe.setAttribute('height', '400px');
                iframe.setAttribute('frameborder', '0');
                iframe.setAttribute('src', 'about:blank');

                iframe.style.transition = iframe.style['OTransition'] = iframe.style['MsTransition'] = iframe.style['MozTransition'] = iframe.style['WebkitTransition'] = 'opacity 200ms linear';

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
                    var iDoc = (iframe.contentWindow || iframe.contentDocument);
                    if (iDoc['document']) {
                        iDoc = iDoc['document'];
                    }

                    var html = [];

                    html.push('<div style="background: rgba(0,0,0,0.5); border-radius: 4px; width: 100%; height: 100%; position: absolute; top: 0; left: 0;">');
                    html.push('<div style="width: 700px; margin: 12px auto; scroll: auto; color: whitesmoke; font-family: \'DejaVu Sans Mono\', monospaced; font-size: 14px;">');
                    var currentName = null;

                    for (var i = 0; i < errors.length; i++) {
                        var error = errors[i], name = error.name;

                        if (currentName !== name) {
                            html.push('<h1>');
                            html.push(util.str.htmlToText(name));
                            html.push('</h1>');

                            currentName = name;
                        }

                        html.push('<div style="width: 100%">');
                        html.push(error.message);
                        html.push('</div>');
                    }
                    html.push('</div>');
                    html.push('</div>');

                    var iBody = iDoc.getElementsByTagName('body')[0];
                    iBody.innerHTML = html.join('');
                    iBody.style.margin = '0';
                    iBody.style.padding = '0';

                    iframe.style.opacity = '1';
                };

                var body = document.getElementsByTagName('body')[0];
                if (body) {
                    body.appendChild(iframe);
                } else {
                    setTimeout(function () {
                        document.getElementsByTagName('body')[0].appendChild(iframe);
                    }, 1000);
                }
            };

            /**
            * This is boiler plate to call quby.runtime.runCode for you using the
            * code stored in this Result object and the onError function set.
            */
            Result.prototype.run = function () {
                if (!this.hasErrors()) {
                    quby.runtime.runCode(this.getCode(), this.onErrorFun);
                }
            };
            return Result;
        })();
        main.Result = Result;
    })(quby.main || (quby.main = {}));
    var main = quby.main;
})(quby || (quby = {}));
///<reference path='../quby.ts' />
"use strict";
var quby;
(function (quby) {
    (function (parser) {
        /**
        * quby.parse
        *
        * This is the parser interface for Quby. This parses given source code, and
        * then builds an abstract tree (or errors) describing it.
        *
        * In many ways this is glue code, as it uses:
        *  - parse.js for parsing
        *  - quby.ast for building the AST
        *
        * It is also built to have it's work lined across multiple time intervals. That
        * way it won't freeze the CPU.
        *
        * All of this is provided through one function: quby.parse.parse
        */
        var log = function () {
            if (window['console'] && window['console']['log']) {
                window['console']['log'].apply(window['console'], arguments);
            }
        };

        /**
        * ASCII codes for characters.
        *
        * @type {number}
        * @const
        */
        var TAB = 9, SLASH_N = 10, SLASH_R = 13, SPACE = 32, EXCLAMATION = 33, DOUBLE_QUOTE = 34, HASH = 35, DOLLAR = 36, PERCENT = 37, AMPERSAND = 38, SINGLE_QUOTE = 39, LEFT_PAREN = 40, RIGHT_PAREN = 41, STAR = 42, PLUS = 43, COMMA = 44, MINUS = 45, FULL_STOP = 46, SLASH = 47, ZERO = 48, ONE = 49, TWO = 50, THREE = 51, FOUR = 52, FIVE = 53, SIX = 54, SEVEN = 55, EIGHT = 56, NINE = 57, COLON = 58, SEMI_COLON = 59, LESS_THAN = 60, EQUAL = 61, GREATER_THAN = 62, QUESTION_MARK = 63, AT = 64, LEFT_SQUARE = 91, BACKSLASH = 92, RIGHT_SQUARE = 93, CARET = 94, UNDERSCORE = 95, LOWER_A = 97, LOWER_B = 98, LOWER_C = 99, LOWER_D = 100, LOWER_E = 101, LOWER_F = 102, LOWER_G = 103, LOWER_H = 104, LOWER_I = 105, LOWER_J = 106, LOWER_K = 107, LOWER_L = 108, LOWER_M = 109, LOWER_N = 110, LOWER_O = 111, LOWER_P = 112, LOWER_Q = 113, LOWER_R = 114, LOWER_S = 115, LOWER_T = 116, LOWER_U = 117, LOWER_V = 118, LOWER_W = 119, LOWER_X = 120, LOWER_Y = 121, LOWER_Z = 122, LEFT_BRACE = 123, BAR = 124, RIGHT_BRACE = 125, TILDA = 126;

        /**
        * Returns true if the character code given
        * is an alphanumeric character.
        *
        * @nosideeffects
        * @const
        * @param {number} code
        * @return {boolean}
        */
        var isAlphaNumericCode = function (code) {
            return ((code >= LOWER_A && code <= LOWER_Z) || (code === UNDERSCORE) || (code >= ZERO && code <= NINE));
        };

        var isAlphaCode = function (code) {
            return (code >= LOWER_A && code <= LOWER_Z);
        };

        /**
        * Returns true if the character in src,
        * at i, is not a lower case letter, underscore or number.
        *
        * @nosideeffects
        * @const
        * @param {string} src
        * @param {number} i
        * @return {boolean}
        */
        var isAlphaNumeric = function (src, i) {
            var code = src.charCodeAt(i + src.length);

            return isAlphaNumericCode(code);
        };

        /* Terminals */
        /**
        * Makes minor changes to the source code to get it ready for parsing.
        *
        * This is primarily a cheap fix to a number of parser bugs where it expects an
        * end of line character. This method is for wrapping all of these cheap fixes
        * into one place.
        *
        * It is intended that this method only makes minor changes which results in
        * source code which is still entirely valid. It should make any major changes.
        *
        * @param source The source code to prep.
        */
        var preParse = (function () {
            var pushWhitespace = function (newSrc, size) {
                var diff5 = (size / 5) | 0;

                for (var i = 0; i < diff5; i++) {
                    newSrc.push('     ');
                }

                // then push on the remainder
                var remainder = size % 5;
                if (remainder === 1) {
                    newSrc.push(' ');
                } else if (remainder === 2) {
                    newSrc.push('  ');
                } else if (remainder === 3) {
                    newSrc.push('   ');
                } else if (remainder === 4) {
                    newSrc.push('    ');
                }
            };

            var getLeft = function (src, i) {
                if (i > 0) {
                    return src.charCodeAt(i - 1);
                } else {
                    return -1;
                }
            };

            var getRight = function (src, i) {
                return getR(src, i + 1);
            };

            var getR = function (src, i) {
                if (i < src.length) {
                    return src.charCodeAt(i);
                } else {
                    return -1;
                }
            };

            /**
            * alterations:
            *  : removes comments
            *      // single line comments
            *      / * * / multi-line comments
            */
            var stripComments = function (src) {
                var inAdmin = false;
                var inPreAdmin = false;
                var inSingleComment = false;
                var inDoubleString = false;
                var inSingleString = false;

                /**
                * This is a count so we can track nested comments.
                *
                * When it is 0, there is no comment. When it is greater than 0, we
                * are in a comment.
                */
                var multiCommentCount = 0, newSrc = [], startI = 0;

                for (var i = 0, len = src.length; i < len; i++) {
                    var c = src.charCodeAt(i);

                    // these are in order of precedence
                    if (inAdmin) {
                        if (c === HASH && getR(src, i + 1) === GREATER_THAN && getR(src, i + 2) === HASH) {
                            inAdmin = false;
                            i += 2;
                        }
                    } else if (inPreAdmin) {
                        if (c === HASH && getR(src, i + 1) === GREATER_THAN && getR(src, i + 2) === HASH) {
                            inPreAdmin = false;
                            i += 2;
                        }
                    } else if (inDoubleString) {
                        if (c === DOUBLE_QUOTE && getLeft(src, i) !== BACKSLASH) {
                            inDoubleString = false;
                        }
                    } else if (inSingleString) {
                        if (c === SINGLE_QUOTE && getLeft(src, i) !== BACKSLASH) {
                            inSingleString = false;
                        }
                    } else if (inSingleComment) {
                        if (c === SLASH_N) {
                            inSingleComment = false;
                            pushWhitespace(newSrc, i - startI);
                            startI = i;
                        }
                    } else if (multiCommentCount > 0) {
                        if (c === SLASH && getRight(src, i) === STAR) {
                            multiCommentCount++;
                        } else if (c === STAR && getRight(src, i) === SLASH) {
                            multiCommentCount--;

                            // +1 so we include this character too
                            i++;

                            if (multiCommentCount === 0) {
                                pushWhitespace(newSrc, (i - startI) + 1);
                                startI = i + 1;
                            }
                        }
                    } else {
                        /*
                        * Look to enter a new type of block,
                        * such as comments, strings, inlined-JS code.
                        */
                        // multi-line comment
                        if (c === SLASH && getRight(src, i) === STAR) {
                            newSrc.push(src.substring(startI, i));

                            startI = i;
                            i++;

                            multiCommentCount++;
                        } else if (c === SLASH && getRight(src, i) === SLASH) {
                            newSrc.push(src.substring(startI, i));

                            startI = i;
                            inSingleComment = true;

                            i++;
                            // look for strings
                        } else if (c === DOUBLE_QUOTE) {
                            inDoubleString = true;
                        } else if (c === SINGLE_QUOTE) {
                            inSingleString = true;
                        } else if (c === HASH) {
                            if (getR(src, i + 1) === LESS_THAN && getR(src, i + 2) === HASH) {
                                inAdmin = true;

                                i += 2;
                            } else if (getR(src, i + 1) === LESS_THAN && getR(src, i + 2) === LOWER_P && getR(src, i + 3) === LOWER_R && getR(src, i + 4) === LOWER_E && getR(src, i + 5) === HASH) {
                                inPreAdmin = true;

                                i += 5;
                            }
                        }
                    }
                }

                if (multiCommentCount > 0 || inSingleComment) {
                    pushWhitespace(newSrc, src.length - startI);
                } else {
                    newSrc.push(src.substring(startI));
                }

                // this should always be the case, but just incase it isn't ...
                if (newSrc.length > 0) {
                    return newSrc.join('');
                } else {
                    return src;
                }
            };

            /**
            * Alterations:
            *  : makes the source code lower case
            *  : removes white space from the start of the source code
            *  : changes \t to ' '
            *  : replaces all '\r's with '\n's
            *  : ensures all closing braces have an end of line before them
            *  : ensures all 'end' keywords have an end of line before them
            */
            var preScanParse = function (source) {
                source = source.toLowerCase().replace(/\t/g, ' ').replace(/\r/g, '\n');

                return source;

                var i = 0;
                for (var i = 0; i < source.length; i++) {
                    var c = source.charCodeAt(i);

                    if (c !== SLASH_N && c !== SPACE) {
                        break;
                    }
                }

                if (i > 0) {
                    var newStr = [];
                    pushWhitespace(newStr, i);
                    newStr.push(source);

                    return newStr.join('');
                } else {
                    return source;
                }
            };

            return function (src) {
                return stripComments(preScanParse(src));
            };
        })();

        parse.ignore(parse.terminal.WHITESPACE);

        /**
        * WARNING! The terminal names used here are also used for display purposes.
        *          So give them meaningful names!
        */
        var terminals = parse.terminals({
            /**
            * Matches an end of line,
            * and also chomps on whitespace.
            *
            * If it contains a semi-colon however,
            * this will fail.
            */
            endOfLine: function (src, origI, code, len) {
                var i = origI;

                if (code === SLASH_N) {
                    do {
                        code = src.charCodeAt(++i);
                    } while(code === SLASH_N || code === SPACE || code === TAB);

                    if (src.charCodeAt(i) !== SEMI_COLON) {
                        return i;
                    }
                }

                return origI;
            },
            /**
            * Matches the semi-colon, or end of line.
            *
            * Due to the order of terminals, the end
            * of line always has precedence.
            *
            * Also chomps on whitespace and end of lines,
            * both before and after the semi-colon.
            */
            endOfStatement: function (src, i, code, len) {
                if (code === SEMI_COLON || code === SLASH_N) {
                    do {
                        code = src.charCodeAt(++i);
                    } while(code === SLASH_N || code === SEMI_COLON || code === SPACE || code === TAB);
                }

                return i;
            },
            keywords: {
                DO: 'do',
                END: 'end',
                IF: 'if',
                ELSE: 'else',
                ELSIF: 'elsif',
                ELSEIF: 'elseif',
                ELSE_IF: 'else if',
                THEN: 'then',
                WHILE: 'while',
                UNTIL: 'until',
                LOOP: 'loop',
                DEF: 'def',
                NEW: 'new',
                CLASS: 'class',
                MODULE: 'module',
                RETURN: 'return',
                YIELD: 'yield',
                THIS: 'this',
                CASE: 'case',
                WHEN: 'when',
                BREAK: 'break',
                CONTINUE: 'continue'
            },
            symbols: {
                comma: ',',
                at: '@',
                leftBracket: '(',
                rightBracket: ')',
                leftBrace: '{',
                rightBrace: '}',
                leftSquare: '[',
                rightSquare: ']'
            },
            literals: {
                TRUE: 'true',
                FALSE: 'false',
                NULL: 'null',
                NIL: 'nil',
                JSUndefined: '#undefined',
                JSNull: '#null',
                symbol: function (src, i, code, len) {
                    if (code === COLON) {
                        code = src.charCodeAt(i + 1);

                        if ((code >= 97 && code <= 122) || (code === UNDERSCORE)) {
                            i += 2;

                            while (isAlphaNumericCode(src.charCodeAt(i))) {
                                i++;
                            }
                        }
                    }

                    return i;
                },
                /**
                * This will match very generic numbers, that are 'number-like' but not neccessarilly
                * correct.
                *
                * For example it will match the hex value '0xzzz', even though there are no z's in
                * hexadecimal.
                *
                * This is so they are validated later, and can give a much more intelligent error
                * message.
                */
                number: function (src, i, code, len) {
                    if (ZERO <= code && code <= NINE) {
                        do {
                            code = src.charCodeAt(++i);
                        } while(code === UNDERSCORE || (ZERO <= code && code <= NINE) || (LOWER_A <= code && code <= LOWER_Z));

                        // look for a decimal
                        if (src.charCodeAt(i) === FULL_STOP) {
                            code = src.charCodeAt(i + 1);

                            if (ZERO <= code && code <= NINE) {
                                i++;

                                do {
                                    code = src.charCodeAt(++i);
                                } while(code === UNDERSCORE || (ZERO <= code && code <= NINE) || (LOWER_A <= code && code <= LOWER_Z));
                            }
                        }

                        return i;
                    } else {
                        return 0;
                    }
                },
                string: parse.terminal.STRING
            },
            ops: {
                power: '**',
                divide: '/',
                multiply: '*',
                plus: '+',
                subtract: '-',
                modulus: '%',
                colon: function (src, i, code, len) {
                    if (code === COLON) {
                        code = src.charCodeAt(i + 1);

                        if ((code < 97 || code > 122) && (code !== UNDERSCORE)) {
                            return i + 1;
                        }
                    }

                    return i;
                },
                mapArrow: '=>',
                equal: '==',
                notEqual: '!=',
                shiftLeft: '<<',
                shiftRight: '>>',
                lessThanEqual: '<=',
                greaterThanEqual: '>=',
                lessThan: '<',
                greaterThan: '>',
                assignment: '=',
                dot: '.',
                hash: '#',
                logicalAnd: ['&&', 'and'],
                logicalOr: ['||', 'or'],
                not: ['!', 'not'],
                bitwiseAnd: '&',
                bitwiseOr: '|'
            },
            identifiers: {
                variableName: function (src, i, code, len) {
                    if ((code >= 97 && code <= 122) || (code === UNDERSCORE)) {
                        while (isAlphaNumericCode(src.charCodeAt(++i))) {
                        }
                        return i;
                    }

                    return 0;
                },
                global: function (src, i, code, len) {
                    if (code === DOLLAR) {
                        while (isAlphaNumericCode(src.charCodeAt(++i))) {
                        }
                        return i;
                    }

                    return 0;
                },
                objectField: function (src, i, code, len) {
                    if (code === AT) {
                        while (isAlphaNumericCode(src.charCodeAt(++i))) {
                        }
                        return i;
                    }

                    return 0;
                }
            },
            admin: {
                hashDef: '#def',
                jsInstanceOf: '#instanceof',
                jsTypeOf: '#typeof',
                inline: '#<#',
                preInline: '#<pre#'
            }
        });

        /*
        * Remove the end of lines after certain symbols.
        */
        var applySymbolMatch = function (syms, event) {
            if (syms.symbolMatch) {
                syms.symbolMatch(event);
            } else {
                for (var k in syms) {
                    applySymbolMatch(syms[k], event);
                }
            }
        };

        applySymbolMatch([
            terminals.ops,
            terminals.keywords.DO,
            terminals.keywords.IF,
            terminals.keywords.ELSE,
            terminals.keywords.ELSIF,
            terminals.keywords.ELSEIF,
            terminals.keywords.ELSE_IF,
            terminals.keywords.WHILE,
            terminals.keywords.UNTIL,
            terminals.keywords.LOOP,
            terminals.keywords.NEW,
            terminals.symbols.comma,
            terminals.symbols.leftBracket,
            terminals.symbols.leftBrace,
            terminals.symbols.leftSquare
        ], function (src, i, code, len) {
            while (code === SPACE || code === SLASH_N || code === TAB) {
                code = src.charCodeAt(++i);
            }

            return i;
        });

        var inlinePostMatch = function (src, i, code, len) {
            do {
                i += 3;

                code = src.charCodeAt(i);

                if (code === HASH) {
                    // land at the end of the closing section
                    if (src.charCodeAt(i - 1) === GREATER_THAN && src.charCodeAt(i - 2) === HASH) {
                        return i + 1;
                        // land at the beginning
                    } else if (src.charCodeAt(i + 1) === GREATER_THAN && src.charCodeAt(i + 2) === HASH) {
                        return i + 3;
                    }
                    // land in the middle
                } else if (code === GREATER_THAN && src.charCodeAt(i - 1) === HASH && src.charCodeAt(i + 1) === HASH) {
                    return i + 2;
                }
            } while(i < len);

            return len;
        };

        terminals.admin.inline.symbolMatch(inlinePostMatch);
        terminals.admin.preInline.symbolMatch(inlinePostMatch);

        /*
        * The values returned after it has been matched, when the symbol is
        * evaluated, and begins being turned into the AST.
        */
        terminals.endOfStatement.onMatch(function () {
            return null;
        });

        terminals.symbols.comma.onMatch(function () {
            return null;
        });

        /* The onMatch callbacks for altering the symbols when matched. */
        terminals.literals.TRUE.onMatch(function (symbol) {
            return new quby.ast.BoolTrue(symbol);
        });
        terminals.literals.FALSE.onMatch(function (symbol) {
            return new quby.ast.BoolFalse(symbol);
        });
        terminals.literals.NULL.onMatch(function (symbol) {
            return new quby.ast.Null(symbol);
        });
        terminals.literals.NIL.onMatch(function (symbol) {
            return new quby.ast.Null(symbol);
        });
        terminals.literals.JSUndefined.onMatch(function (symbol) {
            return new quby.ast.JSUndefined(symbol);
        });
        terminals.literals.JSNull.onMatch(function (symbol) {
            return new quby.ast.JSNull(symbol);
        });
        terminals.literals.symbol.onMatch(function (symbol) {
            return new quby.ast.Symbol(symbol);
        });
        terminals.literals.string.onMatch(function (symbol) {
            return new quby.ast.String(symbol);
        });
        terminals.literals.number.onMatch(function (symbol) {
            return new quby.ast.Number(symbol);
        });

        terminals.admin.inline.onMatch(function (symbol) {
            return new quby.ast.Inline(symbol);
        });
        terminals.admin.preInline.onMatch(function (symbol) {
            return new quby.ast.PreInline(symbol);
        });

        var ops = terminals.ops;

        /* Parser Rules */
        var statementSeperator = parse.name('end of statement').either(terminals.endOfLine, terminals.endOfStatement);

        var statement = parse.rule(), expr = parse.rule();

        var repeatStatement = parse.repeatSeperator(statement, statementSeperator);

        var statements = parse.name('statements').optional(statementSeperator).optional(repeatStatement).optional(statementSeperator).onMatch(function (onStart, stmts, endEnd) {
            if (stmts === null) {
                return null;
            } else {
                return new quby.ast.Statements(stmts);
            }
        });

        var exprs = parse.name('expressions').repeatSeperator(expr, terminals.symbols.comma).onMatch(function (exprs) {
            if (exprs !== null) {
                return new quby.ast.Parameters(exprs);
            } else {
                return null;
            }
        });

        var variable = parse.either(terminals.identifiers, terminals.keywords.THIS, parse.a(terminals.ops.hash).either(terminals.identifiers.variableName, terminals.identifiers.global).onMatch(function (hash, name) {
            return new quby.ast.JSVariable(name);
        })).onMatch(function (identifier) {
            var term = identifier.terminal;

            if (term === terminals.identifiers.variableName) {
                return new quby.ast.LocalVariable(identifier);
            } else if (term === terminals.identifiers.objectField) {
                return new quby.ast.FieldVariable(identifier);
            } else if (term === terminals.identifiers.global) {
                return new quby.ast.GlobalVariable(identifier);
            } else if (term === terminals.keywords.THIS) {
                return new quby.ast.ThisVariable(identifier);
            } else if (identifier instanceof quby.ast.JSVariable) {
                return identifier;
            } else {
                log(identifier);
                throw new Error("Unknown terminal met for variable: " + identifier);
            }
        });

        var arrayAccessExtension = parse.name('array access').a(terminals.symbols.leftSquare, expr).optional(terminals.endOfLine).then(terminals.symbols.rightSquare).onMatch(function (leftSquare, keyExpr, endOfLine, rightSquare) {
            return new quby.ast.ArrayAccess(null, keyExpr);
        });

        var singleOpExpr = parse.name('operator').either(terminals.ops.plus, terminals.ops.subtract, terminals.ops.not, terminals.admin.jsTypeOf).then(expr).onMatch(function (op, expr) {
            var term = op.terminal;

            if (term === ops.not) {
                return new quby.ast.Not(expr);
            } else if (term === ops.subtract) {
                return new quby.ast.SingleSub(expr);
            } else if (term === ops.plus) {
                return expr;
            } else if (term === terminals.admin.jsTypeOf) {
                return new quby.ast.JSTypeOf(expr);
            } else {
                log(op);
                throw new Error("Unknown singleOpExpr match");
            }
        });

        var arrayLiteral = parse.name('new Array').optional(terminals.ops.hash).then(terminals.symbols.leftSquare).optional(exprs).optional(terminals.endOfLine).then(terminals.symbols.rightSquare).onMatch(function (hash, lSquare, exprs, endOfLine, rSquare) {
            if (hash !== null) {
                return new quby.ast.JSArrayLiteral(exprs);
            } else {
                return new quby.ast.ArrayLiteral(exprs);
            }
        });

        var hashMapping = parse.name('hash mapping').a(expr).either(terminals.ops.colon, terminals.ops.mapArrow).then(expr).onMatch(function (left, mapAssign, right) {
            return new quby.ast.Mapping(left, right);
        });

        var hashLiteral = parse.name('new hash literal').then(terminals.symbols.leftBrace).optionalSeperator(hashMapping, terminals.symbols.comma).optional(terminals.endOfLine).then(terminals.symbols.rightBrace).onMatch(function (lBrace, mappings, endOfLine, rBrace) {
            if (mappings !== null) {
                mappings = new quby.ast.Mappings(mappings);
            }

            return new quby.ast.HashLiteral(mappings);
        });

        var jsHashMapping = parse.name('js hash mapping').a(expr).either(terminals.ops.colon, terminals.ops.mapArrow).then(expr).onMatch(function (left, mapAssign, right) {
            return new quby.ast.JSMapping(left, right);
        });

        var jsHashLiteral = parse.name('new JS hash literal').a(terminals.ops.hash).then(terminals.symbols.leftBrace).optionalSeperator(jsHashMapping, terminals.symbols.comma).optional(terminals.endOfLine).then(terminals.symbols.rightBrace).onMatch(function (hash, lBrace, mappings, endOfLine, rBrace) {
            if (mappings !== null) {
                mappings = new quby.ast.Mappings(mappings);
            }

            return new quby.ast.JSObjectLiteral(mappings);
        });

        var yieldExpr = parse.name('yield').a(terminals.keywords.YIELD).optional(exprs).onMatch(function (yld, exprs) {
            if (exprs !== null) {
                return new quby.ast.YieldStmt(exprs, exprs);
            } else {
                return new quby.ast.YieldStmt(yld);
            }
        });

        var returnStatement = parse.name('return').a(terminals.keywords.RETURN).optional(expr).onMatch(function (rtn, expr) {
            if (expr !== null) {
                return new quby.ast.ReturnStmt(expr);
            } else {
                return new quby.ast.ReturnStmt(new quby.ast.Null(rtn));
            }
        });

        /*
        * ### Expressions ###
        */
        var parameterFields = parse.repeatSeperator(parse.either(variable, parse.a(terminals.ops.bitwiseAnd, terminals.identifiers.variableName).onMatch(function (bitAnd, name) {
            return new quby.ast.ParameterBlockVariable(name);
        })), terminals.symbols.comma).onMatch(function (params) {
            if (params !== null) {
                return new quby.ast.Parameters(params);
            } else {
                return null;
            }
        });

        /**
        * These are the definitions for parameters for a function, method or lamda.
        * It includes the brackets!!
        *
        * Syntax Examples:
        *  ()              - no parameters
        *  ( a, b, c )     - 3 parameters
        *  ( &block )      - 1 block parameter
        *  ( a, b, &c )    - 2 parameters, 1 block
        *  ( &a, &b, &c )  - 3 block parameters, although incorrect, this is allowed here
        */
        var parameterDefinition = parse.name('parameters').either(parse.a(terminals.symbols.leftBracket).optional(parameterFields).optional(terminals.endOfLine).then(terminals.symbols.rightBracket).onMatch(function (lParen, params, end, rParen) {
            return params;
        }), parse.a(parameterFields), parse.a(statementSeperator).onMatch(function () {
            return null;
        }));

        /**
        * Theser are the expressions used as parameters, such as for a function call.
        * It is essentially a list of optional expressions, surrounded by brackets.
        *
        * Syntax Examples:
        *  ()                      - no parameters
        *  ( a, b, c )             - 3 parameters, all variables
        *  ( x, 2, 5*4 )           - 3 parameters, two numbers, 1 a variable
        *  ( "john", lastName() )  - a string and a function call
        */
        var parameterExprs = parse.name('expressions').a(terminals.symbols.leftBracket).optional(exprs).optional(terminals.endOfLine).then(terminals.symbols.rightBracket).onMatch(function (lParen, exprs, end, rParen) {
            if (exprs !== null) {
                return exprs;
            } else {
                return null;
            }
        });

        var blockParamVariables = parse.repeatSeperator(variable, terminals.symbols.comma);

        var blockParams = parse.name('block parameters').a(terminals.ops.bitwiseOr).optional(blockParamVariables).optional(terminals.endOfLine).then(terminals.ops.bitwiseOr).onMatch(function (lOr, params, end, rOr) {
            if (params !== null) {
                return new quby.ast.Parameters(params);
            } else {
                return null;
            }
        });

        var block = parse.name('block').either(terminals.symbols.leftBrace, terminals.keywords.DO).optional(blockParams).optional(statements).thenEither(terminals.symbols.rightBrace, terminals.keywords.END).onMatch(function (lBrace, params, stmts, rBrace) {
            var block = new quby.ast.FunctionBlock(params, stmts);

            /*
            * If the opening and closing braces do not match,
            * give a warning.
            *
            * Things that will warn are:
            *     do }
            *     { end
            *
            * This is a relic from the old parser,
            * and supported only to avoid breaking
            * working games.
            */
            if ((lBrace.terminal === terminals.symbols.leftBrace) !== (rBrace.terminal === terminals.symbols.rightBrace)) {
                block.setMismatchedBraceWarning();
            }

            return block;
        });

        var lambda = parse.name('lambda').a(terminals.keywords.DEF, parameterDefinition).optional(statements).then(terminals.keywords.END).onMatch(function (def, params, stmts, end) {
            return new quby.ast.Lambda(params, stmts);
        });

        var functionCall = parse.name('function call').optional(terminals.ops.hash).then(terminals.identifiers.variableName).then(parameterExprs).optional(block).onMatch(function (hash, name, exprs, block) {
            if (hash !== null) {
                return new quby.ast.JSFunctionCall(name, exprs, block);
            } else {
                if (name.getLower() === quby.runtime.SUPER_KEYWORD) {
                    return new quby.ast.SuperCall(name, exprs, block);
                } else {
                    return new quby.ast.FunctionCall(name, exprs, block);
                }
            }
        });

        var jsExtension = parse.a(terminals.ops.hash).either(terminals.identifiers.variableName, terminals.identifiers.global).optional(parse.a(parameterExprs).optional(block).onMatch(function (exprs, block) {
            return { exprs: exprs, block: block };
        })).onMatch(function (hash, name, exprsBlock) {
            if (exprsBlock) {
                return new quby.ast.JSMethodCall(null, name, exprsBlock.exprs, exprsBlock.block);
            } else {
                return new quby.ast.JSProperty(null, name);
            }
        });

        var methodCallExtension = parse.a(terminals.ops.dot).optional(terminals.ops.hash).then(terminals.identifiers.variableName).then(parameterExprs).optional(block).onMatch(function (dot, hash, name, exprs, block) {
            if (hash === null) {
                return new quby.ast.MethodCall(null, name, exprs, block);
            } else {
                return new quby.ast.JSMethodCall(null, name, exprs, block);
            }
        });

        var newInstance = parse.name('new object').a(terminals.keywords.NEW).either(parse.a(terminals.identifiers.variableName).then(parameterExprs).optional(block).onMatch(function (name, params, block) {
            return new quby.ast.NewInstance(name, params, block);
        }), parse.a(expr).onMatch(function (expr) {
            return new quby.ast.JSNewInstance(expr);
        })).onMatch(function (nw, newInstance) {
            return newInstance;
        });

        var exprInParenthesis = parse.a(terminals.symbols.leftBracket).then(expr).optional(terminals.endOfLine).then(terminals.symbols.rightBracket).onMatch(function (left, expr, endOfLine, right) {
            return new quby.ast.ExprParenthesis(expr);
        });

        /**
        * These add operations on to the end of an expr.
        *
        * For example take the code: '3 + 5'. This would
        * make up the rules for the '+ 5' bit, which is
        * tacked on after '3'.
        *
        * That is then rebalanced later in the AST.
        */
        var exprExtension = parse.rule();
        exprExtension.either(parse.either(methodCallExtension, arrayAccessExtension, jsExtension).optional(exprExtension).onMatch(function (left, ext) {
            if (ext === null) {
                return left;
            } else {
                ext.appendLeft(left);
                return ext;
            }
        }), parse.either(ops.plus, ops.subtract, ops.divide, ops.multiply, ops.logicalAnd, ops.logicalOr, ops.equal, ops.notEqual, ops.modulus, ops.lessThan, ops.greaterThan, ops.lessThanEqual, ops.greaterThanEqual, ops.shiftLeft, ops.shiftRight, ops.bitwiseAnd, ops.bitwiseOr, ops.power, ops.assignment, terminals.admin.jsInstanceOf).then(expr).onMatch(function (op, right) {
            var term = op.terminal;

            if (term === ops.assignment) {
                return new quby.ast.Assignment(null, right);
            } else if (term === ops.plus) {
                return new quby.ast.Add(null, right);
            } else if (term === ops.subtract) {
                return new quby.ast.Sub(null, right);
            } else if (term === ops.divide) {
                return new quby.ast.Divide(null, right);
            } else if (term === ops.multiply) {
                return new quby.ast.Mult(null, right);
            } else if (term === ops.logicalAnd) {
                return new quby.ast.BoolAnd(null, right);
            } else if (term === ops.logicalOr) {
                return new quby.ast.BoolOr(null, right);
            } else if (term === ops.equal) {
                return new quby.ast.Equality(null, right);
            } else if (term === ops.notEqual) {
                return new quby.ast.NotEquality(null, right);
            } else if (term === ops.modulus) {
                return new quby.ast.Mod(null, right);
            } else if (term === ops.lessThan) {
                return new quby.ast.LessThan(null, right);
            } else if (term === ops.greaterThan) {
                return new quby.ast.GreaterThan(null, right);
            } else if (term === ops.lessThanEqual) {
                return new quby.ast.LessThanEqual(null, right);
            } else if (term === ops.greaterThanEqual) {
                return new quby.ast.GreaterThanEqual(null, right);
            } else if (term === ops.shiftLeft) {
                return new quby.ast.ShiftLeft(null, right);
            } else if (term === ops.shiftRight) {
                return new quby.ast.ShiftRight(null, right);
            } else if (term === ops.bitwiseAnd) {
                return new quby.ast.BitAnd(null, right);
            } else if (term === ops.bitwiseOr) {
                return new quby.ast.BitOr(null, right);
            } else if (term === terminals.admin.jsInstanceOf) {
                return new quby.ast.JSInstanceOf(null, right);
            } else if (term === ops.power) {
                return new quby.ast.Power(null, right);
            } else {
                throw Error("Unknown op given: " + op);
            }
        }));

        expr.name('expression').either(singleOpExpr, arrayLiteral, hashLiteral, jsHashLiteral, yieldExpr, exprInParenthesis, newInstance, functionCall, variable, lambda, terminals.literals, terminals.admin.inline, terminals.admin.preInline).optional(exprExtension).onMatch(function (expr, rest) {
            if (rest !== null) {
                rest.appendLeft(expr);

                return rest;
            } else {
                return expr;
            }
        });

        /*
        * Declarations
        */
        var classHeader = parse.name('class header').a(terminals.identifiers.variableName).optional(parse.a(terminals.ops.lessThan, terminals.identifiers.variableName).onMatch(function (lessThan, superClass) {
            return superClass;
        })).onMatch(function (name, superClass) {
            return new quby.ast.ClassHeader(name, superClass);
        });

        var moduleDeclaration = parse.name('Module').a(terminals.keywords.MODULE).then(terminals.identifiers.variableName).optional(statements).then(terminals.keywords.END).onMatch(function (keyModule, name, stmts, end) {
            return new quby.ast.ModuleDeclaration(name, stmts);
        });

        var classDeclaration = parse.name('Class Declaration').a(terminals.keywords.CLASS).then(classHeader).optional(statements).then(terminals.keywords.END).onMatch(function (klass, header, stmts, end) {
            if (quby.runtime.isCoreClass(header.getName().toLowerCase())) {
                return new quby.ast.ExtensionClassDeclaration(header, stmts);
            } else {
                return new quby.ast.ClassDeclaration(header, stmts);
            }
        });

        var functionDeclaration = parse.name('Function Declaration').either(terminals.keywords.DEF, terminals.admin.hashDef).thenEither(terminals.keywords.NEW, terminals.identifiers.variableName).then(parameterDefinition).optional(statements).then(terminals.keywords.END).onMatch(function (def, name, params, stmts, end) {
            if (def.terminal === terminals.keywords.DEF) {
                // 'new' method, class constructor
                if (name.terminal === terminals.keywords.NEW) {
                    return new quby.ast.Constructor(name, params, stmts);
                    // normal function
                } else {
                    return new quby.ast.FunctionDeclaration(name, params, stmts);
                }
                // admin method
            } else {
                return new quby.ast.AdminMethod(name, params, stmts);
            }
        });

        /*
        * Statements
        */
        var ifStart = parse.name('if statement').a(terminals.keywords.IF).then(expr).optional(terminals.keywords.THEN).then(statements).onMatch(function (IF, condition, THEN, stmts) {
            return new quby.ast.IfBlock(condition, stmts);
        });

        var ifElseIf = parse.name('else-if statement').either(terminals.keywords.ELSE_IF, terminals.keywords.ELSEIF, terminals.keywords.ELSIF).then(expr).optional(terminals.keywords.THEN).then(statements).onMatch(function (elseIf, condition, then, stmts) {
            return new quby.ast.IfBlock(condition, stmts);
        });

        var ifElseIfs = parse.repeat(ifElseIf).name('else-if statements').onMatch(function (elseIfs) {
            return new quby.ast.IfElseIfs(elseIfs);
        });

        var elseClause = parse.name('else statement').a(terminals.keywords.ELSE, statements).onMatch(function (els, stmts) {
            return stmts;
        });

        var ifStatement = parse.name('if statement').a(ifStart).optional(ifElseIfs).optional(elseClause).then(terminals.keywords.END).onMatch(function (start, otherIfs, elses, end) {
            return new quby.ast.IfStmt(start, otherIfs, elses);
        });

        var whileUntilStatement = parse.name('while/until statement').either(terminals.keywords.WHILE, terminals.keywords.UNTIL).then(expr, statements).then(terminals.keywords.END).onMatch(function (whileUntil, expr, stmts, end) {
            if (whileUntil.terminal === terminals.keywords.WHILE) {
                return new quby.ast.WhileLoop(expr, stmts);
            } else {
                return new quby.ast.UntilLoop(expr, stmts);
            }
        });

        var loopStatement = parse.name('loop statement').a(terminals.keywords.LOOP).then(statements).then(terminals.keywords.END).either(terminals.keywords.WHILE, terminals.keywords.UNTIL).then(expr).onMatch(function (loop, stmts, end, whileUntil, expr) {
            if (whileUntil.terminal === terminals.keywords.WHILE) {
                return new quby.ast.LoopWhile(expr, stmts);
            } else {
                return new quby.ast.LoopUntil(expr, stmts);
            }
        });

        var whenStatement = parse.name('when statement').a(terminals.keywords.WHEN).then(exprs).thenEither(terminals.keywords.THEN, statementSeperator).then(statements).onMatch(function (when, exprs, seperator, statements) {
            return new quby.ast.WhenClause(exprs, statements);
        });

        var whenStatements = parse.repeat(whenStatement);

        var caseWhenStatement = parse.name('case-when').a(terminals.keywords.CASE).optional(expr).then(statementSeperator).optional(whenStatements).optional(elseClause).then(terminals.keywords.END).onMatch(function (caseTerm, expr, endOfStmt, whenClauses, elseClause, end) {
            return new quby.ast.CaseWhen(caseTerm, expr, whenClauses, elseClause);
        });

        statement.name('statement').either(functionDeclaration, classDeclaration, moduleDeclaration, ifStatement, whileUntilStatement, loopStatement, caseWhenStatement, returnStatement, expr, terminals.admin.inline, terminals.admin.preInline);

        /**
        * The entry point for the parser, and the only way to interact.
        *
        * Call this, pass in the code, and a callback so your informed
        * about when it's done.
        *
        * Name is picked by you and is used for error reporting. You
        * can use any name you like but typically this should be the
        * name of the file the code comes from. Something else however
        * is also appropriate.
        *
        * @param src The source code to parse.
        * @param name The name of the source code being parsed, i.e. it's file name.
        * @param onFinish The function to call when parsing has finished.
        */
        function parseSource(src, name, onFinish) {
            // print out how long it took to pre-parse the code
            var start = Date.now();
            var codeSrc = preParse(src);
            console.log('.ast.quby.parser', 'pre parse code time: ' + (Date.now() - start));

            statements.parse({
                name: name,
                src: src,
                inputSrc: codeSrc,
                onFinish: onFinish
            });
        }
        parser.parseSource = parseSource;
    })(quby.parser || (quby.parser = {}));
    var parser = quby.parser;
})(quby || (quby = {}));
///<reference path='lib/util.ts' />
"use static";
/*
* These functions are called so often that they exist outside of the quby.runtime
* namespace so they can be as cheap as possible.
*/
/*
* This is called when a method is not found.
*/
function noSuchMethodError(self, callName) {
    var args = Array.prototype.slice.call(arguments, 2);
    var block = args.pop();

    quby.runtime.methodMissingError(self, callName, args, block);
}
;

/**
* This is the yield function. If a block is given then it is called using the
* arguments given. If a negative object is given instead (such as false,
* undefined or null) then a 'missingBlockError' will be thrown.
*
* The intention is that inlined JavaScript can just pass their blocks along
* to this function, and it'll call it the same as it would in normal
* translated Quby code.
*
* Any arguments for the block can be passed in after the first parameter.
*
* @param block The block function to call with this function.
* @return The result from calling the given block.
*/
function quby_callBlock(block, args) {
    if (!block) {
        quby.runtime.missingBlockError();
    } else {
        if (args.length < block.length) {
            quby.runtime.notEnoughBlockParametersError(block.length, args.length, 'block');
        }

        return block.apply(null, args);
    }
}

/**
* Checks if the block given is a block (a function),
* and that it has at _most_ the number of args given.
*
* If either of these conditions fail then an error is thrown.
* Otherwise nothing happens.
*/
function quby_ensureBlock(block, numArgs) {
    if (!(block instanceof Function)) {
        quby.runtime.missingBlockError();
    } else if (numArgs < block.length) {
        quby.runtime.notEnoughBlockParametersError(block.length, numArgs, 'block');
    }
}

/**
* Checks if the value given exists, and if it does then it is returned.
* If it doesn't then an exception is thrown. This is primarily for use with globals.
*
* The given name is for debugging, the name of the variable to show in the error if it doesn't exist.
*
* @param global The global variable to check for existance.
* @param name The name of the global variable given, for debugging purposes.
* @return The global given.
*/
function quby_checkGlobal(global, name) {
    if (global === undefined) {
        quby.runtime.runtimeError("Global variable accessed before being assigned to: '" + name + "'.");
    } else {
        return global;
    }
}

/**
* Checks if the field given exists. It exists if it is not undefined. The field should be a name of
* a field to access and the name is the fields name when shown in a thrown error.
*
* An error will be thrown if a field of the given field name (the field parameter)
* does not exist within the object given.
*
* If the field does exist then it's value is returned.
*
* @param fieldVal The value of the field to check if it exists or not.
* @param obj The object you are retrieving the field from.
* @param name The name to show in an error for the name of the field (if an error is thrown).
* @return The value stored under the field named in the object given.
*/
function quby_getField(fieldVal, obj, name) {
    if (fieldVal === undefined) {
        quby.runtime.fieldNotFoundError(obj, name);
    }

    return fieldVal;
}

/**
* Sets a value to an array given using the given key and value.
* If the array given is not a QubyArray then an exception is thrown.
* If the collection given has a 'set' method, then it is considered
* to be a collection.
*
* This is the standard function used by compiled Quby code for
* setting values to an collection.
*
* @param collection An collection to test for being a collection.
* @param key The key for where to store the value given.
* @param value The value to store under the given key.
* @return The result of setting the value.
*/
function quby_setCollection(collection, key, value) {
    if (collection === null) {
        quby.runtime.runtimeError("Collection is null when setting a value");
    } else if (collection.set) {
        return collection.set(key, value);
    } else {
        quby.runtime.runtimeError("Trying to set value on a non-collection, it's actually a: " + quby.runtime.identifyObject(collection));
    }
}

/**
* Gets a value from the given collection using the key given.
* If the collection given has a 'get' method, then it is considered
* to be a collection.
*
* This is the standard function used in compiled Quby code for
* accessing an array.
*
* @param collection An collection to test for being a collection.
* @param key The key for the element to fetch.
* @return The value stored under the given key in the given collection.
*/
function quby_getCollection(collection, key) {
    if (collection === null) {
        quby.runtime.runtimeError("Collection is null when getting a value");
    } else if (collection.get) {
        return collection.get(key);
    } else {
        quby.runtime.runtimeError("Trying to get a value from a non-collection, it's actually a: " + quby.runtime.identifyObject(collection));
    }
}

var quby;
(function (quby) {
    /**
    * Runtime
    *
    * Functions and objects which may be used at runtime (i.e.
    * inside inlined JavaScript) are defined here. This includes
    * functions for uniquely formatting variables and functions.
    *
    * All compiled Quby code should run perfectly with only this
    * class. Everything outside of this class is not needed for
    * compiled code to be run.
    */
    /*
    * Note there are constants defined at the end of this file,
    * this is due to limitations in using JSON objects for
    * namespaces.
    */
    (function (runtime) {
        runtime.FUNCTION_DEFAULT_TABLE_NAME = '_q_no_funs', runtime.FUNCTION_TABLE_NAME = '_q_funs', runtime.SUPER_KEYWORD = "super", runtime.EXCEPTION_NAME_RUNTIME = "Runtime Error", runtime.TRANSLATE_CLASSES = {
            'array': 'QubyArray',
            'hash': 'QubyHash',
            'object': 'QubyObject'
        }, runtime.BLOCK_VARIABLE = '_q_block', runtime.TEMP_VARIABLE = '_t', runtime.VARIABLE_PREFIX = '_var_', runtime.FIELD_PREFIX = '_field_', runtime.GLOBAL_PREFIX = '_global_', runtime.FUNCTION_PREFIX = '_fun_', runtime.CLASS_PREFIX = '_class_', runtime.NEW_PREFIX = '_new_', runtime.SYMBOL_PREFIX = '_sym_', runtime.ROOT_CLASS_NAME = 'object', runtime.ROOT_CLASS_CALL_NAME = null, runtime.FIELD_NAME_SEPERATOR = '@';

        /**
        * Translates the public class name, to it's internal one.
        *
        * For example it translates 'Array' into 'QubyArray',
        * and 'Object' to 'QubyObject'.
        *
        * If a mapping is not found, then the given name is returned.
        *
        * @param name The name to translate.
        * @return The same given name if no translation was found, otherwise the internal Quby name for the class used.
        */
        function translateClassName(name) {
            var newName = runtime.TRANSLATE_CLASSES[name.toLowerCase()];

            if (newName) {
                return newName;
            } else {
                return name;
            }
        }
        runtime.translateClassName = translateClassName;

        /**
        * Similar to translateClassName, but works in the opposite direction.
        * It goes from internal name, to external display name.
        *
        * @param name The class name to reverse lookup.
        */
        function untranslateClassName(name) {
            var searchName = name.toLowerCase();

            for (var klass in runtime.TRANSLATE_CLASSES) {
                var klassName = runtime.TRANSLATE_CLASSES[klass];

                if (searchName.toLowerCase() == klassName.toLowerCase()) {
                    return util.str.capitalize(klass);
                }
            }

            // no reverse-lookup found : (
            return name;
        }
        runtime.untranslateClassName = untranslateClassName;

        /**
        * These are the core JavaScript prototypes that can be extended.
        *
        * If a JavaScript prototype is not mentioned here (like Image) then
        * Quby will make a new class instead of using it.
        *
        * If it is mentioned here then Quby will add to that classes Prototype.
        * (note that Object/QubyObject isn't here because it's not prototype extended).
        */
        runtime.CORE_CLASSES = [
            'Number',
            'Boolean',
            'Function',
            'String',
            'Array',
            'Hash'
        ];

        function isCoreClass(name) {
            var coreClasses = quby.runtime.CORE_CLASSES;

            for (var i = 0; i < coreClasses.length; i++) {
                if (name == coreClasses[i].toLowerCase()) {
                    return true;
                }
            }

            return false;
        }
        runtime.isCoreClass = isCoreClass;

        // 'this varaible' is a special variable for holding references to yourself.
        // This is so two functions can both refer to the same object.
        runtime.THIS_VARIABLE = "_this";

        function getThisVariable(isInExtension) {
            if (isInExtension) {
                return 'this';
            } else {
                return quby.runtime.THIS_VARIABLE;
            }
        }
        runtime.getThisVariable = getThisVariable;

        /* ### RUNTIME ### */
        var onError = null;

        var logCallback = null;

        /**
        * Sets the callback function for logging information from Quby.
        *
        * Passing in 'null' or 'false' sets this to nothing.
        * Otherwise this must be given a function object;
        * any other value will raise an error.
        *
        * The function is passed all of the values sent to log, unaltered.
        * Bear in mind that log can be given any number of arguments (including 0).
        *
        * Note that passing in undefined is also treated as an error.
        * We are presuming you meant to pass something in,
        * but got it wrong somehow.
        *
        * @param callback A function to callback when 'quby.runtime.log' is called.
        */
        function setLog(callback) {
            if (callback === undefined) {
                quby.runtime.error("Undefined given as function callback");
            } else if (!callback) {
                logCallback = null;
            } else if (typeof (callback) != 'function') {
                quby.runtime.error("Callback set for logging is not function, null or false.");
            }
        }
        runtime.setLog = setLog;

        /**
        * For handling logging calls from Quby.
        *
        * If a function has been set using setLog,
        * then all arguments given to this are passed on to that function.
        *
        * Otherwise this will try to manually give the output,
        * attempting each of the below in order:
        *  = FireBug/Chrome console.log
        *  = Outputting to the FireFox error console
        *  = display using an alert message
        */
        function log() {
            // custom
            if (logCallback !== null) {
                logCallback.apply(null, arguments);
            } else {
                var strOut = Array.prototype.join.call(arguments, ',');

                // FireBug & Chrome
                if (window.console && window.console.log) {
                    window.console.log(strOut);
                } else {
                    var sent = false;

                    try  {
                        window['Components']['classes']["@mozilla.org/consoleservice;1"].getService(window['Components']['interfaces']['nsIConsoleService']).logStringMessage(strOut);

                        sent = true;
                    } catch (ex) {
                    }

                    // generic default
                    if (!sent) {
                        alert(strOut);
                    }
                }
            }
        }
        runtime.log = log;

        /**
        * Runs the code given in the browser, within the current document. If an
        * onError function is provided then this will be called if an error occurres.
        * The error object will be passed into the onError function given.
        *
        * If one is not provided then the error will not be caught and nothing will
        * happen.
        *
        * @param code The JavaScript code to run.
        * @param onError the function to be called if an error occurres.
        */
        function runCode(code, onErr) {
            if (onErr) {
                if (typeof (onErr) != 'function') {
                    quby.runtime.error("onError", "onError must be a function.");
                }

                onError = onErr;
                code = 'try { ' + code + ' } catch ( err ) { quby.runtime.handleError(err); }';
            } else {
                onError = null;
            }

            (new Function(code)).call(null);
        }
        runtime.runCode = runCode;

        
        function handleError(err) {
            if (!err.isQuby) {
                err.quby_message = unformatString(err.message);
            } else {
                err.quby_message = err.message;
            }

            if (onError != null) {
                if (!onError(err)) {
                    throw err;
                }
            } else {
                throw err;
            }
        }
        runtime.handleError = handleError;

        /**
        * Given a Quby object, this will try to find it's display name.
        * This will first check if it has a prefix, and if so remove this
        * and generate a prettier version of the name.
        *
        * Otherwise it can also perform lookups to check if it's a core class,
        * such as a Number or Array. This includes reverse lookups for internal
        * structures such as the QubyArray (so just Array is displayed instead).
        *
        * @param obj The object to identify.
        * @return A display name for the type of the object given.
        */
        function identifyObject(obj) {
            if (obj === null) {
                return "null";
            } else {
                var strConstructor = obj.constructor.toString();
                var funcNameRegex = /function ([a-zA-Z0-9_]{1,})\(/;
                var results = funcNameRegex.exec(strConstructor);

                if (results && results.length > 1) {
                    var name = results[1];

                    // if it's a Quby object, get it's name
                    if (name.indexOf(quby.runtime.CLASS_PREFIX) === 0) {
                        name = name.substring(quby.runtime.CLASS_PREFIX.length);
                    } else {
                        name = quby.runtime.untranslateClassName(name);
                    }

                    name = util.str.capitalize(name);

                    return name;
                } else {
                    return "<unknown object>";
                }
            }
        }
        runtime.identifyObject = identifyObject;

        /**
        * Checks if the given object is one of the Quby inbuilt collections (such as QubyArray and QubyHash), and if not then an exception is thrown.
        *
        * @param collection An collection to test for being a collection.
        * @return The collection given.
        */
        function checkArray(collection, op) {
            if (collection instanceof QubyArray || collection instanceof QubyHash) {
                return collection;
            } else {
                this.runtimeError("Trying to " + op + " value on Array or Hash, but it's actually a " + quby.runtime.identifyObject(collection));
            }
        }
        runtime.checkArray = checkArray;

        /**
        * Creates a new Error object with the given name and message.
        * It is then thrown straight away. This method will not
        * return (since an exception is thrown within it).
        *
        * @param name The name for the Error object to throw.
        * @param msg The message contained within the Error object thrown.
        * @return This should never return.
        */
        function error(name, msg) {
            var errObj = new Error(msg);

            errObj.isQuby = true;
            errObj.name = name;

            throw errObj;
        }
        runtime.error = error;

        /**
        * Throws a standard Quby runtime error from within this function.
        * This method will not return as it will thrown an exception.
        *
        * @param msg The message contained within the error thrown.
        * @return This should never return.
        */
        function runtimeError(msg) {
            quby.runtime.error(quby.runtime.EXCEPTION_NAME_RUNTIME, msg);
        }
        runtime.runtimeError = runtimeError;

        /**
        * Throws the standard eror for when a stated field is not found.
        *
        * @param name The name of the field that was not found.
        */
        function fieldNotFoundError(obj, name) {
            var msg;
            var thisClass = quby.runtime.identifyObject(obj);

            if (name.indexOf('@') > -1) {
                var parts = name.split('@');
                var field = parts[0];
                var fieldClass = parts[1];

                if (fieldClass.toLowerCase() !== thisClass.toLowerCase()) {
                    msg = "Field '" + field + "' from class '" + fieldClass + "' is illegally accessed from sub or super class '" + thisClass + "'.";
                } else {
                    msg = "Field '" + field + "' is being accessed before being assigned to in class '" + thisClass + "'.";
                }
            } else {
                msg = "Field '" + name + "' is being accessed before being assigned to in class '" + thisClass + "'.";
            }

            quby.runtime.runtimeError(msg);
        }
        runtime.fieldNotFoundError = fieldNotFoundError;

        /**
        * Throws an error designed specifically for when a block is expected,
        * but was not present. It is defined here so that it can be called
        * manually by users from within their inlined JavaScript code.
        *
        * This method will not return since it throws an exception.
        *
        * @return This should never return.
        */
        function missingBlockError() {
            this.runtimeError("Yield with no block present");
        }
        runtime.missingBlockError = missingBlockError;

        function lookupMethodName(callName) {
            var methodName = window[quby.runtime.FUNCTION_TABLE_NAME][callName];

            // should never happen, but just in case...
            if (methodName === undefined) {
                methodName = callName;
            }

            return methodName;
        }
        runtime.lookupMethodName = lookupMethodName;

        /**
        * Throws an error stating that there are not enough parameters for yielding
        * to something. The something is stated by the 'type' parameter (i.e. "block",
        * "function" or "method"). It is stated by the user.
        *
        * The 'expected' and 'got' refer to the number of parameters the type expects
        * and actually got when it was called.
        *
        * @param expected The number of parameters expected by the caller.
        * @param got The number of parameters actually received when the call was attempted.
        * @param type A name for whatever was being called.
        */
        function notEnoughBlockParametersError(expected, got, type) {
            quby.runtime.runtimeError("Not enough parameters given for a " + type + ", was given: " + got + " but expected: " + expected);
        }
        runtime.notEnoughBlockParametersError = notEnoughBlockParametersError;

        function methodMissingError(obj, callName, args, block) {
            var methodName = quby.runtime.lookupMethodName(callName);

            // check for methods with same name, but different parameters
            var callNameAlt = callName.replace(/_[0-9]+$/, "");

            for (var key in obj) {
                var keyCallName = key.toString();
                var mName = keyCallName.replace(/_[0-9]+$/, "");

                if (callNameAlt === mName) {
                    // take into account the noMethodStubs when searching for alternatives
                    // (skip the noMethod's)
                    var funs = window[quby.runtime.FUNCTION_DEFAULT_TABLE_NAME];
                    if (!funs || (callName !== keyCallName && funs[keyCallName] !== obj[keyCallName])) {
                        quby.runtime.runtimeError("Method: '" + methodName + "' called with incorrect number of arguments (" + args.length + ") on object of type '" + quby.runtime.identifyObject(obj) + "'");
                    }
                }
            }

            quby.runtime.runtimeError("Unknown method '" + methodName + "' called with " + args.length + " arguments on object of type '" + quby.runtime.identifyObject(obj) + "'");
        }
        runtime.methodMissingError = methodMissingError;

        /**
        * This is a callback called when an unknown method is called at runtime.
        *
        * @param methodName The name of hte method being called.
        * @param args The arguments for the method being called.
        */
        function onMethodMissingfunction(methodName, args) {
            quby.runtime.methodMissingError(this, methodName, args);
        }
        runtime.onMethodMissingfunction = onMethodMissingfunction;

        /**
        * This attempts to decode the given string,
        * removing all of the special quby formatting names from it.
        *
        * It searches through it for items that match internal Quby names,
        * and removes them.
        *
        * Note that it cannot guarantee to do this correctly.
        *
        * For example variables start with '_var_',
        * but it's entirely possible that the string passed holds
        * text that starts with '_var_', but is unrelated.
        *
        * So this is for display purposes only!
        *
        * @public
        * @param str The string to remove formatting from.
        * @return The string with all internal formatting removed.
        */
        function unformatString(str) {
            str = str.replace(/\b[a-zA-Z0-9_]+\b/g, function (match) {
                // Functions
                // turn function from: '_fun_foo_1' => 'foo'
                if (match.indexOf(quby.runtime.FUNCTION_PREFIX) === 0) {
                    match = match.substring(quby.runtime.FUNCTION_PREFIX.length);
                    return match.replace(/_[0-9]+$/, '');
                    // Fields
                    // there are two 'field prefixes' in a field
                } else if ((match.indexOf(quby.runtime.FIELD_PREFIX) === 0) && match.indexOf(quby.runtime.FIELD_PREFIX, 1) > -1) {
                    var secondFieldPrefixI = match.indexOf(quby.runtime.FIELD_PREFIX, 1);
                    var classBit = match.substring(0, secondFieldPrefixI + quby.runtime.FIELD_PREFIX.length), fieldBit = match.substring(secondFieldPrefixI + quby.runtime.FIELD_PREFIX.length);

                    // get out the class name
                    // remove the outer 'field_prefix' wrappings, at start and end
                    var wrappingFieldPrefixes = new RegExp('(^' + quby.runtime.FIELD_PREFIX + quby.runtime.CLASS_PREFIX + ')|(' + quby.runtime.FIELD_PREFIX + '$)', 'g');
                    classBit = classBit.replace(wrappingFieldPrefixes, '');
                    classBit = util.str.capitalize(classBit);

                    return classBit + '@' + fieldBit;
                    // Classes & Constructors
                    // must be _after_ fields
                } else if (match.indexOf(quby.runtime.CLASS_PREFIX) === 0) {
                    match = match.replace(new RegExp('^' + quby.runtime.CLASS_PREFIX), '');

                    // Constructor
                    if (match.indexOf(quby.runtime.NEW_PREFIX) > -1) {
                        var regExp = new RegExp(quby.runtime.NEW_PREFIX + '[0-9]+$');
                        match = match.replace(regExp, '');
                    }

                    return quby.runtime.untranslateClassName(match);
                    // Globals
                    // re-add the $, to make it look like a global again!
                } else if (match.indexOf(quby.runtime.GLOBAL_PREFIX) === 0) {
                    return '$' + match.substring(quby.runtime.GLOBAL_PREFIX.length);
                    // Symbols
                    // same as globals, but using ':' instead of '$'
                } else if (match.indexOf(quby.runtime.SYMBOL_PREFIX) === 0) {
                    return ':' + match.substring(quby.runtime.SYMBOL_PREFIX.length);
                    // Variables
                    // generic matches, variables like '_var_bar'
                } else if (match.indexOf(quby.runtime.VARIABLE_PREFIX) === 0) {
                    return match.substring(quby.runtime.VARIABLE_PREFIX.length);
                    // just return it, but untranslate incase it's a 'QubyArray',
                    // 'QubyObject', or similar internal class name
                } else {
                    return quby.runtime.untranslateClassName(match);
                }
            });

            /**
            * Warning! It is presumed that prefixPattern _ends_ with an opening bracket.
            *  i.e. quby_setCollection(
            *       quby_getCollection(
            *
            * @param {string} The string to search through for arrays
            * @param {string} The prefix pattern for the start of the array translation.
            * @param {function({string}, {array<string>}, {string})} A function to put it all together.
            */
            var qubyArrTranslation = function (str, prefixPattern, onFind) {
                /**
                * Searches for the closing bracket in the given string.
                * It presumes the bracket is already open, when it starts to search.
                *
                * It does bracket counting inside, to prevent it getting confused.
                * It presumes the string is correctly-formed, but returns null if something goes wrong.
                */
                var getClosingBracketIndex = function (str, startI) {
                    var openBrackets = 1;

                    for (var j = startI; j < str.length; j++) {
                        var c = str.charAt(j);

                        if (c === '(') {
                            openBrackets++;
                        } else if (c === ')') {
                            openBrackets--;

                            // we've found the closing bracket, so quit!
                            if (openBrackets === 0) {
                                return j;
                            }
                        }
                    }

                    return null;
                };

                /**
                * Splits by the ',' character.
                *
                * This differs from '.split(',')' because this ignores commas that might appear
                * inside of parameters, through using bracket counting.
                *
                * So if a parameter contains a function call, then it's parameter commas are ignored.
                *
                * The found items are returned in an array.
                */
                var splitByRootCommas = function (str) {
                    var found = [], startI = 0;

                    var openBrackets = 0;
                    for (var i = 0; i < str.length; i++) {
                        var c = str.charAt(i);

                        if (c === ',' && openBrackets === 0) {
                            found.push(str.substring(startI, i));

                            // +1 to skip this comma
                            startI = i + 1;
                        } else if (c === '(') {
                            openBrackets++;
                        } else if (c === ')') {
                            openBrackets--;
                        }
                    }

                    // add everything left, after the last comma
                    found.push(str.substring(startI));

                    return found;
                };

                // Search through and try to do array translation as much, or often, as possible.
                var i = -1;
                while ((i = str.indexOf(prefixPattern)) > -1) {
                    var openingI = i + prefixPattern.length;
                    var closingI = getClosingBracketIndex(str, openingI);

                    // something's gone wrong, just quit!
                    if (closingI === null) {
                        break;
                    }

                    var pre = str.substring(0, i), mid = str.substring(openingI, closingI), post = str.substring(closingI + 1);

                    var parts = splitByRootCommas(mid);

                    str = onFind(pre, parts, post);
                }

                return str;
            };

            // Translating: quby_getCollection( arr, i ) => arr[i]
            str = qubyArrTranslation(str, 'quby_getCollection(', function (pre, parts, post) {
                return pre + parts[0] + '[' + parts[1] + ']' + post;
            });

            // Translating: quby_setCollection( arr, i, val ) => arr[i] = val
            str = qubyArrTranslation(str, 'quby_setCollection(', function (pre, parts, post) {
                return pre + parts[0] + '[' + parts[1] + '] = ' + parts[2] + post;
            });

            // This is to remove the 'null' blocks, passed into every function/constructor/method
            // need to remove the 'a( null )' first, and then 'a( i, j, k, null )' in a second sweep.
            str = str.replace(/\( *null *\)/g, '()');
            str = str.replace(/, *null *\)/g, ')');

            return str;
        }

        /**
        * Helper functions to be called from within inlined JavaScript and the parser
        * for getting access to stuff inside the scriptin language.
        *
        * Variables should be accessed in the format: '_var_<name>' where <name> is the
        * name of the variable. All names are in lowercase.
        *
        * For example: _var_foo, _var_bar, _var_foo_bar
        */
        function formatVar(strVar) {
            return quby.runtime.VARIABLE_PREFIX + strVar.toLowerCase();
        }
        runtime.formatVar = formatVar;

        /**
        * @param strVar The variable name to format into the internal global callname.
        * @return The callname to use for the given variable in the outputted javascript.
        */
        function formatGlobal(strVar) {
            return quby.runtime.GLOBAL_PREFIX + strVar.replace(/\$/g, '').toLowerCase();
        }
        runtime.formatGlobal = formatGlobal;

        /**
        * @param strClass The class name to format into the internal class callname.
        * @return The callname to use for the given class in the outputted javascript.
        */
        function formatClass(strClass) {
            strClass = strClass.toLowerCase();
            var newName = quby.runtime.TRANSLATE_CLASSES[strClass];

            if (newName) {
                return newName;
            } else {
                return quby.runtime.CLASS_PREFIX + strClass;
            }
        }
        runtime.formatClass = formatClass;

        /**
        * @param strClass The class name for the field to format.
        * @param strVar The name of the field that is being formatted.
        * @return The callname to use for the given field.
        */
        function formatField(strClass, strVar) {
            return quby.runtime.FIELD_PREFIX + quby.runtime.formatClass(strClass) + quby.runtime.FIELD_PREFIX + strVar.toLowerCase();
        }
        runtime.formatField = formatField;

        /**
        * A function for correctly formatting function names.
        *
        * All function names are in lowercase. The correct format for a function name is:
        * '_fun_<name>_<numParameters>' where <name> is the name of the function and
        * <numParameters> is the number of parameters the function has.
        *
        * For example: _fun_for_1, _fun_print_1, _fun_hasblock_0
        */
        function formatFun(strFun, numParameters) {
            return quby.runtime.FUNCTION_PREFIX + strFun.toLowerCase() + '_' + numParameters;
        }
        runtime.formatFun = formatFun;

        /**
        * Formats a constructor name using the class name given and the stated
        * number of parameters. The class name should be the proper (pretty) class
        * name, not a formatted class name.
        *
        * @param strKlass The class name of the constructor being formatted.
        * @param numParameters The number of parameters in the constructor.
        * @return The name for a constructor of the given class with the given number of parameters.
        */
        function formatNew(strKlass, numParameters) {
            return quby.runtime.formatClass(strKlass) + quby.runtime.NEW_PREFIX + numParameters;
        }
        runtime.formatNew = formatNew;

        function formatSymbol(sym) {
            return quby.runtime.SYMBOL_PREFIX + sym.toLowerCase();
        }
        runtime.formatSymbol = formatSymbol;

        quby.runtime.ROOT_CLASS_CALL_NAME = quby.runtime.formatClass(quby.runtime.ROOT_CLASS_NAME);
    })(quby.runtime || (quby.runtime = {}));
    var runtime = quby.runtime;
})(quby || (quby = {}));

/**
* Standard core object that everything extends.
*/
function QubyObject() {
    // map JS toString to the Quby toString
}
;

/**
* Arrays are not used in Quby, instead it uses it's own Array object.
*
* These wrap a JavaScript array to avoid the issues with extending the
* Array prototype.
*
* Note that the values given are used internally. So do not
* mutate it externally to this function!
*
* If you are copying, copy the values first, then create a new
* QubyArray with the values passed in.
*
* @constructor
* @param values Optionally takes an array of values, set as the default values for this array.
*/
function QubyArray(values) {
    if (values === undefined) {
        this.values = [];
    } else {
        this.values = values;
    }
}
QubyArray.prototype.set = function (key, value) {
    var index = key >> 0;

    if (index < 0) {
        quby.runtime.runtimeError("Negative value given as array index: " + key);
    }

    var values = this.values, len = values.length;

    /*
    * We first insert the new value, into the array,
    * at it's location. It's important to *not* pad
    * before we do this, as JS will automatically
    * allocate all the memory needed for that padding.
    */
    values[index] = value;

    while (index > len) {
        values[--index] = null;
    }

    return value;
};
QubyArray.prototype.get = function (key) {
    var index = key >> 0;
    var len = this.values.length;

    if (index < 0) {
        if (-index > len) {
            return null;
        } else {
            index = len + index;
        }
    } else if (index >= len) {
        return null;
    }

    return this.values[index];
};

/**
*
*
* @constructor
*/
function QubyHash() {
    this.values = [];

    for (var i = 0, argsLen = arguments.length; i < argsLen; i += 2) {
        var key = arguments[i];
        var value = arguments[i + 1];

        this.set(key, value);
    }
}
QubyHash.prototype.hash = function (val) {
    if (val == null) {
        return 0;
    } else if (typeof (val) == 'string') {
        return val.length;
    } else {
        return val.toSource ? val.toSource().length : val.constructor.toString().length;
    }
};
QubyHash.prototype.set = function (key, value) {
    var keyHash = this.hash(key);
    var vals = this.values[keyHash];

    if (vals === undefined) {
        this.values[keyHash] = [
            { key: key, value: value }
        ];
    } else {
        for (var i = 0, valsLen = vals.length; i < valsLen; i++) {
            var node = vals[i];

            if (node.key == key) {
                node.value = value;
                return;
            }
        }

        vals.push({ key: key, value: value });
    }
};
QubyHash.prototype.get = function (key) {
    var keyHash = this.hash(key);
    var vals = this.values[keyHash];

    if (vals === undefined) {
        return null;
    } else {
        for (var i = 0, valsLen = vals.length; i < valsLen; i++) {
            var node = vals[i];

            if (node.key == key) {
                return node.value;
            }
        }

        return null;
    }
};
QubyHash.prototype.clone = function () {
    var copy = new QubyHash();

    for (var hash in this.values) {
        var keys = this.values[hash];

        copy.values[hash] = this.cloneKeys(keys);
    }

    return copy;
};
QubyHash.prototype.cloneKeys = function (keys) {
    var newKeys = [];
    var keysLen = keys.length;

    for (var i = 0; i < keysLen; i++) {
        var node = keys[i];

        newKeys.push({
            key: node.key,
            value: node.value
        });
    }

    return newKeys;
};
QubyHash.prototype.each = function (fun) {
    for (var hash in this.values) {
        var keys = this.values[hash];

        for (var i = 0, len = keys.length; i < len; i++) {
            var node = keys[i];
            fun(node.key, node.value);
        }
    }
};
QubyHash.prototype.contains = function (key) {
    var keyHash = this.hash(key);
    var vals = this.values[keyHash];

    if (vals !== undefined) {
        for (var i = 0, len = vals.length; i < len; i++) {
            if (key == vals[i].key) {
                return true;
            }
        }
    }

    return false;
};
QubyHash.prototype.remove = function (key) {
    var keyHash = this.hash(key);
    var vals = this.values[keyHash];

    if (vals !== undefined) {
        for (var i = 0, len = vals.length; i < len; i++) {
            var node = vals[i];

            if (key == node.key) {
                // remove the whole hash bucket if it's the only entry
                if (vals.length === 1) {
                    delete this.values[keyHash];
                    // delete it from the bucket, but more are remaining
                } else {
                    vals.splice(i, 1);
                }

                return node.value;
            }
        }
    }

    return null;
};
/**
* @license
*
* Quby Compiler
* Copyright 2010 - 2012 Joseph Lenton
*
* Redistribution and use in source and binary forms, with or without
* modification, are permitted provided that the following conditions are met:
*     * Redistributions of source code must retain the above copyright
*       notice, this list of conditions and the following disclaimer.
*     * Redistributions in binary form must reproduce the above copyright
*       notice, this list of conditions and the following disclaimer in the
*       documentation and/or other materials provided with the distribution.
*     * Neither the name of the <organization> nor the
*       names of its contributors may be used to endorse or promote products
*       derived from this software without specific prior written permission.
*
* THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
* ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
* WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
* DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
* DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
* (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
* LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
* ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
* (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
* SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
///<reference path='./src/lib/util.ts' />
///<reference path='./src/lib/parse.ts' />
///<reference path='./src/ast.ts' />
///<reference path='./src/compilation.ts' />
///<reference path='./src/core.ts' />
///<reference path='./src/main.ts' />
///<reference path='./src/parser.ts' />
///<reference path='./src/runtime.ts' />
"use strict";
