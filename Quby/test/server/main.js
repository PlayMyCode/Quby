"use strict";

var PUBLIC_FOLDER = './..';

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

            res.contentType( 'application/javascript' );
            var success = true;
            compile.stderr.on( 'data', function(data) {
                console.log( "\t" + data );
                success = false;
            } );
            compile.stdout.on( 'data', function(data) {
                console.log( "\t" + data );
            } );
            compile.on( 'exit', function() {
                if ( success ) {
                    console.log( 'compile exit... serve!' );
                    rockServer.serveFile( './../release/quby.js', req, res );
                } else {
                    console.log( 'compile exit... fail :(' );

                    res.end();
                }
            } );
        }
});

rockServer.start( PUBLIC_FOLDER, 80 );
