"use strict";

module quby.compilation {
    /**
     * Compilation contains information and utility functions for the compilation of Quby.
     */
    /* hints refer to things we should take advantage of in specific browsers. */
    export module hints {
        var methodMissing:bool = undefined;

        /**
        * @return True if the 'noSuchMethod' method is supported, and false if not.
        */
        export function useMethodMissing() : bool {
            if (methodMissing === undefined) {
                // we deliberately cause method missing to get called

                var obj = {
                    __noSuchMethod__: function () {
                        // do nothing
                    }
                };

                var supported = true;
                try {
                    obj['call_unknown_method']();
                } catch (err) {
                    supported = false;
                }

                methodMissing = supported;
            }

            return methodMissing;
        }

        export function useInlinedGetField() : bool {
            return util.browser.isMozilla || util.browser.isSafari;
        }
        
        export function doubleBracketOps() : bool {
            return util.browser.isIE;
        }
    }
}