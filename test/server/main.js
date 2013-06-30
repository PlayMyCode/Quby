"use strict";

var PUBLIC_FOLDER = __dirname + '/./..';

var rockwall = require( './rockwall/rockwall.js' );

var rockServer = new rockwall.Server();

var spawn = require('child_process').spawn;

rockServer.mime({
        html    : 'text/html',
        gif     : 'image/gif',
        jpg     : 'image/jpg',
        jpeg    : 'image/jpg',
        qb      : 'text/qb',
        js      : 'application/javascript',
        ts      : 'text/typescript',
        css     : 'text/css'
});

rockServer.pageNotFound( function(url, req, res) {
    res.end( '<h1>page not found</h1>' );
} );
rockServer.route({
        '': function(url, req, res) {
            rockServer.serveFile( 'index.html', req, res );
        },
        'compile': function( url, req, res ) {
            var compile = spawn( 'cmd',
                    [
                            '/c',
                            __dirname.replace(/\\/g, '/') + '/./../../build/build.bat'
                    ]
            );

            var err = '';
            compile.stderr.on( 'data', function(data) {
                err += data;
            } );

            compile.on( 'exit', function(code) {
                if ( code === 0 ) {
                    console.log( 'compile exit... serve!' );

                    res.status( 200, 'application/javascript' );
                    rockServer.serveFile( './../release/quby.js', req, res );
                } else {
                    console.log( 'compile exit... fail :(' );

                    res.status( 500, 'text/text' );
                    res.write( err );
                    res.end();
                }
            } );
        }
});

rockServer.start( PUBLIC_FOLDER, 8081 );

