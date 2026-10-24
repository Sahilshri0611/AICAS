@echo off
REM CrimeSense AI launcher - double-click to run. Pass --reset to reseed the DB.
if /I "%~1"=="--reset" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run.ps1" -Reset
) else (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run.ps1"
)
pause
