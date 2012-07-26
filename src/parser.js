"use strict";

var quby = window['quby'] || {};

/**
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

    var log = function() {
        if ( window['console'] && window['console']['log'] ) {
            window['console']['log'].apply( window['console'], arguments );
        }
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

    var isAlphaCode = function(code) {
        return (code >= LOWER_A && code <= LOWER_Z);
    }

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
    var preParse = (function() {
        var pushWhitespace = function( newSrc, size ) {
            var diff5 = (size/5)|0;

            // push the whitespace on in clumps of 5 characters
            for ( var i = 0; i < diff5; i++ ) {
                newSrc.push( '     ' );
            }

            // then push on the remainder
            var remainder = size % 5;
            if ( remainder === 1 ) {
                newSrc.push( ' ' );
            } else if ( remainder === 2 ) {
                newSrc.push( '  ' );
            } else if ( remainder === 3 ) {
                newSrc.push( '   ' );
            } else if ( remainder === 4 ) {
                newSrc.push( '    ' );
            }
        };

        var getLeft = function (src, i) {
            if (i > 0) {
                return src.charCodeAt(i - 1);
            } else {
                return null;
            }
        };

        var getRight = function (src, i) {
            return getR(src, i + 1);
        };

        var getR = function (src, i) {
            if (i < src.length) {
                return src.charCodeAt(i);
            } else {
                return null;
            }
        };

        /**
         * alterations:
         *  : removes comments
         *      // single line comments
         *      / * * / multi-line comments
         */
        var stripComments = function (src) {
            var inAdmin         = false;
            var inPreAdmin      = false;
            var inSingleComment = false;
            var inDoubleString  = false;
            var inSingleString  = false;

            /**
             * This is a count so we can track nested comments.
             *
             * When it is 0, there is no comment. When it is greater than 0, we
             * are in a comment.
             */
            var multiCommentCount = 0,
                newSrc = [],
                startI = 0;

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
                                        c === HASH         &&
                            getR(src,i+1) === GREATER_THAN &&
                            getR(src,i+2) === HASH
                    ) {
                        inAdmin = false;
                        i += 2;
                    }
                } else if ( inPreAdmin ) {
                    if (
                                        c === HASH         &&
                            getR(src,i+1) === GREATER_THAN &&
                            getR(src,i+2) === HASH
                    ) {
                        inPreAdmin = false;
                        i += 2;
                    }
                } else if ( inDoubleString ) {
                    if (
                                          c === DOUBLE_QUOTE &&
                            getLeft(src, i) !== BACKSLASH
                    ) {
                        inDoubleString = false;
                    }
                } else if ( inSingleString ) {
                    if (
                                          c === SINGLE_QUOTE &&
                            getLeft(src, i) !== BACKSLASH
                    ) {
                        inSingleString = false;
                    }
                } else if ( inSingleComment ) {
                    if ( c === SLASH_N ) {
                        inSingleComment = false;
                        pushWhitespace( newSrc, i-startI );
                        startI = i;
                    }
                } else if ( multiCommentCount > 0 ) {
                    if (
                                          c === SLASH &&
                            getRight(src,i) === STAR
                    ) {
                        multiCommentCount++;
                    } else if (
                                           c === STAR &&
                            getRight(src, i) === SLASH
                    ) {
                        multiCommentCount--;

                        // +1 so we include this character too

                        i++;

                        if ( multiCommentCount === 0 ) {
                            pushWhitespace( newSrc, (i-startI)+1 );
                            startI = i+1;
                        }
                    }
                } else {
                    /*
                     * Look to enter a new type of block,
                     * such as comments, strings, inlined-JS code.
                     */

                    // multi-line comment
                    if (
                            c === SLASH &&
                            getRight(src, i) === STAR
                    ) {
                        newSrc.push( src.substring(startI, i) );

                        startI = i;
                        i++;

                        multiCommentCount++;
                    } else if (
                            c === SLASH &&
                            getRight(src, i) === SLASH
                    ) {
                        newSrc.push( src.substring(startI, i) );

                        startI = i;
                        inSingleComment = true;

                        i++;
                    // look for strings
                    } else if (c === DOUBLE_QUOTE) {
                        inDoubleString = true;
                    } else if (c === SINGLE_QUOTE) {
                        inSingleString = true;
                    } else if (c === HASH) {
                        if (
                                getR(src,i+1) === LESS_THAN &&
                                getR(src,i+2) === HASH
                        ) {
                            inAdmin = true;

                            i += 2;
                        } else if (
                                getR(src,i+1) === LESS_THAN &&
                                getR(src,i+2) === LOWER_P   &&
                                getR(src,i+3) === LOWER_R   &&
                                getR(src,i+4) === LOWER_E   &&
                                getR(src,i+5) === HASH
                        ) {
                            inPreAdmin = true;

                            i += 5;
                        }
                    }
                }
            }

            if ( multiCommentCount > 0 || inSingleComment ) {
                pushWhitespace( newSrc, src.length-startI );
            } else {
                newSrc.push( src.substring(startI) );
            }

            // this should always be the case, but just incase it isn't ...
            if ( newSrc.length > 0 ) {
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
         *  : ensures all '}' have an end of line before them
         *  : ensures all 'end' keywords have an end of line before them
         */
        var preScanParse = function ( source ) {
            source = source.
                    toLowerCase().
                    replace(/\t/g, ' ').
                    replace(/\r/g, '\n');

            return source;

            var i = 0;
            for ( var i = 0; i < source.length; i++ ) {
                var c = source.charCodeAt(i);

                if ( c !== SLASH_N && c !== SPACE ) {
                    break;
                }
            }

            if ( i > 0 ) {
                var newStr = [];
                pushWhitespace( newStr, i );
                newStr.push( source );

                return newStr.join( '' );
            } else {
                return source;
            }
        };

        return function( src ) {
            return stripComments(
                    preScanParse(src)
            );
        };
    })();

    parse['ignore']( parse['terminal']['WHITESPACE'] );

    /**
     * WARNING! The terminal names used here are also used for display purposes.
     *          So give them meaningful names!
     */
    var terminals = parse.terminals({
            endOfStatement: function( src, i, code, len ) {
                if (
                        code === SLASH_N ||
                        code === SEMI_COLON
                ) {
                    do {
                        i++;
                        code = src.charCodeAt(i);
                    } while (
                            code === SLASH_N    ||
                            code === SEMI_COLON ||
                            code === SPACE      ||
                            code === TAB
                    );

                    return i;
                }
            },

            keywords: {
                    DO          : 'do',
                    END         : 'end',

                    IF          : 'if',
                    ELSE        : 'else',

                    ELSIF       : 'elsif',
                    ELSEIF      : 'elseif',
                    ELSE_IF     : 'else if',

                    THEN        : 'then',

                    WHILE       : 'while',
                    UNTIL       : 'until',
                    LOOP        : 'loop',

                    DEF         : 'def',

                    NEW         : 'new',
                    CLASS       : 'class',
                    MODULE      : 'module',

                    RETURN      : 'return',

                    YIELD       : 'yield',

                    THIS        : 'this'
            },

            symbols: {
                    comma       : ',',
                    at          : '@',

                    leftBracket : '(',
                    rightBracket: ')',

                    leftBrace   : '{',
                    rightBrace  : '}',

                    leftSquare  : '[',
                    rightSquare : ']'
            },

            literals: {
                    TRUE        : 'true' ,
                    FALSE       : 'false',
                    NULL        : 'null',
                    NIL         : 'nil',

                    number: parse.terminal.NUMBER,
                    string: parse.terminal.STRING
            },

            ops: {
                    power               : '**',

                    divide              : '/',
                    multiply            : '*',
                    plus                : '+',
                    subtract            : '-',
                    modulus             : '%',

                    colon               : ':',
                    mapArrow            : '=>',

                    equality            : '==',

                    shiftLeft           : '<<',
                    shiftRight          : '>>',

                    lessThanEqual       : '<=',
                    greaterThanEqual    : '>=',
                    lessThan            : '<',
                    greaterThan         : '>',

                    assignment          : '=',

                    dot                 : '.',

                    logicalAnd          : ['&&', 'and'],
                    logicalOr           : ['||', 'or'],

                    not                 : ['!', 'not'],

                    bitwiseAnd          : '&',
                    bitwiseOr           : '|'
            },

            identifiers: {
                    variableName: function(src, i, code, len) {
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

            admin: {
                hashDef : '#def',

                inline: function(src, i, code, len) {
                    // #<# random( javascript.code ) #>#
                    if (
                                           code === HASH      &&
                            src.charCodeAt(i+1) === LESS_THAN &&
                            src.charCodeAt(i+2) === HASH
                    ) {
                        i += 2;

                        /*
                         * Jump in segments of 3, and then check if we hit the
                         * closing #># at the beginning, middle or end.
                         */
                        do {
                            i += 3;

                            code = src.charCodeAt(i);

                            if ( code === HASH ) {
                                // land at the end of the closing section
                                if (
                                        src.charCodeAt(i-1) === GREATER_THAN &&
                                        src.charCodeAt(i-2) === HASH
                                ) {
                                    return i+1;
                                // land at the beginning
                                } else if (
                                        src.charCodeAt(i+1) === GREATER_THAN &&
                                        src.charCodeAt(i+2) === HASH
                                ) {
                                    return i+3;
                                }
                            // land in the middle
                            } else if (
                                                   code === GREATER_THAN &&
                                    src.charCodeAt(i-1) === HASH         &&
                                    src.charCodeAt(i+1) === HASH
                            ) {
                                    return i+2;
                            }
                        } while ( i < len );

                        return len;
                    }
                },

                preInline: function(src, i, code, len) {
                    // if #<pre# javascript.code.here #>#
                    if (
                                           code === HASH        &&
                            src.charCodeAt(i+1) === LESS_THAN   &&
                            src.charCodeAt(i+2) === LOWER_P     &&
                            src.charCodeAt(i+3) === LOWER_R     &&
                            src.charCodeAt(i+4) === LOWER_E     &&
                            src.charCodeAt(i+5) === HASH
                    ) {
                        i += 5;

                        /*
                         * Jump in segments of 3, and then check if we hit the
                         * closing #># at the beginning, middle or end.
                         */
                        do {
                            i += 3;

                            code = src.charCodeAt(i);

                            if ( code === HASH ) {
                                // land at the end of the closing section
                                if (
                                        src.charCodeAt(i-1) === GREATER_THAN &&
                                        src.charCodeAt(i-2) === HASH
                                ) {
                                    return i+1;
                                // land at the beginning
                                } else if (
                                        src.charCodeAt(i+1) === GREATER_THAN &&
                                        src.charCodeAt(i+2) === HASH
                                ) {
                                    return i+3;
                                }
                            // land in the middle
                            } else if (
                                                   code === GREATER_THAN &&
                                    src.charCodeAt(i-1) === HASH         &&
                                    src.charCodeAt(i+1) === HASH
                            ) {
                                    return i+2;
                            }
                        } while ( i < len );

                        return len;
                    }
                }
            }
    });

    /*
     * Remove the end of lines after certain symbols.
     */

    var applySymbolMatch = function( syms, event ) {
        if ( syms.symbolMatch ) {
            syms.symbolMatch( event );
        } else {
            for ( var k in syms ) {
                applySymbolMatch( syms[k], event );
            }
        }
    };

    applySymbolMatch(
            [
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
            ],
            function( src, i, code, len ) {
                while (
                        code === SLASH_N    ||
                        code === SEMI_COLON ||
                        code === SPACE
                ) {
                    i++;
                    code = src.charCodeAt(i);
                }

                return i;
            }
    );

    /*
     * The values returned after it has been matched, when the symbol is
     * evaluated, and begins being turned into the AST.
     */

    terminals.endOfStatement.onMatch( function() {
        return null;
    });

    terminals.symbols.comma.onMatch( function() {
        return null;
    })

    /* The onMatch callbacks for altering the symbols when matched. */
    terminals.keywords.NEW.onMatch( function(match, offset) {
        return new quby.lexer.Sym( offset, 'new' );
    });
    terminals.keywords.RETURN.onMatch( function(match, offset) {
        return new quby.lexer.Sym( offset, 'return' );
    });

    terminals.identifiers.variableName.onMatch( function(match, offset) {
        var sym = new quby.lexer.IdSym( offset, match );
        sym.symbol = terminals.identifiers.variableName;
        return sym;
    } );

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
    terminals.literals.NIL.onMatch( function(match, offset) {
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

    terminals.admin.inline.onMatch( function(match, offset) {
        return new quby.syntax.Inline(
                new quby.lexer.Sym(
                        offset,
                        match.substring( 3, match.length-3 )
                )
        );
    });
    terminals.admin.preInline.onMatch( function(match, offset) {
        return new quby.syntax.PreInline(
                new quby.lexer.Sym(
                        offset,
                        match.substring( 6, match.length-3 )
                )
        );
    });

    var ops = terminals.ops;

    /* Parser Rules */

    var statement = parse(),
        expr = parse();

    var statements = parse.
            repeatSeperator( statement, terminals.endOfStatement ).
            optional( terminals.endOfStatement ).
            onMatch( function(stmts, endEnd) {
                if ( stmts === null ) {
                    return new quby.syntax.Statements();
                } else {
                    return new quby.syntax.Statements( stmts );
                }
            });

    var exprs = parse.
            repeatSeperator( expr, terminals.symbols.comma ).
            onMatch( function(exprs) {
                return new quby.syntax.Parameters().
                        set( exprs );
            });

    var variables = parse.either( terminals.identifiers, terminals.keywords.THIS ).
            onMatch( function(identifier) {
                switch ( identifier.symbol ) {
                    case terminals.identifiers.variableName:
                        return new quby.syntax.Variable( identifier );
                    case terminals.identifiers.global:
                        return new quby.syntax.GlobalVariable(
                                new quby.lexer.IdSym(
                                        identifier.offset,
                                        identifier.match
                                )
                        );
                    case terminals.identifiers.field:
                        return new quby.syntax.FieldVariable(
                                new quby.lexer.IdSym(
                                        identifier.offset,
                                        identifier.match.substring(1)
                                )
                        );
                    case terminals.keywords.THIS:
                        return new quby.syntax.ThisVariable( identifier.offset, null );
                    default:
                        log(identifier);
                        throw new Error("Unknown terminal met for variables: " + identifier);
                }
            });

    var variableAssignments = parse.either( terminals.identifiers ).
            onMatch( function(identifier) {
                switch ( identifier.symbol ) {
                    case terminals.identifiers.variableName:
                        return new quby.syntax.VariableAssignment( identifier );
                    case terminals.identifiers.global:
                        return new quby.syntax.GlobalVariableAssignment(
                                new quby.lexer.IdSym(
                                        identifier.offset,
                                        identifier.match
                                )
                        );
                    case terminals.identifiers.field:
                        return new quby.syntax.FieldVariableAssignment(
                                new quby.lexer.IdSym(
                                        identifier.offset,
                                        identifier.match.substring(1)
                                )
                        );
                    default:
                        throw new Error("Unknown terminal met for variables: " + identifier);
                }
            });

    var arrayAccess = parse.
            a(
                    expr,
                    terminals.symbols.leftSquare,
                    expr,
                    terminals.symbols.rightSquare
            ).
            onMatch( function( arrayExpr, leftSquare, keyExpr, rightSquare) {
                return new quby.syntax.ArrayAccess( arrayExpr, keyExpr );
            });

    var singleOpExpr = parse.
            either(
                    terminals.ops.plus,
                    terminals.ops.subtract,
                    terminals.ops.not
            ).
            then( expr ).
            onMatch( function( op, expr ) {
                switch ( op.symbol ) {
                    case ops.not:
                        return new quby.syntax.Not( expr );
                    case terminals.ops.subtract:
                        return new quby.syntax.SingleSub(expr);
                    case ops.plus:
                        return expr;
                    default:
                        log( op );
                        throw new Error("Unknown singleOpExpr match");
                }
            } );

    var doubleOpExpr = parse.
            a( expr ).
            thenEither(
                    ops.plus,
                    ops.subtract,
                    ops.divide,
                    ops.multiply,

                    ops.logicalAnd,
                    ops.logicalOr,

                    ops.equality,

                    ops.modulus,

                    ops.lessThan,
                    ops.greaterThan,
                    ops.lessThanEqual,
                    ops.greaterThanEqual,

                    ops.shiftLeft,
                    ops.shiftRight,

                    ops.bitwiseAnd,
                    ops.bitwiseOr,

                    ops.power
            ).
            then( expr ).
            onMatch( function(left, op, right) {
                switch( op.symbol ) {
                    case ops.plus:
                        return new quby.syntax.Add( left, right );
                    case ops.subtract:
                        return new quby.syntax.Sub( left, right );
                    case ops.divide:
                        return new quby.syntax.Divide( left, right );
                    case ops.multiply:
                        return new quby.syntax.Mult( left, right );

                    case ops.logicalAnd:
                        return new quby.syntax.BoolAnd( left, right );
                    case ops.logicalOr:
                        return new quby.syntax.BoolOr( left, right );

                    case ops.equality:
                        return new quby.syntax.Equality( left, right );

                    case ops.modulus:
                        return new quby.syntax.Mod( left, right );

                    case ops.lessThan:
                        return new quby.syntax.LessThan( left, right );
                    case ops.greaterThan:
                        return new quby.syntax.GreaterThan( left, right );
                    case ops.lessThanEqual:
                        return new quby.syntax.LessThanEqual( left, right );
                    case ops.greaterThanEqual:
                        return new quby.syntax.GreaterThanEqual( left, right );

                    case ops.shiftLeft:
                        return new quby.syntax.ShiftLeft( left, right );
                    case ops.shiftRight:
                        return new quby.syntax.ShiftRight( left, right );

                    case ops.bitwiseAnd:
                        return new quby.syntax.BitAnd( left, right );
                    case ops.bitwiseOr:
                        return new quby.syntax.BitOr( left, right );

                    case ops.power:
                        return new quby.syntax.Power( left, right );

                    default:
                        throw Error("Unknown op given: " + op);
                }
            });

    var arrayDefinition = parse.
            a( terminals.symbols.leftSquare ).
            optional( exprs ).
            optional( terminals.endOfStatement ).
            then( terminals.symbols.rightSquare ).
            onMatch( function(lSquare, exprs, end, rSquare) {
                if ( exprs !== null ) {
                    return new quby.syntax.ArrayDefinition( exprs );
                } else {
                    return new quby.syntax.ArrayDefinition();
                }
            } );

    var hashMapping = parse.
            a( expr ).
            either( terminals.ops.colon, terminals.ops.mapArrow ).
            then( expr ).
            onMatch( function(left, mapAssign, right) {
                return new quby.syntax.Mapping( left, right );
            });

    var hashDefinition = parse.
            a( terminals.symbols.leftBrace ).
            optionalSeperator( hashMapping, terminals.symbols.comma ).
            optional( terminals.endOfStatement ).
            then( terminals.symbols.rightBrace ).
            onMatch( function(lBrace, mappings, end, rBrace) {
                if ( mappings !== null ) {
                    return new quby.syntax.HashDefinition(
                            new quby.syntax.Mappings( mappings )
                    );
                } else {
                    return new quby.syntax.HashDefinition();
                }
            } );

    var yieldStatement = parse.
            a( terminals.keywords.YIELD ).
            optional( exprs ).
            onMatch( function(yld, exprs) {
                if ( exprs !== null ) {
                    return new quby.syntax.YieldStmt( exprs, exprs );
                } else {
                    return new quby.syntax.YieldStmt(
                            new quby.lexer.Sym( yld.offset, 'yield' )
                    );
                }
            } );

    var returnStatement = parse.
            a( terminals.keywords.RETURN ).
            optional( expr ).
            onMatch( function(rtn, expr) {
                if ( expr !== null ) {
                    return new quby.syntax.ReturnStmt( expr );
                } else {
                    return new quby.syntax.ReturnStmt(
                            new quby.syntax.Null(rtn)
                    );
                }
            } );

    /*
     * ### Expressions ###
     */

    var parameterFields = parse.
            repeatSeperator(
                    parse.either(
                            variables,
                            parse.a( terminals.ops.bitwiseAnd, terminals.identifiers.variableName ).
                                    onMatch( function(bitAnd, name) {
                                        return new quby.syntax.ParameterBlockVariable( name );
                                    } )
                    ),
                    terminals.symbols.comma
            ).
            onMatch( function( params ) {
                return new quby.syntax.Parameters().
                        set( params );
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
    var parameterDefinition = parse.
            a( terminals.symbols.leftBracket ).
            optional( parameterFields ).
            optional( terminals.endOfStatement ). // needed to allow an end of line before the closing bracket
            then( terminals.symbols.rightBracket ).
            onMatch( function(lParen, params, end, rParen) {
                if ( params === null ) {
                    return new quby.syntax.Parameters();
                } else {
                    return params;
                }
            } );

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
    var parameterExprs = parse.
            a( terminals.symbols.leftBracket ).
            optional( exprs ).
            optional( terminals.endOfStatement ).
            then( terminals.symbols.rightBracket ).
            onMatch( function(lParen, exprs, end, rParen) {
                if ( exprs !== null ) {
                    return exprs;
                } else {
                    return null;
                }
            } );

    var blockParams = parse.
            a( terminals.ops.bitwiseOr ).
            optionalSeperator( terminals.identifiers.variableName, terminals.endOfStatement ).
            optional( terminals.endOfStatement ).
            then( terminals.ops.bitwiseOr ).
            onMatch( function(lOr, params, end, rOr) {
                if ( params !== null ) {
                    return new quby.syntax.Parameters().set( params );
                } else {
                    return null;
                }
            } );

    var block = parse.
            either(
                    parse.
                            a( terminals.symbols.leftBrace ).
                            optional( blockParams ).
                            optional( statements ).
                            then( terminals.symbols.rightBrace ).
                            onMatch( function( lBrace, params, stmts, rBrace ) {
                                return new quby.syntax.FunctionBlock(params, stmts);
                            } ),
                    parse.
                            a( terminals.keywords.DO ).
                            optional( blockParams ).
                            optional( statements ).
                            then( terminals.keywords.END ).
                            onMatch( function( lBrace, params, stmts, rBrace ) {
                                return new quby.syntax.FunctionBlock(params, stmts);
                            } )
            );

    var lambda = parse.
            a( terminals.keywords.DEF, parameterDefinition ).
            optional( statements ).
            then( terminals.keywords.END ).
            onMatch( function(def, params, stmts, end) {
                return new quby.syntax.Lambda( params, stmts );
            });

    var functionalCall = parse.
            a( terminals.identifiers.variableName ).
            then( parameterExprs ).
            optional( block ).
            onMatch( function(name, exprs, block) {
                if ( name.lower == quby.runtime.SUPER_KEYWORD ) {
                    return new quby.syntax.SuperCall( name, exprs, block );
                } else {
                    return new quby.syntax.FunctionCall( name, exprs, block );
                }
            } );

    var methodCall = parse.
            a( expr ).
            then( terminals.ops.dot ).
            then( terminals.identifiers.variableName ).
            then( parameterExprs ).
            optional( block ).
            onMatch( function(expr, dot, name, exprs, block) {
                return new quby.syntax.MethodCall( expr, name, exprs, block );
            } );

    var newInstance = parse.
            a( terminals.keywords.NEW ).
            then( terminals.identifiers.variableName ).
            then( parameterExprs ).
            optional( block ).
            onMatch( function(nw, klass, exprs, block) {
                return new quby.syntax.NewInstance( klass, exprs, block );
            } );

    expr.
            either(
                    doubleOpExpr,
                    singleOpExpr,

                    arrayDefinition,

                    hashDefinition,

                    yieldStatement,

                    parse.
                            a( terminals.symbols.leftBracket ).
                            then( expr ).
                            then( terminals.symbols.rightBracket ).
                            onMatch( function(left, expr, right) {
                                return new quby.syntax.ExprParenthesis( expr );
                            } ),


                    arrayAccess,

                    newInstance,

                    functionalCall,
                    methodCall,

                    variables,

                    lambda,

                    // symbol
                    parse.a( terminals.ops.colon, terminals.identifiers.variableName ).
                            onMatch( function(colon, identifier) {
                                return new quby.syntax.Symbol( identifier );
                            }),
                    terminals.literals,

                    // admin bits
                    terminals.admin.inline,
                    terminals.admin.preInline
            );

    /*
     * Assignments
     */

    var variableAssignment = parse(
                    variableAssignments,
                    terminals.ops.assignment,
                    expr
            ).
            onMatch( function(variable, equal, expr) {
                return new quby.syntax.Assignment( variable, expr );
            } );

    var arrayAssignment = parse.
            a( arrayAccess, terminals.ops.assignment, expr ).
            onMatch( function( array, equal, value ) {
                return new quby.syntax.ArrayAssignment( array, value );
            });

    var assignment = parse.
            either( variableAssignment, arrayAssignment );

    /*
     * Definitions
     */

    var classHeader = parse.
                a( terminals.identifiers.variableName ).
                optional(
                        parse.
                                a( terminals.ops.lessThan, terminals.identifiers.variableName ).
                                onMatch( function(lessThan, superClass) {
                                    return superClass;
                                } )
                ).
                onMatch( function( name, superClass ) {
                    return new quby.syntax.ClassHeader( name, superClass );
                } );

    var moduleDefinition = parse.
                a( terminals.keywords.MODULE ).
                then( terminals.identifiers.variableName ).
                optional( terminals.endOfStatement ).
                optional( statements ).
                then( terminals.endOfStatement ).
                onMatch( function(keyModule, name, end1, stmts, end2) {
                    return new quby.syntax.ModuleDefinition(name, stmts);
                } );

    var classDefinition = parse.
                a( terminals.keywords.CLASS ).
                then( classHeader ).
                optional( terminals.endOfStatement ).
                optional( statements ).
                then( terminals.keywords.END ).
                onMatch( function(klass, header, end1, stmts, end2) {
                    return new quby.syntax.ClassDefinition( header, stmts );
                } );

    var functionDefinition = parse.
                either( terminals.keywords.DEF, terminals.admin.hashDef ).
                thenEither( terminals.keywords.NEW, terminals.identifiers.variableName ).
                then( parameterDefinition ).
                optional( terminals.endOfStatement ).
                optional( statements ).
                then( terminals.keywords.END ).
                onMatch( function(def, name, params, end1, stmts, end2) {
                    if ( def.symbol === terminals.keywords.DEF ) {
                        // 'new' method, class constructor
                        if ( name.symbol === terminals.keywords.NEW ) {
                            return new quby.syntax.Constructor(
                                    new quby.lexer.Sym( name.offset, 'new' ),
                                    params,
                                    stmts
                            );
                        // normal function
                        } else {
                            return new quby.syntax.Function( name, params, stmts );
                        }
                    // admin method
                    } else {
                        return new quby.syntax.AdminMethod( name, params, stmts );
                    }
                } );

    /*
     * Statements
     */

    var ifStart = parse.
                a( terminals.keywords.IF ).
                then( expr ).
                optional( terminals.keywords.THEN ).
                optional( terminals.endOfStatement ).
                then( statements ).
                onMatch( function( IF, condition, THEN, end, stmts ) {
                    return new quby.syntax.IfBlock( condition, stmts );
                } );

    var isElseIf = parse.
                either(
                        terminals.keywords.ELSE_IF,
                        terminals.keywords.ELSEIF,
                        terminals.keywords.ELSIF
                ).
                a( expr ).
                optional( terminals.keywords.THEN ).
                optional( terminals.endOfStatement ).
                a( statements ).
                onMatch( function(elseIf, condition, then, end, stmts) {
                    return new quby.syntax.IfBlock( condition, stmts );
                } );

    var ifElseIfs = parse.
                a( isElseIf ).
                maybeThis().
                onMatch( function(elseIf, elseIfs) {
                    if ( elseIfs === null ) {
                        elseIfs = new quby.syntax.IfElseIfs();
                    }

                    return elseIfs.unshift( elseIf );
                });

    var ifElse = parse.
                a( terminals.keywords.ELSE, statements ).
                onMatch( 1 );

    var ifStatement = parse.
                a( ifStart ).
                optional( ifElseIfs ).
                optional( ifElse ).
                then( terminals.keywords.END ).
                onMatch( function(start, otherIfs, elses, end) {
                    return new quby.syntax.IfStmt( start, otherIfs, elses );
                } );

    var whileUntilStatement = parse.
                either( terminals.keywords.WHILE, terminals.keywords.UNTIL ).
                then( expr, statements ).
                then( terminals.keywords.END ).
                onMatch( function( whileUntil, expr, stmts, end ) {
                    if ( whileUntil.symbol === terminals.keywords.WHILE ) {
                        return new quby.syntax.WhileLoop( expr, stmts );
                    } else {
                        return new quby.syntax.UntilLoop( expr, stmts );
                    }
                } );

    var loopStatement = parse.
                a( terminals.keywords.LOOP ).
                then( statements ).
                then( terminals.endOfStatement ).
                either( terminals.keywords.WHILE ).or( terminals.keywords.UNTIL ).
                then( expr ).
                then( terminals.endOfStatement ).
                onMatch( function(lp, stmts, end, whileUntil, expr) {
                    if ( whileUntil.symbol === terminals.keywords.WHILE ) {
                        return new quby.syntax.LoopWhile( expr, stmts );
                    } else {
                        return new quby.syntax.LoopUntil( expr, stmts );
                    }
                } );

    statement = statement.either(
                    functionDefinition,
                    classDefinition,
                    moduleDefinition,

                    assignment,

                    ifStatement,
                    whileUntilStatement,
                    loopStatement,

                    yieldStatement,
                    returnStatement,

                    functionalCall,
                    methodCall,

/*
                    moduleDef,
*/

                    terminals.admin.inline,
                    terminals.admin.preInline
            );
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
         */
        return str.
                replace( /([^A-Z])([A-Z]+)/g, function(t,a,b) { return a + ' ' + b.toLowerCase(); } ).
                toLowerCase().
                replace( /((^[A-Z]+))/, function(t,a,b) { return b.toLowerCase(); } ).
                replace( '_', ' ' );
    }

    var identifyTerminal = function( id, obj ) {
        if ( obj === undefined ) {
            obj = terminals;
        }

        if ( obj.id === undefined ) {
            for ( var k in obj ) {
                var check = obj[k];

                if ( check.id !== undefined ) {
                    if ( check && check.id == id ) {
                        return k;
                    }
                } else {
                    var r = identifyTerminal( id, check );

                    if ( r !== null ) {
                        return r;
                    }
                }
            }
        }

        return null;
    }

    quby.parser = {
            /**
             * The entry point for the parser, and the only way to interact.
             *
             * Call this, pass in the code, and a callback so your informed
             * about when it's done.
             */
            parse : function( origSrc, onFinish ) {
                var src = preParse( origSrc );

if ( true ) {
                statements.symbolizeLowerCase( src,
                        function( symbols, errors ) {
                            for ( var i = 0; i < symbols.length; i++ ) {
                                console.log( symbols[i].id + ', ' + identifyTerminal(symbols[i].id));
                            }
                        }
                );
}

                var t = Date.now();

console.log( src + '#' );
                statements.parse( origSrc, src, function(r, es) {
                    for ( var i = 0; i < es.length; i++ ) {
                        var e = es[i];

                        if ( e.isTerminal ) {
                            e.terminalName = formatTerminalName(
                                    identifyTerminal( e.symbol.id )
                            );
                        }
                    }
                    
                    log( Date.now() - t );

                    onFinish(r, es);
                } );
            }
    };
})( quby, util, window )
