"use strict";
var quby = window['quby'] || {};

(function( quby, util ) {
    var LineInfo = function (offset, source, name) {
        this.offset = offset;
        this.source = source;
        this.name   = name  ;

        Object.preventExtensions( this );
    }

    LineInfo.prototype.getLine = function () {
        return this.source.getLine(this.offset);
    }

    var parserStack = [],
        currentParser = null;

    /**
     * Lexer
     * 
     * Functions and objects related to the lexical analysis section
     * of the parser are defined here.
     */
    quby.lexer = {
        pushParser: function( parser ) {
            parserStack.push( parser );
            currentParser = parser;
        },
        popParser: function() {
            currentParser = parserStack.pop();
        },

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
                    new LineInfo( offset, currentParser.source, currentParser.strName ),
                    value
            );

            return this;
        },
        
        EmptySym: function (offset, value) {
            this.offset = offset;
            this.value  = value;

            return this;
        }
    };
})( quby, util );
