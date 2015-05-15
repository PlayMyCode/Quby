///<reference path="util.ts" />

"use strict";

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
 *  == Parse.ts ==
 * 
 * I came up with the algorithm for this parser indepedently of
 * any other research. However I believe the approahc is that
 * of a 'Parsing Expression Grammar', or 'PEG'.
 * 
 * @see http://en.wikipedia.org/wiki/Parsing_expression_grammar
 * 
 * 
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

module parse {
    export interface ILogErrorFunction {
        ( msg: string, i: number ): void;
    }

    /**
     * Whilst you can return undefined or false or some other falsy value from this,
     * for performance reasons it is advised that you *always* return a number.
     * 
     * 0 or -1 are options to return as a failure value.
     */
    export interface ITerminalFunction {
        (src: string, i: number, code: number, len: number): number;
        (src: string, i: number, code: number, len: number, logError:ILogErrorFunction ): number;
    }

    export interface IMatchFoundFunction {
        (...args: any[]): any;
    }

    export interface ITimeResult {
        compile: number;
        symbols: number;
        rules: number;

        /**
         * This is the total time the parser took.
         * 
         * Note this is will probably be *more* than the other values added up
         * as they do not take into account sleeps.
         */
        total: number;
    }

    export interface INamedItem {
        name( name: string ): INamedItem;
        name(): string;
    }

    export interface ISymbolizeCallback { ( terminals: Term[], errors: IParseError[] ): void; };

    export interface IFinishCallback { ( result: any, errors: IParseError[], time: ITimeResult ): void; };

    interface ICompiledTerminals {
        literals: Term[];
        terminals: Term[];
        idToTerms: Term[];
    }

    /**
     * ASCII codes for characters.
     *
     * @type {number}
     * @const
     */
    var TAB = 9, // \t
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
    var isHexCode = function ( code: number ): boolean {
        return ( code >= ZERO && code <= NINE ) || // a number
            ( code >= LOWER_A && code <= LOWER_F ) || // lower a-z
            ( code >= UPPER_A && code <= UPPER_F );   // upper A-Z
    };

    var isAlphaNumericCode = function ( code: number ): boolean {
        return (
            ( code >= LOWER_A && code <= LOWER_Z ) || // lower case letter
            ( code >= UPPER_A && code <= UPPER_Z ) || // upper case letter
            ( code === UNDERSCORE ) ||
            ( code >= ZERO && code <= NINE )     // a number
            );
    };

    var isAlphaCode = function(code: number): boolean {
        return (code >= LOWER_A && code <= LOWER_Z) ||
               (code >= UPPER_A && code <= UPPER_Z);
    };

    /**
     * @nosideeffects
     * @const
     * @param {number} code
     * @return {boolean}
     */
    var isNumericCode = function ( code: number ): boolean {
        return ( code >= ZERO && code <= NINE ); // a number
    };

    /**
     * @return True if f is a function object, and false if not.
     */
    function isFunction( f: any ): boolean {
        return ( typeof f === "function" ) || ( f instanceof Function );
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
    function isWordCode(code: number): boolean {
        return (
                (code >= 97 && code <= 122) || // lower case letter
                (code >= 48 && code <= 57) || // a number
                (code === 95) || // underscore
                (code >= 65 && code <= 90)    // uppper case letter
        );
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
    function isWordCharAt(src: string, i: number): boolean {
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
    var
        /**
         * For providing a function to test for a match.
         */
        TYPE_FUNCTION = 1,

        /**
         * For indevidual alphanumeric characters, which are also a single word.
         * 
         * i.e. matching 'a' on it's own, like 'a' in "@x is a 4"
         */
        TYPE_CODE_ALPHANUMERIC = 2,

        /**
         * For indevidual non-alphanumeric characters,
         * this does *NOT* check for word boundaries.
         */
        TYPE_CODE = 3,

        /**
         * For whole string literals, such as 'if' or 'and' or 'function'.
         * 
         * Can included non-alphanumeric values too.
         */
        TYPE_STRING = 4,

        /**
         * This one gets optimized out when the terminals are compiled.
         * 
         * The tests within it are expanded and brought to the top level,
         * removing the array.
         */
        TYPE_ARRAY = 5;

    var BLANK_TERMINAL_FUNCTION: ITerminalFunction = ( src: string, i: number, code: number, len: number ) => 0;

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
    function stringToCodes (str: string): number[] {
        var len = str.length,
        arr: number[] = new Array(len);

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
    function formatTerminalName (str: string): string {
        /*
         * - reaplce camelCase in the middle to end of the string,
         * - lowerCase anything left (start of string)
         * - turn underscores into spaces
         * - uppercase the first letter of each word
         */
        return str.
                replace(/([^A-Z])([A-Z]+)/g, function (t, a, b) { return a + ' ' + b; }).
                replace('_', ' ').
                toLowerCase().
                replace( /\b([a-z])/g, function ( t: string, letter: string ) { return letter.toUpperCase(); });
    }

    function processResult( arg: any ): any {
        if ( arg === null ) {
            return null;

        } else if ( arg instanceof Symbol ) {
            return arg.onFinish();

        } else if ( typeof arg === 'function' ) {
            return arg();

        } else if ( arg instanceof Array ) {
            for ( var i = 0; i < arg.length; i++ ) {
                arg[i] = processResult( arg[i] );
            }

            return arg;

        } else if ( arg.apply ) {
            var args = arg.args;
            var argsLen = args.length;

            if ( argsLen === 0 ) {
                return arg.onFinish();
            } else if ( argsLen === 1 ) {
                return arg.onFinish( processResult(args[0]) );
            } else if ( argsLen === 2 ) {
                return arg.onFinish( processResult(args[0]), processResult(args[1]) );
            } else if ( argsLen === 3 ) {
                return arg.onFinish( processResult(args[0]), processResult(args[1]), processResult(args[2]) );
            } else if ( argsLen === 4 ) {
                return arg.onFinish( processResult(args[0]), processResult(args[1]), processResult(args[2]), processResult(args[3]) );
            } else if ( argsLen === 5 ) {
                return arg.onFinish( processResult(args[0]), processResult(args[1]), processResult(args[2]), processResult(args[3]), processResult(args[4]) );
            } else if ( argsLen === 6 ) {
                return arg.onFinish( processResult(args[0]), processResult(args[1]), processResult(args[2]), processResult(args[3]), processResult(args[4]), processResult(args[5]) );
            } else if ( argsLen === 7 ) {
                return arg.onFinish( processResult(args[0]), processResult(args[1]), processResult(args[2]), processResult(args[3]), processResult(args[4]), processResult(args[5]), processResult(args[6]) );
            } else if ( argsLen === 8 ) {
                return arg.onFinish( processResult(args[0]), processResult(args[1]), processResult(args[2]), processResult(args[3]), processResult(args[4]), processResult(args[5]), processResult(args[6]), processResult(args[7]) );
            } else if ( argsLen === 9 ) {
                return arg.onFinish( processResult(args[0]), processResult(args[1]), processResult(args[2]), processResult(args[3]), processResult(args[4]), processResult(args[5]), processResult(args[6]), processResult(args[7]), processResult(args[8]) );
            } else if ( argsLen === 10 ) {
                return arg.onFinish( processResult(args[0]), processResult(args[1]), processResult(args[2]), processResult(args[3]), processResult(args[4]), processResult(args[5]), processResult(args[6]), processResult(args[7]), processResult(args[8]), processResult(args[9]) );
            } else {
                return arg.onFinish.apply( null, processResult( arg.args ) );
            }

        } else {
            return arg.onFinish( processResult(arg.args) );

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
    export class Term {
        /**
         * The id for being able to index this terminal.
         */
        id: number = INVALID_TERMINAL;

        /**
         * A name for this terminal.
         *
         * Used for error reporting, so you can have something readable,
         * rather then things like 'E_SOMETHING_END_BLAH_TERMINAL'.
         */
        termName: string = "<Anonymous Terminal>";

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
        isExplicitelyNamed: boolean = false;

        /**
         * The type of this terminal.
         *
         * Default is zero, which is invalid.
         */
        type: number = 0;

        /**
         * A post match callback that can be run,
         * when a match has been found.
         *
         * Optional.
         */
        onMatchFun: IMatchFoundFunction = null;

        /**
         * The type of this terminal.
         *
         * This determines the algorithm used to match,
         * or not match, bits against the source code
         * when parsing symbols.
         */
        isLiteral: boolean = false;

        /**
         * The literal value this is matching, if provided.
         * Otherwise null.
         */
        literal: string = null;

        /**
         * If this is a literal, then this will give the length
         * of that literal being searched for.
         *
         * For a string, this is the length of that string.
         * For a number, this is 1.
         *
         * For non-literals, this is 0, but should not be used.
         */
        literalLength: number = 0;

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
        typeTestFunction:ITerminalFunction = BLANK_TERMINAL_FUNCTION;
        typeTestArray: Term[] = [];
        typeTestCode: number = 0;
        typeTestString: number[] = [];

        /**
         * An optional event to run after a symbol has been matched.
         *
         * Gives the option to move the offset on further, whilst ignoring
         * symbols.
         */
        postMatch: ITerminalFunction = null;

        /**
         * Some terminals are silently hidden away,
         * this is so they can still see their parents.
         */
        terminalParent: Term = null;

        constructor (match: string, name?: string);
        constructor (match: number, name?: string);
        constructor (match: Term, name?: string);
        constructor (match: any[], name?: string);
        constructor (match: ITerminalFunction, name?: string);
        constructor (match, name?: string) {
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

                if ( match instanceof String || match instanceof Number ) {
                    match = match.valueOf();
                }

                var matchType = typeof match;

                /*
                 * A single character.
                 * - a character code (number)
                 * - a single character (1 length string)
                 */
                if (
                      matchType === 'number' ||
                    ( matchType === 'string' && match.length === 1 )
                ) {
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

                    this.type = isWordCode(match) ?
                            TYPE_CODE_ALPHANUMERIC  :
                            TYPE_CODE;

                    this.typeTestCode = match;

                /*
                 * String primative, or string object.
                 *
                 * This is a string with a length longer than 1,
                 * a length of zero will raise an error,
                 * and 1 length is caught by the clause above.
                 */
                } else if ( matchType === 'string' ) {
                    this.type = TYPE_STRING;

                    this.literalLength = match.length;
                    this.isLiteral = true;
                    this.literal = match;

                    if (match.length === 0) {
                        throw new Error("Empty string given for Terminal");
                    } else {
                        this.typeTestString = stringToCodes( match );

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
                } else if ( match instanceof Array ) {
                    this.type = TYPE_ARRAY;

                    var mTerminals = [];
                    var isLiteral = true,
                        literalLength = Number.MAX_VALUE;

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

        toString(): string {
            return this.termName;
        }

        getParentTerm():Term {
            if ( this.terminalParent !== null ) {
                return this.terminalParent.getParentTerm();
            } else {
                return this;
            }
        }

        setParentTerm(parent:Term):Term {
            this.terminalParent = parent;
            return this;
        }

        name(name: string): Term;
        name(): string;
        name(name?:string ) : any {
            if (name === undefined) {
                return this.termName;
            } else {
                this.termName = name;
                return this;
            }
        }

        setName(name: string):Term {
            this.termName = name;
            return this;
        }

        getName(): string {
            return this.termName;
        }

        setID(id: number):Term {
            this.id = id;

            /*
             * Arrays are silently removed,
             * so pass the id on,
             * otherwise the grammar breaks.
             */
            if ( this.type === TYPE_ARRAY ) {
                var arr = this.typeTestArray;

                for ( var i = 0; i < arr.length; i++ ) {
                    arr[i].setID( id );
                }
            }

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
        symbolMatch( callback: ITerminalFunction ): Term {
            if ( callback !== null && !isFunction( callback ) ) {
                throw new Error("symbolMatch callback is not valid: " + callback);
            }

            this.postMatch = callback;

            return this;
        }

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
        onMatch( callback: IMatchFoundFunction ): Term {
            if ( !callback ) {
                this.onMatchFun = null;
            } else {
                this.onMatchFun = callback;
            }

            return this;
        }
    }

    /*  **  **  **  **  **  **  **  **  **  **  **  **  **
     *
     *          Parser
     *
     * This includes the parser rules for building the
     * expressions, and the core 'Parser' interface.
     *
     *  **  **  **  **  **  **  **  **  **  **  **  **  */

    /**
     * The basic struct which makes up an error.
     * 
     * It holds the line where the error is found, what
     * source code matches against it, and a provided
     * default message.
     */
    export class IParseError {
        public match   : string;
        public line    : number;
        public message : string;
    }

    function newParseError(sourceLines:SourceLines, startI:number, endI:number):IParseError {
        var match = this.source.substring( startI, endI );

        return {
            match   : match,
            line    : this.source.getLine( startI ),
            message :  "error parsing '" + match + "'"
        }
    }

    /**
     * This is a type of error generated whilst the grammar rules are 
     * worked on.
     */
    function newRuleError( symbol:Symbol, expected: string[] ):IParseError {
        var source = symbol.source;
        var startI = symbol.offset;
        var endI   = symbol.endOffset;

        var match  = source.substring( startI, endI );
        var line   = source.getLine( startI );
        var term   = symbol.terminal;
        var errMsg = '';

        if (term.isLiteral || util.str.trim(match) === '') {
            errMsg = "syntax error near '" + term.getName() + "'";
        } else {
            var errorMatch = match;
            if ( errorMatch.indexOf( "\n" ) !== -1 ) {
                errorMatch = "\n    '" + errorMatch.split( "\n" ).join( "\n    " ) + "'";
            } else {
                errorMatch = "'" + errorMatch + "'";
            }

            errMsg = "syntax error near " + term.getName() + " " + errorMatch;
        }

        if (expected.length > 0) {
            errMsg += ', expected ';

            if (expected.length > 1) {
                errMsg += expected.slice(0, expected.length - 1).join(', ') + ' or ' + expected[expected.length - 1];
            } else {
                errMsg += expected.join(' or ');
            }
        }

        return {
            match   : match,
            line    : line,
            message : errMsg
        }
    }

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
    export class SourceLines {
        // altered when indexed ...
        private numLines: number;
        private lineOffsets: number[];

        private source: string;
        private name: string;

        constructor( src: string, name: string ) {
            // source code altered and should be used for indexing
            this.source = src;
            this.name = name || '<Unknown Script>';

            // these get altered when indexing occurres ...
            this.numLines = 0;
            this.lineOffsets = null;
        }

        private index():void {
            // index source code on the fly, only if needed
            if (this.lineOffsets == null) {
                var src = this.source;

                var len = src.length;
                var lastIndex = 0;
                var lines: number[] = [];
                var running = true;

                /*
                 * Look for 1 slash n, if it's found, we use it
                 * otherwise we use \r.
                 *
                 * This is so we can index any code, without having to alter it.
                 */
                var searchIndex = (src.indexOf("\n", lastIndex) !== -1) ?
                        "\n" :
                        "\r";

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
        }

        substr( i: number, len: number ): string {
            return this.source.substr( i, len );
        }

        substring( i: number, end: number ): string {
            return this.source.substring( i, end );
        }

        getName():string {
            return this.name;
        }

        getLine(offset: number): number {
            this.index();

            for (var line = 0; line < this.lineOffsets.length; line++) {
                // LineOffset is from the end of the line.
                // If it's greater then offset, then we return that line.
                // It's +1 to start lines from 1 rather then 0.
                if ( this.lineOffsets[line] > offset ) {
                    return line + 1;
                }
            }

            return this.numLines;
        }

        getSource(): string {
            return this.source;
        }
    };

    /**
     * A wrapper for holding the Symbol result information.
     *
     * It's essentially a struct like object.
     */
    export class Symbol {
        public terminal: Term;
        public offset: number;
        public endOffset: number;
        public source: SourceLines;

        private match: string;
        private lower: string;

        constructor (terminal:Term, sourceLines:SourceLines, offset:number, endOffset:number) {
            this.terminal = terminal;
            this.offset = offset;
            this.endOffset = endOffset;
            this.source = sourceLines;

            this.match = null;
            this.lower = null;
        }

        clone( newMatch: string ): Symbol {
            var sym = new Symbol(this.terminal, this.source, this.offset, this.endOffset);

            sym.match = this.match;
            sym.lower = this.lower;

            return sym;
        }

        chompLeft( offset: number ): string {
            return this.source.substring( this.offset + offset, this.endOffset );
        }

        chompRight( offset: number ): string {
            return this.source.substring( this.offset, this.endOffset - offset );
        }

        chomp( left: number, right: number ): string {
            return this.source.substring( this.offset + left, this.endOffset - right );
        }

        getMatch() : string {
            if ( this.match === null ) {
                return ( this.match = this.source.substring( this.offset, this.endOffset ) );
            } else {
                return this.match;
            }
        }

        getLower() : string {
            if (this.lower === null) {
                return (this.lower = this.getMatch().toLowerCase());
            } else {
                return this.lower;
            }
        }

        /**
         * Converts this to what it should be for the 'onMatch' callbacks.
         *
         * If there is no callback set on the inner symbol, then this is returned.
         * If there is a callback, then it is run, and the result is returned.
         */
        onFinish(): Symbol;
        onFinish(): any {
            var onMatch = this.terminal.onMatchFun;

            if (onMatch !== null) {
                return onMatch(this);
            } else {
                return this;
            }
        }

        getLine():number {
            return this.source.getLine(this.offset);
        }

        getSource(): SourceLines {
            return this.source;
        }

        toString(): string {
            return this.getMatch();
        }
    }

    function findPossibleTerms( arr: INamedItem[], terms: Object );
    function findPossibleTerms(t: INamedItem, terms: Object);
    function findPossibleTerms(e:any, terms: Object) {
        if (e instanceof Array) {
            for (var i = 0; i < e.length; i++) {
                findPossibleTerms(e[i], terms);
            }
        } else {
            var name = e.name();

            if (name) {
                terms[name] = true;
            } else if (e instanceof ParserRuleImplementation) {
                findPossibleTerms((<ParserRuleImplementation>e).rules, terms);
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
    class SymbolResult {
        private errors: IParseError[];

        private symbols: Symbol[];
        private symbolIDs: number[];

        private length: number;
        private symbolIndex: number;
        private i: number;
        private maxI: number;

        /**
         * The last rule reached, when parsing, before an error has occurred.
         */
        private maxRule: ParserRuleImplementation;
        private maxRuleI: number;

        private currentString: string;
        private currentID: number;
        private stringI: number;

        private symbolIDToTerms: Term[];

        constructor (
                errors:IParseError[],

                symbols: Symbol[],
                symbolIDs: number[],

                symbolLength:number,

                symbolIDToTerms :Term[]
        ) {
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

        expected() : string[] {
            if (this.maxRule === null) {
                return [];
            } else {
                // the point of this is to find _unique_ term items,
                // which is why the terms are put into an object and then an array

                var rules = this.maxRule.compiledLookups[this.maxRuleI],
                    terms = {},
                    termsArr:string[] = [];

                var i;
                var rulesLen = rules.length;
                for ( i = 0; i < rulesLen; i++ ) {
                    var rule = rules[i];

                    if ( rule !== null ) {
                        findPossibleTerms( rule, terms );
                    }
                }

                var keys = Object.keys( terms ), keysLen = keys.length;
                for ( i = 0; i < keysLen; i++ ) {
                    var k = keys[i];

                    termsArr.push(k);
                }

                return termsArr;
            }
        }

        /**
         * @return The maximum id value the symbol result has moved up to.
         */
        maxID():number {
            if (this.i > this.maxI) {
                return this.i;
            } else {
                return this.maxI;
            }
        }

        maxSymbol():Symbol {
            var maxID = Math.max( 0, this.maxID() - 1 );
            return this.symbols[maxID];
        }

        hasErrors():boolean {
            return this.errors.length > 0;
        }

        getTerminals():Term[] {
            var length = this.length;
            var thisSymbols = this.symbols;
            var symbols: Term[] = new Array( length );

            for (var i = 0; i < length; i++) {
                symbols[i] = thisSymbols[i].terminal;
            }

            return symbols;
        }

        getErrors():IParseError[] {
            return this.errors;
        }

        /**
         * @return True if this currently points to a symbol.
         */
        hasMore():boolean {
            return this.symbolIndex < this.length;
        }

        isMoving():boolean {
            return this.i !== this.symbolIndex;
        }

        finalizeMove():void {
            var i = this.i;

            if (i < this.length) {
                this.currentID = this.symbolIDs[i];
                this.symbolIndex = i;
            } else {
                this.currentID = INVALID_TERMINAL;
                this.i = this.symbolIndex = this.length;
            }
        }

        next():Symbol {
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
        }

        back(increments: number, maxRule: ParserRuleImplementation, maxRuleI: number):void {
            var i = this.i;

            if (i > this.maxI) {
                this.maxI = i;
                this.maxRule  = maxRule;
                this.maxRuleI = maxRuleI;
            }

            this.i = (i -= increments);

            if (i < this.symbolIndex) {
                throw new Error("Moved back by more increments then the last finalize move location");
            } else {
                this.currentID = this.symbolIDs[i];
            }
        }

        skip():Symbol {
            this.i++;
            this.finalizeMove();

            return this.symbols[this.i - 1];
        }

        index():number {
            return this.symbolIndex;
        }

        /**
         * @return The current index for the current symbol ID.
         */
        idIndex():number {
            return this.i;
        }

        peekID():number {
            if (this.i >= this.length) {
                return INVALID_TERMINAL;
            }

            return this.currentID;
        }
    }

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
    function compressTerminals( terminals: Term[] ): ICompiledTerminals {
        var termIDToTerms: Term[] = [];

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
        var literalTerms: Term[] = [],
        nonLiteralTerms: Term[] = [];

        compressTerminalsInner(termIDToTerms, literalTerms, nonLiteralTerms, terminals);

        literalTerms.sort(function (a:Term, b:Term) {
            return b.literalLength - a.literalLength;
        });

        return {
            literals: literalTerms,
            terminals: nonLiteralTerms,
            idToTerms: termIDToTerms
        };
    }

    function compressTerminalsInner(termIDToTerms: Term[], literalTerms: Term[], nonLiteralTerms: Term[], terminals: Term[]): void {
        var keys = Object.keys( terminals ),
            keysLen = keys.length;

        for ( var i = 0; i < keysLen; i++ ) {
            var k = keys[i];
            var term: Term = terminals[k];

            if (term.type === TYPE_ARRAY) {
                compressTerminalsInner(
                        termIDToTerms,
                        literalTerms,
                        nonLiteralTerms,
                        term.typeTestArray
                    );
            } else {
                termIDToTerms[term.id] = term;

                if ( term.isLiteral ) {
                    literalTerms.push(term)
                } else {
                    nonLiteralTerms.push(term)
                }
            }
        }
    }

    function bruteScan(parserRule: ParserRuleImplementation, seenRules: boolean[], idsFound: boolean[]) {
        if (seenRules[parserRule.compiledId] !== true) {
            seenRules[parserRule.compiledId] = true;

            var rules = parserRule.rules,
                isOptional = parserRule.isOptional;

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
            } while (i < rules.length && isOptional[i-1]);
        } else {
            return;
        }
    }

    /**
     * Used when searching for terminals to use for parsing,
     * during the compilation phase.
     */

    function addRule( rule: IParserRule, terminals: Term[], id: number, allRules: IParserRule[] ): number;
    function addRule( rule: Term, terminals: Term[], id: number, allRules: IParserRule[] ): number;
    function addRule( rule, terminals: Term[], id: number, allRules: IParserRule[] ) {
        if (rule instanceof Term) {
            var termID = rule.id;

            if (termID !== INVALID_TERMINAL) {
                terminals[termID] = rule;
            }

            return id;
        } else {
            return (<ParserRuleImplementation>rule).optimizeScan(terminals, id, allRules);
        }
    };

    function addRuleToLookup( id: number, ruleLookup: any, term: any ) {
        var ruleLookupLen = ruleLookup.length;

        if ( ruleLookupLen <= id ) {
            for ( var i = ruleLookupLen; i < id; i++ ) {
                ruleLookup.push( null );
            }

            ruleLookup.push( term );
        } else {
            var arrLookup = ruleLookup[id];

            if ( arrLookup === null ) {
                ruleLookup[id] = term;
            } else if ( arrLookup instanceof Array ) {
                arrLookup.push( term );
            } else {
                ruleLookup[id] = [arrLookup, term];
            }
        }
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

    export interface IParserRule extends INamedItem {
        repeatSeperator( match: any, seperator: any ): IParserRule;
        optionalSeperator( match: any, seperator: any ): IParserRule;
        seperatingRule( match: any, seperator: any ): IParserRule;

        or(...args: any[]): IParserRule;
        either(...args: any[]): IParserRule;
        thenOr(...args: any[]): IParserRule;
        thenEither(...args: any[]): IParserRule;
        optional(...args: any[]): IParserRule;
        maybe(...args: any[]): IParserRule;
        a(...args: any[]): IParserRule;
        then(...args: any[]): IParserRule;
        onMatch(callback: (...args: any[]) => any): IParserRule;

        optionalThis(...args: any[]): IParserRule;
        maybeThis(...args: any[]): IParserRule;
        orThis(...args: any[]): IParserRule;

        name(name: string): IParserRule;
        name(): string;

        parse(options: {
            src: string;
            inputSrc?: string;
            name?: string;
            onFinish: IFinishCallback;
        }): void;

        symbolize(input: string, callback: ISymbolizeCallback): void;
    }

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
    class ParserRuleImplementation implements IParserRule {
        /**
         * A callback to call when this is done.
         */
        finallyFun: (...args: any[]) => any = null;

        /**
         * States if this is compiled yet, or not.
         *
         * When null, no compilation has taken place. When not
         * null, it has.
         */
        compiled: ICompiledTerminals = null;
        compiledLookups: any[][] = null;

        compiledId = NO_COMPILE_ID;

        /**
         * The global parse instance this is working with.
         *
         * @const
         */
        parseParent: Parse;

        /**
         * The parser rules, includes terminals.
         *
         * @const
         */
        rules: any[] = [];

        isOptional: boolean[] = [];

        /**
         * Choice parser rules can be built from multiple 'or' calls,
         * so we store them, and then push them onto 'rules' when they are done.
         *
         * They are stored here.
         */
        currentOr: any[] = null;

        /**
         * A flag to say 'or this expression' in the or list.
         * This expression is always added at the end.
         *
         * @type {boolean}
         */
        orThisFlag = false;

        /**
         * A flag used to denote if this is being called recursively.
         * This is used in two places:
         *  = grabbingTerminals
         *  = when parsing symbols
         *
         * This to avoid calling it recursively, as we only
         * need to visit each IParserRule once.
         */
        isRecursive = NO_RECURSION;

        /**
         * This flag is for when we recursively clear the recursion flag, but we
         * can't use 'isRecursive' to track cyclic routes, becasue we are
         * clearing it. So we use this one instead.
         */
        isClearingRecursion = false;

        /**
         * Used to count how many times we have re-entered the parseInner whilst
         * parsing.
         * 
         * However this is cleared when the number of symbol position is changed.
         * This way recursion is allowed, as we chomp symbols.
         */
        recursiveCount = 0;

        /**
         * A true recursive counter.
         *
         * This states how many times we are currently inside of this parser.
         * Unlike 'recursiveCount', this never lies.
         *
         * It exists so we can clear some items when we _first_ enter a rule.
         */
        internalCount = 0;

        isCyclic = false;
        isSeperator = false;

        hasBeenUsed = false;

        strName: string;

        constructor (parse: Parse) {
            this.parseParent = parse;

            this.strName = '';
        }

        name(name: string): IParserRule;
        name(): string;
        name(name?: string) : any {
            if (name !== undefined) {
                this.strName = name;
                return this;
            } else {
                return this.strName;
            }
        }

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
        repeatSeperator(match, seperator): IParserRule {
            return this.seperatingRule(match, seperator);
        }

        /**
         * The same as 'repeatSeperator', only matching is optional.
         *
         * @param match The rule to be matching and collecting.
         * @param seperator The seperator between each match.
         * @return This parser rule.
         */
        optionalSeperator( match, seperator ) {
            return this.seperatingRule(match, seperator).
                    markOptional(true);
        }

        seperatingRule(match, seperator) {
            this.endCurrentOr();

            return this.thenSingle(
                    new ParserRuleImplementation(this.parseParent).markSeperatingRule(match, seperator)
            );
        }

        /**
         * Parses the next items as being optional to each other.
         *
         * Multiple arguments can be given, or you can follow with more
         * 'or' options.
         */
        or() {
            var argsLen = arguments.length, args = new Array( argsLen );
            while ( argsLen-- > 0 ) { args[argsLen] = arguments[argsLen]; }

            return this.orAll(args);
        }

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
        either() {
            var argsLen = arguments.length, args = new Array( argsLen );
            while ( argsLen-- > 0 ) { args[argsLen] = arguments[argsLen]; }

            return this.orAll(args);
        }

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
        thenOr() {
            var argsLen = arguments.length, args = new Array( argsLen );
            while ( argsLen-- > 0 ) { args[argsLen] = arguments[argsLen]; }

            return this.
                    endCurrentOr().
                    orAll(args);
        }
        thenEither() {
            var argsLen = arguments.length, args = new Array( argsLen );
            while ( argsLen-- > 0 ) { args[argsLen] = arguments[argsLen]; }

            return this.
                    endCurrentOr().
                    orAll(args);
        }

        /**
         * This is an optional 'then' rule.
         *
         * Each of the values given is marked as being 'optional', and chomped if
         * a match is found, and skipped if a match fails.
         */
        optional() {
            var argsLen = arguments.length,
                args = new Array( argsLen );
            while ( argsLen-- > 0 ) { args[argsLen] = arguments[argsLen]; }

            return this.optionalAll(arguments);
        }

        /**
         * Same as 'either', except all values given are optional.
         * With this having no-match is acceptable.
         *
         * @return This IParserRule instance.
         */
        maybe() {
            var argsLen = arguments.length, args = new Array( argsLen );
            while ( argsLen-- > 0 ) { args[argsLen] = arguments[argsLen]; }

            return this.optionalAll(args);
        }

        /**
         * States the next items to parse.
         */
        a() {
            var argsLen = arguments.length, args = new Array( argsLen );
            while ( argsLen-- > 0 ) { args[argsLen] = arguments[argsLen]; }

            return this.thenAll(args);
        }

        /**
         * States the next items to parse.
         */
        then() {
            var argsLen = arguments.length, args = new Array( argsLen );
            while ( argsLen-- > 0 ) { args[argsLen] = arguments[argsLen]; }

            return this.thenAll(args);
        }

        /**
         *
         */
        onMatch(callback: (...args: any[]) => any): IParserRule {
            this.endCurrentOr();

            this.finallyFun = callback;

            return this;
        }

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
        parse(options: {
            src: string;
            inputSrc?: string;
            name?: string;
            onFinish: IFinishCallback;
        }) {
            var displaySrc,
                parseSrc,
                name = null,
                callback = null;

            if ( options instanceof String ) {
                displaySrc = parseSrc = options.valueOf();

            } else if ( typeof options === 'string' ) {
                displaySrc = parseSrc = options;

            } else {
                displaySrc = options['src'];
                parseSrc = options['inputSrc'] || displaySrc;

                name = options['name'] || null;
                callback = options['onFinish'] || null;
            }

            this.parseInner(displaySrc, parseSrc, callback, name);
        }

        symbolize(input, callback) {
            this.symbolizeInner(input, input, callback);
        }

        optionalThis() {
            return this.optionalSingle(this);
        }

        maybeThis() {
            return this.optionalSingle(this);
        }

        orThis() {
            var argsLen = arguments.length,
                args = new Array( argsLen );
            while ( argsLen-- > 0 ) { args[argsLen] = arguments[argsLen]; }

            this.orAll(args);

            this.orThisFlag = true;

            return this;
        }

        /**
         * 
         *      PRIVATE METHODS
         * 
         */

        cyclicOrSingle(rule: IParserRule) {
            this.orSingle(rule);

            return this.cyclicDone();
        }

        cyclicOrAll(rules: any[]) {
            this.orAll(rules);

            return this.cyclicDone();
        }

        cyclicDone() {
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
        }

        private markSeperatingRule(match, seperator) {
            this.
                    thenAll(match).
                    thenAll(seperator).
                    endCurrentOr();

            this.isSeperator = true;

            return this;
        }

        private errorIfInLeftBranch(rule:ParserRuleImplementation) {
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
        }

        /**
         * @param ignoreSpecial Pass in true to skip the cyclic check.
         */
        private errorIfEnded(ignoreSpecial:boolean = false) {
            if (this.compiled !== null) {
                throw new Error("New rule added, but 'finally' has already been called");
            }

            if ( ( this.isCyclic || this.isSeperator ) && !ignoreSpecial ) {
                throw new Error( "Cannot add more rules to a special IParserRule" );
            }
        }

        /**
         * Marks the last item in the rules set as being optional, or not optional.
         *
         * Optional rules can be skipped.
         */
        private markOptional(isOptional:boolean) {
            var rulesLen = this.rules.length;

            if (rulesLen === 0) {
                throw new Error("Item being marked as optional, when there are no rules.");
            }

            this.isOptional[rulesLen - 1] = isOptional;

            return this;
        }

        optionalAll(obj) {
            return this.
                    endCurrentOr().
                    helperAll( 'optionalSingle', obj );
        }

        private optionalSingle(obj) {
            this.thenSingle(obj);
            this.markOptional(true);

            return this;
        }

        private endCurrentOr() {
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
        }

        orAll(obj: any[]) {
            return this.helperAll('orSingle', obj);
        }

        private orSingle(other) {
            if (this.currentOr !== null) {
                this.currentOr.push(other);
            } else {
                this.currentOr = [other];
            }
        }

        private thenSingle(rule) {
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
        }

        thenAll(obj: any[]): ParserRuleImplementation {
            return this.
                    endCurrentOr().
                    helperAll('thenSingle', obj);
        }

        private helperAll(singleMethod: string, obj: any[]): ParserRuleImplementation {
            this.errorIfEnded();

            if ( !obj ) {
                if ( obj === undefined ) {
                    throw new Error( "Undefined 'then' rule given." );
                } else {
                    throw new Error( "Unknown 'then' rule given of type " + typeof ( obj ) );
                }
            } else if (
                    obj instanceof ParserRuleImplementation ||
                    obj instanceof Term
            ) {
                this[singleMethod]( obj );

            // something that can be used as a terminal
            } else {
                if ( obj instanceof String || obj instanceof Number ) {
                    obj = ( <any> obj ).valueOf();
                }

                var objType = typeof obj;

                if (
                    objType === 'string'    ||
                    objType === 'number'    ||
                    objType === 'function'
                ) {
                    this[singleMethod]( this.parseParent['terminal']( obj ) );

                // array
                } else if ( obj instanceof Array ) {
                    for ( var i = 0; i < obj.length; i++ ) {
                        this.helperAll( singleMethod, obj[i] );
                    }

                // ??? maybe an object of terminals?
                } else {
                    var keys = Object.keys( obj ),
                        keysLen = keys.length;

                    for ( var i = 0; i < keysLen; i++ ) {
                        var k = keys[i];

                        this.helperAll( singleMethod, obj[k] );
                    }
                }
            }

            return this;
        }

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
        private compile() {
            if ( this.compiled === null ) {
                this.compiled = this.optimize();
            }
        }

        terminalScan() {
            if ( this.compiledLookups === null ) {
                var rules = this.rules,
                    len = rules.length,
                    lookups = new Array(len);

                for (var i = 0; i < len; i++) {
                    var rule = rules[i],
                        ruleLookup = [];

                    // an 'or' rule
                    if (rule instanceof Array) {
                        for (var j = 0; j < rule.length; j++) {
                            var r = rule[j];

                            if (r instanceof Term) {
                                addRuleToLookup(r.id, ruleLookup, r);
                            } else {
                                var ids = [],
                                    seen = [];

                                bruteScan(r, seen, ids);

                                // merge this rules lookups in
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
                        var ids = [],
                            seen = [];

                        bruteScan(rule, seen, ids);

                        // merge this rules lookups in
                        for (var id in ids) {
                            addRuleToLookup(parseInt(id), ruleLookup, rule);
                        }
                    }

                    lookups[i] = ruleLookup;
                }

                this.compiledLookups = lookups;
            }
        }

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
        private optimize(): ICompiledTerminals {
            var terminals: Term[] = new Array(this.parseParent.getNumTerminals());

            var allRules: ParserRuleImplementation[] = [];
            var len = this.optimizeScan(terminals, 0, allRules);

            for (var i = 0; i < len; i++) {
                allRules[i].terminalScan();
            }

            return compressTerminals(terminals);
        }

        /**
         * Converts the rules stored in this parser into a trie
         * of rules.
         */
        optimizeScan(terminals: Term[], id: number, allRules: IParserRule[]): number {
            if (this.isRecursive === NO_RECURSION) {
                if (this.compiledId === NO_COMPILE_ID) {
                    this.compiledId = id;
                    allRules[id] = this;

                    id++;
                }

                this.endCurrentOr();

                this.isRecursive = RECURSION;

                var rules = this.rules,
                    len = rules.length;

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
        }

        private parseInner(input: string, parseInput: string, callback: IFinishCallback, name?: string): void {
            if (input === undefined || input === null) {
                throw new Error("no 'input' value provided");
            }

            var self = this,
                start = Date.now();

            this.parseSymbols( input, parseInput, name, function ( symbols, compileTime: number, symbolsTime: number ) {
                if ( symbols.hasErrors() ) {
                    callback( [], symbols.getErrors(),
                        {
                            compile : compileTime,
                            symbols : symbolsTime,
                            rules   : 0,
                            total   : Date.now() - start
                        }
                    );
                } else {
                    var rulesStart = Date.now();
                    var result = self.parseRules( symbols, input, parseInput );
                    var rulesTime = Date.now() - rulesStart;

                    util.future.run( function () {
                        callback( result.result, result.errors,
                            {
                                compile : compileTime,
                                symbols : symbolsTime,
                                rules   : rulesTime,
                                total   : Date.now() - start
                            }
                        );
                    });
                }
            });
        }

        private symbolizeInner(input: string, parseInput: string, callback: ISymbolizeCallback): void {
            this.parseSymbols(input, parseInput, null, function (symbols:SymbolResult, _compileTime:number, _symbolsTime:number) {
                callback(symbols.getTerminals(), symbols.getErrors());
            });
        }

        /**
         * Does the actual high level organisation or parsing the
         * source code.
         *
         * Callbacks are used internally, so it gets spread across
         * multiple JS executions.
         */
        private parseSymbols(input: string, parseInput: string, name, callback: { (symbols: SymbolResult, compileTime:number, symbolsTime: number): void; }): void {
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

            var symbolsTime = Date.now();
            var symbols = this.parseSymbolsInner(input, parseInput, name);
            symbolsTime = Date.now() - symbolsTime;

            callback(symbols, compileTime, symbolsTime);
        }

        /**
         * Resets the internal recursion flags.
         *
         * The flags are used to ensure the parser cannot run away,
         * but can be left in a strange state between use.
         */
        private clearRecursionFlag(): void {
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
        }

        private parseRules(symbols: SymbolResult, inputSrc: string, src: string) {
            this.hasBeenUsed = true;

            /*
             * Iterate through all symbols found, then going
             * through the grammar rules in order.
             * We jump straight to grammar rules using the
             * 'termsToRules' lookup.
             */

            var errors = [],
                hasError = null;

            if (symbols.hasMore()) {
                var onFinish = this.ruleTest(symbols, inputSrc);

                if (onFinish !== null) {
                    symbols.finalizeMove();

                    if (!symbols.hasMore()) {
                        return {
                            result: processResult( onFinish ),
                            errors: errors
                        };
                    } else {
                        errors.push( newRuleError( symbols.maxSymbol(), symbols.expected() ) );
                    }
                } else {
                    errors.push(newRuleError(symbols.maxSymbol(), symbols.expected()));
                }
            }

            return {
                result: null,
                errors: errors
            };
        }

        private ruleTest(symbols: SymbolResult, inputSrc: string): any {
            var args: any;

            if ( this.isSeperator || this.isCyclic ) {
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
                            args    : args,
                            apply   : false
                        };
                    }
                }
            } else {
                var finallyFun = this.finallyFun;

                if ( finallyFun === null ) {
                    return this.ruleTestNormal( symbols, inputSrc, true );
                } else {
                    args = this.ruleTestNormal( symbols, inputSrc, false );

                    if ( args === null ) {
                        return null;
                    } else {
                        return {
                            onFinish: finallyFun,
                            args    : args,
                            apply   : true
                        };
                    }
                }
            }
        }

        private ruleTestSeperator(symbols: SymbolResult, inputSrc: string): () =>any {
            var lookups = this.compiledLookups,
                peekID = symbols.peekID(),
                onFinish = null,
                rules = lookups[0],
                rulesLen = rules.length;

            var rule = null;

            if (rules.length <= peekID || (rule = rules[peekID]) === null) {
                return null;

            } else {
                var symbolI = symbols.idIndex(),
                    args = null;

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

                    var separator = null,
                        hasSeperator = false;

                    if ( separatorsLen <= peekID || (separator = separators[peekID]) === null) {
                        break;
                    } else if (separator instanceof Array) {
                        for (var j = 0; j < separator.length; j++) {
                            var r = separator[j];

                            if (
                                r instanceof ParserRuleImplementation &&
                                r.ruleTest(symbols, inputSrc) !== null
                            ) {
                                hasSeperator = true;
                                break;
                            } else if (r.id === peekID) {
                                symbols.next();
                                hasSeperator = true;
                                break;
                            }
                        }
                    } else if (
                            (
                                    (separator instanceof ParserRuleImplementation) &&
                                    separator.ruleTest(symbols, inputSrc) !== null
                            ) || (
                                    separator.id === peekID &&
                                    symbols.next()
                            )
                    ) {
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
                            var ruleLen = rule.length,
                                success = false;

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
        }

        private ruleTestNormal(symbols: SymbolResult, inputSrc: string, returnOnlyFirstArg:boolean): { (): any; }[] {
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

            var lookups = this.compiledLookups,
                optional = this.isOptional,
                onFinish = null,
                args = null;

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
                var lookupRules = lookups[i];
                var rule = null;

                // if rule is not found
                if (lookupRules.length <= peekID || (rule = lookupRules[peekID]) === null) {
                    if (optional[i]) {
                        if ( !returnOnlyFirstArg ) {
                            if ( args === null ) {
                                args = [null];
                                this.isRecursive = NO_RECURSION;
                            } else {
                                args.push( null );
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
                        var ruleLen:number = rule.length;

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
                        if ( returnOnlyFirstArg ) {
                            if ( args === null ) {
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
        }

        private ruleTestCyclic(symbols: SymbolResult, inputSrc: string): { (): any; }[] {
            var args = null,
                lookups = this.compiledLookups,
                len = lookups.length,
                onFinish = null;

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
        }

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
        private parseSymbolsInner( inputSrc: string, src: string, name: string ) {
            var source = new SourceLines(inputSrc, name);

            var symbolI: number = 0,

                len: number = src.length,

                symbols: Symbol[] = [],
                symbolIDs: number[] = [],

                ignores: Term[] = getIgnores( this.parseParent ),

                singleIgnore: boolean = ( ignores.length === 1 ),
                multipleIgnores: boolean = ( ignores.length > 1 ),
                ignoreTest: ITerminalFunction = ( ignores.length === 1 ? ignores[0].typeTestFunction : null ),
                postIgnoreMatchEvent: ITerminalFunction = ( ignores.length === 1 ? ignores[0].postMatch : null ),

                literals: Term[] = this.compiled.literals,
                terminals: Term[] = this.compiled.terminals,

                allTerms: Term[] = ignores.concat( literals, terminals ),

                ignoresLen: number = ignores.length,
                literalsLen: number = ignoresLen + literals.length,
                termsLen: number = literalsLen + terminals.length,

                literalsCharArrays: number[][] = [],
                literalsType: number[] = [],

                symbolIDToTerms = this.compiled.idToTerms,

                postMatches: ITerminalFunction[] = new Array( termsLen ),

                termTests: ITerminalFunction[] = [],
                termIDs: number[] = new Array( termsLen ),

                /**
                 * An invalid index in the string, used to denote
                 * no error.
                 *
                 * @const
                 * @private
                 */
                NO_ERROR:number = -1,
                errorStart:number = NO_ERROR,
                errors: IParseError[] = [],

                logError: ILogErrorFunction = function ( msg: string, endI: number ) {
                    if ( endI <= i ) {
                        endI = i + 1;
                    }
                    var match = source.substring( i, endI );

                    errors.push( {
                        match: match,
                        line: source.getLine( i ),
                        message: msg
                    });
                };

            var literalsLookup: number[][] = [];

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
            for (var i = 0; i < allTerms.length; i++) {
                var term = allTerms[i];

                if ( i < ignoresLen ) {
                    termTests.push( term.typeTestFunction );
                    literalsType.push( 0 );
                    literalsCharArrays.push( null );
                } else if (i < literalsLen) {
                    termTests.push( null );
                    literalsType.push( term.type );

                    var code: number;
                    if ( term.type === TYPE_STRING ) {
                        var stringCodes = term.typeTestString;
                        code = stringCodes[0];
                        literalsCharArrays.push( stringCodes );
                    } else {
                        code = term.typeTestCode;
                        literalsCharArrays.push( null );
                    }

                    var arr: number[] = literalsLookup[code];
                    if ( arr === undefined ) {
                        literalsLookup[code] = [i];
                    } else {
                        arr.push( i );
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

                    if ( singleIgnore ) {
                        r = ignoreTest( src, i, code, len, logError );

                        if ( r > i ) {
                            code = src.charCodeAt( r );

                            if ( postIgnoreMatchEvent !== null ) {
                                var r2 = postIgnoreMatchEvent( src, r, code, len, logError );

                                if ( r2 > r ) {
                                    code = src.charCodeAt( i = r2 );
                                } else {
                                    i = r;
                                }
                            } else {
                                i = r;
                            }
                        }

                    } else if ( multipleIgnores ) {
                        while ( j < ignoresLen ) {
                            r = termTests[j]( src, i, code, len, logError );

                            if ( r > i ) {
                                code = src.charCodeAt( r );

                                var postMatchEvent = postMatches[j];
                                if ( postMatchEvent !== null ) {
                                    var r2 = postMatchEvent( src, r, code, len, logError );

                                    if ( r2 > r ) {
                                        code = src.charCodeAt( i = r2 );
                                    } else {
                                        i = r;
                                    }
                                } else {
                                    i = r;
                                }

                                j = ( j === 0 ) ? 1 : 0;
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
                    if ( litsLookups !== undefined ) {
                        scan_literals:
                        for ( var k = 0; k < litsLookups.length; k++ ) {
                            var termI = litsLookups[k];
                            var type = literalsType[termI];

                            /*
                             * A string,
                             * but it is actually an array of code characters.
                             */
                            if (type === TYPE_STRING) {
                                termI = litsLookups[k];

                                var matchArray:number[] = literalsCharArrays[termI];
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
                            } else if ( type === TYPE_CODE ) {
                                // no inner check needed here, because the lookup in the array it's self, is enough to confirm
                                r = i + 1;

                            /*
                             * Single alpha-numeric codes, such as 'a' or 'b'.
                             *
                             * I expect it is unpopular, which is why it is last.
                             */
                            } else if ( type === TYPE_CODE_ALPHANUMERIC ) {
                                if ( ! isWordCode(src.charCodeAt(i + 1)) ) {
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
                                if ( errorStart !== NO_ERROR ) {
                                    errors.push( newParseError(
                                            source,
                                            errorStart,
                                            i
                                    ));

                                    errorStart = NO_ERROR;
                                }

                                var postMatchEvent = postMatches[termI];
                                if (postMatchEvent !== null) {
                                    code = src.charCodeAt(r);

                                    var r2 = postMatchEvent(src, r, code, len, logError);

                                    if (r2 > r) {
                                        r = r2;
                                    }
                                }

                                symbols[symbolI++] = new Symbol(
                                        allTerms[termI],
                                        source,
                                        i,
                                        r
                                );

                                i = r;

                                continue scan;
                            }
                        }
                    }

                    j = literalsLen;

                    /*
                     * Test 'non-literals', i.e. variable.
                     */

                    while (j < termsLen) {
                        r = termTests[j]( src, i, code, len, logError );

                        if ( r > i ) {
                            symbolIDs[symbolI] = termIDs[j];

                            // If we were in error mode,
                            // report the error section.
                            //
                            // This is from the last terminal,
                            // to this one, but ignores whitespace.
                            if (errorStart !== NO_ERROR) {
                                errors.push(newParseError(
                                        source,
                                        errorStart,
                                        i
                                ));

                                errorStart = NO_ERROR;
                            }

                            var postMatchEvent = postMatches[j];
                            if (postMatchEvent !== null) {
                                code = src.charCodeAt(r);

                                var r2: number = postMatchEvent( src, r, code, len, logError );

                                if (r2 !== 0 && r2 > r) {
                                    r = r2;
                                }
                            }

                            symbols[symbolI++] = new Symbol(
                                    allTerms[j],
                                    source,
                                    i,
                                    r
                            );

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
                    errors.push(newParseError(
                            source,
                            errorStart,
                            i
                    ));
                }

                return new SymbolResult(
                        errors,

                        symbols,
                        symbolIDs,

                        symbolI,

                        symbolIDToTerms
                );
            }
        }
    }

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

    var ignoreSingle: {
        (ps: Parse, match: { [name: string]: any; } ): void;
        (ps: Parse, match: any[]): void;
        (ps: Parse, match: any): void;
    } =
        function (ps: Parse, term: any) {
            if (term instanceof Term) {
                ingoreInner( ps, term );
            } else {
                if ( typeof term === 'string' || term instanceof String || isFunction( term ) ) {
                    ignoreSingle(ps, terminal(term));
                } else if (term instanceof Array) {
                    for (var i = 0; i < term.length; i++) {
                        ignoreSingle(ps, terminalsInner(term[i], null));
                    }
                } else if (term instanceof Object) {
                    var keys = Object.keys( term ),
                        keysLen = keys.length;

                    for ( var i = 0; i < keysLen; i++ ) {
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
    function getIgnores(ps: Parse) : Term[] {
        return ps.ignores;
    }

    function ingoreInner(ps: Parse, t: Term) : void {
        ps.ignores.push(t);
    }

    function terminalsInner(ps: Parse, t: Term, termName?: string): Term;
    function terminalsInner(ps: Parse, t: string, termName?: string): Term;
    function terminalsInner(ps: Parse, t: any[], termName?: string): Term;
    function terminalsInner(ps: Parse, t: ITerminalFunction, termName?: string): Term;
    function terminalsInner(ps: Parse, t: Object, termName?: string): Object;
    function terminalsInner(ps: Parse, t: any, termName?: string):any {
        if (t instanceof Object && !isFunction(t) && !(t instanceof Array)) {
            var terminals = {};

            var keys = Object.keys( t ), keysLen = keys.length;
            for ( var i = 0; i < keysLen; i++ ) {
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
    export class Parse {
        /**
         * A counting id used for easily and uniquely
         * identifying terminals.
         *
         * It's used over a hash code so we can place the
         * terminals inside of an array later.
         *
         * @type {number}
         */
        terminalID: number = INVALID_TERMINAL + 1;

        /**
         * An array of Terminals to ignore.
         *
         * These are tested before the main terminals.
         */
        ignores: Term[] = [];

        constructor () { }

        /**
         * @return {number} The number of terminals created with this Parse.
         */
        getNumTerminals() {
            /*
             * INVALID_TERMINAL+1 is added to terminalID at the start,
             * so removing it ensures we are only left with the number of terminals created
             */
            return this.terminalID - (INVALID_TERMINAL + 1);
        }

        rule(): IParserRule {
            return new ParserRuleImplementation(this);
        }

        name(name: string): IParserRule {
            return new ParserRuleImplementation(this).name(name);
        }

        a(...args: any[]): IParserRule;
        a() : IParserRule {
            var argsLen = arguments.length, args = new Array( argsLen );
            while ( argsLen-- > 0 ) { args[argsLen] = arguments[argsLen]; }

            return new ParserRuleImplementation(this).thenAll( args );
        }

        or(...args: any[]): IParserRule;
        or(): IParserRule  {
            var argsLen = arguments.length, args = new Array( argsLen );
            while ( argsLen-- > 0 ) { args[argsLen] = arguments[argsLen]; }

            return new ParserRuleImplementation(this).orAll(args);
        }
        either(...args: any[]): IParserRule;
        either(): IParserRule  {
            var argsLen = arguments.length, args = new Array( argsLen );
            while ( argsLen-- > 0 ) { args[argsLen] = arguments[argsLen]; }

            return new ParserRuleImplementation(this).orAll(args);
        }

        optional(...args: any[]): IParserRule;
        optional(): IParserRule  {
            var argsLen = arguments.length, args = new Array( argsLen );
            while ( argsLen-- > 0 ) { args[argsLen] = arguments[argsLen]; }

            return new ParserRuleImplementation(this).optionalAll(args);
        }
        maybe(...args: any[]): IParserRule;
        maybe(): IParserRule  {
            var argsLen = arguments.length, args = new Array( argsLen );
            while ( argsLen-- > 0 ) { args[argsLen] = arguments[argsLen]; }

            return new ParserRuleImplementation(this).optionalAll(args);
        }

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
        ignore(...args: any[]): Parse;
        ignore() {
            for (var i = 0; i < arguments.length; i++) {
                ignoreSingle(this, arguments[i]);
            }

            return this;
        }

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
        repeatSeperator(match, seperator): IParserRule  {
            return new ParserRuleImplementation(this).repeatSeperator(match, seperator);
        }

        optionalSeperator(match, seperator): IParserRule  {
            return new ParserRuleImplementation(this).optionalSeperator(match, seperator);
        }

        /**
         * A special, one-off IParserRule. This will run the statements given
         * repeatedly, until none of them match.
         *
         * This allows certain recursive rules to be built trivially.
         *
         * It's onMatch is called multiple times, allowing you to build up
         */
        repeatEither(...args: any[]): IParserRule;
        repeatEither(): IParserRule  {
            var argsLen = arguments.length, args = new Array( argsLen );
            while ( argsLen-- > 0 ) { args[argsLen] = arguments[argsLen]; }

            return new ParserRuleImplementation(this).cyclicOrAll(args);
        }

        repeat(...args: any[]): IParserRule;
        repeat(): IParserRule  {
            var argsLen = arguments.length, args = new Array( argsLen );
            while ( argsLen-- > 0 ) { args[argsLen] = arguments[argsLen]; }

            return new ParserRuleImplementation(this).cyclicOrSingle(
                    new ParserRuleImplementation(this).thenAll(args)
            )
        }

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
        terminals(t: Term): Term;
        terminals(t: string): Term;
        terminals(t: any[]): Term;
        terminals(t: ITerminalFunction): Term;
        terminals(t: Object): any;
        terminals(obj:any): any {
            return terminalsInner(this, obj, null);
        }
    }

    var pInstance = new Parse();

    export function rule(): IParserRule {
        return new ParserRuleImplementation(pInstance);
    }

    export function name(name: string): IParserRule {
        return new ParserRuleImplementation(pInstance).name(name);
    }

    export function a(...args: any[]): IParserRule;
    export function a(): IParserRule  {
        var argsLen = arguments.length, args = new Array( argsLen );
        while ( argsLen-- > 0 ) { args[argsLen] = arguments[argsLen]; }

        return new ParserRuleImplementation(pInstance).thenAll(args);
    }

    export function either(...args: any[]): IParserRule;
    export function either(): IParserRule  {
        var argsLen = arguments.length, args = new Array( argsLen );
        while ( argsLen-- > 0 ) { args[argsLen] = arguments[argsLen]; }

        return new ParserRuleImplementation(pInstance).orAll(args);
    }

    export function optional(...args: any[]): IParserRule;
    export function optional(): IParserRule  {
        var argsLen = arguments.length, args = new Array( argsLen );
        while ( argsLen-- > 0 ) { args[argsLen] = arguments[argsLen]; }

        return new ParserRuleImplementation(pInstance).optionalAll(args);
    }

    export var maybe = optional;

    export function ignore(...args: any[]): Parse;
    export function ignore() {
        for (var i = 0; i < arguments.length; i++) {
            ignoreSingle(pInstance, arguments[i]);
        }

        return pInstance;
    }

    export function repeatSeperator(match, seperator): IParserRule  {
        return new ParserRuleImplementation(pInstance).repeatSeperator(match, seperator);
    }

    export function optionalSeperator(match, seperator): IParserRule  {
        return new ParserRuleImplementation(pInstance).optionalSeperator(match, seperator);
    }

    export function repeatEither(...args: any[]): IParserRule;
    export function repeatEither(): IParserRule  {
        var argsLen = arguments.length, args = new Array( argsLen );
        while ( argsLen-- > 0 ) { args[argsLen] = arguments[argsLen]; }

        return new ParserRuleImplementation(pInstance).cyclicOrAll(args);
    }

    export function repeat(...args: any[]): IParserRule;
    export function repeat(): IParserRule {
        var argsLen = arguments.length, args = new Array( argsLen );
        while ( argsLen-- > 0 ) { args[argsLen] = arguments[argsLen]; }

        return new ParserRuleImplementation(pInstance).cyclicOrSingle(
                new ParserRuleImplementation(pInstance).thenAll(args)
        )
    }

    /**
     * Code checking utility functions.
     * 
     * Each of these functions must be given the 'charCodeAt' value,
     * from a string, to check. Hence why they are listed under 'code'.
     */
    export var code = {
        'isNumeric': isNumericCode,
        'isHex': isHexCode,
        'isAlpha': isAlphaCode,
        'isAlphaNumeric': isAlphaNumericCode
    };

    export function terminals(t: Term): Term;
    export function terminals(t: string): Term;
    export function terminals(t: any[]): Term;
    export function terminals(t: ITerminalFunction): Term;
    export function terminals( t:Object ) : any {
        return terminalsInner( pInstance, t, null );
    }

    /**
     * A terminal for capturing tabs and spaces. It does _not_ include
     * end of lines.
     * 
     * For the end of line version, use Parse.WHITESPACE_AND_END_OF_LINE
     */

    export function terminal( match:Term, termName?:string ): Term;
    export function terminal( match:string, termName?:string ): Term;
    export function terminal( match:number, termName?:string ): Term;
    export function terminal( match:ITerminalFunction, termName?:string ): Term;
    export function terminal( match:any[], termName?:string ): Term;
    export function terminal( match: Object, termName?:string ): Object;
    export function terminal( match:any, termName?:string ) : any {
        return terminalsInner( pInstance, match, termName );
    }

    export module terminal {
        /*
         * These are the terminals provided by Parse,
         * which people can use to quickly build a language.
         */
        export var WHITESPACE: ITerminalFunction = function ( src: string, i: number, code: number, len: number ): number {
            while ( code === SPACE || code === TAB ) {
                code = src.charCodeAt( ++i );
            }

            return i;
        }

        /**
         * A terminal that matches: tabs, spaces, \n and \r characters.
         */
        export var WHITESPACE_END_OF_LINE:ITerminalFunction = function (src:string, i:number, code:number, len:number): number {
            while (code === SPACE || code === TAB || code === SLASH_N || code === SLASH_R) {
                code = src.charCodeAt( ++i );
            }

            return i;
        }

        /**
         * A number terminal.
         */
        export var NUMBER: ITerminalFunction = function ( src: string, i: number, code: number, len: number ): number {
            if ( ZERO <= code && code <= NINE ) {

                // 0x hex number
                if ( code === ZERO && src.charCodeAt( i + 1 ) === LOWER_X ) {
                    i++;

                    do {
                        code = src.charCodeAt( ++i );
                    } while (
                        code === UNDERSCORE ||
                        isHexCode( code )
                    )

                // normal number
                } else {
                    do {
                        code = src.charCodeAt( ++i );
                    } while (
                        code === UNDERSCORE ||
                        ( code >= ZERO && code <= NINE )
                    )

                    // Look for Decimal Number
                    if (
                        src.charCodeAt( i ) === FULL_STOP &&
                        isNumericCode( src.charCodeAt( i + 1 ) )
                    ) {
                        i++;

                        do {
                            code = src.charCodeAt( ++i );
                        } while (
                            code === UNDERSCORE ||
                            ( code >= ZERO && code <= NINE )
                        )
                    }
                }

                return i;
            }

            return 0;
        }

        /**
         * A C-style single line comment terminal.
         * 
         * Matches everything from a // onwards.
         */
        export var C_SINGLE_LINE_COMMENT: ITerminalFunction = function ( src: string, i: number, code: number, len: number ): number {
            if ( code === SLASH && src.charCodeAt( i + 1 ) === SLASH ) {
                i++;

                do {
                    code = src.charCodeAt( ++i );
                } while (
                        i < len &&
                        code !== SLASH_N
                );

                return i;
            }

            return 0;
        }

        /**
         * A C-like multi line comment, matches everything from '/ *' to a '* /', (without the spaces).
         */
        export var C_MULTI_LINE_COMMENT: ITerminalFunction = function ( src: string, i: number, code: number, len: number ): number {
            if ( code === SLASH && src.charCodeAt( i + 1 ) === STAR ) {
                // +1 is so we end up skipping two characters,
                // the / and the *, before we hit the next char to check
                i++

                do {
                    i++;

                    // error!
                    if ( i >= len ) {
                        return 0;
                    }
                } while ( !(
                    src.charCodeAt( i ) === STAR &&
                    src.charCodeAt( i + 1 ) === SLASH
                    ) );

                // plus 2 to include the end of the comment
                return i + 2;
            }

            return 0;
        }

        /**
         * A terminal for a string, double or single quoted.
         */
        export var STRING: ITerminalFunction = function ( src: string, i: number, code: number, len: number ): number {
            // double quote string
            if ( code === DOUBLE_QUOTE ) {
                do {
                    i++;

                    // error!
                    if ( i >= len ) {
                        return 0;
                    }
                } while ( !(
                        src.charCodeAt( i ) === DOUBLE_QUOTE &&
                        src.charCodeAt( i - 1 ) !== BACKSLASH
                ) )

                return i + 1;
                // single quote string
            } else if ( code === SINGLE_QUOTE ) {
                do {
                    i++;

                    // error!
                    if ( i >= len ) {
                        return 0;
                    }
                } while ( !(
                        src.charCodeAt( i ) === SINGLE_QUOTE &&
                        src.charCodeAt( i - 1 ) !== BACKSLASH
                ) )

                return i + 1;
            }

            return 0;
        }
    }
}
