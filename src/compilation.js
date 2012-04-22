"use strict";
var quby = window['quby'] || {};

(function( quby, util ) {
    /**
     * Compilation contains information and utility functions for the compilation of Quby.
     */
    quby.compilation = {
        /* hints refer to things we should take advantage of in specific browsers. */
        hints : {
            _methodMissing: undefined,

            /**
            * @return True if the 'noSuchMethod' method is supported, and false if not.
            */
            useMethodMissing: function () {
                if (quby.compilation._methodMissing == undefined) {
                    // we deliberately cause method missing to get called

                    var obj = {
                        __noSuchMethod__: function () {
                            // do nothing
                        }
                    };

                    var supported = true;
                    try {
                        obj.call_unknown_method();
                    } catch (err) {
                        supported = false;
                    }

                    quby.compilation._methodMissing = supported;
                }

                return quby.compilation._methodMissing;
            },

            useInlinedGetField: function() {
                return util.browser.isMozilla || util.browser.isSafari;
            },
            
            doubleBracketOps: function() {
                return util.browser.isIE;
            }
        }
    }
})( quby, util );