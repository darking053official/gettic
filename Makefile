# =====================================================
#  Gettic.js - Makefile
#  Kullanım: make <hedef>
# =====================================================

.PHONY: help install dev start stop test lint format clean build

# Varsayılan hedef
help:
	@echo "📋 Kullanılabilir hedefler:"
	@echo ""
	@echo "  make install   - Bağımlılıkları yükle (npm install)"
	@echo "  make dev       - Geliştirme modunda çalıştır (nodemon)"
	@echo "  make start     - Production modunda çalıştır"
	@echo "  make stop      - Çalışan Node.js sürecini durdur (Linux/macOS)"
	@echo "  make test      - Testleri çalıştır (Jest)"
	@echo "  make lint      - Kod kalitesini kontrol et (ESLint)"
	@echo "  make format    - Kodları formatla (Prettier)"
	@echo "  make build     - Production build al (webpack)"
	@echo "  make clean     - node_modules ve lock dosyalarını temizle"
	@echo "  make logs      - PM2 loglarını göster (PM2 ile çalışıyorsa)"
	@echo ""

# Bağımlılıkları yükle
install:
	@echo "📦 Bağımlılıklar yükleniyor..."
	npm install
	@echo "✅ Tamamlandı!"

# Geliştirme modu
dev:
	@echo "🔄 Geliştirme modu başlatılıyor..."
	npx nodemon server.js

# Production modu
start:
	@echo "🚀 Production modu başlatılıyor..."
	NODE_ENV=production node server.js

# PM2 ile başlat (opsiyonel)
pm2-start:
	@echo "🚀 PM2 ile başlatılıyor..."
	pm2 start server.js --name gettic.js
	pm2 save

# PM2 ile durdur
pm2-stop:
	@echo "🛑 PM2 durduruluyor..."
	pm2 stop gettic.js

# Test
test:
	@echo "🧪 Testler çalıştırılıyor..."
	npm test

# Lint
lint:
	@echo "🔍 Kod kalitesi kontrol ediliyor..."
	npm run lint

# Format
format:
	@echo "🎨 Kodlar formatlanıyor..."
	npm run format

# Build
build:
	@echo "📦 Production build alınıyor..."
	npm run build

# Temizlik
clean:
	@echo "🧹 Temizlik yapılıyor..."
	rm -rf node_modules
	rm -f package-lock.json
	rm -rf dist
	rm -rf build
	@echo "✅ Temizlendi!"

# Loglar (PM2 ile çalışıyorsa)
logs:
	pm2 logs gettic.js

# Stop (Linux/macOS - pkill ile)
stop:
	@echo "🛑 Node.js süreci durduruluyor..."
	pkill -f "node server.js" || true
	@echo "✅ Durduruldu!"
