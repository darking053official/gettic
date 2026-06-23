#!/bin/bash

echo "Gettic.js v1.0.0 baslatiliyor..."

# Bagimliliklari kontrol et
if ! command -v node &> /dev/null; then
    echo "Hata: Node.js yüklü degil!"
    echo "Yuklemek icin: https://nodejs.org"
    exit 1
fi

# Bagimliliklari yükle
if [ ! -d "node_modules" ]; then
    echo "Bagimliliklar yukleniyor..."
    npm install
fi

# Projeyi baslat
echo "Sunucu baslatiliyor..."
node server.js
