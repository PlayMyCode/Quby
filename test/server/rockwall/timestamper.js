"use strict";

exports.TimeStamper = (function() {
    var fs = require( 'fs' );

    var TimeStamper = function( base ) {
        if ( base.length > 0 ) {
            if ( base.charAt(base.length-1) !== '/' ) {
                base += '/';
            }
        }

        this.base = base;
    };

    TimeStamper.prototype = {
        stamp: function( file ) {
            try {
                return file + '?v=' + fs.statSync( fs.realpathSync(this.base + file) ).mtime.getTime();
            } catch ( err ) {
                return file;
            }
        },

        js: function( file ) {
            return '<script src="' + this.stamp(file) + '"></script>';
        },

        css: function( file ) {
            return '<link rel="stylesheet" href="' + this.stamp(file) + '">';
        },

        qb: function( file ) {
            return '<script src="' + this.stamp(file) + '" type="text/quby"></script>';
        }
    };

    return TimeStamper;
})();
