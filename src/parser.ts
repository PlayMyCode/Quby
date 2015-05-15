///<reference path='../quby.ts' />

"use strict";

module quby.parser {
    // for recording how long it takes to build the parser
    var startTime = Date.now();

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
    var log: ( ...args: any[] ) => void = function () {
        if ( window['console'] && window['console']['log'] ) {
            window['console']['log'].apply( window['console'], arguments );
        }
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
    var isAlphaNumericCode = function ( code: number ): boolean {
        return (
            ( code >= LOWER_A && code <= LOWER_Z ) || // lower case letter
            ( code === UNDERSCORE ) ||
            ( code >= ZERO && code <= NINE )     // a number
            );
    };

    var isAlphaCode = function ( code: number ): boolean {
        return ( code >= LOWER_A && code <= LOWER_Z );
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
    var isAlphaNumeric = function ( src: string, i: number ): boolean {
        var code = src.charCodeAt( i + src.length );

        return isAlphaNumericCode( code );
    };

    /* Terminals */

    /**
     * This chomps up a single line comment and multi-line comments.
     * 
     * If a multi-line comment is found which doesn't close then this will log and error. 
     */
    var commentsTerminal = function ( src: string, i: number, code: number, len: number, logError:parse.ILogErrorFunction ): number {
        if ( code === SLASH ) {
            var nextCode = src.charCodeAt( i + 1 );
            
            // single line comments
            if ( nextCode === SLASH ) {
                i++;

                do {
                    code = src.charCodeAt( ++i );
                } while ( code !== SLASH_N && code !== SLASH_R && i < len );

            // multi-line comments
            } else if ( nextCode === STAR ) {
                var commentI = i;
                var commentCount = 1;
                i += 2;

                // we move along 1 char code at a time
                // but we keep 2 in memory
                code = src.charCodeAt( i );
                nextCode = src.charCodeAt( ++i );

                do {
                    // closing a multi-line comment
                    if ( code === STAR && nextCode === SLASH ) {
                        commentCount--;

                        if ( commentCount === 0 ) {
                            code = src.charCodeAt( ++i );
                            break;
                        } else {
                            code = src.charCodeAt( ++i );
                            nextCode = src.charCodeAt( ++i );
                        }

                        // opening a new mult-line comment
                    } else if ( code === SLASH && nextCode === STAR ) {
                        commentCount++;

                        code = src.charCodeAt( ++i );
                        nextCode = src.charCodeAt( ++i );

                    } else {
                        code = nextCode;
                        nextCode = src.charCodeAt( ++i );

                    }
                } while ( i < len )

                if ( commentCount > 0 ) {
                    logError( "multi-line comment opened but never closed", commentI );
                }
            }
        }

        return i;
    }

    parse.ignore( function ( src: string, i: number, code: number, len: number, logError:parse.ILogErrorFunction ): number {
        while ( true ) {
            // check for white space
            while ( code === SPACE || code === TAB ) {
                code = src.charCodeAt( ++i );
            }

            var newI = commentsTerminal( src, i, code, len, logError );
            if ( i === newI ) {
                break;
            }

            i = newI;
            code = src.charCodeAt( i );
        }

        return i;
    });

    /**
     * WARNING! The terminal names used here are also used for display purposes.
     *          So give them meaningful names!
     */
    var terminals: any = parse.terminals( <any> {
        /**
         * Matches an end of line and also chomps on whitespace.
         * 
         * If it contains a semi-colon however then this will fail.
         */
        endOfLine: function ( src:string, origI:number, code:number, len:number, logError:parse.ILogErrorFunction ) {
            var i = origI;

            if ( code === SLASH_N || code === SLASH_R ) {
                do {
                    do {
                        code = src.charCodeAt( ++i );
                    } while (
                            code === SLASH_N ||
                            code === SLASH_R ||
                            code === SPACE   ||
                            code === TAB
                    );

                    var newI = commentsTerminal( src, i, code, len, logError );
                    if ( i === newI ) {
                        break;
                    }

                    // -1 because above code is retrieved from '++i'
                    i = newI-1;
                } while ( i < len );

                if ( src.charCodeAt( i ) !== SEMI_COLON ) {
                    return i;
                }
            }

            return origI;
        },

        /**
         * Matches the semi-colon or end of line.
         * 
         * Due to the order of terminals the 'end of line' terminal always has precedence.
         * 
         * Also chomps on whitespace and end of lines both before and after the semi-colon.
         */
        endOfStatement: function ( src, i, code, len, logError:parse.ILogErrorFunction ) {
            if (
                    code === SEMI_COLON ||
                    code === SLASH_N ||
                    code === SLASH_R
            ) {
                do {
                    do {
                        code = src.charCodeAt( ++i );
                    } while (
                        code === SLASH_N ||
                        code === SLASH_R ||
                        code === SEMI_COLON ||
                        code === SPACE ||
                        code === TAB
                    );

                    var newI = commentsTerminal( src, i, code, len, logError );
                    if ( i === newI ) {
                        break;
                    }

                    // -1 because above code is retrieved from '++i'
                    i = newI-1;
                } while ( i < len );
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

            symbol: function ( src:string, i:number, code:number, len:number ) {
                if ( code === COLON ) {
                    code = src.charCodeAt( i + 1 );

                    if (
                            // is a lower case letter, or underscore
                            ( code >= 97 && code <= 122 ) ||
                            ( code === UNDERSCORE )
                    ) {
                        i += 2;

                        while ( isAlphaNumericCode( src.charCodeAt( i ) ) ) {
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
            number: function ( src: string, i: number, code: number, len: number ): number {
                if ( ZERO <= code && code <= NINE ) {
                    do {
                        code = src.charCodeAt( ++i );
                    } while (
                        code === UNDERSCORE ||
                        ( ZERO <= code && code <= NINE ) ||
                        ( LOWER_A <= code && code <= LOWER_Z )
                        )

                    // look for a decimal
                    if ( src.charCodeAt( i ) === FULL_STOP ) {
                        code = src.charCodeAt( i + 1 );

                        if ( ZERO <= code && code <= NINE ) {
                            i++;

                            do {
                                code = src.charCodeAt( ++i );
                            } while (
                                code === UNDERSCORE ||
                                ( ZERO <= code && code <= NINE ) ||
                                ( LOWER_A <= code && code <= LOWER_Z )
                                )
                        }
                    }

                    return i;
                }

                return 0;
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

            colon: function ( src:string, i:number, code:number, len:number ) {
                if ( code === COLON ) {
                    code = src.charCodeAt( i + 1 );

                    if (
                            // is a lower case letter, or underscore
                            ( code < 97 || code > 122 ) &&
                            ( code !== UNDERSCORE )
                    ) {
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
            variableName: function ( src:string, i:number, code:number, len:number ) {
                if (
                        // is a lower case letter, or underscore
                        ( code >= 97 && code <= 122 ) ||
                        ( code === UNDERSCORE )
                ) {
                    // just chomp up all following alpha-numeric codes
                    while ( isAlphaNumericCode( src.charCodeAt( ++i ) ) ) { }
                    return i;
                }

                return 0;
            },
            global: function ( src:string, i:number, code:number, len:number ) {
                if ( code === DOLLAR ) {
                    while ( isAlphaNumericCode( src.charCodeAt( ++i ) ) ) { }
                    return i;
                }

                return 0;
            },
            objectField: function ( src:string, i:number, code:number, len:number ) {
                if ( code === AT ) {
                    while ( isAlphaNumericCode( src.charCodeAt( ++i ) ) ) { }
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

    var applySymbolMatch = function ( syms, event ) {
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
            function ( src:string, i:number, code:number, len:number, logError:parse.ILogErrorFunction ) {
                do {
                    while (
                        code === SPACE ||
                        code === SLASH_N ||
                        code === SLASH_R ||
                        code === TAB
                    ) {
                        code = src.charCodeAt( ++i );
                    }

                    var newI = commentsTerminal( src, i, code, len, logError );

                    if ( newI === i ) {
                        break;
                    } else {
                        i = newI;
                        code = src.charCodeAt( i );
                    }
                } while ( i < len );

                return i;
            }
        );

    var inlinePostMatch = function ( src:string, i:number, code:number, len:number ) {
        /*
         * Jump in segments of 3, and then check if we hit the
         * closing #># at the beginning, middle or end.
         */
        do {
            i += 3;

            code = src.charCodeAt( i );

            if ( code === HASH ) {
                // land at the end of the closing section
                if (
                        src.charCodeAt( i - 1 ) === GREATER_THAN &&
                        src.charCodeAt( i - 2 ) === HASH
                ) {
                    return i + 1;
                    // land at the beginning
                } else if (
                        src.charCodeAt( i + 1 ) === GREATER_THAN &&
                        src.charCodeAt( i + 2 ) === HASH
                ) {
                    return i + 3;
                }
                // land in the middle
            } else if (
                    code === GREATER_THAN &&
                    src.charCodeAt( i - 1 ) === HASH &&
                    src.charCodeAt( i + 1 ) === HASH
            ) {
                return i + 2;
            }
        } while ( i < len );

        return len;
    };

    terminals.admin.inline.symbolMatch( inlinePostMatch );
    terminals.admin.preInline.symbolMatch( inlinePostMatch );

    /*
     * The values returned after it has been matched, when the symbol is
     * evaluated, and begins being turned into the AST.
     */

    terminals.endOfStatement.onMatch( function () {
        return null;
    });

    terminals.symbols.comma.onMatch( function () {
        return null;
    });

    /* The onMatch callbacks for altering the symbols when matched. */
    terminals.literals.TRUE.onMatch( function ( symbol ) {
        return new quby.ast.BoolTrue( symbol );
    });
    terminals.literals.FALSE.onMatch( function ( symbol ) {
        return new quby.ast.BoolFalse( symbol );
    });
    terminals.literals.NULL.onMatch( function ( symbol ) {
        return new quby.ast.Null( symbol );
    });
    terminals.literals.NIL.onMatch( function ( symbol ) {
        return new quby.ast.Null( symbol );
    });
    terminals.literals.JSUndefined.onMatch( function ( symbol ) {
        return new quby.ast.JSUndefined( symbol );
    });
    terminals.literals.JSNull.onMatch( function ( symbol ) {
        return new quby.ast.JSNull( symbol );
    });
    terminals.literals.symbol.onMatch( function ( symbol ) {
        return new quby.ast.Symbol( symbol );
    });
    terminals.literals.string.onMatch( function ( symbol ) {
        return new quby.ast.String( symbol );
    });
    terminals.literals.number.onMatch( function ( symbol ) {
        return new quby.ast.Number( symbol );
    });

    terminals.admin.inline.onMatch( function ( symbol ) {
        return new quby.ast.Inline( symbol );
    });
    terminals.admin.preInline.onMatch( function ( symbol ) {
        return new quby.ast.PreInline( symbol );
    });

    var ops = terminals.ops;

    /* Parser Rules */

    var statement = parse.rule(),
        expr = parse.rule();

    var statementSeperator = parse.
        name( "statement seperator" ).
        either( terminals.endOfLine, terminals.endOfStatement );

    var repeatStatement = parse.repeatSeperator(
        statement,
        statementSeperator
    );

    var statements = parse.
        name( 'statements' ).
        optional( statementSeperator ).
        optional( repeatStatement ).
        optional( statementSeperator ).
        onMatch( function ( onStart, stmts, endEnd ) {
            if ( stmts === null ) {
                return null;
            } else {
                return new quby.ast.Statements( stmts );
            }
        });

    var exprs = parse.
        name( 'expressions' ).
        repeatSeperator( expr, terminals.symbols.comma ).
        onMatch( function ( exprs ) {
            return new quby.ast.Parameters( exprs );
        });

    var variable = parse.
        either(
            terminals.identifiers,
            terminals.keywords.THIS,
            parse.
                a( terminals.ops.hash ).
                either(
                    /*
                     * Global is included, to capture the use
                     * of a starting dollar symbol.
                     */
                    terminals.identifiers.variableName,
                    terminals.identifiers.global
                ).
                onMatch( function ( hash, name ) {
                    return new quby.ast.JSVariable( name );
                })
        ).
        onMatch( function ( identifier ) {
            var term = identifier.terminal;

            if ( term === terminals.identifiers.variableName ) {
                return new quby.ast.LocalVariable( identifier );
            } else if ( term === terminals.identifiers.objectField ) {
                return new quby.ast.FieldVariable( identifier );
            } else if ( term === terminals.identifiers.global ) {
                return new quby.ast.GlobalVariable( identifier );
            } else if ( term === terminals.keywords.THIS ) {
                return new quby.ast.ThisVariable( identifier );
            } else if ( identifier instanceof quby.ast.JSVariable ) {
                return identifier;
            } else {
                log( identifier );
                throw new Error( "Unknown terminal met for variable: " + identifier );
            }
        });

    var arrayAccessExtension = parse.
        name( 'array access' ).
        a( terminals.symbols.leftSquare, expr ).
        optional( terminals.endOfLine ).
        then( terminals.symbols.rightSquare ).
        onMatch( function ( leftSquare, keyExpr, endOfLine, rightSquare ) {
            return new quby.ast.ArrayAccess( null, keyExpr );
        });

    var singleOpExpr = parse.
        name( 'operator' ).
        either(
            terminals.ops.plus,
            terminals.ops.subtract,
            terminals.ops.not,

            terminals.admin.jsTypeOf
        ).
        then( expr ).
        onMatch( function ( op, expr ) {
            var term = op.terminal;

            if ( term === ops.not ) {
                return new quby.ast.Not( expr );
            } else if ( term === ops.subtract ) {
                return new quby.ast.SingleSub( expr );
            } else if ( term === ops.plus ) {
                return expr;
            } else if ( term === terminals.admin.jsTypeOf ) {
                return new quby.ast.JSTypeOf( expr );
            } else {
                log( op );

                throw new Error( "Unknown singleOpExpr match" );
            }
        });

    var arrayLiteral = parse.
        name( 'new Array' ).
        optional( terminals.ops.hash ).
        then( terminals.symbols.leftSquare ).
        optional( exprs ).
        optional( terminals.endOfLine ).
        then( terminals.symbols.rightSquare ).
        onMatch( function ( hash, lSquare, exprs, endOfLine, rSquare ) {
            if ( hash !== null ) {
                return new quby.ast.JSArrayLiteral( exprs );
            } else {
                return new quby.ast.ArrayLiteral( exprs );
            }
        });

    var hashMapping = parse.
        name( 'hash mapping' ).
        a( expr ).
        either( terminals.ops.colon, terminals.ops.mapArrow ).
        then( expr ).
        onMatch( function ( left, mapAssign, right ) {
            return new quby.ast.Mapping( left, right );
        });

    var hashLiteral = parse.
        name( 'new hash literal' ).
        then( terminals.symbols.leftBrace ).
        optionalSeperator( hashMapping, terminals.symbols.comma ).
        optional( terminals.endOfLine ).
        then( terminals.symbols.rightBrace ).
        onMatch( function ( lBrace, mappings, endOfLine, rBrace ) {
            if ( mappings !== null ) {
                mappings = new quby.ast.Mappings( mappings );
            }

            return new quby.ast.HashLiteral( mappings );
        });

    var jsHashMapping = parse.
        name( 'js hash mapping' ).
        a( expr ).
        either( terminals.ops.colon, terminals.ops.mapArrow ).
        then( expr ).
        onMatch( function ( left, mapAssign, right ) {
            return new quby.ast.JSMapping( left, right );
        });

    var jsHashLiteral = parse.
        name( 'new JS hash literal' ).
        a( terminals.ops.hash ).
        then( terminals.symbols.leftBrace ).
        optionalSeperator( jsHashMapping, terminals.symbols.comma ).
        optional( terminals.endOfLine ).
        then( terminals.symbols.rightBrace ).
        onMatch( function ( hash, lBrace, mappings, endOfLine, rBrace ) {
            if ( mappings !== null ) {
                mappings = new quby.ast.Mappings( mappings );
            }

            return new quby.ast.JSObjectLiteral( mappings );
        });

    var yieldExpr = parse.
        name( 'yield' ).
        a( terminals.keywords.YIELD ).
        optional( exprs ).
        onMatch( function ( yld, exprs ) {
            if ( exprs !== null ) {
                return new quby.ast.YieldStmt( exprs, exprs );
            } else {
                return new quby.ast.YieldStmt( yld );
            }
        });

    var returnStatement = parse.
        name( 'return' ).
        a( terminals.keywords.RETURN ).
        optional( expr ).
        onMatch( function ( rtn, expr ) {
            if ( expr !== null ) {
                return new quby.ast.ReturnStmt( expr );
            } else {
                return new quby.ast.ReturnStmt(
                    new quby.ast.Null( rtn )
                    );
            }
        });

    /*
     * ### Expressions ###
     */

    var parameterFields = parse.
        repeatSeperator(
                parse.either(
                        variable,
                        parse.a( terminals.ops.bitwiseAnd, terminals.identifiers.variableName ).
                        onMatch( function ( bitAnd, name ) {
                            return new quby.ast.ParameterBlockVariable( name );
                        })
                ),
                terminals.symbols.comma
        ).
        onMatch( function ( params ) {
            if ( params !== null ) {
                return new quby.ast.Parameters( params );
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
    var parameterDefinition = parse.
            name('parameters').
            either(
                    parse.
                            a(terminals.symbols.leftBracket).
                            optional(parameterFields).
                            optional(terminals.endOfLine). // needed to allow an end of line before the closing bracket
                            then(terminals.symbols.rightBracket).
                            onMatch(function (lParen, params, end, rParen): quby.ast.ISyntax {
                                return params;
                            }),

                    parse.a(parameterFields),

                    parse.
                            a(statementSeperator).
                            onMatch(() => null)
            );

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
        name( 'expressions' ).
        a( terminals.symbols.leftBracket ).
        optional( exprs ).
        optional( terminals.endOfLine ).
        then( terminals.symbols.rightBracket ).
        onMatch( function ( lParen, exprs, end, rParen ) {
            if ( exprs !== null ) {
                return exprs;
            } else {
                return null;
            }
        });

    var blockParamVariables = parse.repeatSeperator(
            variable,
            terminals.symbols.comma
    );

    var blockParams = parse.
            name( 'block parameters' ).
            a( terminals.ops.bitwiseOr ).
            optional( blockParamVariables ).
            optional( terminals.endOfLine ).
            then( terminals.ops.bitwiseOr ).
            onMatch( function( lOr, params, end, rOr ) {
                if ( params !== null ) {
                    return new quby.ast.Parameters(params);
                } else {
                    return null;
                }
            } );

    var block = parse.
            name('block').
            either(
                    terminals.symbols.leftBrace,
                    terminals.keywords.DO
            ).
            optional( blockParams ).
            optional( statements ).
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
                        ( lBrace.terminal === terminals.symbols.leftBrace ) !==
                        ( rBrace.terminal === terminals.symbols.rightBrace )
                ) {
                    block.setMismatchedBraceWarning();
                }

                return block;
            } );

    var lambda = parse.
            name( 'lambda' ).
            a( terminals.keywords.DEF, parameterDefinition ).
            optional( statements ).
            then( terminals.keywords.END ).
            onMatch( ( def, params, stmts, end ) =>
                new quby.ast.Lambda( params, stmts )
            );

    var functionCall = parse.
            name('function call').
            optional( terminals.ops.hash ).
            then(terminals.identifiers.variableName).
            then(parameterExprs).
            optional( block ).
            onMatch( function ( hash, name: parse.Symbol, exprs, block ): quby.ast.ISyntax {
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

    var jsExtension = parse.
            a( terminals.ops.hash ).
            either(
                    terminals.identifiers.variableName,
                    terminals.identifiers.global
            ).
            optional(
                    parse.
                            a( parameterExprs ).
                            optional( block ).
                            onMatch( function( exprs, block ) {
                                return { exprs: exprs, block: block };
                            } )
            ).
            onMatch((hash, name: parse.Symbol, exprsBlock:{ exprs: quby.ast.Parameters; block: quby.ast.FunctionBlock; } ) : quby.ast.ISyntax => {
                if ( exprsBlock ) {
                    return new quby.ast.JSMethodCall( null, name, exprsBlock.exprs, exprsBlock.block );
                } else {
                    return new quby.ast.JSProperty( null, name );
                }
            } );

    var methodCallExtension = parse.
            a( terminals.ops.dot ).
            optional( terminals.ops.hash ).
            then( terminals.identifiers.variableName ).
            then( parameterExprs ).
            optional( block ).
            onMatch( function(dot, hash, name, exprs, block):quby.ast.FunctionCall {
                if (hash === null) {
                    return new quby.ast.MethodCall( null, name, exprs, block );
                } else {
                    return new quby.ast.JSMethodCall( null, name, exprs, block );
                }
            });

    var newInstance = parse.
            name( 'new object' ).
            a( terminals.keywords.NEW ).
            either(
                parse.
                    a( terminals.identifiers.variableName ).
                    then( parameterExprs ).
                    optional( block ).
                    onMatch( ( name, params, block ) =>
                        new quby.ast.NewInstance( name, params, block )
                    ),

                parse.
                    a( expr ).
                    onMatch( ( expr ) =>
                        new quby.ast.JSNewInstance( expr )
                    )
            ).
            onMatch( ( nw, newInstance ) => newInstance );

    var exprInParenthesis = parse.
            a( terminals.symbols.leftBracket ).
            then( expr ).
            optional( terminals.endOfLine ).
            then( terminals.symbols.rightBracket ).
            onMatch( function( left, expr, endOfLine, right ) {
                return new quby.ast.ExprParenthesis( expr );
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
    exprExtension.either(
                    parse.
                            either(
                                    methodCallExtension,
                                    arrayAccessExtension,
                                    jsExtension
                            ).
                            optional( exprExtension ).
                            onMatch( function( left, ext ) {
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

                                    ops.assignment,

                                    terminals.admin.jsInstanceOf
                            ).
                            then( expr ).
                            onMatch(function (op:parse.Symbol, right:quby.ast.IExpr ) {
                                var term = op.terminal;

                                if ( term === ops.assignment ) {
                                    return new quby.ast.Assignment( null, right );
                                } else if ( term === ops.plus ) {
                                    return new quby.ast.Add( null, right );
                                } else if ( term === ops.subtract ) {
                                    return new quby.ast.Sub( null, right );
                                } else if ( term === ops.divide ) {
                                    return new quby.ast.Divide( null, right );
                                } else if ( term === ops.multiply ) {
                                    return new quby.ast.Mult( null, right );

                                } else if ( term === ops.logicalAnd ) {
                                    return new quby.ast.BoolAnd( null, right );
                                } else if ( term === ops.logicalOr ) {
                                    return new quby.ast.BoolOr( null, right );

                                } else if ( term === ops.equal ) {
                                    return new quby.ast.Equality( null, right );
                                } else if ( term === ops.notEqual ) {
                                    return new quby.ast.NotEquality( null, right );

                                } else if ( term === ops.modulus ) {
                                    return new quby.ast.Mod( null, right );

                                } else if ( term === ops.lessThan ) {
                                    return new quby.ast.LessThan( null, right );
                                } else if ( term === ops.greaterThan ) {
                                    return new quby.ast.GreaterThan( null, right );
                                } else if ( term === ops.lessThanEqual ) {
                                    return new quby.ast.LessThanEqual( null, right );
                                } else if ( term === ops.greaterThanEqual ) {
                                    return new quby.ast.GreaterThanEqual( null, right );

                                } else if ( term === ops.shiftLeft ) {
                                    return new quby.ast.ShiftLeft( null, right );
                                } else if ( term === ops.shiftRight ) {
                                    return new quby.ast.ShiftRight( null, right );

                                } else if ( term === ops.bitwiseAnd ) {
                                    return new quby.ast.BitAnd( null, right );
                                } else if ( term === ops.bitwiseOr ) {
                                    return new quby.ast.BitOr( null, right );

                                } else if ( term === terminals.admin.jsInstanceOf ) {
                                    return new quby.ast.JSInstanceOf( null, right );

                                } else if ( term === ops.power ) {
                                    return new quby.ast.Power( null, right );
                                    
                                } else {
                                    throw Error( "Unknown op given: " + op );
                                }
                            } )
            );

    expr.
            name( 'expression' ).
            either(
                    singleOpExpr,

                    arrayLiteral,

                    hashLiteral,
                    jsHashLiteral,

                    yieldExpr,
                    exprInParenthesis,
                    newInstance,
                    functionCall,

                    variable,

                    lambda,

                    // literals
                    terminals.literals,

                    // admin bits
                    terminals.admin.inline,
                    terminals.admin.preInline
            ).
            optional( exprExtension ).
            onMatch( function( expr, rest ) {
                if ( rest !== null ) {
                    rest.appendLeft( expr );

                    return rest;
                } else {
                    return expr;
                }
            } );

    /*
     * Declarations
     */

    var classHeader = parse.
            name( 'class header' ).
            a( terminals.identifiers.variableName ).
            optional(
                    parse.
                            a( terminals.ops.lessThan, terminals.identifiers.variableName ).
                            onMatch( function( lessThan, superClass ) {
                                return superClass;
                            } )
            ).
            onMatch( function( name, superClass ) {
                return new quby.ast.ClassHeader( name, superClass );
            } );

    var moduleDeclaration = parse.
            name( 'Module' ).
            a( terminals.keywords.MODULE ).
            then( terminals.identifiers.variableName ).
            optional( statements ).
            then( terminals.keywords.END ).
            onMatch( function( keyModule, name, stmts, end ) {
                return new quby.ast.ModuleDeclaration( name, stmts );
            } );

    var classDeclaration = parse.
            name( 'Class Declaration' ).
            a( terminals.keywords.CLASS ).
            then( classHeader ).
            optional( statements ).
            then( terminals.keywords.END ).
            onMatch( function ( klass: parse.Symbol, header: quby.ast.ClassHeader, stmts: quby.ast.Statements, end: parse.Symbol ): quby.ast.IClassDeclaration {
                if ( quby.runtime.isCoreClass( header.getName().toLowerCase() ) ) {
                    return new quby.ast.ExtensionClassDeclaration( header, stmts );
                } else {
                    return new quby.ast.ClassDeclaration( header, stmts );
                }
            });

    var functionDeclaration = parse.
            name( 'Function Declaration' ).
            either( terminals.keywords.DEF, terminals.admin.hashDef ).
            thenEither( terminals.keywords.NEW, terminals.identifiers.variableName ).
            then( parameterDefinition ).
            optional(statements).
            then(terminals.keywords.END).
            onMatch( function ( def, name, params, stmts, end ): quby.ast.ISyntax {
                if ( def.terminal === terminals.keywords.DEF ) {

                    // 'new' method, class constructor
                    if ( name.terminal === terminals.keywords.NEW ) {
                        return new quby.ast.Constructor( name, params, stmts );

                    // normal function
                    } else {
                        return new quby.ast.FunctionDeclaration( name, params, stmts );
                    }

                // admin method
                } else {
                    return new quby.ast.AdminMethod( name, params, stmts );
                }
            });

    /*
     * Statements
     */

    var ifStart = parse.
            name( 'if statement' ).
            a(terminals.keywords.IF).
            then(expr).
            optional(terminals.keywords.THEN).
            then(statements).
            onMatch( (IF, condition, THEN, stmts) =>
                new quby.ast.IfBlock(condition, stmts)
            )

    var ifElseIf = parse.
            name( 'else-if statement' ).
            either(
                    terminals.keywords.ELSE_IF,
                    terminals.keywords.ELSEIF,
                    terminals.keywords.ELSIF
            ).
            then( expr ).
            optional( terminals.keywords.THEN ).
            then( statements ).
            onMatch( (elseIf, condition, then, stmts) =>
                new quby.ast.IfBlock(condition, stmts)
            )

    var ifElseIfs = parse.
            repeat(ifElseIf).
            name( 'else-if statements' ).
            onMatch( (elseIfs) => new quby.ast.IfElseIfs(elseIfs) );

    var elseClause = parse.
            name( 'else statement' ).
            a( terminals.keywords.ELSE, statements ).
            onMatch( (els, stmts) => stmts );

    var ifStatement = parse.
            name( 'if statement' ).
            a( ifStart ).
            optional( ifElseIfs ).
            optional( elseClause ).
            then( terminals.keywords.END ).
            onMatch( ( start, otherIfs, elses, end ) =>
                new quby.ast.IfStmt( start, otherIfs, elses )
            );

    var whileUntilStatement = parse.
            name( 'while/until statement' ).
            either( terminals.keywords.WHILE, terminals.keywords.UNTIL ).
            then( expr, statements ).
            then( terminals.keywords.END ).
            onMatch( function( whileUntil, expr, stmts, end ) : quby.ast.ISyntax {
                if ( whileUntil.terminal === terminals.keywords.WHILE ) {
                    return new quby.ast.WhileLoop( expr, stmts );
                } else {
                    return new quby.ast.UntilLoop( expr, stmts );
                }
            } );

    var loopStatement = parse.
            name( 'loop statement' ).
            a( terminals.keywords.LOOP ).
            then( statements ).
            then( terminals.keywords.END ).
            either( terminals.keywords.WHILE, terminals.keywords.UNTIL ).
            then( expr ).
            onMatch( function( loop, stmts, end, whileUntil, expr ) : quby.ast.ISyntax {
                if ( whileUntil.terminal === terminals.keywords.WHILE ) {
                    return new quby.ast.LoopWhile( expr, stmts );
                } else {
                    return new quby.ast.LoopUntil( expr, stmts );
                }
            } );

    var whenStatement = parse.
            name( 'when statement' ).
            a(terminals.keywords.WHEN).
            then(exprs).
            thenEither(
                    terminals.keywords.THEN,
                    statementSeperator
            ).
            then(statements).
            onMatch((when, exprs, seperator, statements) => new quby.ast.WhenClause(exprs, statements));

    var whenStatements = parse.
            repeat(whenStatement);
    
    var caseWhenStatement = parse.
            name( 'case-when' ).
            a(terminals.keywords.CASE).
            optional( expr ).
            then( statementSeperator ).
            optional(whenStatements).
            optional(elseClause).
            then(terminals.keywords.END).
            onMatch( (caseTerm, expr, endOfStmt, whenClauses, elseClause, end) =>
                new quby.ast.CaseWhen(caseTerm, expr, whenClauses, elseClause)
            );
        
    statement.
            name( 'statement' ).
            either(
                functionDeclaration,
                classDeclaration,
                moduleDeclaration,

                ifStatement,
                whileUntilStatement,
                loopStatement,
                caseWhenStatement,

                returnStatement,

/*
                moduleDef,
*/
                expr,

                terminals.admin.inline,
                terminals.admin.preInline
        );

    var constructionTime = Date.now() - startTime;
    console.log( 'construction time ' + constructionTime );

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
    export function parseSource(
            src: string,
            name: string,
            onFinish: ( program: quby.ast.ISyntax, errors: parse.IParseError[], time: parse.ITimeResult ) => void
    ) {
        statements.parse({
                name    : name,
                src     : src,
                inputSrc: src.toLowerCase(),
                onFinish: onFinish
        });
    }

    /**
     * This is used for debugging.
     */
    export function symbolize(
            src: string,
            onFinish: (terminals: parse.Term[], errors: parse.IParseError[]) => void
    ) {
        statements.symbolize( src.toLowerCase(), ( terminals: parse.Term[], errors: parse.IParseError[] ) : void => {
            onFinish( terminals, errors );
        });
    }
}
