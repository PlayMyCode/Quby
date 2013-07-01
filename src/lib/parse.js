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

    var ParserError = (function () {
        function ParserError(offset, source, match) {
            this.isSymbol = false;
            this.isTerminal = false;
            this.offset = offset;
            this.source = source;
            this.match = match;
        }
        ParserError.prototype.getLine = function () {
            return this.source.getLine(this.offset);
        };
        return ParserError;
    })();
    parse.ParserError = ParserError;

    var SymbolError = (function (_super) {
        __extends(SymbolError, _super);
        function SymbolError(i, str, sourceLines) {
            _super.call(this, i, sourceLines, str);
            this.isSymbol = true;

            this.isSymbol = true;
        }
        return SymbolError;
    })(ParserError);
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
    })(ParserError);
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
            } while(i < rules.length && isOptional[i]);
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

            this.isOptional[rulesLen - 1] = !!isOptional;

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
