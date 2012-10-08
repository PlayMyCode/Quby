
rem Generates the declaration files,
rem and js, for each of the *.ts
rem files in the project

set project=%~dp0\..

for %%f in (%project%\src\lib\*.ts) do (
    tsc --declarations %%f
)

for %%f in (%project%\src\*.ts) do (
    tsc --declarations %%f
)

