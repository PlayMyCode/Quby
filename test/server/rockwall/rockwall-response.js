"use strict";

exports.RockwallResponse = (function() {
    /**
     * One day, in seconds.
     */
    var COOKIE_EXPIRE = 24*60*60;

    /**
     * Default cookie name.
     */
    var COOKIE_NAME = 'my-websites-cookie';

    var Response = function( res ) {
        this.res = res;
        this.endCount = 0;

        /*
         * Default Status Code, and default content type.
         */
        this.statusCode = 200;
        this.headers = {
                "Content-Type": "text/html"
        };

        var self = this;
    }

    Response.prototype = {
            flushHeaders: function() {
                if ( this.headers !== null ) {
                    this.res.writeHead( this.statusCode, this.headers );

                    this.headers = null;
                }

                return this;
            },

            status: function( code, mime ) {
                if ( arguments.legth === 0 ) {
                    return this.res.statusCode;
                } else {
                    this.res.statusCode = code;
                    this.statusCode = code;

                    if ( arguments.length > 1 ) {
                        return this.contentType( mime );
                    } else {
                        return this;
                    }
                }
            },

            contentType: function( mime ) {
                return this.header( 'Content-Type', mime );
            },

            /**
             * Sets a header-value to be sent.
             */
            header: function( head, value ) {
                if ( this.headers === null ) {
                    throw new Error( "output already sent, cannot flush headers" );
                } else {
                    this.headers[ head ] = value;
                }

                return this;
            },

            /**
             * Note that the expire is *when* the cookie is expire,
             * not *how long*.
             *
             * For example, 0 is January 1st 1970, and Date.now()
             * will have it expire right now.
             */
            cookie: function( name, value, expire ) {
                var argsLen = arguments.length;

                if ( argsLen === 0 ) {
                    throw new Error( "no cookie given" );
                } else if ( argsLen === 1 ) {
                    setCookie( COOKIE_NAME, name, undefined );
                } else if ( argsLen === 2 ) {
                    setCookie( name, value, undefined );
                } else {
                    if ( expire === undefined ) {
                        expire = Date.now() + COOKIE_EXPIRE 
                    }

                    this.header(
                            "Set-Cookie",
                            name + '=' + value + '; expires=' + new Date(expire).toUTCString()
                    );
                }

                return this;
            },

            clearCookie: function( name ) {
                if ( arguments.length === 0 ) {
                    return this.setCookie( 'deleted', 0 );
                } else {
                    return this.setCookie( name, 'deleted', 0 );
                }
            },

            json: function( obj ) {
                this.write( JSON.stringify(obj) );

                return this;
            },

            write: function( chunk, encoding ) {
                this.flushHeaders();

                this.res.write( chunk, encoding );

                return this;
            },

            wait: function( f ) {
                this.endCount++;

                return this;
            },

            endWait: function( data, encoding ) {
                this.endCount--;

                if ( this.endCount < 0 ) {
                    this.endCount = 0;
                }

                this.end( data, encoding );

                return this;
            },

            end: function( data, encoding ) {
                if ( this.endCount === 0 ) {
                    this.flushHeaders();
                    this.res.end( data, encoding );
                }

                return this;
            }
    }

    return Response;
})()

