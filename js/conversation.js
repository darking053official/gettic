// ============================================
// GETTIC - CONVERSATION MANAGER
// ============================================

class ConversationManager {
    constructor() {
        this.conversations = [];
        this.currentConversation = null;
        this.conversationCache = {};
    }

    // Tüm sohbetleri yükle
    async loadConversations() {
        try {
            const user = await authManager.getCurrentUser();
            if (!user) return [];

            const { data, error } = await supabase
                .from('conversation_members')
                .select(`
                    conversation_id,
                    role,
                    joined_at,
                    conversations (
                        id,
                        type,
                        name,
                        avatar_url,
                        created_at,
                        updated_at,
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
                .eq('user_id', user.id)
                .order('updated_at', { ascending: false });

            if (error) throw error;

            this.conversations = (data || []).map(item => item.conversations);
            
            // Cache'e ekle
            this.conversations.forEach(conv => {
                this.conversationCache[conv.id] = conv;
            });

            return this.conversations;
        } catch (error) {
            console.error('Sohbetler yüklenemedi:', error);
            return [];
        }
    }

    // Tek sohbet getir
    async getConversation(conversationId) {
        try {
            // Cache'de var mı kontrol et
            if (this.conversationCache[conversationId]) {
                return this.conversationCache[conversationId];
            }

            const { data, error } = await supabase
                .from('conversations')
                .select(`
                    *,
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
                `)
                .eq('id', conversationId)
                .single();

            if (error) throw error;

            this.conversationCache[conversationId] = data;
            return data;
        } catch (error) {
            console.error('Sohbet getirilemedi:', error);
            return null;
        }
    }

    // Direkt sohbet oluştur
    async createDirectConversation(otherUserId) {
        try {
            const user = await authManager.getCurrentUser();
            if (!user) throw new Error('Oturum yok');

            // Mevcut sohbet ara
            const existingConversation = await this.findDirectConversation(user.id, otherUserId);
            if (existingConversation) {
                return { success: true, conversation: existingConversation, isNew: false };
            }

            // Yeni sohbet oluştur
            const { data: newConv, error: convError } = await supabase
                .from('conversations')
                .insert([{ 
                    type: 'direct',
                    created_at: new Date(),
                    updated_at: new Date()
                }])
                .select()
                .single();

            if (convError) throw convError;

            // Üyeleri ekle
            const { error: memberError } = await supabase
                .from('conversation_members')
                .insert([
                    { 
                        conversation_id: newConv.id, 
                        user_id: user.id, 
                        role: 'member',
                        joined_at: new Date()
                    },
                    { 
                        conversation_id: newConv.id, 
                        user_id: otherUserId, 
                        role: 'member',
                        joined_at: new Date()
                    }
                ]);

            if (memberError) throw memberError;

            await this.loadConversations();

            return { success: true, conversation: newConv, isNew: true };
        } catch (error) {
            console.error('Sohbet oluşturulamadı:', error);
            return { success: false, error: error.message };
        }
    }

    // Mevcut direkt sohbeti bul
    async findDirectConversation(userId1, userId2) {
        try {
            const { data, error } = await supabase
                .from('conversation_members')
                .select(`
                    conversation_id,
                    conversations (
                        id,
                        type,
                        conversation_members (
                            user_id
                        )
                    )
                `)
                .eq('user_id', userId1)
                .eq('conversations.type', 'direct');

            if (error) throw error;

            for (const item of data || []) {
                const memberIds = item.conversations.conversation_members.map(m => m.user_id);
                if (memberIds.includes(userId2)) {
                    return await this.getConversation(item.conversation_id);
                }
            }

            return null;
        } catch (error) {
            console.error('Sohbet arama hatası:', error);
            return null;
        }
    }

    // Grup sohbeti oluştur
    async createGroupConversation(name, memberIds, avatarUrl = null) {
        try {
            const user = await authManager.getCurrentUser();
            if (!user) throw new Error('Oturum yok');

            if (!name || name.trim().length < 3) {
                throw new Error('Grup adı en az 3 karakter olmalı');
            }

            if (!memberIds || memberIds.length < 1) {
                throw new Error('En az bir üye seçilmeli');
            }

            const allMembers = [user.id, ...memberIds];

            const { data: newConv, error: convError } = await supabase
                .from('conversations')
                .insert([{ 
                    type: 'group', 
                    name: name.trim(),
                    avatar_url: avatarUrl,
                    created_at: new Date(),
                    updated_at: new Date()
                }])
                .select()
                .single();

            if (convError) throw convError;

            const members = allMembers.map(memberId => ({
                conversation_id: newConv.id,
                user_id: memberId,
                role: memberId === user.id ? 'admin' : 'member',
                joined_at: new Date()
            }));

            const { error: memberError } = await supabase
                .from('conversation_members')
                .insert(members);

            if (memberError) throw memberError;

            await this.loadConversations();

            return { success: true, conversation: newConv };
        } catch (error) {
            console.error('Grup oluşturulamadı:', error);
            return { success: false, error: error.message };
        }
    }

    // Grup bilgilerini güncelle
    async updateGroupInfo(conversationId, updates) {
        try {
            const { data, error } = await supabase
                .from('conversations')
                .update(updates)
                .eq('id', conversationId)
                .eq('type', 'group')
                .select()
                .single();

            if (error) throw error;

            this.conversationCache[conversationId] = data;
            return { success: true, conversation: data };
        } catch (error) {
            console.error('Grup güncellenemedi:', error);
            return { success: false, error: error.message };
        }
    }

    // Gruba üye ekle
    async addGroupMember(conversationId, userId) {
        try {
            const { error } = await supabase
                .from('conversation_members')
                .insert([{
                    conversation_id: conversationId,
                    user_id: userId,
                    role: 'member',
                    joined_at: new Date()
                }]);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Üye eklenemedi:', error);
            return { success: false, error: error.message };
        }
    }

    // Gruptan üye çıkar
    async removeGroupMember(conversationId, userId) {
        try {
            const { error } = await supabase
                .from('conversation_members')
                .delete()
                .eq('conversation_id', conversationId)
                .eq('user_id', userId);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Üye çıkarılamadı:', error);
            return { success: false, error: error.message };
        }
    }

    // Grup üyesinin rolünü değiştir
    async updateMemberRole(conversationId, userId, newRole) {
        try {
            const { error } = await supabase
                .from('conversation_members')
                .update({ role: newRole })
                .eq('conversation_id', conversationId)
                .eq('user_id', userId);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Rol güncellenemedi:', error);
            return { success: false, error: error.message };
        }
    }

    // Sohbetten ayrıl
    async leaveConversation(conversationId) {
        try {
            const user = await authManager.getCurrentUser();
            if (!user) throw new Error('Oturum yok');

            const { error } = await supabase
                .from('conversation_members')
                .delete()
                .eq('conversation_id', conversationId)
                .eq('user_id', user.id);

            if (error) throw error;

            delete this.conversationCache[conversationId];
            return { success: true };
        } catch (error) {
            console.error('Sohbetten ayrılınamadı:', error);
            return { success: false, error: error.message };
        }
    }

    // Sohbeti sil
    async deleteConversation(conversationId) {
        try {
            const { error } = await supabase
                .from('conversations')
                .delete()
                .eq('id', conversationId);

            if (error) throw error;

            delete this.conversationCache[conversationId];
            return { success: true };
        } catch (error) {
            console.error('Sohbet silinemedi:', error);
            return { success: false, error: error.message };
        }
    }

    // Sohbet üyelerini getir
    async getConversationMembers(conversationId) {
        try {
            const { data, error } = await supabase
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

    // Diğer üyeyi getir (direkt sohbet için)
    getOtherMember(conversation) {
        if (!conversation || conversation.type !== 'direct') return null;
        
        const currentUserId = authManager.currentUser?.id;
        const members = conversation.conversation_members || [];
        
        return members.find(member => member.user_id !== currentUserId);
    }

    // Sohbet başlığını getir
    getConversationTitle(conversation) {
        if (!conversation) return '';
        
        if (conversation.type === 'group') {
            return conversation.name || 'Grup';
        }
        
        const otherMember = this.getOtherMember(conversation);
        return otherMember?.profiles?.username || otherMember?.profiles?.full_name || 'Sohbet';
    }

    // Sohbet avatarını getir
    getConversationAvatar(conversation) {
        if (!conversation) return null;
        
        if (conversation.type === 'group') {
            return conversation.avatar_url || null;
        }
        
        const otherMember = this.getOtherMember(conversation);
        return otherMember?.profiles?.avatar_url || null;
    }

    // Son mesajı getir
    async getLastMessage(conversationId) {
        return await messageManager.getLastMessage(conversationId);
    }

    // Okunmamış mesaj sayısı
    async getUnreadCount(conversationId) {
        return await messageManager.getUnreadCount(conversationId);
    }

    // Sohbeti güncelle (updated_at)
    async updateConversationTimestamp(conversationId) {
        try {
            const { error } = await supabase
                .from('conversations')
                .update({ updated_at: new Date() })
                .eq('id', conversationId);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Zaman damgası güncellenemedi:', error);
            return { success: false, error: error.message };
        }
    }

    // Cache temizle
    clearCache() {
        this.conversationCache = {};
        this.conversations = [];
        this.currentConversation = null;
    }
}

// Global conversation manager
const conversationManager = new ConversationManager();

// Export et (Node.js için)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConversationManager;
}
