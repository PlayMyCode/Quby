<?php
    /**
     * Builds the quby file,
     * and then serves it.
     * 
     * As a result, this may take a while before it completes.
     */
    exec( "cmd /c " . __DIR__ . "/./../build/build.bat" );

    $file = __DIR__ . '/../release/quby.js' ;
    
    header("Content-Type: application/javascript");
    header("Content-Length: " . filesize($file));

    // dump the file and stop the script
    readfile($file);

