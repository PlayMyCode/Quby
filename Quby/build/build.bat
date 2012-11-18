
@echo off

rem first search for the compiler
rem this is a generic path search, to check if it exists
rem then we try pre-known locations, hard coded in

for %%X in (tsc.exe) do (set TSC_COMPILER=%%~$PATH:X)

if not defined TSC_COMPILER (
    if exist "C:\Program Files (x86)\Microsoft SDKs\TypeScript\0.8.1.0\tsc.exe" (
        set TSC_COMPILER="C:\Program Files (x86)\Microsoft SDKs\TypeScript\0.8.1.0\tsc.exe"
    )
) else (
    set TSC_COMPILER="%TSC_COMPILER%"
)

rem now we see if we actually have the compiler, and use it if we do

if defined TSC_COMPILER (
    rem found!
    
    @echo on
    %TSC_COMPILER% --out %~dp0\..\release\quby.js %~dp0\..\quby.ts
) else (
    @echo on

    echo ### ERROR ###
    echo tsc compiler not found!
    echo --- ----- ---
)
