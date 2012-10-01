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
 *  - quby.ast for building the AST
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
            /**
             * Matches an end of line,
             * and also chomps on whitespace.
             * 
             * If it contains a semi-colon however,
             * this will fail.
             */
            endOfLine: function( src, i, code, len ) {
                if ( code === SLASH_N ) {
                    do {
                        i++;
                        code = src.charCodeAt(i);
                    } while (
                            code === SLASH_N    ||
                            code === SPACE      ||
                            code === TAB
                    );

                    if ( src.charCodeAt(i) !== SEMI_COLON ) {
                        return i;
                    }
                }
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
            endOfStatement: function( src, i, code, len ) {
                if (
                        code === SEMI_COLON ||
                        code === SLASH_N
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

                    symbol      : function(src, i, code, len) {
                        if ( code === COLON ) {
                            code = src.charCodeAt( i+1 );

                            if (
                                    // is a lower case letter, or underscore
                                    (code >= 97 && code <= 122) ||
                                    (code === UNDERSCORE)
                            ) {
                                i += 2;

                                while ( isAlphaNumericCode(src.charCodeAt(i)) ) {
                                    i++;
                                }

                                return i;
                            }
                        }
                    },

                    number      : parse.terminal.NUMBER,
                    string      : parse.terminal.STRING
            },

            ops: {
                    power               : '**',

                    divide              : '/',
                    multiply            : '*',
                    plus                : '+',
                    subtract            : '-',
                    modulus             : '%',

                    colon               : function(src, i, code, len) {
                        if ( code === COLON ) {
                            code = src.charCodeAt( i+1 );

                            if (
                                    // is a lower case letter, or underscore
                                    (code < 97 || code > 122) &&
                                    (code !== UNDERSCORE)
                            ) {
                                return i+1;
                            }
                        }
                    },

                    mapArrow            : '=>',

                    equal               : '==',
                    notEqual            : '!=',

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
                    objectField : function(src, i, code, len) {
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
                        code === SPACE      ||
                        code === SLASH_N    ||
                        code === TAB
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
    terminals.keywords.RETURN.onMatch( function(match, offset) {
        return new quby.lexer.Sym( offset, 'return' );
    });

    terminals.identifiers.variableName.onMatch( function(match, offset) {
        var sym = new quby.lexer.IdSym( offset, match );
        sym.terminal = terminals.identifiers.variableName;
        return sym;
    } );

    terminals.literals.TRUE.onMatch( function(match, offset) {
        return new quby.ast.Bool(
                new quby.lexer.Sym( offset, true )
        );
    });
    terminals.literals.FALSE.onMatch( function(match, offset) {
        return new quby.ast.Bool(
                new quby.lexer.Sym( offset, false )
        );
    });
    terminals.literals.NULL.onMatch( function(match, offset) {
        return new quby.ast.Null(
                new quby.lexer.Sym( offset, null )
        );
    });
    terminals.literals.NIL.onMatch( function(match, offset) {
        return new quby.ast.Null(
                new quby.lexer.Sym( offset, null )
        );
    });
    terminals.literals.symbol.onMatch( function(match, offset) {
        return new quby.ast.Symbol( 
                new quby.lexer.Sym( offset, match )
        );
    });
    terminals.literals.string.onMatch( function(match, offset) {
        return new quby.ast.String(
                new quby.lexer.Sym( offset, match )
        );
    });
    terminals.literals.number.onMatch( function(match, offset) {
        return new quby.ast.Number(
                new quby.lexer.Sym( offset, match )
        );
    });

    terminals.admin.inline.onMatch( function(match, offset) {
        return new quby.ast.Inline(
                new quby.lexer.Sym(
                        offset,
                        match.substring( 3, match.length-3 )
                )
        );
    });
    terminals.admin.preInline.onMatch( function(match, offset) {
        return new quby.ast.PreInline(
                new quby.lexer.Sym(
                        offset,
                        match.substring( 6, match.length-3 )
                )
        );
    });

    var ops = terminals.ops;

    /* Parser Rules */

    var statementSeperator = parse.
            either(
                    terminals.endOfLine,
                    terminals.endOfStatement
            );

    var statement = parse(),
        expr = parse();

    var repeatStatement = parse.repeatSeperator(
            statement,
            statementSeperator
    );

    var statements = parse.
            optional( statementSeperator ).
            optional( repeatStatement    ).
            optional( statementSeperator ).
            onMatch( function(onStart, stmts, endEnd) {
                if ( stmts === null ) {
                    return new quby.ast.Statements();
                } else {
                    return new quby.ast.Statements( stmts );
                }
            });

    var exprs = parse.
            repeatSeperator( expr, terminals.symbols.comma ).
            onMatch( function(exprs) {
                return new quby.ast.Parameters().
                        set( exprs );
            });

    var variable = parse.
            a( terminals.identifiers.variableName ).
            onMatch( function(name) {
                return new quby.ast.Variable( name );
            } );

    var variables = parse.either( terminals.identifiers, terminals.keywords.THIS ).
            onMatch( function(identifier) {
                switch ( identifier.terminal ) {
                    case terminals.identifiers.variableName:
                        return new quby.ast.Variable( identifier );
                    case terminals.identifiers.global:
                        return new quby.ast.GlobalVariable(
                                new quby.lexer.IdSym(
                                        identifier.offset,
                                        identifier.match
                                )
                        );
                    case terminals.identifiers.objectField:
                        return new quby.ast.FieldVariable(
                                new quby.lexer.IdSym(
                                        identifier.offset,
                                        identifier.match.substring(1)
                                )
                        );
                    case terminals.keywords.THIS:
                        return new quby.ast.ThisVariable( identifier.offset, null );
                    default:
                        log(identifier);
                        throw new Error("Unknown terminal met for variables: " + identifier);
                }
            });

    var arrayAccessExtension = parse.
            a(
                    terminals.symbols.leftSquare,
                    expr
            ).
            optional( terminals.endOfLine ).
            then( terminals.symbols.rightSquare ).
            onMatch( function( leftSquare, keyExpr, endOfLine, rightSquare) {
                return new quby.ast.ArrayAccess( null, keyExpr );
            });

    var singleOpExpr = parse.
            either(
                    terminals.ops.plus,
                    terminals.ops.subtract,
                    terminals.ops.not
            ).
            then( expr ).
            onMatch( function( op, expr ) {
                switch ( op.terminal ) {
                    case ops.not:
                        return new quby.ast.Not( expr );
                    case terminals.ops.subtract:
                        return new quby.ast.SingleSub(expr);
                    case ops.plus:
                        return expr;
                    default:
                        log( op );
                        throw new Error("Unknown singleOpExpr match");
                }
            } );

    var arrayDefinition = parse.
            a( terminals.symbols.leftSquare ).
            optional( exprs ).
            optional( terminals.endOfLine ).
            then( terminals.symbols.rightSquare ).
            onMatch( function(lSquare, exprs, endOfLine, rSquare) {
                if ( exprs !== null ) {
                    return new quby.ast.ArrayDefinition( exprs );
                } else {
                    return new quby.ast.ArrayDefinition();
                }
            } );

    var hashMapping = parse.
            a( expr ).
            either( terminals.ops.colon, terminals.ops.mapArrow ).
            then( expr ).
            onMatch( function(left, mapAssign, right) {
                return new quby.ast.Mapping( left, right );
            });

    var hashDefinition = parse.
            a( terminals.symbols.leftBrace ).
            optionalSeperator( hashMapping, terminals.symbols.comma ).
            optional( terminals.endOfLine ).
            then( terminals.symbols.rightBrace ).
            onMatch( function(lBrace, mappings, endOfLine, rBrace) {
                if ( mappings !== null ) {
                    return new quby.ast.HashDefinition(
                            new quby.ast.Mappings( mappings )
                    );
                } else {
                    return new quby.ast.HashDefinition();
                }
            } );

    var yieldExpr = parse.
            a( terminals.keywords.YIELD ).
            optional( exprs ).
            onMatch( function(yld, exprs) {
                if ( exprs !== null ) {
                    return new quby.ast.YieldStmt( exprs, exprs );
                } else {
                    return new quby.ast.YieldStmt(
                            new quby.lexer.Sym( yld.offset, 'yield' )
                    );
                }
            } );

    var returnStatement = parse.
            a( terminals.keywords.RETURN ).
            optional( expr ).
            onMatch( function(rtn, expr) {
                if ( expr !== null ) {
                    return new quby.ast.ReturnStmt( expr );
                } else {
                    return new quby.ast.ReturnStmt(
                            new quby.ast.Null(rtn)
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
                                        return new quby.ast.ParameterBlockVariable( name );
                                    } )
                    ),
                    terminals.symbols.comma
            ).
            onMatch( function( params ) {
                return new quby.ast.Parameters().
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
            optional( terminals.endOfLine ). // needed to allow an end of line before the closing bracket
            then( terminals.symbols.rightBracket ).
            onMatch( function(lParen, params, end, rParen) {
                if ( params === null ) {
                    return new quby.ast.Parameters();
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
            optional( terminals.endOfLine ).
            then( terminals.symbols.rightBracket ).
            onMatch( function(lParen, exprs, end, rParen) {
                if ( exprs !== null ) {
                    return exprs;
                } else {
                    return null;
                }
            } );

    var blockParamVariables = parse.repeatSeperator(
            variable,
            terminals.symbols.comma
    );

    var blockParams = parse.
            a( terminals.ops.bitwiseOr ).
            optional( blockParamVariables ).
            optional( terminals.endOfLine ).
            then( terminals.ops.bitwiseOr ).
            onMatch( function(lOr, params, end, rOr) {
                if ( params !== null ) {
                    return new quby.ast.Parameters().set( params );
                } else {
                    return null;
                }
            } );

    var block = parse.
            either(
                    terminals.symbols.leftBrace,
                    terminals.keywords.DO
            ).
            optional( blockParams ).
            optional( statements  ).
            thenEither(
                    terminals.symbols.rightBrace,
                    terminals.keywords.END
            ).
            onMatch( function( lBrace, params, stmts, rBrace ) {
                var block = new quby.ast.FunctionBlock( params, stmts );

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
                if (
                        (lBrace.terminal === terminals.symbols.leftBrace ) !==
                        (rBrace.terminal === terminals.symbols.rightBrace)
                ) {
                    block.setMismatchedBraceWarning();
                }

                return block;
            } );

    var lambda = parse.
            a( terminals.keywords.DEF, parameterDefinition ).
            optional( statements ).
            then( terminals.keywords.END ).
            onMatch( function(def, params, stmts, end) {
                return new quby.ast.Lambda( params, stmts );
            });

    var functionCall = parse.
            a( terminals.identifiers.variableName ).
            then( parameterExprs ).
            optional( block ).
            onMatch( function(name, exprs, block) {
                if ( name.lower === quby.runtime.SUPER_KEYWORD ) {
                    return new quby.ast.SuperCall( name, exprs, block );
                } else {
                    return new quby.ast.FunctionCall( name, exprs, block );
                }
            } );

    var methodCallExtension = parse.
            a( terminals.ops.dot ).
            then( terminals.identifiers.variableName ).
            then( parameterExprs ).
            optional( block ).
            onMatch( function(dot, name, exprs, block) {
                return new quby.ast.MethodCall( null, name, exprs, block );
            } );

    var newInstance = parse.
            a( terminals.keywords.NEW ).
            then( terminals.identifiers.variableName ).
            then( parameterExprs ).
            optional( block ).
            onMatch( function(nw, klass, exprs, block) {
                return new quby.ast.NewInstance( klass, exprs, block );
            } );

    var exprInParenthesis = parse.
            a( terminals.symbols.leftBracket ).
            then( expr ).
            optional( terminals.endOfLine ).
            then( terminals.symbols.rightBracket ).
            onMatch( function(left, expr, endOfLine, right) {
                return new quby.ast.ExprParenthesis( expr );
            } );

    /**
     * These add operations on to the end of an expr.
     *
     * For example take the code: '3 + 5'. This would
     * make up the rules for the '+ 5' bit, which is
     * tacked on after '3'.
     *
     * That is then rebalanced later in the AST.
     */
    var exprExtension = parse();
    exprExtension.either(
                    parse.
                            either(
                                    methodCallExtension,
                                    arrayAccessExtension
                            ).
                            optional( exprExtension ).
                            onMatch( function(left, ext) {
                                if ( ext === null ) {
                                    return left;
                                } else {
                                    ext.appendLeft( left );
                                    return ext;
                                }
                            } ),

                    parse.
                            either(
                                    ops.plus,
                                    ops.subtract,
                                    ops.divide,
                                    ops.multiply,

                                    ops.logicalAnd,
                                    ops.logicalOr,

                                    ops.equal,
                                    ops.notEqual,

                                    ops.modulus,

                                    ops.lessThan,
                                    ops.greaterThan,
                                    ops.lessThanEqual,
                                    ops.greaterThanEqual,

                                    ops.shiftLeft,
                                    ops.shiftRight,

                                    ops.bitwiseAnd,
                                    ops.bitwiseOr,

                                    ops.power,

                                    ops.assignment
                            ).
                            then( expr ).
                            onMatch( function(op, right) {
                                switch( op.terminal ) {
                                    case ops.assignment:
                                        return new quby.ast.Assignment( null, right );
                                    case ops.plus:
                                        return new quby.ast.Add( null, right );
                                    case ops.subtract:
                                        return new quby.ast.Sub( null, right );
                                    case ops.divide:
                                        return new quby.ast.Divide( null, right );
                                    case ops.multiply:
                                        return new quby.ast.Mult( null, right );

                                    case ops.logicalAnd:
                                        return new quby.ast.BoolAnd( null, right );
                                    case ops.logicalOr:
                                        return new quby.ast.BoolOr( null, right );

                                    case ops.equal:
                                        return new quby.ast.Equality( null, right );
                                    case ops.notEqual:
                                        return new quby.ast.NotEquality( null, right );

                                    case ops.modulus:
                                        return new quby.ast.Mod( null, right );

                                    case ops.lessThan:
                                        return new quby.ast.LessThan( null, right );
                                    case ops.greaterThan:
                                        return new quby.ast.GreaterThan( null, right );
                                    case ops.lessThanEqual:
                                        return new quby.ast.LessThanEqual( null, right );
                                    case ops.greaterThanEqual:
                                        return new quby.ast.GreaterThanEqual( null, right );

                                    case ops.shiftLeft:
                                        return new quby.ast.ShiftLeft( null, right );
                                    case ops.shiftRight:
                                        return new quby.ast.ShiftRight( null, right );

                                    case ops.bitwiseAnd:
                                        return new quby.ast.BitAnd( null, right );
                                    case ops.bitwiseOr:
                                        return new quby.ast.BitOr( null, right );

                                    case ops.power:
                                        return new quby.ast.Power( null, right );

                                    default:
                                        throw Error("Unknown op given: " + op);
                                }
                            })
            );

    expr.
            either(
                    singleOpExpr,
                    arrayDefinition,
                    hashDefinition,
                    yieldExpr,
                    exprInParenthesis,
                    newInstance,
                    functionCall,

                    variables,

                    lambda,

                    // literals
                    terminals.literals,

                    // admin bits
                    terminals.admin.inline,
                    terminals.admin.preInline
            ).
            optional( exprExtension ).
            onMatch( function(expr, rest) {
                if ( rest !== null ) {
                    rest.appendLeft( expr );

                    return rest;
                } else {
                    return expr;
                }
            } );

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
                    return new quby.ast.ClassHeader( name, superClass );
                } );

    var moduleDefinition = parse.
                a( terminals.keywords.MODULE ).
                then( terminals.identifiers.variableName ).
                optional( statements ).
                then( terminals.keywords.END ).
                onMatch( function(keyModule, name, stmts, end) {
                    return new quby.ast.ModuleDefinition(name, stmts);
                } );

    var classDefinition = parse.
                a( terminals.keywords.CLASS ).
                then( classHeader ).
                optional( statements ).
                then( terminals.keywords.END ).
                onMatch( function(klass, header, stmts, end) {
                    return new quby.ast.ClassDefinition( header, stmts );
                } );

    var functionDefinition = parse.
                either( terminals.keywords.DEF, terminals.admin.hashDef ).
                thenEither( terminals.keywords.NEW, terminals.identifiers.variableName ).
                then( parameterDefinition ).
                optional( statements ).
                then( terminals.keywords.END ).
                onMatch( function(def, name, params, stmts, end) {
                    if ( def.terminal === terminals.keywords.DEF ) {
                        // 'new' method, class constructor
                        if ( name.terminal === terminals.keywords.NEW ) {
                            return new quby.ast.Constructor(
                                    new quby.lexer.Sym( name.offset, 'new' ),
                                    params,
                                    stmts
                            );
                        // normal function
                        } else {
                            return new quby.ast.Function( name, params, stmts );
                        }
                    // admin method
                    } else {
                        return new quby.ast.AdminMethod( name, params, stmts );
                    }
                } );

    /*
     * Statements
     */

    var ifStart = parse.
                a( terminals.keywords.IF ).
                then( expr ).
                optional( terminals.keywords.THEN ).
                then( statements ).
                onMatch( function( IF, condition, THEN, stmts ) {
                    return new quby.ast.IfBlock( condition, stmts );
                } );

    var isElseIf = parse.
                either(
                        terminals.keywords.ELSE_IF,
                        terminals.keywords.ELSEIF,
                        terminals.keywords.ELSIF
                ).
                a( expr ).
                optional( terminals.keywords.THEN ).
                a( statements ).
                onMatch( function(elseIf, condition, then, stmts) {
                    return new quby.ast.IfBlock( condition, stmts );
                } );

    var ifElseIfs = parse.
                a( isElseIf ).
                maybeThis().
                onMatch( function(elseIf, elseIfs) {
                    if ( elseIfs === null ) {
                        elseIfs = new quby.ast.IfElseIfs();
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
                    return new quby.ast.IfStmt( start, otherIfs, elses );
                } );

    var whileUntilStatement = parse.
                either( terminals.keywords.WHILE, terminals.keywords.UNTIL ).
                then( expr, statements ).
                then( terminals.keywords.END ).
                onMatch( function( whileUntil, expr, stmts, end ) {
                    if ( whileUntil.terminal === terminals.keywords.WHILE ) {
                        return new quby.ast.WhileLoop( expr, stmts );
                    } else {
                        return new quby.ast.UntilLoop( expr, stmts );
                    }
                } );

    var loopStatement = parse.
                a( terminals.keywords.LOOP ).
                then( statements ).
                then( terminals.keywords.END ).
                either( terminals.keywords.WHILE, terminals.keywords.UNTIL ).
                then( expr ).
                onMatch( function(loop, stmts, end, whileUntil, expr) {
                    if ( whileUntil.terminal === terminals.keywords.WHILE ) {
                        return new quby.ast.LoopWhile( expr, stmts );
                    } else {
                        return new quby.ast.LoopUntil( expr, stmts );
                    }
                } );

    statement.either(
                    functionDefinition,
                    classDefinition,
                    moduleDefinition,

                    ifStatement,
                    whileUntilStatement,
                    loopStatement,

                    returnStatement,

/*
                    moduleDef,
*/
                    expr,

                    terminals.admin.inline,
                    terminals.admin.preInline
            );
    
    quby.parser = {
            /**
             * The entry point for the parser, and the only way to interact.
             *
             * Call this, pass in the code, and a callback so your informed
             * about when it's done.
             *
             * @param src The source code to parse.
             * @param onFinish The function to call when parsing has finished.
             * @param onDebug An optional callback, for sending debug information into.
             */
            parse: function( src, parser, onFinish, onDebug ) {
                quby.lexer.pushParser( parser );

                statements.parse(
                        src,
                        preParse( src ),
                        function( program, errors ) {
                            quby.lexer.popParser( parser );
                            onFinish( program, errors );
                        },
                        onDebug || null
                );
            }
    };
})( quby, util, window )
