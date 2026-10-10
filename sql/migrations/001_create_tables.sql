-- ============================================
-- GETTIC - SQL/MIGRATIONS/001_CREATE_TABLES.SQL
-- Ana tabloların oluşturulması (Premium)
-- ============================================

-- pgcrypto (UUID ve şifreleme için)
create extension if not exists pgcrypto;

-- ============================================
-- TABLOLAR
-- ============================================

-- Profiller
create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    username text unique not null check (length(username) between 3 and 20),
    full_name text,
    avatar_url text,
    status text not null default 'offline' check (status in ('online', 'offline', 'away', 'busy')),
    last_seen timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Sohbetler
create table if not exists public.conversations (
    id uuid primary key default gen_random_uuid(),
    type text not null check (type in ('direct', 'group')),
    name text check (name is null or length(name) between 1 and 100),
    avatar_url text,
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Sohbet üyeleri
create table if not exists public.conversation_members (
    conversation_id uuid not null references public.conversations(id) on delete cascade,
    user_id uuid not null references public.profiles(id) on delete cascade,
    role text not null default 'member' check (role in ('admin', 'moderator', 'member')),
    joined_at timestamptz not null default now(),
    primary key (conversation_id, user_id)
);

-- Mesajlar
create table if not exists public.messages (
    id uuid primary key default gen_random_uuid(),
    conversation_id uuid not null references public.conversations(id) on delete cascade,
    sender_id uuid not null references public.profiles(id) on delete cascade,
    content text,
    type text not null default 'text' check (type in ('text', 'image', 'video', 'voice', 'file')),
    media_url text,
    reply_to uuid references public.messages(id) on delete set null,
    is_edited boolean not null default false,
    is_deleted boolean not null default false,
    edited_at timestamptz,
    deleted_at timestamptz,
    created_at timestamptz not null default now(),
    constraint content_or_media check (content is not null or media_url is not null or is_deleted = true)
);

-- Mesaj okundu
create table if not exists public.message_reads (
    message_id uuid not null references public.messages(id) on delete cascade,
    user_id uuid not null references public.profiles(id) on delete cascade,
    conversation_id uuid not null references public.conversations(id) on delete cascade,
    read_at timestamptz not null default now(),
    primary key (message_id, user_id)
);

-- Bildirimler
create table if not exists public.notifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    title text not null,
    content text,
    type text not null default 'info' check (type in ('info', 'success', 'warning', 'error')),
    url text,
    icon text,
    is_read boolean not null default false,
    read_at timestamptz,
    created_at timestamptz not null default now()
);

-- Engellenen kullanıcılar
create table if not exists public.blocked_users (
    user_id uuid not null references public.profiles(id) on delete cascade,
    blocked_user_id uuid not null references public.profiles(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (user_id, blocked_user_id),
    constraint no_self_block check (user_id != blocked_user_id)
);

-- ============================================
-- İNDEKSLER
-- ============================================

-- Profiles
create index if not exists idx_profiles_username on public.profiles(username);
create index if not exists idx_profiles_status on public.profiles(status);
create index if not exists idx_profiles_last_seen on public.profiles(last_seen desc nulls last);

-- Conversation members
create index if not exists idx_conv_members_user on public.conversation_members(user_id);
create index if not exists idx_conv_members_conv on public.conversation_members(conversation_id);

-- Conversations
create index if not exists idx_conversations_updated_at on public.conversations(updated_at desc);
create index if not exists idx_conversations_type on public.conversations(type);
create index if not exists idx_conversations_created_by on public.conversations(created_by);

-- Messages
create index if not exists idx_messages_conversation on public.messages(conversation_id, created_at desc);
create index if not exists idx_messages_sender on public.messages(sender_id);
create index if not exists idx_messages_created_at on public.messages(created_at desc);
create index if not exists idx_messages_reply_to on public.messages(reply_to) where reply_to is not null;
create index if not exists idx_messages_not_deleted on public.messages(conversation_id, created_at desc) where is_deleted = false;

-- Full-text search (mesaj içeriği için)
create index if not exists idx_messages_content_search on public.messages using gin(to_tsvector('simple', coalesce(content, '')));

-- Message reads
create index if not exists idx_message_reads_user on public.message_reads(user_id);
create index if not exists idx_message_reads_conversation on public.message_reads(conversation_id);

-- Notifications
create index if not exists idx_notifications_user on public.notifications(user_id, created_at desc);
create index if not exists idx_notifications_unread on public.notifications(user_id) where is_read = false;

-- Blocked users
create index if not exists idx_blocked_users_user on public.blocked_users(user_id);
create index if not exists idx_blocked_users_blocked on public.blocked_users(blocked_user_id);

-- ============================================
-- FONKSİYONLAR
-- ============================================

-- updated_at otomatik güncelleme
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

-- ============================================
-- TRIGGERLAR
-- ============================================

-- Profiles updated_at
drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
    before update on public.profiles
    for each row
    execute function public.handle_updated_at();

-- Conversations updated_at
drop trigger if exists set_conversations_updated_at on public.conversations;
create trigger set_conversations_updated_at
    before update on public.conversations
    for each row
    execute function public.handle_updated_at();

-- ============================================
-- YENİ KULLANICI → OTOMATİK PROFİL
-- ============================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    base_username text;
    final_username text;
    counter int := 0;
begin
    -- Kullanıcı adı belirle
    base_username := coalesce(
        nullif(trim(new.raw_user_meta_data->>'username'), ''),
        nullif(trim(new.raw_user_meta_data->>'preferred_username'), ''),
        'user_' || substr(new.id::text, 1, 8)
    );

    -- Uzunluk kontrolü
    if length(base_username) < 3 then
        base_username := 'user_' || base_username;
    end if;
    if length(base_username) > 20 then
        base_username := substr(base_username, 1, 20);
    end if;

    -- Benzersiz kullanıcı adı bul
    final_username := base_username;
    while exists (select 1 from public.profiles where username = final_username) loop
        counter := counter + 1;
        final_username := substr(base_username, 1, 15) || '_' || counter::text;
        if counter > 100 then
            final_username := 'user_' || substr(new.id::text, 1, 12);
            exit;
        end if;
    end loop;

    -- Profil oluştur
    insert into public.profiles (id, username, full_name, avatar_url, status)
    values (
        new.id,
        final_username,
        coalesce(
            nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
            nullif(trim(new.raw_user_meta_data->>'name'), ''),
            final_username
        ),
        nullif(trim(new.raw_user_meta_data->>'avatar_url'), ''),
        'online'
    )
    on conflict (id) do update set
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
        status = 'online',
        updated_at = now();

    return new;
end;
$$;

-- Trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row
    execute function public.handle_new_user();

-- ============================================
-- KULLANICI SİLME TEMİZLİĞİ
-- ============================================

-- Kullanıcı silindiğinde son görülmeyi güncelle
create or replace function public.handle_user_delete()
returns trigger
language plpgsql
security definer
as $$
begin
    -- Opsiyonel: Log, analytics vs.
    return old;
end;
$$;

-- ============================================
-- YARDIMCI FONKSİYONLAR
-- ============================================

-- Kullanıcı çevrimiçi mi?
create or replace function public.is_user_online(user_uuid uuid)
returns boolean
language plpgsql
security definer
as $$
declare
    user_status text;
begin
    select status into user_status
    from public.profiles
    where id = user_uuid;
    
    return user_status = 'online';
end;
$$;

-- Sohbet üyesi mi?
create or replace function public.is_conversation_member(conv_id uuid, user_uuid uuid)
returns boolean
language plpgsql
security definer
as $$
begin
    return exists (
        select 1 from public.conversation_members
        where conversation_id = conv_id
        and user_id = user_uuid
    );
end;
$$;

-- Sohbet admini mi?
create or replace function public.is_conversation_admin(conv_id uuid, user_uuid uuid)
returns boolean
language plpgsql
security definer
as $$
begin
    return exists (
        select 1 from public.conversation_members
        where conversation_id = conv_id
        and user_id = user_uuid
        and role = 'admin'
    );
end;
$$;

-- ============================================
-- SON
-- ============================================
