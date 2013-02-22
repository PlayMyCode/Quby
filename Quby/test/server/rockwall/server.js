"use static";

/**
 * Rockwall Server
 *
 * The core server handling section of Rockwall.
 */

exports.Server = (function() {
    var RockwallRequest  = require( './rockwall-request.js'  ).RockwallRequest,
        RockwallResponse = require( './rockwall-response.js' ).RockwallResponse;

    var http = require('http'),
        fs   = require('fs');

    var rockwall = function() {
        this.fileMimeTypes = {};

        this.notFoundFun = null;

        this.publicFolder = '';
        this.realPublicFolder = '';

        this.routing = {};
        this.preRouting = {};
    };

    var ensureSlash = function( str ) {
        if ( str === '' ) {
            return './';
        } else if ( str.charAt(str.length-1) !== '/' ) {
            return str + '/';
        } else {
            return str;
        }
    }

    var parseExtension = function( str ) {
        var lastDot = str.lastIndexOf( '.' );

        if ( lastDot !== -1 ) {
            return str.substring( lastDot+1 );
        } else {
            return '';
        }
    }

    var trimSlashes = function( str ) {
        if ( str === '' || str === '/' || str === '//' ) {
            return '';
        } else {
            /*
             * Remove leading, and trailing, slashes.
             */
            if ( str.charAt(0) === '/' ) {
                if ( str.charAt(str.length-1) === '/' ) {
                    return str.substring( 1, str.length1 );
                } else {
                    return str.substring( 1, str.length );
                }
            } else if ( str.charAt(str.length-1) === '/' ) {
                return str.substring( 0, str.length-1 );
            } else {
                return str;
            }
        }
    }

    var parseUrl = function( str ) {
        var query = {},
            parts = []
            partsStr = '';

        str = trimSlashes( str );

        if ( str !== '' ) {
            var queryStr = null;

            /*
             * Handle the query section.
             */
            var queryParam = str.indexOf( '?' );
            if ( queryParam !== -1 ) {
                partsStr = str.substring( 0, queryParam );
                queryStr = str.substring( queryParam );

                queryParts = queryStr.split( '&' );
                for ( var i = 0; i < queryParts.length; i++ ) {
                    var queryPart = queryParts[i];
                    var equal = queryPart.indexOf('=');

                    if ( equal !== -1 ) {
                        query[ queryPart.substring(0, equal) ] = queryPart.substring(equal+1);
                    } else {
                        query[ queryPart ] = true;
                    }
                }
            } else {
                partsStr = str;
            }

            parts = partsStr.split('/');
        } else {
            partsStr = str;
        }

        return {
                fileUrl : partsStr,
                url     : str,
                parts   : parts,
                query   : query
        }
    }

    var runRequest = function( url, req, res, fun ) {
        console.log( 'request ' + req.url );

        if ( fun ) {
            fun(url, req, res);
        }
    }

    var runNotFound = function( url, req, res, fun ) {
        res.status( 404, 'text/html' );

        console.log( 'unknown ' + req.url );

        if ( fun ) {
            fun( url, req, res );
        }

        res.end();
    }

    var getRoute = function( routes, parts ) {
        if ( parts.length === 0 ) {
            return routes[''];
        } else {
            for ( var i = 0; i < parts.length; i++ ) {
                var next = parts[i];

                if ( routes.hasOwnProperty(next) ) {
                    var routes = routes[ next ];

                    if ( typeof routes === 'function' ) {
                        return routes;
                    } else if ( routes === undefined ) {
                        break;
                    }
                } else {
                    break;
                }
            }

            return undefined;
        }
    }

    var setRoute = function( routes, url, action ) {
        var parts = trimSlashes(url).split( '/' );

        for ( var i = 0; i < parts.length-1; i++ ) {
            var part = parts[i];
            var nextRoute = routes[part];

            if ( nextRoute === undefined ) {
                routes[part] = nextRoute = {};
            } else if ( typeof nextRoute !== 'object' ) {
                throw new Error("route already exists for " + url);
            }

            routes = nextRoute;
        }

        var last = parts[parts.length-1];

        if ( routes[last] !== undefined ) {
            throw new Error("route already exists for " + url);
        }

        routes[ last ] = action;
    }

    var iterateArgs = function( obj, args, f ) {
        if ( arguments.length === 2 ) {
            f = args;
            args = obj;
            obj = null;
        }

        if ( args.length === 0 ) {
            throw new Error( "no arguments given" );
        } else if ( args.length === 1 ) {
            var arg = args[0];

            if ( typeof arg === 'object' ) {
                for ( var k in arg ) {
                    if ( arg.hasOwnProperty(k) ) {
                        f.call( obj, k, arg[k] );
                    }
                }
            } else {
                throw new Error( 'Invalid argument given' );
            }
        } else {
            var first  = args[0],
                second = args[1];

            if ( first instanceof Array ) {
                for ( var i = 0; i < first.length; i++ ) {
                    f.call( obj, first[i], second );
                }
            } else {
                f.call( obj, first, second );
            }
        }
    }

    var serveFileInner = function( self, fileUrl, path, req, res, success, ifNotFound ) {
        fs.readFile( path, function( err, data ) {
            if ( err ) {
                ifNotFound.call( self );
            } else {
                var ext  = parseExtension( fileUrl );
                var mime = self.fileMimeTypes[ ext ] || 'text/plain';

                console.log( '   file ' + req.url );

                res.
                        status( 200, mime ).
                        write( data );

                if ( success ) {
                    success( req, res );
                }

                res.end();
            }
        } );
    };

    rockwall.prototype = {
        servePublicFile: function( fileUrl, req, res, success, ifNotFound ) {
            if ( ! ifNotFound ) {
                ifNotFound = function() {
                    runNotFound( fileUrl, req, res );
                }
            }

            var self = this;
            fs.realpath( this.realPublicFolder + fileUrl, function(err, path) {
                if ( err ) {
                    ifNotFound.call( self, err );
                } else {
                    path = path.replace( /\\/g, "/" );

                    if ( path.indexOf(self.realPublicFolder) !== 0 ) {
                        ifNotFound.call( self, new Error("File is outside public folder") );
                    } else {
                        serveFileInner( self, fileUrl, path, req, res, success, ifNotFound );
                    }
                }
            })
        },

        serveFile: function( fileUrl, req, res, success, ifNotFound ) {
            var self = this;

            if ( ! ifNotFound ) {
                ifNotFound = function() {
                    runNotFound( fileUrl, req, res );
                }
            }

            fs.realpath( this.realPublicFolder + fileUrl, function(err, path) {
                path = path.replace( /\\/g, "/" );

                if ( err ) {
                    ifNotFound.call( self, err );
                } else {
                   serveFileInner( self, fileUrl, path, req, res, success, ifNotFound );
                }
            } )
        },

        mime: function( ext, mime ) {
            if ( arguments.length === 2 ) {
                if ( ext.charAt(0) === '.' ) {
                    ext = ext.substring( 1 );
                }

                this.fileMimeTypes[ ext ] = mime;
            } else {
                if ( typeof ext === 'object' ) {
                    for ( var k in ext ) {
                        if ( ext.hasOwnProperty(k) ) {
                            this.mime( k, ext[k] );
                        }
                    }
                }
            }

            return this;
        },

        /*
         * If there is an url with content,
         * i.e. it's not a blank string (like ""),
         * then we presume it's a file.
         *
         * If that fails, we handle it as a request.
         *
         * Empty strings, such as '', the root url,
         * are always treated as a route.
         */
        handleFileRequest: function(url, req, res) {
            if ( url.fileUrl !== '' ) {
                var ifNotFound = function() {
                    this.handleRequest( url, req, res );
                }

                this.servePublicFile( url.fileUrl, req, res, null, ifNotFound )
            } else {
                this.handleRequest( url, req, res );
            }
        },

        handleRequest: function(url, req, res) {
            var action = getRoute( this.routing, url.parts );

            if ( action !== undefined ) {
                runRequest(
                        url, req, res,
                        action
                );
            } else {
                runNotFound(
                        url, req, res,
                        this.notFoundFun
                );
            }
        },

        pageNotFound: function( notFoundFun ) {
            this.notFoundFun = notFoundFun;
        },

        /**
         * Allows you to set an action to perform
         * before a standard route.
         */
        preRoute: function( url, action ) {
            iterateArgs(
                    arguments,
                    (function( url, action ) {
                            setRoute( this.preRouting, url, action );
                    }).bind(this)
            );

            return this;
        },

        route: function( url, action ) {
            iterateArgs(
                    arguments,
                    (function( url, action ) {
                            setRoute( this.routing, url, action );
                    }).bind(this)
            );

            return this;
        },

        start: function( publicFolder, port ) {
            if ( port === undefined ) {
                port = 80;
            }

            this.publicFolder     = ensureSlash( publicFolder );
            this.realPublicFolder = ensureSlash( fs.realpathSync(this.publicFolder) ).replace( /\\/g, '/' );

            if ( ! this.notFoundFun ) {
                throw new Error( 'no page not found function provided' );
            }

            var self = this;
            http.createServer(function(req, res) {
                req = new RockwallRequest(req);
                res = new RockwallResponse(res);

                var url = parseUrl( req.url );
                var action = getRoute( self.preRouting, url.parts );

                if ( action !== undefined ) {
                    if ( action.call(this, url, req, res) !== false ) {
                        self.handleFileRequest( url, req, res );
                    }
                } else {
                    self.handleFileRequest( url, req, res );
                }
            }).listen( port );

            console.log( 'server listening on port ' + port );
        }
    }

    return rockwall;
})();

