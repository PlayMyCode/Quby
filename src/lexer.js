"use strict";
var quby = window['quby'] || {};

(function( quby, util ) {
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
})( quby, util );