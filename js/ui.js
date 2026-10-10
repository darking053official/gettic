// ============================================
// GETTIC - UI MANAGER (Premium)
// ============================================

class UIManager {
    constructor() {
        this.toastContainer = null;
        this.modalStack = [];
        this.loadingCount = 0;
        this.loadingOverlay = null;
        this.maxToasts = 5;
        this.activeToasts = [];
        this._initialized = false;
        this._initOnReady();
    }

    _initOnReady() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this._init());
        } else {
            this._init();
        }
    }

    _init() {
        if (this._initialized) return;
        this._initialized = true;

        this._createToastContainer();
        this._createLoadingOverlay();
    }

    // ============ ESCAPE ============
    _escape(str) {
        if (str === null || str === undefined) return '';
        return String(str).replace(/[<>&"']/g, c => ({
            '<': '&lt;',
            '>': '&gt;',
            '&': '&amp;',
            '"': '&quot;',
            "'": '&#39;'
        }[c]));
    }

    _escapeUrl(url) {
        if (!url) return '';
        // Sadece http(s) ve blob/data URL'lerine izin ver
        const str = String(url);
        if (/^(https?:|blob:|data:)/i.test(str)) {
            return this._escape(str);
        }
        return '';
    }

    // ============ TOAST CONTAINER ============
    _createToastContainer() {
        this.toastContainer = document.createElement('div');
        this.toastContainer.id = 'gettic-toasts';
        this.toastContainer.className = 'fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none max-w-sm';
        document.body.appendChild(this.toastContainer);
    }

    // ============ LOADING OVERLAY ============
    _createLoadingOverlay() {
        this.loadingOverlay = document.createElement('div');
        this.loadingOverlay.id = 'gettic-loading';
        this.loadingOverlay.className = 'hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] flex items-center justify-center';
        this.loadingOverlay.innerHTML = `
            <div class="bg-bg-secondary rounded-2xl p-8 flex flex-col items-center shadow-2xl border border-border-dark">
                <div class="spinner-premium mb-4"></div>
                <p class="text-gray-400 text-sm">Yükleniyor...</p>
            </div>
        `;
        document.body.appendChild(this.loadingOverlay);
    }

    // ============ TOAST ============
    showToast(message, type = 'info', duration = 4000) {
        if (!this._initialized) this._initOnReady();

        // Toast limiti
        if (this.activeToasts.length >= this.maxToasts) {
            const oldest = this.activeToasts.shift();
            if (oldest && oldest.parentNode) oldest.remove();
        }

        const styles = {
            success: { bg: 'bg-green-500', icon: '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>' },
            error: { bg: 'bg-red-500', icon: '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>' },
            warning: { bg: 'bg-yellow-500', icon: '<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>' },
            info: { bg: 'bg-accent', icon: '<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>' }
        };

        const style = styles[type] || styles.info;

        const toast = document.createElement('div');
        toast.className = `${style.bg} text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 transform transition-all duration-300 pointer-events-auto opacity-0 translate-x-full`;
        toast.innerHTML = `
            <svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">${style.icon}</svg>
            <span class="font-medium text-sm flex-1">${this._escape(message)}</span>
            <button class="text-white/70 hover:text-white transition flex-shrink-0" data-dismiss>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>
        `;

        this.toastContainer.appendChild(toast);
        this.activeToasts.push(toast);

        // Animasyon
        requestAnimationFrame(() => {
            toast.classList.remove('opacity-0', 'translate-x-full');
        });

        // Kapatma fonksiyonu
        const removeToast = () => {
            if (!toast.parentNode) return;
            toast.classList.add('opacity-0', 'translate-x-full');
            setTimeout(() => {
                toast.remove();
                const idx = this.activeToasts.indexOf(toast);
                if (idx > -1) this.activeToasts.splice(idx, 1);
            }, 300);
        };

        // Kapatma butonu
        toast.querySelector('[data-dismiss]')?.addEventListener('click', removeToast);

        // Otomatik kapatma
        if (duration > 0) {
            setTimeout(removeToast, duration);
        }

        return toast;
    }

    // ============ MODAL ============
    showModal({ title, content, buttons = [], onClose = null, closeOnBackdrop = true }) {
        if (!this._initialized) this._init();

        const modalId = 'modal-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);

        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm z-[9997] flex items-center justify-center p-4 modal-overlay';
        overlay.dataset.modalId = modalId;

        overlay.innerHTML = `
            <div class="bg-bg-secondary rounded-2xl border border-border-dark shadow-2xl w-full max-w-md animate-scale-in" role="dialog" aria-modal="true">
                <div class="flex justify-between items-center p-6 border-b border-border-dark">
                    <h3 class="text-xl font-bold">${this._escape(title)}</h3>
                    <button class="text-gray-400 hover:text-white transition modal-close" aria-label="Kapat">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
                <div class="p-6 modal-body"></div>
                <div class="flex justify-end gap-3 p-6 border-t border-border-dark modal-footer"></div>
            </div>
        `;

        // Content ve footer'ı DOM API ile ekle (XSS-safe)
        const bodyEl = overlay.querySelector('.modal-body');
        if (typeof content === 'string') {
            bodyEl.innerHTML = content; // Kullanıcı zaten HTML basıyorsa escape etmiyoruz, güvenli olduğu varsayılıyor
        } else if (content instanceof HTMLElement) {
            bodyEl.appendChild(content);
        }

        const footerEl = overlay.querySelector('.modal-footer');
        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.className = btn.class || 'px-4 py-2 rounded-lg bg-bg-tertiary hover:bg-bg-hover text-white font-semibold transition';
            button.textContent = btn.text || '';
            button.addEventListener('click', () => {
                if (typeof btn.onClick === 'function') btn.onClick(overlay);
                if (btn.close !== false) this._closeModal(overlay, onClose);
            });
            footerEl.appendChild(button);
        });

        // Kapatma
        overlay.querySelector('.modal-close').addEventListener('click', () => {
            this._closeModal(overlay, onClose);
        });

        // Backdrop tıklaması
        if (closeOnBackdrop) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this._closeModal(overlay, onClose);
                }
            });
        }

        // ESC ile kapatma
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                this._closeModal(overlay, onClose);
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        document.body.appendChild(overlay);
        this.modalStack.push({ overlay, escHandler });

        return overlay;
    }

    _closeModal(overlay, onClose) {
        if (!overlay || !overlay.parentNode) return;

        overlay.classList.add('opacity-0');
        setTimeout(() => {
            overlay.remove();
            const idx = this.modalStack.findIndex(m => m.overlay === overlay);
            if (idx > -1) {
                const entry = this.modalStack.splice(idx, 1)[0];
                document.removeEventListener('keydown', entry.escHandler);
            }
            if (onClose) onClose();
        }, 200);
    }

    closeAllModals() {
        this.modalStack.forEach(m => {
            document.removeEventListener('keydown', m.escHandler);
            if (m.overlay.parentNode) m.overlay.remove();
        });
        this.modalStack = [];
    }

    // ============ CONFIRM ============
    showConfirm(message, onConfirm, onCancel = null) {
        return this.showModal({
            title: 'Onay',
            content: `<p class="text-gray-300">${this._escape(message)}</p>`,
            buttons: [
                {
                    text: 'İptal',
                    class: 'px-4 py-2 rounded-lg bg-bg-tertiary hover:bg-bg-hover text-white font-semibold transition',
                    onClick: onCancel
                },
                {
                    text: 'Onayla',
                    class: 'px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white font-semibold transition',
                    onClick: onConfirm
                }
            ]
        });
    }

    // ============ ALERT ============
    showAlert(message, title = 'Bildirim') {
        return this.showModal({
            title,
            content: `<p class="text-gray-300">${this._escape(message)}</p>`,
            buttons: [
                {
                    text: 'Tamam',
                    class: 'px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white font-semibold transition'
                }
            ]
        });
    }

    // ============ PROMPT ============
    showPrompt(message, defaultValue = '', onSubmit = null) {
        const content = document.createElement('div');
        content.innerHTML = `
            <p class="text-gray-300 mb-3">${this._escape(message)}</p>
            <input type="text" class="w-full bg-bg-tertiary border border-border-dark rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-accent transition" value="${this._escape(defaultValue)}">
        `;
        const input = content.querySelector('input');

        return this.showModal({
            title: 'Girdi',
            content,
            buttons: [
                { text: 'İptal', class: 'px-4 py-2 rounded-lg bg-bg-tertiary hover:bg-bg-hover text-white font-semibold transition' },
                {
                    text: 'Onayla',
                    class: 'px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white font-semibold transition',
                    onClick: () => {
                        if (onSubmit) onSubmit(input.value);
                    }
                }
            ],
            onClose: () => {
                // Focus input on open
            }
        });
    }

    // ============ LOADING ============
    showLoading() {
        this.loadingCount++;
        if (this.loadingOverlay) {
            this.loadingOverlay.classList.remove('hidden');
        }
    }

    hideLoading() {
        this.loadingCount = Math.max(0, this.loadingCount - 1);
        if (this.loadingCount === 0 && this.loadingOverlay) {
            this.loadingOverlay.classList.add('hidden');
        }
    }

    forceHideLoading() {
        this.loadingCount = 0;
        if (this.loadingOverlay) this.loadingOverlay.classList.add('hidden');
    }

    // ============ AVATAR ============
    createAvatar(user, size = 'md') {
        const sizes = {
            xs: 'w-6 h-6 text-xs',
            sm: 'w-8 h-8 text-sm',
            md: 'w-10 h-10 text-base',
            lg: 'w-12 h-12 text-lg',
            xl: 'w-16 h-16 text-xl',
            '2xl': 'w-24 h-24 text-3xl'
        };
        const sizeClass = sizes[size] || sizes.md;

        if (user?.avatar_url) {
            return `<img src="${this._escapeUrl(user.avatar_url)}" alt="${this._escape(user.username || 'Avatar')}" class="${sizeClass.split(' ').slice(0,2).join(' ')} rounded-xl object-cover">`;
        }

        const initials = this._getInitials(user?.username || user?.full_name || '?');
        const color = this._generateColor(user?.username || '?');

        return `<div class="${sizeClass} rounded-xl flex items-center justify-center font-bold text-white" style="background: ${color}">${this._escape(initials)}</div>`;
    }

    _getInitials(name) {
        if (!name) return '?';
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }

    _generateColor(str) {
        const colors = [
            '#7c3aed', '#8b5cf6', '#6d28d9', '#5b21b6',
            '#3b82f6', '#2563eb', '#1d4ed8', '#0ea5e9',
            '#06b6d4', '#0891b2', '#10b981', '#059669'
        ];
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    }

    // ============ MESAJ BALONU ============
    createMessageBubble(message, currentUserId) {
        if (!message) return '';

        const isSent = message.sender_id === currentUserId;
        const content = this._escape(message.content || '');
        const mediaUrl = this._escapeUrl(message.media_url);
        const time = this._formatTime(message.created_at);

        let mediaHtml = '';
        if (mediaUrl) {
            const ext = mediaUrl.split('.').pop().split('?')[0].toLowerCase();
            if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
                mediaHtml = `<img src="${mediaUrl}" alt="Görsel" class="rounded-lg max-w-xs max-h-60 object-cover cursor-pointer" loading="lazy">`;
            } else if (['mp4', 'webm', 'ogg', 'mov'].includes(ext)) {
                mediaHtml = `<video src="${mediaUrl}" controls class="rounded-lg max-w-xs" preload="metadata"></video>`;
            } else if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) {
                mediaHtml = `<audio src="${mediaUrl}" controls class="max-w-xs"></audio>`;
            } else {
                mediaHtml = `
                    <a href="${mediaUrl}" target="_blank" rel="noopener" class="flex items-center gap-2 text-blue-400 hover:text-blue-300 underline">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                        ${content || 'Dosya'}
                    </a>
                `;
            }
        }

        return `
            <div class="flex ${isSent ? 'justify-end' : 'justify-start'} mb-3 fade-in">
                <div class="message-bubble-premium ${isSent ? 'sent' : 'received'}">
                    ${mediaHtml ? `<div class="mb-2">${mediaHtml}</div>` : ''}
                    ${message.content && message.type === 'text' ? `<p class="break-words whitespace-pre-wrap">${content}</p>` : ''}
                    <div class="flex items-center justify-end gap-1 mt-1">
                        <span class="text-xs ${isSent ? 'text-white/70' : 'text-gray-500'}">${time}</span>
                        ${message.is_edited ? `<span class="text-xs ${isSent ? 'text-white/60' : 'text-gray-600'}">· düzenlendi</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    _formatTime(timestamp) {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    }

    // ============ TARİH AYRAÇI ============
    createDateDivider(date) {
        return `
            <div class="flex items-center justify-center my-6">
                <div class="bg-bg-tertiary rounded-full px-4 py-1 text-xs text-gray-400 border border-border-dark">
                    ${this._formatDate(date)}
                </div>
            </div>
        `;
    }

    _formatDate(timestamp) {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const diff = (today - target) / 86400000;

        if (diff === 0) return 'Bugün';
        if (diff === 1) return 'Dün';
        if (diff < 7) return date.toLocaleDateString('tr-TR', { weekday: 'long' });
        return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
    }

    // ============ TYPING ============
    createTypingIndicator(usernames) {
        const names = Array.isArray(usernames) ? usernames : [usernames];
        const text = names.length === 1
            ? `${this._escape(names[0])} yazıyor...`
            : `${names.map(n => this._escape(n)).join(', ')} yazıyor...`;

        return `
            <div class="flex items-center gap-2 mb-3">
                <div class="typing-indicator-premium">
                    <div class="typing-dot-premium"></div>
                    <div class="typing-dot-premium"></div>
                    <div class="typing-dot-premium"></div>
                </div>
                <span class="text-sm text-gray-400">${text}</span>
            </div>
        `;
    }

    // ============ SKELETON ============
    createSkeleton(lines = 3, className = '') {
        let html = `<div class="space-y-2 ${className}">`;
        for (let i = 0; i < lines; i++) {
            const width = i === lines - 1 ? 'w-2/3' : 'w-full';
            html += `<div class="h-4 bg-bg-tertiary rounded skeleton ${width}"></div>`;
        }
        html += '</div>';
        return html;
    }

    // ============ FORM VALIDATION ============
    validateForm(formData, rules) {
        const errors = {};

        Object.keys(rules).forEach(field => {
            const value = formData[field];
            const fieldRules = rules[field] || [];

            fieldRules.forEach(rule => {
                const isEmpty = value === undefined || value === null || value === '';

                if (rule.type === 'required' && isEmpty) {
                    errors[field] = rule.message || 'Bu alan zorunlu';
                }
                if (rule.type === 'email' && !isEmpty && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    errors[field] = rule.message || 'Geçersiz email';
                }
                if (rule.type === 'minLength' && !isEmpty && String(value).length < rule.value) {
                    errors[field] = rule.message || `En az ${rule.value} karakter olmalı`;
                }
                if (rule.type === 'maxLength' && !isEmpty && String(value).length > rule.value) {
                    errors[field] = rule.message || `En fazla ${rule.value} karakter olmalı`;
                }
                if (rule.type === 'match' && rule.field && value !== formData[rule.field]) {
                    errors[field] = rule.message || 'Eşleşmiyor';
                }
                if (rule.type === 'pattern' && !isEmpty && !rule.pattern.test(value)) {
                    errors[field] = rule.message || 'Geçersiz format';
                }
            });
        });

        return errors;
    }

    showFormErrors(form, errors) {
        this.clearFormErrors(form);
        Object.keys(errors).forEach(field => {
            const input = form.querySelector(`[name="${field}"]`);
            if (!input) return;
            input.classList.add('border-red-500');
            const errorDiv = document.createElement('p');
            errorDiv.className = 'text-red-400 text-xs mt-1';
            errorDiv.textContent = errors[field];
            input.parentElement.appendChild(errorDiv);
        });
    }

    clearFormErrors(form) {
        form.querySelectorAll('.border-red-500').forEach(el => el.classList.remove('border-red-500'));
        form.querySelectorAll('.text-red-400').forEach(el => el.remove());
    }
}

// Global
const uiManager = new UIManager();
