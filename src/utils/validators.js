// ============================================
// GETTIC - UTILS/VALIDATORS.JS
// Doğrulama fonksiyonları
// ============================================

// Email doğrulama
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Kullanıcı adı doğrulama
function isValidUsername(username) {
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
}

// Şifre doğrulama
function isValidPassword(password) {
    return password.length >= 8;
}

// Telefon numarası doğrulama
function isValidPhone(phone) {
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    return phoneRegex.test(phone);
}

// URL doğrulama
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

// UUID doğrulama
function isValidUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

// Tarih doğrulama
function isValidDate(date) {
    return date instanceof Date && !isNaN(date);
}

// IP adresi doğrulama
function isValidIP(ip) {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-f]{1,4}:){7}[0-9a-f]{1,4}$/i;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

// Dosya tipi doğrulama
function isValidFileType(filename, allowedTypes) {
    const ext = filename.split('.').pop().toLowerCase();
    return allowedTypes.includes(ext);
}

// Dosya boyutu doğrulama (MB cinsinden)
function isValidFileSize(fileSizeInBytes, maxSizeInMB) {
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    return fileSizeInBytes <= maxSizeInBytes;
}

// Boş string kontrolü
function isEmptyString(str) {
    return !str || str.trim().length === 0;
}

// Sayı doğrulama
function isValidNumber(num) {
    return !isNaN(num) && isFinite(num);
}

// Pozitif sayı doğrulama
function isPositiveNumber(num) {
    return isValidNumber(num) && num > 0;
}

// Negatif sayı doğrulama
function isNegativeNumber(num) {
    return isValidNumber(num) && num < 0;
}

// Tam sayı doğrulama
function isInteger(num) {
    return Number.isInteger(num);
}

// String uzunluğu kontrolü
function isWithinLength(str, min, max) {
    const length = str.length;
    return length >= min && length <= max;
}

// Alfanumerik kontrol
function isAlphanumeric(str) {
    const alphanumericRegex = /^[a-zA-Z0-9]+$/;
    return alphanumericRegex.test(str);
}

// Sadece harf kontrolü
function isAlpha(str) {
    const alphaRegex = /^[a-zA-Z]+$/;
    return alphaRegex.test(str);
}

// Sadece rakam kontrolü
function isNumeric(str) {
    const numericRegex = /^[0-9]+$/;
    return numericRegex.test(str);
}

// JSON doğrulama
function isValidJSON(str) {
    try {
        JSON.parse(str);
        return true;
    } catch {
        return false;
    }
}

// Renk kodu doğrulama (hex)
function isValidHexColor(color) {
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexColorRegex.test(color);
}

module.exports = {
    isValidEmail,
    isValidUsername,
    isValidPassword,
    isValidPhone,
    isValidUrl,
    isValidUUID,
    isValidDate,
    isValidIP,
    isValidFileType,
    isValidFileSize,
    isEmptyString,
    isValidNumber,
    isPositiveNumber,
    isNegativeNumber,
    isInteger,
    isWithinLength,
    isAlphanumeric,
    isAlpha,
    isNumeric,
    isValidJSON,
    isValidHexColor
};
