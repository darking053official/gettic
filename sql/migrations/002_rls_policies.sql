-- ============================================
-- GETTIC - SUPABASE/MIGRATIONS/002_RLS_POLICIES.SQL
-- Row Level Security politikaları
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
-- PROFILES POLİTİKALARI
-- ============================================

-- Herkes profilleri görebilir
create policy "Profiller herkese açık"
    on public.profiles for select
    using (true);

-- Kullanıcılar kendi profilini güncelleyebilir
create policy "Kullanıcılar kendi profilini güncelleyebilir"
    on public.profiles for update
    using (auth.uid() = id)
    with check (auth.uid() = id);

-- Kullanıcılar kendi profilini silebilir
create policy "Kullanıcılar kendi profilini silebilir"
    on public.profiles for delete
    using (auth.uid() = id);

-- ============================================
-- CONVERSATIONS POLİTİKALARI
-- ============================================

-- Sohbet üyeleri sohbeti görebilir
create policy "Sohbet üyeleri sohbeti görebilir"
    on public.conversations for select
    using (
        exists (
            select 1 from public.conversation_members
            where conversation_id = id
            and user_id = auth.uid()
        )
    );

-- Kullanıcılar sohbet oluşturabilir
create policy "Kullanıcılar sohbet oluşturabilir"
    on public.conversations for insert
    with check (auth.uid() = created_by or created_by is null);

-- Sohbet adminleri sohbeti güncelleyebilir
create policy "Sohbet adminleri sohbeti güncelleyebilir"
    on public.conversations for update
    using (
        exists (
            select 1 from public.conversation_members
            where conversation_id = id
            and user_id = auth.uid()
            and role = 'admin'
        )
    );

-- ============================================
-- CONVERSATION_MEMBERS POLİTİKALARI
-- ============================================

-- Sohbet üyeleri diğer üyeleri görebilir
create policy "Üyeler diğer üyeleri görebilir"
    on public.conversation_members for select
    using (
        exists (
            select 1 from public.conversation_members cm
            where cm.conversation_id = conversation_id
            and cm.user_id = auth.uid()
        )
    );

-- Kullanıcılar sohbete katılabilir
create policy "Kullanıcılar sohbete katılabilir"
    on public.conversation_members for insert
    with check (
        user_id = auth.uid()
        or
        exists (
            select 1 from public.conversation_members
            where conversation_id = conversation_id
            and user_id = auth.uid()
            and role = 'admin'
        )
    );

-- Admin üyeleri çıkarabilir
create policy "Admin üyeleri çıkarabilir"
    on public.conversation_members for delete
    using (
        exists (
            select 1 from public.conversation_members
            where conversation_id = conversation_id
            and user_id = auth.uid()
            and role = 'admin'
        )
        or user_id = auth.uid()
    );

-- ============================================
-- MESSAGES POLİTİKALARI
-- ============================================

-- Sohbet üyeleri mesajları görebilir
create policy "Sohbet üyeleri mesajları görebilir"
    on public.messages for select
    using (
        exists (
            select 1 from public.conversation_members
            where conversation_id = messages.conversation_id
            and user_id = auth.uid()
        )
    );

-- Sohbet üyeleri mesaj gönderebilir
create policy "Sohbet üyeleri mesaj gönderebilir"
    on public.messages for insert
    with check (
        sender_id = auth.uid()
        and
        exists (
            select 1 from public.conversation_members
            where conversation_id = messages.conversation_id
            and user_id = auth.uid()
        )
    );

-- Kullanıcılar kendi mesajlarını güncelleyebilir
create policy "Kullanıcılar kendi mesajlarını güncelleyebilir"
    on public.messages for update
    using (sender_id = auth.uid())
    with check (sender_id = auth.uid());

-- Kullanıcılar kendi mesajlarını silebilir
create policy "Kullanıcılar kendi mesajlarını silebilir"
    on public.messages for delete
    using (sender_id = auth.uid());

-- ============================================
-- MESSAGE_READS POLİTİKALARI
-- ============================================

-- Sohbet üyeleri okundu bilgilerini görebilir
create policy "Sohbet üyeleri okundu bilgilerini görebilir"
    on public.message_reads for select
    using (
        exists (
            select 1 from public.conversation_members
            where conversation_id = message_reads.conversation_id
            and user_id = auth.uid()
        )
    );

-- Kullanıcılar okundu işaretleyebilir
create policy "Kullanıcılar okundu işaretleyebilir"
    on public.message_reads for insert
    with check (user_id = auth.uid());

-- ============================================
-- NOTIFICATIONS POLİTİKALARI
-- ============================================

-- Kullanıcılar kendi bildirimlerini görebilir
create policy "Kullanıcılar kendi bildirimlerini görebilir"
    on public.notifications for select
    using (user_id = auth.uid());

-- Kullanıcılar bildirimlerini yönetebilir
create policy "Kullanıcılar bildirimlerini yönetebilir"
    on public.notifications for all
    using (user_id = auth.uid());

-- ============================================
-- BLOCKED_USERS POLİTİKALARI
-- ============================================

-- Kullanıcılar engelledikleri kişileri görebilir
create policy "Kullanıcılar engelledikleri kişileri görebilir"
    on public.blocked_users for select
    using (user_id = auth.uid());

-- Kullanıcılar engelleyebilir
create policy "Kullanıcılar engelleyebilir"
    on public.blocked_users for insert
    with check (user_id = auth.uid());

-- Kullanıcılar engeli kaldırabilir
create policy "Kullanıcılar engeli kaldırabilir"
    on public.blocked_users for delete
    using (user_id = auth.uid());
