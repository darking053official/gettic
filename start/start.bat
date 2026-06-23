@echo off
title Gettic.js v1.0.0

echo Gettic.js v1.0.0 baslatiliyor...

:: Node.js kontrol et
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Hata: Node.js yüklü degil!
    echo Yuklemek icin: https://nodejs.org
    pause
    exit /b
)

:: Bagimliliklari yükle
if not exist "node_modules" (
    echo Bagimliliklar yukleniyor...
    call npm install
)

:: Projeyi baslat
echo Sunucu baslatiliyor...
node server.js
pause
