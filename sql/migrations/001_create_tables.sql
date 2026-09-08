-- ============================================
-- GETTIC - SUPABASE/MIGRATIONS/001_CREATE_TABLES.SQL
-- Ana tabloların oluşturulması
-- ============================================

-- Profiller tablosu
create table if not exists public.profiles (
    id uuid references auth.users on delete cascade primary key,
    username text unique not null,
    full_name text,
    avatar_url text,
    status text default 'offline' check (status in ('online', 'offline', 'away', 'busy')),
    last_seen timestamp with time zone,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Sohbetler tablosu
create table if not exists public.conversations (
    id uuid default gen_random_uuid() primary key,
    type text not null check (type in ('direct', 'group')),
    name text,
    avatar_url text,
    created_by uuid references public.profiles(id),
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Sohbet üyeleri tablosu
create table if not exists public.conversation_members (
    conversation_id uuid references public.conversations on delete cascade,
    user_id uuid references public.profiles on delete cascade,
    role text default 'member' check (role in ('admin', 'member', 'moderator')),
    joined_at timestamp with time zone default now(),
    primary key (conversation_id, user_id)
);

-- Mesajlar tablosu
create table if not exists public.messages (
    id uuid default gen_random_uuid() primary key,
    conversation_id uuid references public.conversations on delete cascade,
    sender_id uuid references public.profiles on delete cascade,
    content text,
    type text default 'text' check (type in ('text', 'image', 'video', 'voice', 'file')),
    media_url text,
    reply_to uuid references public.messages on delete set null,
    is_edited boolean default false,
    is_deleted boolean default false,
    edited_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone default now()
);

-- Mesaj okundu tablosu
create table if not exists public.message_reads (
    message_id uuid references public.messages on delete cascade,
    conversation_id uuid references public.conversations on delete cascade,
    user_id uuid references public.profiles on delete cascade,
    read_at timestamp with time zone default now(),
    primary key (message_id, user_id)
);

-- Bildirimler tablosu
create table if not exists public.notifications (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles on delete cascade,
    title text not null,
    content text,
    type text default 'info' check (type in ('info', 'success', 'warning', 'error')),
    url text,
    icon text,
    is_read boolean default false,
    read_at timestamp with time zone,
    created_at timestamp with time zone default now()
);

-- Engellenen kullanıcılar tablosu
create table if not exists public.blocked_users (
    user_id uuid references public.profiles on delete cascade,
    blocked_user_id uuid references public.profiles on delete cascade,
    created_at timestamp with time zone default now(),
    primary key (user_id, blocked_user_id)
);

-- İndeksler
create index if not exists idx_profiles_username on public.profiles(username);
create index if not exists idx_profiles_status on public.profiles(status);
create index if not exists idx_conversation_members_user on public.conversation_members(user_id);
create index if not exists idx_conversation_members_conversation on public.conversation_members(conversation_id);
create index if not exists idx_messages_conversation on public.messages(conversation_id);
create index if not exists idx_messages_sender on public.messages(sender_id);
create index if not exists idx_messages_created_at on public.messages(created_at desc);
create index if not exists idx_message_reads_user on public.message_reads(user_id);
create index if not exists idx_message_reads_conversation on public.message_reads(conversation_id);
create index if not exists idx_notifications_user on public.notifications(user_id);
create index if not exists idx_notifications_read on public.notifications(is_read);
create index if not exists idx_blocked_users_user on public.blocked_users(user_id);

-- updated_at otomatik güncelleme fonksiyonu
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- updated_at triggerları
create trigger set_updated_at
    before update on public.profiles
    for each row
    execute function public.handle_updated_at();

create trigger set_updated_at
    before update on public.conversations
    for each row
    execute function public.handle_updated_at();

-- Yeni kullanıcı otomatik profil oluşturma
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, username, full_name)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
        coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'username', 'Kullanıcı')
    );
    return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();
