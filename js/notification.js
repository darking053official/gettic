// ============================================
// GETTIC - NOTIFICATION MANAGER (Premium)
// ============================================

class NotificationManager {
    constructor() {
        this.notifications = [];
        this.unreadCount = 0;
        this.permissionGranted = false;
        this.currentUserId = null;
        this.subscription = null;
        this.onNewNotification = null;
        this.onUnreadChange = null;
        this._initialized = false;
    }

    // ============ INIT ============
    async init(userId) {
        if (this._initialized && this.currentUserId === userId) return;

        this.currentUserId = userId;
        this._initialized = true;

        await this.checkPermission();
        await this.loadNotifications(userId);
        this.subscribeToNotifications(userId);
    }

    // ============ İZİN ============
    async checkPermission() {
        if (!('Notification' in window)) {
            console.warn('Tarayıcı bildirimleri desteklemiyor');
            return false;
        }

        if (Notification.permission === 'granted') {
            this.permissionGranted = true;
        } else if (Notification.permission !== 'denied') {
            try {
                const permission = await Notification.requestPermission();
                this.permissionGranted = permission === 'granted';
            } catch (e) {
                this.permissionGranted = false;
            }
        }
        return this.permissionGranted;
    }

    // ============ BİLDİRİMLERİ YÜKLE ============
    async loadNotifications(userId = null) {
        try {
            const uid = userId || this.currentUserId;
            if (!uid) return [];

            const { data, error } = await window.CONFIG.supabase
                .from('notifications')
                .select('*')
                .eq('user_id', uid)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;

            this.notifications = data || [];
            this.unreadCount = this.notifications.filter(n => !n.is_read).length;

            if (this.onUnreadChange) this.onUnreadChange(this.unreadCount);

            return this.notifications;
        } catch (error) {
            console.error('Bildirimler yüklenemedi:', error);
            return [];
        }
    }

    // ============ ABONE OL ============
    subscribeToNotifications(userId = null) {
        const uid = userId || this.currentUserId;
        if (!uid) return;

        // Önceki aboneliği kapat
        if (this.subscription) {
            this.subscription.unsubscribe();
        }

        this.subscription = window.CONFIG.supabase
            .channel(`notifications-${uid}-${Date.now()}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${uid}`
                },
                (payload) => {
                    const notification = payload.new;

                    // Kullanıcı tercihlerini kontrol et
                    if (!this._shouldShowNotification(notification)) return;

                    this.notifications.unshift(notification);
                    this.unreadCount++;

                    if (this.onUnreadChange) this.onUnreadChange(this.unreadCount);
                    if (this.onNewNotification) this.onNewNotification(notification);

                    this.showBrowserNotification(notification);
                }
            )
            .subscribe();
    }

    _shouldShowNotification(notification) {
        try {
            const settings = JSON.parse(localStorage.getItem('gettic_settings') || '{}');
            if (settings.desktopNotifications === false) return false;
            if (notification.type === 'error' && settings.showErrors === false) return false;
            return true;
        } catch {
            return true;
        }
    }

    // ============ TARAYICI BİLDİRİMİ ============
    showBrowserNotification(notification) {
        if (!this.permissionGranted) return;

        const settings = JSON.parse(localStorage.getItem('gettic_settings') || '{}');
        if (settings.desktopNotifications === false) return;

        const title = notification.title || 'Gettic';
        const options = {
            body: settings.messagePreview === false ? 'Yeni bildirim' : (notification.content || ''),
            icon: notification.icon || 'logo.png',
            badge: 'logo.png',
            tag: `gettic-${notification.id}-${Date.now()}`,
            renotify: false,
            silent: settings.soundNotifications === false,
            data: { url: notification.url || '/chat.html' }
        };

        try {
            const bn = new Notification(title, options);

            bn.onclick = () => {
                window.focus();
                bn.close();
                if (notification.url) {
                    window.location.href = notification.url;
                }
            };

            // Otomatik kapat (5 saniye)
            setTimeout(() => bn.close(), 5000);
        } catch (e) {
            console.warn('Bildirim gösterilemedi:', e);
        }
    }

    // ============ BİLDİRİM OLUŞTUR ============
    async createNotification(userId, title, content, type = 'info', url = null, icon = null) {
        try {
            if (!userId) throw new Error('userId gerekli');

            const { data, error } = await window.CONFIG.supabase
                .from('notifications')
                .insert([{
                    user_id: userId,
                    title: title,
                    content: content,
                    type: type,
                    url: url,
                    icon: icon,
                    is_read: false
                }])
                .select()
                .single();

            if (error) throw error;
            return { success: true, notification: data };
        } catch (error) {
            console.error('Bildirim oluşturulamadı:', error);
            return { success: false, error: error.message };
        }
    }

    // ============ OKUNDU İŞARETLE ============
    async markAsRead(notificationId, userId = null) {
        try {
            const uid = userId || this.currentUserId;
            if (!uid) return { success: false };

            const { error } = await window.CONFIG.supabase
                .from('notifications')
                .update({
                    is_read: true,
                    read_at: new Date().toISOString()
                })
                .eq('id', notificationId)
                .eq('user_id', uid);

            if (error) throw error;

            const n = this.notifications.find(x => x.id === notificationId);
            if (n && !n.is_read) {
                n.is_read = true;
                this.unreadCount = Math.max(0, this.unreadCount - 1);
                if (this.onUnreadChange) this.onUnreadChange(this.unreadCount);
            }

            return { success: true };
        } catch (error) {
            console.error('Okundu işaretlenemedi:', error);
            return { success: false, error: error.message };
        }
    }

    // ============ TÜMÜNÜ OKUNDU İŞARETLE ============
    async markAllAsRead(userId = null) {
        try {
            const uid = userId || this.currentUserId;
            if (!uid) return { success: false };

            const { error } = await window.CONFIG.supabase
                .from('notifications')
                .update({
                    is_read: true,
                    read_at: new Date().toISOString()
                })
                .eq('user_id', uid)
                .eq('is_read', false);

            if (error) throw error;

            this.notifications.forEach(n => n.is_read = true);
            this.unreadCount = 0;
            if (this.onUnreadChange) this.onUnreadChange(0);

            return { success: true };
        } catch (error) {
            console.error('Tümü okundu işaretlenemedi:', error);
            return { success: false, error: error.message };
        }
    }

    // ============ BİLDİRİM SİL ============
    async deleteNotification(notificationId, userId = null) {
        try {
            const uid = userId || this.currentUserId;
            if (!uid) return { success: false };

            const { error } = await window.CONFIG.supabase
                .from('notifications')
                .delete()
                .eq('id', notificationId)
                .eq('user_id', uid);

            if (error) throw error;

            const n = this.notifications.find(x => x.id === notificationId);
            if (n && !n.is_read) {
                this.unreadCount = Math.max(0, this.unreadCount - 1);
                if (this.onUnreadChange) this.onUnreadChange(this.unreadCount);
            }

            this.notifications = this.notifications.filter(x => x.id !== notificationId);
            return { success: true };
        } catch (error) {
            console.error('Bildirim silinemedi:', error);
            return { success: false, error: error.message };
        }
    }

    // ============ TÜMÜNÜ SİL ============
    async clearAllNotifications(userId = null) {
        try {
            const uid = userId || this.currentUserId;
            if (!uid) return { success: false };

            const { error } = await window.CONFIG.supabase
                .from('notifications')
                .delete()
                .eq('user_id', uid);

            if (error) throw error;

            this.notifications = [];
            this.unreadCount = 0;
            if (this.onUnreadChange) this.onUnreadChange(0);

            return { success: true };
        } catch (error) {
            console.error('Bildirimler temizlenemedi:', error);
            return { success: false, error: error.message };
        }
    }

    // ============ UI ============
    displayNotifications(container) {
        if (!container) return;
        container.innerHTML = '';

        if (this.notifications.length === 0) {
            container.innerHTML = `
                <div class="text-center text-gray-500 py-8">
                    <svg class="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                    </svg>
                    <p>Bildirim yok</p>
                </div>
            `;
            return;
        }

        const typeIcons = {
            info: '<svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
            success: '<svg class="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
            warning: '<svg class="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg>',
            error: '<svg class="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
        };

        this.notifications.forEach(n => {
            const div = document.createElement('div');
            div.className = `p-4 hover:bg-bg-hover cursor-pointer transition border-b border-border-dark ${n.is_read ? '' : 'bg-accent/5'}`;
            div.onclick = async () => {
                await this.markAsRead(n.id);
                if (n.url) window.location.href = n.url;
                else this.displayNotifications(container);
            };

            const timeAgo = window.formatTime ? window.formatTime(n.created_at) : new Date(n.created_at).toLocaleString('tr-TR');

            div.innerHTML = `
                <div class="flex gap-3">
                    <div class="flex-shrink-0">${typeIcons[n.type] || typeIcons.info}</div>
                    <div class="flex-1 min-w-0">
                        <div class="flex justify-between items-start gap-2">
                            <h3 class="font-semibold truncate">${this._escape(n.title)}</h3>
                            ${!n.is_read ? '<span class="w-2 h-2 bg-accent rounded-full flex-shrink-0 mt-2"></span>' : ''}
                        </div>
                        <p class="text-sm text-gray-400 mt-1 line-clamp-2">${this._escape(n.content)}</p>
                        <p class="text-xs text-gray-500 mt-2">${timeAgo}</p>
                    </div>
                </div>
            `;

            container.appendChild(div);
        });
    }

    _escape(str) {
        if (!str) return '';
        return String(str).replace(/[<>&"']/g, c => ({
            '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    // ============ BADGE ============
    updateUnreadBadge(element) {
        if (!element) return;
        if (this.unreadCount > 0) {
            element.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
            element.classList.remove('hidden');
        } else {
            element.classList.add('hidden');
        }
    }

    // ============ TEMİZLİK ============
    cleanup() {
        if (this.subscription) {
            this.subscription.unsubscribe();
            this.subscription = null;
        }
        this.notifications = [];
        this.unreadCount = 0;
        this._initialized = false;
        this.currentUserId = null;
    }
}

// Global
const notificationManager = new NotificationManager();
