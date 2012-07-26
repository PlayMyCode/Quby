@echo off

type .\..\license.txt >  ..\dist\quby.js
type ..\src\lib\*.js  >> ..\dist\quby.js
type ..\src\*.js      >> ..\dist\quby.js

@echo on
rem ### Build Done! ###