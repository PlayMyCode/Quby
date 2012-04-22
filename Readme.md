Quby Compiler
=============

Quby is a Ruby-like language, which looks similar, but slightly differently. It runs in the browser, in pure JavaScript, and compiles to JavaScript on the fly to ensure the code runs quickly.

It differs from Ruby as it reigns in some of it's dynamic nature to avoid runtime overhead, and to add compile time checks. For example you cannot call a function or a method which is not defined, anywhere.

It was built for [Play My Code](http://www.playmycode.com), and you can try it out [here](http://www.playmycode.com/build/try-play-my-code).

This Version is Under Construction!
-----------------------------------

The version here is the new Quby compiler, which is a rewrite of the whole parser. At the time of writing, it's only about 80% done, and the remaining 20% makes it unusable.

In short, come back in a week or two when it's done.

How To Build
------------

 - Download the code
 - if your on Windows, run /Quby/build/build.bat
 - if your not on-Windows, run /Quby/build/build.bash
 - goto /Quby/dist
 - quby.js is your copy
