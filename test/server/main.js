"use strict";

var PUBLIC_FOLDER = __dirname + '/./..';

var rockwall = require( './rockwall/rockwall.js' );
var fs = require('fs');

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

var endsWith = function( str, search ) {
    return str.lastIndexOf(search) === (str.length-search.length);
}

var getNewestFileTime = function( folder, extension ) {
    extension = extension.toLowerCase();
    if ( extension !== '' && extension.charAt(0) !== '.' ) {
        extension = '.' + extension;
    }

    var newestTime = 0;
    var files = fs.readdirSync( folder );

    for ( var k in files ) {
        var file = files[k];
        var path = folder + '/' + file;
        var fileInfo = fs.statSync( path );

        if ( fileInfo.isDirectory() ) {
            newestTime = Math.max( newestTime, getNewestFileTime(path, extension) );
        } else if ( fileInfo.isFile() ) {
            if ( endsWith( file.toLowerCase(), extension ) ) {
                newestTime = Math.max( newestTime, fileInfo.mtime.valueOf() );
            }
        }
    }

    return newestTime;
}

rockServer.route({
        '': function(url, req, res) {
            rockServer.serveFile( 'index.html', req, res );
        },
        'compile': function( url, req, res ) {
            var dir = __dirname.replace(/\\/g, '/') + '/';

            var qubytime;
            try {
                qubytime = fs.statSync( dir + '../../release/quby.js' ).mtime.valueOf();
            } catch ( ex ) {
                console.log( '############################' );
                console.log( ex );
                console.log( '############################' );

                qubytime = 0;
            }

            var tsTime = getNewestFileTime('../../src', '.ts');

            if ( qubytime === 0 || qubytime < tsTime ) {
                console.log(' ... recompile!');
                var buildFile = dir + '../../build/build.bat'
                console.log( 'run ' + buildFile );

                var compile = spawn( 'cmd', [ '/c', buildFile ]);

                var err = '';
                compile.stderr.on( 'data', function(data) {
                    err += data;
                } );

                if ( err !== '' ) {
                    console.log(' -- ERRORZ! --');
                    console.log( err );
                    console.log('');
                }

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
            } else {
                console.log(' ... skip compile');
                rockServer.serveFile( './../release/quby.js', req, res );
            }
        }
});

rockServer.start( PUBLIC_FOLDER, 8081 );

