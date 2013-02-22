"use strict";

var exports = window['exports'] || {};

(function(Date) {
    if ( Date.now === undefined ) {
        Date.now = function() {
            return (new Date()).getTime();
        }
    }
})(window['Date']);

(function(Object) {
    if ( Object.preventExtensions === undefined ) {
        /**
         * AFAIK Object.preventExtensions cannot be faked,
         * so we just add an empty stub,
         * so we can still call it where it's not supported.
         *
         * Personally I don't really care if it's not always
         * supported, as long as it works when I am developing.
         */
        Object.preventExtensions = function() { /* do nothing */ }
    }
})(window['Object']);

module util {
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

    var anchor: HTMLAnchorElement = null;

    export var browser = {
        isIE: browserName === 'ie',
        isMozilla: browserName === 'mozilla',
        isChrome: browserName === 'chrome',
        isOpera: browserName === 'opera',
        isSafari: browserName === 'safari'
    };

    /**
     * Creates a new JS object, copies all the properties across from source
     * to the clone, and then returns the object.
     *
     * Note that the type of the object will be different.
     */
    export function clone(source: any) {
        if (source) {
            if (source instanceof Array) {
                return source.splice(0);
            } else {
                var ClonePrototype = function () { };
                ClonePrototype.prototype = source;

                var copy = new ClonePrototype();

                // copy all attributes across,
                // but skip prototype items
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

    export module url {
        var SLASH_CHAR = '/'.charCodeAt(0);

        /**
        * Given an url, this will turn it into an absolute url.
        */
        export function absolute(url: string): string {
            if (anchor === null) {
                anchor = new HTMLAnchorElement();
            }

            anchor.href = url;

            return anchor.href;
        }

        /**
        * @param url The url to test.
        * @param domain Optional, the domain to test for, defaults to the current domain of the document.
        * @return True if the url is of the domain given, otherwise false.
        */
        export function isDomain(url: string, domain: string): bool {
            if (domain === undefined) {
                domain = document.domain;
            }

            return (url.toLowerCase().indexOf(domain.toLowerCase()) === 0);
        }

        /**
        * Removes the domain section from the
        * beginning of the url given.
        *
        * If the domain is not found, then it is ignored.
        *
        * @param url The url to strip the domain from.
        */
        export function stripDomain(url: string): string {
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
                return url.replace(
                        /((\/\/)|([a-zA-Z]+:\/\/))([a-zA-Z0-9_\-.+]+)/,
                        ''
                );
            }
        }
    }

    export module array {
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
        export function argumentsToArray(args: IArguments, i?: number = 0): any[] {
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

        /**
        * Sorts the array given, randomly.
        */
        /*
        * Warning! This is used in core.qb
        */
        export function randomSort(arr: any[]): void {
            arr.sort(function () {
                return (Math.round(Math.random()) - 0.5);
            });
        }

        export function remove(arr: any[], arrayIndex: number): void {
            arr.splice(arrayIndex, 1);
        }

        export function addAll(dest: any[], src: any[]): void {
            var destI = dest.length;
            var newLen = (dest.length += src.length);
            var srcI = 0;

            for (; destI < newLen; destI++) {
                dest[destI] = src[srcI++];
            }
        }
    }

    export module str {
        export function htmlToText(html: string): string {
            if (anchor === null) {
                anchor = new HTMLAnchorElement();
            }

            anchor.innerHTML = html;

            return anchor.textContent || anchor.innerText;
        }

        /**
         * Trims whitespace off the string given,
         * and returns the result.
         */
        export function trim(s: string): string {
            s = s.replace(/^\s\s*/, '');
            var ws = /\s/;
            var i = s.length;

            while (ws.test(s.charAt(--i))) { }
            return s.slice(0, i + 1);
        }

        /**
        * If given a string, then a new string with the first letter capitalized is returned.
        *
        * Otherwise whatever was given is returned, with no error reported.
        */
        export function capitalize(str: string): string {
            if (typeof (str) == 'string' && str.length > 0) {
                // capitalize the first letter
                return str.charAt(0).toUpperCase() + str.slice(1);
            } else {
                return str;
            }
        }
    }

    export module future {
        /**
        * @const
        * @private
        * @type {number}
        */
        var DEFAULT_INTERVAL = 10;

        var isFutureRunning = false;

        var futureFuns: { (): void; }[] = [],
        futureBlocking: number[] = [];

        var futureBlockingOffset = 0,
            blockingCount = 1;

        var requestAnimFrame =
                window.requestAnimationFrame ||
                window['webkitRequestAnimationFrame'] ||
                window['mozRequestAnimationFrame'] ||
                window['oRequestAnimationFrame'] ||
                window.msRequestAnimationFrame ||
                null;

        var intervalFuns: { isRunning: bool; }[] = [],
            intervalFunID = 1;

        /**
        *
        *
        * @private
        * @const
        */
        var ensureFun = function (f: (..._: any[]) =>any): void {
            if (!(f instanceof Function)) {
                throw new Error("Function expected.");
            }
        }

        function addFuns(fs: { (): any; }[]) {
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
        function runNextFuture(args? ): void {
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

        export function getRequestAnimationFrame(): (callback: () =>void , element?: HTMLElement) => void {
            return requestAnimFrame;
        }

        export function block(f) {
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

        export function unblock(tag, ...args: any[]) {
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

        export function hasWork() {
            return futureFuns.length > 0;
        }

        export function run(... fs: { (): any; }[]) {
            addFuns(fs);

            if (!isFutureRunning) {
                runNextFuture();
            }
        }

        export function runFun(f: () =>any): void {
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

        export function map(values: any[], f: (any) =>any): void {
            ensureFun(f);

            // this is to ensure all values are in their own unique scope
            for (var i = 0; i < values.length; i++) {
                var value = values[i];

                util.future.runFun((function (value) {
                    return () => f(value);
                })(value));
            }

            util.future.run();
        }

        export function interval(callback: { (): void; }, element: HTMLElement): number {
            if (requestAnimFrame !== null) {
                var isRunningHolder = { isRunning: true };

                var recursiveCallback: { (): void; } = function () {
                    if (isRunningHolder.isRunning) {
                        callback();
                        requestAnimFrame(recursiveCallback, element);
                    }
                }

                requestAnimFrame(recursiveCallback, element);

                var id = intervalFunID++;
                intervalFuns[id] = isRunningHolder;

                return id;
            } else {
                return setInterval(callback, DEFAULT_INTERVAL);
            }
        }

        export function clear(tag) {
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

        export function once(f: () =>any): void {
            var request = util.future.getRequestAnimationFrame();

            if (request !== null) {
                request(f);
            } else {
                setTimeout(f, DEFAULT_INTERVAL);
            }
        }
    }

    export module ajax {
        export interface AjaxCallback {
            (status: number, text: string, xml: Object): void;
        }

        export function post(url: string, callback: AjaxCallback, data?: any, isBlocking?: bool, timestamp?: bool) {
            return ajax.call(
                    'POST',
                    url,
                    callback,
                    data,
                    isBlocking,
                    timestamp
            );
        }

        export function postFuture(url: string, callback: AjaxCallback, data?: any, isBlocking?: bool, timestamp?: bool) {
            var tag = util.future.block(function (status, text, xml) {
                callback(status, text, xml);
            });

            return ajax.post(
                    url,
                    function (status, text, xml) {
                        util.future.unblock(tag, status, text, xml);
                    },
                    data,
                    isBlocking,
                    timestamp
            );
        }

        export function get(url: string, callback: AjaxCallback, data?: any, isBlocking?: bool, timestamp?: bool) {
            return ajax.call(
                    'GET',
                    url,
                    callback,
                    data,
                    isBlocking,
                    timestamp
            );
        }

        export function getFuture(url: string, callback: AjaxCallback, data?: any, isBlocking?: bool, timestamp?: bool) {
            var tag = util.future.block(function (status, text, xml) {
                callback(status, text, xml);
            });

            return ajax.get(
                    url,
                    function (status, text, xml) {
                        util.future.unblock(tag, status, text, xml);
                    },
                    data,
                    isBlocking,
                    timestamp
            );
        }

        export function call(method: string, url: string, callback: AjaxCallback, passData: any = '', async: bool = true, timestamp: bool = false) {
            if (passData === undefined || passData === null) {
                passData = '';
            } else if (!(typeof passData === 'string' || passData instanceof String)) {
                passData = String(passData);
            }

            method = method.toLowerCase();

            // fuck IE 6 \o/
            var ajaxObj = new XMLHttpRequest();

            ajaxObj.onreadystatechange = function () {
                if (ajaxObj.readyState == 4) {
                    callback(
                            ajaxObj.status,
                            ajaxObj.responseText,
                            ajaxObj.responseXML
                    );
                }
            }

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
    }
}
