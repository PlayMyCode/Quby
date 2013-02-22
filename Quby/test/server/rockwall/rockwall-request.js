"use static";

exports.RockwallRequest = (function() {
    Request = function( req ) {
        this.hasData = false;
        this.strData = undefined;

        this.req            = req;

        this.url            = req.url;
        this.headers        = req.headers;
        this.socket         = req.socket;
        this.trailers       = req.trailers;
        this.httpVersion    = req.httpVersion;
        this.connection     = req.connection;

        var cookies = {};
        if ( req.headers.cookie ) {
            console.log( req.headers.cookie );
            var parts = req.headers.cookie.split( ';' );

            for ( var i = 0; i < parts.length; i++ ) {
                var part = parts[i];
                var key,
                    val;

                var equalI = part.indexOf( '=' );
                if ( equalI === -1 ) {
                    key = part;
                    val = '';
                } else {
                    key = part.substring( 0, equalI );
                    val = part.substring( equalI+1 );
                }

                cookies[ key.trim() ] = val.trim();
            }
        }

        this.cookies = cookies;
    }

    Request.prototype = {
        close: function( callback ) {
            this.req.close( callback );
        },

        data: function( callback ) {
            if ( this.hasData ) {
                callback( this.strData );
            } else {
                var data = '';

                this.req.on( 'data', function(str) {
                    data += str;
                } )

                var self = this;
                this.req.on( 'end', function() {
                    self.strData = data;
                    callback( data );
                } )
            }
        },

        json: function( callback ) {
            this.data( function(str) {
                try {
                    var obj = JSON.parse( str );
                    callback( null, obj );
                } catch ( err ) {
                    callback( err );
                }
            } )
        },

        post: function( callback ) {
            this.data( function(str) {
                var obj = {};
                var lines = str.split( "\n" );

                for ( var i = 0; i < lines.length; i++ ) {
                    var parts = lines[i].split('=');
                    var key   = parts[0];

                    if ( parts.length > 1 ) {
                        obj[key] = parts[1];
                    } else {
                        obj[key] = true;
                    }
                }

                callback( null, obj );
            } );
        }
    }

    return Request;
})();
