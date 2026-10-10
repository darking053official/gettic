// ============================================
// GETTIC - CONVERSATION MANAGER (Premium)
// ============================================

class ConversationManager {
    constructor() {
        this.conversations = [];
        this.currentConversation = null;
        this.currentUserId = null;
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 dakika
    }

    // Kullanıcı ID'sini ayarla
    setUser(userId) {
        this.currentUserId = userId;
        this.clearCache();
    }

    // ============ SOHBETLERİ YÜKLE ============
    async loadConversations(userId, options = {}) {
        try {
            const uid = userId || this.currentUserId;
            if (!uid) return [];

            const { limit = 50, offset = 0 } = options;

            const { data, error } = await window.CONFIG.supabase
                .from('conversation_members')
                .select(`
                    conversation_id,
                    conversations!inner (
                        id,
                        type,
                        name,
                        avatar_url,
                        created_at,
                        updated_at,
                        created_by,
                        conversation_members (
                            user_id,
                            role,
                            profiles (
                                id,
                                username,
                                full_name,
                                avatar_url,
                                status,
                                last_seen
                            )
                        )
                    )
                `)
                .eq('user_id', uid)
                .order('conversations(updated_at)', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) throw error;

            this.conversations = (data || [])
                .map(item => item.conversations)
                .filter(Boolean);

            // Cache'e ekle
            this.conversations.forEach(conv => {
                this.cache.set(conv.id, {
                    data: conv,
                    timestamp: Date.now()
                });
            });

            return this.conversations;
        } catch (error) {
            console.error('Sohbetler yüklenemedi:', error);
            return [];
        }
    }

    // ============ TEK SOHBET GETİR ============
    async getConversation(conversationId, forceRefresh = false) {
        try {
            // Cache kontrolü
            if (!forceRefresh) {
                const cached = this.cache.get(conversationId);
                if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
                    return cached.data;
                }
            }

            const { data, error } = await window.CONFIG.supabase
                .from('conversations')
                .select(`
                    id,
                    type,
                    name,
                    avatar_url,
                    created_by,
                    created_at,
                    updated_at,
                    conversation_members (
                        user_id,
                        role,
                        joined_at,
                        profiles (
                            id,
                            username,
                            full_name,
                            avatar_url,
                            status,
                            last_seen
                        )
                    )
                `)
                .eq('id', conversationId)
                .single();

            if (error) throw error;

            this.cache.set(conversationId, {
                data,
                timestamp: Date.now()
            });

            return data;
        } catch (error) {
            console.error('Sohbet getirilemedi:', error);
            return null;
        }
    }

    // ============ DİREKT SOHBET OLUŞTUR ============
    async createDirectConversation(userId, otherUserId) {
        try {
            if (!userId) throw new Error('Oturum yok');
            if (userId === otherUserId) throw new Error('Kendinizle sohbet oluşturamazsınız');

            // Mevcut sohbet ara
            const existing = await this.findDirectConversation(userId, otherUserId);
            if (existing) {
                return { success: true, conversation: existing, isNew: false };
            }

            // Yeni sohbet oluştur
            const { data: newConv, error: convError } = await window.CONFIG.supabase
                .from('conversations')
                .insert([{ 
                    type: 'direct',
                    created_by: userId
                }])
                .select()
                .single();

            if (convError) throw convError;

            // Üyeleri ekle
            const { error: memberError } = await window.CONFIG.supabase
                .from('conversation_members')
                .insert([
                    { conversation_id: newConv.id, user_id: userId, role: 'member' },
                    { conversation_id: newConv.id, user_id: otherUserId, role: 'member' }
                ]);

            if (memberError) throw memberError;

            // Cache temizle ve tekrar yükle
            this.cache.delete(newConv.id);
            await this.loadConversations(userId);

            return { success: true, conversation: newConv, isNew: true };
        } catch (error) {
            console.error('Sohbet oluşturulamadı:', error);
            return { success: false, error: error.message };
        }
    }

    // ============ MEVCUT DİREKT SOHBETİ BUL ============
    async findDirectConversation(userId1, userId2) {
        try {
            // 1. Kullanıcı 1'in tüm direkt sohbetlerini al
            const { data: user1Convs, error: err1 } = await window.CONFIG.supabase
                .from('conversation_members')
                .select(`
                    conversation_id,
                    conversations!inner (
                        id,
                        type
                    )
                `)
                .eq('user_id', userId1)
                .eq('conversations.type', 'direct');

            if (err1) throw err1;
            if (!user1Convs || user1Convs.length === 0) return null;

            const convIds = user1Convs.map(c => c.conversation_id);

            // 2. Bu sohbetlerde kullanıcı 2 var mı?
            const { data: commonConv, error: err2 } = await window.CONFIG.supabase
                .from('conversation_members')
                .select('conversation_id')
                .in('conversation_id', convIds)
                .eq('user_id', userId2)
                .limit(1)
                .maybeSingle();

            if (err2) throw err2;
            if (!commonConv) return null;

            return await this.getConversation(commonConv.conversation_id);
        } catch (error) {
            console.error('Sohbet arama hatası:', error);
            return null;
        }
    }

    // ============ GRUP SOHBETİ OLUŞTUR ============
    async createGroupConversation(userId, name, memberIds, avatarUrl = null) {
        try {
            if (!userId) throw new Error('Oturum yok');
            if (!name || name.trim().length < 3) {
                throw new Error('Grup adı en az 3 karakter olmalı');
            }
            if (!memberIds || memberIds.length < 1) {
                throw new Error('En az bir üye seçilmeli');
            }

            const allMembers = [...new Set([userId, ...memberIds])];
            const trimmedName = name.trim();

            const { data: newConv, error: convError } = await window.CONFIG.supabase
                .from('conversations')
                .insert([{ 
                    type: 'group', 
                    name: trimmedName,
                    avatar_url: avatarUrl,
                    created_by: userId
                }])
                .select()
                .single();

            if (convError) throw convError;

            const members = allMembers.map(id => ({
                conversation_id: newConv.id,
                user_id: id,
                role: id === userId ? 'admin' : 'member'
            }));

            const { error: memberError } = await window.CONFIG.supabase
                .from('conversation_members')
                .insert(members);

            if (memberError) throw memberError;

            await this.loadConversations(userId);

            return { success: true, conversation: newConv };
        } catch (error) {
            console.error('Grup oluşturulamadı:', error);
            return { success: false, error: error.message };
        }
    }

    // ============ GRUP BİLGİLERİNİ GÜNCELLE ============
    async updateGroupInfo(conversationId, userId, updates) {
        try {
            // Yetki kontrolü
            const member = await this.getMember(conversationId, userId);
            if (!member || member.role !== 'admin') {
                throw new Error('Bu işlem için admin yetkisi gerekli');
            }

            const allowedUpdates = {};
            if (updates.name) allowedUpdates.name = updates.name.trim();
            if (updates.avatar_url) allowedUpdates.avatar_url = updates.avatar_url;
            allowedUpdates.updated_at = new Date().toISOString();

            const { data, error } = await window.CONFIG.supabase
                .from('conversations')
                .update(allowedUpdates)
                .eq('id', conversationId)
                .eq('type', 'group')
                .select()
                .single();

            if (error) throw error;

            this.cache.set(conversationId, {
                data: { ...this.cache.get(conversationId)?.data, ...data },
                timestamp: Date.now()
            });

            return { success: true, conversation: data };
        } catch (error) {
            console.error('Grup güncellenemedi:', error);
            return { success: false, error: error.message };
        }
    }

    // ============ ÜYE GETİR ============
    async getMember(conversationId, userId) {
        try {
            const { data, error } = await window.CONFIG.supabase
                .from('conversation_members')
                .select('user_id, role')
                .eq('conversation_id', conversationId)
                .eq('user_id', userId)
                .maybeSingle();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Üye getirilemedi:', error);
            return null;
        }
    }

    // ============ GRUBA ÜYE EKLE ============
    async addGroupMember(conversationId, adminId, newUserId) {
        try {
            // Yetki kontrolü
            const admin = await this.getMember(conversationId, adminId);
            if (!admin || admin.role !== 'admin') {
                throw new Error('Bu işlem için admin yetkisi gerekli');
            }

            // Zaten üye mi?
            const existing = await this.getMember(conversationId, newUserId);
            if (existing) {
                throw new Error('Bu kullanıcı zaten grup üyesi');
            }

            const { error } = await window.CONFIG.supabase
                .from('conversation_members')
                .insert([{
                    conversation_id: conversationId,
                    user_id: newUserId,
                    role: 'member'
                }]);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Üye eklenemedi:', error);
            return { success: false, error: error.message };
        }
    }

    // ============ GRUPTAN ÜYE ÇIKAR ============
    async removeGroupMember(conversationId, adminId, targetUserId) {
        try {
            // Yetki kontrolü
            const admin = await this.getMember(conversationId, adminId);
            if (!admin || admin.role !== 'admin') {
                throw new Error('Bu işlem için admin yetkisi gerekli');
            }

            // Kendini çıkarma
            if (adminId === targetUserId) {
                return await this.leaveConversation(conversationId, adminId);
            }

            const { error } = await window.CONFIG.supabase
                .from('conversation_members')
                .delete()
                .eq('conversation_id', conversationId)
                .eq('user_id', targetUserId);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Üye çıkarılamadı:', error);
            return { success: false, error: error.message };
        }
    }

    // ============ ÜYE ROLÜNÜ DEĞİŞTİR ============
    async updateMemberRole(conversationId, adminId, targetUserId, newRole) {
        try {
            if (!['admin', 'moderator', 'member'].includes(newRole)) {
                throw new Error('Geçersiz rol');
            }

            // Yetki kontrolü
            const admin = await this.getMember(conversationId, adminId);
            if (!admin || admin.role !== 'admin') {
                throw new Error('Bu işlem için admin yetkisi gerekli');
            }

            const { error } = await window.CONFIG.supabase
                .from('conversation_members')
                .update({ role: newRole })
                .eq('conversation_id', conversationId)
                .eq('user_id', targetUserId);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Rol güncellenemedi:', error);
            return { success: false, error: error.message };
        }
    }

    // ============ SOHBETTEN AYRIL ============
    async leaveConversation(conversationId, userId) {
        try {
            if (!userId) throw new Error('Oturum yok');

            const { error } = await window.CONFIG.supabase
                .from('conversation_members')
                .delete()
                .eq('conversation_id', conversationId)
                .eq('user_id', userId);

            if (error) throw error;

            this.cache.delete(conversationId);
            this.conversations = this.conversations.filter(c => c.id !== conversationId);
            return { success: true };
        } catch (error) {
            console.error('Sohbetten ayrılınamadı:', error);
            return { success: false, error: error.message };
        }
    }

    // ============ SOHBETİ SİL ============
    async deleteConversation(conversationId, userId) {
        try {
            // Yetki: sadece grup admini veya sohbet sahibi
            const member = await this.getMember(conversationId, userId);
            if (!member) throw new Error('Bu sohbete erişiminiz yok');

            const { data: conv } = await window.CONFIG.supabase
                .from('conversations')
                .select('type, created_by')
                .eq('id', conversationId)
                .single();

            const canDelete = conv?.type === 'direct' || 
                              member.role === 'admin' || 
                              conv?.created_by === userId;

            if (!canDelete) throw new Error('Bu işlem için yetkiniz yok');

            const { error } = await window.CONFIG.supabase
                .from('conversations')
                .delete()
                .eq('id', conversationId);

            if (error) throw error;

            this.cache.delete(conversationId);
            this.conversations = this.conversations.filter(c => c.id !== conversationId);
            return { success: true };
        } catch (error) {
            console.error('Sohbet silinemedi:', error);
            return { success: false, error: error.message };
        }
    }

    // ============ SOHBET ÜYELERİNİ GETİR ============
    async getConversationMembers(conversationId) {
        try {
            const { data, error } = await window.CONFIG.supabase
                .from('conversation_members')
                .select(`
                    user_id,
                    role,
                    joined_at,
                    profiles (
                        id,
                        username,
                        full_name,
                        avatar_url,
                        status,
                        last_seen
                    )
                `)
                .eq('conversation_id', conversationId);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Üyeler getirilemedi:', error);
            return [];
        }
    }

    // ============ DİĞER ÜYEYİ GETİR ============
    getOtherMember(conversation, currentUserId = null) {
        if (!conversation || conversation.type !== 'direct') return null;
        
        const uid = currentUserId || this.currentUserId;
        if (!uid) return null;

        const members = conversation.conversation_members || [];
        return members.find(m => m.user_id !== uid);
    }

    // ============ SOHBET BAŞLIĞI ============
    getConversationTitle(conversation, currentUserId = null) {
        if (!conversation) return 'Sohbet';
        
        if (conversation.type === 'group') {
            return conversation.name || 'Grup';
        }
        
        const other = this.getOtherMember(conversation, currentUserId);
        return other?.profiles?.username || 
               other?.profiles?.full_name || 
               'Sohbet';
    }

    // ============ SOHBET AVATARI ============
    getConversationAvatar(conversation, currentUserId = null) {
        if (!conversation) return null;
        
        if (conversation.type === 'group') {
            return conversation.avatar_url || null;
        }
        
        const other = this.getOtherMember(conversation, currentUserId);
        return other?.profiles?.avatar_url || null;
    }

    // ============ SON MESAJ ============
    async getLastMessage(conversationId) {
        try {
            const { data, error } = await window.CONFIG.supabase
                .from('messages')
                .select(`
                    id,
                    content,
                    type,
                    created_at,
                    sender_id,
                    is_deleted,
                    sender:profiles (id, username)
                `)
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Son mesaj alınamadı:', error);
            return null;
        }
    }

    // ============ OKUNMAMIŞ SAYI ============
    async getUnreadCount(conversationId, userId) {
        try {
            const uid = userId || this.currentUserId;
            if (!uid) return 0;

            // Okunmuş mesaj ID'lerini al
            const { data: reads } = await window.CONFIG.supabase
                .from('message_reads')
                .select('message_id')
                .eq('user_id', uid)
                .eq('conversation_id', conversationId);

            const readIds = (reads || []).map(r => r.message_id);

            let query = window.CONFIG.supabase
                .from('messages')
                .select('id', { count: 'exact', head: true })
                .eq('conversation_id', conversationId)
                .neq('sender_id', uid)
                .eq('is_deleted', false);

            if (readIds.length > 0) {
                query = query.not('id', 'in', `(${readIds.join(',')})`);
            }

            const { count, error } = await query;
            if (error) throw error;

            return count || 0;
        } catch (error) {
            console.error('Okunmamış sayı alınamadı:', error);
            return 0;
        }
    }

    // ============ TIMESTAMP GÜNCELLE ============
    async updateConversationTimestamp(conversationId) {
        try {
            const { error } = await window.CONFIG.supabase
                .from('conversations')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', conversationId);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Zaman damgası güncellenemedi:', error);
            return { success: false, error: error.message };
        }
    }

    // ============ SOHBET ARA ============
    async searchConversations(userId, searchTerm) {
        try {
            const all = await this.loadConversations(userId);
            const term = searchTerm.toLowerCase().trim();
            
            if (!term) return all;

            return all.filter(conv => {
                const title = this.getConversationTitle(conv, userId).toLowerCase();
                return title.includes(term);
            });
        } catch (error) {
            console.error('Sohbet arama hatası:', error);
            return [];
        }
    }

    // ============ CACHE ============
    clearCache() {
        this.cache.clear();
        this.conversations = [];
        this.currentConversation = null;
    }

    reset() {
        this.clearCache();
        this.currentUserId = null;
    }
}

// Global
const conversationManager = new ConversationManager();
