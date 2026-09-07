-- ============================================
-- GETTIC - SUPABASE MIGRATIONS
-- ============================================

-- Tabloları oluştur
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

create table if not exists public.conversations (
    id uuid default gen_random_uuid() primary key,
    type text not null check (type in ('direct', 'group')),
    name text,
    avatar_url text,
    created_by uuid references public.profiles(id),
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

create table if not exists public.conversation_members (
    conversation_id uuid references public.conversations on delete cascade,
    user_id uuid references public.profiles on delete cascade,
    role text default 'member' check (role in ('admin', 'member', 'moderator')),
    joined_at timestamp with time zone default now(),
    primary key (conversation_id, user_id)
);

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

create table if not exists public.message_reads (
    message_id uuid references public.messages on delete cascade,
    conversation_id uuid references public.conversations on delete cascade,
    user_id uuid references public.profiles on delete cascade,
    read_at timestamp with time zone default now(),
    primary key (message_id, user_id)
);

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

-- İndeksler
create index if not exists idx_profiles_username on public.profiles(username);
create index if not exists idx_profiles_status on public.profiles(status);
create index if not exists idx_conversation_members_user on public.conversation_members(user_id);
create index if not exists idx_conversation_members_conversation on public.conversation_members(conversation_id);
create index if not exists idx_messages_conversation on public.messages(conversation_id);
create index if not exists idx_messages_sender on public.messages(sender_id);
create index if not exists idx_messages_created_at on public.messages(created_at desc);
create index if not exists idx_message_reads_user on public.message_reads(user_id);
create index if not exists idx_notifications_user on public.notifications(user_id);
create index if not exists idx_notifications_read on public.notifications(is_read);

-- updated_at otomatik güncelleme
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

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

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Profiller
alter table public.profiles enable row level security;

create policy "Profiller herkes tarafından görülebilir"
    on public.profiles for select
    using (true);

create policy "Kullanıcılar kendi profilini güncelleyebilir"
    on public.profiles for update
    using (auth.uid() = id);

-- Sohbetler
alter table public.conversations enable row level security;

create policy "Sohbetler üyeler tarafından görülebilir"
    on public.conversations for select
    using (
        exists (
            select 1 from public.conversation_members
            where conversation_id = id
            and user_id = auth.uid()
        )
    );

create policy "Sohbetler üyeler tarafından oluşturulabilir"
    on public.conversations for insert
    with check (auth.uid() = created_by or created_by is null);

create policy "Sohbetler admin tarafından güncellenebilir"
    on public.conversations for update
    using (
        exists (
            select 1 from public.conversation_members
            where conversation_id = id
            and user_id = auth.uid()
            and role = 'admin'
        )
    );

-- Sohbet üyeleri
alter table public.conversation_members enable row level security;

create policy "Üyeler sohbet üyelerini görebilir"
    on public.conversation_members for select
    using (
        exists (
            select 1 from public.conversation_members cm
            where cm.conversation_id = conversation_id
            and cm.user_id = auth.uid()
        )
    );

create policy "Üyeler sohbete katılabilir"
    on public.conversation_members for insert
    with check (
        user_id = auth.uid()
        or
        exists (
            select 1 from public.conversation_members cm
            where cm.conversation_id = conversation_id
            and cm.user_id = auth.uid()
            and cm.role = 'admin'
        )
    );

create policy "Admin üyeleri çıkarabilir"
    on public.conversation_members for delete
    using (
        exists (
            select 1 from public.conversation_members cm
            where cm.conversation_id = conversation_id
            and cm.user_id = auth.uid()
            and cm.role = 'admin'
        )
        or user_id = auth.uid()
    );

-- Mesajlar
alter table public.messages enable row level security;

create policy "Mesajlar sohbet üyeleri tarafından görülebilir"
    on public.messages for select
    using (
        exists (
            select 1 from public.conversation_members
            where conversation_id = messages.conversation_id
            and user_id = auth.uid()
        )
    );

create policy "Mesajlar sohbet üyeleri tarafından gönderilebilir"
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

create policy "Kullanıcılar kendi mesajlarını güncelleyebilir"
    on public.messages for update
    using (sender_id = auth.uid());

create policy "Kullanıcılar kendi mesajlarını silebilir"
    on public.messages for delete
    using (sender_id = auth.uid());

-- Mesaj okundu
alter table public.message_reads enable row level security;

create policy "Okundu bilgisi sohbet üyeleri tarafından görülebilir"
    on public.message_reads for select
    using (
        exists (
            select 1 from public.conversation_members
            where conversation_id = message_reads.conversation_id
            and user_id = auth.uid()
        )
    );

create policy "Kullanıcılar okundu işaretleyebilir"
    on public.message_reads for insert
    with check (user_id = auth.uid());

-- Bildirimler
alter table public.notifications enable row level security;

create policy "Bildirimler sahibi tarafından görülebilir"
    on public.notifications for select
    using (user_id = auth.uid());

create policy "Bildirimler sahibi tarafından yönetilebilir"
    on public.notifications for all
    using (user_id = auth.uid());

-- ============================================
-- REALTIME
-- ============================================

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.message_reads;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.profiles;

-- ============================================
-- STORAGE BUCKETS
-- ============================================

insert into storage.buckets (id, name, public)
values 
    ('avatars', 'avatars', true),
    ('chat-media', 'chat-media', true),
    ('files', 'files', true)
on conflict (id) do nothing;

-- Storage politikaları
create policy "Avatarlar herkes tarafından görülebilir"
    on storage.objects for select
    using (bucket_id = 'avatars');

create policy "Kullanıcılar avatar yükleyebilir"
    on storage.objects for insert
    with check (
        bucket_id = 'avatars'
        and auth.uid()::text = (storage.foldername(name))[1]
    );

create policy "Kullanıcılar avatarını güncelleyebilir"
    on storage.objects for update
    using (
        bucket_id = 'avatars'
        and auth.uid()::text = (storage.foldername(name))[1]
    );

create policy "Kullanıcılar avatarını silebilir"
    on storage.objects for delete
    using (
        bucket_id = 'avatars'
        and auth.uid()::text = (storage.foldername(name))[1]
    );

create policy "Sohbet medyası üyeler tarafından görülebilir"
    on storage.objects for select
    using (bucket_id = 'chat-media');

create policy "Sohbet medyası üyeler tarafından yüklenebilir"
    on storage.objects for insert
    with check (
        bucket_id = 'chat-media'
        and auth.uid() is not null
    );

create policy "Dosyalar üyeler tarafından görülebilir"
    on storage.objects for select
    using (bucket_id = 'files');

create policy "Dosyalar üyeler tarafından yüklenebilir"
    on storage.objects for insert
    with check (
        bucket_id = 'files'
        and auth.uid() is not null
    );
