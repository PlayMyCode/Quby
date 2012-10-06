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
        IdSym: function( offset, value ) {
            quby.lexer.Sym.call( this, offset, value );

            this.lower = value.toLowerCase();

            return this;
        },
        
        Sym: function( offset, value ) {
            this.offset = offset;
            this.value  = value;

            return this;
        }
    };
})( quby, util );
