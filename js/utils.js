// ============================================
// GETTIC - UTILS (Premium)
// ============================================

(function() {
    'use strict';
    
    if (window.UTILS) {
        console.warn('Utils zaten yüklü');
        return;
    }

    // ============ ZAMAN ============
    function formatTime(timestamp) {
        if (!timestamp) return '';
        
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return '';
        
        const now = new Date();
        const diffMs = now - date;
        const diffMin = Math.floor(diffMs / 60000);
        const diffHour = Math.floor(diffMs / 3600000);
        const diffDay = Math.floor(diffMs / 86400000);

        // Aynı gün mü?
        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        }

        // Dün mü?
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) {
            return 'Dün ' + date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        }

        // Bu hafta mı?
        if (diffDay < 7) {
            return date.toLocaleString('tr-TR', {
                weekday: 'long',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        // Daha eski
        return date.toLocaleString('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function formatDate(timestamp) {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return '';

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const diffDays = Math.round((today - target) / 86400000);

        if (diffDays === 0) return 'Bugün';
        if (diffDays === 1) return 'Dün';
        if (diffDays < 7) return date.toLocaleDateString('tr-TR', { weekday: 'long' });
        if (date.getFullYear() === now.getFullYear()) {
            return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
        }
        return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    }

    function formatLastSeen(timestamp) {
        if (!timestamp) return 'Hiç görülmedi';
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return 'Hiç görülmedi';

        const diffSec = Math.floor((Date.now() - date) / 1000);

        if (diffSec < 60) return 'Az önce görüldü';
        if (diffSec < 3600) return `${Math.floor(diffSec / 60)} dakika önce görüldü`;
        if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} saat önce görüldü`;

        const diffDays = Math.floor(diffSec / 86400);
        if (diffDays === 1) return 'Dün görüldü';
        if (diffDays < 7) return `${diffDays} gün önce görüldü`;

        return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }) + ' tarihinde görüldü';
    }

    function formatDuration(ms) {
        if (!ms || ms < 0) return '0 saniye';
        const sec = Math.floor(ms / 1000);
        const min = Math.floor(sec / 60);
        const hour = Math.floor(min / 60);
        const day = Math.floor(hour / 24);

        if (day > 0) return `${day} gün ${hour % 24} saat`;
        if (hour > 0) return `${hour} saat ${min % 60} dakika`;
        if (min > 0) return `${min} dakika ${sec % 60} saniye`;
        return `${sec} saniye`;
    }

    // ============ GÜVENLİK ============
    function escapeHtml(text) {
        if (text === null || text === undefined) return '';
        return String(text).replace(/[&<>"']/g, c => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[c]));
    }

    function escapeUrl(url) {
        if (!url) return '';
        const str = String(url).trim();
        if (/^(https?:|blob:|data:image\/)/i.test(str)) {
            return escapeHtml(str);
        }
        return '';
    }

    // ============ FONKSİYONEL ============
    function debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    function throttle(func, limit = 200) {
        let inThrottle = false;
        let lastArgs = null;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => {
                    inThrottle = false;
                    if (lastArgs) {
                        func.apply(this, lastArgs);
                        lastArgs = null;
                    }
                }, limit);
            } else {
                lastArgs = args;
            }
        };
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ============ ID ============
    function generateId() {
        const ts = Date.now().toString(36);
        const rand = Math.random().toString(36).slice(2, 11);
        return `${ts}-${rand}`;
    }

    function generateShortId(length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        const arr = new Uint8Array(length);
        crypto.getRandomValues(arr);
        for (let i = 0; i < length; i++) {
            result += chars[arr[i] % chars.length];
        }
        return result;
    }

    // ============ DOM ============
    function scrollToBottom(element, smooth = true) {
        if (!element) return;
        element.scrollTo({
            top: element.scrollHeight,
            behavior: smooth ? 'smooth' : 'auto'
        });
    }

    function scrollToElement(element) {
        if (!element) return;
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // ============ DURUM ============
    function isOnline(status) {
        return status === 'online';
    }

    function isValidStatus(status) {
        return ['online', 'offline', 'away', 'busy'].includes(status);
    }

    function getStatusLabel(status) {
        return {
            online: 'Çevrimiçi',
            offline: 'Çevrimdışı',
            away: 'Uzakta',
            busy: 'Meşgul'
        }[status] || 'Bilinmiyor';
    }

    // ============ DOSYA ============
    function formatFileSize(bytes) {
        if (bytes === 0 || bytes === null || bytes === undefined) return '0 Bytes';
        const num = Number(bytes);
        if (isNaN(num) || num < 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(num) / Math.log(k));
        return `${parseFloat((num / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    }

    function mbToBytes(mb) {
        return Math.floor((Number(mb) || 0) * 1024 * 1024);
    }

    function bytesToMB(bytes) {
        return ((Number(bytes) || 0) / 1024 / 1024).toFixed(2);
    }

    function getFileExtension(filename) {
        if (!filename) return '';
        // Query string'i temizle
        const clean = String(filename).split('?')[0].split('#')[0];
        const lastDot = clean.lastIndexOf('.');
        if (lastDot === -1 || lastDot === clean.length - 1) return '';
        return clean.slice(lastDot + 1).toLowerCase();
    }

    function isImageFile(filename) {
        return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(getFileExtension(filename));
    }
    function isVideoFile(filename) {
        return ['mp4', 'webm', 'ogg', 'mov'].includes(getFileExtension(filename));
    }
    function isAudioFile(filename) {
        return ['mp3', 'wav', 'ogg', 'm4a'].includes(getFileExtension(filename));
    }

    function getFileType(filename) {
        if (isImageFile(filename)) return 'image';
        if (isVideoFile(filename)) return 'video';
        if (isAudioFile(filename)) return 'voice';
        return 'file';
    }

    // ============ METİN ============
    function truncateText(text, maxLength = 50, suffix = '...') {
        if (!text) return '';
        const str = String(text);
        if (str.length <= maxLength) return str;

        // Kelime bazlı kes
        const truncated = str.slice(0, maxLength);
        const lastSpace = truncated.lastIndexOf(' ');
        const cut = lastSpace > maxLength * 0.7 ? lastSpace : maxLength;
        return truncated.slice(0, cut).trim() + suffix;
    }

    function capitalizeFirstLetter(string) {
        if (!string) return '';
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    function capitalizeWords(string) {
        if (!string) return '';
        return string.split(' ').map(w => capitalizeFirstLetter(w)).join(' ');
    }

    // ============ DOĞRULAMA ============
    function isValidUsername(username) {
        return /^[a-zA-Z0-9_]{3,20}$/.test(username || '');
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '');
    }

    function isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    function isEmpty(value) {
        if (value === null || value === undefined) return true;
        if (typeof value === 'string') return value.trim().length === 0;
        if (Array.isArray(value)) return value.length === 0;
        if (typeof value === 'object') return Object.keys(value).length === 0;
        return false;
    }

    function checkPasswordStrength(password) {
        const pwd = password || '';
        let score = 0;
        if (pwd.length >= 8) score++;
        if (pwd.length >= 12) score++;
        if (/[A-Z]/.test(pwd)) score++;
        if (/[0-9]/.test(pwd)) score++;
        if (/[^A-Za-z0-9]/.test(pwd)) score++;

        const labels = ['Çok Zayıf', 'Zayıf', 'Orta', 'Güçlü', 'Çok Güçlü'];
        return {
            score: Math.min(score, 4),
            label: labels[Math.min(score, 4)]
        };
    }

    // ============ AVATAR ============
    function generateColorFromString(str) {
        const safeStr = str || '?';
        const colors = [
            '#7c3aed', '#8b5cf6', '#6d28d9', '#5b21b6', '#4c1d95',
            '#3b82f6', '#2563eb', '#1d4ed8', '#0ea5e9', '#0284c7',
            '#06b6d4', '#0891b2', '#10b981', '#059669', '#047857',
            '#f59e0b', '#d97706', '#ef4444', '#dc2626', '#ec4899'
        ];
        let hash = 0;
        for (let i = 0; i < safeStr.length; i++) {
            hash = safeStr.charCodeAt(i) + ((hash << 5) - hash);
            hash = hash & hash;
        }
        return colors[Math.abs(hash) % colors.length];
    }

    function getInitials(name) {
        if (!name) return '?';
        const parts = String(name).trim().split(/\s+/);
        if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }

    // ============ URL ============
    function getUrlParameter(name) {
        return new URLSearchParams(window.location.search).get(name);
    }

    // ============ STORAGE ============
    const storage = {
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (e) {
                console.error('Storage set error:', e);
                return false;
            }
        },
        get(key, fallback = null) {
            try {
                const item = localStorage.getItem(key);
                if (item === null) return fallback;
                return JSON.parse(item);
            } catch (e) {
                console.error('Storage get error:', e);
                return fallback;
            }
        },
        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (e) {
                return false;
            }
        },
        clear() {
            try {
                localStorage.clear();
                return true;
            } catch (e) {
                return false;
            }
        }
    };

    // ============ CLIPBOARD ============
    async function copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return { success: true };
        } catch (e) {
            // Fallback
            try {
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                return { success: true };
            } catch (err) {
                return { success: false, error: err.message };
            }
        }
    }

    // ============ İNDİR ============
    function downloadFile(url, filename = 'dosya') {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.target = '_blank';
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    // ============ DİĞER ============
    function deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (typeof structuredClone === 'function') {
            try { return structuredClone(obj); } catch {}
        }
        return JSON.parse(JSON.stringify(obj));
    }

    function randomBetween(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function groupBy(array, keyFn) {
        return (array || []).reduce((acc, item) => {
            const key = typeof keyFn === 'function' ? keyFn(item) : item[keyFn];
            (acc[key] = acc[key] || []).push(item);
            return acc;
        }, {});
    }

    // ============ EXPORT ============
    window.UTILS = {
        // Zaman
        formatTime,
        formatDate,
        formatLastSeen,
        formatDuration,
        // Güvenlik
        escapeHtml,
        escapeUrl,
        // Fonksiyonel
        debounce,
        throttle,
        sleep,
        // ID
        generateId,
        generateShortId,
        // DOM
        scrollToBottom,
        scrollToElement,
        // Durum
        isOnline,
        isValidStatus,
        getStatusLabel,
        // Dosya
        formatFileSize,
        mbToBytes,
        bytesToMB,
        getFileExtension,
        isImageFile,
        isVideoFile,
        isAudioFile,
        getFileType,
        // Metin
        truncateText,
        capitalizeFirstLetter,
        capitalizeWords,
        // Doğrulama
        isValidUsername,
        isValidEmail,
        isValidUrl,
        isEmpty,
        checkPasswordStrength,
        // Avatar
        generateColorFromString,
        getInitials,
        // URL
        getUrlParameter,
        // Storage
        storage,
        // Clipboard
        copyToClipboard,
        // İndir
        downloadFile,
        // Diğer
        deepClone,
        randomBetween,
        groupBy
    };

    // Kısayollar (eski uyumluluk için)
    window.formatTime = formatTime;
    window.formatDate = formatDate;
    window.formatLastSeen = formatLastSeen;
    window.escapeHtml = escapeHtml;
    window.debounce = debounce;
    window.throttle = throttle;
    window.generateId = generateId;
    window.scrollToBottom = scrollToBottom;
    window.isOnline = isOnline;
    window.formatFileSize = formatFileSize;
    window.getFileExtension = getFileExtension;
    window.isImageFile = isImageFile;
    window.isVideoFile = isVideoFile;
    window.isAudioFile = isAudioFile;
    window.truncateText = truncateText;
    window.capitalizeFirstLetter = capitalizeFirstLetter;
    window.isValidUsername = isValidUsername;
    window.isValidEmail = isValidEmail;
    window.checkPasswordStrength = checkPasswordStrength;
    window.generateColorFromString = generateColorFromString;
    window.getInitials = getInitials;
    window.getUrlParameter = getUrlParameter;

    console.log('✅ Utils yüklendi');
})();
