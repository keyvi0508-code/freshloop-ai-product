@echo off
title FreshLoop Local Website
cd /d "%~dp0"
echo Starting FreshLoop. Keep this window open while using the website.
echo The browser will open automatically when the local server is ready.
call npm run dev -- --open
pause
