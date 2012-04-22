"use strict";

/**
 * @license Quby Compiler
 * Copyright 2010 - 2011 Joseph Lenton
 * Author Joseph Lenton - Joe@PlayMyCode.com
 * 
 * Redistribution or commercial use is prohibited without the author's permission.
 * 
 * IMPORTANT-READ CAREFULLY: This End-User License Agreement ("EULA") is a legal agreement
 * between you (either an individual or a single entity) and Joseph Lenton for the
 * software that accompanies this EULA. For this license that software is known as 'Quby',
 * the license holder is known as 'author' and the user of this license is known as 'user'.
 * 
 * An amendment or addendum to this EULA may accompany the software.
 * YOU AGREE TO BE BOUND BY THE TERMS OF THIS EULA BY INSTALLING, COPYING, OR OTHERWISE USING
 * THE SOFTWARE. IF YOU DO NOT AGREE, DO NOT INSTALL, COPY, OR USE THE SOFTWARE.
 * 
 * The following you are granted to do by the author:
 * 
 * 1) Use Quby with PlayMyCode.com in the way that the PlayMyCode.com website distributes and uses Quby.
 * 2) Download and store Quby for caching purposes.
 * 
 * No other rights are granted to you. You are forbidden from:
 * 
 * 1) Alter the Quby software.
 * 2) Redistributing Quby software. This includes redistributing both in full or partially.
 * 3) Using Quby within another website, service or software.
 * 4) Using the Quby software anywhere other directly from PlayMyCode.com.
 * 
 * The above restrictions may be circumvented if given prior consent by the author.
 * 
 * The user may not use Quby for anything deemed illegal in either the author or users home
 * countries.
 * 
 * If any part of this license is deemed unenforcible, the rest still applies.
 * 
 * Quby is distributed as is and the user accepts that no support is provided.
 * No warranty is given and the author accepts no responsibility for any issues arising
 * from the use of the Quby software. The author is not responsible for any illegal actions
 * that arise from the use of this software. 
 */

var quby = {};
"use static";

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
 * by Joseph Lenton, joe@studiofortress.com
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
                if ( m0 === code && isWordCharAt(src, i+1) ) {
                    return i+1;
                }
            };
        } else if ( match.length === 2 ) {
            return function(src, i, code, len) {
                if (
                        m0 === code &&
                        m1 === src.charCodeAt(i+1) &&
                        isWordCharAt(src, i+2)
                ) {
                    return i + 2;
                }
            };
        } else if ( match.length === 3 ) {
            return function(src, i, code, len) {
                if ( m0 === code &&
                        m1 === src.charCodeAt(i+1) &&
                        m2 === src.charCodeAt(i+2) &&
                        isWordCharAt(src, i+3)
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
                        isWordCharAt(src, i+4)
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
                        isWordCharAt(src, i+5)
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
                        isWordCharAt(src, i+6)
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
                        isWordCharAt(src, i+7)
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
                        isWordCharAt(src, i+8)
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
        this.match = match;

        this.onMatchFun = null;

        /**
         * When true, this will return the actual text that
         * was matched, as a substring.
         *
         * It's set to false by default, to avoid lots of
         * non-needed substrings.
         *
         * @type {boolean}
         */
        this.symbolMatchText = null;

        if ( match instanceof Terminal ) {
            return match;
        } else if ( isFunction(match) ) {
            this.test = match;
        } else {
            this.symbolMatchText = match;

            // a code character
            if ( typeof match === 'number' ) {
                if ( isWordCode(match) ) {
                    this.test = function(src, i, code, len) {
                        if ( code === match && !isWordCode(src.charCodeAt(i+1)) ) {
                            return i+1;
                        }
                    };
                } else {
                    this.test = function(src, i, code, len) {
                        if ( code === match ) {
                            return i+1;
                        }
                    };
                }
            // string primative or string object
            } else if ( typeof match === 'string' || match instanceof String ) {
                if ( match.length === 0 ) {
                    throw new Error( "Empty string given for Terminal" );
                } else if ( match.length === 1 && !isWordCharAt(match, 0) ) {
                    this.test = newCharacterMatch( match );
                } else {
                    this.test = newWordMatch( match );
                }
            } else if ( match instanceof Array ) {
                var mTerminals = [];

                for ( var i = 0; i < match.length; i++ ) {
                    mTerminals[i] = new Terminal( match[i] );
                }

                this.test = function(src, i, code, len) {
                    for (
                            var i = 0, len = match.length;
                            i < len;
                            i++
                    ) {
                        var r = mTerminals[i].test( src, i, code, len );

                        if ( r !== undefined ) {
                            if ( r === true ) {
                                return i+1;
                            } else if ( r > i ) {
                                return i;
                            }
                        }
                    }
                };
            } else {
                throw new Error( "Don't know what to do with given match when building a terminal" );
            }
        }
    };

    Terminal.prototype.getSymbolText = function() {
        return this.symbolMatchText;
    };

    Terminal.prototype.setID = function( id ) {
        this.id = id;

        return this;
    };

    Terminal.prototype.returnMatchFlag = function() {
        return ( this.symbolMatchText === null );
    };

    Terminal.prototype.test = function(src, i, code, len) {
        throw new Error( "Terminal created with no 'test' function set. This is an bug, or you are doing something funky with the library." );
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

     var TerminalError = function( i, symbol, match ) {
         this['isTerminal'] = true;

         this['offset'] = i;
         this['symbol'] = symbol;
         this['match']  = match;
     };

     /**
      * A wrapper for holding the Symbol result information.
      *
      * It's essentially a struct like object.
      */
     var Symbol = function( symbol, offset, str ) {
         this['symbol'] = symbol;
         this['offset'] = offset;
         this['match']  = str   ;
     };

     /**
      * Converts this to what it should be for the 'onMatch' callbacks.
      *
      * If there is no callback set on the inner symbol, then this is returned.
      * If there is a callback, then it is run, and the result is returned.
      */
     Symbol.prototype.onFinish = function() {
         var onMatch = this.symbol.onMatchFun;

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
    };

    SymbolResult.prototype.index = function() {
        return this.symbolIndex;
    };

    SymbolResult.prototype.idIndex = function() {
        return this.i;
    };

    SymbolResult.prototype.peekID = function() {
        if ( this.i >= this.length ) {
            throw new Error("Peeking at symbol, when all have been taken.");
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
        var newTerms = [];

        for ( var k in terminals ) {
            var term = terminals[k];

            termIDToTerms[ term.id ] = term;

            newTerms.push( term );
        }

        return {
                terminals   : newTerms,
                idToTerms   : termIDToTerms
        };
    };

    /**
     * Used when searching for terminals to use for parsing,
     * during the compilation phase.
     */
    var addRule = function( rule, terminals ) {
        if ( rule instanceof Terminal ) {
            var termID = rule.id;

            if ( termID !== INVALID_TERMINAL ) {
                terminals[ termID ] = rule;
            }
        } else {
            rule.grabTerminals( terminals );
        }
    };

    /**
     *
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
         *
         * @type
         */
        this.compiled = null;

        /**
         * The global parse instance this is working with.
         *
         * @const
         */
        this.parse = parse;

        /**
         * The parser rules, includes terminals.
         *
         * @const
         */
        this.rules = [];

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
        this.isRecursive = false;
    };

    ParserRule.prototype.errorIfEnded = function() {
        if ( this.compiled !== null ) {
            throw new Error("New rule added, but 'finally' has already been called");
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
    ParserRule.prototype['thenEither'] =
    ParserRule.prototype['either'] =
            ParserRule.prototype['or'];

    /**
     * Same as 'either', except all values given are optional.
     * With this having no-match is acceptable.
     *
     * @return This ParserRule instance.
     */
    ParserRule.prototype['maybe'] = function() {
        // todo
        return this;
    };

    ParserRule.prototype['thenMaybe'] = ParserRule.prototype['maybe'];

    ParserRule.prototype['thisOr'] = function() {
        this.errorIfEnded();

        for ( var i = 0; i < arguments.length; i++ ) {
            this.orSingle( arguments[i] );
        }

        this.orThisFlag = true;

        return this;
    };

    ParserRule.prototype.endCurrentOr = function() {
        if ( this.orThisFlag ) {
            if ( this.currentOr === null ) {
                throw new Error("infinite recursive parse rule, this given as 'or/either' condition, with no alternatives.");
            } else {
                this.currentOr.push( this );
            }

            this.orThisFlag = false;
        }

        if ( this.currentOr !== null ) {
            this.rules.push( this.currentOr );
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
            throw new Error( "None object given: " + obj );
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
            this[singleMethod]( this.parse['terminal']( obj ) );
        // arguments or array
        } else if ( typeof (obj.length) === 'number' ) {
            for ( var i = 0; i < obj.length; i++ ) {
                this.helperAll( singleMethod, obj[i] );
            }
        // ??? maybe an object of terminals?
        } else {
            for ( var k in obj ) {
                this.helperAll( singleMethod, obj[k] );
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
        if ( rule === this ) {
            throw new Error( "infinite recursive parse rule, 'this' given as 'then' parse rule." );
        } else {
            this.rules.push( rule );
        }
    };

    ParserRule.prototype['onMatch'] = function( callback ) {
        this.errorIfEnded();
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
            this.compiled = this.optimize();
        }

        return this;
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
        var numTerms = this.parse.getNumTerminals();

        var lookupMap = new Array( numTerms ),
            terminals = new Array( numTerms );

        this.grabTerminals( terminals, lookupMap, true );

        return compressTerminals( terminals, lookupMap );
    };

    /**
     * Converts the rules stored in this parser into a trie
     * of rules.
     */
    ParserRule.prototype.grabTerminals = function(terminals, lookupMap, isLeft) {
        if ( ! this.isRecursive ) {
            this.isRecursive = true;

            for ( var i = 0; i < this.rules.length; i++ ) {
                var rule = this.rules[i];

                isLeft = isLeft && ( i === 0 );

                // an 'or' rule
                if ( rule instanceof Array ) {
                    for ( var j = 0; j < rule.length; j++ ) {
                        addRule( rule[j], terminals, lookupMap, isLeft );
                    }
                // an 'then' rule
                } else {
                    addRule( rule, terminals, lookupMap, isLeft );
                }
            }

            this.isRecursive = false;
        }
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
    ParserRule.prototype['parseLowerCase'] = function( input, callback, onError ) {
        this.parseInner( input, input.toLowerCase(), callback, onError );
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
    ParserRule.prototype['parseUpperCase'] = function( input, callback, onError ) {
        this.parseInner( input, input.toUpperCase(), callback, onError );
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
     * @param {string} input The text to parse.
     * @param callback A function to call when parsing is complete.
     */
    ParserRule.prototype['parse'] = function( input, callback, onError ) {
        this.parseInner( input, input, callback, onError );
    };

    /**
     * Does the actual high level organisation or parsing the
     * source code.
     *
     * Callbacks are used internally, so it gets spread across
     * multiple JS executions.
     */
    ParserRule.prototype.parseInner = function( input, parseInput, callback ) {
        if ( ! isFunction(callback) ) {
            throw new Error("No callback provided for parsing");
        }

        this.endCurrentOr();
        this['compile']();

        var _this = this;

        setTimeout( function() {
            var symbols   = _this.parseSymbols( input, parseInput );

            if ( symbols.hasErrors() ) {
                callback( [], symbols.getErrors() );
            } else {
                setTimeout( function() {
                    var result = _this.parseRules( symbols, input, parseInput );
                    callback( result.results, result.errors );
                }, 1 );
            }
        }, 1 );
    };

    ParserRule.prototype.parseRules = function( symbols, inputSrc, src ) {
        /*
         * Iterate through all symbols found, then going
         * through the grammar rules in order.
         * We jump straight to grammar rules using the
         * 'termsToRules' lookup.
         */

        var errors = [],
            results = [];
        var hasError = null;

		while ( symbols.hasMore() ) {
			var symID = symbols.peekID(),
                onFinish = this.test(symbols, inputSrc);

            if ( onFinish !== null ) {
                /*
                 * We parse errors for as long as possible,
                 * and so only report when re have gone back
                 * to success.
                 *
                 * This way if we have 4 error symbols in a
                 * row, only the first gives an error.
                 */
                if ( hasError ) {
                    errors.push( hasError );
                }

                symbols.finalizeMove();

                results.push( onFinish() );
			} else {
                var next = symbols.skip();

                if ( hasError === null ) {
                    hasError = next;
                }
			}
		}

        if ( hasError ) {
            errors.push( new TerminalError(hasError.offset, hasError.symbol, hasError.match) );
        }

        return {
                results: results,
                errors: errors
        }
    };

    ParserRule.prototype.test = function( symbols, inputSrc) {
		if ( this.isRecursive ) {
			return null;
		} else {
			// ensure we don't end up entering this same rule,
			// again and again,
            // forever.
			this.isRecursive = true;

            var rules = this.rules,
                args = [];

			for (
					var i = 0, len = rules.length;
					i < len;
					i++
			) {
                var rule = rules[i],
                    startSymbolI = symbols.idIndex(),
                    isSuccess = false;

				// 'or' rules
				if ( rule instanceof Array ) {
                    var ruleLen = rule.length;

                    for ( var j = 0; j < ruleLen; j++ ) {
                        var r = rule[j],
                            innerSuccess = false,
                            onFinish;

                        if ( r instanceof ParserRule ) {
                            onFinish = r.test(symbols, inputSrc);

                            innerSuccess = ( onFinish !== null );
                        } else if ( r.id === symbols.peekID() ) {
                            onFinish = symbols.next();
                            innerSuccess = true;
                        }

                        if ( innerSuccess ) {
                            isSuccess = true;
                            args.push( onFinish );

                            break;
                        }
                    }
				// 'then' rules
				} else if ( rule instanceof ParserRule ) {
                    var onFinish = rule.test(symbols, inputSrc);

                    if ( onFinish !== null ) {
                        isSuccess = true;
                        args.push( onFinish );
                    }
				// terminal rule
				} else {
                    if ( symbols.peekID() === rule.id ) {
                        args.push( symbols.next() );

                        isSuccess = true;
                    }
				}

				// it is only the first iteration where recursiveness is not allowed,
				// so we always turn it off
				this.isRecursive = false;

                if ( ! isSuccess ) {
                    symbols.back( symbols.idIndex()-startSymbolI );

                    return null;
                }
			}

            var finallyFun = this.finallyFun;
            return function() {
                // evaluate all args, bottom up
                for ( var i = 0; i < args.length; i++ ) {
                    var arg = args[i];

                    if ( isFunction(arg) ) {
                        args[i] = arg();
                    } else if ( arg instanceof Symbol ) {
                        args[i] = arg.onFinish();
                    }
                }

                return finallyFun.apply( null, args );
            };
		}
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
    ParserRule.prototype.parseSymbols = function( inputSrc, src ) {
        var useIntArray = !! window.Uint32Array;

        // initialized to a default size, which is hopefully 'big enough' for most text
        // if not, it is resized during parsing.
        var symbolSize = 64000,
            symbolI = 0;

        var len  = src.length,
            code = src.charCodeAt(0),

            symbols     = new Array(symbolSize),
            symbolIDs   = useIntArray ? new window.Uint32Array(symbolSize) : new Array(symbolSize),

            ignores     = this.parse.getIgnores(),
            terminals   = this.compiled.terminals,

            symbolIDToTerms = this.compiled.idToTerms,

            allTerms    = ignores.concat( terminals ),
            allLen      = allTerms.length,

            termTests   = [],
            termIDs     = (useIntArray ? new window.Uint32Array( allLen ) : []),
            termsOffset = ignores.length,

            /*
             * An invalid index in the string, used to denote
             * no error.
             */
            NO_ERROR = -1,
            errorStart = NO_ERROR,

            errorDuringRun = false,
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
        for ( var i = 0; i < allLen; i++ ) {
            var term = allTerms[i];

            termTests.push( term.test );

            var id = term.id;
            if ( term.returnMatchFlag() ) {
                id <<= 16;
            }

            termIDs[i] = id;
        }

        if ( terminals.length === 0 ) {
            throw new Error("No terminals provided");
        } else {
            var i = 0;

            while ( i < len ) {
                var j = 0;

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

                while ( j < allLen ) {
                    var r = termTests[j]( src, i, code, len );

                    if ( r !== undefined && r !== false && r > i ) {
                        if ( j >= termsOffset ) {
                            // increase size by 33%, if we need to
                            if ( useIntArray && symbolI === symbolSize ) {
                                symbolSize = ((symbolSize*4)/3) >> 0;

                                var temp = new window.Uint32Array( symbolSize );
                                temp.set( symbolIDs, 0 );
                                symbolIDs = temp;
                            }

                            var id = termIDs[j],
                                str;
                            if ( (id & 0xFFFF0000) !== 0) {
                                symbolIDs[symbolI] = id >> 16;
                                str = inputSrc.substring( i, r );
                            } else {
                                symbolIDs[symbolI] = id;
                                str = null;
                            }

                            symbols[ symbolI++ ] = new Symbol( allTerms[j], i, str );

                            // If we were in error mode,
                            // report the error section.
                            //
                            // This is from the last terminal,
                            // to this one, but ignores whitespace.
                            if ( errorDuringRun ) {
                                errors.push( new SymbolError(
                                        errorStart,
                                        inputSrc.substring( errorStart, i )
                                ) );

                                errorDuringRun = false;
                            }
                        }

                        // go back to the beginning of the terminals
                        j = 0;

                        // update these for the next bout of iteration
                        i = r;
                        code = src.charCodeAt( i );
                    } else {
                        j++;
                    }
                }

                errorStart = i;

                i++;
                code = src.charCodeAt( i );
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
                if ( a === undefined ) {
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
            var rule = this.call( this );

            rule['or'].apply( rule, arguments );

            return rule;
        };

        Parse['either'] = Parse['or'];

        Parse['then'] = function() {
            return this.apply( this, arguments );
        };

        Parse['a'] = Parse['then'];

        /**
         * Sets to always ignore the terminal given.
         *
         * For example to always ignore spaces:
         *  parse.alwaysIngore( parse.terminal(' ') )
         *
         * @param terminal The terminal to always be ignoring.
         * @return This Parse object, for method chaining.
         */
        Parse['ignore'] = function( terminal ) {
            if ( terminal instanceof String || terminal instanceof RegExp ) {
                Parse['ignore']( Parse['terminal'](terminal) );
            } else if ( terminal instanceof Terminal ) {
                Parse.ingoreInner( terminal );
            } else {
                for ( var k in terminal ) {
                    Parse['ignore']( Parse['terminals'](terminal[k]) );
                }
            }

            return this;
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
            if ( obj instanceof Object && !isFunction(obj) && !(obj instanceof Array) ) {
                var terminals = {};

                for ( var name in obj ) {
                    terminals[name] = Parse['terminals']( obj[name] );
                }

                return terminals;
            } else {
                return Parse['terminal']( obj );
            }
        };

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

        return Parse;
    };

    return ParseFactory();
} )(window);"use static";

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
                var f = fs[i];
                util.future.ensureFun( f );

                if ( util.future.isRunning ) {
                    util.future.funs.unshift( f );
                } else {
                    util.future.funs.push( f );
                }
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
                var fun = util.future.funs.shift();

                util.future.once(
                        function() {
                            fun();
                            util.future.next();
                        }
                );
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
})( util );(function( quby, util ) {
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
})( quby, util );(function( quby, util ) {
    /**
    * Lexer
    * 
    * Functions and objects related to the lexical analysis section
    * of the parser are defined here.
    */
    quby.lexer = {
        EmptyIdSym: function( offset, value ) {
            quby.lexer.EmptySym.call( this, offset, value );
            this.lower = value.toLowerCase();
            return this;
        },
        
        IdSym: function( offset, value ) {
            quby.lexer.Sym.call( this, offset, value );
            this.lower = value.toLowerCase();
            return this;
        },
        
        Sym: function (offset, value) {
            quby.lexer.EmptySym.call( this,
                    new quby.main.LineInfo(offset, quby.main.currentParser().source),
                    value
            );
            return this;
        },
        
        EmptySym: function (offset, value) {
            this.offset = offset;
            this.value = value;
            return this;
        }
    };
})( quby, util );(function( quby, util ) {
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
    quby.main = {
        UNKNOWN_SYNTAX_PREFIX: "Incorrect syntax around",
        UNKNOWN_SYNTAX_ERROR : "Incorrect syntax encountered.",

        parserStack: [],

        /**
        * Main parser engine running code.
        */
        currentParser: function () {
            return quby.main.parserStack[quby.main.parserStack.length - 1];
        },

        /**
        *
        */
        parse: function (source, adminMode, callback) {
            var factory = new quby.main.Parser();
            factory.parse(source, adminMode, function() {
                factory.finish(callback);
            });
        },

        /**
        * This is for using multiple parsers together, for parsing multiple files.
        */
        Parser: function () {
            this.validator = new quby.main.Validator();

            this.parse = function( source, adminMode, callback ) {
                this.validator.isAdminMode = adminMode;
                var _this  = this,
                    parser = new quby.main.ParserInner( source );

                util.future.run(
                        function() {
                            quby.main.parserStack.push( parser );
                            
                            parser.run(
                                    function() {
                                        parser.validate( _this.validator );
                                        quby.main.parserStack.pop();

                                        if ( callback != undefined ) {
                                            util.future.runFun( callback );
                                        }
                                    }
                            );
                        }
                );
            };

            this.parseSources = function (sources, adminMode, callback) {
                var _this = this;
                util.future.map( sources, function(source) {
                    _this.parse(source, adminMode);
                } );

                if ( callback != undefined ) {
                    util.future.runFun( callback );
                }
            };

            this.parseFiles = function (urls, adminMode, callback) {
                var _this = this;
                util.future.map( urls, function(url) {
                    _this.parseFile( url, adminMode );
                } );

                if ( callback != undefined ) {
                    util.future.runFun( callback );
                }
            };

            this.parseFile = function (url, adminMode) {
                var xmlhttp = new XMLHttpRequest();
                xmlhttp.open( "GET", url, false );
                xmlhttp.send();

                var source = xmlhttp.responseText;

                this.parse( source, adminMode );
            };

            this.finish = function ( callback ) {
                var _this = this;
                util.future.run(
                        function() {
                            var output = _this.validator.finaliseProgram();
                            var result = new quby.main.Result(
                                    output, _this.validator.getErrors()
                            );

                            util.future.runFun( function() {
                                callback( result );
                            } );
                        }
                );
            };
        },

        /**
        * Result
        *
        * Handles creation and the structures for the object you get back from the parser.
        *
        * Essentially anything which crosses from the parser to the caller is stored and
        * handled by the contents of this script.
        */
        Result: function (code, errors) {
            this.program = code;
            this.errors = errors;

            // default error behaviour
            this.onError = function (ex) {
                var errorMessage = ex.name + ': ' + ex.message;
                if (ex.stack) {
                    errorMessage += '\n\n' + ex.stack;
                }

                alert(errorMessage);
            };

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
            this.setOnError = function (fun) {
                this.onError = fun;
            };

            /**
            * @return Returns the Quby application in it's compiled JavaScript form.
            */
            this.getCode = function () {
                return this.program;
            };

            /**
            * @return True if there were errors within the result, otherwise false if there are no errors.
            */
            this.hasErrors = function () {
                return this.errors.length > 0;
            };

            /**
            * This is boiler plate to call quby.runtime.runCode for you using the
            * code stored in this Result object and the onError function set.
            */
            this.run = function () {
                if (!this.hasErrors()) {
                    quby.runtime.runCode(this.getCode(), this.onError);
                }
            };
        },

        /**
         * For creating a new Parser object.
         *
         * @param source The source code to parse.
         */
        ParserInner: function( source ) {
            this.errors = null;
            this.program = null;
            this.source = new quby.main.SourceLines(source);
            this.parseErr = null;

            this.run = function() {
                quby.parser.parse( this.source.getSource(), function(program, errors) {
                    if ( errors.length > 0 ) {
                        this.errors = this.formatErrors( this.source, errors );
                    }

                    this.program = program;
                } );
            };

            /*
             * TODO update this to use the new parser error format.
             */
            /**
             * Turns the given errors into the output string
             * that should be displayed for the user.
             *
             * You can imagine that this is the checkpoint
             * between whatever internal format we use, and
             * what the outside world is going to see.
             *
             * @param src The source code object used for finding the lines.
             * @param errors The errors to parse.
             * @return An array containing the information for each error to display.
             */
            this.formatErrors = function( src, errors ) {
                var errs = [];

                for (var i = 0; i < errors.length; i++) {
                    var error   = errors[i],
                        errLine = src.getLine( error.offset ),
                        strErr;

                    if ( error.isSymbol ) {
                        strErr = "Unknown symbol encountered parsing '" + error.match + "'.";
                    } else if ( error.isTerminal ) {
                        strErr = "Incorrect code found, your code is incorrectly structured";
                    } else {
                        throw new Error("Unknown parse.js error given to format");
                    }

                    errs.push({
                            line: errLine,
                            msg : strErr
                    });
                }

                return errs;
            };

            this.validate = function (validator) {
                var es = this.errors;
                if (es != null) {
                    for (var i = 0; i < es.length; i++) {
                        validator.parseErrorLine(es[i].line, es[i].msg);
                    }
                }

                validator.addProgram(this.program);
            };
        },

        PreParser: function () {
            var toCharCode = function( c ) {
                return c.charCodeAt( 0 );
            }

            var SLASH_CHAR        = toCharCode('/');

            var ESCAPE_SLASH_CHAR = toCharCode('\\');

            var QUOTE_CHAR        = toCharCode("'");
            var DOUBLE_QUOTE_CHAR = toCharCode('"');
            var STAR_CHAR         = toCharCode('*');

            var HASH_CHAR         = toCharCode('#');
            var GREATER_CHAR      = toCharCode('>');
            var LESS_CHAR         = toCharCode('<');

            var END_OF_LINE_CHAR  = toCharCode('\n');

            this.getLeft = function (src, i) {
                if (i > 0) {
                    return src.charCodeAt(i - 1);
                } else {
                    return null;
                }
            };

            this.getRight = function (src, i) {
                return this.getR(src, i + 1);
            }

            this.getR = function (src, i) {
                if (i < src.length) {
                    return src.charCodeAt(i);
                } else {
                    return null;
                }
            };

            this.parse = function (src) {
                var inAdmin         = false;
                var inMultiComment  = false;
                var inSingleComment = false;
                var inDoubleString  = false;
                var inSingleString  = false;

                var subStrIndexes   = [];

                // note that i is incremented within the code as well as within the for.
                for (
                        var i = 0, len = src.length;
                        i < len;
                        i++
                ) {
                    var c = src.charCodeAt(i);

                    // these are in order of precedence
                    if ( inAdmin ) {
                        if (
                                c == HASH_CHAR &&
                                this.getR(src,i+1) == GREATER_CHAR &&
                                this.getR(src,i+2) == HASH_CHAR
                        ) {
                            inAdmin = false;
                            i += 2;
                        }

                    } else if ( inDoubleString ) {
                        if (
                                c == DOUBLE_QUOTE_CHAR &&
                                this.getLeft(src, i) != ESCAPE_SLASH_CHAR
                        ) {
                            inDoubleString = false;
                        }
                    } else if ( inSingleString ) {
                        if (
                                c == QUOTE_CHAR &&
                                this.getLeft(src, i) != ESCAPE_SLASH_CHAR
                        ) {
                            inSingleString = false;
                        }

                    } else if ( inSingleComment ) {
                        if ( c == END_OF_LINE_CHAR ) {
                            subStrIndexes.push( i );
                            inSingleComment = false;
                        }
                    } else if ( inMultiComment ) {
                        if (
                                c == STAR_CHAR &&
                                this.getRight(src, i) == SLASH_CHAR
                        ) {
                            i++;

                            // +1 so we include this character too
                            subStrIndexes.push( i+1 );
                            inMultiComment = false;
                        }

                    // look for stuff to be inside of
                    // look for comments
                    } else if (c == SLASH_CHAR) {
                        var right = this.getRight(src, i);

                        // multi-line comment
                        if (right == STAR_CHAR) {
                            inMultiComment = true;
                            subStrIndexes.push( i );
                            i++;
                        } else if (right == SLASH_CHAR) {
                            inSingleComment = true;
                            subStrIndexes.push( i );
                            i++;
                        }
                    // look for strings
                    } else if (c == DOUBLE_QUOTE_CHAR) {
                        inDoubleString = true;
                    } else if (c == QUOTE_CHAR) {
                        inSingleString = true;
                    } else if (c == HASH_CHAR) {
                        if (
                                this.getR(src,i+1) == LESS_CHAR &&
                                this.getR(src,i+2) == HASH_CHAR
                        ) {
                            inAdmin = true;
                            i += 2;
                        }
                    }
                }

                if ( inMultiComment || inSingleComment ) {
                    subStrIndexes.push( src.length );
                }
                subStrIndexes.push( src.length );

                if ( subStrIndexes.length > 0 ) {
                    var subStrings = []
                    var previousI = subStrIndexes[0];

                    // Push everything before the first comment,
                    // unless the first comment IS the first bit of source!
                    if ( previousI != 0 ) {
                        subStrings.push(
                                src.substring( 0, previousI )
                        );
                    }

                    for (
                            var i = 1, len = subStrIndexes.length;
                            i < len;
                            i += 2
                    ) {
                        var subStrI = subStrIndexes[i];
                        var next = subStrIndexes[i+1];

                        // replace comments with whitespace
                        for (
                                var j = previousI;
                                j < subStrI;
                                j++
                        ) {
                            subStrings.push( ' ' );
                        }

                        // keep the bits between the comments
                        subStrings.push( src.substring( subStrI, next ) );

                        previousI = next;
                    }

                    return subStrings.join( '' );
                } else {
                    return src;
                }
            };
        },

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
        SourceLines: function (src) {
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
            /* Alterations:
            *  : replaces all '\r's with '\n's
            *  : replaces single line comments with end of line characters
            *  : add a \n before ending braces,
            *  : add an end of line to the end of the file.
            */
            this.prepPreIndex = function (source) {
                // \r\n end of line, \n end of line or a single line comment
    //            source = source.replace(/(\/\/[^\n]*\n)/g, '\n');
                source = source.replace(/(\r\n)|\r/g, '\n');

                return source;
            };

            this.prepPostIndex = function (source) {
                var preParser = new quby.main.PreParser( source );
                source = preParser.parse( source );

                source = source.replace(/(\n| )?\}/g, '\n}');

                return source + '\n';
            };

            this.findReplace = function (source, regex, replace) {
                var regG = new RegExp(regex, 'g');
                var reg = new RegExp(regex);
                var matches = source.match(regG);

                if ( matches ) {
                    // cache the alts we make to avoid excessively making them
                    var alts = [];

                    for (var i = 0; i < matches.length; i++) {
                        var match = matches[i];

                        var whitespaceLen = match.length - replace.length;
                        var alt = alts[whitespaceLen];

                        if ( !alt ) {
                            var whitespace = [];
                            for (var j = 0; j < whitespaceLen; j++) {
                                whitespace.push(' ');
                            }
                            whitespace.push(replace);
                            alt = whitespace.join();
                            alts[whitespaceLen] = alt;
                        }

                        source = source.replace(reg, alt);
                    }
                }

                return source;
            };

            this.index = function (src) {
                var len = src.length;
                var lastIndex = 0;
                var lines = [];
                var running = true;

                while (running) {
                    var index = src.indexOf("\n", lastIndex);

                    if (index != -1) {
                        lines.push(index);
                        lastIndex = index + 1;
                        // the last line
                    } else {
                        lines.push(len);
                        running = false;
                    }

                    this.numLines++;
                }

                return lines;
            };

            this.getLine = function (offset) {
                // index source code on the fly, only if needed
                if (this.lineOffsets == null) {
                    this.lineOffsets = this.index(this.indexSource);
                }

                for (var line = 0; line < this.lineOffsets.length; line++) {
                    // lineOffset is from the end of the line.
                    // If it's greater then offset, then we return that line.
                    // It's +1 to start lines from 1 rather then 0.
                    if (this.lineOffsets[line] > offset) {
                        return line + 1;
                    }
                }

                return this.numLines;
            };

            this.getSource = function () {
                return this.source;
            };

            // altered when indexed ...
            this.numLines = 0;
            this.lineOffsets = null;

            // unaltered original source code
            this.origSource = src;
            // source code altered and should be used for indexing
            this.indexSource = this.prepPreIndex(src);
            // source altered further and should be used for parsing,
            // note these changes shouldn't be seen by the indexing!
            this.source = this.prepPostIndex(this.indexSource);
        },

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
        LateFunctionBinder: function (validator) {
            this.validator = validator;
            // class validators
            this.classVals = [];

            this.classFuns = [];
            this.currentClassV = null;

            this.setClassVal = function (klass) {
                this.currentClassV = klass;
            };

            this.addFun = function (fun) {
                var callName = this.currentClassV.klass.callName;
                var funs = this.classFuns[callName];

                if (!funs) {
                    funs = [];
                    this.classFuns[callName] = funs;
                    this.classVals[callName] = this.currentClassV;
                }

                var innerFuns = funs[fun.callName];
                if (!innerFuns) {
                    innerFuns = [];
                    funs[fun.callName] = innerFuns;
                }

                innerFuns.push(fun);
            };

            this.endValidate = function (globalFuns) {
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
                                this.validator.parseError(f.offset, "Function '" + f.name + "' called with " + f.getNumParameters() + " parameters, but is not defined in this class or as a function.");
                            }
                        }
                    }
                }
            };
        },

        /**
        * Used to store callName to display name mappings for all functions
        * and methods.
        *
        * This is used at runtime to allow it to lookup functions that
        * have been called but don't exist on the object.
        */
        FunctionTable: function () {
            this.funs = {};
            this.size = 0;

            this.add = function (callName, displayName) {
                this.funs[callName] = displayName;
                this.size++;
            };

            this.getFuns = function() {
                return this.funs;
            };

            this.print = function (p) {
                var fs = this.funs;

                p.append(quby.runtime.FUNCTION_TABLE_NAME, '={');

                // We print a comma between each entry
                // and we achieve this by always printing it before the next item,
                // except on the first one!
                var printComma = false;
                for (var callName in fs) {
                    var name = fs[callName];

                    // from second iteration onwards, this if is called
                    if ( printComma ) {
                        p.append( ',', callName, ":'", name, "'");
                    // this else is run on first iteration
                    } else {
                        p.append(callName, ":'", name, "'");
                        printComma = true;
                    }
                }

                p.append('}');
                p.endStatement();
            };
        },

        /**
        * This table is used for the symbol mappings.
        * Symbols are the :symbol code you can use in Quby/Ruby.
        *
        * This is printed into the resulting code for use at runtime.
        */
        SymbolTable: function () {
            this.symbols = {};

            this.add = function (sym) {
                this.symbols[sym.callName] = sym.value;
            };

            this.print = function (p) {
                var symbolsLength = this.symbols.length;

                for (var callName in this.symbols) {
                    var sym = this.symbols[callName];

                    p.append('var ', callName, " = '", sym, "'");
                    p.endStatement();
                }
            };
        },

        Validator: function () {
            // the various program trees that have been parsed
            this.programs = [];

            this.classes = {};
            this.currentClass = null;
            this.rootClass = new quby.main.RootClassProxy();

            this.calledMethods = {};

            this.vars = [];
            this.funVars = [];
            this.isBlock = [];

            this.globals = {};
            this.usedGlobals = {};

            this.funs = {};
            this.usedFunsStack = [];
            this.funNames = new quby.main.FunctionTable();
            this.lateUsedFuns = new quby.main.LateFunctionBinder(this);
            this.errors = [];

            this.isParameters = false;
            this.isFunParameters = false;

            this.isConstructor = false;

            this.endValidateCallbacks = [];

            this.preInlines = [];

            // When 0, we are outside of a function's scope.
            // The scope is added when we enter a function definition.
            // From then on every extra layer of scope increments it further,
            // and every time we move down it is decremented until we exit the function.

            // Why??? When 0, we can scan all layers of this.vars looking for local variables.
            // When greater then 0 we can scan all layers (decrementing on each) until funCount == 0.
            this.funCount = 0;
            this.currentFun = null;
            this.isAdminMode = false;

            this.symbols = new quby.main.SymbolTable();

            this.addPreInline = function(inline) {
                this.preInlines.push( inline );
            };

            this.addSymbol = function (sym) {
                this.symbols.add(sym);
            };

            this.setInConstructor = function (inC) {
                this.inConstructor = inC;
            };
            this.isInConstructor = function () {
                return this.inConstructor;
            };

            this.setClass = function (klass) {
                if (this.currentClass != null) {
                    this.parseError(klass.offset, "Class '" + klass.name + "' is defined inside '" + this.currentClass.klass.name + "', cannot define a class within a class.");
                }

                var klassName = klass.callName;
                var kVal = this.classes[klassName];

                if (!kVal) {
                    kVal = new quby.main.ClassValidator(this, klass);
                    this.classes[klassName] = kVal;
                } else {
                    var oldKlass = kVal.klass;
                    var oldKlassHead = oldKlass.header;
                    var klassHead = klass.header;

                    // if super relationship is set later in the app
                    if (!oldKlassHead.hasSuper() && klassHead.hasSuper()) {
                        oldKlass.header = klassHead;
                    } else if (oldKlassHead.hasSuper() && klassHead.hasSuper()) {
                        if (oldKlassHead.getSuperCallName() != klassHead.getSuperCallName()) {
                            this.parseError(klass.offset, "Super class cannot be redefined for class '" + klass.name + "'.");
                        }
                    }
                }

                if (klass.callName == quby.runtime.ROOT_CLASS_CALL_NAME) {
                    this.rootClass.setClass(kVal);
                }
                this.lateUsedFuns.setClassVal(kVal);

                return (this.currentClass = kVal);
            };
            this.getClass = function (callName) {
                return this.classes[callName];
            };
            this.getCurrentClass = function () {
                return this.currentClass;
            };
            this.getRootClass = function () {
                return this.rootClass;
            };
            this.unsetClass = function () {
                this.currentClass = null;
            };
            this.isInsideClass = function () {
                return this.currentClass != null;
            };
            this.isInsideExtensionClass = function () {
                return this.currentClass != null && this.currentClass.klass.isExtensionClass;
            };
            this.useField = function (field) {
                this.currentClass.useField(field);
            };
            this.assignField = function (field) {
                this.currentClass.assignField(field);
            };
            this.useThisClassFun = function (fun) {
                this.currentClass.useFun(fun);
            };

            this.setParameters = function (isParameters, isFun) {
                this.isParameters = isParameters;
                this.isFunParameters = !!isFun;
            };

            this.isInsideParameters = function () {
                return this.isParameters;
            };
            this.isInsideFunParameters = function () {
                return this.isParameters && this.isFunParameters;
            };
            this.isInsideBlockParameters = function () {
                return this.isParameters && !this.isFunParameters;
            };

            this.isInsideClassDefinition = function () {
                return this.isInsideClass() && !this.isInsideFun();
            };

            this.pushScope = function () {
                this.vars.push({});
                this.isBlock.push(false);

                if (this.isInsideFun()) {
                    this.funCount++;
                }
            };
            this.pushFunScope = function (fun) {
                if (this.currentFun != null) {
                    quby.runtime.error("Fun within Fun", "Defining a function whilst already inside another function.");
                }

                this.currentFun = fun;
                this.funCount++;
                this.vars.push({});
                this.isBlock.push(false);
            };
            this.pushBlockScope = function () {
                this.pushScope();
                this.isBlock[this.isBlock.length - 1] = true;
            };

            this.popScope = function () {
                this.isBlock.pop();

                if (this.isInsideFun()) {
                    this.funCount--;

                    if (this.funCount <= 0) {
                        var rootFVars = this.vars.pop();

                        for (var i = 0; i < this.funVars.length; i++) {
                            var fVars = this.funVars[i];

                            for (var key in fVars) {
                                if (rootFVars[key] == undefined) {
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
            this.isInsideFun = function (stmt) {
                return this.currentFun != null;
            };

            /**
            * Returns true or false stating if the validator is currently inside of
            * a block function.
            *
            * @return True if the validator is inside a block, otherwise false.
            */
            this.isInsideBlock = function () {
                return this.isBlock[this.isBlock.length - 1];
            };

            this.getCurrentFun = function () {
                return this.currentFun;
            };
            this.isConstructor = function () {
                return this.currentFun != null && this.currentFun.isConstructor;
            };

            this.assignVar = function (variable) {
                this.vars[this.vars.length - 1][variable.callName] = variable;
            };
            this.containsVar = function (variable) {
                var id = variable.callName;

                var stop;
                if (this.isInsideFun()) {
                    stop = this.vars.length - this.funCount;
                } else {
                    stop = 0;
                }

                for (var i = this.vars.length - 1; i >= stop; i--) {
                    if ( this.vars[i][id] != undefined ) {
                        return true;
                    }
                }

                return false;
            };
            this.containsLocalVar = function (variable) {
                var id = variable.callName;
                var scope = this.vars[this.vars.length - 1];

                return util.array.contains(scope, id);
            };
            this.containsLocalBlock = function () {
                var localVars = this.vars[this.vars.length - 1];

                for (var key in localVars) {
                    var blockVar = localVars[key];
                    if (blockVar.isBlockVar) {
                        return true;
                    }
                }

                return false;
            };

            this.assignGlobal = function (global) {
                this.globals[global.callName] = true;
            };
            this.useGlobal = function (global) {
                this.usedGlobals[global.callName] = global;
            };

            /**
             * Declares a function.
             *
             * By 'function' I mean function, constructor, method or function-generator.
             *
             * @param func
             */
            this.defineFun = function (func) {
                var klass = this.currentClass;

                if ( ! func.isConstructor ) {
                    this.funNames.add( func.callName, func.name );
                }

                // Methods / Constructors
                if (klass !== null) {
                    // Constructors
                    if ( func.isConstructor ) {
                        klass.addNew( func );
                        // Methods
                    } else {
                        klass.addFun( func );
                    }
                // Functions
                } else {
                    if (util.array.contains(this.funs, func.callName)) {
                        this.parseError(func.offset, "Function is already defined: '" + func.name + "', with " + func.getNumParameters() + " parameters.");
                    }

                    this.funs[func.callName] = func;
                }
            };

            /* Store any functions which have not yet been defined.
            * Note that this will include valid function calls which are defined after
            * the call, but this is sorted in the endValidate section. */
            this.useFun = function (fun) {
                if ( fun.isMethod ) {
                    this.calledMethods[fun.callName] = fun;
                } else if (this.isInsideClass()) {
                    if (this.currentClass.hasFun(fun)) {
                        fun.setIsMethod();
                    } else {
                        this.lateUsedFuns.addFun(fun);
                    }
                } else if (!this.funs[fun.callName]) {
                    this.usedFunsStack.push(fun);
                }
            };

            this.pushScope();

            this.parseError = function (lineInfo, msg) {
                if (lineInfo) {
                    this.parseErrorLine(lineInfo.source.getLine(lineInfo.offset), msg);
                } else {
                    this.errors.push(msg);
                }
            };

            this.parseErrorLine = function (line, msg) {
                this.errors.push("on line: " + line + ", " + msg);
            };

            this.getErrors = function () {
                return this.errors;
            };

            this.hasErrors = function() {
                return this.errors.length > 0;
            };

            // adds a program to be validated by this Validator
            this.addProgram = function (program) {
                if (!program) {
                    // avoid unneeded error messages
                    if (this.errors.length == 0) {
                        this.parseError(null, 'Unknown parse error; source code cannot be parsed!');
                    }
                } else {
                    try {
                        program.validate(this);
                        this.programs.push(program);
                    } catch ( err ) {
                        this.parseError(null, 'Unknown issue with your code has caused the parser to crash!');

                        if ( window.console && window.console.log ) {
                            window.console.log( err );

                            if ( err.stack ) {
                                window.console.log( err.stack );
                            }
                        }
                    }
                }
            };

            /**
            * Pass in a function and it will be called by the validator at the
            * end of validation. Note that all other validation occurres before
            * these callbacks are called.
            *
            * These are called in a FIFO order, but bear in mind that potentially
            * anything could have been added before your callback.
            */
            this.onEndValidate = function (callback) {
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
            this.finaliseProgram = function () {
                this.endValidate();

                if ( this.hasErrors() ) {
                    return '';
                } else {
                    return this.generateCode();
                }
            };

            /**
            * Private.
            *
            * Runs all final validation checks.
            * After this step the program is fully validated.
            */
            this.endValidate = function () {
                try {
                    /* Go through all function calls we have stored, which have not been
                    * confirmed as being defined. Note this can include multiple calls
                    * to the same functions. */
                    for (var usedFunsI in this.usedFunsStack) {
                        var fun = this.usedFunsStack[usedFunsI];
                        var callName = fun.callName;

                        // check if the function is not defined
                        if (!util.array.contains(this.funs, callName)) {
                            this.searchMissingFunAndError(fun, this.funs, 'function');
                        }
                    }

                    /* Check all used globals were assigned to, at some point. */
                    for (var strGlobal in this.usedGlobals) {
                        if (!this.globals[strGlobal]) {
                            var global = this.usedGlobals[strGlobal];
                            this.parseError(global.offset, "Global used but never assigned to: '" + global.identifier + "'.");
                        }
                    }

                    /* finalise all classes */
                    for (var klassI in this.classes) {
                        var klass = this.classes[klassI];
                        klass.endValidate();
                    }

                    /* Ensure all called methods do exist (somewhere) */
                    for (var methodI in this.calledMethods) {
                        var methodFound = false;
                        var method = this.calledMethods[methodI];

                        for (var klassI in this.classes) {
                            if (this.classes[klassI].hasFun(method)) {
                                methodFound = true;
                                break;
                            }
                        }

                        if ( !methodFound ) {
                            var found = this.searchForMethodLike( method ),
                                name = method.name.toLowerCase(),
                                errMsg = null;

                            if ( found !== null ) {
                                if ( name === found.name.toLowerCase() ) {
                                    errMsg = "Method '" + method.name + "' called with incorrect number of parameters, " + method.getNumParameters() + " instead of " + found.getNumParameters() ;
                                } else {
                                    errMsg = "Method '" + method.name + "' called with " + method.getNumParameters() + " parameters, but is not defined in any class. Did you mean: '" + found.name + "'?" ;
                                }
                            } else {
                                // no alternative method found
                                errMsg = "Method '" + method.name + "' called with " + method.getNumParameters() + " parameters, but is not defined in any class." ;
                            }

                            this.parseError(method.offset, errMsg );
                        }
                    }

                    this.lateUsedFuns.endValidate(this.funs);

                    // finally, run the callbacks
                    while (this.endValidateCallbacks.length > 0) {
                        var callback = this.endValidateCallbacks.shift();
                        callback(this);
                    }
                } catch ( err ) {
                    this.parseError(null, 'Unknown issue with your code has caused the parser to crash!');

                    if ( window.console && window.console.log ) {
                        window.console.log( err );

                        if ( err.stack ) {
                            window.console.log( err.stack );
                        }
                    }
                }
            };

            /**
            * Turns all stored programs into
            */
            this.generateCode = function () {
                var printer = new quby.main.Printer(this);

                printer.setCodeMode(false);
                this.generatePreCode(printer);
                printer.setCodeMode(true);

                for (var i = 0; i < this.programs.length; i++) {
                    this.programs[i].print(printer);
                }

                return printer.toString();
            };

            this.generateNoSuchMethodStubs = function(p) {
                // generate the noSuchMethod function stubs
                if ( ! quby.compilation.hints.useMethodMissing() ) {
                    var rootKlass = this.getRootClass().getClass();
                    var callNames = [];
                    var extensionStr = [];
                    var fs = this.funNames.getFuns();

                    p.append(quby.runtime.FUNCTION_DEFAULT_TABLE_NAME,'={');

                    var errFun = ":function(){quby_errFunStub(this,arguments);}";
                    var printComma = false;
                    for (var callName in fs) {
                        if ( rootKlass === null || !rootKlass.hasFunCallName(callName) ) {
                            // from second iteration onwards, this if is called
                            if ( printComma ) {
                                p.append( ',', callName, ':function(){noSuchMethodError(this,"' + callName + '");}' );
                            // this else is run on first iteration
                            } else {
                                p.append( callName, ':function(){noSuchMethodError(this,"' + callName + '");}' );
                                printComma = true;
                            }

                            callNames[ callNames.length ] = callName;
                            extensionStr[ extensionStr.length ] = ['.prototype.', callName, '=', quby.runtime.FUNCTION_DEFAULT_TABLE_NAME, '.', callName].join('');
                        }
                    }

                    p.append('}');
                    p.endStatement();

                    // print empty funs for each Extension class
                    var classes = quby.runtime.CORE_CLASSES;
                    var numNames = callNames.length;
                    for (var i = 0; i < classes.length; i++) {
                        var name = classes[i];
                        var transName = quby.runtime.translateClassName( name );
                        var thisKlass = this.getClass( name );

                        for ( var j = 0; j < callNames.length; j++ ) {
                            var callName = callNames[j];

                            if ( thisKlass === undefined || !thisKlass.hasFunCallName(callName) ) {
                                p.append( transName, extensionStr[j] );
                                p.endStatement();
                            }
                        }
                    }

                    if ( rootKlass !== null ) {
                        rootKlass.setNoMethPrintFuns( callNames );
                    }
                }
            };

            this.generatePreCode = function (p) {
                this.funNames.print(p);
                this.symbols.print(p);
                p.printArray( this.preInlines );

                this.generateNoSuchMethodStubs(p);

                // print the Object functions for each of the extension classes
                var classes = quby.runtime.CORE_CLASSES;
                var stmts = this.rootClass.getPrintStmts();
                for (var i = 0; i < classes.length; i++) {
                    var name = classes[i];
                    p.appendExtensionClassStmts(name, stmts);
                }
            };

            /* Validation Helper Methods */

            this.ensureInConstructor = function (syn, errorMsg) {
                return this.ensureTest(!this.isInsideFun() || !this.isInsideClass() || !this.isConstructor(), syn, errorMsg);
            };
            this.ensureInMethod = function (syn, errorMsg) {
                return this.ensureTest(!this.isInsideFun() || !this.isInsideClass(), syn, errorMsg);
            };
            this.ensureAdminMode = function (syn, errorMsg) {
                return this.ensureTest(!this.isAdminMode, syn, errorMsg);
            };
            this.ensureInFun = function (syn, errorMsg) {
                return this.ensureTest(!this.isInsideFun(), syn, errorMsg);
            };
            this.ensureOutFun = function (syn, errorMsg) {
                return this.ensureTest(this.isInsideFun(), syn, errorMsg);
            };
            this.ensureOutBlock = function (syn, errorMsg) {
                return this.ensureTest(this.isInsideBlock(), syn, errorMsg);
            };
            this.ensureInClass = function (syn, errorMsg) {
                return this.ensureTest(!this.isInsideClass(), syn, errorMsg);
            };
            this.ensureOutClass = function (syn, errorMsg) {
                return this.ensureTest(this.isInsideClass(), syn, errorMsg);
            };
            this.ensureOutParameters = function (syn, errorMsg) {
                return this.ensureTest(this.isInsideParameters(), syn, errorMsg);
            };
            this.ensureInFunParameters = function (syn, errorMsg) {
                return this.ensureTest(!this.isInsideFunParameters(), syn, errorMsg);
            };
            this.ensureTest = function (errCondition, syn, errorMsg) {
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
            this.searchForMethodLike = function( method, klassVal ) {
                if ( klassVal ) {
                    return this.searchMissingFun( method, klassVal.funs );
                } else {
                    var searchKlassVals = this.classes,
                        altMethod = null,
                        methodName = method.name.toLowerCase() ;
                    // check for same method, but different number of parameters

                    for ( var i in searchKlassVals ) {
                        var found = this.searchMissingFunWithName( methodName, searchKlassVals[i].funs );

                        if ( found !== null ) {
                            // wrong number of parameters
                            if ( found.name.toLowerCase() == methodName ) {
                                return found;
                            // alternative name
                            } else if ( altMethod === null ) {
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
            this.searchMissingFunWithName = function (name, searchFuns) {
                var altNames = [],
                    altFun = null;
                var nameLen = name.length;

                if (
                        nameLen > 3 &&
                        ( name.indexOf('get') === 0 || name.indexOf('set') === 0 )

                ) {
                    altNames.push( name.substr(3) );
                } else {
                    altNames.push( 'get' + name );
                    altNames.push( 'set' + name );
                }

                for (var funIndex in searchFuns) {
                    var searchFun = searchFuns[funIndex];
                    var searchName = searchFun.name.toLowerCase();

                    if (searchName == name) {
                        return searchFun;
                    } else if ( altFun === null ) {
                        for ( var i = 0; i < altNames.length; i++ ) {
                            var altName = altNames[i];

                            if ( searchName == altName ) {
                                altFun = searchFun;
                                break;
                            }
                        }
                    }
                }

                return altFun;
            };

            this.searchMissingFun = function( fun, searchFuns ) {
                return this.searchMissingFunWithName( fun.name.toLowerCase(), searchFuns );
            };

            /**
             *
             */
            this.searchMissingFunAndError = function (fun, searchFuns, strFunctionType) {
                var name = fun.name.toLowerCase();
                var found = this.searchMissingFunWithName( name, searchFuns ),
                    errMsg;

                if ( found !== null ) {
                    if ( name === found.name.toLowerCase() ) {
                        errMsg = "Called " + strFunctionType + " '" + fun.name + "' with wrong number of parameters.";
                    } else {
                        errMsg = "Called " + strFunctionType + " '" + fun.name + "', but it is not defined, did you mean: '" + found.name + "'." ;
                    }
                } else {
                    errMsg = "Undefined " + strFunctionType + " called: '" + fun.name + "'.";
                }

                this.parseError(fun.offset, errMsg);
            };
        },

        /**
        * Whilst validating sub-classes will want to grab the root class.
        * If it has not been hit yet then we can't return it.
        * So instead we use a proxy which always exists.
        *
        * This allows us to set the root class later.
        */
        RootClassProxy: function () {
            this.rootClass = null;

            this.setClass = function (klass) {
                if (this.rootClass == null) {
                    this.rootClass = klass;
                }
            };
            this.getClass = function () {
                return this.rootClass;
            };

            /**
            * Should only be called after validation (during printing).
            */
            this.getPrintStmts = function (p, className) {
                if (this.rootClass == null) {
                    return [];
                } else {
                    return this.rootClass.klass.statements.stmts;
                }
            };
        },

        ClassValidator: function (validator, klass) {
            this.validator = validator;
            this.klass = klass;

            this.funs = {};
            this.usedFuns = {};
            this.news = [];

            this.isPrinted = false;

            this.usedFields = {};
            this.assignedFields = {};

            this.useField = function (field) {
                this.usedFields[field.callName] = field;
            };
            this.assignField = function (field) {
                this.assignedFields[field.callName] = field;
            };
            this.hasField = function (field) {
                var fieldCallName = quby.runtime.formatField(
                        this.klass.name,
                        field.identifier
                );

                return this.hasFieldCallName( fieldCallName );
            };
            this.hasFieldCallName = function(callName) {
                return this.assignedFields[ callName ] != undefined;
            };

            this.addFun = function (fun) {
                var index = fun.callName;

                if ( this.funs.hasOwnProperty(index) ) {
                    validator.parseError(fun.offset, "Duplicate method '" + fun.name + "' definition in class '" + this.klass.name + "'.");
                }

                this.funs[index] = fun;
            };
            this.hasFunInHierarchy = function (fun) {
                if ( this.hasFun(fun) ) {
                    return true;
                } else {
                    var parentName = klass.getSuperCallName();
                    var parentVal;

                    // if has a parent class, pass the call on to that
                    if (
                        parentName != null &&
                        (parentVal = this.validator.getClass(parentName)) != undefined
                    ) {
                        return parentVal.hasFunInHierarchy( fun );
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
            this.hasFun = function (fun) {
                return this.hasFunCallName( fun.callName );
            };

            /**
             * States if this class has a method with the given call name, or not.
             *
             * Ignores parent classes.
             */
            this.hasFunCallName = function(callName) {
                return this.funs.hasOwnProperty(callName);
            };
            this.useFun = function (fun) {
                if (!this.funs[fun.callName]) {
                    this.usedFuns[fun.callName] = fun;
                }
            };

            this.getFun = function( callName ) {
                var f = this.funs[ callName ];
                return ( f === undefined ) ? null : f ;
            };

            this.addNew = function (fun) {
                var index = fun.getNumParameters();

                if ( this.news[index] != undefined ) {
                    validator.parseError(fun.offset, "Duplicate constructor for class '" + this.klass.name + "' with " + index + " parameters.");
                }

                this.news[index] = fun;
            };
            this.hasNew = function (fun) {
                return this.news[fun.getNumParameters()] != undefined;
            };
            this.noNews = function () {
                return this.news.length == 0;
            };

            this.setNoMethPrintFuns = function( callNames ) {
                this.noMethPrintFuns = callNames;
            };

            this.printOnce = function (p) {
                if (!this.isPrinted) {
                    this.isPrinted = true;
                    this.print(p);
                }
            };
            /**
            * In practice, this is only ever called by non-extension classes.
            */
            this.print = function (p) {
                p.setCodeMode(false);

                var klassName = this.klass.callName;
                var superKlass = this.klass.getSuperCallName();

                // class definition itself
                p.append('function ', klassName, '() {');
                if (superKlass != null) {
                    p.append(superKlass, '.apply(this);');
                }
                // set 'this' to '_this'
                p.append('var ', quby.runtime.THIS_VARIABLE, ' = this;');

                if ( this.noMethPrintFuns ) {
                    for ( var i = 0; i < this.noMethPrintFuns.length; i++ ) {
                        var callName = this.noMethPrintFuns[i];

                        p.append( 'this.', callName, '=', quby.runtime.FUNCTION_DEFAULT_TABLE_NAME, '.', callName );
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
                for (var newIndex in this.news) {
                    var newFun = this.news[newIndex];

                    newFun.print(p);
                }

                p.setCodeMode(true);
            };

            this.endValidate = function () {
                var thisKlass = this.klass;

                // if no constructors, add a default no-args constructor
                // but only for non-core classes
                if (this.news.length == 0 && !this.klass.isExtensionClass) {
                    var constructor = new quby.syntax.Constructor(
                            quby.lexer.EmptySym(thisKlass.offset, "new"),
                            new quby.syntax.Parameters(),
                            new quby.syntax.Statements()
                    );
                    constructor.setClass(thisKlass);

                    this.addNew(constructor);
                }

                // Check for circular inheritance trees.
                // Travel up the inheritance tree marking all classes we've seen.
                // If we see one we've already seen, then we break with a parse error.
                var seenClasses = {};
                seenClasses[thisKlass.callName] = true;

                var head = thisKlass.header;
                var superClassVs = []; // cache the order of super classes

                while (head.hasSuper()) {
                    var superKlassV = this.validator.getClass(head.getSuperCallName());

                    if (!superKlassV) {
                        if (!quby.runtime.isCoreClass(head.getSuperName().toLowerCase())) {
                            this.validator.parseError(thisKlass.offset,
                                    "Super class not found: '" +
                                    head.getSuperName() +
                                    "', for class '" +
                                    thisKlass.name +
                                    "'."
                            );
                        }

                        break;
                    } else {
                        var superKlass = superKlassV.klass;

                        if (seenClasses[superKlass.callName]) {
                            this.validator.parseError(
                                    thisKlass.offset,
                                    "Circular inheritance tree is found for class '" + thisKlass.name + "'."
                            );

                            break;
                        } else {
                            superClassVs.push( superKlassV );
                            seenClasses[superKlass.callName] = true;
                            head = superKlass.header;
                        }
                    }
                }

                // validate fields
                for (var fieldI in this.usedFields) {
                    if (this.assignedFields[fieldI] == undefined) {
                        var field = this.usedFields[fieldI];
                        var fieldErrorHandled = false;

                        // search up the super class tree for a field of the same name
                        if ( thisKlass.header.hasSuper() ) {
                            for ( var i = 0; i < superClassVs.length; i++ ) {
                                var superClassV = superClassVs[ i ];

                                if ( superClassV.hasField(field) ) {
                                    this.validator.parseError( field.offset,
                                            "Field '@" +
                                            field.identifier +
                                            "' from class '" +
                                            superClassV.klass.name +
                                            "' is accessd in sub-class '" +
                                            thisKlass.name +
                                            "', however fields are private to each class."
                                    );

                                    fieldErrorHandled = true;
                                    break;
                                }
                            }
                        }

                        if ( ! fieldErrorHandled ) {
                            this.validator.parseError( field.offset,
                                    "Field '@" +
                                    field.identifier +
                                    "' is used in class '" +
                                    thisKlass.name +
                                    "' without ever being assigned to."
                            );
                        }
                    }
                }

                // Search for funs used on this class.
                // This is more strict then other method checks,
                // as it takes into account that the target is 'this'.
                for (var funName in this.usedFuns) {
                    if (!this.funs[funName]) {
                        var fun = this.usedFuns[funName];

                        if ( ! this.hasFunInHierarchy(fun) ) {
                            this.validator.searchMissingFunAndError(
                                    fun, this.funs, thisKlass.name + ' method'
                            );
                        }
                    }
                }
            };
        },

        Printer: function (validator) {
            var STATEMENT_END = ';\n';

            this.validator = validator;

            this.tempVarCounter = 0;

            this.isCode = true;
            this.pre   = [];
            this.stmts = [];
            this.preOrStmts = this.stmts;

            this.currentPre = new quby.main.PrinterStatement();
            this.currentStmt = new quby.main.PrinterStatement();
            this.current = this.currentStmts;

            this.getTempVariable = function() {
                return quby.runtime.TEMP_VARIABLE + (this.tempVarCounter++);
            };

            this.getValidator = function () {
                return this.validator;
            };

            this.setCodeMode = function (isCode) {
                if ( isCode ) {
                    this.current = this.currentStmt;
                    this.preOrStmts = this.stmts;
                } else {
                    this.current = this.currentPre;
                    this.preOrStmts = this.pre;
                }

                this.isCode = isCode;
            };

            this.appendExtensionClassStmts = function (name, stmts) {
                var stmtsStart = quby.runtime.translateClassName(name) + '.prototype.';

                for (var key in stmts) {
                    var fun = stmts[key];

                    if ( fun.isConstructor ) {
                        fun.print( this );
                    } else {
                        this.append(stmtsStart);
                        fun.print(this);
                    }

                    this.endStatement();
                }
            };

            this.printArray = function(arr) {
                for (
                        var i = 0, len = arr.length;
                        i < len;
                        i++
                ) {
                    arr[i].print( this );
                    this.endStatement();
                }
            };

            this.addStatement = function () {
                this.stmts.push(arguments.join(''));
            };

            // Chrome is much faster at iterating over the arguments array,
            // maybe I'm hitting an optimization???
            // see: http://jsperf.com/skip-arguments-check
            if ( util.browser.isChrome ) {
                this.appendPre = function () {
                    for ( var i = 0; i < arguments.length; i++ ) {
                        this.current.appendPre(arguments[i]);
                    }

                    return this;
                };
                this.append = function () {
                    for ( var i = 0; i < arguments.length; i++ ) {
                        this.current.appendNow(arguments[i]);
                    }

                    return this;
                };
                this.appendPost = function () {
                    for ( var i = 0; i < arguments.length; i++ ) {
                        this.current.appendPost(arguments[i]);
                    }

                    return this;
                };
            } else {
                this.appendPre = function (a) {
                    if ( arguments.length === 1 ) {
                        this.current.appendPre( a );
                    } else {
                        for ( var i = 0; i < arguments.length; i++ ) {
                            this.current.appendPre(arguments[i]);
                        }
                    }

                    return this;
                };
                this.append = function (a) {
                    if ( arguments.length === 1 ) {
                        this.current.appendNow( a );
                    } else {
                        for ( var i = 0; i < arguments.length; i++ ) {
                            this.current.appendNow(arguments[i]);
                        }
                    }

                    return this;
                };
                this.appendPost = function (a) {
                    if ( arguments.length === 1 ) {
                        this.current.appendPost( a );
                    } else {
                        for ( var i = 0; i < arguments.length; i++ ) {
                            this.current.appendPost(arguments[i]);
                        }
                    }

                    return this;
                };
            }

            this.flush = function() {
                this.current.flush( this.preOrStmts );

                return this;
            };

            this.endStatement = function () {
                this.append( STATEMENT_END );
                return this.flush();
            };

            this.toString = function () {
                // concat everything into this.pre ...
                this.currentPre.flush( this.pre );
                util.array.addAll( this.pre, this.stmts );
                this.currentStmt.flush( this.pre ); // yes, pass in pre!

                return this.pre.join('');
            };
        },

        PrinterStatement: function () {
            this.preStatement = null;
            this.currentStatement = null;
            this.postStatement = null;

            this.appendPre = function (e) {
                if (this.preStatement == null) {
                    this.preStatement = [e];
                } else {
                    this.preStatement.push( e );
                }
            };
            this.appendNow = function (e) {
                if (this.currentStatement == null) {
                    this.currentStatement = [e];
                } else {
                    this.currentStatement.push( e );
                }
            };
            this.appendPost = function (e) {
                if (this.postStatement == null) {
                    this.postStatement = [e];
                } else {
                    this.postStatement.push( e );
                }
            };

            this.endAppend = function( dest, src ) {
                for (
                        var i = 0, len = src.length;
                        i < len;
                        i++
                ) {
                    dest[ dest.length ] = src[i];
                }
            };

            this.flush = function ( stmts ) {
                if (this.preStatement != null) {
                    if (this.currentStatement != null) {
                        if (this.postStatement != null) {
                            this.endAppend( stmts, this.preStatement );
                            this.endAppend( stmts, this.currentStatement );
                            this.endAppend( stmts, this.postStatement );
                        } else {
                            this.endAppend( stmts, this.preStatement );
                            this.endAppend( stmts, this.currentStatement );
                        }
                    } else if (this.postStatement != null) {
                        this.endAppend( stmts, this.preStatement );
                        this.endAppend( stmts, this.postStatement );
                    } else {
                        this.endAppend( stmts, this.preStatement );
                    }

                    this.clear();
                } else if (this.currentStatement != null) {
                    if (this.postStatement != null) {
                        this.endAppend( stmts, this.currentStatement );
                        this.endAppend( stmts, this.postStatement );
                    } else {
                        this.endAppend( stmts, this.currentStatement );
                    }

                    this.clear();
                } else if ( this.postStatement != null ) {
                    this.endAppend( stmts, this.postStatement );

                    this.clear();
                }
            };

            this.clear = function () {
                this.preStatement     = null;
                this.currentStatement = null;
                this.postStatement    = null;
            };
        },

        LineInfo: function (offset, source) {
            this.offset = offset;
            this.source = source;

            this.getLine = function () {
                return this.source.getLine(this.offset);
            };
        }
    };
})( quby, util );/**
 * quby.parse
 *
 * This is the parser interface for Quby. This parses given source code, and
 * then builds an abstract tree (or errors) describing it.
 *
 * In many ways this is glue code, as it uses:
 *  - parse.js for parsing
 *  - quby.syntax for building the AST
 *  - quby.lexer for building the symbols
 *
 * It is also built to have it's work lined across multiple time intervals. That
 * way it won't freeze the CPU.
 *
 * All of this is provided through one function: quby.parse.parse
 */
(function( quby, util, window, undefined ) {
    var parse = window['parse'];

    /**
     * ASCII codes for characters.
     *
     * @type {number}
     * @const
     */
    var TAB     = "\t".charCodeAt(0),
        SLASH_N = "\n".charCodeAt(0),
        SLASH_R = "\r".charCodeAt(0),

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
     * Returns true if the character code given
     * is an alphanumeric character.
     *
     * @nosideeffects
     * @const
     * @param {number} code
     * @return {boolean}
     */
    var isAlphaNumericCode = function(code) {
        return (
                (code >=  LOWER_A && code <= LOWER_Z) || // lower case letter
                (code === UNDERSCORE) ||
                (code >=  ZERO && code <= NINE)     // a number
        );
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
    var isAlphaNumeric = function( src, i ) {
        var code = src.charCodeAt(i+src.length);

        return isAlphaNumericCode( code );
    };

    /* Terminals */

    /**
     * @nosideeffects
     * @const
     * @param {number} code
     * @return {boolean}
     */
    var isHexCode = function(code) {
        return (code >= ZERO && code <= NINE) || // a number
               (code >= LOWER_A && code <= LOWER_F);   // a to f lower
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

    parse['ignore']({
            whitespace: function(src, i, code, len) {
                while ( code === SPACE || code === TAB ) {
                    i++;
                    code = src.charCodeAt( i );
                }

                return i;
            },
            singleComment: function(src, i, code, len) {
                if ( code === SLASH && src.charCodeAt(i+1) === SLASH ) {
                    i++;

                    do {
                        i++;
                        code = src.charCodeAt(i);
                    } while (
                            i  <  len  &&
                            code !== SEMI_COLON &&
                            code !== SLASH_N &&
                            code !== SLASH_R
                    );

                    return i;
                }
            },
            multiComment: function(src, i, code, len) {
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
                    } while (
                            src.charCodeAt(i  ) !== STAR &&
                            src.charCodeAt(i+1) !== SLASH
                    );

                    // plus 2 to include the end of the comment
                    return i+2;
                }
            }
    });

    var terminals = parse.terminals({
            end: {
                line: function( src, i, code, len ) {
                    if (
                            code === SLASH_N ||
                            code === SLASH_R
                    ) {
                        return i+1;
                    } else {
                        return;
                    }
                    if (
                            code === SLASH_N ||
                            code === SLASH_R
                    ) {
                        do {
                            i++;
                            code = src.charCodeAt(i);
                        } while ( code === SLASH_N || code === SLASH_R );

                        return i;
                    }
                },

                statement: ';'
            },

            keywords: {
                    DO          : 'do',
                    END         : 'end',

                    IF          : 'if',
                    IF_ELSE     : 'else',
                    IF_ELSE_IF  : ['else if', 'elseif', 'elsif'],
                    THEN        : 'then',

                    WHILE       : 'while',
                    UNTIL       : 'until',
                    LOOP        : 'loop',

                    DEF         : 'def',
                    ADMIN_DEF   : '#def',

                    NEW         : 'new',
                    CLASS       : 'class',

                    RETURN      : 'return',

                    YIELS       : 'yield',

                    THIS        : 'this',

                    MODULE      : 'module'
            },

            symbols: {
                    at          : '@',

                    leftParen   : '(',
                    rightParen  : ')',

                    leftBrace   : '{',
                    rightBrace  : '}',

                    leftSquare  : '[',
                    rightSquare : ']'
            },

            literals: {
                    TRUE        : 'true' ,
                    FALSE       : 'false',
                    NULL        : ['null', 'nil'],

                    number: function(src, i, code, len) {
                        if ( ! isNumericCode(src.charCodeAt(i)) ) {
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
                            );
                        // normal number
                        } else {
                            do {
                                i++;
                                code = src.charCodeAt( i );
                            } while (
                                    code === UNDERSCORE ||
                                    isNumericCode( code )
                            );

                            // Look for Decimal Number
                            if (
                                    src.charCodeAt(i+1) === FULL_STOP &&
                                    isNumeric( src, i+2 )
                            ) {
                                var code;
                                i += 2;

                                do {
                                    i++;
                                    code = src.charCodeAt(i);
                                } while (
                                        code === UNDERSCORE ||
                                        isNumericCode( code )
                                );
                            }
                        }

                        return i;
                    },

                    symbol: function(src, i, code, len) {
                        if ( code === COLON ) {
                            if ( isAlphaNumericCode(src.charCodeAt(i+1)) ) {
                                i += 2;

                                while ( isAlphaNumericCode(src.charCodeAt(i)) ) {
                                    i++;
                                }

                                return i;
                            }
                        }
                    },

                    string: function(src, i, code, len) {
                        // double quote string
                        if ( code === DOUBLE_QUOTE ) {
                            do {
                                i++;

                                // error!
                                if ( i >= len ) {
                                    return;
                                }
                            } while (
                                    src.charCodeAt(i  ) !== DOUBLE_QUOTE &&
                                    src.charCodeAt(i-1) !== BACKSLASH
                            );

                            return i;
                        // single quote string
                        } else if ( code === SINGLE_QUOTE ) {
                            do {
                                i++;

                                // error!
                                if ( i >= len ) {
                                    return;
                                }
                            } while (
                                    src.charCodeAt(i  ) !== SINGLE_QUOTE &&
                                    src.charCodeAt(i-1) !== BACKSLASH
                            );

                            return i;
                        }
                    }
            },

            ops: {
                    power               : '**',

                    divide              : '/',
                    multiply            : '*',
                    plus                : '+',
                    subtract            : '-',
                    mod                 : '%',

                    mapAssignment       : [':', '=>'],

                    equal               : '==',

                    shiftLeft           : '<<',
                    shiftRight          : '>>',

                    lessThanEqual       : '<=',
                    greaterThanEqual    : '>=',
                    lessThan            : '<',
                    greaterThan         : '>',

                    assign              : '=',

                    comma               : ',',
                    dot                 : '.',

                    logicalAnd          : ['&&', 'and'],
                    logicalOr           : ['||', 'or'],

                    not                 : ['!', 'not'],

                    bitwiseAnd          : '&',
                    bitwiseOr           : '|'
            },

            identifiers: {
                    identifier : function(src, i, code, len) {
                        if (
                                // is a lower case letter, or underscore
                                (code >= 97 && code <= 122) ||
                                (code === UNDERSCORE)
                        ) {
                            i++;

                            while ( isAlphaNumericCode(src.charCodeAt(i)) ) {
                                i++;
                            }

                            return i;
                        }
                    },
                    global: function(src, i, code, len) {
                        if ( code === DOLLAR ) {
                            i++;

                            while ( isAlphaNumericCode(src.charCodeAt(i)) ) {
                                i++;
                            }

                            return i;
                        }
                    },
                    field : function(src, i, code, len) {
                        if ( code === AT ) {
                            i++;

                            while ( isAlphaNumericCode(src.charCodeAt(i)) ) {
                                i++;
                            }

                            return i;
                        }
                    }
            },

            adminStatement: function(src, i, code, len) {
                // if #<#
                if (
                                       code === HASH      &&
                        src.charCodeAt(i+1) === LESS_THAN &&
                        src.charCodeAt(i+2) === HASH
                ) {
                    i += 2;

                    do {
                        i++;

                        // error!
                        if ( i >= len ) {
                            return;
                        };
                    // while ! #>#
                    } while (
                            src.charCodeAt(i  ) !== HASH         &&
                            src.charCodeAt(i+1) !== GREATER_THAN &&
                            src.charCodeAt(i+2) !== HASH
                    );

                    return i+3;
                }
            },
            adminPreStatement: function(src, i, code, len) {
                // if #<pre#
                if (
                                       code === HASH        &&
                        src.charCodeAt(i+1) === LESS_THAN   &&
                        src.charCodeAt(i+2) === LOWER_P     &&
                        src.charCodeAt(i+3) === LOWER_R     &&
                        src.charCodeAt(i+4) === LOWER_E     &&
                        src.charCodeAt(i+5) === HASH
                ) {
                    i += 4;

                    do {
                        i++;

                        // error!
                        if ( i >= len ) {
                            return;
                        };
                    // while ! #>#
                    } while (
                            src.charCodeAt(i  ) !== HASH         &&
                            src.charCodeAt(i+1) !== GREATER_THAN &&
                            src.charCodeAt(i+2) !== HASH
                    );

                    return i+3;
                }
            }
    });

console.log( terminals.keywords.NEW, terminals.keywords.NEW.onMatch );
    /* The onMatch callbacks for altering the symbols when matched. */
    terminals.keywords.NEW.onMatch( function(match, offset) {
        return new quby.lexer.Sym( offset, 'new' );
    });
    terminals.keywords.RETURN.onMatch( function(match, offset) {
        return new quby.lexer.Sym( offset, 'return' );
    });

    terminals.literals.TRUE.onMatch( function(match, offset) {
        return new quby.syntax.Bool(
            new quby.lexer.Sym( offset, true )
        );
    });
    terminals.literals.FALSE.onMatch( function(match, offset) {
        return new quby.syntax.Bool(
            new quby.lexer.Sym( offset, false )
        );
    });
    terminals.literals.NULL.onMatch( function(match, offset) {
        return new quby.syntax.Null(
            new quby.lexer.Sym( offset, null )
        );
    });
    terminals.literals.string.onMatch( function(match, offset) {
        return new quby.syntax.String(
            new quby.lexer.Sym( offset, match )
        );
    });
    terminals.literals.number.onMatch( function(match, offset) {
        return new quby.syntax.Number(
            new quby.lexer.Sym( offset, match )
        );
    });
    terminals.literals.symbol.onMatch( function(match, offset) {
        return new quby.syntax.String(
            new quby.lexer.IdSym( offset, match.substring(1) )
        );
    });

    terminals.identifiers.identifier.onMatch( function(match, offset) {
        return new quby.lexer.IdSym( offset, match );
    });
    terminals.identifiers.global.onMatch( function(match, offset) {
        return new quby.lexer.IdSym( offset, match );
    });

    var ops = terminals.ops;

    /* Parser Rules */

    var endStatement = parse.either( terminals.end.line, terminals.end.statement );

    var expression = parse();

    var doubleOpExpression = parse( expression, terminals.ops, expression ).
                    onMatch(
                            function( left, op, right ) {
                                if ( op === ops.plus ) {
                                    return left + right;
                                } else if ( op === ops.divide ) {
                                    return left / right;
                                } else if ( op === ops.mult ) {
                                    return left * right;
                                } else if ( op === ops.subtract ) {
                                    return left - right;
                                }
                            }
                    ),

            singleOpExpression = parse.either( terminals.ops.plus, terminals.ops.subtract ).
                    then( expression ).
                    onMatch( function( op, number ) {
                        if ( op === terminals.ops.subtract ) {
                            return - number;
                        } else {
                            return   number;
                        }
                    } ),

            number = parse.
                    maybe(
                            terminals.ops.minus,
                            terminals.ops.plus
                    ).
                    then( terminals.literals.number ).
                    onMatch( function( first, num ) {
                        if ( first === terminals.ops.minus ) {
                            return new quby.syntax.NumberConstant( - num.value );
                        } else {
                            return new quby.syntax.NumberConstant(   num.value );
                        }
                    } );

    var variable = parse.either( terminals.identifiers );

    expression = expression.either(
            terminals.literals,
            variable,
            doubleOpExpression,
            singleOpExpression
    );

    var statement = parse();

    var expr = parse.
            either( terminals.literals ).
            then( terminals.ops.plus ).
            either( terminals.literals ).
            onMatch( function(left, op, right) {
                console.log( 'expr ', left, op, right );
            } );

    var assignment = parse.
            either( terminals.identifiers ).
            then( terminals.ops.assign ).
            then( expr ).
            onMatch( function(identifier, op, expr) {
                console.log('assignment', identifier, op, expr );
            } );

    statement = parse.either(
                    assignment
/*
                    ifStatement,
                    whileUntilStatement,
                    yieldStatement,
                    returnStatement,

                    functionDef,
                    classDef,
                    moduleDef,

                    inline,

                    functionCall,

                    constructor,
                    adminMethod
*/
            ).
            either( terminals.end );

    quby.parser = {
            /**
             * The entry point for the parser, and the only way to interact.
             *
             * Call this, pass in the code, and a callback so your informed
             * about when it's done.
             */
            parse : function( src, onFinish ) {
                statement.parseLowerCase( src,
                    function( result, errors ) {
                        var statements = new quby.syntax.Statements();

                        for ( var i = 0; i < result.length; i++ ) {
                            statements.add( result[i] );
                        }

                        onFinish( result, errors );
                    }
                );
            }
    };
})( quby, util, window )
/* These functions are called so often that they exist outside of the quby.runtime
 * namespace so they can be as cheap as possible.
 */

/*
 * This is called when a method is not found.
 */
function noSuchMethodError(_this, callName) {
    var args = Array.prototype.slice.call( arguments, 2 );
    var block = args.pop();
    
    quby.runtime.methodMissingError( _this, callName, args, block );
};

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

        return block.apply( null, args );
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
    if ( ! (block instanceof Function) ) {
        quby.runtime.missingBlockError();
    } else if ( numArgs < block.length ) {
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
    if ( collection === null ) {
        quby.runtime.runtimeError( "Collection is null when setting a value" );
    } else if ( collection.set ) {
        return collection.set(key, value);
    } else {
        quby.runtime.runtimeError(
                "Trying to set value on a non-collection, it's actually a: " + quby.runtime.identifyObject(collection)
        );
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
    if ( collection === null ) {
        quby.runtime.runtimeError( "Collection is null when getting a value" );
    } else if ( collection.get ) {
        return collection.get(key);
    } else {
        quby.runtime.runtimeError(
                "Trying to get a value from a non-collection, it's actually a: " + quby.runtime.identifyObject(collection)
        );
    }
}

(function( quby, util ) {
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
    quby.runtime = {
        FUNCTION_DEFAULT_TABLE_NAME: '_q_no_funs',
        
        FUNCTION_TABLE_NAME: '_q_funs',

        SYMBOL_TABLE_NAME: '_q_syms',

        // needs to be kept lower case for comparisons
        SUPER_KEYWORD: "super",

        // standard exception names
        EXCEPTION_NAME_RUNTIME: "Runtime Error",

        // These are for translating from one class name to another.
        // This is so externally it can have one name but internally it has another.
        TRANSLATE_CLASSES: {
                'array'  : 'QubyArray' ,
                'hash'   : 'QubyHash'  ,
                'object' : 'QubyObject'
        },
        
        // the name for block variables
        BLOCK_VARIABLE: '_q_block',

        TEMP_VARIABLE: '_t',
        
        // Prefix names appended to variables/functions/classes/etc to avoid name clahes.
        // Avoids clashes with each other, and with in-built JavaScript stuff.
        VARIABLE_PREFIX : '_var_'   ,
        FIELD_PREFIX    : '_field_' ,
        GLOBAL_PREFIX   : '_global_',
        FUNCTION_PREFIX : '_fun_'   ,
        CLASS_PREFIX    : '_class_' ,
        NEW_PREFIX      : '_new_'   ,
        SYMBOL_PREFIX   : '_sym_'   ,
        
        // Name of the root class that all classes extend.
        ROOT_CLASS_NAME : 'object',
        ROOT_CLASS_CALL_NAME : null, // see 'initialize'
        
        FIELD_NAME_SEPERATOR : '@',
        
        initialize: function() {
            quby.runtime.ROOT_CLASS_CALL_NAME = quby.runtime.formatClass(quby.runtime.ROOT_CLASS_NAME);
        },
        
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
        translateClassName: function (name) {
            var newName = quby.runtime.TRANSLATE_CLASSES[name.toLowerCase()];

            if (newName) {
                return newName;
            } else {
                return name;
            }
        },
        
        /**
         * Similar to translateClassName, but works in the opposite direction.
         * It goes from internal name, to external display name.
         * 
         * @param name The class name to reverse lookup.
         */
        untranslateClassName: function(name) {
            var searchName = name.toLowerCase();
            
            // Look to see if it's got a reverse translate name
            // Like QubyArray should just be Array
            for (var klass in quby.runtime.TRANSLATE_CLASSES) {
                var klassName = quby.runtime.TRANSLATE_CLASSES[klass];
                
                if ( searchName.toLowerCase() == klassName.toLowerCase() ) {
                    return util.string.capitalize( klass );
                }
            }
            
            // no reverse-lookup found : (
            return name;
        },

        // These are the core JavaScript prototypes that can be extended.
        // If a JavaScript prototype is not mentioned here (like Image) then
        // Quby will make a new class instead of using it.
        // If it is mentioned here then Quby will add to that classes Prototype.
        // (note that Object/QubyObject isn't here because it's not prototype extended).
        CORE_CLASSES: [
                'Number',
                'Boolean',
                'Function',
                'String',
                'Array',
                'Hash'
        ],

        isCoreClass: function (name) {
            var coreClasses = quby.runtime.CORE_CLASSES;

            for (var i = 0; i < coreClasses.length; i++) {
                if (name == coreClasses[i].toLowerCase()) {
                    return true;
                }
            }

            return false;
        },

        // 'this varaible' is a special variable for holding references to yourself.
        // This is so two functions can both refer to the same object.
        THIS_VARIABLE: "_this",

        getThisVariable: function (isInExtension) {
            if (isInExtension) {
                return 'this';
            } else {
                return quby.runtime.THIS_VARIABLE;
            }
        },

        /* ### RUNTIME ### */
        
        onError: null,
        
        logCallback: null,
        
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
        setLog: function( callback ) {
            if ( callback === undefined ) {
                quby.runtime.error( "Undefined given as function callback" );
            } else if ( ! callback ) {
                quby.runtime.logCallback = null;
            } else if ( typeof(callback) != 'function' ) {
                quby.runtime.error( "Callback set for logging is not function, null or false." );
            }
        },
        
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
        log: function() {
            // custom
            if ( quby.runtime.logCallback ) {
                quby.runtime.logCallback.apply( null, arguments );
            } else {
                var strOut = Array.prototype.join.call( arguments, ',' );
                
                // FireBug & Chrome
                if ( window.console && window.console.log ) {
                    window.console.log( strOut );
                } else {
                    var sent = false;
                    
                    // Mozilla error console fallback
                    try {
                        window.Components.classes[ "@mozilla.org/consoleservice;1" ].
                                getService( window.Components.interfaces.nsIConsoleService ).
                                logStringMessage( strOut );
                        
                        sent = true;
                    } catch ( ex ) {} // do nothing
                    
                    // generic default
                    if ( ! sent ) {
                        alert( strOut );
                    }
                }
            }
        },

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
        runCode: function (code, onError) {
            if (onError) {
                if (typeof (onError) != 'function') {
                    quby.runtime.error("onError", "onError must be a function.");
                }

                quby.runtime.onError = onError;
                code = 'try { ' + code + ' } catch ( err ) { quby.runtime.handleError(err); }';
            } else {
                quby.runtime.onError = null;
            }

            ( new Function( code ) ).call( null );
        },
        
        /**
        * If there is an onError error handler then the error is passed to this.
        * If there isn't then it is thrown upwards.
        * 
        * The onError must return true to stop the error from being thrown up!
        */
        handleError: function (err) {
            if ( ! err.isQuby ) {
                err.quby_message = quby.runtime.unformatString( err.message );
            } else {
                err.quby_message = err.message ;
            }
            
            if (quby.runtime.onError != null) {
                if (!quby.runtime.onError(err)) {
                    throw err;
                }
            } else {
                throw err;
            }
        },

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
        identifyObject: function (obj) {
            if (obj === null) {
                return "null";
            } else {
                var strConstructor = obj.constructor.toString();
                var funcNameRegex = /function ([a-zA-Z0-9_]{1,})\(/;
                var results = funcNameRegex.exec( strConstructor );
                
                if ( results && results.length > 1 ) {
                    var name = results[1];
                    
                    // if it's a Quby object, get it's name
                    if ( name.indexOf(quby.runtime.CLASS_PREFIX) === 0 ) {
                        name = name.substring(quby.runtime.CLASS_PREFIX.length);
                    } else {
                        name = quby.runtime.untranslateClassName( name );
                    }
                    
                    name = util.string.capitalize( name );
                    
                    return name;
                } else {
                    return "<unknown object>";
                }
            }
        },

        /**
        * Checks if the given object is one of the Quby inbuilt collections (such as QubyArray and QubyHash), and if not then an exception is thrown.
        * 
        * @param collection An collection to test for being a collection.
        * @return The collection given.
        */
        checkArray: function (collection, op) {
            if (collection instanceof QubyArray || collection instanceof QubyHash) {
                return collection;
            } else {
                this.runtimeError("Trying to " + op + " value on Array or Hash, but it's actually a " + quby.runtime.identifyObject(collection));
            }
        },

        /**
        * Creates a new Error object with the given name and message.
        * It is then thrown straight away. This method will not
        * return (since an exception is thrown within it).
        * 
        * @param name The name for the Error object to throw.
        * @param msg The message contained within the Error object thrown.
        * @return This should never return.
        */
        error: function (name, msg) {
            var errObj = new Error(msg);
            
            errObj.isQuby = true;
            errObj.name = name;
            
            throw errObj;
        },

        /**
        * Throws a standard Quby runtime error from within this function.
        * This method will not return as it will thrown an exception.
        * 
        * @param msg The message contained within the error thrown.
        * @return This should never return.
        */
        runtimeError: function (msg) {
            quby.runtime.error(quby.runtime.EXCEPTION_NAME_RUNTIME, msg);
        },

        /**
        * Throws the standard eror for when a stated field is not found.
        * 
        * @param name The name of the field that was not found.
        */
        fieldNotFoundError: function (obj, name) {
            var msg;
            var thisClass = quby.runtime.identifyObject( obj );
            
            if ( name.indexOf('@') > -1 ) {
                var parts = name.split( '@' );
                var field = parts[0];
                var fieldClass = parts[1];
                
                if ( fieldClass.toLowerCase() != thisClass.toLowerCase() ) {
                    msg =
                            "Field '" + field +
                            "' from class '" + fieldClass +
                            "' is illegally accessed from sub or super class '" + thisClass +
                            "'.";
                } else {
                    msg =
                            "Field '" + field +
                            "' is being accessed before being assigned to in class '" + thisClass +
                            "'.";
                }
            } else {
                msg =
                        "Field '" + name +
                        "' is being accessed before being assigned to in class '" + thisClass +
                        "'.";
            }
            
            quby.runtime.runtimeError( msg );
        },

        /**
        * Throws an error designed specifically for when a block is expected,
        * but was not present. It is defined here so that it can be called
        * manually by users from within their inlined JavaScript code.
        * 
        * This method will not return since it throws an exception.
        * 
        * @return This should never return.
        */
        missingBlockError: function () {
            this.runtimeError("Yield with no block present");
        },

        lookupMethodName: function(callName) {
            var methodName = window[quby.runtime.FUNCTION_TABLE_NAME][callName];
            
            // should never happen, but just in case...
            if ( methodName === undefined ) {
                methodName = callName;
            }
            
            return methodName;
        },
        
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
        notEnoughBlockParametersError: function (expected, got, type) {
            quby.runtime.runtimeError("Not enough parameters given for a " + type + ", was given: " + got + " but expected: " + expected);
        },

        methodMissingError: function (obj, callName, args, block) {
            var methodName = quby.runtime.lookupMethodName(callName);

            // check for methods with same name, but different parameters
            var callNameAlt = callName.replace(/_[0-9]+$/, "");
            for (var key in obj) {
                var keyCallName = key.toString();
                var mName = keyCallName.replace(/_[0-9]+$/, "");

                if (callNameAlt == mName) {
                    // take into account the noMethodStubs when searching for alternatives
                    // (skip the noMethod's)
                    var funs = window[quby.runtime.FUNCTION_DEFAULT_TABLE_NAME];
                    if ( !funs || (callName != keyCallName && funs[keyCallName] != obj[keyCallName]) ) {
                        quby.runtime.runtimeError("Method: '" + methodName + "' called with incorrect number of arguments (" + args.length + ") on object of type '" + quby.runtime.identifyObject(obj) + "'");
                    }
                }
            }
            
            quby.runtime.runtimeError("Unknown method '" + methodName + "' called with " + args.length + " arguments on object of type '" + quby.runtime.identifyObject(obj) + "'");
        },

        /**
        * This is a callback called when an unknown method is called at runtime.
        * 
        * @param methodName The name of hte method being called.
        * @param args The arguments for the method being called.
        */
        onMethodMissing: function (methodName, args) {
            quby.runtime.methodMissingError(this, methodName, args);
        },
        
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
        unformatString: function( str ) {
            str = str.replace(/\b[a-zA-Z0-9_]+\b/g, function(match) {
                // Functions
                // turn function from: '_fun_foo_1' => 'foo'
                if ( match.indexOf(quby.runtime.FUNCTION_PREFIX) === 0 ) {
                    match = match.substring( quby.runtime.FUNCTION_PREFIX.length );
                    return match.replace( /_[0-9]+$/, '' );
                // Fields
                // there are two 'field prefixes' in a field
                } else if ( match.indexOf(quby.runtime.FIELD_PREFIX === 0) && match.indexOf(quby.runtime.FIELD_PREFIX, 1) > -1 ) {
                    var secondFieldPrefixI = match.indexOf(quby.runtime.FIELD_PREFIX, 1);
                    var classBit = match.substring( 0, secondFieldPrefixI+quby.runtime.FIELD_PREFIX.length ),
                        fieldBit = match.substring( secondFieldPrefixI + quby.runtime.FIELD_PREFIX.length );
                    
                    // get out the class name
                    // remove the outer 'field_prefix' wrappings, at start and end
                    var wrappingFieldPrefixes = new RegExp( '(^' + quby.runtime.FIELD_PREFIX + quby.runtime.CLASS_PREFIX + ')|(' + quby.runtime.FIELD_PREFIX + '$)', 'g' );
                    classBit = classBit.replace( wrappingFieldPrefixes, '' );
                    classBit = util.string.capitalize( classBit );
                    
                    return classBit + '@' + fieldBit;
                // Classes & Constructors
                // must be _after_ fields
                } else if ( match.indexOf(quby.runtime.CLASS_PREFIX) === 0 ) {
                    match = match.replace( new RegExp('^' + quby.runtime.CLASS_PREFIX), '' );
                    
                    // Constructor
                    if ( match.indexOf(quby.runtime.NEW_PREFIX) > -1 ) {
                        var regExp = new RegExp( quby.runtime.NEW_PREFIX + '[0-9]+$' );
                        match = match.replace( regExp, '' );
                    }
                    
                    return quby.runtime.untranslateClassName( match );
                // Globals
                // re-add the $, to make it look like a global again!
                } else if ( match.indexOf(quby.runtime.GLOBAL_PREFIX) === 0 ) {
                    return '$' + match.substring(quby.runtime.GLOBAL_PREFIX.length);
                // Symbols
                // same as globals, but using ':' instead of '$'
                } else if ( match.indexOf(quby.runtime.SYMBOL_PREFIX) === 0 ) {
                    return ':' + match.substring(quby.runtime.SYMBOL_PREFIX.length);
                // Variables
                // generic matches, variables like '_var_bar'
                } else if ( match.indexOf(quby.runtime.VARIABLE_PREFIX) === 0 ) {
                    return match.substring(quby.runtime.VARIABLE_PREFIX.length);
                // just return it, but untranslate incase it's a 'QubyArray',
                // 'QubyObject', or similar internal class name
                } else {
                    return quby.runtime.untranslateClassName( match );
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
            var qubyArrTranslation = function(str, prefixPattern, onFind) {
                /**
                 * Searches for the closing bracket in the given string.
                 * It presumes the bracket is already open, when it starts to search.
                 * 
                 * It does bracket counting inside, to prevent it getting confused.
                 * It presumes the string is correctly-formed, but returns null if something goes wrong.
                 */
                var getClosingBracketIndex = function(str, startI) {
                    var openBrackets = 1;
                    
                    for ( var j = startI; j < str.length; j++ ) {
                        var c = str.charAt(j);
                        
                        if ( c === '(' ) {
                            openBrackets++;
                        } else if ( c === ')' ) {
                            openBrackets--;
                            
                            // we've found the closing bracket, so quit!
                            if ( openBrackets === 0 ) {
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
                var splitByRootCommas = function(str) {
                    var found = [],
                        startI = 0;
                    
                    var openBrackets = 0;
                    for ( var i = 0; i < str.length; i++ ) {
                        var c = str.charAt(i);
                        
                        if ( c === ',' && openBrackets === 0 ) {
                            found.push( str.substring(startI, i) );
                            // +1 to skip this comma
                            startI = i+1;
                        } else if ( c === '(' ) {
                            openBrackets++;
                        } else if ( c === ')' ) {
                            openBrackets--;
                        }
                    }
                    
                    // add everything left, after the last comma
                    found.push( str.substring(startI) );
                    
                    return found;
                };
                
                // Search through and try to do array translation as much, or often, as possible.
                var i = -1;
                while ( (i = str.indexOf(prefixPattern)) > -1 ) {
                    var openingI = i + prefixPattern.length;
                    var closingI = getClosingBracketIndex( str, openingI );
 
                    // something's gone wrong, just quit!
                    if ( closingI === null ) {
                        break;
                    }
                    
                    var pre = str.substring( 0, i ),
                        mid = str.substring( openingI, closingI ),
                        // +1 to skip the closing bracket of the 'quby_getCollection'
                        post = str.substring( closingI+1 );
                    
                    var parts = splitByRootCommas( mid );
                    
                    str = onFind( pre, parts, post );
                }
                
                return str;
            };
            
            // Translating: quby_getCollection( arr, i ) => arr[i]
            str = qubyArrTranslation( str, 'quby_getCollection(', function(pre, parts, post) {
                return pre + parts[0] + '[' + parts[1] + ']' + post;
            } );
            
            // Translating: quby_setCollection( arr, i, val ) => arr[i] = val
            str = qubyArrTranslation( str, 'quby_setCollection(', function(pre, parts, post) {
                return pre + parts[0] + '[' + parts[1] + '] = ' + parts[2] + post ;
            } );
            
            // This is to remove the 'null' blocks, passed into every function/constructor/method
            // need to remove the 'a( null )' first, and then 'a( i, j, k, null )' in a second sweep.
            str = str.replace( /\( *null *\)/g, '()' );
            str = str.replace( /, *null *\)/g, ')' );
            
            return str;
        },

        /**
        * Helper functions to be called from within inlined JavaScript and the parser
        * for getting access to stuff inside the scriptin language.
        * 
        * Variables should be accessed in the format: '_var_<name>' where <name> is the
        * name of the variable. All names are in lowercase.
        * 
        * For example: _var_foo, _var_bar, _var_foo_bar
        */
        formatVar: function (strVar) {
            return quby.runtime.VARIABLE_PREFIX + strVar.toLowerCase();
        },

        /**
        * @param strVar The variable name to format into the internal global callname.
        * @return The callname to use for the given variable in the outputted javascript.
        */
        formatGlobal: function (strVar) {
            return quby.runtime.GLOBAL_PREFIX + strVar.replace(/\$/g, '').toLowerCase();
        },

        /**
        * @param strClass The class name to format into the internal class callname.
        * @return The callname to use for the given class in the outputted javascript.
        */
        formatClass: function (strClass) {
            strClass = strClass.toLowerCase();
            var newName = quby.runtime.TRANSLATE_CLASSES[strClass];

            if (newName) {
                return newName;
            } else {
                return quby.runtime.CLASS_PREFIX + strClass;
            }
        },

        /**
        * @param strClass The class name for the field to format.
        * @param strVar The name of the field that is being formatted.
        * @return The callname to use for the given field.
        */
        formatField: function (strClass, strVar) {
            return quby.runtime.FIELD_PREFIX + quby.runtime.formatClass(strClass) + quby.runtime.FIELD_PREFIX + strVar.toLowerCase();
        },

        /**
        * A function for correctly formatting function names.
        * 
        * All function names are in lowercase. The correct format for a function name is:
        * '_fun_<name>_<numParameters>' where <name> is the name of the function and
        * <numParameters> is the number of parameters the function has.
        * 
        * For example: _fun_for_1, _fun_print_1, _fun_hasblock_0
        */
        formatFun: function (strFun, numParameters) {
            return quby.runtime.FUNCTION_PREFIX + strFun.toLowerCase() + '_' + numParameters;
        },

        /**
        * Formats a constructor name using the class name given and the stated
        * number of parameters. The class name should be the proper (pretty) class
        * name, not a formatted class name.
        * 
        * @param strKlass The class name of the constructor being formatted.
        * @param numParameters The number of parameters in the constructor.
        * @return The name for a constructor of the given class with the given number of parameters.
        */
        formatNew: function (strKlass, numParameters) {
            return quby.runtime.formatClass(strKlass) + quby.runtime.NEW_PREFIX + numParameters;
        },

        formatSymbol: function (sym) {
            return quby.runtime.SYMBOL_PREFIX + sym.toLowerCase();
        }
    };
})( quby, util );

quby.runtime.initialize();

/**
 * Standard core object that everything extends.
 */
function QubyObject() {
    // map JS toString to the Quby toString
};

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
function QubyArray( values ) {
    this.values = values || [];
}
if ( util.browser.isMozilla ) {
    QubyArray.prototype.set = function (key, value) {
        var index = key >> 0; // convert to int
        
        if ( index < 0 ) {
            quby.runtime.runtimeError( "Negative value given as array index: " + key );
        }
        
        while ( index > this.values.length ) {
            this.values[this.values.length] = null;
        }
        this.values[ index ] = value;
    };
} else {
    QubyArray.prototype.set = function (key, value) {
        var index = key >> 0; // convert to int
        
        if ( index < 0 ) {
            quby.runtime.runtimeError( "Negative value given as array index: " + key );
        }
        
        while ( index > this.values.length ) {
            this.values.push( null );
        }
        this.values[ index ] = value;
    };
}
QubyArray.prototype.get = function (key) {
    var index = key >> 0; // convert to int
    var len = this.values.length;
    
    if ( index < 0 ) {
        if ( -index > len ) {
            return null;
        } else {
            index = len+index;
        }
    } else if ( index >= len ) {
        return null;
    }
    
    return this.values[ index ];
};

/**
* 
* 
* @constructor
*/
function QubyHash() {
	this.values = [];
    
	for ( var i = 0, argsLen = arguments.length; i < argsLen; i += 2 ) {
        var key   = arguments[ i   ];
        var value = arguments[ i+1 ];
        
		this.set( key, value );
	}
	
	return this;
}
QubyHash.prototype.hash = function(val) {
    if ( val == null ) {
        return 0;
    } else if ( typeof(val) == 'string' ) {
        return val.length;
    } else {
        return val.toSource ? val.toSource().length : val.constructor.toString().length ;
    }
};
QubyHash.prototype.set = function (key, value) {
    var keyHash = this.hash( key );
    var vals = this.values[ keyHash ];
    
    if ( vals === undefined ) {
        this.values[ keyHash ] = [
                { key: key, value: value }
        ];
    } else {
        for ( var i = 0, valsLen = vals.length; i < valsLen; i++ ) {
            var node = vals[ i ];
            
            if ( node.key == key ) {
                node.value = value;
                return;
            }
        }
        
        vals.push(
                { key: key, value: value }
        );
    }
};
QubyHash.prototype.get = function (key) {
    var keyHash = this.hash( key );
    var vals = this.values[ keyHash ];
    
    if ( vals === undefined ) {
        return null;
    } else {
        for ( var i = 0, valsLen = vals.length; i < valsLen; i++ ) {
            var node = vals[ i ];
            
            if ( node.key == key ) {
                return node.value;
            }
        }
        
        return null;
    }
};
QubyHash.prototype.clone = function() {
    var copy = new QubyHash();

    for (var hash in this.values) {
        var keys = this.values[ hash ];
        copy.values[ hash ] = this.cloneKeys( keys );
    }
    
    return copy;
};
QubyHash.prototype.cloneKeys = function( keys ) {
    var newKeys = [];
    var keysLen = keys.length;
    
    for ( var i = 0; i < keysLen; i++ ) {
        var node = keys[i];
        newKeys.push( {
                key   : node.key,
                value : node.value
        } );
    }
    
    return newKeys;
};
QubyHash.prototype.each = function( fun ) {
    for (var hash in this.values) {
        var keys = this.values[ hash ];
        
        for ( var i = 0, len = keys.length; i < len; i++ ) {
            var node = keys[i];
            fun( node.key, node.value );
        }
    }
};
QubyHash.prototype.contains = function( key ) {
    var keyHash = this.hash( key );
    var vals = this.values[ keyHash ];
    
    if ( vals != undefined ) {
        for ( var i = 0, len = vals.length; i < len; i++ ) {
            if ( key == vals[ i ].key ) {
                return true;
            }
        }
    }
    
    return false;
};
QubyHash.prototype.remove = function( key ) {
    var keyHash = this.hash( key );
    var vals = this.values[ keyHash ];
    
    if ( vals != undefined ) {
        for ( var i = 0, len = vals.length; i < len; i++ ) {
            var node = vals[ i ];
            
            if ( key == node.key ) {
                vals.splice( i, 1 );
                
                // remove the empty hash array too
                if ( vals.length === 0 ) {
                    this.values.splice( keyHash, 1 );
                }
                
                return node.value;
            }
        }
    }
    
    return null;
};

(function( quby, util ) {
    /**
    * Syntax
    * 
    * Objects for defining the abstract syntax tree are defined
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
    quby.syntax = {
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
        EmptyStub: function( offset ) {
            this.offst = offset;
            this.validate = function(v){};
            this.print = function(p){};
        },
        
        /* 
         * These functions do the actual modifications to the class.
         * They alter the class structure, inserting new nodes to add more functionality.
         * 
         * They are run as methods of the FunctionGenerator prototype.
         * 
         * Add more here to have more class modifiers.
         */
        functionGeneratorFactories: {
            // prefix hard coded into these functions
            get: function( v, fun, param ) {
                return new quby.syntax.FunctionReadGenerator( fun, 'get', param );
            },
            set: function( v, fun, param ) {
                return new quby.syntax.FunctionWriteGenerator( fun, 'set', param );
            },
            getset: function( v, fun, param ) {
                return new quby.syntax.FunctionReadWriteGenerator( fun, 'get', 'set', param );
            },
            
            read: function( v, fun, param ) {
                return new quby.syntax.FunctionReadGenerator( fun, '', param );
            },
            write: function( v, fun, param ) {
                return new quby.syntax.FunctionWriteGenerator( fun, '', param );
            },
            attr: function( v, fun, param ) {
                return new quby.syntax.FunctionReadWriteGenerator( fun, '', '', param );
            }
        },
        
        /**
         * Class Modifiers are psudo-functions you can call within a class.
         * For example 'get x' to generate the method 'getX()'.
         */
        /*
         * Lookup the function generator, and then expand the given function into multiple function generators.
         * So get x, y, z becomes three 'get' generators; getX, getY and getZ.
         */
        getFunctionGenerator: function( v, fun ) {
            var name = fun.name.toLowerCase();
            var modifierFactory = quby.syntax.functionGeneratorFactories[ name ];
            
            if ( modifierFactory ) {
                var params = fun.parameters;
                
                // this is to avoid building a FactoryGenerators middle-man collection
                if ( params.length === 1 ) {
                    return modifierFactory( v, fun, params.stmts[0] );
                } else {
                    var generators = [];
                    
                    // sort the good parameters from the bad
                    // they must all be Varaibles
                    params.each(function(p) {
                        generators.push( modifierFactory(v, fun, p) );
                    });
                
                    if ( generators.length > 0 ) {
                        return new quby.syntax.TransparentList( generators );
                    } else {
                        return new quby.syntax.EmptyStub();
                    }
                }
            } else {
                return null;
            }
        },
        
        Syntax: function (offset) {
            this.offset = offset;
            this.print = function (printer) {
                quby.runtime.error("Internal", "Error, print has not been overridden");
            };
            
            /**
             * Helper print function, for printing values in an if, while or loop condition.
             * When called, this will store the result in a temporary variable, and test against
             * Quby's idea of false ('false' and 'null').
             */
            this.printAsCondition = function (p) {
                p.appendPre( 'var ', quby.runtime.TEMP_VARIABLE, ';' );
                
                p.append('((', quby.runtime.TEMP_VARIABLE, '=');
                this.print(p);
                p.append(') !== null && ', quby.runtime.TEMP_VARIABLE, ' !== false)');
                
                // needed to prevent memory leaks
                p.appendPost( 'delete ', quby.runtime.TEMP_VARIABLE, ';' );
            };
            
            this.validate = function (v) {
                quby.runtime.error("Internal", "Error, validate has not been overridden");
            };
        },
        
        /**
         * The most basic type of statement list.
         * Just wraps an array of statements,
         * and passes the calls to validate and print on to them.
         */
        TransparentList: function ( stmts ) {
            this.validate = function(v) {
                for ( var i = 0; i < stmts.length; i++ ) {
                    stmts[i].validate( v );
                }
            };
            
            this.print = function(p) {
                for ( var i = 0; i < stmts.length; i++ ) {
                    stmts[i].print( p );
                    p.endStatement();
                }
            };
        },

        SyntaxList: function (strSeperator, appendToLast) {
            this.stmts = [];
            this.seperator = strSeperator;
            this.offset = null;
            this.length = 0;

            this.add = function (stmt) {
                this.ensureOffset( stmt );
                this.stmts.push(stmt);
                this.length++;
            };
            this.unshift = function(stmt) {
                this.ensureOffset( stmt );
                this.stmts.unshift( stmt );
                this.length++;
            };
            this.ensureOffset = function(stmt) {
                if ( !this.offset ) {
                    this.offset = stmt.offset;
                }
            };
            this.print = function (p) {
                var length = this.stmts.length;

                for (var i = 0; i < length; i++) {
                    this.stmts[i].print(p);

                    if (appendToLast || i < length - 1) {
                        p.append(this.seperator);
                    }
                }
            };

            this.validate = function (v) {
                for (var i = 0; i < this.stmts.length; i++) {
                    this.stmts[i].validate(v);
                }
            };
            
            this.each = function( fun ) {
                for ( var i = 0; i < this.stmts.length; i++ ) {
                    fun( this.stmts[i] );
                }
            };
        },

        Statements: function () {
            quby.syntax.SyntaxList.call(this, '', false);

            this.print = function (p) {
                p.printArray( this.stmts );
            };
        },

        Parameters: function () {
            quby.syntax.SyntaxList.call(this, ',', false);

            this.blockParam = null;
            this.errorParam = null;
            this.blockParamPosition = -1;

            // Override the add so that block parameters are stored seperately from
            // other parameters.
            this.old_add = this.add;
            this.add = function (param) {
                if (param.isBlockParam) {
                    this.setBlockParam(param);
                } else {
                    this.old_add(param);
                }
            };
            this.addFirst = function (param) {
                if (param.isBlockParam) {
                    this.setBlockParam(param);
                } else {
                    this.old_add(param);
                    this.stmts.pop();
                    this.stmts.unshift(param);
                }
            };

            /**
            * Sets the block parameter for this set of parameters.
            * This can only be set once, and no more parameters should be set after
            * this has been called.
            * 
            * @param blockParam A block parameter for this set of parameters.
            */
            this.setBlockParam = function (blockParam) {
                // You can only have 1 block param.
                // If a second is given, store it later for a validation error.
                if (this.blockParam != null) {
                    this.errorParam = blockParam;
                } else {
                    this.blockParam = blockParam;
                    // Record the position so we can check if it's the last parameter or not.
                    this.blockParamPosition = this.stmts.length;
                }
            };
            this.getBlockParam = function () {
                return this.blockParam;
            };
            this.old_validate = this.validate;
            this.validate = function (v) {
                if (this.blockParam != null) {
                    if (this.errorParam != null) {
                        v.parseError(this.errorParam.offset, "Only one block parameter is allowed.");
                    } else if (this.blockParamPosition < this.stmts.length) {
                        v.parseError(this.bockParam.offset, "Block parameter must be the last parameter.");
                    }
                }

                this.old_validate(v);
                
                if (this.blockParam != null) {
                    this.blockParam.validate(v);
                }
            };
        },

        Mappings: function () {
            return quby.syntax.SyntaxList.call(this, ',', false);
        },
        Mapping: function (left, right) {
            quby.syntax.Op.call(this, left, right, "&&");
            this.print = function (p) {
                this.left.print(p);
                p.append(',');
                this.right.print(p);
            };
        },

        StmtBlock: function (condition, stmts) {
            if (condition != null) {
                quby.syntax.Syntax.call(this, condition.offset);
            } else {
                quby.syntax.Syntax.call(this, stmts.offset);
            }

            this.condition = condition;
            this.stmts = stmts;
            this.validate = function (v) {
                if (this.condition != null) {
                    this.condition.validate(v);
                }

                this.stmts.validate(v);
            };
        },

        IfStmt: function (ifs, elseIfs, elseBlock) {
            quby.syntax.Syntax.call(this, ifs.offset);
            this.ifStmts = ifs;
            this.elseIfStmts = elseIfs;
            this.elseStmt = elseBlock;

            this.validate = function (v) {
                this.ifStmts.validate(v);

                if (this.elseIfStmts != null) {
                    this.elseIfStmts.validate(v);
                }

                if (this.elseStmt != null) {
                    this.elseStmt.validate(v);
                }
            };

            this.print = function (p) {
                this.ifStmts.print(p);

                if (this.elseIfStmts != null) {
                    p.append('else ');
                    this.elseIfStmts.print(p);
                }

                if (this.elseStmt != null) {
                    p.append('else{');
                    this.elseStmt.print(p);
                    p.append('}');
                }
            };
        },

        IfElseIfs: function () {
            quby.syntax.SyntaxList.call(this, 'else ', false);

            this.validate = function (v) {
                for (var i = 0; i < this.stmts.length; i++) {
                    this.stmts[i].validate(v);
                }
            };
        },

        IfBlock: function (condition, stmts) {
            quby.syntax.StmtBlock.call(this, condition, stmts);

            this.print = function (p) {
                p.append('if(');
                this.condition.printAsCondition(p)
                p.append('){').flush();
                this.stmts.print(p);
                p.append('}');
            };
        },

        WhileLoop: function (condition, stmts) {
            quby.syntax.StmtBlock.call(this, condition, stmts);

            this.print = function (p) {
                p.append('while(');
                condition.printAsCondition(p);
                p.append('){').flush();
                stmts.print(p);
                p.append('}');
            };
        },

        UntilLoop: function (condition, stmts) {
            quby.syntax.StmtBlock.call(this, condition, stmts);

            this.print = function (p) {
                p.append('while(!(');
                condition.printAsCondition(p);
                p.append(')){').flush();
                stmts.print(p);
                p.append('}');
            };
        },

        LoopWhile: function (condition, stmts) {
            quby.syntax.StmtBlock.call(this, condition, stmts);

            this.print = function (p) {
                // flush isn't needed here,
                // because statements on the first line will always take place
                p.append('do{');
                stmts.print(p);
                p.append('}while(');
                condition.printAsCondition(p);
                p.append(')');
            };
        },

        LoopUntil: function (condition, stmts) {
            quby.syntax.StmtBlock.call(this, condition, stmts);

            this.print = function (p) {
                p.append('do{');
                stmts.print(p);
                p.append('}while(!(');
                condition.printAsCondition(p);
                p.append('))');
            };
        },

        /**
        * This describes the signature of a class. This includes information
        * such as this classes identifier and it's super class identifier.
        */
        ClassHeader: function (identifier, extendsId) {
            quby.syntax.Syntax.call(this, identifier.offset);

            if (extendsId == null) {
                this.extendsCallName = quby.runtime.ROOT_CLASS_CALL_NAME;
                this.extendsName = quby.runtime.ROOT_CLASS_NAME;
            } else {
                this.extendsCallName = quby.runtime.formatClass(extendsId.value);
                this.extendsName = extendsId.value;
            }

            this.classId = identifier;
            this.extendId = extendsId;
            this.value = identifier.value;

            this.validate = function (v) {
                var name = this.classId.lower;

                if (this.hasSuper()) {
                    var extendName = this.extendId.lower;
                    var extendStr = this.extendId.value;

                    if (name == extendName) {
                        v.parseError(this.offset, "Class '" + this.value + "' is extending itself.");
                    } else if (quby.runtime.isCoreClass(name)) {
                        v.parseError(this.offset, "Core class '" + this.value + "' cannot extend alternate class '" + extendStr + "'.");
                    } else if (quby.runtime.isCoreClass(extendName)) {
                        v.parseError(this.offset, "Class '" + this.value + "' cannot extend core class '" + extendStr + "'.");
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
            this.hasSuper = function () {
                return this.extendId != null;
            };

            /** 
            * Returns the call name for the super class to this class header.
            */
            this.getSuperCallName = function () {
                return this.extendsCallName;
            };

            /**
            * Returns the name of the super class to this class header.
            */
            this.getSuperName = function () {
                return this.extendsName;
            };
        },

        /**
        * TODO
        */
        ModuleDefinition: function (name, statements) {
            quby.syntax.Syntax.call(this, name.offset);

            this.print = function (p) {
            };
            this.validate = function (v) {
            };
        },

        ClassDefinition: function (name, statements) {
            // Originally hash-classes were defined using special syntax,
            // hence why there is this if here.

            // Extension class
            if (quby.runtime.isCoreClass(name.classId.lower)) {
                return new quby.syntax.ExtensionClassDefinition(name, statements);
                // Quby class
            } else {
                quby.syntax.Syntax.call(this, name.offset);

                this.header = name;
                this.name = name.value;
                this.statements = statements;
                this.callName = quby.runtime.formatClass(name.value);

                this.classValidator = null;
                this.validate = function (v) {
                    v.ensureOutFun(this, "Class '" + this.name + "' defined within a function, this is not allowed.");
                    v.ensureOutBlock(this, "Class '" + this.name + "' defined within a block, this is not allowed.");

                    // validator stored for printing later (validation check made inside)
                    this.classValidator = v.setClass(this);
                    this.header.validate(v);
                    this.statements.validate(v);

                    v.unsetClass();
                };

                this.print = function (p) {
                    return this.classValidator.printOnce(p);
                };

                this.getHeader = function () {
                    return this.header;
                };

                /**
                * This returns it's parents callName, unless this does not have
                * a parent class (such as if this is the root class).
                * 
                * Then it will return null.
                * 
                * @return The callName for the parent class of this class.
                */
                this.getSuperCallName = function () {
                    var superCallName = this.header.getSuperCallName();
                    if (superCallName == this.callName) {
                        return null;
                    } else {
                        return superCallName;
                    }
                };
            }
        },

        /**
        * Extension Classes are ones that extend an existing prototype.
        * For example Number, String or Boolean.
        * 
        * This also includes the extra Quby prototypes such as Array (really QubyArray)
        * and Hash (which is really a QubyHash).
        */
        ExtensionClassDefinition: function (name, statements) {
            quby.syntax.Syntax.call(this, name.offset);

            this.name = name.value;
            this.header = name;
            this.callName = quby.runtime.formatClass(name.value);
            this.statements = statements;
            this.isExtensionClass = true;

            this.print = function (p) {
                p.setCodeMode(false);
                p.appendExtensionClassStmts(this.name, this.statements.stmts);
                p.setCodeMode(true);
            };

            this.validate = function (v) {
                v.ensureOutClass(this, "Classes cannot be defined within another class.");

                v.setClass(this);
                this.header.validate(v);
                this.statements.validate(v);
                v.unsetClass();
            };

            /* 
            * The parent class of all extension classes is the root class,
            * always.
            */
            this.getSuperCallName = function () {
                return quby.runtime.ROOT_CLASS_CALL_NAME;
            };
        },

        /** 
         * Defines a constructor for a class.
         */
        Constructor: function (sym, parameters, stmtBody) {
            quby.syntax.Function.call(this, sym, parameters, stmtBody);

            this.isConstructor = true;
            this.className = '';
            this.klass = null;

            this.setClass = function (klass) {
                this.klass = klass;
                
                this.callName = quby.runtime.formatNew(klass.name, this.getNumParameters());
                
                this.className = klass.callName;
            };
            
            var oldValidate = this.validate;
            this.validate = function (v) {
                if ( v.ensureInClass(this, "Constructors must be defined within a class.") ) {
                    this.setClass( v.getCurrentClass().klass );

                    this.isExtensionClass = v.isInsideExtensionClass();
                    if ( this.isExtensionClass ) {
                        v.ensureAdminMode( this, "Cannot add constructor to core class: '" + v.getCurrentClass().klass.name + "'" );
                    }
                    
                    v.setInConstructor(true);
                    oldValidate.call(this, v);
                    v.setInConstructor(false);
                }
            };

            this.printParameters = function (p) {
                p.append('(');
                
                if ( ! this.isExtensionClass ) {
                    p.append( quby.runtime.THIS_VARIABLE, ',' );
                }

                if ( this.parameters.length > 0 ) {
                    this.parameters.print(p);
                    p.append(',');
                }
                
                p.append( quby.runtime.BLOCK_VARIABLE, ')' );
            };
            this.printBody = function (p) {
                p.append('{');

                this.printPreVars(p);
                p.endStatement();
                
                this.stmtBody.print(p);

                if ( ! this.isExtensionClass ) {
                    p.append('return ', quby.runtime.THIS_VARIABLE, ';');
                }
                
                p.append( '}' );
            };
        },
        
        /**
         * Defines a function or method definition.
         */
        Function: function (name, parameters, stmtBody) {
            quby.syntax.Syntax.call(this, name.offset);

            this.isMethod = false;
            this.name = name.value;
            this.parameters = parameters;
            this.blockParam = parameters.getBlockParam();
            this.stmtBody = stmtBody;
            this.callName = quby.runtime.formatFun(name.value, parameters.length);

            this.preVariables = [];

            this.addPreVariable = function (variable) {
                this.preVariables.push(variable);
            };

            this.validate = function (v) {
                this.isMethod = v.isInsideClass();

                var isOutFun = true;
                if (v.isInsideFun()) {
                    var otherFun = v.getCurrentFun();
                    var strOtherType = ( otherFun.isMethod ? "method" : "function" );

                    v.parseError(this.offset, "Function '" + this.name + "' is defined within " + strOtherType + " '" + otherFun.name + "', this is not allowed.");
                    isOutFun = false;
                } else {
                    var strType = (this.isMethod ? "Method" : "Function");
                    
                    v.ensureOutBlock(this, strType + " '" + this.name + "' is within a block, this is not allowed.");
                }

                if ( isOutFun ) {
                    v.defineFun(this);
                    v.pushFunScope(this);
                }

                v.setParameters(true, true);
                this.parameters.validate(v);
                v.setParameters(false);
                this.stmtBody.validate(v);

                if (isOutFun) {
                    v.popScope();
                }
            };

            this.print = function (p) {
                if (!this.isMethod) {
                    p.setCodeMode(false);
                }

                if (this.isMethod && !this.isConstructor) {
                    p.append(this.callName, '=function');
                } else {
                    p.append('function ', this.callName);
                }

                this.printParameters(p);
                this.printBody(p);

                if (!this.isMethod) {
                    p.setCodeMode(true);
                }
            };
            this.printParameters = function (p) {
                p.append('(');
                if (this.parameters.length > 0) {
                    this.parameters.print(p);
                    p.append(',');
                }
                
                p.append( quby.runtime.BLOCK_VARIABLE, ')');
            };
            this.printBody = function (p) {
                p.append('{');

                this.printPreVars(p);
                p.flush();

                this.stmtBody.print(p);
                // all functions must guarantee they return something...
                p.append('return null;', '}');
            };
            this.printPreVars = function (p) {
                /* Either pre-print all local vars + the block var,
                 * or print just the block var. */
                if ( this.preVariables.length > 0 ) {
                    p.append( 'var ' );
                    
                    for (var i = 0; i < this.preVariables.length; i++) {
                        if ( i > 0 ) {
                            p.append(',');
                        }
                        
                        var variable = this.preVariables[i];
                        p.append(variable.callName, '=null');
                    }
                    
                    if ( this.blockParam != null ) {
                        p.append(',');
                        this.blockParam.print( p );
                        p.append( '=', quby.runtime.BLOCK_VARIABLE, ';' );
                    }
                    
                    p.endStatement();
                } else if ( this.blockParam != null ) {
                    p.append( 'var ' );
                    this.blockParam.print( p );
                    p.append( '=', quby.runtime.BLOCK_VARIABLE, ';' );
                }
            };

            this.getNumParameters = function () {
                return this.parameters.length;
            };
        },
        
        /**
         * The base FunctionGenerator prototype. This does basic checks to ensure
         * the function we want to create actually exists.
         *  
         * It handles storing common items.
         */
        FunctionGenerator: function( obj, methodName, numParams ) {
            this.obj = obj;
            this.offset = obj.offset;
            
            this.klass = null;
            
            // the name of this modifier, i.e. read, write, attr, get, set, getset
            this.modifierName = obj.name;
            
            // flag used for checking if it's a generator,
            // only used inside this FunctionGenerator
            this.isGenerator = true;
            
            // the name of the method this generates
            this.name = methodName;
            this.callName = quby.runtime.formatFun( methodName, numParams );
            
            /* This validation code relies on the fact that when a function
             * is defined on a class, it becomes the current function for that
             * callname, regardless of if it's a diplicate function or not.
             */
            this.validate = function(v) {
                this.klass = v.getCurrentClass();
                
                // checks for duplicate before this get
                if ( this.validateNameClash(v) ) {
                    v.defineFun( this );
                    v.pushFunScope( this );

                    this.validateInside( v );
                    
                    v.popScope();
                    
                    var _this = this;
                    v.onEndValidate( function(v) { _this.onEndValidate(v); } );
                }
            };
            
            this.getNumParameters = function() {
                return numParams;
            };
            
            this.onEndValidate = function(v) {
                this.validateNameClash( v );
            };
            
            this.validateInside = function(v) {
                // do nothing
            };
            
            this.validateNameClash = function( v ) {
                var currentFun = this.klass.getFun( this.callName );
                
                if ( currentFun !== null && currentFun !== this ) {
                    // Give an error message depending on if we are
                    // dealing with a colliding modifier or function.
                    var errMsg = ( currentFun.isGenerator ) ?
                            "'" + this.modifierName + "' modifier in class '" + this.klass.klass.name + "' clashes with modifier '" + currentFun.modifierName + '", for generating: "' + this.name + '" method' :
                            "'" + this.modifierName + "' modifier in class '" + this.klass.klass.name + "' clashes with defined method: '" + this.name + '"' ;
                    
                    v.parseError( this.offset, errMsg );
                    
                    return false;
                } else {
                    return true;
                }
            };
        },
        
        FunctionAttrGenerator: function (obj, methodName, numParams, fieldObj, proto) {
            var fieldName;
            if ( fieldObj instanceof quby.syntax.Variable || fieldObj instanceof quby.syntax.FieldVariable ) {
                fieldName = fieldObj.identifier;
            } else if ( fieldObj instanceof quby.syntax.Symbol ) {
                fieldName = fieldObj.value;
            } else {
                fieldName = null;
            }
            
            var fullName = fieldName ? ( methodName + util.string.capitalize(fieldName) ) : methodName ;
            
            // doesn't matter if fieldName is null for this, as it will be invalid laterz
            quby.syntax.FunctionGenerator.call( this, obj, fullName, numParams );
            
            // the name of our field, null if invalid
            this.fieldName = fieldName;
            this.fieldObj = fieldObj;
            
            // this is our fake field
            this.field = null;
            
            var oldValidate = this.validate;
            this.validate = function(v) {
                if ( this.fieldName !== null ) {
                    oldValidate.call( this, v );
                } else {
                    v.parseError( this.fieldObj.offset, " Invalid parameter for generating '" + this.name + "' method" );
                }
            };
            
            this.validateInside = function(v) {
                this.field = new proto( new quby.lexer.EmptyIdSym(this.offset, this.fieldName) );
                this.field.validate( v );
            };
        },
        
        FunctionReadGenerator: function (obj, methodPrefix, field) {
            var FieldVariable2 = function(id) {
                quby.syntax.FieldVariable.call( this, id );
                this.validateField = function(v) { }; // we do this check ourselves later
            };
            
            quby.syntax.FunctionAttrGenerator.call( this, obj, methodPrefix, 0, field, FieldVariable2 );
            
            var oldOnEndValidate = this.onEndValidate;
            this.onEndValidate = function(v) {
                oldOnEndValidate.call( this, v );
                
                if ( this.field ) {
                    if ( ! this.klass.hasFieldCallName(this.field.callName) ) {
                        v.parseError( this.offset, "Field '" + this.field.identifier + "' never written to in class '" + this.klass.klass.name + "' for generating method " + this.name );
                    }
                }
            };
            
            /*
             * This will be a method.
             */
            this.print = function(p) {
                if ( this.field ) {
                    p.append(this.callName, '=function(){return ');
                    this.field.print( p );
                    p.append(';}');
                }
            };
        },
        
        FunctionWriteGenerator: function (obj, methodPrefix, field) {
            quby.syntax.FunctionAttrGenerator.call( this,
                    obj, methodPrefix, 1, field,
                    quby.syntax.FieldVariableAssignment
            );
            
            var oldOnEndValidate = this.onEndValidate;
            this.onEndValidate = function(v) {
                oldOnEndValidate.call( this, v );
                
                if ( this.field ) {
                    if ( ! this.klass.hasFieldCallName(this.field.callName) ) {
                        v.parseError( this.offset, "Field '" + this.field.identifier + "' never written to in class '" + this.klass.klass.name + "' for generating method " + this.name );
                    }
                }
            };
            
            /*
             * This will be a method.
             */
            this.print = function(p) {
                if ( this.field ) {
                    p.append(this.callName, '=function(t){return ');
                        this.field.print( p );
                        p.append('=t;');
                    p.append('}');
                }
            };
        },
        
        FunctionReadWriteGenerator: function( obj, getPre, setPre, fieldObj ) {
            this.getter = new quby.syntax.FunctionReadGenerator( obj, getPre, fieldObj );
            this.setter = new quby.syntax.FunctionWriteGenerator( obj, setPre, fieldObj );
            
            this.validate = function( v ) {
                this.getter.validate( v );
                this.setter.validate( v );
            };
            
            this.print = function( p ) {
                this.getter.print( p );
                this.setter.print( p );
            };
        },

        AdminMethod: function (name, parameters, stmtBody) {
            quby.syntax.Function.call(this, name, parameters, stmtBody);

            this.callName = this.name;

            this.old_validate = this.validate;
            this.validate = function (v) {
                v.ensureAdminMode(this, "Admin (or hash) methods cannot be defined without admin rights.");

                if (v.ensureInClass(this, "Admin methods can only be defined within a class.")) {
                    this.old_validate(v);
                }
            }
        },
        
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
        FunctionCall: function (name, parameters, block) {
            quby.syntax.Syntax.call(this, name.offset);

            this.name = name.value;
            this.parameters = parameters;
            this.callName = quby.runtime.formatFun(name.value, parameters.length);
            this.block = block;
            this.functionGenerator = null;

            this.print = function (p) {
                if ( this.functionGenerator ) {
                    this.functionGenerator.print(p);
                } else {
                    if ( this.isMethod ) {
                        p.append(quby.runtime.getThisVariable(this.isInsideExtensionClass), '.');
                    }

                    this.printFunCall(p);
                }
            };
            this.printFunCall = function (p) {
                p.append(this.callName, '(');
                this.printParams(p);
                p.append(')');
            };
            this.printParams = function (p) {
                // parameters
                if (this.getNumParameters() > 0) {
                    this.parameters.print(p);
                    p.append(',');
                }

                // block parameter
                if (this.block != null) {
                    this.block.print(p);
                } else {
                    p.append('null');
                }
            };

            this.setIsMethod = function () {
                this.isMethod = true;
            };
            
            /**
             * This FunctionCall needs to declare it's self to the Validator,
             * so the Validator knows it exists. This is done in this call,
             * so it's detached from validating paramters and blocks.
             * 
             * In practice, this means you can put your call to validate this as a method,
             * a 'this.method', or something else, by changing this method.
             * 
             * By default, this states this is a function.
             */
            this.validateThis = function(v) {
                v.useFun(this);
            };
            
            this.validate = function (v) {
                var generator = null;
                
                if ( v.isInsideClassDefinition() ) {
                    this.functionGenerator = generator = quby.syntax.getFunctionGenerator( v, this );
                    
                    if ( generator === null ) {
                        v.parseError(this.offset, "Function '" + this.name + "' called within definition of class '" + v.getCurrentClass().klass.name + "', this is not allowed.");
                    } else if ( block !== null ) {
                        v.parseError(this.offset, "'" + this.name + "' modifier of class '" + v.getCurrentClass().klass.name + "', cannot use a block.");
                    } else {
                        generator.validate( v );
                    }
                    
                    return false;
                } else {
                    this.parameters.validate(v);
                    this.isInsideExtensionClass = v.isInsideExtensionClass();
                    
                    this.validateThis( v );
    
                    if (this.block != null) {
                        this.block.validate(v);
                    }
                }
            };

            this.getNumParameters = function () {
                return parameters.length;
            };
        },

        MethodCall: function (expr, name, parameters, block) {
            quby.syntax.FunctionCall.call(this, name, parameters, block);

            this.isMethod = true;
            this.expr = expr;

            this.old_print = this.print;
            this.print = function (p) {
                if (this.expr.isThis) {
                    this.old_print(p);
                } else {
                    this.printExpr(p);
                    p.append('.');
                    this.printFunCall(p);
                }
            };
            this.printExpr = function(p) {
                var e = this.expr;
                
                if ( e.isLiteral ) {
                    p.append( '(' );
                    e.print( p );
                    p.append( ')' );
                } else {
                    e.print( p );
                }
            };
            
            this.validateThis = function(v) {
                if ( this.expr.isThis && v.isInsideClass() ) {
                    v.useThisClassFun(this);
                } else {
                    v.useFun( this );
                }
            };

            var old_validate = this.validate;
            this.validate = function (v) {
                this.expr.validate(v);
                old_validate.call(this, v);
            };
        },

        SuperCall: function (name, parameters, block) {
            quby.syntax.FunctionCall.call(this, name, parameters, block);

            this.print = function (p) {
                if (this.superKlassVal != undefined) {
                    var superKlass = this.superKlassVal.klass.name;
                    var superConstructor = quby.runtime.formatNew(superKlass, this.getNumParameters());

                    p.append(superConstructor, '(', quby.runtime.THIS_VARIABLE, ',');
                    this.printParams(p);
                    p.append(')');
                }
            };
            
            this.validate = function (v) {
                if ( v.ensureInConstructor(this, "Super can only be called from within a constructor.") ) {
                    this.klassVal = v.getCurrentClass();

                    // _this fixes alias issues within the callback
                    var _this = this;

                    v.onEndValidate(function (v) {
                        var header = _this.klassVal.klass.getHeader();
                        var superCallName = header.getSuperCallName();
                        _this.superKlassVal = v.getClass(superCallName);

                        if (_this.superKlassVal == undefined) {
                            if (!quby.runtime.isCoreClass(header.getSuperName().toLowerCase())) {
                                v.parseError(_this.offset, "Calling super to a non-existant super class: '" + _this.klassVal.klass.getHeader().getSuperName() + "'.");
                            }
                        } else if (!_this.superKlassVal.hasNew(_this)) {
                            var superName = _this.superKlassVal.klass.name;
                            v.parseError(_this.offset, "No constructor found with " + _this.getNumParameters() + " parameters for super class: '" + superName + "'.");
                        }
                    });
                }
                this.parameters.validate(v);
                if (this.block != null) {
                    this.block.validate(v);
                }
            };
        },

        NewInstance: function (name, parameters, block) {
            quby.syntax.FunctionCall.call(this, name, parameters, block);

            this.className = quby.runtime.formatClass( name.value );
            this.callName = quby.runtime.formatNew(name.value, this.getNumParameters());

            this.print = function (p) {
                p.append( this.callName, '(' );
                
                // if a standard class,
                // make a new empty object and pass it in as the first parameter
                if ( ! this.isExtensionClass ) {
                    p.append('new ', this.className, '(),');
                }

                this.printParams(p);

                p.append(')');
            };

            this.validate = function (v) {
                this.parameters.validate(v);
                
                if ( this.block !== null ) {
                    this.block.validate(v);
                }

                // this can only be validated after the classes have been fully defined
                var _this = this;
                v.onEndValidate(function (v) {
                    var klassVal = v.getClass(_this.className);

                    if ( klassVal ) {
                        if (
                               (!klassVal.hasNew(_this))
                            || (klassVal.noNews() && _this.getNumParameters() > 0)
                        ) {
                            var klass = klassVal.klass;
                            
                            if ( klassVal.noNews() && klass.isExtensionClass ) {
                                v.parseError(_this.offset, "Cannot manually create new instances of '" + klass.name + "', it doesn't have a constructor.");
                            } else {
                                v.parseError(_this.offset, "Called constructor for class '" + klass.name + "' with wrong number of parameters: " + _this.getNumParameters());
                            }
                        } else {
                            _this.isExtensionClass = klassVal.klass.isExtensionClass;
                        }
                    } else {
                        v.parseError(_this.offset, "Making new instance of undefined class: '" + _this.name);
                    }
                });
            };
        },

        ReturnStmt: function (expr) {
            quby.syntax.Syntax.call(this, expr.offset);

            this.expr = expr;
            this.print = function (p) {
                p.append('return ');
                this.expr.print(p);
            };
            this.validate = function (v) {
                if (!v.isInsideFun() && !v.isInsideBlock()) {
                    v.parseError(this.offset, "Return cannot be used outside a function or a block.");
                }

                this.expr.validate(v);
            };
        },

        YieldStmt: function (args) {
            quby.syntax.Syntax.call(this, args.offset);

            this.parameters = args;
            this.validate = function (v) {
                v.ensureInFun(this, "Yield can only be used from inside a function.");
                this.parameters.validate(v);
            };
            this.print = function (p) {
                p.appendPre('quby_ensureBlock(', quby.runtime.BLOCK_VARIABLE, ', ', this.parameters.length, ');');
                p.append(quby.runtime.BLOCK_VARIABLE, '(');
                    this.parameters.print(p);
                p.append(')');
            };
        },

        FunctionBlock: function (parameters, statements) {
            quby.syntax.Syntax.call(this, parameters.offset);

            this.parameters = parameters;
            this.stmtBody = statements;

            this.print = function (p) {
                p.append('function(');
                this.parameters.print(p);
                p.append('){').flush();

                this.stmtBody.print(p);
                p.append(
                        'return null;',
                        '}'
                );
            };

            this.validate = function (v) {
                v.pushBlockScope();
                v.setParameters(true, false);
                this.parameters.validate(v);
                v.setParameters(false);
                this.stmtBody.validate(v);
                v.popScope();
            };

            this.getNumParameters = function () {
                return this.parameters.length;
            };
        },
        
        Lambda: function (parameters, statements) {
            quby.syntax.FunctionBlock.call( this, parameters, statements );
            
            var oldPrint = this.print;
            this.print = function(p) {
                p.append('(');
                oldPrint.call( this, p );
                p.append(')');
            }
        },

        /**
         * @param offset The source code offset for this Expr.
         * @param isResultBool An optimization flag. Pass in true if the result of this Expression will always be a 'true' or 'false'. Optional, and defaults to false.
         */
        Expr: function (offset, isResultBool) {
            quby.syntax.Syntax.call(this, offset);
            
            this.isResultBool = (!! isResultBool);
            
            var oldPrintAsCondition = this.printAsCondition;
            this.printAsCondition = function (p) {
                if ( this.isResultBool ) {
                    this.print(p);
                } else {
                    oldPrintAsCondition.call( this, p );
                }
            };
            
            return this;
        },

        SingleOp: function (expr, strOp, isResultBool) {
            quby.syntax.Expr.call(this, expr.offset, isResultBool);

            this.expr = expr;
            this.validate = function (v) {
                this.expr.validate(v);
            };
            this.print = function (p) {
                p.append('(', strOp);
                this.expr.print(p);
                p.append(')');
            };
        },

        SingleSub: function (expr) {
            quby.syntax.SingleOp.call(this, expr, "-");
            return this;
        },

        Not: function (expr) {
            quby.syntax.SingleOp.call(this, expr, "!", true);
            
            this.print = function(p) {
                var temp = p.getTempVariable();
                
                p.appendPre('var ', temp, ';');
                
                p.append('(((', temp, '=');
                this.expr.print(p);
                p.append(') === null || ', temp, ' === false) ? true : false)');
                
                // needed to prevent memory leaks
                p.appendPost('delete ', temp, ';');
            };
            
            return this;
        },

        Op: function (left, right, strOp, isResultBool) {
            quby.syntax.Expr.call(this, left.offset, isResultBool);

            this.left = left;
            this.right = right;
            this.print = function (p) {
                var bracket = quby.compilation.hints.doubleBracketOps();
                
                if ( bracket ) {
                    p.append('((');
                } else {
                    p.append('(');
                }
                this.left.print(p);
                if ( bracket ) {
                    p.append( ')' );
                }
                
                p.append(strOp);
                
                if ( bracket ) {
                    p.append( '(' );
                }
                this.right.print(p);
                if ( bracket ) {
                    p.append('))');
                } else {
                    p.append(')');
                }
            };
            this.validate = function (v) {
                right.validate(v);
                left.validate(v);
            };
        },

        /* Comparisons */
        Equality: function (left, right) {
            quby.syntax.Op.call(this, left, right, "==", true);
            return this;
        },

        NotEquality: function (left, right) {
            quby.syntax.Op.call(this, left, right, "!=", true);
            return this;
        },

        LessThan: function (left, right) {
            quby.syntax.Op.call(this, left, right, "<", true);
            return this;
        },

        LessThanEqual: function (left, right) {
            quby.syntax.Op.call(this, left, right, "<=", true);
            return this;
        },

        GreaterThan: function (left, right) {
            quby.syntax.Op.call(this, left, right, ">", true);
            return this;
        },

        GreaterThanEqual: function (left, right) {
            quby.syntax.Op.call(this, left, right, ">=", true);
            return this;
        },

        /* Bit Functions */
        ShiftLeft: function (left, right) {
            quby.syntax.Op.call(this, left, right, "<<");
            return this;
        },

        ShiftRight: function (left, right) {
            quby.syntax.Op.call(this, left, right, ">>");
            return this;
        },

        BitOr: function (left, right) {
            quby.syntax.Op.call(this, left, right, "|");
            return this;
        },

        BitAnd: function (left, right) {
            quby.syntax.Op.call(this, left, right, "&");
            return this;
        },

        BoolOp: function(left, right, syntax) {
            quby.syntax.Op.call(this, left, right, syntax);
            
            var oldPrint = this.print;
            var newPrint = function(p) {
                this.print = oldPrint;
                this.printAsCondition(p);
                this.print = newPrint;
            };
            
            this.print = newPrint;
            
            return this;
        },
        
        BoolOr: function (left, right) {
            quby.syntax.BoolOp.call(this, left, right, "||");
            
            this.print = function(p) {
                var temp = p.getTempVariable();
                
                p.appendPre('var ', temp, ';');
                
                p.append('(((', temp, '=');
                this.left.print(p);
                p.append(') === null || ', temp, ' === false) ? (');
                this.right.print(p);
                p.append(') : ', temp, ')');
                
                // needed to prevent memory leaks
                p.appendPost('delete ', temp, ';');
            };
            
            return this;
        },

        BoolAnd: function (left, right) {
            quby.syntax.BoolOp.call(this, left, right, "&&");
            
            this.print = function(p) {
                var temp = p.getTempVariable();
                
                p.appendPre('var ', temp, ';');
                
                p.append('(((', temp, '=');
                this.left.print(p);
                p.append(') === null || ', temp, ' === false) ? ', temp, ' : (');
                this.right.print(p);
                p.append('))');
                
                // needed to prevent memory leaks
                p.appendPost('delete ', temp, ';');
            };
            
            return this;
        },

        /* ### Maths ### */
        Add: function (left, right) {
            quby.syntax.Op.call(this, left, right, "+");
            return this;
        },

        Sub: function (left, right) {
            quby.syntax.Op.call(this, left, right, "-");
            return this;
        },

        Divide: function (left, right) {
            quby.syntax.Op.call(this, left, right, "/");
            return this;
        },

        Mult: function (left, right) {
            quby.syntax.Op.call(this, left, right, "*");
            return this;
        },

        Mod: function (left, right) {
            quby.syntax.Op.call(this, left, right, "%");
            return this;
        },

        Power: function (left, right) {
            quby.syntax.Op.call(this, left, right);

            this.print = function (p) {
                p.append('Math.pow(');
                this.left.print(p);
                p.append(',');
                this.right.print(p);
                p.append(')');
            };
        },

        /* ### Assignments ### */
        Assignment: function (left, right) {
            quby.syntax.Op.call(this, left, right);

            this.print = function (p) {
                this.left.print(p);
                p.append('=');
                this.right.print(p);
            };
            this.validate = function (v) {
                this.right.validate(v);
                this.left.validate(v);
            };
        },

        ArrayAssignment: function (arrayAccess, expr) {
            quby.syntax.Syntax.call(this, arrayAccess.offset);

            this.left = arrayAccess;
            this.right = expr;
            this.print = function (p) {
                p.append('quby_setCollection(');
                this.left.array.print(p);
                p.append(',');
                this.left.index.print(p);
                p.append(',');
                this.right.print(p);
                p.append(')');
            };
            this.validate = function (v) {
                this.right.validate(v);
                this.left.validate(v);
            };
        },

        Identifier: function (identifier, callName) {
            quby.syntax.Expr.call(this, identifier.offset);

            this.identifier = identifier.value;
            this.callName = callName;
            this.print = function (p) {
                p.append(this.callName);
            };
        },
        FieldIdentifier: function (identifier) {
            // set temporary callName (the identifier.value)
            quby.syntax.Identifier.call(this, identifier, identifier.value);

            this.validate = function (v) {
                if (
                        v.ensureInClass(this, "Field '" + this.identifier + "' is used outside of a class, they can only be used inside.")
                ) {
                    // set the correct field callName
                    this.callName = quby.runtime.formatField(
                            v.getCurrentClass().klass.name,
                            this.identifier
                    );
                    this.isInsideExtensionClass = v.isInsideExtensionClass();

                    this.validateField(v);
                }
            };
            this.validateField = function (v) {
                quby.runtime.error("Internal", "Error, validateField of FieldIdentifier has not been overrided.");
            };
        },

        VariableAssignment: function (identifier) {
            quby.syntax.Identifier.call(this, identifier, quby.runtime.formatVar(identifier.value));

            this.validate = function (v) {
                v.assignVar(this);
                // blocks can alter local variables, allowing var prevents this.
                this.useVar = !v.isInsideBlock();
            };
            this.oldPrint = this.print;
            this.print = function (p) {
                if (this.useVar) {
                    p.append('var ');
                }
                this.oldPrint(p);
            }
        },
        FieldVariableAssignment: function (identifier) {
            // value is set temporarily
            quby.syntax.FieldIdentifier.call(this, identifier);

            this.validateField = function (v) {
                v.assignField(this);
            };
            this.print = function (p) {
                p.append(quby.runtime.getThisVariable(this.isInsideExtensionClass), '.', this.callName);
            };
        },
        GlobalVariableAssignment: function (identifier) {
            quby.syntax.Identifier.call( this, identifier, quby.runtime.formatGlobal(identifier.value) );
            
            this.validate = function (v) {
                // check if the name is blank, i.e. $
                if ( this.identifier.length === 0 ) {
                    v.parseError( this.offset, "Global variable name is blank" );
                } else {
                    v.assignGlobal(this);
                }
            };
        },

        /* ### Variables ### */
        Variable: function (identifier) {
            quby.syntax.Identifier.call(this, identifier, quby.runtime.formatVar(identifier.value));

            this.validate = function (v) {
                if (v.isInsideParameters()) {
                    // it presumes scope has already been pushed by the function it's within
                    if (v.containsLocalVar(this)) {
                        v.parseError(this.offset, "Parameter variable name used multiple times, var: '" + this.identifier + "'.");
                    }

                    v.assignVar(this);
                } else {
                    if (!v.containsVar(this)) {
                        v.parseError(this.offset, "Variable used before it's assigned to, var: " + this.identifier);
                    }
                }
            };
        },
        GlobalVariable: function (identifier) {
            quby.syntax.Identifier.call(this, identifier, quby.runtime.formatGlobal(identifier.value));

            this.isGlobal = true;
            this.print = function (p) {
                p.append('quby_checkGlobal(', this.callName, ',\'', this.identifier, '\')');
            };
            this.validate = function (v) {
                if (v.ensureOutParameters(this, "Global variable cannot be used as a parameter, global: '" + this.identifier + "'.")) {
                    v.useGlobal(this);
                }
            };
        },
        ParameterBlockVariable: function (identifier) {
            quby.syntax.Variable.call(this, identifier);

            this.isBlockParam = true;
            this.old_validate = this.validate;
            this.validate = function (v) {
                v.ensureInFunParameters(this, "Block parameters must be defined within a functions parameters.");
                this.old_validate(v);
            };
        },
        FieldVariable: function (sym) {
            quby.syntax.FieldIdentifier.call(this, sym);

            this.klass = null;
            
            var oldValidate = this.validate;
            this.validate = function (v) {
                if (
                        v.ensureOutParameters( this, "Class field '" + this.identifier + "' used as a parameter." ) &&
                        v.ensureInMethod( this, "Class field '" + this.identifier + "' is used outside of a method." )
                ) {
                    oldValidate.call( this, v );
                    this.klass = v.getCurrentClass().klass;
                }
            };
            this.validateField = function (v) {
                v.useField( this );
                this.isConstructor = v.isConstructor();
            }

            this.print = function (p) {
                if ( this.klass ) {
                    var strName = this.identifier +
                            quby.runtime.FIELD_NAME_SEPERATOR +
                            this.klass.name ;
                            
                    // this is about doing essentially either:
                    //     ( this.field == undefined ? error('my_field') : this.field )
                    //  ... or ...
                    //     getField( this.field, 'my_field' );
                    var thisVar = quby.runtime.getThisVariable(this.isInsideExtensionClass);
                    if (quby.compilation.hints.useInlinedGetField()) {
                        p.append(
                                '(',
                                    thisVar, ".", this.callName,
                                    '===undefined?quby.runtime.fieldNotFoundError(' + thisVar + ',"', strName, '"):',
                                    thisVar, ".", this.callName,
                                ')'
                        );
                    } else {
                        p.append(
                                "quby_getField(",
                                    thisVar, ".", this.callName, ',',
                                    thisVar, ",'",
                                    strName,
                                "')"
                        );
                    }
                }
            };
        },
        ThisVariable: function (sym) {
            quby.syntax.Syntax.call(this, sym.offset);

            this.isThis = true;
            this.validate = function (v) {
                if (v.ensureOutParameters(this, "'this' object is referenced as a parameter (which isn't allowed).")) {
                    v.ensureInMethod(this, "'this' object is referenced outside of a class method (or you've named a variable 'this' which isn't allowed).");
                }

                this.isInsideExtensionClass = v.isInsideExtensionClass();
                this.isConstructor = v.isConstructor();
            };
            this.print = function (p) {
                p.append(quby.runtime.getThisVariable(this.isInsideExtensionClass));
            };
        },

        /* ### Arrays ### */
        ArrayAccess: function (array, index) {
            quby.syntax.Syntax.call(this, array.offset);

            this.array = array;
            this.index = index;
            this.print = function (p) {
                p.append('quby_getCollection(');
                this.array.print(p);
                p.append(',');
                this.index.print(p);
                p.append(')');
            };
            this.validate = function (v) {
                this.array.validate(v);
                this.index.validate(v);
            };
        },
        ArrayDefinition: function (parameters) {
            quby.syntax.Syntax.call(this, parameters.offset);

            this.parameters = parameters;
            this.print = function (p) {
                p.append('(new QubyArray([');
                this.parameters.print(p);
                p.append(']))');
            };
            this.validate = function (v) {
                parameters.validate(v);
            };
        },
        HashDefinition: function (parameters) {
            quby.syntax.ArrayDefinition.call(this, parameters);

            this.print = function (p) {
                p.append('(new QubyHash(');
                this.parameters.print(p);
                p.append('))');
            };
        },

        /* Literals */
        Literal: function (val, value, isTrue) {
            quby.syntax.Expr.call(this, val.offset);

            this.isLiteral = true;
            this.isTrue = (!!isTrue);
            
            if (value) {
                this.value = value;
            } else {
                this.value = val.value;
            }

            this.validate = function (v) {
                // do nothing
            };
            this.print = function (p) {
                var str = String(this.value);
                p.append( String(this.value) );
            };
            
            /**
             * If this literal evaluates to true, then 'true' is printed.
             * Otherwise 'false'.
             */
            this.printAsCondition = function(p) {
                if ( this.isTrue ) {
                    p.append('true');
                } else {
                    p.append('false');
                }
            };
        },

        Symbol: function (sym) {
            quby.syntax.Literal.call(this, sym);
            this.callName = quby.runtime.formatSymbol(this.value);

            this.validate = function (v) {
                v.addSymbol(this);
            };
            this.print = function (p) {
                p.append(this.callName);
            };
        },
        String: function (sym) {
            sym.value = sym.value.replace( /\n/g, "\\n" );
            return new quby.syntax.Literal(sym, undefined, true);
        },
        
        Number: function(sym) {
            quby.syntax.Literal.call(this, sym, undefined, true);
            
            this.validate = function(v) {
                var origNum = this.value,
                    num = origNum.replace( /_+/g, '' ),
                    decimalCount = 0;
                
                // TODO validate num
                
                if ( num.indexOf('.') === -1 ) {
                    this.value = num|0;
                } else {
                    this.value = parseFloat(num);
                }
            };
        },
        Bool: function (sym) {
            return new quby.syntax.Literal( sym, undefined, sym.value );
        },
        Null: function (sym) {
            return new quby.syntax.Literal(sym, 'null', false);
        },

        /* Other */
        PreInline: function(sym) {
            quby.syntax.Syntax.call(this, sym.offset);
            
            this.isPrinted = false;
            this.print = function (p) {
                if ( ! this.isPrinted ) {
                    p.append( sym.value );
                    this.isPrinted = true;
                }
            };
            this.validate = function (v) {
                v.ensureAdminMode(
                        this, "Inlining JavaScript is not allowed outside of admin mode."
                );
                v.addPreInline( this );
            };
        },
        
        Inline: function (sym) {
            quby.syntax.Syntax.call(this, sym.offset);

            this.print = function (p) {
                p.append(sym.value);
            };
            this.printAsCondition = function(p) {
                this.print(p);
            };
            this.validate = function (v) {
                v.ensureAdminMode(this, "Inlining JavaScript is not allowed outside of admin mode.");
            };
        }
    };
})( quby, util );