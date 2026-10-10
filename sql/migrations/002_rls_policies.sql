-- ============================================
-- GETTIC - SQL/MIGRATIONS/002_RLS_POLICIES.SQL
-- Row Level Security politikaları (Premium)
-- ============================================

-- ============================================
-- RLS ETKİNLEŞTİRME
-- ============================================

alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.message_reads enable row level security;
alter table public.notifications enable row level security;
alter table public.blocked_users enable row level security;

-- ============================================
-- ESKİ POLİTİKALARI TEMİZLE
-- ============================================

drop policy if exists "Profiller herkese açık" on public.profiles;
drop policy if exists "Kullanıcılar kendi profilini güncelleyebilir" on public.profiles;
drop policy if exists "Kullanıcılar kendi profilini silebilir" on public.profiles;

drop policy if exists "Sohbet üyeleri sohbeti görebilir" on public.conversations;
drop policy if exists "Kullanıcılar sohbet oluşturabilir" on public.conversations;
drop policy if exists "Sohbet adminleri sohbeti güncelleyebilir" on public.conversations;

drop policy if exists "Üyeler diğer üyeleri görebilir" on public.conversation_members;
drop policy if exists "Kullanıcılar sohbete katılabilir" on public.conversation_members;
drop policy if exists "Admin üyeleri çıkarabilir" on public.conversation_members;

drop policy if exists "Sohbet üyeleri mesajları görebilir" on public.messages;
drop policy if exists "Sohbet üyeleri mesaj gönderebilir" on public.messages;
drop policy if exists "Kullanıcılar kendi mesajlarını güncelleyebilir" on public.messages;
drop policy if exists "Kullanıcılar kendi mesajlarını silebilir" on public.messages;

drop policy if exists "Sohbet üyeleri okundu bilgilerini görebilir" on public.message_reads;
drop policy if exists "Kullanıcılar okundu işaretleyebilir" on public.message_reads;

drop policy if exists "Kullanıcılar kendi bildirimlerini görebilir" on public.notifications;
drop policy if exists "Kullanıcılar bildirimlerini yönetebilir" on public.notifications;

drop policy if exists "Kullanıcılar engelledikleri kişileri görebilir" on public.blocked_users;
drop policy if exists "Kullanıcılar engelleyebilir" on public.blocked_users;
drop policy if exists "Kullanıcılar engeli kaldırabilir" on public.blocked_users;

-- ============================================
-- PROFILES
-- ============================================

-- Herkes görebilir
create policy "profiles_select_all"
    on public.profiles for select
    using (true);

-- Sadece kendi profilini güncelleyebilir
create policy "profiles_update_own"
    on public.profiles for update
    using (auth.uid() = id)
    with check (auth.uid() = id);

-- Sadece kendi profilini silebilir
create policy "profiles_delete_own"
    on public.profiles for delete
    using (auth.uid() = id);

-- Not: Insert yok → sadece trigger ekler

-- ============================================
-- CONVERSATIONS
-- ============================================

-- Üyeler sohbeti görebilir
create policy "conversations_select_member"
    on public.conversations for select
    using (
        exists (
            select 1 from public.conversation_members
            where conversation_id = conversations.id
            and user_id = auth.uid()
        )
    );

-- Giriş yapmış herkes sohbet oluşturabilir (created_by kendisi olmalı)
create policy "conversations_insert_self"
    on public.conversations for insert
    with check (auth.uid() = created_by);

-- Admin veya oluşturan güncelleyebilir
create policy "conversations_update_admin"
    on public.conversations for update
    using (
        exists (
            select 1 from public.conversation_members
            where conversation_id = conversations.id
            and user_id = auth.uid()
            and role = 'admin'
        )
    )
    with check (
        exists (
            select 1 from public.conversation_members
            where conversation_id = conversations.id
            and user_id = auth.uid()
            and role = 'admin'
        )
    );

-- Sadece admin silebilir (veya direkt sohbette herkes)
create policy "conversations_delete_admin"
    on public.conversations for delete
    using (
        type = 'direct' and exists (
            select 1 from public.conversation_members
            where conversation_id = conversations.id
            and user_id = auth.uid()
        )
        or
        exists (
            select 1 from public.conversation_members
            where conversation_id = conversations.id
            and user_id = auth.uid()
            and role = 'admin'
        )
    );

-- ============================================
-- CONVERSATION_MEMBERS
-- ============================================

-- Üyeler, diğer üyeleri görebilir
create policy "members_select_same_conversation"
    on public.conversation_members for select
    using (
        exists (
            select 1 from public.conversation_members cm
            where cm.conversation_id = conversation_members.conversation_id
            and cm.user_id = auth.uid()
        )
    );

-- Kendini ekleyebilir VEYA sohbet admini başkasını ekleyebilir
create policy "members_insert_self_or_admin"
    on public.conversation_members for insert
    with check (
        user_id = auth.uid()
        or
        exists (
            select 1 from public.conversation_members cm
            where cm.conversation_id = conversation_members.conversation_id
            and cm.user_id = auth.uid()
            and cm.role = 'admin'
        )
    );

-- Admin rol değiştirebilir (kendi rolünü düşüremez)
create policy "members_update_admin"
    on public.conversation_members for update
    using (
        exists (
            select 1 from public.conversation_members cm
            where cm.conversation_id = conversation_members.conversation_id
            and cm.user_id = auth.uid()
            and cm.role = 'admin'
        )
    )
    with check (
        exists (
            select 1 from public.conversation_members cm
            where cm.conversation_id = conversation_members.conversation_id
            and cm.user_id = auth.uid()
            and cm.role = 'admin'
        )
    );

-- Kendini çıkarabilir VEYA admin başkasını çıkarabilir
create policy "members_delete_self_or_admin"
    on public.conversation_members for delete
    using (
        user_id = auth.uid()
        or
        exists (
            select 1 from public.conversation_members cm
            where cm.conversation_id = conversation_members.conversation_id
            and cm.user_id = auth.uid()
            and cm.role = 'admin'
        )
    );

-- ============================================
-- MESSAGES
-- ============================================

-- Sohbet üyeleri silinmemiş mesajları görebilir
create policy "messages_select_member"
    on public.messages for select
    using (
        exists (
            select 1 from public.conversation_members
            where conversation_id = messages.conversation_id
            and user_id = auth.uid()
        )
    );

-- Sohbet üyeleri mesaj gönderebilir (sender = kendisi)
create policy "messages_insert_member"
    on public.messages for insert
    with check (
        sender_id = auth.uid()
        and exists (
            select 1 from public.conversation_members
            where conversation_id = messages.conversation_id
            and user_id = auth.uid()
        )
    );

-- Sadece kendi mesajlarını güncelleyebilir
create policy "messages_update_own"
    on public.messages for update
    using (sender_id = auth.uid())
    with check (sender_id = auth.uid());

-- Sadece kendi mesajlarını silebilir
create policy "messages_delete_own"
    on public.messages for delete
    using (sender_id = auth.uid());

-- ============================================
-- MESSAGE_READS
-- ============================================

-- Sohbet üyeleri okundu bilgilerini görebilir
create policy "message_reads_select_member"
    on public.message_reads for select
    using (
        exists (
            select 1 from public.conversation_members
            where conversation_id = message_reads.conversation_id
            and user_id = auth.uid()
        )
    );

-- Kullanıcı kendi adına okundu işaretleyebilir
create policy "message_reads_insert_self"
    on public.message_reads for insert
    with check (user_id = auth.uid());

-- Kendi okundu kaydını silebilir (isteğe bağlı)
create policy "message_reads_delete_self"
    on public.message_reads for delete
    using (user_id = auth.uid());

-- ============================================
-- NOTIFICATIONS
-- ============================================

-- Kullanıcı kendi bildirimlerini görebilir
create policy "notifications_select_own"
    on public.notifications for select
    using (user_id = auth.uid());

-- Kullanıcı kendi adına bildirim ekleyebilir
-- (Uygulama tarafı önemli; DB seviyesinde ise sadece kendi user_id)
create policy "notifications_insert_self"
    on public.notifications for insert
    with check (user_id = auth.uid());

-- Kullanıcı kendi bildirimlerini güncelleyebilir
create policy "notifications_update_own"
    on public.notifications for update
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

-- Kullanıcı kendi bildirimlerini silebilir
create policy "notifications_delete_own"
    on public.notifications for delete
    using (user_id = auth.uid());

-- ============================================
-- BLOCKED_USERS
-- ============================================

-- Kullanıcı sadece kendi engellediği kişileri görebilir
-- (Karşı taraf engellendiğini göremez)
create policy "blocked_users_select_own"
    on public.blocked_users for select
    using (user_id = auth.uid());

-- Kullanıcı sadece kendisi adına engelleyebilir
create policy "blocked_users_insert_self"
    on public.blocked_users for insert
    with check (user_id = auth.uid());

-- Kullanıcı sadece kendi engelini kaldırabilir
create policy "blocked_users_delete_self"
    on public.blocked_users for delete
    using (user_id = auth.uid());

-- ============================================
-- SON
-- ============================================
