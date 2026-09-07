// ============================================
// GETTIC - NOTIFICATION MANAGER
// ============================================

class NotificationManager {
    constructor() {
        this.notifications = [];
        this.unreadCount = 0;
        this.permissionGranted = false;
        this.init();
    }

    // Başlangıç
    async init() {
        await this.checkPermission();
        await this.loadNotifications();
        this.subscribeToNotifications();
    }

    // Bildirim izni kontrol
    async checkPermission() {
        if (!('Notification' in window)) {
            console.warn('Bu tarayıcı bildirimleri desteklemiyor');
            return;
        }

        if (Notification.permission === 'granted') {
            this.permissionGranted = true;
        } else if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            this.permissionGranted = permission === 'granted';
        }
    }

    // Bildirimleri yükle
    async loadNotifications() {
        try {
            const user = await authManager.getCurrentUser();
            if (!user) return [];

            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;

            this.notifications = data || [];
            this.unreadCount = this.notifications.filter(n => !n.is_read).length;

            return this.notifications;
        } catch (error) {
            console.error('Bildirimler yüklenemedi:', error);
            return [];
        }
    }

    // Bildirimlere abone ol
    subscribeToNotifications() {
        const user = authManager.currentUser;
        if (!user) return;

        supabase
            .channel('notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`
                },
                (payload) => {
                    const notification = payload.new;
                    this.notifications.unshift(notification);
                    this.unreadCount++;
                    this.showBrowserNotification(notification);
                    
                    if (this.onNewNotification) {
                        this.onNewNotification(notification);
                    }
                }
            )
            .subscribe();
    }

    // Tarayıcı bildirimi göster
    showBrowserNotification(notification) {
        if (!this.permissionGranted) return;

        const title = notification.title || 'Gettic';
        const options = {
            body: notification.content || '',
            icon: notification.icon || 'logo.png',
            badge: 'logo.png',
            tag: notification.id,
            data: {
                url: notification.url || '/chat.html'
            }
        };

        const browserNotification = new Notification(title, options);

        browserNotification.onclick = () => {
            window.focus();
            if (notification.url) {
                window.location.href = notification.url;
            }
            browserNotification.close();
        };
    }

    // Bildirim oluştur
    async createNotification(userId, title, content, type = 'info', url = null, icon = null) {
        try {
            const notificationData = {
                user_id: userId,
                title: title,
                content: content,
                type: type,
                url: url,
                icon: icon,
                is_read: false,
                created_at: new Date()
            };

            const { data, error } = await supabase
                .from('notifications')
                .insert([notificationData])
                .select()
                .single();

            if (error) throw error;

            return { success: true, notification: data };
        } catch (error) {
            console.error('Bildirim oluşturulamadı:', error);
            return { success: false, error: error.message };
        }
    }

    // Bildirimi okundu işaretle
    async markAsRead(notificationId) {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true, read_at: new Date() })
                .eq('id', notificationId);

            if (error) throw error;

            const notification = this.notifications.find(n => n.id === notificationId);
            if (notification && !notification.is_read) {
                notification.is_read = true;
                this.unreadCount--;
            }

            return { success: true };
        } catch (error) {
            console.error('Bildirim okundu işaretlenemedi:', error);
            return { success: false, error: error.message };
        }
    }

    // Tüm bildirimleri okundu işaretle
    async markAllAsRead() {
        try {
            const user = await authManager.getCurrentUser();
            if (!user) return;

            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true, read_at: new Date() })
                .eq('user_id', user.id)
                .eq('is_read', false);

            if (error) throw error;

            this.notifications.forEach(n => n.is_read = true);
            this.unreadCount = 0;

            return { success: true };
        } catch (error) {
            console.error('Bildirimler okundu işaretlenemedi:', error);
            return { success: false, error: error.message };
        }
    }

    // Bildirimi sil
    async deleteNotification(notificationId) {
        try {
            const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('id', notificationId);

            if (error) throw error;

            this.notifications = this.notifications.filter(n => n.id !== notificationId);

            return { success: true };
        } catch (error) {
            console.error('Bildirim silinemedi:', error);
            return { success: false, error: error.message };
        }
    }

    // Tüm bildirimleri temizle
    async clearAllNotifications() {
        try {
            const user = await authManager.getCurrentUser();
            if (!user) return;

            const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('user_id', user.id);

            if (error) throw error;

            this.notifications = [];
            this.unreadCount = 0;

            return { success: true };
        } catch (error) {
            console.error('Bildirimler temizlenemedi:', error);
            return { success: false, error: error.message };
        }
    }

    // Bildirim göster (uygulama içi)
    showInAppNotification(notification) {
        uiManager.showToast(notification.content, notification.type);
    }

    // Bildirim listesini göster
    displayNotifications(container) {
        if (!container) return;

        container.innerHTML = '';

        if (this.notifications.length === 0) {
            container.innerHTML = `
                <div class="text-center text-gray-500 py-8">
                    <p>Bildirim yok</p>
                </div>
            `;
            return;
        }

        this.notifications.forEach(notification => {
            const div = document.createElement('div');
            div.className = `p-4 hover:bg-bg-hover cursor-pointer transition ${notification.is_read ? '' : 'bg-bg-tertiary/50'}`;
            div.onclick = () => {
                this.markAsRead(notification.id);
                if (notification.url) {
                    window.location.href = notification.url;
                }
            };

            const typeIcons = {
                info: `
                    <svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                `,
                success: `
                    <svg class="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                `,
                warning: `
                    <svg class="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                    </svg>
                `,
                error: `
                    <svg class="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                `
            };

            div.innerHTML = `
                <div class="flex gap-3">
                    <div class="flex-shrink-0">
                        ${typeIcons[notification.type] || typeIcons.info}
                    </div>
                    <div class="flex-1">
                        <div class="flex justify-between items-start">
                            <h3 class="font-semibold">${notification.title}</h3>
                            ${!notification.is_read ? '<span class="w-2 h-2 bg-accent rounded-full"></span>' : ''}
                        </div>
                        <p class="text-sm text-gray-400 mt-1">${notification.content}</p>
                        <p class="text-xs text-gray-500 mt-2">${formatTime(notification.created_at)}</p>
                    </div>
                </div>
            `;

            container.appendChild(div);
        });
    }

    // Okunmamış sayısını güncelle
    updateUnreadBadge(element) {
        if (!element) return;

        if (this.unreadCount > 0) {
            element.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
            element.classList.remove('hidden');
        } else {
            element.classList.add('hidden');
        }
    }
}

// Global notification manager
const notificationManager = new NotificationManager();

// Export et (Node.js için)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationManager;
}
