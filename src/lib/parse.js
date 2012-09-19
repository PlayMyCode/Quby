"use strict";

/*
 * TODO Optimizations:
 *
 * re-add the symbol id to rule lookup. So...
 *
 * ParserRule.parseRules add:
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
 * and ParserRule constructors.
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
var parse = window['parse'] = (function( window, undefined ) {
    var tabLog = function( indents ) {
        var str = '';
        for ( var i = 0; i < indents; i++ ) {
            str += '    ';
        }

        arguments[0] = str;
        console.log.apply( console, arguments );
    };


    /**
     * ASCII codes for characters.
     *
     * @type {number}
     * @const
     */
    var TAB     =  9, // \t
        SLASH_N = 10, // \n
        SLASH_R = 13, // \r

        SPACE = 32,
        EXCLAMATION = 33,
        DOUBLE_QUOTE = 34,
        HASH = 35,
        DOLLAR = 36,
        PERCENT = 37,
        AMPERSAND = 38,
        SINGLE_QUOTE = 39,
        LEFT_PAREN = 40,
        RIGHT_PAREN = 41,
        STAR = 42, // *
        PLUS = 43,
        COMMA = 44,
        MINUS = 45,
        FULL_STOP = 46,
        SLASH = 47,

        ZERO = 48,
        ONE = 49,
        TWO = 50,
        THREE = 51,
        FOUR = 52,
        FIVE = 53,
        SIX = 54,
        SEVEN = 55,
        EIGHT = 56,
        NINE = 57,

        COLON = 58,
        SEMI_COLON = 59,

        LESS_THAN = 60,
        EQUAL = 61,
        GREATER_THAN = 62,
        QUESTION_MARK = 63,
        AT = 64,

        UPPER_A = 65,
        UPPER_F = 70,
        UPPER_Z = 90,

        LEFT_SQUARE = 91,
        BACKSLASH = 92,
        RIGHT_SQUARE = 93,
        CARET = 94,
        UNDERSCORE = 95,

        LOWER_A = 97,
        LOWER_B = 98,
        LOWER_C = 99,
        LOWER_D = 100,
        LOWER_E = 101,
        LOWER_F = 102,
        LOWER_G = 103,
        LOWER_H = 104,
        LOWER_I = 105,
        LOWER_J = 106,
        LOWER_K = 107,
        LOWER_L = 108,
        LOWER_M = 109,
        LOWER_N = 110,
        LOWER_O = 111,
        LOWER_P = 112,
        LOWER_Q = 113,
        LOWER_R = 114,
        LOWER_S = 115,
        LOWER_T = 116,
        LOWER_U = 117,
        LOWER_V = 118,
        LOWER_W = 119,
        LOWER_X = 120,
        LOWER_Y = 121,
        LOWER_Z = 122,

        LEFT_BRACE = 123,
        BAR = 124,
        RIGHT_BRACE = 125,
        TILDA = 126;

    /**
     * @nosideeffects
     * @const
     * @param {number} code
     * @return {boolean}
     */
    var isHexCode = function(code) {
        return (code >= ZERO && code <= NINE) || // a number
               (code >= LOWER_A && code <= LOWER_F) || // lower a-z
               (code >= UPPER_A && code <= UPPER_F);   // UPPER A-Z
    };

    var isAlphaNumericCode = function(code) {
        return (
                (code >=  LOWER_A && code <= LOWER_Z) || // lower case letter
                (code >=  UPPER_A && code <= UPPER_Z) || // upper case letter
                (code === UNDERSCORE) ||
                (code >=  ZERO && code <= NINE)     // a number
        );
    };

    var isAlphaCode = function(code) {
        return (code >= LOWER_A && code <= LOWER_Z) ||
               (code >= UPPER_A && code <= UPPER_Z) ;
    };

    /**
     * @nosideeffects
     * @const
     * @param {number} code
     * @return {boolean}
     */
    var isNumericCode = function(code) {
        return (code >= ZERO && code <= NINE) ; // a number
    };

    /**
     * @return True if f is a function object, and false if not.
     */
    var isFunction = function(f) {
        return ( f instanceof Function ) || ( typeof f == 'function');
    };

    /*  **  **  **  **  **  **  **  **  **  **  **  **  **
     *
     *          Terminal
     *
     * The Terminal prototype, for representing a terminal
     * symbol to match.
     *
     * It also includes helper functions. These should be
     * left as local functions, so Google Closure will
     * inline them.
     *
     *  **  **  **  **  **  **  **  **  **  **  **  **  */

    /**
     * Generates a 1 character match function, that does not
     * take into account of word boundaries.
     *
     * So this should only be used on things like '+' or '-',
     * and not letters or numbers.
     *
     * @nosideeffects
     * @const
     */
    var newCharacterMatch = function( match ) {
        var matchCode = match.charCodeAt(0);

        return function(src, i, code, len) {
            if ( code === matchCode ) {
                return i+1;
            } else {
                return undefined;
            }
        };
    };

    /**
     * Generates a match function for the match given,
     * that does take into account word boundaries.
     *
     * The match only matches if it is followed by not
     * a letter, number or underscore.
     *
     * The end of the program counts as a word boundary.
     *
     * @nosideeffects
     * @const
     */
    /*
     * Yes, it contains lots of hard coded match routines.
     *
     * This is because most keywords will be short, not long,
     * and so this allows those short matches to be as quick
     * as possible.
     *
     * Remember these will be called thousands of times, so
     * it does matter, especially with FF 9's crappy
     * interpreter that gets used on first run!
     *
     * Plus it's faster to check chars indevidually on short
     * strings (like 'if', 'while', 'def', 'new', etc),
     * instead of using indexOf or substrings.
     *
     * @see http://jsperf.com/word-match-test
     */
    var newWordMatch = function( match ) {
        if ( isWordCode(match.charCodeAt(match.length-1)) ) {
            return newWordMatchBoundary(match);
        } else {
            return newWordMatchNoBoundary(match);
        }
    };

    var newWordMatchBoundary = function( match ) {
        var m0 = match.charCodeAt(0),
            m1 = match.charCodeAt(1),
            m2 = match.charCodeAt(2),
            m3 = match.charCodeAt(3),
            m4 = match.charCodeAt(4),
            m5 = match.charCodeAt(5),
            m6 = match.charCodeAt(6),
            m7 = match.charCodeAt(7);

        if ( match.length === 1 ) {
            return function(src, i, code, len) {
                if ( m0 === code && !isWordCharAt(src, i+1) ) {
                    return i+1;
                }
            };
        } else if ( match.length === 2 ) {
            return function(src, i, code, len) {
                if (
                        m0 === code &&
                        m1 === src.charCodeAt(i+1) &&
                        !isWordCharAt(src, i+2)
                ) {
                    return i + 2;
                }
            };
        } else if ( match.length === 3 ) {
            return function(src, i, code, len) {
                if ( m0 === code &&
                        m1 === src.charCodeAt(i+1) &&
                        m2 === src.charCodeAt(i+2) &&
                        !isWordCharAt(src, i+3)
                ) {
                    return i + 3;
                }
            };
        } else if ( match.length === 4 ) {
            return function(src, i, code, len) {
                if (
                        m0 === code &&
                        m1 === src.charCodeAt(i+1) &&
                        m2 === src.charCodeAt(i+2) &&
                        m3 === src.charCodeAt(i+3) &&
                        !isWordCharAt(src, i+4)
                ) {
                    return i + 4;
                }
            };
        } else if ( match.length === 5 ) {
            return function(src, i, code, len) {
                if (
                        m0 === code &&
                        m1 === src.charCodeAt(i+1) &&
                        m2 === src.charCodeAt(i+2) &&
                        m3 === src.charCodeAt(i+3) &&
                        m4 === src.charCodeAt(i+4) &&
                        !isWordCharAt(src, i+5)
                ) {
                    return i + 5;
                }
            };
        } else if ( match.length === 6 ) {
            return function(src, i, code, len) {
                if (
                        m0 === code &&
                        m1 === src.charCodeAt(i+1) &&
                        m2 === src.charCodeAt(i+2) &&
                        m3 === src.charCodeAt(i+3) &&
                        m4 === src.charCodeAt(i+4) &&
                        m5 === src.charCodeAt(i+5) &&
                        !isWordCharAt(src, i+6)
                ) {
                    return i + 6;
                }
            };
        } else if ( match.length === 7 ) {
            return function(src, i, code, len) {
                if (
                        m0 === code &&
                        m1 === src.charCodeAt(i+1) &&
                        m2 === src.charCodeAt(i+2) &&
                        m3 === src.charCodeAt(i+3) &&
                        m4 === src.charCodeAt(i+4) &&
                        m5 === src.charCodeAt(i+5) &&
                        m6 === src.charCodeAt(i+6) &&
                        !isWordCharAt(src, i+7)
                ) {
                    return i + 7;
                }
            };
        } else if ( match.length === 8 ) {
            return function(src, i, code, len) {
                if (
                        m0 === code &&
                        m1 === src.charCodeAt(i+1) &&
                        m2 === src.charCodeAt(i+2) &&
                        m3 === src.charCodeAt(i+3) &&
                        m4 === src.charCodeAt(i+4) &&
                        m5 === src.charCodeAt(i+5) &&
                        m6 === src.charCodeAt(i+6) &&
                        m7 === src.charCodeAt(i+7) &&
                        !isWordCharAt(src, i+8)
                ) {
                    return i + 8;
                }
            };
        } else {
            return function(src, i, code, len) {
                if (
                        m0 === code &&
                        m1 === src.charCodeAt(i+1) &&
                        m2 === src.charCodeAt(i+2) &&
                        m3 === src.charCodeAt(i+3) &&
                        m4 === src.charCodeAt(i+4) &&
                        m5 === src.charCodeAt(i+5) &&
                        m6 === src.charCodeAt(i+6) &&
                        m7 === src.charCodeAt(i+7)
                ) {
                    var keyLen = src.length;

                    // starts at 7, to avoid the tests above!
                    for ( var j = 7; j < keyLen; j++ ) {
                        if ( src.charCodeAt(i+j) !== match.charCodeAt(j) ) {
                            return undefined;
                        }
                    }

                    /*
                     * Check for things following the keyword.
                     * For example if we are matching 'null',
                     * then it must fail on 'nullify',
                     * since it's clear not null.
                     *
                     * This happens if we are at the end of input,
                     * or if a non-identifier character follows.
                     */
                    if ( ! isWordCharAt(src, i+keyLen) ) {
                        return i+keyLen;
                    }
                }

                return undefined;
            };
        }
    };

    var newWordMatchNoBoundary = function( match ) {
        var m0 = match.charCodeAt(0),
            m1 = match.charCodeAt(1),
            m2 = match.charCodeAt(2),
            m3 = match.charCodeAt(3),
            m4 = match.charCodeAt(4),
            m5 = match.charCodeAt(5),
            m6 = match.charCodeAt(6),
            m7 = match.charCodeAt(7);

        if ( match.length === 1 ) {
            return function(src, i, code, len) {
                if ( m0 === code ) {
                    return i+1;
                }
            };
        } else if ( match.length === 2 ) {
            return function(src, i, code, len) {
                if (
                        m0 === code &&
                        m1 === src.charCodeAt(i+1)
                ) {
                    return i + 2;
                }
            };
        } else if ( match.length === 3 ) {
            return function(src, i, code, len) {
                if ( m0 === code &&
                        m1 === src.charCodeAt(i+1) &&
                        m2 === src.charCodeAt(i+2)
                ) {
                    return i + 3;
                }
            };
        } else if ( match.length === 4 ) {
            return function(src, i, code, len) {
                if (
                        m0 === code &&
                        m1 === src.charCodeAt(i+1) &&
                        m2 === src.charCodeAt(i+2) &&
                        m3 === src.charCodeAt(i+3)
                ) {
                    return i + 4;
                }
            };
        } else if ( match.length === 5 ) {
            return function(src, i, code, len) {
                if (
                        m0 === code &&
                        m1 === src.charCodeAt(i+1) &&
                        m2 === src.charCodeAt(i+2) &&
                        m3 === src.charCodeAt(i+3) &&
                        m4 === src.charCodeAt(i+4)
                ) {
                    return i + 5;
                }
            };
        } else if ( match.length === 6 ) {
            return function(src, i, code, len) {
                if (
                        m0 === code &&
                        m1 === src.charCodeAt(i+1) &&
                        m2 === src.charCodeAt(i+2) &&
                        m3 === src.charCodeAt(i+3) &&
                        m4 === src.charCodeAt(i+4) &&
                        m5 === src.charCodeAt(i+5)
                ) {
                    return i + 6;
                }
            };
        } else if ( match.length === 7 ) {
            return function(src, i, code, len) {
                if (
                        m0 === code &&
                        m1 === src.charCodeAt(i+1) &&
                        m2 === src.charCodeAt(i+2) &&
                        m3 === src.charCodeAt(i+3) &&
                        m4 === src.charCodeAt(i+4) &&
                        m5 === src.charCodeAt(i+5) &&
                        m6 === src.charCodeAt(i+6)
                ) {
                    return i + 7;
                }
            };
        } else if ( match.length === 8 ) {
            return function(src, i, code, len) {
                if (
                        m0 === code &&
                        m1 === src.charCodeAt(i+1) &&
                        m2 === src.charCodeAt(i+2) &&
                        m3 === src.charCodeAt(i+3) &&
                        m4 === src.charCodeAt(i+4) &&
                        m5 === src.charCodeAt(i+5) &&
                        m6 === src.charCodeAt(i+6) &&
                        m7 === src.charCodeAt(i+7)
                ) {
                    return i + 8;
                }
            };
        } else {
            return function(src, i, code, len) {
                if (
                        m0 === code &&
                        m1 === src.charCodeAt(i+1) &&
                        m2 === src.charCodeAt(i+2) &&
                        m3 === src.charCodeAt(i+3) &&
                        m4 === src.charCodeAt(i+4) &&
                        m5 === src.charCodeAt(i+5) &&
                        m6 === src.charCodeAt(i+6) &&
                        m7 === src.charCodeAt(i+7)
                ) {
                    var keyLen = src.length;

                    // starts at 7, to avoid the tests above!
                    for ( var j = 7; j < keyLen; j++ ) {
                        if ( src.charCodeAt(i+j) !== match.charCodeAt(j) ) {
                            return undefined;
                        }
                    }
                }

                return undefined;
            };
        }
    };

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
    var isWordCode = function( code ) {
        return (
                (code >=  97 && code <= 122) || // lower case letter
                (code >=  48 && code <=  57) || // a number
                (code === 95)                || // underscore
                (code >=  65 && code <=  90)    // uppper case letter
        );
    };

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
    var isWordCharAt = function( src, i ) {
        return isWordCode( src.charCodeAt(i) );
    };

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
    var TYPE_FUNCTION       = 1,
        TYPE_WORD_CODE      = 2,
        TYPE_CODE           = 3,
        TYPE_STRING         = 4,
        TYPE_ARRAY          = 5;

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
    var stringToCodes = function( str ) {
        var len = str.length,
            arr = new Array( len );

        for ( var i = 0; i < len; i++ ) {
            arr[i] = str.charCodeAt( i );
        }

        return arr;
    }

    /**
     * Format the terminal name into a readable one, i.e.
     *     'ELSE_IF' => 'else if'
     *      'leftBracket' => 'left bracket'
     */
    var formatTerminalName = function(str) {
        /*
         * - reaplce camelCase in the middle to end of the string,
         * - lowerCase anything left (start of string)
         * - turn underscores into spaces
         * - uppercase the first letter of each word
         */
        return str.
                replace( /([^A-Z])([A-Z]+)/g, function(t,a,b) { return a + ' ' + b; } ).
                replace( '_', ' ' ).
                toLowerCase().
                replace( /\b([a-z])/g, function(t, letter) { return letter.toUpperCase(); } );
    }

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
     */
    var Terminal = function( match ) {
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
        this.testData = null;

        /**
         * An optional event to run after a symbol has been matched.
         *
         * Gives the option to move the offset on further, whilst ignoring
         * symbols.
         */
        this.postMatch = null;

        if ( match instanceof Terminal ) {
            return match;
        } else if ( isFunction(match) ) {
            this.isLiteral = false;
            this.testData = match;
            this.type = TYPE_FUNCTION;
        } else {
            this.isLiteral = true;

            var matchType = typeof match ;

            /*
             * A single character.
             * - a character code (number)
             * - a single character (1 length string)
             */
            if (
                    matchType === 'number' ||
                    (
                            (matchType === 'string' || match instanceof String) &&
                             match.length === 1
                    )
            ) {
                this.termName = "<Terminal '" + match + "'>";

                if ( matchType === 'string' ) {
                    match = match.charCodeAt( 0 );
                }

                this.literalLength = 1;
                this.isLiteral = true;

                this.type = isWordCode(match) ?
                        TYPE_WORD_CODE :
                        TYPE_CODE ;

                this.testData = match;

            /*
             * String primative, or string object.
             *
             * This is a string with a length longer than 1,
             * a length of zero will raise an error,
             * and 1 length is caught by the clause above.
             */
            } else if ( matchType === 'string' || match instanceof String ) {
                this.literalLength = match.length;
                this.isLiteral = true;
                this.type = TYPE_STRING;

                if ( match.length === 0 ) {
                    throw new Error( "Empty string given for Terminal" );
                } else {
                    this.testData = stringToCodes( match );

                    if ( match > 20 ) {
                        this.termName = "<Terminal '" + match.substring( 0, 20 ) + "...'>";
                    } else {
                        this.termName = "<Terminal '" + match + "'>";
                    }
                }

            /*
             * An array of matches to match against.
             * For example, multiple string keywords
             * in an array.
             */
            } else if ( match instanceof Array ) {
                var mTerminals = [];
                var isLiteral = true,
                    literalLength = Number.MAX_VALUE;

                for ( var i = 0; i < match.length; i++ ) {
                    var innerTerm = new Terminal( match[i] );

                    if ( innerTerm.isLiteral ) {
                        literalLength = Math.min( literalLength, innerTerm.literalLength );
                    } else {
                        isLiteral = false;
                    }

                    mTerminals[i] = innerTerm;
                }

                this.type = TYPE_ARRAY ;
                this.isLiteral = isLiteral;
                this.literalLength = literalLength;
                this.testData = mTerminals;
            // errors!
            } else if ( match === undefined ) {
                throw new Error( "undefined match given" );
            } else if ( match === null ) {
                throw new Error( "null match given" );
            } else {
                throw new Error( "unknown match given" );
            }
        }

        Object.preventExtensions( this );
    }

    Terminal.prototype['name'] = function( name ) {
        if ( arguments.length === 0 ) {
            return this.termName;
        } else {
            this.termName = name;
            return this;
        }
    }

    Terminal.prototype['setName'] = function( name ) {
        this.name = name;
    }

    Terminal.prototype.setID = function( id ) {
        this.id = id;

        return this;
    }

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
    Terminal.prototype['symbolMatch'] = function( callback ) {
        if ( callback !== null && ! isFunction(callback)) {
            throw new Error("symbolMatch callback is not valid: " + callback);
        }

        this.postMatch = callback;

        return this;
    };

    /**
     * Returns the test used for matching this symbol, during the symbolization
     * stage. This is either the test set when this was created, or the test
     * auto-generated.
     *
     * This is mostly for debugging purposes, or if you want to pull out the
     * test and re-use it elsewhere.
     */
    Terminal.prototype['getTest'] = function() {
        return this.test;
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
    Terminal.prototype['onMatch'] = function( callback ) {
        if ( ! callback ) {
            this.onMatchFun = null;
        } else {
            this.onMatchFun = callback;
        }

        return this;
    };

    /*  **  **  **  **  **  **  **  **  **  **  **  **  **
     *
     *          Parser
     *
     * This includes the parser rules for building the
     * expressions, and the core 'Parser' interface.
     *
     *  **  **  **  **  **  **  **  **  **  **  **  **  */

     var SymbolError = function( i, str ) {
         this['isSymbol'] = true;

         this['offset'] = i;
         this['match']  = str;
     };

     var TerminalError = function( i, terminal, match ) {
         this['isTerminal']     = true;

         this['offset']         = i;
         this['terminal']       = terminal;
         this['terminalName']   = terminal.termName;
         this['match']          = match;
         this['isLiteral']      = terminal.isLiteral;
     };

     /**
      * A wrapper for holding the Symbol result information.
      *
      * It's essentially a struct like object.
      */
     var Symbol = function( terminal, offset, str ) {
         this['terminal']       = terminal;
         this['offset']         = offset  ;
         this['match']          = str     ;
     };

     /**
      * Converts this to what it should be for the 'onMatch' callbacks.
      *
      * If there is no callback set on the inner symbol, then this is returned.
      * If there is a callback, then it is run, and the result is returned.
      */
     Symbol.prototype.onFinish = function() {
         var onMatch = this.terminal.onMatchFun;

         if ( onMatch !== null ) {
             return onMatch( this['match'], this['offset'] );
         } else {
             return this;
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
    var SymbolResult = function(
            errors,

            symbols,
            symbolIDs,

            symbolLength
    ) {
        this.errors = errors;

        this.symbols   = symbols;
        this.symbolIDs = symbolIDs;

        this.length = symbolLength;
        this.symbolIndex = 0;
        this.i = 0;

        this.currentString = null;
        this.currentID = INVALID_TERMINAL;
        this.stringI = -1;

        if ( symbolLength > 0 ) {
            this.currentID = this.symbolIDs[0];
        }

        Object.preventExtensions( this );
    };

    /**
     * @return The current index for the current symbol ID.
     */
    SymbolResult.prototype.idIndex = function() {
        return this.i;
    };

    SymbolResult.prototype.hasErrors = function() {
        return this.errors.length > 0;
    };

    SymbolResult.prototype.getTerminals = function() {
        var symbols = [];

        for ( var i = 0; i < this.length; i++ ) {
            symbols[i] = this.symbols[i].terminal;
        }

        return symbols;
    };

    SymbolResult.prototype.getErrors = function() {
        return this.errors;
    };

    /**
     * @return True if this currently points to a symbol.
     */
    SymbolResult.prototype.hasMore = function() {
        return this.symbolIndex < this.length;
    };

    SymbolResult.prototype.isMoving = function() {
        return this.i !== this.symbolIndex;
    };

    SymbolResult.prototype.finalizeMove = function() {
        var i = this.i;

        if ( i < this.length ) {
            this.currentID = this.symbolIDs[i];
            this.symbolIndex = i;
        } else {
            this.currentID = INVALID_TERMINAL;
            this.i = this.symbolIndex = this.length;
        }
    };

    SymbolResult.prototype.next = function() {
        this.i++;

        if ( this.i < this.length ) {
            this.currentID = this.symbolIDs[this.i];
            return this.symbols[ this.i-1 ];
        } else if ( this.i === this.length ) {
            this.currentID = INVALID_TERMINAL;
            return this.symbols[ this.i-1 ];
        } else {
            this.currentID = INVALID_TERMINAL;
            return null;
        }
    };

    SymbolResult.prototype.back = function( increments ) {
        if ( increments === undefined ) {
            this.i--;
        } else {
            this.i -= increments;
        }

        if ( this.i < this.symbolIndex ) {
            throw new Error("Moved back by more increments then the last finalize move location");
        } else {
            this.currentID = this.symbolIDs[this.i];
        }
    };

    SymbolResult.prototype.skip = function() {
        this.i++;
        this.finalizeMove();

        return this.symbols[ this.i-1 ];
    };

    SymbolResult.prototype.index = function() {
        return this.symbolIndex;
    };

    SymbolResult.prototype.idIndex = function() {
        return this.i;
    };

    SymbolResult.prototype.peekID = function() {
        if ( this.i >= this.length ) {
            return INVALID_TERMINAL;
        }

        return this.currentID;
    };

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
    var compressTerminals = function( terminals ) {
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
        var literalTerms    = [],
            nonLiteralTerms = [];

        compressTerminalsInner( termIDToTerms, literalTerms, nonLiteralTerms, terminals );

        literalTerms.sort( function(a, b) {
            return b.literalLength - a.literalLength;
        } );

        return {
                literals    : literalTerms,
                terminals   : nonLiteralTerms,
                idToTerms   : termIDToTerms
        };
    };

    var compressTerminalsInner = function( termIDToTerms, literalTerms, nonLiteralTerms, terminals ) {
        for ( var k in terminals ) {
            if ( terminals.hasOwnProperty(k) ) {
                var term = terminals[k];

                if ( term.type === TYPE_ARRAY ) {
                    compressTerminalsInner(
                            termIDToTerms,
                            literalTerms,
                            nonLiteralTerms,
                            term.testData
                    )
                } else {
                    termIDToTerms[ term.id ] = term;

                    if ( term.isLiteral ) {
                        literalTerms.push( term )
                    } else {
                        nonLiteralTerms.push( term )
                    }
                }
            }
        }
    }

    /**
     * Used when searching for terminals to use for parsing,
     * during the compilation phase.
     */
    var addRule = function( rule, terminals, id, allRules ) {
        if ( rule instanceof Terminal ) {
            var termID = rule.id;

            if ( termID !== INVALID_TERMINAL ) {
                terminals[ termID ] = rule;
            }

            return id;
        } else {
            return rule.optimizeScan( terminals, id, allRules );
        }
    };

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
     * 'rules' which maps symbolID to rules. That way a ParserRule can jump straight
     * to the branches which match; or return if none of them match.
     *
     * This allows it to cut down on the amount of searching needed.
     */
    var ParserRule = function( parse ) {
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

        /**
         * Records how long the call to 'compile' takes to execute.
         */
        this.compileTime = 0;
        this.compiledId  = NO_COMPILE_ID;

        /**
         * The global parse instance this is working with.
         *
         * @const
         */
        this.parseParent = parse;

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
         * need to visit each ParserRule once.
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

        Object.preventExtensions( this );
    };

    ParserRule.prototype.cyclicOr = function( rules ) {
        if ( this.rules.length > 0 ) {
            throw new Error("Cyclic rules cannot have any other rules");
        }

        this.orAll( rules );
        this.endCurrentOr();

        this.isCyclic = true;

        if ( this.rules.length === 1 && this.rules[0] instanceof Array ) {
            this.rules = this.rules[0];
        } else {
            throw new Error("Internal error, cyclic rule setup has gone wrong (this is a parse.js bug)");
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
    ParserRule.prototype['repeatSeperator'] = function( match, seperator ) {
        return this.seperatingRule( match, seperator );
    };

    /**
     * The same as 'repeatSeperator', only matching is optional.
     *
     * @param match The rule to be matching and collecting.
     * @param seperator The seperator between each match.
     * @return This parser rule.
     */
    ParserRule.prototype['optionalSeperator'] = function( match, seperator ) {
        return this.seperatingRule( match, seperator ).
                markOptional( true );
    };

    ParserRule.prototype.seperatingRule = function( match, seperator ) {
        this.endCurrentOr();

        return this.thenSingle(
                this.parseParent().markSeperatingRule( match, seperator )
        );
    };

    ParserRule.prototype.markSeperatingRule = function( match, seperator ) {
        this.thenAll( match );
        this.thenAll( seperator );

        this.endCurrentOr();

        this.isSeperator = true;

        return this;
    };

    ParserRule.prototype.errorIfInLeftBranch = function( rule ) {
        if ( this.rules.length !== 0 ) {
            var left = this.rules[0];

            if ( left instanceof Array ) {
                for ( var i = 0; i < left.length; i++ ) {
                    var leftRule = left[i];

                    if ( leftRule === rule ) {
                        throw new Error( "First sub-rule given leads to a recursive definition (infinite loop at runtime)" );
                    } else if ( leftRule instanceof ParserRule ) {
                        leftRule.errorIfInLeftBranch( rule );
                    }
                }
            } else {
                if ( left === rule ) {
                    throw new Error( "First sub-rule given leads to a recursive definition (infinite loop at runtime)" );
                } else if ( left instanceof ParserRule ) {
                    left.errorIfInLeftBranch( rule );
                }
            }
        }
    };

    /**
     * @param ignoreSpecial Pass in true to skip the cyclic check.
     */
    ParserRule.prototype.errorIfEnded = function( ignoreSpecial ) {
        if ( this.compiled !== null ) {
            throw new Error("New rule added, but 'finally' has already been called");
        }

        if ( (this.isCyclic || this.isSeperator) && !ignoreSpecial ) {
            throw new Error("Cannot add more rules to a special ParserRule");
        }
    };

    /**
     * Parses the next items as being optional to each other.
     *
     * Multiple arguments can be given, or you can follow with more
     * 'or' options.
     */
    ParserRule.prototype['or'] = function() {
        return this.orAll( arguments );
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
    ParserRule.prototype['either'] =
            ParserRule.prototype['or'];

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
    ParserRule.prototype['thenOr'] = function() {
        this.endCurrentOr();
        return this.orAll( arguments );
    };

    ParserRule.prototype['thenEither'] =
            ParserRule.prototype['thenOr'];

    /**
     * Marks the last item in the rules set as being optional, or not optional.
     *
     * Optional rules can be skipped.
     */
    ParserRule.prototype.markOptional = function( isOptional ) {
        var rulesLen = this.rules.length;

        if ( rulesLen === 0 ) {
            throw new Error("Item being marked as optional, when there are no rules.");
        }

        this.isOptional[ rulesLen-1 ] = isOptional ?
                1 :
                0 ;

        return this;
    };

    /**
     * This is an optional 'then' rule.
     *
     * Each of the values given is marked as being 'optional', and chomped if
     * a match is found, and skipped if a match fails.
     */
    ParserRule.prototype['optional'] = function() {
        return this.optionalAll( arguments );
    };

    ParserRule.prototype.optionalAll = function( obj ) {
        this.endCurrentOr();
        return this.helperAll( 'optionalSingle', obj );
    };

    ParserRule.prototype.optionalSingle = function( obj ) {
        this.thenSingle( obj );
        this.markOptional( true );
    };

    ParserRule.prototype['optionalThis'] = function() {
        return this['optional']( this );
    };

    /**
     * Same as 'either', except all values given are optional.
     * With this having no-match is acceptable.
     *
     * @return This ParserRule instance.
     */
    ParserRule.prototype['maybe'] =
            ParserRule.prototype['optional'];

    ParserRule.prototype['maybeThis'] =
            ParserRule.prototype['optionalThis'];

    ParserRule.prototype['orThis'] = function() {
        this.orAll( arguments );

        this.orThisFlag = true;

        return this;
    };

    ParserRule.prototype.endCurrentOr = function() {
        var currentOr = this.currentOr;

        if ( this.orThisFlag ) {
            if ( currentOr === null ) {
                throw new Error("infinite recursive parse rule, this given as 'or/either' condition, with no alternatives.");
            } else {
                currentOr.push( this );
            }

            this.orThisFlag = false;
        }

        if ( currentOr !== null ) {
            /*
             * If still building the left branch,
             * check if we are cyclic.
             */
            if ( this.rules.length === 0 ) {
                for ( var j = 0; j < currentOr.length; j++ ) {
                    var or = currentOr[j];

                    if ( or instanceof ParserRule ) {
                        or.errorIfInLeftBranch( this );
                    }
                }
            }

            this.rules.push( currentOr );
            this.markOptional( false );

            this.currentOr = null;
        }
    };

    ParserRule.prototype.orAll = function( obj ) {
        return this.helperAll( 'orSingle', obj );
    };

    ParserRule.prototype.orSingle = function( other ) {
        if ( this.currentOr !== null ) {
            this.currentOr.push( other );
        } else {
            this.currentOr = [ other ];
        }
    };

    ParserRule.prototype['then'] = function() {
        return this.thenAll( arguments );
    };

    ParserRule.prototype.thenAll = function( obj ) {
        this.endCurrentOr();
        return this.helperAll( 'thenSingle', obj );
    };

    ParserRule.prototype.helperAll = function( singleMethod, obj ) {
        this.errorIfEnded();

        if ( ! obj ) {
            if ( obj === undefined ) {
                throw new Error( "Undefined 'then' rule given." );
            } else {
                throw new Error( "Unknown 'then' rule given of type " + typeof(obj) );
            }
        } else if (
                obj instanceof ParserRule ||
                obj instanceof Terminal
        ) {
            this[singleMethod]( obj );
        // something that can be used as a terminal
        } else if (
                typeof obj === 'string' || obj instanceof String ||
                typeof obj === 'number' || obj instanceof Number ||
                isFunction(obj)
        ) {
            this[singleMethod]( this.parseParent['terminal']( obj ) );
        // arguments or array
        } else if ( (typeof (obj.length)) === 'number' ) {
            for ( var i = 0; i < obj.length; i++ ) {
                this.helperAll( singleMethod, obj[i] );
            }
        // ??? maybe an object of terminals?
        } else {
            for ( var k in obj ) {
                if ( obj.hasOwnProperty(k) ) {
                    this.helperAll( singleMethod, obj[k] );
                }
            }
        }

        return this;
    };

    /**
     * 'a' is _exactly_ the same as 'then'.
     *
     * It is supplied to allow code to be more readable.
     * For eample:
     *
     *  var whileLoop = parse().a( startWhile ).
     *          then( condition, statements ).
     *          onMatch( closingWhile );
     *
     * If you asked someone to read it outloud,
     * they will probably say:
     *  "while loop equals parse a start while,
     *   then condition and statements,
     *   then finally closing while"
     *
     * It's not perfect, but it's pretty close to proper
     * english, which is the point of the method.
     *
     * Internally 'a' is just set to 'then', so it is
     * _literally_ the same method, with no added overhead.
     *
     * See 'then' for usage details, since it's the same.
     */
    ParserRule.prototype['a'] = ParserRule.prototype['then'];

    ParserRule.prototype.thenSingle = function( rule ) {
        if ( rule === this && this.rules.length === 0 ) {
            throw new Error( "infinite recursive parse rule, 'this' given as 'then' parse rule." );
        } else {
            if ( this.rules.length === 0 && rule instanceof ParserRule ) {
                rule.errorIfInLeftBranch( this );
            }

            this.rules.push( rule );
            this.markOptional( false );
        }

        return this;
    };

    /**
     *
     */
    ParserRule.prototype['onMatch'] = function( callback ) {
        this.endCurrentOr();

        this.finallyFun = callback;

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
    ParserRule.prototype['compile'] = function() {
        if ( this.compiled === null ) {
            var start = Date.now();
            this.compiled = this.optimize();
            this.compileTime = Date.now() - start;
        }

        return this;
    };

    var bruteScan = function( parserRule, seenRules, idsFound ) {
        if ( seenRules[parserRule.compiledId] !== true ) {
            seenRules[parserRule.compiledId] = true;

            var rules      = parserRule.rules,
                isOptional = parserRule.isOptional;

            /*
             * We are interested in all branches on the left side, up to and
             * including, the first non-optional branch.
             *
             * This is because we might have to come down here for an optional
             * term, or skip it.
             */
            if ( rules.length > 0 ) {
                var rule = rules[0];

                if ( rule instanceof Terminal ) {
                    if ( rule.id !== INVALID_TERMINAL ) {
                        idsFound[ rule.id ] = true;
                    }
                } else if ( rule instanceof Array ) {
                    for ( var j = 0; j < rule.length; j++ ) {
                        var r = rule[j];

                        if ( r instanceof Terminal ) {
                            if ( r.id !== INVALID_TERMINAL ) {
                                idsFound[ r.id ] = true;
                            }
                        } else {
                            bruteScan( r, seenRules, idsFound );
                        }
                    }
                } else {
                    bruteScan( rule, seenRules, idsFound );
                }
            }
        } else {
            return;
        }
    };

    var addRuleToLookup = function( id, ruleLookup, rule ) {
        var arrLookup = ruleLookup[id];

        if ( arrLookup === undefined ) {
            ruleLookup[id] = rule;
        } else if ( arrLookup instanceof Array ) {
            arrLookup.push( rule );
        } else {
            ruleLookup[id] = [ arrLookup, rule ];
        }
    }

    var callParseDebug = function( debugCallback, symbols, compileTime, symbolTime, rulesTime, totalTime ) {
        if ( debugCallback ) {
            var times = {};

            times['compile'] = compileTime;
            times['symbols'] = symbolTime;
            times['rules']   = rulesTime ;
            times['total']   = totalTime ;

            debugCallback( symbols.getTerminals(), times );
        }
    }

    ParserRule.prototype.terminalScan = function() {
        if ( this.compiledLookups === null ) {
            var rules = this.rules,
                len = rules.length,
                lookups = new Array( len );

            for ( var i = 0; i < len; i++ ) {
                var rule = rules[i],
                    ruleLookup = [];

                // an 'or' rule
                if ( rule instanceof Array ) {
                    for ( var j = 0; j < rule.length; j++ ) {
                        var r = rule[j];

                        if ( r instanceof Terminal ) {
                            addRuleToLookup( r.id, ruleLookup, r );
                        } else {
                            var ids = [],
                                seen = [];

                            bruteScan( r, seen, ids );

                            // merge this rules lookups in
                            for ( var id in ids ) {
                                addRuleToLookup( id, ruleLookup, r );
                            }
                        }
                    }
                // an 'then' rule
                } else if ( rule instanceof Terminal ) {
                    addRuleToLookup( rule.id, ruleLookup, rule );
                } else {
                    var ids = [],
                        seen = [];

                    bruteScan( rule, seen, ids );

                    // merge this rules lookups in
                    for ( var id in ids ) {
                        addRuleToLookup( id, ruleLookup, rule );
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
     * If the ParserRule only contains one Terminal,
     * or one ParserRule, then it's moved up.
     *
     * This way when it comes to the actual parsing,
     * have managed to chop out a few functions calls.
     */
    ParserRule.prototype.optimize = function() {
        var terminals = new Array( this.parseParent.getNumTerminals() );

        var allRules = [];
        var len = this.optimizeScan( terminals, 0, allRules );

        for ( var i = 0; i < len; i++ ) {
            allRules[i].terminalScan();
        }

        return compressTerminals( terminals );
    };

    /**
     * Converts the rules stored in this parser into a trie
     * of rules.
     */
    ParserRule.prototype.optimizeScan = function(terminals, id, allRules) {
        if ( this.isRecursive === NO_RECURSION ) {
            if ( this.compiledId === NO_COMPILE_ID ) {
                this.compiledId = id;
                allRules[id] = this;

                id++;
            }

            this.endCurrentOr();

            this.isRecursive = RECURSION;

            var rules = this.rules,
                len = rules.length;

            if ( len === 0 ) {
                throw new Error("No rules in parserRule");
            } else if ( len > 1 && this.finallyFun === null && !this.isSeperator ) {
                throw new Error("No onMatch provided for parser rule, when there are multiple conditions");
            } else {
                for ( var i = 0; i < len; i++ ) {
                    var rule = rules[i];

                    // an 'or' rule
                    if ( rule instanceof Array ) {
                        for ( var j = 0; j < rule.length; j++ ) {
                            id = addRule( rule[j], terminals, id, allRules );
                        }
                    // an 'then' rule
                    } else {
                        id = addRule( rule, terminals, id, allRules );
                    }
                }
            }

            this.isRecursive = NO_RECURSION;
        }

        return id;
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
    ParserRule.prototype['parseLowerCase'] = function( input, callback ) {
        this.parseInner( input, input.toLowerCase(), callback );
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
    ParserRule.prototype['parseUpperCase'] = function( input, callback ) {
        this.parseInner( input, input.toUpperCase(), callback );
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
     * The rules of this ParserRule will be applied repeatedly on every symbol
     * found. The result array given contains the results from each of these
     * runs.
     *
     * @param {string} displaySrc The text used when creating substrings, or for parsing.
     * @param {string} parseSrc optional, an alternative source code used for parsing.
     * @param callback A function to call when parsing is complete.
     * @param debugCallback An optional debugging callback, which if provided, will be called with debugging info.
     */
    ParserRule.prototype['parse'] = function( displaySrc, parseSrc, callback, debugCallback ) {
        if ( callback === undefined ) {
            callback = parseSrc;
            parseSrc = displaySrc;
        }

        this.parseInner( displaySrc, parseSrc, callback, debugCallback );
    };

    ParserRule.prototype.parseInner = function( input, parseInput, callback, debugCallback ) {
        if (
                debugCallback !== undefined &&
                debugCallback !== null &&
                !isFunction(debugCallback)
        ) {
            throw new Error("Invalid debugCallback object given");
        }

        var self  = this,
            compileTime = this.compileTime,
            start = Date.now();

        this.parseSymbols( input, parseInput, function(symbols, symbolsTime) {
            if ( symbols.hasErrors() ) {
                callback( [], symbols.getErrors() );
                callParseDebug( debugCallback, symbols,
                        compileTime,
                        symbolsTime,
                        0,
                        Date.now() - start
                );
            } else {
                var rulesStart = Date.now();
                var result     = self.parseRules( symbols, input, parseInput );
                var rulesTime  = Date.now() - rulesStart;

                window['util']['future']['run']( function() {
                    callback( result.result, result.errors );
                    callParseDebug( debugCallback, symbols,
                            compileTime,
                            symbolsTime,
                            rulesTime,
                            Date.now() - start
                    );
                } );
            }
        })
    };

    ParserRule.prototype['symbolize'] = function( input, callback ) {
        this.symbolizeInner( input, input, callback );
    };

    ParserRule.prototype['symbolizeLowerCase'] = function( input, callback ) {
        this.symbolizeInner( input, input.toLowerCase(), callback );
    };

    ParserRule.prototype['symbolizeUpperCase'] = function( input, callback ) {
        this.symbolizeInner( input, input.toUpperCase(), callback );
    };

    ParserRule.prototype.symbolizeInner = function( input, parseInput, callback ) {
        this.parseSymbols( input, parseInput, function(symbols) {
            callback( symbols.getTerminals(), symbols.getErrors() );
        });
    };

    /**
     * Does the actual high level organisation or parsing the
     * source code.
     *
     * Callbacks are used internally, so it gets spread across
     * multiple JS executions.
     */
    ParserRule.prototype.parseSymbols = function( input, parseInput, callback ) {
        if ( ! isFunction(callback) ) {
            throw new Error("No callback provided for parsing");
        }

        this.endCurrentOr();

        this['compile']();

        if ( this.hasBeenUsed ) {
            this.clearRecursionFlag();
            this.hasBeenUsed = false;
        }

        var _this = this;

        window['util']['future']['run']( function() {
            var start = Date.now();
            var symbols = _this.parseSymbolsInner(
                    input,
                    parseInput,
                    _this.parseParent.timeSymbolsFlag
            );
            var time = Date.now() - start;

            callback( symbols, time );
        } );
    };

    /**
     * Resets the internal recursion flags.
     *
     * The flags are used to ensure the parser cannot run away,
     * but can be left in a strange state between use.
     */
    ParserRule.prototype.clearRecursionFlag = function() {
        if ( ! this.isClearingRecursion ) {
            this.isClearingRecursion = true;

            this.isRecursive = NO_RECURSION;
            this.recursiveCount = 0;

            for ( var i = 0; i < this.rules.length; i++ ) {
                var rule = this.rules[i];

                if ( rule instanceof Array ) {
                    for ( var j = 0; j < rule.length; j++ ) {
                        var r = rule[j];

                        if ( r instanceof ParserRule ) {
                            r.clearRecursionFlag();
                        }
                    }
                } else if ( rule instanceof ParserRule ) {
                    rule.clearRecursionFlag();
                }
            }

            this.isClearingRecursion = false;
        }
    };

    ParserRule.prototype.parseRules = function( symbols, inputSrc, src ) {
        this.hasBeenUsed = true;

        /*
         * Iterate through all symbols found, then going
         * through the grammar rules in order.
         * We jump straight to grammar rules using the
         * 'termsToRules' lookup.
         */

        var errors = [],
            hasError = null;

		while ( symbols.hasMore() ) {
			var onFinish = this.ruleTest( symbols, inputSrc );

            if ( onFinish !== null ) {
                symbols.finalizeMove();

                if ( hasError === null && symbols.hasMore() ) {
                    hasError = symbols.skip();
                }
                
                /*
                 * We parse errors for as long as possible,
                 * and so only report when re have gone back
                 * to success.
                 *
                 * This way if we have 4 error symbols in a
                 * row, only the first gives an error.
                 */
                if ( hasError !== null ) {
                    errors.push( new TerminalError(
                            hasError.offset,
                            hasError.terminal,
                            hasError.match
                    ) );
                }

                return {
                        result: onFinish(),
                        errors: errors
                }
			} else {
                var next = symbols.skip();

                if ( hasError === null ) {
                    hasError = next;
                }
			}
		}

        if ( hasError !== null ) {
            errors.push( new TerminalError(
                    hasError.offset,
                    hasError.terminal,
                    hasError.match
            ) );
        }

        return {
                result: null,
                errors: errors
        }
    };

    ParserRule.prototype.ruleTest = function( symbols, inputSrc ) {
        if ( this.isSeperator || this.isCyclic ) {
            var args = null;

            if ( this.isSeperator ) {
                args = this.ruleTestSeperator( symbols, inputSrc );
            } else {
                args = this.ruleTestCyclic( symbols, inputSrc );
            }

            if ( args === null ) {
                return null;
            } else {
                var finallyFun = this.finallyFun;

                if ( finallyFun === null ) {
                    return function() {
                        for ( var i = 0; i < args.length; i++ ) {
                            var arg = args[i];

                            if ( isFunction(arg) ) {
                                arg = arg();
                            } else if ( arg instanceof Symbol ) {
                                arg = arg.onFinish();
                            }

                            if ( arg === undefined ) {
                                throw new Error("onMatch result is undefined");
                            }

                            args[i] = arg;
                        }

                        return args;
                    };
                } else {
                    return function() {
                        for ( var i = 0; i < args.length; i++ ) {
                            var arg = args[i];

                            if ( isFunction(arg) ) {
                                arg = arg();
                            } else if ( arg instanceof Symbol ) {
                                arg = arg.onFinish();
                            }

                            if ( arg === undefined ) {
                                throw new Error("onMatch result is undefined");
                            }

                            args[i] = arg;
                        }

                        return finallyFun( args );
                    };
                }
            }
        } else {
            var args = this.ruleTestNormal( symbols, inputSrc );

            if ( args === null ) {
                return null;
            } else {
                var finallyFun = this.finallyFun;

                if ( finallyFun === null ) {
                    finallyFun = 0;
                }

                if ( isFunction(finallyFun) ) {
                    return function() {
                        // evaluate all args, bottom up
                        for ( var i = 0; i < args.length; i++ ) {
                            var arg = args[i];

                            if ( isFunction(arg) ) {
                                var r = arg();

                                if ( r === undefined ) {
                                    throw new Error("onMatch result is undefined");
                                } else {
                                    args[i] = r;
                                }
                            } else if ( arg instanceof Symbol ) {
                                var r = arg.onFinish();

                                if ( r === undefined ) {
                                    throw new Error("onMatch result is undefined");
                                } else {
                                    args[i] = r;
                                }
                            }
                        }

                        return finallyFun.apply( null, args );
                    };
                } else {
                    var index = finallyFun|0;

                    if ( index >= args.length ) {
                        throw Error( "onMatch index is out of bounds: " + finallyFun );
                    } else {
                        var arg = args[ finallyFun ];

                        return function() {
                            if ( isFunction(arg) ) {
                                var r = arg();

                                if ( r === undefined ) {
                                    throw new Error("onMatch result is undefined");
                                } else {
                                    return r;
                                }
                            } else if ( arg instanceof Symbol ) {
                                var r = arg.onFinish();

                                if ( r === undefined ) {
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
        }
    };

    ParserRule.prototype.ruleTestSeperator = function( symbols, inputSrc ) {
        var lookups = this.compiledLookups,
            peekID  = symbols.peekID(),
            onFinish = null,
            rules   = lookups[0],
            rule    = rules[peekID];

        if ( rule === undefined ) {
            return null;
        } else {
            var symbolI = symbols.idIndex(),
                args = null;

            if ( this.isRecursive === symbolI ) {
                if ( this.recursiveCount > 2 ) {
                    return null;
                } else {
                    this.recursiveCount++;
                }
            } else {
                this.recursiveCount = 0;
                this.isRecursive = symbolI;
            }

            if ( rule instanceof ParserRule ) {
                onFinish = rule.ruleTest( symbols, inputSrc );

                if ( onFinish === null ) {
                    this.isRecursive = symbolI;
                    if ( this.recursiveCount > 0 ) {
                        this.recursiveCount--;
                    }

                    return null;
                } else {
                    args = [ onFinish ];
                }
            } else if ( rule instanceof Array ) {
                var ruleLen = rule.length;

                for ( var j = 0; j < ruleLen; j++ ) {
                    var r = rule[j];

                    if ( r instanceof ParserRule ) {
                        onFinish = r.ruleTest( symbols, inputSrc );

                        if ( onFinish !== null ) {
                            args = [ onFinish ];
                            break;
                        }
                    } else if ( r.id === peekID ) {
                        args = [ symbols.next() ];
                        break;
                    }
                }
            } else if ( rule.id === peekID ) {
                args = [ symbols.next() ];
            } else {
                if ( this.recursiveCount > 0 ) {
                    this.recursiveCount--;
                }

                return null;
            }

            var separators = lookups[1];
            while ( symbols.hasMore() ) {
                symbolI = symbols.idIndex();
                peekID  = symbols.peekID();

                var separator = separators[peekID],
                    hasSeperator = false;

                if ( separator === undefined ) {
                    break;
                } else if ( separator instanceof Array ) {
                    for ( var j = 0; j < separator.length; j++ ) {
                        var r = separator[j];

                        if (
                            r instanceof ParserRule &&
                            r.ruleTest(symbols, inputSrc) !== null
                        ) {
                            hasSeperator = true;
                            break;
                        } else if ( r.id === peekID  ) {
                            symbols.next();
                            hasSeperator = true;
                            break;
                        }
                    }
                } else if (
                        (
                                ( separator instanceof ParserRule ) &&
                                separator.ruleTest(symbols, inputSrc) !== null
                        ) || (
                                separator.id === peekID &&
                                symbols.next()
                        )
                ) {
                    hasSeperator = true;
                }

                if ( hasSeperator ) {
                    peekID = symbols.peekID();
                    rule   = rules[peekID];

                    if ( rule === undefined ) {
                        symbols.back( symbols.idIndex()-symbolI );
                        break;
                    } else if ( rule instanceof ParserRule ) {
                        onFinish = rule.ruleTest( symbols, inputSrc );

                        if ( onFinish === null ) {
                            symbols.back( symbols.idIndex()-symbolI );
                            break;
                        } else {
                            args.push( onFinish );
                        }
                    } else if ( rule instanceof Array ) {
                        var ruleLen = rule.length,
                            success = false;

                        for ( var j = 0; j < ruleLen; j++ ) {
                            var r = rule[j];

                            if ( r instanceof ParserRule ) {
                                onFinish = r.ruleTest( symbols, inputSrc );

                                if ( onFinish !== null ) {
                                    args.push( onFinish );
                                    success = true;
                                    break;
                                }
                            } else if ( r.id === peekID ) {
                                args.push( symbols.next() );
                                success = true;
                                break;
                            }
                        }

                        if ( ! success ) {
                            symbols.back( symbols.idIndex()-symbolI );
                            break;
                        }
                    } else if ( rule.id === peekID ) {
                        args.push( symbols.next() );
                    } else {
                        symbols.back( symbols.idIndex()-symbolI );
                        break;
                    }
                } else {
                    break;
                }
            }

            if ( args === null ) {
                // needs to remember it's recursive position when we leave
                this.isRecursive = symbolI;
                if ( this.recursiveCount > 0 ) {
                    this.recursiveCount--;
                }

                return null;
            } else {
                this.isRecursive = NO_RECURSION;
                return args;
            }
        }
    };

    ParserRule.prototype.ruleTestNormal = function( symbols, inputSrc ) {
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
        var startSymbolI = symbols.idIndex(),
            peekID = symbols.peekID();

if ( window._.expr === this ) {
    tabLog( window._.exprC, '### expr ###', this.isRecursive);
    window._.exprC = ( window._.exprC === undefined ) ? 0 : window._.exprC + 1 ;

    if ( window._.exprC > 9 ) {
        throw new Error('STOP!');
    }
}
        if ( this.internalCount === 0 ) {
            tabLog( window._.exprC, 'first entered', this.isRecursive);
            this.recursiveCount = 0;
        }

        this.internalCount++;

        if ( this.isRecursive === startSymbolI ) {
            if ( this.recursiveCount > 2 ) {
                if ( window._.expr === this ) {
                    tabLog( window._.exprC, 'resursive stop');
                    window._.exprC--;
                }

                this.internalCount--;
                return null;
            } else {
                this.recursiveCount++;
            }
        } else {
            if ( window._.expr === this ) {
                tabLog( window._.exprC, 'clear expr', startSymbolI);
            }

            this.recursiveCount = 0;
            this.isRecursive    = startSymbolI;
        }

        var lookups  = this.compiledLookups,
            optional = this.isOptional,
            onFinish = null,
            args     = null;

        /*
         * If somethign goes wrong, it just returns, there and then.
         *
         * If they are all allowed, including optional rules taht fail, then
         * args are returned. This is even if args is null, in which case it
         * becomes an array of 'nulls'.
         */
        for (
                var i = 0, len = lookups.length;
                i < len;
                i++
        ) {
            /*
             * Lookup used to jump straight to the rules we are interested in.
             * It also allows us to quit early, if we won't find what we are
             * after.
             */
            var rule = lookups[i][peekID];

            if ( rule === undefined ) {
                if ( optional[i] === 0 ) {
                    if ( i !== 0 ) {
                        symbols.back( symbols.idIndex()-startSymbolI );
                    }

                    // needs to remember it's recursive position when we leave
                    this.isRecursive = startSymbolI;
                    if ( this.recursiveCount > 0 ) {
                        this.recursiveCount--;
                    }

                    args = null;
                    break;
                } else {
                    if ( args === null ) {
                        args = [ null ];
                        this.isRecursive = NO_RECURSION;
                    } else {
                        args.push( null );
                    }
                }
            } else {
                // 'or' rules
                if ( rule instanceof Array ) {
                    var ruleLen = rule.length;

                    for ( var j = 0; j < ruleLen; j++ ) {
                        var r = rule[j];

                        if ( r instanceof ParserRule ) {
                            onFinish = r.ruleTest( symbols, inputSrc );

                            if ( onFinish !== null ) {
                                break;
                            }
                        } else if ( r.id === peekID ) {
                            onFinish = symbols.next();
                            break;
                        }
                    }
                // 'then' rules
                } else if ( rule instanceof ParserRule ) {
                    onFinish = rule.ruleTest( symbols, inputSrc );
                // terminal rule
                } else if ( peekID === rule.id ) {
                    onFinish = symbols.next();
                }

                // it is only the first iteration where recursiveness is not allowed,
                // so we always turn it off
                if ( onFinish === null && optional[i] === 0 ) {
                    symbols.back( symbols.idIndex()-startSymbolI );

                    // needs to remember it's recursive position when we leave
                    this.isRecursive = startSymbolI;

                    args = null;
                    break;
                } else {
                    if ( args === null ) {
                        args = [ onFinish ];
                        this.isRecursive = NO_RECURSION;
                    } else {
                        args.push( onFinish );
                    }

                    onFinish = null;
                    peekID = symbols.peekID();
                }
            }
        }

        if ( this.recursiveCount > 0 ) {
            this.recursiveCount--;
        }

if ( window._.expr === this ) {
    tabLog( window._.exprC, 'leave');
    window._.exprC--;
}
        this.internalCount--;
        return args;
    };

    ParserRule.prototype.ruleTestCyclic = function( symbols, inputSrc ) {
        var args = null,
            lookups = this.compiledLookups,
            len = lookups.length,
            onFinish = null;

        while ( symbols.hasMore() ) {
            for ( var i = 0; i < len; i++ ) {
                var peekID = symbols.peekID(),
                    rule = lookups[i][peekID];

                if ( rule === undefined ) {
                    return args;
                } else {
                    if ( rule instanceof ParserRule ) {
                        onFinish = rule.ruleTest( symbols, inputSrc );
                    } else if ( rule instanceof Array ) {
                        for ( var j = 0; j < rule.length; j++ ) {
                            var r = rule[j];

                            if ( r instanceof ParserRule ) {
                                onFinish = r.ruleTest( symbols, inputSrc );
                                break;
                            } else if ( r.id === peekID ) {
                                onFinish = symbols.next();
                                break;
                            }
                        }
                    } else if ( rule.id === peekID ) {
                        onFinish = symbols.next();
                    }

                    if ( onFinish !== null ) {
                        break;
                    }
                }
            }

            if ( onFinish !== null ) {
                if ( args === null ) {
                    args = [ onFinish ];
                } else {
                    args.push( onFinish );
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
    ParserRule.prototype.parseSymbolsInner = function( inputSrc, src ) {
        var symbolI     = 0,

            len         = src.length,

            symbols     = [],
            symbolIDs   = [],

            ignores     = this.parseParent.getIgnores(),
            literals    = this.compiled.literals,
            terminals   = this.compiled.terminals,

            allTerms    = ignores.concat( literals, terminals ),

            ignoresLen  = ignores.length,
            literalsLen = ignoresLen + literals.length,
            termsLen    = literalsLen + terminals.length,

            ignoresTests = new Array( ignoresLen ),
            literalsData = new Array( literalsLen ),
            literalsType = new Array( literalsLen ),
            termTests    = new Array( termsLen ),

            symbolIDToTerms = this.compiled.idToTerms,

            postMatches = new Array( termsLen ),

            termTests   = new Array( termsLen ),
            termIDs     = new Array( termsLen ),
            multipleIgnores = ( ignores.length > 1 ),

            /**
             * An invalid index in the string, used to denote
             * no error.
             *
             * @const
             * @private
             */
            NO_ERROR = -1,
            errorStart = NO_ERROR,
            errors = [];

        /*
         * Move the test, id and returnMathFlag so they are on
         * their own.
         *
         * Tests get stored in a conventional array.
         *
         * ID is stored in a type array (if available), and
         * the return flag is stored by shifting the id 16
         * places to the left when it is set.
         */
        for ( var i = 0; i < allTerms.length; i++ ) {
            var term = allTerms[i],
                test = term.testData,
                id   = term.id;

            if ( i < ignoresLen ) {
                ignoresTests[i] = test;
            } else if ( i < literalsLen ) {
                literalsData[i] = term.testData;
                literalsType[i] = term.type;
            } else {
                termTests[i] = test;
            }

            postMatches[i] = term.postMatch;
            termIDs[i] = id;
        }

        if ( terminals.length === 0 ) {
            throw new Error("No terminals provided");
        } else {
            var i = 0;

            scan:
            while ( i < len ) {
                var code = src.charCodeAt( i );

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
                var r;

                /*
                 * Test the 'ignores', i.e. whitespace.
                 */
                
                while ( j < ignoresLen ) {
                    r = ignoresTests[j]( src, i, code, len );

                    if ( r !== undefined && r !== false && r > i ) {
                        code = src.charCodeAt( r );

                        var postMatchEvent = postMatches[j];
                        if ( postMatchEvent !== null ) {
                            var r2 = postMatchEvent( src, r, code, len );

                            if ( r2 !== undefined && r2 > r ) {
                                i = r2;
                                code = src.charCodeAt( r2 );
                            } else {
                                i = r;
                            }
                        } else {
                            i = r;
                        }

                        if ( multipleIgnores ) {
                            j = 0;
                        }
                    } else {
                        j++;
                    }
                }

                /*
                 * Test 'literals', i.e. keywords like 'if'
                 */

                r = 0;
                scan_literals:
                while ( j < literalsLen ) {
                    var type  = literalsType[j],
                        match = literalsData[j];

                    /*
                     * A string,
                     * but it is actually an array of code characters.
                     */
                    if ( type === TYPE_STRING ) {
                        var testLen = match.length;

                        for ( var testI = 0; testI < testLen; testI++ ) {
                            if ( src.charCodeAt(i+testI) !== match[testI] ) {
                                j++;
                                continue scan_literals;
                            }
                        }

                        if ( ! isWordCharAt(src, i+testI) ) {
                            r = i+testI;
                        } else {
                            j++;
                            continue scan_literals;
                        }

                    /*
                     * Non-alphanumeric codes, such as '+'.
                     */
                    } else if ( type === TYPE_CODE ) {
                        if ( code === match ) {
                            r = i+1;
                        } else {
                            j++;
                            continue scan_literals;
                        }
                        
                    /*
                     * Single alpha-numeric codes, such as 'a' or 'b'.
                     *
                     * I expect it is unpopular, which is why it is last.
                     */
                    } else if ( type === TYPE_WORD_CODE ) {
                        if ( code === match && !isWordCode(src.charCodeAt(i+1)) ) {
                            r = i+1;
                        } else {
                            j++;
                            continue scan_literals;
                        }
                    } 

                    if ( r > i ) {
                        symbolIDs[symbolI] = termIDs[j];
                        symbols[ symbolI++ ] = new Symbol( allTerms[j], i, null );

                        // If we were in error mode,
                        // report the error section.
                        //
                        // This is from the last terminal,
                        // to this one, but ignores whitespace.
                        if ( errorStart !== NO_ERROR ) {
                            errors.push( new SymbolError(
                                    errorStart,
                                    inputSrc.substring( errorStart, i )
                            ) );

                            errorStart = NO_ERROR;
                        }

                        var postMatchEvent = postMatches[j];
                        if ( postMatchEvent !== null ) {
                            code = src.charCodeAt( r );

                            var r2 = postMatchEvent( src, r, code, len );

                            if ( r2 !== undefined && r2 > r ) {
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

                /*
                 * Test 'non-literals', i.e. variable.
                 */

                while ( j < termsLen ) {
                    r = termTests[j]( src, i, code, len );

                    if ( r !== undefined && r !== false && r > i ) {
                        symbolIDs[symbolI] = termIDs[j];

                        symbols[ symbolI++ ] = new Symbol(
                                allTerms[j],
                                i,
                                inputSrc.substring( i, r )
                        );

                        // If we were in error mode,
                        // report the error section.
                        //
                        // This is from the last terminal,
                        // to this one, but ignores whitespace.
                        if ( errorStart !== NO_ERROR ) {
                            errors.push( new SymbolError(
                                    errorStart,
                                    inputSrc.substring( errorStart, i )
                            ) );

                            errorStart = NO_ERROR;
                        }

                        var postMatchEvent = postMatches[j];
                        if ( postMatchEvent !== null ) {
                            code = src.charCodeAt( r );

                            var r2 = postMatchEvent( src, r, code, len );

                            if ( r2 !== undefined && r2 > r ) {
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

                /*
                 * Deal with failure.
                 */

                errorStart = i;
                i++;
            }

            if ( errorStart !== NO_ERROR && errorStart < len ) {
                errors.push( new SymbolError(
                        errorStart,
                        inputSrc.substring( errorStart, i )
                ) );
            }

            return new SymbolResult(
                    errors,

                    symbols,
                    symbolIDs,

                    symbolI
            );
        }
    };

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
    var ParseFactory = function() {
        /**
         * Both a constructor for creating new Parse's,
         * but also a callable object for building ParserRules.
         *
         * @param a The first parameter, optional (that's about as specific as it gets for a one liner).
         * @return A new Parse instance if used as a constructor, otherwise a ParserRule.
         */
        var Parse = function( a ) {
            /*
             * Detect if this is being called as a constructor.
             *
             * The first condition checks if the setup process has been
             * completed, which it hasn't, if this.hasConstructor is false.
             *
             * The second ensures that 'this' instance is a Parse object, which
             * is true if this is being used as a constructor.
             *
             * Don't worry if your brain hurts, mine does too.
             */
            if (
                    this &&
                    this.hasConstructed !== true &&
                    this instanceof Parse
            ) {
                return ParseFactory();
            } else {
                if ( arguments.length === 0 ) {
                    return new ParserRule( Parse );
                } else {
                    var rule = new ParserRule( Parse );

                    for ( var i = 0; i < arguments.length; i++ ) {
                        rule.thenAll( arguments[i] );
                    }

                    return rule;
                }
            }
        };

        /**
         * A counting id used for easily and uniquely
         * identifying terminals.
         *
         * It's used over a hash code so we can place the
         * terminals inside of an array later.
         *
         * @type {number}
         */
        Parse.terminalID = INVALID_TERMINAL+1;

        /**
         * This is a flag to state that this instance of Parse
         * has been built.
         *
         * The issue is that I don't know if the constructor
         * is called as a constructor or not with the 'this
         * instanceof Parse' check.
         *
         * Calls such as: Parse.call( parseObj ) would return
         * true, since it's called in the context of a Parse
         * object.
         *
         * However as this flag is only set to true _after_
         * the constructor has completed, I know that if it's
         * true in the constructor, then the constructor is
         * bogus.
         *
         * @type {boolean}
         */
        Parse.hasConstructed = true;

        /**
         * An array of Terminals to ignore.
         *
         * These are tested before the main terminals.
         */
        Parse.ignores = [];

        /**
         * @return {number} The number of terminals created with this Parse.
         */
        Parse.getNumTerminals = function() {
            return this.terminalID;
        };

        Parse['or'] = function() {
            return this.call( this ).orAll( arguments );
        };

        Parse['either'] =
                Parse['or'];

        Parse['then'] = function() {
            return this.apply( this, arguments );
        };

        Parse['a'] =
                Parse['then'];

        Parse['optional'] = function() {
            return this.call( this ).optionalAll( arguments );
        };

        Parse['maybe'] =
                Parse['optional'];

        /**
         * Sets to always ignore the terminal given.
         *
         * For example to always ignore spaces:
         *  parse.ignore( ' ' )
         * 
         * You can also just use one of the provided terminals,
         * for example:
         * 
         *  Parse.ignore( Parse.WHITESPACE );
         * 
         * Multiple parameters can also be provided, for example:
         * 
         *  Parse.ignore( ' ', '\n', ';', '\t', '\r' );
         * 
         * @param terminal The terminal to always be ignoring.
         * @return This Parse object, for method chaining.
         */
        Parse['ignore'] = function() {
            for ( var i = 0; i < arguments.length; i++ ) {
                Parse.ignoreSingle( arguments[i] );
            }

            return this;
        };

        Parse.ignoreSingle = function( terminal ) {
            if ( terminal instanceof String || isFunction(terminal) ) {
                Parse.ignoreSingle( Parse['terminal'](terminal) );
            } else if ( terminal instanceof Terminal ) {
                Parse.ingoreInner( terminal );
            } else if ( terminal instanceof Array ) {
                for ( var i = 0; i < terminal.length; i++ ) {
                    Parse.ignoreSingle( Parse.terminalsInner(terminal[i], null) );
                }
            } else if ( terminal instanceof Object ) {
                for ( var k in terminal ) {
                    if ( terminal.hasOwnProperty(k) ) {
                        Parse.ignoreSingle( Parse.terminalsInner(terminal[k], k) );
                    }
                }
            } else {
                throw new Error("unknown ignore terminal given");
            }
        };

        /**
         * @return A list of all ignores set to be used.
         */
        Parse.getIgnores = function() {
            return this.ignores;
        };

        Parse.ingoreInner = function( t ) {
            this.ignores.push( t );
        };

        /**
         * If an object that contains matches is given, then
         * each one is turned into a terminal, and a new
         * object containing them is returned.
         *
         * Otherwise if the item is an array, or one match,
         * this is turned into a terminal, and returned.
         *
         * This also works recursively, so arrays of arrays of
         * matches is turned into terminals.
         */
        Parse['terminals'] = function( obj ) {
            return Parse.terminalsInner( obj, null );
        };

        Parse.terminalsInner = function( obj, termName ) {
            if ( obj instanceof Object && !isFunction(obj) && !(obj instanceof Array) ) {
                var terminals = {};

                for ( var name in obj ) {
                    if ( obj.hasOwnProperty(name) ) {
                        terminals[name] = Parse.terminalsInner( obj[name], name );
                    }
                }

                return terminals;
            } else if ( termName !== null ) {
                return Parse['terminal']( obj )['name']( formatTerminalName(termName) );
            } else {
                return Parse['terminal']( obj );
            }
        }

        /**
         * Turns the given item into a single terminal.
         */
        Parse['terminal'] = function( match ) {
            if ( match instanceof Terminal ) {
                return match;
            } else {
                return new Terminal( match ).setID( this.terminalID++ );
            }
        };

        Parse['a'] = function() {
            return Parse.apply( null, arguments );
        };

        /**
         * Used for creating a special ParserRule, which cannot be altered,
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
        Parse['repeatSeperator'] = function( match, seperator ) {
            return new ParserRule( this )['repeatSeperator']( match, seperator );
        };

        Parse['optionalSeperator'] = function( match, seperator ) {
            return new ParserRule( this )['optionalSeperator']( match, seperator );
        };

        /**
         * A special, one-off ParserRule. This will run the statements given
         * repeatedly, until none of them match.
         *
         * This allows certain recursive rules to be built trivially.
         *
         * It's onMatch is called multiple times, allowing you to build up
         */
        Parse['repeatEither'] = function() {
            var rule = new ParserRule( this );

            rule.cyclicOr( arguments );

            return rule;
        };

        /**
         * Code checking utility functions.
         * 
         * Each of these functions must be given the 'charCodeAt' value,
         * from a string, to check. Hence why they are listed under 'code'.
         */
        Parse['code'] = {
                'isNumeric'         : isNumericCode,
                'isHex'             : isHexCode,
                'isAlpha'           : isAlphaCode,
                'isAlphaNumeric'    : isAlphaNumericCode
        };

        /*
         * These are the terminals provided by Parse,
         * which people can use to quickly build a language.
         */

        /**
         * A terminal for capturing tabs and spaces. It does _not_ include
         * end of lines.
         * 
         * For the end of line version, use Parse.WHITESPACE_AND_END_OF_LINE
         */
        Parse['terminal']['WHITESPACE'] = function(src, i, code, len) {
            while ( code === SPACE || code === TAB ) {
                i++;
                code = src.charCodeAt( i );
            }

            return i;
        };

        /**
         * A terminal that matches: tabs, spaces, \n and \r characters.
         */
        Parse['terminal']['WHITESPACE_AND_END_OF_LINE'] = function(src, i, code, len) {
            while ( code === SPACE || code === TAB || code === SLASH_N || code === SLASH_R ) {
                i++;
                code = src.charCodeAt( i );
            }

            return i;
        };
        
        /**
         * A number terminal.
         */
        Parse['terminal']['NUMBER'] = function(src, i, code, len) {
            if ( code < ZERO || code > NINE ) {
                return;
            // 0x hex number
            } else if (
                    code === ZERO &&
                    src.charCodeAt(i+1) === LOWER_X
            ) {
                i += 1;

                do {
                    i++;
                    code = src.charCodeAt( i );
                } while (
                        code === UNDERSCORE ||
                        isHexCode( code )
                )
            // normal number
            } else {
                do {
                    i++;
                    code = src.charCodeAt( i );
                } while (
                        code === UNDERSCORE ||
                        ( code >= ZERO && code <= NINE )
                )

                // Look for Decimal Number
                if (
                        src.charCodeAt(i+1) === FULL_STOP &&
                        isNumericCode( src.charCodeAt(i+2) )
                ) {
                    var code;
                    i += 2;

                    do {
                        i++;
                        code = src.charCodeAt(i);
                    } while (
                            code === UNDERSCORE ||
                            ( code >= ZERO && code <= NINE )
                    )
                }
            }

            return i;
        };

        /**
         * A C-style single line comment terminal.
         * 
         * Matches everything from a // onwards.
         */
        Parse['terminal']['C_SINGLE_LINE_COMMENT'] = function(src, i, code, len) {
            if ( code === SLASH && src.charCodeAt(i+1) === SLASH ) {
                i++;

                do {
                    i++;
                    code = src.charCodeAt(i);
                } while (
                        i  <  len  &&
                        code !== SEMI_COLON &&
                        code !== SLASH_N
                );

                return i;
            }
        };

        /**
         * A C-like multi line comment, matches everything from '/ *' to a '* /', (without the spaces).
         */
        Parse['terminal']['C_MULTI_LINE_COMMENT'] = function(src, i, code, len) {
            if ( code === SLASH && src.charCodeAt(i+1) === STAR ) {
                // this is so we end up skipping two characters,
                // the / and the *, before we hit the next char to check
                i++;

                do {
                    i++;

                    // error!
                    if ( i >= len ) {
                        return;
                    }
                } while ( ! (
                        src.charCodeAt(i  ) === STAR &&
                        src.charCodeAt(i+1) === SLASH
                ) );

                // plus 2 to include the end of the comment
                return i+2;
            }
        };

        /**
         * A terminal for a string, double or single quoted.
         */
        Parse['terminal']['STRING'] = function(src, i, code, len) {
            // double quote string
            if ( code === DOUBLE_QUOTE ) {
                do {
                    i++;

                    // error!
                    if ( i >= len ) {
                        return;
                    }
                } while ( ! (
                        src.charCodeAt(i  ) === DOUBLE_QUOTE &&
                        src.charCodeAt(i-1) !== BACKSLASH
                ) )

                return i;
            // single quote string
            } else if ( code === SINGLE_QUOTE ) {
                do {
                    i++;

                    // error!
                    if ( i >= len ) {
                        return;
                    }
                } while ( ! (
                        src.charCodeAt(i  ) === SINGLE_QUOTE &&
                        src.charCodeAt(i-1) !== BACKSLASH
                ) )

                return i;
            }
        };

        Object.preventExtensions( Parse );

        return Parse;
    };

    return ParseFactory();
} )(window);
