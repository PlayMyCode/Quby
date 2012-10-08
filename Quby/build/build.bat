@echo off

call %~dp0\declarations.bat

type %~dp0\..\license.txt   >  %~dp0\..\dist\quby.js
type %~dp0\..\src\lib\*.js  >> %~dp0\..\dist\quby.js
type %~dp0\..\src\*.js      >> %~dp0\..\dist\quby.js

@echo on
rem ### Build Done! ###
