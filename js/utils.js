// ============================================
// GETTIC - UTILITY FUNCTIONS
// ============================================

// Zaman formatlama
function formatTime(timestamp) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    // Bugün ise sadece saat
    if (diffDay === 0 && date.getDate() === now.getDate()) {
        return date.toLocaleTimeString('tr-TR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
    
    // Dün ise
    if (diffDay === 1) {
        return 'Dün ' + date.toLocaleTimeString('tr-TR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
    
    // Bu hafta ise gün adı
    if (diffDay < 7) {
        return date.toLocaleDateString('tr-TR', { 
            weekday: 'long',
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
    
    // Daha eski ise tam tarih
    return date.toLocaleDateString('tr-TR', { 
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

// Tarih formatlama (mesaj ayraçları için)
function formatDate(timestamp) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === now.toDateString()) {
        return 'Bugün';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Dün';
    } else if (date.getFullYear() === now.getFullYear()) {
        return date.toLocaleDateString('tr-TR', { 
            day: 'numeric', 
            month: 'long' 
        });
    } else {
        return date.toLocaleDateString('tr-TR', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        });
    }
}

// Son görülme formatlama
function formatLastSeen(timestamp) {
    if (!timestamp) return 'Hiç görülmedi';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffSec < 60) return 'Az önce görüldü';
    if (diffMin < 60) return `${diffMin} dakika önce görüldü`;
    if (diffHour < 24) return `${diffHour} saat önce görüldü`;
    if (diffDay === 1) return 'Dün görüldü';
    if (diffDay < 7) return `${diffDay} gün önce görüldü`;
    
    return date.toLocaleDateString('tr-TR', { 
        day: 'numeric', 
        month: 'long' 
    }) + ' tarihinde görüldü';
}

// HTML escape (XSS koruması)
function escapeHtml(text) {
    if (!text) return '';
    
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Debounce fonksiyonu
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle fonksiyonu
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Rastgele ID üret
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Scroll to bottom
function scrollToBottom(element) {
    if (!element) return;
    element.scrollTop = element.scrollHeight;
}

// Kullanıcı çevrimiçi mi kontrol
function isOnline(status) {
    return status === 'online';
}

// Dosya boyutu formatlama
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Dosya uzantısı kontrol
function getFileExtension(filename) {
    return filename.split('.').pop().toLowerCase();
}

// Dosya tipi kontrol
function isImageFile(filename) {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    return imageExtensions.includes(getFileExtension(filename));
}

function isVideoFile(filename) {
    const videoExtensions = ['mp4', 'webm', 'ogg', 'mov'];
    return videoExtensions.includes(getFileExtension(filename));
}

function isAudioFile(filename) {
    const audioExtensions = ['mp3', 'wav', 'ogg', 'm4a'];
    return audioExtensions.includes(getFileExtension(filename));
}

// Metin kısaltma
function truncateText(text, maxLength = 50) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// İlk harfi büyük yap
function capitalizeFirstLetter(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Kullanıcı adı doğrulama
function isValidUsername(username) {
    const regex = /^[a-zA-Z0-9_]{3,20}$/;
    return regex.test(username);
}

// Email doğrulama
function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

// Şifre gücü kontrol
function checkPasswordStrength(password) {
    let score = 0;
    
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    
    return {
        score: Math.min(score, 4),
        label: ['Çok Zayıf', 'Zayıf', 'Orta', 'Güçlü', 'Çok Güçlü'][Math.min(score, 4)]
    };
}

// Renk üret (avatar için)
function generateColorFromString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const colors = [
        '#7c3aed', '#8b5cf6', '#6d28d9', '#5b21b6',
        '#4c1d95', '#3b82f6', '#2563eb', '#1d4ed8',
        '#0ea5e9', '#0284c7', '#06b6d4', '#0891b2',
        '#10b981', '#059669', '#047857', '#065f46'
    ];
    
    return colors[Math.abs(hash) % colors.length];
}

// Baş harfleri al (avatar için)
function getInitials(name) {
    if (!name) return '?';
    
    const parts = name.split(' ');
    if (parts.length === 1) {
        return parts[0].charAt(0).toUpperCase();
    }
    
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// URL'den parametre oku
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// LocalStorage işlemleri
const storage = {
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error('Storage set error:', error);
        }
    },
    
    get(key) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.error('Storage get error:', error);
            return null;
        }
    },
    
    remove(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error('Storage remove error:', error);
        }
    },
    
    clear() {
        try {
            localStorage.clear();
        } catch (error) {
            console.error('Storage clear error:', error);
        }
    }
};

// Export et (Node.js için)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        formatTime,
        formatDate,
        formatLastSeen,
        escapeHtml,
        debounce,
        throttle,
        generateId,
        scrollToBottom,
        isOnline,
        formatFileSize,
        getFileExtension,
        isImageFile,
        isVideoFile,
        isAudioFile,
        truncateText,
        capitalizeFirstLetter,
        isValidUsername,
        isValidEmail,
        checkPasswordStrength,
        generateColorFromString,
        getInitials,
        getUrlParameter,
        storage
    };
}
