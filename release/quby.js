"use strict";
(function (Date) {
    if (Date.now === undefined) {
        Date.now = function () {
            return (new Date()).getTime();
        };
    }
})(window['Date']);

var util;
(function (util) {
    var calculateName = function () {
        if (navigator.appName === 'Opera') {
            return 'opera';
        } else if (navigator.appName === 'Microsoft Internet Explorer') {
            return 'ie';
        } else {
            var agent = navigator.userAgent.toString();

            if (agent.indexOf("Chrome/") != -1) {
                return 'chrome';
            } else if (agent.indexOf("Safari/") != -1) {
                return 'safari';
            } else if (navigator.appName === 'Netscape') {
                return 'mozilla';
            } else {
                return 'unknown';
            }
        }
    };

    var browserName = calculateName();

    var anchor = null;

    util.browser = {
        isIE: browserName === 'ie',
        isMozilla: browserName === 'mozilla',
        isChrome: browserName === 'chrome',
        isOpera: browserName === 'opera',
        isSafari: browserName === 'safari'
    };

    function clone(source) {
        if (source) {
            if (source instanceof Array) {
                return source.splice(0);
            } else {
                var ClonePrototype = function () {
                };
                ClonePrototype.prototype = source;

                var copy = new ClonePrototype();

                for (var k in source) {
                    if (source.hasOwnProperty(k)) {
                        copy[k] = source[k];
                    }
                }

                return copy;
            }
        } else {
            return source;
        }
    }
    util.clone = clone;

    (function (url) {
        var SLASH_CHAR = '/'.charCodeAt(0);

        function absolute(url) {
            if (anchor === null) {
                anchor = new HTMLAnchorElement();
            }

            anchor.href = url;

            return anchor.href;
        }
        url.absolute = absolute;

        function isDomain(url, domain) {
            if (domain === undefined) {
                domain = document.domain;
            }

            return (url.toLowerCase().indexOf(domain.toLowerCase()) === 0);
        }
        url.isDomain = isDomain;

        function stripDomain(url) {
            url = util.url.absolute(url);

            if (url.charCodeAt(0) === SLASH_CHAR && url.charCodeAt(1) !== SLASH_CHAR) {
                return url;
            } else {
                return url.replace(/((\/\/)|([a-zA-Z]+:\/\/))([a-zA-Z0-9_\-.+]+)/, '');
            }
        }
        url.stripDomain = stripDomain;
    })(util.url || (util.url = {}));
    var url = util.url;

    (function (array) {
        function argumentsToArray(args, i) {
            if (typeof i === "undefined") { i = 0; }
            var len, arr;

            if (i === 0) {
                len = args.length;
                arr = new Array(len);

                for (; i < len; i++) {
                    arr[i] = args[i];
                }
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

    (function (str) {
        function htmlToText(html) {
            if (anchor === null) {
                anchor = new HTMLAnchorElement();
            }

            anchor.innerHTML = html;

            return anchor.textContent || anchor.innerText;
        }
        str.htmlToText = htmlToText;

        function trim(s) {
            s = s.replace(/^\s\s*/, '');
            var ws = /\s/;
            var i = s.length;

            while (ws.test(s.charAt(--i))) {
            }
            return s.slice(0, i + 1);
        }
        str.trim = trim;

        function capitalize(str) {
            if (typeof (str) == 'string' && str.length > 0) {
                return str.charAt(0).toUpperCase() + str.slice(1);
            } else {
                return str;
            }
        }
        str.capitalize = capitalize;
    })(util.str || (util.str = {}));
    var str = util.str;

    (function (future) {
        var DEFAULT_INTERVAL = 10;

        var isFutureRunning = false;

        var futureFuns = [], futureBlocking = [];

        var futureBlockingOffset = 0, blockingCount = 1;

        var requestAnimFrame = window.requestAnimationFrame || window['webkitRequestAnimationFrame'] || window['mozRequestAnimationFrame'] || window['oRequestAnimationFrame'] || window.msRequestAnimationFrame || null;

        var intervalFuns = [], intervalFunID = 1;

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

        function interval(callback, element) {
            if (requestAnimFrame !== null) {
                var isRunningHolder = { isRunning: true };

                var recursiveCallback = function () {
                    if (isRunningHolder.isRunning) {
                        callback();
                        requestAnimFrame(recursiveCallback, element);
                    }
                };

                requestAnimFrame(recursiveCallback, element);

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
            if (typeof passData === "undefined") { passData = ''; }
            if (typeof async === "undefined") { async = true; }
            if (typeof timestamp === "undefined") { timestamp = false; }
            if (passData === undefined || passData === null) {
                passData = '';
            } else if (!(typeof passData === 'string' || passData instanceof String)) {
                passData = String(passData);
            }

            method = method.toLowerCase();

            var ajaxObj = new XMLHttpRequest();

            ajaxObj.onreadystatechange = function () {
                if (ajaxObj.readyState == 4) {
                    callback(ajaxObj.status, ajaxObj.responseText, ajaxObj.responseXML);
                }
            };

            if (method === 'post') {
                if (timestamp) {
                    if (url.indexOf('?') === -1) {
                        url += '?timestamp=' + Date.now();
                    } else {
                        url += '&timestamp=' + Date.now();
                    }
                }

                ajaxObj.open("POST", url, async);
                ajaxObj.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
                ajaxObj.setRequestHeader("Content-Length", String(passData.length));
                ajaxObj.send(passData);
            } else if (method === 'get') {
                if (passData) {
                    if (url.indexOf('?') === -1) {
                        url += '?' + passData;
                    } else {
                        url += '&' + passData;
                    }
                }

                if (timestamp) {
                    if (url.indexOf('?') === -1) {
                        url += '?timestamp=' + Date.now();
                    } else {
                        url += '&timestamp=' + Date.now();
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
"use strict";
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var parse;
(function (parse) {
    ;

    ;

    function newParseError(msg) {
        if (msg) {
            msg += " (this is a bug in parse.js)";
        } else {
            msg = "a bug in parse.js has occurred";
        }

        return new Error(msg);
    }

    var tabLog = function (indents) {
        var str = '';
        for (var i = 0; i < indents; i++) {
            str += '    ';
        }

        arguments[0] = str;
        console.log.apply(console, arguments);
    };

    var TAB = 9, SLASH_N = 10, SLASH_R = 13, SPACE = 32, EXCLAMATION = 33, DOUBLE_QUOTE = 34, HASH = 35, DOLLAR = 36, PERCENT = 37, AMPERSAND = 38, SINGLE_QUOTE = 39, LEFT_PAREN = 40, RIGHT_PAREN = 41, STAR = 42, PLUS = 43, COMMA = 44, MINUS = 45, FULL_STOP = 46, SLASH = 47, ZERO = 48, ONE = 49, TWO = 50, THREE = 51, FOUR = 52, FIVE = 53, SIX = 54, SEVEN = 55, EIGHT = 56, NINE = 57, COLON = 58, SEMI_COLON = 59, LESS_THAN = 60, EQUAL = 61, GREATER_THAN = 62, QUESTION_MARK = 63, AT = 64, UPPER_A = 65, UPPER_F = 70, UPPER_Z = 90, LEFT_SQUARE = 91, BACKSLASH = 92, RIGHT_SQUARE = 93, CARET = 94, UNDERSCORE = 95, LOWER_A = 97, LOWER_B = 98, LOWER_C = 99, LOWER_D = 100, LOWER_E = 101, LOWER_F = 102, LOWER_G = 103, LOWER_H = 104, LOWER_I = 105, LOWER_J = 106, LOWER_K = 107, LOWER_L = 108, LOWER_M = 109, LOWER_N = 110, LOWER_O = 111, LOWER_P = 112, LOWER_Q = 113, LOWER_R = 114, LOWER_S = 115, LOWER_T = 116, LOWER_U = 117, LOWER_V = 118, LOWER_W = 119, LOWER_X = 120, LOWER_Y = 121, LOWER_Z = 122, LEFT_BRACE = 123, BAR = 124, RIGHT_BRACE = 125, TILDA = 126;

    var isHexCode = function (code) {
        return (code >= ZERO && code <= NINE) || (code >= LOWER_A && code <= LOWER_F) || (code >= UPPER_A && code <= UPPER_F);
    };

    var isAlphaNumericCode = function (code) {
        return ((code >= LOWER_A && code <= LOWER_Z) || (code >= UPPER_A && code <= UPPER_Z) || (code === UNDERSCORE) || (code >= ZERO && code <= NINE));
    };

    var isAlphaCode = function (code) {
        return (code >= LOWER_A && code <= LOWER_Z) || (code >= UPPER_A && code <= UPPER_Z);
    };

    var isNumericCode = function (code) {
        return (code >= ZERO && code <= NINE);
    };

    var isFunction = function (f) {
        return (f instanceof Function) || (typeof f == 'function');
    };

    var newCharacterMatch = function (match) {
        var matchCode = match.charCodeAt(0);

        return function (src, i, code, len) {
            if (code === matchCode) {
                return i + 1;
            } else {
                return undefined;
            }
        };
    };

    var newWordMatch = function (match) {
        if (isWordCode(match.charCodeAt(match.length - 1))) {
            return newWordMatchBoundary(match);
        } else {
            return newWordMatchNoBoundary(match);
        }
    };

    var newWordMatchBoundary = function (match) {
        var m0 = match.charCodeAt(0), m1 = match.charCodeAt(1), m2 = match.charCodeAt(2), m3 = match.charCodeAt(3), m4 = match.charCodeAt(4), m5 = match.charCodeAt(5), m6 = match.charCodeAt(6), m7 = match.charCodeAt(7);

        if (match.length === 1) {
            return function (src, i, code, len) {
                if (m0 === code && !isWordCharAt(src, i + 1)) {
                    return i + 1;
                }
            };
        } else if (match.length === 2) {
            return function (src, i, code, len) {
                if (m0 === code && m1 === src.charCodeAt(i + 1) && !isWordCharAt(src, i + 2)) {
                    return i + 2;
                }
            };
        } else if (match.length === 3) {
            return function (src, i, code, len) {
                if (m0 === code && m1 === src.charCodeAt(i + 1) && m2 === src.charCodeAt(i + 2) && !isWordCharAt(src, i + 3)) {
                    return i + 3;
                }
            };
        } else if (match.length === 4) {
            return function (src, i, code, len) {
                if (m0 === code && m1 === src.charCodeAt(i + 1) && m2 === src.charCodeAt(i + 2) && m3 === src.charCodeAt(i + 3) && !isWordCharAt(src, i + 4)) {
                    return i + 4;
                }
            };
        } else if (match.length === 5) {
            return function (src, i, code, len) {
                if (m0 === code && m1 === src.charCodeAt(i + 1) && m2 === src.charCodeAt(i + 2) && m3 === src.charCodeAt(i + 3) && m4 === src.charCodeAt(i + 4) && !isWordCharAt(src, i + 5)) {
                    return i + 5;
                }
            };
        } else if (match.length === 6) {
            return function (src, i, code, len) {
                if (m0 === code && m1 === src.charCodeAt(i + 1) && m2 === src.charCodeAt(i + 2) && m3 === src.charCodeAt(i + 3) && m4 === src.charCodeAt(i + 4) && m5 === src.charCodeAt(i + 5) && !isWordCharAt(src, i + 6)) {
                    return i + 6;
                }
            };
        } else if (match.length === 7) {
            return function (src, i, code, len) {
                if (m0 === code && m1 === src.charCodeAt(i + 1) && m2 === src.charCodeAt(i + 2) && m3 === src.charCodeAt(i + 3) && m4 === src.charCodeAt(i + 4) && m5 === src.charCodeAt(i + 5) && m6 === src.charCodeAt(i + 6) && !isWordCharAt(src, i + 7)) {
                    return i + 7;
                }
            };
        } else if (match.length === 8) {
            return function (src, i, code, len) {
                if (m0 === code && m1 === src.charCodeAt(i + 1) && m2 === src.charCodeAt(i + 2) && m3 === src.charCodeAt(i + 3) && m4 === src.charCodeAt(i + 4) && m5 === src.charCodeAt(i + 5) && m6 === src.charCodeAt(i + 6) && m7 === src.charCodeAt(i + 7) && !isWordCharAt(src, i + 8)) {
                    return i + 8;
                }
            };
        } else {
            return function (src, i, code, len) {
                if (m0 === code && m1 === src.charCodeAt(i + 1) && m2 === src.charCodeAt(i + 2) && m3 === src.charCodeAt(i + 3) && m4 === src.charCodeAt(i + 4) && m5 === src.charCodeAt(i + 5) && m6 === src.charCodeAt(i + 6) && m7 === src.charCodeAt(i + 7)) {
                    var keyLen = src.length;

                    for (var j = 7; j < keyLen; j++) {
                        if (src.charCodeAt(i + j) !== match.charCodeAt(j)) {
                            return undefined;
                        }
                    }

                    if (!isWordCharAt(src, i + keyLen)) {
                        return i + keyLen;
                    }
                }

                return undefined;
            };
        }
    };

    var newWordMatchNoBoundary = function (match) {
        var m0 = match.charCodeAt(0), m1 = match.charCodeAt(1), m2 = match.charCodeAt(2), m3 = match.charCodeAt(3), m4 = match.charCodeAt(4), m5 = match.charCodeAt(5), m6 = match.charCodeAt(6), m7 = match.charCodeAt(7);

        if (match.length === 1) {
            return function (src, i, code, len) {
                if (m0 === code) {
                    return i + 1;
                }
            };
        } else if (match.length === 2) {
            return function (src, i, code, len) {
                if (m0 === code && m1 === src.charCodeAt(i + 1)) {
                    return i + 2;
                }
            };
        } else if (match.length === 3) {
            return function (src, i, code, len) {
                if (m0 === code && m1 === src.charCodeAt(i + 1) && m2 === src.charCodeAt(i + 2)) {
                    return i + 3;
                }
            };
        } else if (match.length === 4) {
            return function (src, i, code, len) {
                if (m0 === code && m1 === src.charCodeAt(i + 1) && m2 === src.charCodeAt(i + 2) && m3 === src.charCodeAt(i + 3)) {
                    return i + 4;
                }
            };
        } else if (match.length === 5) {
            return function (src, i, code, len) {
                if (m0 === code && m1 === src.charCodeAt(i + 1) && m2 === src.charCodeAt(i + 2) && m3 === src.charCodeAt(i + 3) && m4 === src.charCodeAt(i + 4)) {
                    return i + 5;
                }
            };
        } else if (match.length === 6) {
            return function (src, i, code, len) {
                if (m0 === code && m1 === src.charCodeAt(i + 1) && m2 === src.charCodeAt(i + 2) && m3 === src.charCodeAt(i + 3) && m4 === src.charCodeAt(i + 4) && m5 === src.charCodeAt(i + 5)) {
                    return i + 6;
                }
            };
        } else if (match.length === 7) {
            return function (src, i, code, len) {
                if (m0 === code && m1 === src.charCodeAt(i + 1) && m2 === src.charCodeAt(i + 2) && m3 === src.charCodeAt(i + 3) && m4 === src.charCodeAt(i + 4) && m5 === src.charCodeAt(i + 5) && m6 === src.charCodeAt(i + 6)) {
                    return i + 7;
                }
            };
        } else if (match.length === 8) {
            return function (src, i, code, len) {
                if (m0 === code && m1 === src.charCodeAt(i + 1) && m2 === src.charCodeAt(i + 2) && m3 === src.charCodeAt(i + 3) && m4 === src.charCodeAt(i + 4) && m5 === src.charCodeAt(i + 5) && m6 === src.charCodeAt(i + 6) && m7 === src.charCodeAt(i + 7)) {
                    return i + 8;
                }
            };
        } else {
            return function (src, i, code, len) {
                if (m0 === code && m1 === src.charCodeAt(i + 1) && m2 === src.charCodeAt(i + 2) && m3 === src.charCodeAt(i + 3) && m4 === src.charCodeAt(i + 4) && m5 === src.charCodeAt(i + 5) && m6 === src.charCodeAt(i + 6) && m7 === src.charCodeAt(i + 7)) {
                    var keyLen = src.length;

                    for (var j = 7; j < keyLen; j++) {
                        if (src.charCodeAt(i + j) !== match.charCodeAt(j)) {
                            return undefined;
                        }
                    }
                }

                return undefined;
            };
        }
    };

    var isWordCode = function (code) {
        return ((code >= 97 && code <= 122) || (code >= 48 && code <= 57) || (code === 95) || (code >= 65 && code <= 90));
    };

    var isWordCharAt = function (src, i) {
        return isWordCode(src.charCodeAt(i));
    };

    var INVALID_TERMINAL = 0;

    var TYPE_FUNCTION = 1, TYPE_WORD_CODE = 2, TYPE_CODE = 3, TYPE_STRING = 4, TYPE_ARRAY = 5;

    var stringToCodes = function (str) {
        var len = str.length, arr = new Array(len);

        for (var i = 0; i < len; i++) {
            arr[i] = str.charCodeAt(i);
        }

        return arr;
    };

    var formatTerminalName = function (str) {
        return str.replace(/([^A-Z])([A-Z]+)/g, function (t, a, b) {
            return a + ' ' + b;
        }).replace('_', ' ').toLowerCase().replace(/\b([a-z])/g, function (t, letter) {
            return letter.toUpperCase();
        });
    };

    var Term = (function () {
        function Term(match, name) {
            this.id = INVALID_TERMINAL;
            this.termName = "<Anonymous Terminal>";
            this.isExplicitelyNamed = false;
            this.type = 0;
            this.onMatchFun = null;
            this.isLiteral = false;
            this.literal = null;
            this.literalLength = 0;
            this.testData = null;
            this.postMatch = null;
            this.terminalParent = null;
            var nameSupplied = (name !== undefined);
            if (name) {
                this.termName = name;
            }

            var literal = null;

            if (match instanceof Term) {
                return match;
            } else if (isFunction(match)) {
                this.isLiteral = false;
                this.testData = match;
                this.type = TYPE_FUNCTION;
            } else {
                this.isLiteral = true;

                var matchType = typeof match;

                if (matchType === 'number' || ((matchType === 'string' || match instanceof String) && match.length === 1)) {
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

                    this.type = isWordCode(match) ? TYPE_WORD_CODE : TYPE_CODE;

                    this.testData = match;
                } else if (matchType === 'string' || match instanceof String) {
                    this.literalLength = match.length;
                    this.isLiteral = true;
                    this.literal = match;
                    this.type = TYPE_STRING;

                    if (match.length === 0) {
                        throw new Error("Empty string given for Terminal");
                    } else {
                        this.testData = stringToCodes(match);

                        if (!nameSupplied) {
                            if (match > 20) {
                                this.termName = "'" + match.substring(0, 20) + "'";
                            } else {
                                this.termName = "'" + match + "'";
                            }
                        }
                    }
                } else if (match instanceof Array) {
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

                    this.type = TYPE_ARRAY;
                    this.isLiteral = isLiteral;
                    this.literalLength = literalLength;
                    this.testData = mTerminals;
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
        };

        Term.prototype.getName = function () {
            return this.termName;
        };

        Term.prototype.setID = function (id) {
            this.id = id;

            if (this.type === TYPE_ARRAY) {
                for (var i = 0; i < this.testData.length; i++) {
                    this.testData[i].setID(id);
                }
            }

            return this;
        };

        Term.prototype.symbolMatch = function (callback) {
            if (callback !== null && !isFunction(callback)) {
                throw new Error("symbolMatch callback is not valid: " + callback);
            }

            this.postMatch = callback;

            return this;
        };

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
    parse.Term = Term;

    var ParseError = (function () {
        function ParseError(offset, source, match) {
            this.isSymbol = false;
            this.isTerminal = false;
            this.offset = offset;
            this.source = source;
            this.match = match;
        }
        ParseError.prototype.getLine = function () {
            return this.source.getLine(this.offset);
        };
        return ParseError;
    })();
    parse.ParseError = ParseError;

    var SymbolError = (function (_super) {
        __extends(SymbolError, _super);
        function SymbolError(i, str, sourceLines) {
            _super.call(this, i, sourceLines, str);
            this.isSymbol = true;

            this.isSymbol = true;
        }
        return SymbolError;
    })(ParseError);
    parse.SymbolError = SymbolError;

    var TerminalError = (function (_super) {
        __extends(TerminalError, _super);
        function TerminalError(symbol, expected) {
            _super.call(this, symbol.offset, symbol.source, symbol.match);
            this.isTerminal = true;

            var term = symbol.terminal;

            this.terminal = term;
            this.terminalName = term.getName();
            this.isLiteral = term.isLiteral;
            this.expected = expected;
        }
        return TerminalError;
    })(ParseError);
    parse.TerminalError = TerminalError;
    ;

    var SourceLines = (function () {
        function SourceLines(src, name) {
            this.numLines = 0;
            this.lineOffsets = null;
            this.source = src;

            this.name = name || '<Unknown Script>';
        }
        SourceLines.prototype.index = function () {
            if (this.lineOffsets == null) {
                var src = this.source;

                var len = src.length;
                var lastIndex = 0;
                var lines = [];
                var running = true;

                var searchIndex = (src.indexOf("\n", lastIndex) !== -1) ? "\n" : "\r";

                while (running) {
                    var index = src.indexOf(searchIndex, lastIndex);

                    if (index != -1) {
                        lines.push(index);
                        lastIndex = index + 1;
                    } else {
                        lines.push(len);
                        running = false;
                    }

                    this.numLines++;
                }

                this.lineOffsets = lines;
            }
        };

        SourceLines.prototype.getSourceName = function () {
            return this.name;
        };

        SourceLines.prototype.getLine = function (offset) {
            this.index();

            for (var line = 0; line < this.lineOffsets.length; line++) {
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
    parse.SourceLines = SourceLines;
    ;

    var Symbol = (function () {
        function Symbol(terminal, offset, sourceLines, match) {
            this.lower = null;
            this['terminal'] = terminal;
            this['offset'] = offset;
            this['source'] = sourceLines;
            this['match'] = match;
        }
        Symbol.prototype.clone = function (newMatch) {
            return new Symbol(this.terminal, this.offset, this.source, newMatch);
        };

        Symbol.prototype.getLower = function () {
            if (this.lower === null) {
                return (this.lower = this.match.toLowerCase());
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
    parse.Symbol = Symbol;

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
                findPossibleTerms((e).rules, terms);
            }
        }
    }

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
                var rules = this.maxRule.compiledLookups[this.maxRuleI], terms = {}, termsArr = [];

                for (var k in rules) {
                    if (k.search(/^[0-9]+/) !== -1) {
                        findPossibleTerms(rules[k], terms);
                    }
                }

                for (var k in terms) {
                    if (terms.hasOwnProperty(k)) {
                        termsArr.push(k);
                    }
                }

                return termsArr;
            }
        };

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
            var symbols = [];

            for (var i = 0; i < this.length; i++) {
                symbols[i] = this.symbols[i].terminal;
            }

            return symbols;
        };

        SymbolResult.prototype.getErrors = function () {
            return this.errors;
        };

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

    var compressTerminals = function (terminals) {
        var termIDToTerms = [];

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
    };

    var compressTerminalsInner = function (termIDToTerms, literalTerms, nonLiteralTerms, terminals) {
        for (var k in terminals) {
            if (terminals.hasOwnProperty(k)) {
                var term = terminals[k];

                if (term.type === TYPE_ARRAY) {
                    compressTerminalsInner(termIDToTerms, literalTerms, nonLiteralTerms, term.testData);
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
    };

    var bruteScan = function (parserRule, seenRules, idsFound) {
        if (seenRules[parserRule.compiledId] !== true) {
            seenRules[parserRule.compiledId] = true;

            var rules = parserRule.rules, isOptional = parserRule.isOptional;

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
    };

    var addRule = function (rule, terminals, id, allRules) {
        if (rule instanceof Term) {
            var termID = rule.id;

            if (termID !== INVALID_TERMINAL) {
                terminals[termID] = rule;
            }

            return id;
        } else {
            return (rule).optimizeScan(terminals, id, allRules);
        }
    };

    var addRuleToLookup = function (id, ruleLookup, term) {
        var arrLookup = ruleLookup[id];

        if (arrLookup === undefined) {
            ruleLookup[id] = term;
        } else if (arrLookup instanceof Array) {
            arrLookup.push(term);
        } else {
            ruleLookup[id] = [arrLookup, term];
        }
    };

    var callParseDebug = function (debugCallback, symbols, compileTime, symbolTime, rulesTime, totalTime) {
        if (debugCallback) {
            var times = {
                compile: compileTime,
                symbols: symbolTime,
                rules: rulesTime,
                total: totalTime
            };

            debugCallback(symbols.getTerminals(), times);
        }
    };

    var NO_RECURSION = 0;

    var RECURSION = 1;

    var NO_COMPILE_ID = -1;

    var ParserRuleImplementation = (function () {
        function ParserRuleImplementation(parse) {
            this.finallyFun = null;
            this.compiled = null;
            this.compiledLookups = null;
            this.compileTime = 0;
            this.compiledId = NO_COMPILE_ID;
            this.rules = [];
            this.isOptional = [];
            this.currentOr = null;
            this.orThisFlag = false;
            this.isRecursive = NO_RECURSION;
            this.isClearingRecursion = false;
            this.recursiveCount = 0;
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

        ParserRuleImplementation.prototype.repeatSeperator = function (match, seperator) {
            return this.seperatingRule(match, seperator);
        };

        ParserRuleImplementation.prototype.optionalSeperator = function (match, seperator) {
            return this.seperatingRule(match, seperator).markOptional(true);
        };

        ParserRuleImplementation.prototype.seperatingRule = function (match, seperator) {
            this.endCurrentOr();

            return this.thenSingle(new ParserRuleImplementation(this.parseParent).markSeperatingRule(match, seperator));
        };

        ParserRuleImplementation.prototype.or = function () {
            return this.orAll(arguments);
        };

        ParserRuleImplementation.prototype.either = function () {
            return this.orAll(arguments);
        };

        ParserRuleImplementation.prototype.thenOr = function () {
            return this.endCurrentOr().orAll(arguments);
        };
        ParserRuleImplementation.prototype.thenEither = function () {
            return this.endCurrentOr().orAll(arguments);
        };

        ParserRuleImplementation.prototype.optional = function () {
            return this.optionalAll(arguments);
        };

        ParserRuleImplementation.prototype.maybe = function () {
            return this.optionalAll(arguments);
        };

        ParserRuleImplementation.prototype.a = function () {
            return this.thenAll(arguments);
        };

        ParserRuleImplementation.prototype.then = function () {
            return this.thenAll(arguments);
        };

        ParserRuleImplementation.prototype.onMatch = function (callback) {
            this.endCurrentOr();

            this.finallyFun = callback;

            return this;
        };

        ParserRuleImplementation.prototype.parseLowerCase = function (input, callback) {
            this.parseInner(input, input.toLowerCase(), callback);
        };

        ParserRuleImplementation.prototype.parseUpperCase = function (input, callback) {
            this.parseInner(input, input.toUpperCase(), callback);
        };

        ParserRuleImplementation.prototype.parse = function (options) {
            var displaySrc, parseSrc, name = null, callback = null, debugCallback = null;

            if (typeof options === 'string' || (options instanceof String)) {
                displaySrc = parseSrc = options;
            } else {
                displaySrc = options['src'];
                parseSrc = options['inputSrc'] || displaySrc;

                name = options['name'] || null;
                callback = options['onFinish'] || null;
                debugCallback = options['onDebug'] || null;
            }

            this.parseInner(displaySrc, parseSrc, callback, debugCallback, name);
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
            this.orAll(arguments);

            this.orThisFlag = true;

            return this;
        };

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

        ParserRuleImplementation.prototype.errorIfEnded = function (ignoreSpecial) {
            if (typeof ignoreSpecial === "undefined") { ignoreSpecial = false; }
            if (this.compiled !== null) {
                throw new Error("New rule added, but 'finally' has already been called");
            }

            if ((this.isCyclic || this.isSeperator) && !ignoreSpecial) {
                throw new Error("Cannot add more rules to a special ParserRule");
            }
        };

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
            } else if (typeof obj === 'string' || obj instanceof String || typeof obj === 'number' || obj instanceof Number || isFunction(obj)) {
                this[singleMethod](this.parseParent['terminal'](obj));
            } else if ((typeof (obj.length)) === 'number') {
                for (var i = 0; i < obj.length; i++) {
                    this.helperAll(singleMethod, obj[i]);
                }
            } else {
                for (var k in obj) {
                    if (obj.hasOwnProperty(k)) {
                        this.helperAll(singleMethod, obj[k]);
                    }
                }
            }

            return this;
        };

        ParserRuleImplementation.prototype.compile = function () {
            if (this.compiled === null) {
                var start = Date.now();

                this.compiled = this.optimize();
                this.compileTime = Date.now() - start;
            }

            return this;
        };

        ParserRuleImplementation.prototype.terminalScan = function () {
            if (this.compiledLookups === null) {
                var rules = this.rules, len = rules.length, lookups = new Array(len);

                for (var i = 0; i < len; i++) {
                    var rule = rules[i], ruleLookup = [];

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
                    } else if (rule instanceof Term) {
                        addRuleToLookup(rule.id, ruleLookup, rule);
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

        ParserRuleImplementation.prototype.optimize = function () {
            var terminals = new Array(this.parseParent.getNumTerminals());

            var allRules = [];
            var len = this.optimizeScan(terminals, 0, allRules);

            for (var i = 0; i < len; i++) {
                allRules[i].terminalScan();
            }

            return compressTerminals(terminals);
        };

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

                        if (rule instanceof Array) {
                            for (var j = 0; j < rule.length; j++) {
                                id = addRule(rule[j], terminals, id, allRules);
                            }
                        } else {
                            id = addRule(rule, terminals, id, allRules);
                        }
                    }
                }

                this.isRecursive = NO_RECURSION;
            }

            return id;
        };

        ParserRuleImplementation.prototype.parseInner = function (input, parseInput, callback, debugCallback, name) {
            if (input === undefined || input === null) {
                throw new Error("no 'input' value provided");
            }

            if (debugCallback !== undefined && debugCallback !== null && !isFunction(debugCallback)) {
                throw new Error("Invalid debugCallback object given");
            }

            var self = this, compileTime = this.compileTime, start = Date.now();

            this.parseSymbols(input, parseInput, name, function (symbols, symbolsTime) {
                if (symbols.hasErrors()) {
                    callback([], symbols.getErrors());
                    callParseDebug(debugCallback, symbols, compileTime, symbolsTime, 0, Date.now() - start);
                } else {
                    var rulesStart = Date.now();
                    var result = self.parseRules(symbols, input, parseInput);
                    var rulesTime = Date.now() - rulesStart;

                    util.future.run(function () {
                        callback(result.result, result.errors);
                        callParseDebug(debugCallback, symbols, compileTime, symbolsTime, rulesTime, Date.now() - start);
                    });
                }
            });
        };

        ParserRuleImplementation.prototype.symbolizeInner = function (input, parseInput, callback) {
            this.parseSymbols(input, parseInput, null, function (symbols) {
                callback(symbols.getTerminals(), symbols.getErrors());
            });
        };

        ParserRuleImplementation.prototype.parseSymbols = function (input, parseInput, name, callback) {
            if (!isFunction(callback)) {
                throw new Error("No callback provided for parsing");
            }

            this.endCurrentOr();

            this['compile']();

            if (this.hasBeenUsed) {
                this.clearRecursionFlag();
                this.hasBeenUsed = false;
            }

            var _this = this;

            util.future.run(function () {
                var start = Date.now();

                var symbols = _this.parseSymbolsInner(input, parseInput, name);
                var time = Date.now() - start;

                callback(symbols, time);
            });
        };

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

            var errors = [], hasError = null;

            if (symbols.hasMore()) {
                var onFinish = this.ruleTest(symbols, inputSrc);

                if (onFinish !== null) {
                    symbols.finalizeMove();

                    if (!symbols.hasMore()) {
                        return {
                            result: onFinish(),
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
            if (this.isSeperator || this.isCyclic) {
                var args = null;

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
                        return function () {
                            for (var i = 0; i < args.length; i++) {
                                var arg = args[i];

                                if (isFunction(arg)) {
                                    arg = arg();
                                } else if (arg instanceof Symbol) {
                                    arg = arg.onFinish();
                                }

                                if (arg === undefined) {
                                    throw new Error("onMatch result is undefined");
                                }

                                args[i] = arg;
                            }

                            return args;
                        };
                    } else {
                        return function () {
                            for (var i = 0; i < args.length; i++) {
                                var arg = args[i];

                                if (isFunction(arg)) {
                                    arg = arg();
                                } else if (arg instanceof Symbol) {
                                    arg = arg.onFinish();
                                }

                                if (arg === undefined) {
                                    throw new Error("onMatch result is undefined");
                                }

                                args[i] = arg;
                            }

                            return finallyFun(args);
                        };
                    }
                }
            } else {
                var args = this.ruleTestNormal(symbols, inputSrc);

                if (args === null) {
                    return null;
                } else {
                    var finallyFun = this.finallyFun;

                    if (finallyFun !== null) {
                        return function () {
                            for (var i = 0; i < args.length; i++) {
                                var arg = args[i];

                                if (isFunction(arg)) {
                                    var r = arg();

                                    if (r === undefined) {
                                        throw new Error("onMatch result is undefined");
                                    } else {
                                        args[i] = r;
                                    }
                                } else if (arg instanceof Symbol) {
                                    var r = arg.onFinish();

                                    if (r === undefined) {
                                        throw new Error("onMatch result is undefined");
                                    } else {
                                        args[i] = r;
                                    }
                                }
                            }

                            return finallyFun.apply(null, args);
                        };
                    } else {
                        var arg = args[0];

                        return function () {
                            if (isFunction(arg)) {
                                var r = arg();

                                if (r === undefined) {
                                    throw new Error("onMatch result is undefined");
                                } else {
                                    return r;
                                }
                            } else if (arg instanceof Symbol) {
                                var r = arg.onFinish();

                                if (r === undefined) {
                                    throw new Error("onMatch result is undefined");
                                } else {
                                    return r;
                                }
                            } else {
                                return arg;
                            }
                        };
                    }
                }
            }
        };

        ParserRuleImplementation.prototype.ruleTestSeperator = function (symbols, inputSrc) {
            var lookups = this.compiledLookups, peekID = symbols.peekID(), onFinish = null, rules = lookups[0], rule = rules[peekID];

            if (rule === undefined) {
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
                while (symbols.hasMore()) {
                    symbolI = symbols.idIndex();
                    peekID = symbols.peekID();

                    var separator = separators[peekID], hasSeperator = false;

                    if (separator === undefined) {
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
                        rule = rules[peekID];

                        if (rule === undefined) {
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

        ParserRuleImplementation.prototype.ruleTestNormal = function (symbols, inputSrc) {
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
                var rule = lookups[i][peekID];

                if (rule === undefined) {
                    if (optional[i]) {
                        if (args === null) {
                            args = [null];
                            this.isRecursive = NO_RECURSION;
                        } else {
                            args.push(null);
                        }
                    } else {
                        if (i !== 0) {
                            symbols.back(symbols.idIndex() - startSymbolI, this, i);
                        }

                        this.isRecursive = startSymbolI;
                        if (this.recursiveCount > 0) {
                            this.recursiveCount--;
                        }

                        args = null;
                        break;
                    }
                } else {
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
                    } else if (rule instanceof ParserRuleImplementation) {
                        onFinish = rule.ruleTest(symbols, inputSrc);
                    } else if (peekID === rule.id) {
                        onFinish = symbols.next();
                    }

                    if (onFinish === null && !optional[i]) {
                        symbols.back(symbols.idIndex() - startSymbolI, this, i);

                        this.isRecursive = startSymbolI;

                        args = null;
                        break;
                    } else {
                        if (args === null) {
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
                    var peekID = symbols.peekID(), rule = lookups[i][peekID];

                    if (rule === undefined) {
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

        ParserRuleImplementation.prototype.parseSymbolsInner = function (inputSrc, src, name) {
            var sourceLines = new SourceLines(inputSrc, name);

            var symbolI = 0, len = src.length, symbols = [], symbolIDs = [], ignores = getIgnores(this.parseParent), literals = this.compiled.literals, terminals = this.compiled.terminals, allTerms = ignores.concat(literals, terminals), ignoresLen = ignores.length, literalsLen = ignoresLen + literals.length, termsLen = literalsLen + terminals.length, ignoresTests = new Array(ignoresLen), literalsData = new Array(literalsLen), literalsMatches = new Array(literalsLen), literalsType = new Array(literalsLen), symbolIDToTerms = this.compiled.idToTerms, postMatches = new Array(termsLen), termTests = new Array(termsLen), termIDs = new Array(termsLen), multipleIgnores = (ignores.length > 1), NO_ERROR = -1, errorStart = NO_ERROR, errors = [];

            for (var i = 0; i < allTerms.length; i++) {
                var term = allTerms[i], test = term.testData;

                if (i < ignoresLen) {
                    ignoresTests[i] = test;
                } else if (i < literalsLen) {
                    literalsData[i] = term.testData;
                    literalsMatches[i] = term.literal;
                    literalsType[i] = term.type;
                } else {
                    termTests[i] = test;
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

                    var j = 0;
                    var r;

                    while (j < ignoresLen) {
                        r = ignoresTests[j](src, i, code, len);

                        if (r !== undefined && r !== false && r > i) {
                            code = src.charCodeAt(r);

                            var postMatchEvent = postMatches[j];
                            if (postMatchEvent !== null) {
                                var r2 = postMatchEvent(src, r, code, len);

                                if (r2 !== undefined && r2 > r) {
                                    i = r2;
                                    code = src.charCodeAt(r2);
                                } else {
                                    i = r;
                                }
                            } else {
                                i = r;
                            }

                            if (multipleIgnores) {
                                j = 0;
                            }
                        } else {
                            j++;
                        }
                    }

                    r = 0;
                    scan_literals:
                    while (j < literalsLen) {
                        var type = literalsType[j], match = literalsData[j];

                        if (type === TYPE_STRING) {
                            var testLen = match.length;

                            for (var testI = 0; testI < testLen; testI++) {
                                if (src.charCodeAt(i + testI) !== match[testI]) {
                                    j++;
                                    continue scan_literals;
                                }
                            }

                            if (!isWordCharAt(src, i + testI)) {
                                r = i + testI;
                            } else {
                                j++;
                                continue scan_literals;
                            }
                        } else if (type === TYPE_CODE) {
                            if (code === match) {
                                r = i + 1;
                            } else {
                                j++;
                                continue scan_literals;
                            }
                        } else if (type === TYPE_WORD_CODE) {
                            if (code === match && !isWordCode(src.charCodeAt(i + 1))) {
                                r = i + 1;
                            } else {
                                j++;
                                continue scan_literals;
                            }
                        }

                        if (r > i) {
                            symbolIDs[symbolI] = termIDs[j];
                            symbols[symbolI++] = new Symbol(allTerms[j], i, sourceLines, literalsMatches[j]);

                            if (errorStart !== NO_ERROR) {
                                errors.push(new SymbolError(errorStart, inputSrc.substring(errorStart, i), sourceLines));

                                errorStart = NO_ERROR;
                            }

                            var postMatchEvent = postMatches[j];
                            if (postMatchEvent !== null) {
                                code = src.charCodeAt(r);

                                var r2 = postMatchEvent(src, r, code, len);

                                if (r2 !== undefined && r2 > r) {
                                    i = r2;
                                } else {
                                    i = r;
                                }
                            } else {
                                i = r;
                            }

                            continue scan;
                        }

                        j++;
                    }

                    while (j < termsLen) {
                        r = termTests[j](src, i, code, len);

                        if (r !== undefined && r !== false && r > i) {
                            symbolIDs[symbolI] = termIDs[j];

                            symbols[symbolI++] = new Symbol(allTerms[j], i, sourceLines, inputSrc.substring(i, r));

                            if (errorStart !== NO_ERROR) {
                                errors.push(new SymbolError(errorStart, inputSrc.substring(errorStart, i), sourceLines));

                                errorStart = NO_ERROR;
                            }

                            var postMatchEvent = postMatches[j];
                            if (postMatchEvent !== null) {
                                code = src.charCodeAt(r);

                                var r2 = postMatchEvent(src, r, code, len);

                                if (r2 !== undefined && r2 > r) {
                                    i = r2;
                                } else {
                                    i = r;
                                }
                            } else {
                                i = r;
                            }

                            continue scan;
                        }

                        j++;
                    }

                    errorStart = i;
                    i++;
                }

                if (errorStart !== NO_ERROR && errorStart < len) {
                    errors.push(new SymbolError(errorStart, inputSrc.substring(errorStart, i), sourceLines));
                }

                return new SymbolResult(errors, symbols, symbolIDs, symbolI, symbolIDToTerms);
            }
        };
        return ParserRuleImplementation;
    })();

    var ignoreSingle = function (ps, term) {
        if (term instanceof Term) {
            ingoreInner(ps, term);
        } else {
            if (term instanceof String || isFunction(term)) {
                ignoreSingle(ps, terminal(term));
            } else if (term instanceof Array) {
                for (var i = 0; i < term.length; i++) {
                    ignoreSingle(ps, terminalsInner(term[i], null));
                }
            } else if (term instanceof Object) {
                for (var k in term) {
                    if (term.hasOwnProperty(k)) {
                        ignoreSingle(ps, terminalsInner(term[k], k));
                    }
                }
            } else {
                throw new Error("unknown ignore terminal given");
            }
        }
    };

    function getIgnores(ps) {
        return ps.ignores;
    }

    function ingoreInner(ps, t) {
        ps.ignores.push(t);
    }

    function terminalsInner(ps, t, termName) {
        if (t instanceof Object && !isFunction(t) && !(t instanceof Array)) {
            var terminals = {};

            for (var name in t) {
                if (t.hasOwnProperty(name)) {
                    terminals[name] = terminalsInner(ps, t[name], name);
                }
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

    var Parse = (function () {
        function Parse() {
            this.terminalID = INVALID_TERMINAL + 1;
            this.ignores = [];
        }
        Parse.prototype.getNumTerminals = function () {
            return this.terminalID - (INVALID_TERMINAL + 1);
        };

        Parse.prototype.rule = function () {
            return new ParserRuleImplementation(this);
        };

        Parse.prototype.name = function (name) {
            return new ParserRuleImplementation(this).name(name);
        };

        Parse.prototype.a = function () {
            return new ParserRuleImplementation(this).thenAll(arguments);
        };

        Parse.prototype.or = function () {
            return new ParserRuleImplementation(this).orAll(arguments);
        };

        Parse.prototype.either = function () {
            return new ParserRuleImplementation(this).orAll(arguments);
        };

        Parse.prototype.optional = function () {
            return new ParserRuleImplementation(this).optionalAll(arguments);
        };

        Parse.prototype.maybe = function () {
            return new ParserRuleImplementation(this).optionalAll(arguments);
        };

        Parse.prototype.ignore = function () {
            for (var i = 0; i < arguments.length; i++) {
                ignoreSingle(this, arguments[i]);
            }

            return this;
        };

        Parse.prototype.repeatSeperator = function (match, seperator) {
            return new ParserRuleImplementation(this).repeatSeperator(match, seperator);
        };

        Parse.prototype.optionalSeperator = function (match, seperator) {
            return new ParserRuleImplementation(this).optionalSeperator(match, seperator);
        };

        Parse.prototype.repeatEither = function () {
            return new ParserRuleImplementation(this).cyclicOrAll(arguments);
        };

        Parse.prototype.repeat = function () {
            return new ParserRuleImplementation(this).cyclicOrSingle(new ParserRuleImplementation(this).thenAll(arguments));
        };

        Parse.prototype.terminals = function (obj) {
            return terminalsInner(this, obj, null);
        };
        return Parse;
    })();
    parse.Parse = Parse;

    var pInstance = new Parse();

    function rule() {
        return new ParserRuleImplementation(pInstance);
    }
    parse.rule = rule;

    function name(name) {
        return new ParserRuleImplementation(pInstance).name(name);
    }
    parse.name = name;

    function a() {
        return new ParserRuleImplementation(pInstance).thenAll(arguments);
    }
    parse.a = a;

    function either() {
        return new ParserRuleImplementation(pInstance).orAll(arguments);
    }
    parse.either = either;

    function optional() {
        return new ParserRuleImplementation(pInstance).optionalAll(arguments);
    }
    parse.optional = optional;

    parse.maybe = optional;

    function ignore() {
        for (var i = 0; i < arguments.length; i++) {
            ignoreSingle(pInstance, arguments[i]);
        }

        return pInstance;
    }
    parse.ignore = ignore;

    function repeatSeperator(match, seperator) {
        return new ParserRuleImplementation(pInstance).repeatSeperator(match, seperator);
    }
    parse.repeatSeperator = repeatSeperator;

    function optionalSeperator(match, seperator) {
        return new ParserRuleImplementation(pInstance).optionalSeperator(match, seperator);
    }
    parse.optionalSeperator = optionalSeperator;

    function repeatEither() {
        return new ParserRuleImplementation(pInstance).cyclicOrAll(arguments);
    }
    parse.repeatEither = repeatEither;

    function repeat() {
        return new ParserRuleImplementation(pInstance).cyclicOrSingle(new ParserRuleImplementation(pInstance).thenAll(arguments));
    }
    parse.repeat = repeat;

    parse.code = {
        'isNumeric': isNumericCode,
        'isHex': isHexCode,
        'isAlpha': isAlphaCode,
        'isAlphaNumeric': isAlphaNumericCode
    };

    function terminals(t) {
        return terminalsInner(pInstance, t, null);
    }
    parse.terminals = terminals;

    function terminal(match, termName) {
        return terminalsInner(pInstance, match, termName);
    }
    parse.terminal = terminal;

    (function (terminal) {
        terminal.WHITESPACE = function (src, i, code, len) {
            while (code === SPACE || code === TAB) {
                i++;
                code = src.charCodeAt(i);
            }

            return i;
        };

        terminal.WHITESPACE_END_OF_LINE = function (src, i, code, len) {
            while (code === SPACE || code === TAB || code === SLASH_N || code === SLASH_R) {
                i++;
                code = src.charCodeAt(i);
            }

            return i;
        };

        terminal.NUMBER = function (src, i, code, len) {
            if (code < ZERO || code > NINE) {
                return;
            } else if (code === ZERO && src.charCodeAt(i + 1) === LOWER_X) {
                i += 1;

                do {
                    i++;
                    code = src.charCodeAt(i);
                } while(code === UNDERSCORE || isHexCode(code));
            } else {
                var start = i;
                do {
                    i++;
                    code = src.charCodeAt(i);
                } while(code === UNDERSCORE || (code >= ZERO && code <= NINE));

                if (src.charCodeAt(i) === FULL_STOP && isNumericCode(src.charCodeAt(i + 1))) {
                    var code;
                    i++;

                    do {
                        i++;
                        code = src.charCodeAt(i);
                    } while(code === UNDERSCORE || (code >= ZERO && code <= NINE));
                }
            }

            return i;
        };

        terminal.C_SINGLE_LINE_COMMENT = function (src, i, code, len) {
            if (code === SLASH && src.charCodeAt(i + 1) === SLASH) {
                i++;

                do {
                    i++;
                    code = src.charCodeAt(i);
                } while(i < len && code !== SLASH_N);

                return i;
            }
        };

        terminal.C_MULTI_LINE_COMMENT = function (src, i, code, len) {
            if (code === SLASH && src.charCodeAt(i + 1) === STAR) {
                i++;

                do {
                    i++;

                    if (i >= len) {
                        return;
                    }
                } while(!(src.charCodeAt(i) === STAR && src.charCodeAt(i + 1) === SLASH));

                return i + 2;
            }
        };

        terminal.STRING = function (src, i, code, len) {
            var start = i;

            if (code === DOUBLE_QUOTE) {
                do {
                    i++;

                    if (i >= len) {
                        return;
                    }
                } while(!(src.charCodeAt(i) === DOUBLE_QUOTE && src.charCodeAt(i - 1) !== BACKSLASH));

                return i + 1;
            } else if (code === SINGLE_QUOTE) {
                do {
                    i++;

                    if (i >= len) {
                        return;
                    }
                } while(!(src.charCodeAt(i) === SINGLE_QUOTE && src.charCodeAt(i - 1) !== BACKSLASH));

                return i + 1;
            }
        };
    })(parse.terminal || (parse.terminal = {}));
    var terminal = parse.terminal;
})(parse || (parse = {}));
"use strict";
var quby;
(function (quby) {
    (function (ast) {
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

        var functionGeneratorFactories = {
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

        var getFunctionGenerator = function (v, fun) {
            var name = fun.getName().toLowerCase();
            var modifierFactory = functionGeneratorFactories[name];

            if (modifierFactory) {
                var params = fun.getParameters();

                if (params.length === 1) {
                    return modifierFactory(fun, params.getStmts()[0]);
                } else {
                    var generators = [];

                    params.each(function (param) {
                        generators.push(modifierFactory(fun, param));
                    });

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

            Syntax.prototype.printAsCondition = function (p) {
                p.appendPre('var ', quby.runtime.TEMP_VARIABLE, ';');

                p.append('((', quby.runtime.TEMP_VARIABLE, '=');
                this.print(p);
                p.append(') !== null && ', quby.runtime.TEMP_VARIABLE, ' !== false)');

                p.appendPost('delete ', quby.runtime.TEMP_VARIABLE, ';');
            };

            Syntax.prototype.validate = function (v) {
                quby.runtime.error("Internal", "Error, validate has not been overridden");
            };

            Syntax.prototype.setOffset = function (offset) {
                this.offset = offset;
            };

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
                if (typeof stmts === "undefined") { stmts = []; }
                this.stmts = stmts;
                this.seperator = strSeperator;
                this.appendToLast = appendToLast;
                this.offset = null;
                this.length = stmts.length;

                for (var i = 0; i < stmts.length; i++) {
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

            SyntaxList.prototype.add = function (stmt) {
                this.ensureOffset(stmt);
                this.stmts.push(stmt);
                this.length++;

                return this;
            };
            SyntaxList.prototype.unshift = function (stmt) {
                this.ensureOffset(stmt);
                this.stmts.unshift(stmt);
                this.length++;

                return this;
            };
            SyntaxList.prototype.ensureOffset = function (stmt) {
                if (this.offset === null) {
                    this.offset = stmt.offset;
                }
            };
            SyntaxList.prototype.print = function (p) {
                var length = this.stmts.length;

                for (var i = 0; i < length; i++) {
                    this.stmts[i].print(p);

                    if (this.appendToLast || i < length - 1) {
                        p.append(this.seperator);
                    }
                }
            };

            SyntaxList.prototype.setArr = function (arr) {
                this.stmts = arr;
                this.length = arr.length;

                if (arr.length > 0) {
                    this.ensureOffset(arr[0]);
                }

                return this;
            };

            SyntaxList.prototype.validate = function (v) {
                for (var i = 0; i < this.stmts.length; i++) {
                    this.stmts[i].validate(v);
                }
            };

            SyntaxList.prototype.each = function (fun) {
                for (var i = 0; i < this.stmts.length; i++) {
                    fun(this.stmts[i]);
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
                p.printArray(this.getStmts());
            };
            return Statements;
        })(SyntaxList);
        ast.Statements = Statements;

        var Parameters = (function (_super) {
            __extends(Parameters, _super);
            function Parameters(params) {
                _super.call(this, ',', false, params);

                this.blockParam = null;
                this.errorParam = null;
                this.blockParamPosition = -1;
            }
            Parameters.prototype.add = function (param) {
                if (param instanceof ParameterBlockVariable) {
                    this.setBlockParam(param);
                } else {
                    SyntaxList.call(this, param);
                }

                return this;
            };

            Parameters.prototype.addFirst = function (param) {
                if (param instanceof ParameterBlockVariable) {
                    this.setBlockParam(param);
                } else {
                    SyntaxList.call(this, param);

                    this.getStmts().pop();
                    this.getStmts().unshift(param);
                }

                return this;
            };

            Parameters.prototype.setArr = function (params) {
                for (var i = 0; i < params.length; i++) {
                    if (params[i] instanceof ParameterBlockVariable) {
                        this.setBlockParam(params[i]);
                        params.splice(i, 1);
                    }
                }

                return _super.prototype.setArr.call(this, params);
            };

            Parameters.prototype.setBlockParam = function (blockParam) {
                if (this.blockParam !== null) {
                    this.errorParam = blockParam;
                } else {
                    this.blockParam = blockParam;

                    this.blockParamPosition = this.getStmts().length;
                }
            };

            Parameters.prototype.getBlockParam = function () {
                return this.blockParam;
            };

            Parameters.prototype.validate = function (v) {
                if (this.blockParam != null) {
                    if (this.errorParam != null) {
                        v.parseError(this.errorParam.offset, "Only one block parameter is allowed.");
                    } else if (this.blockParamPosition < this.getStmts().length) {
                        v.parseError(this.blockParam.offset, "Block parameter must be the last parameter.");
                    }
                }

                _super.prototype.validate.call(this, v);

                if (this.blockParam != null) {
                    this.blockParam.validate(v);
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

        var StmtBlock = (function (_super) {
            __extends(StmtBlock, _super);
            function StmtBlock(condition, stmts) {
                if (condition !== null) {
                    _super.call(this, condition.offset);
                } else {
                    _super.call(this, stmts.offset);
                }

                this.condition = condition;
                this.stmts = stmts;
            }
            StmtBlock.prototype.validate = function (v) {
                if (this.condition !== null) {
                    this.condition.validate(v);
                }

                this.stmts.validate(v);
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
                this.getStmts().print(p);
                p.append(postBlock);
            };
            return StmtBlock;
        })(Syntax);
        ast.StmtBlock = StmtBlock;

        var IfStmt = (function (_super) {
            __extends(IfStmt, _super);
            function IfStmt(ifs, elseIfs, elseBlock) {
                _super.call(this, ifs.getOffset());

                this.ifStmts = ifs;
                this.elseIfStmts = elseIfs;
                this.elseStmt = elseBlock;
            }
            IfStmt.prototype.validate = function (v) {
                this.ifStmts.validate(v);

                if (this.elseIfStmts !== null) {
                    this.elseIfStmts.validate(v);
                }

                if (this.elseStmt !== null) {
                    this.elseStmt.validate(v);
                }
            };

            IfStmt.prototype.print = function (p) {
                this.ifStmts.print(p);

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
                    this.stmts.validate(v);
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

                p.append(')');

                p.append('{');
                this.stmts.print(p);
                p.append('}');
            };
            return WhenClause;
        })(Syntax);
        ast.WhenClause = WhenClause;

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
                p.append('do{');
                this.getStmts().print(p);
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
                this.getStmts().print(p);
                p.append('}while(!(');
                this.getCondition().printAsCondition(p);
                p.append('))');
            };
            return LoopUntil;
        })(StmtBlock);
        ast.LoopUntil = LoopUntil;

        var ClassHeader = (function (_super) {
            __extends(ClassHeader, _super);
            function ClassHeader(identifier, extendsId) {
                _super.call(this, identifier);

                if (extendsId == null) {
                    this.extendsCallName = quby.runtime.ROOT_CLASS_CALL_NAME;
                    this.extendsName = quby.runtime.ROOT_CLASS_NAME;
                } else {
                    this.extendsCallName = quby.runtime.formatClass(extendsId.match);
                    this.extendsName = extendsId.match;
                }

                this.classId = identifier;
                this.extendId = extendsId;
                this.match = identifier.match;
            }
            ClassHeader.prototype.getName = function () {
                return this.match;
            };

            ClassHeader.prototype.getSuperCallName = function () {
                return this.extendsCallName;
            };

            ClassHeader.prototype.getSuperName = function () {
                return this.extendsName;
            };

            ClassHeader.prototype.validate = function (v) {
                var name = this.classId.getLower();

                if (this.hasSuper()) {
                    var extendName = this.extendId.getLower();
                    var extendStr = this.extendId.match;

                    if (name == extendName) {
                        v.parseError(this.offset, "Class '" + this.match + "' is extending itself.");
                    } else if (quby.runtime.isCoreClass(name)) {
                        v.parseError(this.offset, "Core class '" + this.match + "' cannot extend alternate class '" + extendStr + "'.");
                    } else if (quby.runtime.isCoreClass(extendName)) {
                        v.parseError(this.offset, "Class '" + this.match + "' cannot extend core class '" + extendStr + "'.");
                    }
                }
            };

            ClassHeader.prototype.hasSuper = function () {
                return this.extendId !== null;
            };
            return ClassHeader;
        })(Syntax);
        ast.ClassHeader = ClassHeader;

        var ModuleDeclaration = (function (_super) {
            __extends(ModuleDeclaration, _super);
            function ModuleDeclaration(symName, statements) {
                _super.call(this, symName);
            }
            ModuleDeclaration.prototype.print = function (p) {
            };
            ModuleDeclaration.prototype.validate = function (v) {
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

        var ClassDeclaration = (function (_super) {
            __extends(ClassDeclaration, _super);
            function ClassDeclaration(classHeader, statements) {
                if (quby.runtime.isCoreClass(classHeader.getName().toLowerCase())) {
                    return new ExtensionClassDeclaration(classHeader, statements);
                } else {
                    var name = classHeader.getName();

                    _super.call(this, classHeader.offset, name, quby.runtime.formatClass(name));

                    this.header = classHeader;
                    this.statements = statements;

                    this.classValidator = null;
                }
            }
            ClassDeclaration.prototype.getStatements = function () {
                return this.statements;
            };

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

            ExtensionClassDeclaration.prototype.isExtensionClass = function () {
                return true;
            };

            ExtensionClassDeclaration.prototype.getHeader = function () {
                return this.header;
            };

            ExtensionClassDeclaration.prototype.setHeader = function (header) {
                this.header = header;
            };

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

            ExtensionClassDeclaration.prototype.getSuperCallName = function () {
                return quby.runtime.ROOT_CLASS_CALL_NAME;
            };
            return ExtensionClassDeclaration;
        })(NamedSyntax);
        ast.ExtensionClassDeclaration = ExtensionClassDeclaration;

        var ClassIdentifier = (function (_super) {
            __extends(ClassIdentifier, _super);
            function ClassIdentifier(sym) {
                _super.call(this, sym);
            }
            ClassIdentifier.prototype.validate = function (v) {
            };
            ClassIdentifier.prototype.print = function (p) {
            };
            return ClassIdentifier;
        })(Syntax);
        ast.ClassIdentifier = ClassIdentifier;

        var FunctionDeclaration = (function (_super) {
            __extends(FunctionDeclaration, _super);
            function FunctionDeclaration(symName, parameters, stmtBody) {
                _super.call(this, symName, symName.match, '');

                this.type = FunctionDeclaration.FUNCTION;

                this.parameters = parameters;

                if (parameters !== null) {
                    this.blockParam = parameters.getBlockParam();
                    this.setCallName(quby.runtime.formatFun(symName.match, parameters.length));
                } else {
                    this.blockParam = null;
                    this.setCallName(quby.runtime.formatFun(symName.match, 0));
                }

                this.stmtBody = stmtBody;

                this.preVariables = [];

                this.autoReturn = false;
            }
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
                return this.type !== FunctionDeclaration.METHOD;
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
                this.preVariables.push(variable);
            };

            FunctionDeclaration.prototype.validate = function (v) {
                if (this.isFunction() && v.isInsideClass()) {
                    this.setType(FunctionDeclaration.METHOD);
                }

                var isOutFun = true;

                if (v.isInsideFun()) {
                    var otherFun = v.getCurrentFun();
                    var strOtherType = (otherFun.isMethod() ? "method" : "function");

                    v.parseError(this.offset, "Function '" + this.getName() + "' is defined within " + strOtherType + " '" + otherFun.getName() + "', this is not allowed.");
                    isOutFun = false;
                } else {
                    var strType = (this.isMethod() ? "Method" : "Function");

                    v.ensureOutBlock(this, strType + " '" + this.getName() + "' is within a block, this is not allowed.");
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
                if (!this.isMethod()) {
                    p.setCodeMode(false);
                }

                if (this.isMethod() && !this.isConstructor()) {
                    p.append(this.getCallName(), '=function');
                } else {
                    p.append('function ', this.getCallName());
                }

                this.printParameters(p);
                this.printBody(p);

                if (!this.isMethod()) {
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

                p.append('return null;', '}');
            };

            FunctionDeclaration.prototype.printPreVars = function (p) {
                if (this.preVariables.length > 0) {
                    p.append('var ');

                    for (var i = 0; i < this.preVariables.length; i++) {
                        if (i > 0) {
                            p.append(',');
                        }

                        var variable = this.preVariables[i];
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

        var Constructor = (function (_super) {
            __extends(Constructor, _super);
            function Constructor(sym, parameters, stmtBody) {
                _super.call(this, sym, parameters, stmtBody);

                this.className = '';
                this.klass = null;
                this.isExtensionClass = false;

                this.setType(FunctionDeclaration.CONSTRUCTOR);
            }
            Constructor.prototype.setClass = function (klass) {
                this.klass = klass;

                this.setCallName(quby.runtime.formatNew(klass.name, this.getNumParameters()));

                this.className = klass.callName;
            };

            Constructor.prototype.validate = function (v) {
                if (v.ensureInClass(this, "Constructors must be defined within a class.")) {
                    this.setClass(v.getCurrentClass().getClass());

                    this.isExtensionClass = v.isInsideExtensionClass();
                    if (this.isExtensionClass) {
                        v.ensureAdminMode(this, "Cannot add constructor to core class: '" + v.getCurrentClass().getClass().getName() + "'");
                    }

                    v.setInConstructor(true);
                    _super.prototype.validate.call(this, v);
                    v.setInConstructor(false);
                }
            };

            Constructor.prototype.printParameters = function (p) {
                p.append('(');

                if (!this.isExtensionClass) {
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

                if (!this.isExtensionClass) {
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

                this.setCallName(name.match);
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

        var FunctionCall = (function (_super) {
            __extends(FunctionCall, _super);
            function FunctionCall(sym, parameters, block) {
                _super.call(this, sym, sym.match, quby.runtime.formatFun(sym.match, (parameters !== null) ? parameters.length : 0));

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
                if (this.getNumParameters() > 0) {
                    this.parameters.print(p);
                    p.append(',');
                }

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
                    if (this.expr['appendLeft'] !== undefined) {
                        this.expr['appendLeft'](expr);
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

                        if (_this.superKlassVal == undefined) {
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

        var JSMethodCall = (function (_super) {
            __extends(JSMethodCall, _super);
            function JSMethodCall(expr, sym, params, block) {
                _super.call(this, sym, params, block);

                this.setJSLiteral(true);
            }
            return JSMethodCall;
        })(FunctionCall);
        ast.JSMethodCall = JSMethodCall;

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

                this.isExtensionClass = false;
                this.className = quby.runtime.formatClass(name.match);

                this.setCallName(quby.runtime.formatNew(name.match, this.getNumParameters()));
            }
            NewInstance.prototype.print = function (p) {
                p.append(this.getCallName(), '(');

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

                v.onEndValidate(function (v) {
                    var klassVal = v.getClass(_this.className);

                    if (klassVal) {
                        var klass = klassVal.getClass();

                        if ((!klassVal.hasNew(_this)) || (klassVal.noNews() && _this.getNumParameters() > 0)) {
                            if (klassVal.noNews() && klass.isExtensionClass) {
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

                p.appendPre('quby_ensureBlock(', quby.runtime.BLOCK_VARIABLE, ', ', '' + paramsLen, ');');
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

        var GenericOp = (function (_super) {
            __extends(GenericOp, _super);
            function GenericOp(offset, isResultBool, precedence) {
                _super.call(this, offset, isResultBool);

                this.balanceDone = false;
                this.precedence = precedence;
                this.proxy = null;
            }
            GenericOp.prototype.setProxy = function (other) {
                this.proxy = other;
            };

            GenericOp.prototype.validateOp = function (v) {
            };

            GenericOp.prototype.printOp = function (p) {
            };

            GenericOp.prototype.printAsConditionOp = function (p) {
                _super.prototype.printAsCondition.call(this, p);
            };

            GenericOp.prototype.validate = function (v) {
                if (this.proxy !== null) {
                    this.proxy.validate(v);
                } else if (this.balanceDone) {
                    this.validateOp(v);
                } else {
                    var self = this.rebalance();

                    if (self !== this) {
                        this.proxy = self;

                        self.validate(v);
                    } else {
                        this.validateOp(v);
                    }
                }
            };

            GenericOp.prototype.print = function (p) {
                if (this.proxy === null) {
                    this.printOp(p);
                } else {
                    this.proxy.print(p);
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
                    var precedence = (other).getPrecedence();

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
                var expr = this.expr;

                if (expr instanceof GenericOp) {
                    expr = (expr).rebalance();
                }

                if (this.testSwap(expr)) {
                    this.expr = (expr).swapExpr(this);

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

                p.appendPost('delete ', temp, ';');
            };
            return Not;
        })(SingleOp);
        ast.Not = Not;

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
                    right = (right).rebalance();

                    if (right instanceof GenericOp) {
                        if (this.testSwap(right)) {
                            this.right = (right).swapExpr(this);
                            return right;
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
                    if (this.left['appendLeft'] !== undefined) {
                        this.left['appendLeft'](left);
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

        var newShortOp = function (symbol, precedence, isResultBool) {
            return function (left, right) {
                return new Op(left, right, symbol, isResultBool, precedence);
            };
        };

        ast.ShiftLeft = newShortOp("<<", 5, false);
        ast.ShiftRight = newShortOp(">>", 5, false);

        ast.LessThan = newShortOp("<", 6, true);
        ast.LessThanEqual = newShortOp("<=", 6, true);
        ast.GreaterThan = newShortOp(">", 6, true);
        ast.GreaterThanEqual = newShortOp(">=", 6, true);

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

        ast.Equality = newShortOp("==", 8, true);
        ast.NotEquality = newShortOp("!=", 8, true);

        ast.BitAnd = newShortOp('&', 9, false);
        ast.BitOr = newShortOp('|', 9, false);

        var BoolOp = (function (_super) {
            __extends(BoolOp, _super);
            function BoolOp(left, right, syntax, precedence) {
                _super.call(this, left, right, syntax, false, precedence);

                this.useSuperPrint = false;
            }
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

                p.appendPost('delete ', temp, ';');
            };
            return BoolAnd;
        })(BoolOp);
        ast.BoolAnd = BoolAnd;

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

                if (left['setAssignment'] === undefined) {
                    v.parseError(left.getOffset() || this.getOffset(), "Illegal assignment");
                } else {
                    (left).setAssignment(v, this);

                    _super.prototype.validateOp.call(this, v);
                }
            };

            Assignment.prototype.printOp = function (p) {
                if (this.isCollectionAssignment) {
                    p.append('quby_setCollection(');
                    this.getLeft().print(p);
                    p.append(',');
                    this.getRight().print(p);
                    p.append(')');
                } else {
                    this.getLeft().print(p);
                    p.append('=');
                    this.getRight().print(p);
                }
            };
            return Assignment;
        })(Op);
        ast.Assignment = Assignment;

        var Variable = (function (_super) {
            __extends(Variable, _super);
            function Variable(identifier, callName) {
                _super.call(this, identifier, identifier.match, callName);

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

        var LocalVariable = (function (_super) {
            __extends(LocalVariable, _super);
            function LocalVariable(identifier) {
                _super.call(this, identifier, quby.runtime.formatVar(identifier.match));

                this.useVar = false;
            }
            LocalVariable.prototype.validate = function (v) {
                if (this.isAssignment()) {
                    v.assignVar(this);

                    this.useVar = !v.isInsideBlock();
                } else if (v.isInsideParameters()) {
                    if (v.containsLocalVar(this)) {
                        v.parseError(this.offset, "parameter variable name used multiple times '" + this.getName() + "'");
                    }

                    v.assignVar(this);
                } else if (!this.isJSLiteral() && !v.containsVar(this)) {
                    v.parseError(this.offset, "variable used before it's assigned to '" + this.getName() + "'");
                }
            };

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
                _super.call(this, identifier, quby.runtime.formatGlobal(identifier.match));
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
                _super.call(this, identifier, identifier.match.substring(1));

                this.klass = null;
                this.isInsideExtensionClass = false;
            }
            FieldVariable.prototype.validate = function (v) {
                var name = this.getName();

                if (v.ensureOutFunParameters(this, "class field '" + name + "' used as function parameter.") && v.ensureOutParameters(this, "object field '" + name + "' used as block parameter") && v.ensureInClass(this, "field '" + name + "' is used outside of a class, they can only be used inside.") && v.ensureInMethod(this, "class field '" + name + "' is used outside of a method.")) {
                    var klass = v.getCurrentClass().getClass();
                    this.klass = klass;

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

                this.setCallName(identifier.match);
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

        var ComplexLiteral = (function (_super) {
            __extends(ComplexLiteral, _super);
            function ComplexLiteral(pre, parameters, post) {
                var offset;
                if (parameters) {
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

        var Literal = (function (_super) {
            __extends(Literal, _super);
            function Literal(sym, isTrue, altMatch) {
                this.match = altMatch ? altMatch : sym.match;

                _super.call(this, sym);

                this.isTrue = isTrue;
            }
            Literal.prototype.getMatch = function () {
                return this.match;
            };

            Literal.prototype.validate = function (v) {
            };

            Literal.prototype.print = function (p) {
                p.append(this.match);
            };

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

                this.callName = quby.runtime.formatSymbol(sym.match);
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
                var matchStr;

                var origNum = sym.match, num = origNum.replace(/_+/g, ''), decimalCount = 0;

                var matchStr = (num.indexOf('.') === -1) ? "" + ((num) | 0) : "" + (parseFloat(num));

                _super.call(this, sym, true, matchStr);
            }
            return Number;
        })(Literal);
        ast.Number = Number;

        var String = (function (_super) {
            __extends(String, _super);
            function String(sym) {
                _super.call(this, sym, true, sym.match.replace(/\n/g, "\\n"));
            }
            return String;
        })(Literal);
        ast.String = String;

        var Bool = (function (_super) {
            __extends(Bool, _super);
            function Bool(sym) {
                _super.call(this, sym, (sym.match === 'true'));
            }
            return Bool;
        })(Literal);
        ast.Bool = Bool;

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
            }
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

            FunctionGenerator.prototype.validate = function (v) {
                var _this = this;
                this.klass = v.getCurrentClass();

                if (this.validateNameClash(v)) {
                    v.defineFun(this);
                    v.pushFunScope(this);

                    this.validateInside(v);

                    v.popScope();

                    v.onEndValidate(function (v) {
                        return _this.onEndValidate(v);
                    });
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
            };

            FunctionGenerator.prototype.validateNameClash = function (v) {
                var currentFun = this.klass.getFun(this.callName);

                if (currentFun !== null && currentFun !== this) {
                    var errMsg = (currentFun instanceof FunctionGenerator) ? "'" + this.modifierName + "' modifier in class '" + this.klass.getClass().getName() + "' clashes with modifier '" + (currentFun).getModifier() + '", for generating: "' + this.name + '" method' : "'" + this.modifierName + "' modifier in class '" + this.klass.getClass().getName() + "' clashes with defined method: '" + this.name + '"';

                    v.parseError(this.offset, errMsg);

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
                    fieldName = (fieldObj).getName();
                } else if (fieldObj instanceof Symbol) {
                    fieldName = (fieldObj).getMatch();
                } else {
                    fieldName = null;
                }

                var fullName = fieldName ? (methodName + util.str.capitalize(fieldName)) : methodName;

                _super.call(this, obj, fullName, numParams);

                this.proto = proto;

                this.fieldName = fieldName;
                this.fieldObj = fieldObj;

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
                    }
                });
            };

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
                    }
                });
            };

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

        var PreInline = (function (_super) {
            __extends(PreInline, _super);
            function PreInline(sym) {
                _super.call(this, sym);

                this.isPrinted = false;
            }
            PreInline.prototype.print = function (p) {
                if (!this.isPrinted) {
                    var match = this.offset.match;
                    p.append(match.substring(6, match.length - 3));

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
                var match = this.offset.match;

                p.append(match.substring(3, match.length - 3));
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
"use strict";
var quby;
(function (quby) {
    (function (compilation) {
        (function (hints) {
            var methodMissing = undefined;

            function useMethodMissing() {
                if (methodMissing === undefined) {
                    var obj = {
                        __noSuchMethod__: function () {
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
"use strict";
var quby;
(function (quby) {
    (function (core) {
        var STATEMENT_END = ';\n';

        function handleError(errHandler, err, throwErr) {
            if (typeof throwErr === "undefined") { throwErr = true; }
            if (errHandler !== null) {
                errHandler(err);
            }

            if (throwErr) {
                throw err;
            }
        }

        function runParser(instance, validator, errHandler) {
            instance.lock();

            quby.parser.parseSource(instance.getSource(), instance.getName(), function (program, errors) {
                validator.errorHandler(errHandler);
                validator.adminMode(instance.isAdmin());
                validator.strictMode(instance.isStrict());

                try  {
                    validator.validate(program, errors);
                } catch (err) {
                    handleError(errHandler, err);
                }

                var callback = instance.getFinishedFun();

                if (callback) {
                    util.future.runFun(callback);
                }
            }, instance.getDebugFun());
        }
        core.runParser = runParser;

        var formatError = function (error) {
            var errLine = error.getLine(), strErr;

            if (error.isSymbol) {
                strErr = "error parsing '" + error.match + "'";
            } else if (error.isTerminal) {
                var termError = error;

                if (termError.isLiteral || util.str.trim(termError.match) === '') {
                    strErr = "syntax error near '" + termError.terminalName + "'";
                } else {
                    strErr = "syntax error near " + termError.terminalName + " '" + error.match + "'";
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
                this.programs = [];

                this.lastErrorName = null;

                this.isStrict = true;

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

                this.methodNames = new FunctionTable();
                this.lateUsedFuns = new LateFunctionBinder(this);
                this.errors = [];

                this.isParameters = false;
                this.isFunParameters = false;

                this.inConstructor = false;

                this.endValidateCallbacks = [];

                this.preInlines = [];

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
                this.isStrict = mode;
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

                    if (!oldKlassHead.hasSuper() && klassHead.hasSuper()) {
                        oldKlass.setHeader(klassHead);
                    } else if (oldKlassHead.hasSuper() && klassHead.hasSuper()) {
                        if (oldKlassHead.getSuperCallName() != klassHead.getSuperCallName()) {
                            this.parseError(klass.offset, "Super class cannot be redefined for class '" + klass.getName() + "'.");
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

            Validator.prototype.isInsideFun = function () {
                return this.currentFun !== null;
            };

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
                    if (this.vars[i][id] != undefined) {
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

            Validator.prototype.defineFun = function (fun) {
                var klass = this.currentClass;

                if (klass !== null) {
                    if (fun.isConstructor()) {
                        klass.addNew(fun);
                    } else {
                        klass.addFun(fun);
                        this.methodNames.add(fun.getCallName(), fun.getName());
                    }
                } else {
                    if (this.funs[fun.getCallName()] !== undefined) {
                        this.parseError(fun.offset, "Function is already defined: '" + fun.getName() + "', with " + fun.getNumParameters() + " parameters.");
                    }

                    this.funs[fun.getCallName()] = fun;
                }
            };

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

            Validator.prototype.strictError = function (lineInfo, msg) {
                if (this.isStrict) {
                    this.parseError(lineInfo, msg);
                }
            };

            Validator.prototype.parseError = function (sym, msg) {
                if (sym) {
                    this.parseErrorLine(sym.getLine(), msg, sym.getSourceName());
                } else {
                    this.parseErrorLine(null, msg);
                }
            };

            Validator.prototype.parseErrorLine = function (line, error, name) {
                var msg;

                if (line !== null && line !== undefined || line < 1) {
                    msg = "line " + line + ", " + error;
                } else {
                    msg = error;
                    line = -1;
                }

                if (!name && name !== '') {
                    name = this.lastErrorName;
                } else {
                    this.lastErrorName = name;
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
                            return a.line - b.line;
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

            Validator.prototype.onEndValidate = function (callback) {
                this.endValidateCallbacks.push(callback);
            };

            Validator.prototype.finaliseProgram = function () {
                this.endValidate();

                if (this.hasErrors()) {
                    return '';
                } else {
                    return this.generateCode();
                }
            };

            Validator.prototype.validate = function (program, errors) {
                this.lastErrorName = null;

                if (errors === null || errors.length === 0) {
                    if (!program) {
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

            Validator.prototype.endValidate = function () {
                try  {
                    for (var usedFunsI in this.usedFunsStack) {
                        var fun = this.usedFunsStack[usedFunsI];
                        var callName = fun.getCallName();

                        if (this.funs[callName] === undefined) {
                            this.searchMissingFunAndError(fun, this.funs, 'function');
                        }
                    }

                    for (var strGlobal in this.usedGlobals) {
                        if (this.globals[strGlobal] === undefined) {
                            var global = this.usedGlobals[strGlobal];
                            this.parseError(global.offset, "Global used but never assigned to: '" + global.getName() + "'.");
                        }
                    }

                    for (var klassI in this.classes) {
                        var klass = this.classes[klassI];
                        klass.endValidate();
                    }

                    for (var methodI in this.calledMethods) {
                        var methodFound = false;
                        var method = this.calledMethods[methodI];

                        for (var klassI in this.classes) {
                            if (this.classes[klassI].hasFun(method)) {
                                methodFound = true;
                                break;
                            }
                        }

                        if (!methodFound) {
                            var found = this.searchForMethodLike(method), name = method.getName().toLowerCase(), errMsg = null;

                            if (found !== null) {
                                if (name === found.getName().toLowerCase()) {
                                    errMsg = "Method '" + method.getName() + "' called with incorrect number of parameters, " + method.getNumParameters() + " instead of " + found.getNumParameters();
                                } else {
                                    errMsg = "Method '" + method.getName() + "' called with " + method.getNumParameters() + " parameters, but is not defined in any class. Did you mean: '" + found.getName() + "'?";
                                }
                            } else {
                                errMsg = "Method '" + method.getName() + "' called with " + method.getNumParameters() + " parameters, but is not defined in any class.";
                            }

                            this.parseError(method.offset, errMsg);
                        }
                    }

                    this.lateUsedFuns.endValidate(this.funs);

                    while (this.endValidateCallbacks.length > 0) {
                        var callback = this.endValidateCallbacks.shift();
                        callback(this);
                    }
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
                if (!quby.compilation.hints.useMethodMissing()) {
                    var rootKlass = this.getRootClass().getClass(), callNames = [], extensionStr = [];

                    p.append(quby.runtime.FUNCTION_DEFAULT_TABLE_NAME, "={");

                    var errFun = ":function(){quby_errFunStub(this,arguments);}";
                    var printComma = false;
                    this.methodNames.callNames(function (callName) {
                        if (rootKlass === null || !rootKlass.hasFunCallName(callName)) {
                            if (printComma) {
                                p.append(',', callName, ':function(){noSuchMethodError(this,"' + callName + '");}');
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

            Validator.prototype.generatePreCode = function (p) {
                this.methodNames.print(p);
                this.symbols.print(p);
                p.printArray(this.preInlines);

                this.generateNoSuchMethodStubs(p);

                var classes = quby.runtime.CORE_CLASSES;
                var stmts = this.rootClass.getPrintStmts();
                for (var i = 0; i < classes.length; i++) {
                    var name = classes[i];
                    p.appendExtensionClassStmts(name, stmts);
                }
            };

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

            Validator.prototype.searchForMethodLike = function (method, klassVal) {
                if (klassVal) {
                    return this.searchMissingFun(method, klassVal.getFunctions());
                } else {
                    var searchKlassVals = this.classes, altMethod = null, methodName = method.getName().toLowerCase();

                    for (var i in searchKlassVals) {
                        var found = this.searchMissingFunWithName(methodName, searchKlassVals[i].getFunctions());

                        if (found !== null) {
                            if (found.getName().toLowerCase() == methodName) {
                                return found;
                            } else if (altMethod === null) {
                                altMethod = found;
                            }
                        }
                    }

                    return altMethod;
                }
            };

            Validator.prototype.searchMissingFunWithName = function (name, searchFuns) {
                var altNames = [], altFun = null;
                var nameLen = name.length;

                if (nameLen > 3 && (name.indexOf('get') === 0 || name.indexOf('set') === 0)) {
                    altNames.push(name.substr(3));
                } else {
                    altNames.push('get' + name);
                    altNames.push('set' + name);
                }

                for (var funIndex in searchFuns) {
                    var searchFun = searchFuns[funIndex];
                    var searchName = searchFun.getName().toLowerCase();

                    if (searchName === name) {
                        return searchFun;
                    } else if (altFun === null) {
                        for (var i = 0; i < altNames.length; i++) {
                            var altName = altNames[i];

                            if (searchName == altName) {
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
                                this.validator.parseError(f.getOffset(), "Function '" + f.getName() + "' called with " + f.getNumParameters() + " parameters, but is not defined in this class or as a function.");
                            }
                        }
                    }
                }
            };
            return LateFunctionBinder;
        })();

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

                p.append(quby.runtime.FUNCTION_TABLE_NAME, '={');

                var printComma = false;
                for (var callName in fs) {
                    if (fs.hasOwnProperty(callName)) {
                        var name = fs[callName];

                        if (printComma) {
                            p.append(',', callName, ":'", name, "'");
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

            RootClassProxy.prototype.getPrintStmts = function () {
                if (this.rootClass === null) {
                    return [];
                } else {
                    return this.rootClass.getClass().getStatements().getStmts();
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

            ClassValidator.prototype.hasFun = function (fun) {
                return this.hasFunCallName(fun.getCallName());
            };

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

            ClassValidator.prototype.print = function (p) {
                p.setCodeMode(false);

                var klassName = this.klass.getCallName();
                var superKlass = this.klass.getSuperCallName();

                p.append('function ', klassName, '() {');
                if (superKlass != null) {
                    p.append(superKlass, '.apply(this);');
                }

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

                this.eachConstructor(function (i, c) {
                    return c.print(p);
                });

                p.setCodeMode(true);
            };

            ClassValidator.prototype.endValidate = function () {
                var thisKlass = this.klass;

                if (this.news.length == 0 && !this.klass.isExtensionClass) {
                    var constructorObj = new quby.ast.Constructor(thisKlass.offset.clone("new"), null, null);
                    constructorObj.setClass(thisKlass);

                    this.addNew(constructorObj);
                }

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

        var Printer = (function () {
            function Printer() {
                this.tempVarCounter = 0;
                this.isCode = true;
                this.pre = [];
                this.stmts = [];
                this.preOrStmts = this.stmts;

                this.currentPre = new PrinterStatement();
                this.currentStmt = new PrinterStatement();
                this.current = this.currentStmt;
            }
            Printer.prototype.getTempVariable = function () {
                return quby.runtime.TEMP_VARIABLE + (this.tempVarCounter++);
            };

            Printer.prototype.setCodeMode = function (isCode) {
                if (isCode) {
                    this.current = this.currentStmt;
                    this.preOrStmts = this.stmts;
                } else {
                    this.current = this.currentPre;
                    this.preOrStmts = this.pre;
                }

                this.isCode = isCode;
            };

            Printer.prototype.appendExtensionClassStmts = function (name, stmts) {
                var stmtsStart = quby.runtime.translateClassName(name) + '.prototype.';

                for (var key in stmts) {
                    var fun = stmts[key];

                    if (fun.isConstructor()) {
                        fun.print(this);
                    } else {
                        this.append(stmtsStart);
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
                this.append(STATEMENT_END);

                return this.flush();
            };

            Printer.prototype.toString = function () {
                this.currentPre.flush(this.pre);
                util.array.addAll(this.pre, this.stmts);
                this.currentStmt.flush(this.pre);

                return this.pre.join('');
            };

            Printer.prototype.appendPre = function (a) {
                if (arguments.length === 1) {
                    this.current.appendPre(a);
                } else {
                    for (var i = 0; i < arguments.length; i++) {
                        this.current.appendPre(arguments[i]);
                    }
                }

                return this;
            };

            Printer.prototype.append = function (a) {
                if (arguments.length === 1) {
                    this.current.appendNow(a);
                } else {
                    for (var i = 0; i < arguments.length; i++) {
                        this.current.appendNow(arguments[i]);
                    }
                }

                return this;
            };

            Printer.prototype.appendPost = function (a) {
                if (arguments.length === 1) {
                    this.current.appendPost(a);
                } else {
                    for (var i = 0; i < arguments.length; i++) {
                        this.current.appendPost(arguments[i]);
                    }
                }

                return this;
            };
            return Printer;
        })();
        core.Printer = Printer;

        if (util.browser.isChrome) {
            Printer.prototype.appendPre = function () {
                for (var i = 0; i < arguments.length; i++) {
                    this.current.appendPre(arguments[i]);
                }

                return this;
            };
            Printer.prototype.append = function () {
                for (var i = 0; i < arguments.length; i++) {
                    this.current.appendNow(arguments[i]);
                }

                return this;
            };
            Printer.prototype.appendPost = function () {
                for (var i = 0; i < arguments.length; i++) {
                    this.current.appendPost(arguments[i]);
                }

                return this;
            };
        } else {
        }

        var PrinterStatement = (function () {
            function PrinterStatement() {
                this.preStatement = null;
                this.currentStatement = null;
                this.postStatement = null;
            }
            PrinterStatement.prototype.appendPre = function (e) {
                if (this.preStatement === null) {
                    this.preStatement = [e];
                } else {
                    this.preStatement.push(e);
                }
            };
            PrinterStatement.prototype.appendNow = function (e) {
                if (this.currentStatement === null) {
                    this.currentStatement = [e];
                } else {
                    this.currentStatement.push(e);
                }
            };
            PrinterStatement.prototype.appendPost = function (e) {
                if (this.postStatement === null) {
                    this.postStatement = [e];
                } else {
                    this.postStatement.push(e);
                }
            };

            PrinterStatement.prototype.endAppend = function (dest, src) {
                for (var i = 0, len = src.length; i < len; i++) {
                    dest[dest.length] = src[i];
                }
            };

            PrinterStatement.prototype.flush = function (stmts) {
                if (this.preStatement !== null) {
                    if (this.currentStatement !== null) {
                        if (this.postStatement !== null) {
                            this.endAppend(stmts, this.preStatement);
                            this.endAppend(stmts, this.currentStatement);
                            this.endAppend(stmts, this.postStatement);
                        } else {
                            this.endAppend(stmts, this.preStatement);
                            this.endAppend(stmts, this.currentStatement);
                        }
                    } else if (this.postStatement !== null) {
                        this.endAppend(stmts, this.preStatement);
                        this.endAppend(stmts, this.postStatement);
                    } else {
                        this.endAppend(stmts, this.preStatement);
                    }

                    this.clear();
                } else if (this.currentStatement !== null) {
                    if (this.postStatement !== null) {
                        this.endAppend(stmts, this.currentStatement);
                        this.endAppend(stmts, this.postStatement);
                    } else {
                        this.endAppend(stmts, this.currentStatement);
                    }

                    this.clear();
                } else if (this.postStatement !== null) {
                    this.endAppend(stmts, this.postStatement);

                    this.clear();
                }
            };

            PrinterStatement.prototype.clear = function () {
                this.preStatement = null;
                this.currentStatement = null;
                this.postStatement = null;
            };
            return PrinterStatement;
        })();
    })(quby.core || (quby.core = {}));
    var core = quby.core;
})(quby || (quby = {}));
"use strict";
var quby;
(function (quby) {
    (function (main) {
        function runScriptTagsDisplay() {
            runScriptTags(function (r) {
                r.runOrDisplayErrors();
            });
        }
        main.runScriptTagsDisplay = runScriptTagsDisplay;

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

                    if (contents !== '' && contents !== undefined) {
                        if (name === null) {
                            if (script.id) {
                                name = '#' + script.id;
                            } else if (script.className) {
                                name = '.' + util.str.trim(script.className.replace(/ +/g, ', .'));
                            } else {
                                name = 'inline script ' + inlineScriptCount++;
                            }
                        }

                        contents = contents.replace(/^\/\/<!\[CDATA\[/, "").replace(/\/\/\]\]>$/, "");

                        instance = parser.parse(contents);
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

            ParserInstance.prototype.strictMode = function (isStrict) {
                if (typeof isStrict === "undefined") { isStrict = true; }
                this.ensureCanParse();

                return this;
            };

            ParserInstance.prototype.isStrict = function () {
                return this.isStrictFlag;
            };

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

            ParserInstance.prototype.onFinish = function (fun) {
                this.ensureCanParse();

                this.whenFinished = fun;

                return this;
            };

            ParserInstance.prototype.getFinishedFun = function () {
                return this.whenFinished;
            };

            ParserInstance.prototype.lock = function () {
                this.hasParsed = true;
            };

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

            Parser.prototype.strictModeAll = function (isStrict) {
                if (typeof isStrict === "undefined") { isStrict = true; }
                this.isStrict = isStrict;
            };

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

            Parser.prototype.finalize = function (callback) {
                var _this = this;
                util.future.run(function () {
                    var output = _this.validator.finaliseProgram();
                    var result = new Result(output, _this.validator.getErrors());

                    util.future.runFun(function () {
                        callback(result);
                    });
                });
            };
            return Parser;
        })();
        main.Parser = Parser;

        var Result = (function () {
            function Result(program, errors) {
                this.program = program;
                this.errors = errors;

                this.onErrorFun = function (ex) {
                    var errorMessage = ex.name + ': ' + ex.message;

                    if (ex['stack']) {
                        errorMessage += '\n\n' + ex['stack'];
                    }

                    alert(errorMessage);
                };
            }
            Result.prototype.setOnError = function (fun) {
                this.onErrorFun = fun;

                return this;
            };

            Result.prototype.getCode = function () {
                return this.program;
            };

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
                    var iDoc = iframe.contentWindow || iframe.contentDocument;

                    if (iDoc.document) {
                        iDoc = iDoc.document;
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
                    iBody.style.margin = 0;
                    iBody.style.padding = 0;

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
"use strict";
var quby;
(function (quby) {
    (function (parser) {
        var log = function () {
            if (window['console'] && window['console']['log']) {
                window['console']['log'].apply(window['console'], arguments);
            }
        };

        var TAB = 9, SLASH_N = 10, SLASH_R = 13, SPACE = 32, EXCLAMATION = 33, DOUBLE_QUOTE = 34, HASH = 35, DOLLAR = 36, PERCENT = 37, AMPERSAND = 38, SINGLE_QUOTE = 39, LEFT_PAREN = 40, RIGHT_PAREN = 41, STAR = 42, PLUS = 43, COMMA = 44, MINUS = 45, FULL_STOP = 46, SLASH = 47, ZERO = 48, ONE = 49, TWO = 50, THREE = 51, FOUR = 52, FIVE = 53, SIX = 54, SEVEN = 55, EIGHT = 56, NINE = 57, COLON = 58, SEMI_COLON = 59, LESS_THAN = 60, EQUAL = 61, GREATER_THAN = 62, QUESTION_MARK = 63, AT = 64, LEFT_SQUARE = 91, BACKSLASH = 92, RIGHT_SQUARE = 93, CARET = 94, UNDERSCORE = 95, LOWER_A = 97, LOWER_B = 98, LOWER_C = 99, LOWER_D = 100, LOWER_E = 101, LOWER_F = 102, LOWER_G = 103, LOWER_H = 104, LOWER_I = 105, LOWER_J = 106, LOWER_K = 107, LOWER_L = 108, LOWER_M = 109, LOWER_N = 110, LOWER_O = 111, LOWER_P = 112, LOWER_Q = 113, LOWER_R = 114, LOWER_S = 115, LOWER_T = 116, LOWER_U = 117, LOWER_V = 118, LOWER_W = 119, LOWER_X = 120, LOWER_Y = 121, LOWER_Z = 122, LEFT_BRACE = 123, BAR = 124, RIGHT_BRACE = 125, TILDA = 126;

        var isAlphaNumericCode = function (code) {
            return ((code >= LOWER_A && code <= LOWER_Z) || (code === UNDERSCORE) || (code >= ZERO && code <= NINE));
        };

        var isAlphaCode = function (code) {
            return (code >= LOWER_A && code <= LOWER_Z);
        };

        var isAlphaNumeric = function (src, i) {
            var code = src.charCodeAt(i + src.length);

            return isAlphaNumericCode(code);
        };

        var preParse = (function () {
            var pushWhitespace = function (newSrc, size) {
                var diff5 = (size / 5) | 0;

                for (var i = 0; i < diff5; i++) {
                    newSrc.push('     ');
                }

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

            var stripComments = function (src) {
                var inAdmin = false;
                var inPreAdmin = false;
                var inSingleComment = false;
                var inDoubleString = false;
                var inSingleString = false;

                var multiCommentCount = 0, newSrc = [], startI = 0;

                for (var i = 0, len = src.length; i < len; i++) {
                    var c = src.charCodeAt(i);

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

                            i++;

                            if (multiCommentCount === 0) {
                                pushWhitespace(newSrc, (i - startI) + 1);
                                startI = i + 1;
                            }
                        }
                    } else {
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

                if (newSrc.length > 0) {
                    return newSrc.join('');
                } else {
                    return src;
                }
            };

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

        var terminals = parse.terminals({
            endOfLine: function (src, i, code, len) {
                if (code === SLASH_N) {
                    do {
                        i++;
                        code = src.charCodeAt(i);
                    } while(code === SLASH_N || code === SPACE || code === TAB);

                    if (src.charCodeAt(i) !== SEMI_COLON) {
                        return i;
                    }
                }
            },
            endOfStatement: function (src, i, code, len) {
                if (code === SEMI_COLON || code === SLASH_N) {
                    do {
                        i++;
                        code = src.charCodeAt(i);
                    } while(code === SLASH_N || code === SEMI_COLON || code === SPACE || code === TAB);

                    return i;
                }
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

                            return i;
                        }
                    }
                },
                number: parse.terminal.NUMBER,
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
                        i++;

                        while (isAlphaNumericCode(src.charCodeAt(i))) {
                            i++;
                        }

                        return i;
                    }
                },
                global: function (src, i, code, len) {
                    if (code === DOLLAR) {
                        i++;

                        while (isAlphaNumericCode(src.charCodeAt(i))) {
                            i++;
                        }

                        return i;
                    }
                },
                objectField: function (src, i, code, len) {
                    if (code === AT) {
                        i++;

                        while (isAlphaNumericCode(src.charCodeAt(i))) {
                            i++;
                        }

                        return i;
                    }
                }
            },
            admin: {
                hashDef: '#def',
                jsInstanceOf: '#instanceof',
                jsTypeOf: '#typeof',
                inline: function (src, i, code, len) {
                    if (code === HASH && src.charCodeAt(i + 1) === LESS_THAN && src.charCodeAt(i + 2) === HASH) {
                        i += 2;

                        do {
                            i += 3;

                            code = src.charCodeAt(i);

                            if (code === HASH) {
                                if (src.charCodeAt(i - 1) === GREATER_THAN && src.charCodeAt(i - 2) === HASH) {
                                    return i + 1;
                                } else if (src.charCodeAt(i + 1) === GREATER_THAN && src.charCodeAt(i + 2) === HASH) {
                                    return i + 3;
                                }
                            } else if (code === GREATER_THAN && src.charCodeAt(i - 1) === HASH && src.charCodeAt(i + 1) === HASH) {
                                return i + 2;
                            }
                        } while(i < len);

                        return len;
                    }
                },
                preInline: function (src, i, code, len) {
                    if (code === HASH && src.charCodeAt(i + 1) === LESS_THAN && src.charCodeAt(i + 2) === LOWER_P && src.charCodeAt(i + 3) === LOWER_R && src.charCodeAt(i + 4) === LOWER_E && src.charCodeAt(i + 5) === HASH) {
                        i += 5;

                        do {
                            i += 3;

                            code = src.charCodeAt(i);

                            if (code === HASH) {
                                if (src.charCodeAt(i - 1) === GREATER_THAN && src.charCodeAt(i - 2) === HASH) {
                                    return i + 1;
                                } else if (src.charCodeAt(i + 1) === GREATER_THAN && src.charCodeAt(i + 2) === HASH) {
                                    return i + 3;
                                }
                            } else if (code === GREATER_THAN && src.charCodeAt(i - 1) === HASH && src.charCodeAt(i + 1) === HASH) {
                                return i + 2;
                            }
                        } while(i < len);

                        return len;
                    }
                }
            }
        });

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
                i++;
                code = src.charCodeAt(i);
            }

            return i;
        });

        terminals.endOfStatement.onMatch(function () {
            return null;
        });

        terminals.symbols.comma.onMatch(function () {
            return null;
        });

        terminals.literals.TRUE.onMatch(function (symbol) {
            return new quby.ast.Bool(symbol);
        });
        terminals.literals.FALSE.onMatch(function (symbol) {
            return new quby.ast.Bool(symbol);
        });
        terminals.literals.NULL.onMatch(function (symbol) {
            return new quby.ast.Null(symbol);
        });
        terminals.literals.NIL.onMatch(function (symbol) {
            return new quby.ast.Null(symbol);
        });
        ;
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

        var statementSeperator = parse.name('end of statement').either(terminals.endOfLine, terminals.endOfStatement);

        var statement = parse.rule(), expr = parse.rule();

        var repeatStatement = parse.repeatSeperator(statement, statementSeperator);

        var statements = parse.name('statements').optional(statementSeperator).optional(repeatStatement).optional(statementSeperator).onMatch(function (onStart, stmts, endEnd) {
            if (stmts === null) {
                return new quby.ast.Statements();
            } else {
                return new quby.ast.Statements(stmts);
            }
        });

        var exprs = parse.name('expressions').repeatSeperator(expr, terminals.symbols.comma).onMatch(function (exprs) {
            return new quby.ast.Parameters(exprs);
        });

        var variables = parse.either(terminals.identifiers, terminals.keywords.THIS, parse.a(terminals.ops.hash).either(terminals.identifiers.variableName, terminals.identifiers.global).onMatch(function (hash, name) {
            return new quby.ast.JSVariable(name);
        })).onMatch(function (identifier) {
            var term = identifier.terminal;

            if (term === terminals.identifiers.variableName) {
                return new quby.ast.LocalVariable(identifier);
            } else if (term === terminals.identifiers.global) {
                return new quby.ast.GlobalVariable(identifier);
            } else if (term === terminals.identifiers.objectField) {
                return new quby.ast.FieldVariable(identifier);
            } else if (term === terminals.keywords.THIS) {
                return new quby.ast.ThisVariable(identifier);
            } else if (identifier instanceof quby.ast.JSVariable) {
                return identifier;
            } else {
                log(identifier);
                throw new Error("Unknown terminal met for variables: " + identifier);
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

        var parameterFields = parse.repeatSeperator(parse.either(variables, parse.a(terminals.ops.bitwiseAnd, terminals.identifiers.variableName).onMatch(function (bitAnd, name) {
            return new quby.ast.ParameterBlockVariable(name);
        })), terminals.symbols.comma).onMatch(function (params) {
            return new quby.ast.Parameters(params);
        });

        var parameterDefinition = parse.name('parameters').either(parse.a(terminals.symbols.leftBracket).optional(parameterFields).optional(terminals.endOfLine).then(terminals.symbols.rightBracket).onMatch(function (lParen, params, end, rParen) {
            if (params === null) {
                return new quby.ast.Parameters();
            } else {
                return params;
            }
        }), parse.a(parameterFields), parse.a(statementSeperator).onMatch(function () {
            return new quby.ast.Parameters();
        }));

        var parameterExprs = parse.name('expressions').a(terminals.symbols.leftBracket).optional(exprs).optional(terminals.endOfLine).then(terminals.symbols.rightBracket).onMatch(function (lParen, exprs, end, rParen) {
            if (exprs !== null) {
                return exprs;
            } else {
                return null;
            }
        });

        var blockParamVariables = parse.repeatSeperator(variables, terminals.symbols.comma);

        var blockParams = parse.name('block parameters').a(terminals.ops.bitwiseOr).optional(blockParamVariables).optional(terminals.endOfLine).then(terminals.ops.bitwiseOr).onMatch(function (lOr, params, end, rOr) {
            if (params !== null) {
                return new quby.ast.Parameters(params);
            } else {
                return null;
            }
        });

        var block = parse.name('block').either(terminals.symbols.leftBrace, terminals.keywords.DO).optional(blockParams).optional(statements).thenEither(terminals.symbols.rightBrace, terminals.keywords.END).onMatch(function (lBrace, params, stmts, rBrace) {
            var block = new quby.ast.FunctionBlock(params, stmts);

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

        expr.name('expression').either(singleOpExpr, arrayLiteral, hashLiteral, jsHashLiteral, yieldExpr, exprInParenthesis, newInstance, functionCall, variables, lambda, terminals.literals, terminals.admin.inline, terminals.admin.preInline).optional(exprExtension).onMatch(function (expr, rest) {
            if (rest !== null) {
                rest.appendLeft(expr);

                return rest;
            } else {
                return expr;
            }
        });

        var classHeader = parse.name('class header').a(terminals.identifiers.variableName).optional(parse.a(terminals.ops.lessThan, terminals.identifiers.variableName).onMatch(function (lessThan, superClass) {
            return superClass;
        })).onMatch(function (name, superClass) {
            return new quby.ast.ClassHeader(name, superClass);
        });

        var moduleDeclaration = parse.name('Module').a(terminals.keywords.MODULE).then(terminals.identifiers.variableName).optional(statements).then(terminals.keywords.END).onMatch(function (keyModule, name, stmts, end) {
            return new quby.ast.ModuleDeclaration(name, stmts);
        });

        var classDeclaration = parse.name('Class Declaration').a(terminals.keywords.CLASS).then(classHeader).optional(statements).then(terminals.keywords.END).onMatch(function (klass, header, stmts, end) {
            return new quby.ast.ClassDeclaration(header, stmts);
        });

        var functionDeclaration = parse.name('Function Declaration').either(terminals.keywords.DEF, terminals.admin.hashDef).thenEither(terminals.keywords.NEW, terminals.identifiers.variableName).then(parameterDefinition).optional(statements).then(terminals.keywords.END).onMatch(function (def, name, params, stmts, end) {
            if (def.terminal === terminals.keywords.DEF) {
                if (name.terminal === terminals.keywords.NEW) {
                    return new quby.ast.Constructor(name, params, stmts);
                } else {
                    return new quby.ast.FunctionDeclaration(name, params, stmts);
                }
            } else {
                return new quby.ast.AdminMethod(name, params, stmts);
            }
        });

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

        function parseSource(src, name, onFinish, onDebug) {
            if (onDebug !== null) {
                console.log(src);
            }

            statements.parse({
                name: name,
                src: src,
                inputSrc: preParse(src),
                onFinish: onFinish,
                onDebug: onDebug || null
            });
        }
        parser.parseSource = parseSource;
    })(quby.parser || (quby.parser = {}));
    var parser = quby.parser;
})(quby || (quby = {}));
"use static";
function noSuchMethodError(self, callName) {
    var args = Array.prototype.slice.call(arguments, 2);
    var block = args.pop();

    quby.runtime.methodMissingError(self, callName, args, block);
}
;

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

function quby_ensureBlock(block, numArgs) {
    if (!(block instanceof Function)) {
        quby.runtime.missingBlockError();
    } else if (numArgs < block.length) {
        quby.runtime.notEnoughBlockParametersError(block.length, numArgs, 'block');
    }
}

function quby_checkGlobal(global, name) {
    if (global === undefined) {
        quby.runtime.runtimeError("Global variable accessed before being assigned to: '" + name + "'.");
    } else {
        return global;
    }
}

function quby_getField(fieldVal, obj, name) {
    if (fieldVal === undefined) {
        quby.runtime.fieldNotFoundError(obj, name);
    }

    return fieldVal;
}

function quby_setCollection(collection, key, value) {
    if (collection === null) {
        quby.runtime.runtimeError("Collection is null when setting a value");
    } else if (collection.set) {
        return collection.set(key, value);
    } else {
        quby.runtime.runtimeError("Trying to set value on a non-collection, it's actually a: " + quby.runtime.identifyObject(collection));
    }
}

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
    (function (runtime) {
        runtime.FUNCTION_DEFAULT_TABLE_NAME = '_q_no_funs', runtime.FUNCTION_TABLE_NAME = '_q_funs', runtime.SUPER_KEYWORD = "super", runtime.EXCEPTION_NAME_RUNTIME = "Runtime Error", runtime.TRANSLATE_CLASSES = {
            'array': 'QubyArray',
            'hash': 'QubyHash',
            'object': 'QubyObject'
        }, runtime.BLOCK_VARIABLE = '_q_block', runtime.TEMP_VARIABLE = '_t', runtime.VARIABLE_PREFIX = '_var_', runtime.FIELD_PREFIX = '_field_', runtime.GLOBAL_PREFIX = '_global_', runtime.FUNCTION_PREFIX = '_fun_', runtime.CLASS_PREFIX = '_class_', runtime.NEW_PREFIX = '_new_', runtime.SYMBOL_PREFIX = '_sym_', runtime.ROOT_CLASS_NAME = 'object', runtime.ROOT_CLASS_CALL_NAME = null, runtime.FIELD_NAME_SEPERATOR = '@';

        function translateClassName(name) {
            var newName = runtime.TRANSLATE_CLASSES[name.toLowerCase()];

            if (newName) {
                return newName;
            } else {
                return name;
            }
        }
        runtime.translateClassName = translateClassName;

        function untranslateClassName(name) {
            var searchName = name.toLowerCase();

            for (var klass in runtime.TRANSLATE_CLASSES) {
                var klassName = runtime.TRANSLATE_CLASSES[klass];

                if (searchName.toLowerCase() == klassName.toLowerCase()) {
                    return util.str.capitalize(klass);
                }
            }

            return name;
        }
        runtime.untranslateClassName = untranslateClassName;

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

        runtime.THIS_VARIABLE = "_this";

        function getThisVariable(isInExtension) {
            if (isInExtension) {
                return 'this';
            } else {
                return quby.runtime.THIS_VARIABLE;
            }
        }
        runtime.getThisVariable = getThisVariable;

        var onError = null;

        var logCallback = null;

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

        function log() {
            if (logCallback !== null) {
                logCallback.apply(null, arguments);
            } else {
                var strOut = Array.prototype.join.call(arguments, ',');

                if (window.console && window.console.log) {
                    window.console.log(strOut);
                } else {
                    var sent = false;

                    try  {
                        window['Components']['classes']["@mozilla.org/consoleservice;1"].getService(window['Components']['interfaces']['nsIConsoleService']).logStringMessage(strOut);

                        sent = true;
                    } catch (ex) {
                    }

                    if (!sent) {
                        alert(strOut);
                    }
                }
            }
        }
        runtime.log = log;

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

        function identifyObject(obj) {
            if (obj === null) {
                return "null";
            } else {
                var strConstructor = obj.constructor.toString();
                var funcNameRegex = /function ([a-zA-Z0-9_]{1,})\(/;
                var results = funcNameRegex.exec(strConstructor);

                if (results && results.length > 1) {
                    var name = results[1];

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

        function checkArray(collection, op) {
            if (collection instanceof QubyArray || collection instanceof QubyHash) {
                return collection;
            } else {
                this.runtimeError("Trying to " + op + " value on Array or Hash, but it's actually a " + quby.runtime.identifyObject(collection));
            }
        }
        runtime.checkArray = checkArray;

        function error(name, msg) {
            var errObj = new Error(msg);

            errObj.isQuby = true;
            errObj.name = name;

            throw errObj;
        }
        runtime.error = error;

        function runtimeError(msg) {
            quby.runtime.error(quby.runtime.EXCEPTION_NAME_RUNTIME, msg);
        }
        runtime.runtimeError = runtimeError;

        function fieldNotFoundError(obj, name) {
            var msg;
            var thisClass = quby.runtime.identifyObject(obj);

            if (name.indexOf('@') > -1) {
                var parts = name.split('@');
                var field = parts[0];
                var fieldClass = parts[1];

                if (fieldClass.toLowerCase() != thisClass.toLowerCase()) {
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

        function missingBlockError() {
            this.runtimeError("Yield with no block present");
        }
        runtime.missingBlockError = missingBlockError;

        function lookupMethodName(callName) {
            var methodName = window[quby.runtime.FUNCTION_TABLE_NAME][callName];

            if (methodName === undefined) {
                methodName = callName;
            }

            return methodName;
        }
        runtime.lookupMethodName = lookupMethodName;

        function notEnoughBlockParametersError(expected, got, type) {
            quby.runtime.runtimeError("Not enough parameters given for a " + type + ", was given: " + got + " but expected: " + expected);
        }
        runtime.notEnoughBlockParametersError = notEnoughBlockParametersError;

        function methodMissingError(obj, callName, args, block) {
            var methodName = quby.runtime.lookupMethodName(callName);

            var callNameAlt = callName.replace(/_[0-9]+$/, "");

            for (var key in obj) {
                var keyCallName = key.toString();
                var mName = keyCallName.replace(/_[0-9]+$/, "");

                if (callNameAlt === mName) {
                    var funs = window[quby.runtime.FUNCTION_DEFAULT_TABLE_NAME];
                    if (!funs || (callName != keyCallName && funs[keyCallName] != obj[keyCallName])) {
                        quby.runtime.runtimeError("Method: '" + methodName + "' called with incorrect number of arguments (" + args.length + ") on object of type '" + quby.runtime.identifyObject(obj) + "'");
                    }
                }
            }

            quby.runtime.runtimeError("Unknown method '" + methodName + "' called with " + args.length + " arguments on object of type '" + quby.runtime.identifyObject(obj) + "'");
        }
        runtime.methodMissingError = methodMissingError;

        function onMethodMissingfunction(methodName, args) {
            quby.runtime.methodMissingError(this, methodName, args);
        }
        runtime.onMethodMissingfunction = onMethodMissingfunction;

        function unformatString(str) {
            str = str.replace(/\b[a-zA-Z0-9_]+\b/g, function (match) {
                if (match.indexOf(quby.runtime.FUNCTION_PREFIX) === 0) {
                    match = match.substring(quby.runtime.FUNCTION_PREFIX.length);
                    return match.replace(/_[0-9]+$/, '');
                } else if ((match.indexOf(quby.runtime.FIELD_PREFIX) === 0) && match.indexOf(quby.runtime.FIELD_PREFIX, 1) > -1) {
                    var secondFieldPrefixI = match.indexOf(quby.runtime.FIELD_PREFIX, 1);
                    var classBit = match.substring(0, secondFieldPrefixI + quby.runtime.FIELD_PREFIX.length), fieldBit = match.substring(secondFieldPrefixI + quby.runtime.FIELD_PREFIX.length);

                    var wrappingFieldPrefixes = new RegExp('(^' + quby.runtime.FIELD_PREFIX + quby.runtime.CLASS_PREFIX + ')|(' + quby.runtime.FIELD_PREFIX + '$)', 'g');
                    classBit = classBit.replace(wrappingFieldPrefixes, '');
                    classBit = util.str.capitalize(classBit);

                    return classBit + '@' + fieldBit;
                } else if (match.indexOf(quby.runtime.CLASS_PREFIX) === 0) {
                    match = match.replace(new RegExp('^' + quby.runtime.CLASS_PREFIX), '');

                    if (match.indexOf(quby.runtime.NEW_PREFIX) > -1) {
                        var regExp = new RegExp(quby.runtime.NEW_PREFIX + '[0-9]+$');
                        match = match.replace(regExp, '');
                    }

                    return quby.runtime.untranslateClassName(match);
                } else if (match.indexOf(quby.runtime.GLOBAL_PREFIX) === 0) {
                    return '$' + match.substring(quby.runtime.GLOBAL_PREFIX.length);
                } else if (match.indexOf(quby.runtime.SYMBOL_PREFIX) === 0) {
                    return ':' + match.substring(quby.runtime.SYMBOL_PREFIX.length);
                } else if (match.indexOf(quby.runtime.VARIABLE_PREFIX) === 0) {
                    return match.substring(quby.runtime.VARIABLE_PREFIX.length);
                } else {
                    return quby.runtime.untranslateClassName(match);
                }
            });

            var qubyArrTranslation = function (str, prefixPattern, onFind) {
                var getClosingBracketIndex = function (str, startI) {
                    var openBrackets = 1;

                    for (var j = startI; j < str.length; j++) {
                        var c = str.charAt(j);

                        if (c === '(') {
                            openBrackets++;
                        } else if (c === ')') {
                            openBrackets--;

                            if (openBrackets === 0) {
                                return j;
                            }
                        }
                    }

                    return null;
                };

                var splitByRootCommas = function (str) {
                    var found = [], startI = 0;

                    var openBrackets = 0;
                    for (var i = 0; i < str.length; i++) {
                        var c = str.charAt(i);

                        if (c === ',' && openBrackets === 0) {
                            found.push(str.substring(startI, i));

                            startI = i + 1;
                        } else if (c === '(') {
                            openBrackets++;
                        } else if (c === ')') {
                            openBrackets--;
                        }
                    }

                    found.push(str.substring(startI));

                    return found;
                };

                var i = -1;
                while ((i = str.indexOf(prefixPattern)) > -1) {
                    var openingI = i + prefixPattern.length;
                    var closingI = getClosingBracketIndex(str, openingI);

                    if (closingI === null) {
                        break;
                    }

                    var pre = str.substring(0, i), mid = str.substring(openingI, closingI), post = str.substring(closingI + 1);

                    var parts = splitByRootCommas(mid);

                    str = onFind(pre, parts, post);
                }

                return str;
            };

            str = qubyArrTranslation(str, 'quby_getCollection(', function (pre, parts, post) {
                return pre + parts[0] + '[' + parts[1] + ']' + post;
            });

            str = qubyArrTranslation(str, 'quby_setCollection(', function (pre, parts, post) {
                return pre + parts[0] + '[' + parts[1] + '] = ' + parts[2] + post;
            });

            str = str.replace(/\( *null *\)/g, '()');
            str = str.replace(/, *null *\)/g, ')');

            return str;
        }

        function formatVar(strVar) {
            return quby.runtime.VARIABLE_PREFIX + strVar.toLowerCase();
        }
        runtime.formatVar = formatVar;

        function formatGlobal(strVar) {
            return quby.runtime.GLOBAL_PREFIX + strVar.replace(/\$/g, '').toLowerCase();
        }
        runtime.formatGlobal = formatGlobal;

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

        function formatField(strClass, strVar) {
            return quby.runtime.FIELD_PREFIX + quby.runtime.formatClass(strClass) + quby.runtime.FIELD_PREFIX + strVar.toLowerCase();
        }
        runtime.formatField = formatField;

        function formatFun(strFun, numParameters) {
            return quby.runtime.FUNCTION_PREFIX + strFun.toLowerCase() + '_' + numParameters;
        }
        runtime.formatFun = formatFun;

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

function QubyObject() {
}
;

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

    if (vals != undefined) {
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
                if (vals.length === 1) {
                    delete this.values[keyHash];
                } else {
                    vals.splice(i, 1);
                }

                return node.value;
            }
        }
    }

    return null;
};
"use strict";
