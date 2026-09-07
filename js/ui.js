// ============================================
// GETTIC - UI MANAGER
// ============================================

class UIManager {
    constructor() {
        this.toastContainer = null;
        this.modalContainer = null;
        this.loadingOverlay = null;
        this.createToastContainer();
        this.createModalContainer();
        this.createLoadingOverlay();
    }

    // Toast container oluştur
    createToastContainer() {
        this.toastContainer = document.createElement('div');
        this.toastContainer.className = 'fixed top-4 right-4 z-[9999] space-y-2';
        document.body.appendChild(this.toastContainer);
    }

    // Modal container oluştur
    createModalContainer() {
        this.modalContainer = document.createElement('div');
        this.modalContainer.className = 'modal-container';
        document.body.appendChild(this.modalContainer);
    }

    // Loading overlay oluştur
    createLoadingOverlay() {
        this.loadingOverlay = document.createElement('div');
        this.loadingOverlay.className = 'hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] flex items-center justify-center';
        this.loadingOverlay.innerHTML = `
            <div class="bg-bg-secondary rounded-2xl p-8 flex flex-col items-center">
                <div class="spinner mb-4"></div>
                <p class="text-gray-400">Yükleniyor...</p>
            </div>
        `;
        document.body.appendChild(this.loadingOverlay);
    }

    // Toast göster
    showToast(message, type = 'info', duration = 3000) {
        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-yellow-500',
            info: 'bg-accent'
        };

        const icons = {
            success: `
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                </svg>
            `,
            error: `
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                </svg>
            `,
            warning: `
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                </svg>
            `,
            info: `
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
                </svg>
            `
        };

        const toast = document.createElement('div');
        toast.className = `${colors[type]} text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 transform transition-all duration-300 translate-x-full`;
        toast.innerHTML = `
            ${icons[type]}
            <span class="font-medium">${message}</span>
        `;

        this.toastContainer.appendChild(toast);

        // Animasyon
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 100);

        // Otomatik kapat
        setTimeout(() => {
            toast.style.transform = 'translateX(full)';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, duration);
    }

    // Modal göster
    showModal({ title, content, buttons = [], onClose = null }) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        
        const modal = document.createElement('div');
        modal.className = 'modal-content';
        
        let modalHTML = `
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl font-bold">${title}</h3>
                <button class="text-gray-400 hover:text-white transition" onclick="this.closest('.modal-overlay').remove()">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            <div class="mb-6">${content}</div>
            <div class="flex justify-end gap-3">
                ${buttons.map(btn => `
                    <button class="${btn.class || 'btn btn-secondary'}" onclick="${btn.onClick || ''}">
                        ${btn.text}
                    </button>
                `).join('')}
            </div>
        `;
        
        modal.innerHTML = modalHTML;
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        // Dışarı tıklayınca kapat
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
                if (onClose) onClose();
            }
        });
        
        return overlay;
    }

    // Loading göster
    showLoading() {
        this.loadingOverlay.classList.remove('hidden');
    }

    // Loading gizle
    hideLoading() {
        this.loadingOverlay.classList.add('hidden');
    }

    // Avatar oluştur
    createAvatar(user, size = 'md') {
        const sizes = {
            sm: 'w-8 h-8',
            md: 'w-10 h-10',
            lg: 'w-12 h-12',
            xl: 'w-16 h-16'
        };

        if (user?.avatar_url) {
            return `<img src="${user.avatar_url}" alt="${user.username || 'Avatar'}" class="${sizes[size]} rounded-xl object-cover">`;
        }

        const initials = getInitials(user?.username || user?.full_name || '?');
        const color = generateColorFromString(user?.username || '?');
        
        return `
            <div class="${sizes[size]} rounded-xl flex items-center justify-center font-bold text-white" style="background: ${color}">
                ${initials}
            </div>
        `;
    }

    // Mesaj balonu oluştur
    createMessageBubble(message, currentUserId) {
        const isSent = message.sender_id === currentUserId;
        
        return `
            <div class="flex ${isSent ? 'justify-end' : 'justify-start'} mb-4 fade-in">
                <div class="${isSent ? 'message-sent' : 'message-received'} message-bubble">
                    ${message.media_url ? `
                        <div class="mb-2">
                            ${isImageFile(message.media_url) ? `
                                <img src="${message.media_url}" alt="Görsel" class="rounded-lg max-w-xs max-h-60 object-cover">
                            ` : isVideoFile(message.media_url) ? `
                                <video src="${message.media_url}" controls class="rounded-lg max-w-xs"></video>
                            ` : isAudioFile(message.media_url) ? `
                                <audio src="${message.media_url}" controls></audio>
                            ` : `
                                <a href="${message.media_url}" target="_blank" class="flex items-center gap-2 text-blue-400 hover:text-blue-300">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
                                    </svg>
                                    ${message.content}
                                </a>
                            `}
                        </div>
                    ` : ''}
                    
                    ${message.content && message.type === 'text' ? `
                        <p class="break-words">${escapeHtml(message.content)}</p>
                    ` : ''}
                    
                    <div class="flex items-center justify-end gap-1 mt-1">
                        <span class="message-time">${formatTime(message.created_at)}</span>
                        ${isSent ? `
                            <span class="text-xs ${message.is_edited ? 'text-gray-300' : ''}">
                                ${message.is_edited ? 'düzenlendi' : ''}
                            </span>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    // Tarih ayracı oluştur
    createDateDivider(date) {
        return `
            <div class="flex items-center justify-center my-6">
                <div class="bg-bg-tertiary rounded-full px-4 py-1 text-xs text-gray-400">
                    ${formatDate(date)}
                </div>
            </div>
        `;
    }

    // Yazıyor göstergesi
    createTypingIndicator(usernames) {
        return `
            <div class="flex items-center gap-2 mb-4">
                <div class="typing-indicator">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
                <span class="text-sm text-gray-400">
                    ${usernames.join(', ')} yazıyor...
                </span>
            </div>
        `;
    }

    // Form doğrulama
    validateForm(formData, rules) {
        const errors = {};
        
        Object.keys(rules).forEach(field => {
            const value = formData[field];
            const fieldRules = rules[field];
            
            fieldRules.forEach(rule => {
                if (rule.type === 'required' && !value) {
                    errors[field] = rule.message || 'Bu alan zorunlu';
                }
                
                if (rule.type === 'email' && value && !isValidEmail(value)) {
                    errors[field] = rule.message || 'Geçersiz email';
                }
                
                if (rule.type === 'minLength' && value && value.length < rule.value) {
                    errors[field] = rule.message || `En az ${rule.value} karakter olmalı`;
                }
                
                if (rule.type === 'maxLength' && value && value.length > rule.value) {
                    errors[field] = rule.message || `En fazla ${rule.value} karakter olmalı`;
                }
                
                if (rule.type === 'match' && value !== formData[rule.field]) {
                    errors[field] = rule.message || 'Eşleşmiyor';
                }
            });
        });
        
        return errors;
    }

    // Form hatalarını göster
    showFormErrors(form, errors) {
        Object.keys(errors).forEach(field => {
            const input = form.querySelector(`[name="${field}"]`);
            if (input) {
                input.classList.add('border-red-500');
                
                const errorDiv = document.createElement('p');
                errorDiv.className = 'text-red-400 text-sm mt-1';
                errorDiv.textContent = errors[field];
                
                input.parentElement.appendChild(errorDiv);
            }
        });
    }

    // Form hatalarını temizle
    clearFormErrors(form) {
        form.querySelectorAll('.border-red-500').forEach(input => {
            input.classList.remove('border-red-500');
        });
        
        form.querySelectorAll('.text-red-400').forEach(error => {
            error.remove();
        });
    }
}

// Global UI manager
const uiManager = new UIManager();

// Export et (Node.js için)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
}
