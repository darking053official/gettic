-- ============================================
-- GETTIC - SQL/MIGRATIONS/003_REALTIME_SETUP.SQL
-- Realtime + Trigger + Storage (Premium)
-- ============================================

-- ============================================
-- REALTIME PUBLICATION (Idempotent)
-- ============================================

do $$
declare
    tbl text;
    tables text[] := array['messages', 'conversations', 'conversation_members', 'message_reads', 'notifications', 'profiles'];
begin
    foreach tbl in array tables loop
        -- Tablo zaten publication'da mı?
        if not exists (
            select 1 from pg_publication_tables
            where pubname = 'supabase_realtime'
            and schemaname = 'public'
            and tablename = tbl
        ) then
            execute format('alter publication supabase_realtime add table public.%I', tbl);
        end if;
    end loop;
end $$;

-- ============================================
-- MESAJ TRIGGERLARI
-- ============================================

-- updated_at güncelle + okundu ekle
create or replace function public.handle_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    -- Sohbetin updated_at'ini güncelle
    update public.conversations
    set updated_at = now()
    where id = new.conversation_id;

    -- Gönderen için otomatik okundu kaydı
    insert into public.message_reads (message_id, conversation_id, user_id)
    values (new.id, new.conversation_id, new.sender_id)
    on conflict (message_id, user_id) do nothing;

    return new;
end;
$$;

drop trigger if exists on_message_created on public.messages;
create trigger on_message_created
    after insert on public.messages
    for each row execute function public.handle_new_message();

-- Not: message_reads ON DELETE CASCADE olduğu için
-- handle_message_delete trigger'ına GEREK YOK

-- ============================================
-- BİLDİRİM TRIGGERI (Toplu insert)
-- ============================================

create or replace function public.create_message_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    conv_type text;
    conv_name text;
    sender_name text;
    notif_title text;
    notif_content text;
begin
    -- Silinmiş / boş mesaj için bildirim gönderme
    if new.is_deleted = true then
        return new;
    end if;
    if new.content is null and new.media_url is null then
        return new;
    end if;

    -- Sohbet ve gönderen bilgisi
    select type, name into conv_type, conv_name
    from public.conversations
    where id = new.conversation_id;

    select coalesce(username, full_name, 'Kullanıcı')
    into sender_name
    from public.profiles
    where id = new.sender_id;

    -- Başlık
    notif_title := case
        when conv_type = 'group' then coalesce(conv_name, 'Grup')
        else coalesce(sender_name, 'Kullanıcı')
    end;

    -- İçerik (kısaltılmış)
    notif_content := case
        when new.type = 'text' then
            case when length(new.content) > 100
                then substring(new.content, 1, 100) || '...'
                else new.content
            end
        when new.type = 'image' then 'Görsel gönderdi'
        when new.type = 'video' then 'Video gönderdi'
        when new.type = 'voice' then 'Sesli mesaj gönderdi'
        when new.type = 'file' then 'Dosya gönderdi'
        else 'Yeni mesaj'
    end;

    -- Toplu bildirim ekle (engellenen kullanıcılar hariç)
    insert into public.notifications (user_id, title, content, type, url)
    select
        cm.user_id,
        notif_title,
        notif_content,
        'info',
        '/chat.html?conversation=' || new.conversation_id
    from public.conversation_members cm
    where cm.conversation_id = new.conversation_id
      and cm.user_id != new.sender_id
      -- Gönderen tarafından engellenmiş kullanıcılara gönderme
      and not exists (
          select 1 from public.blocked_users bu
          where bu.user_id = cm.user_id
            and bu.blocked_user_id = new.sender_id
      )
      -- Gönderenin engellediği kişilere gönderme
      and not exists (
          select 1 from public.blocked_users bu
          where bu.user_id = new.sender_id
            and bu.blocked_user_id = cm.user_id
      );

    return new;
end;
$$;

drop trigger if exists on_message_notification on public.messages;
create trigger on_message_notification
    after insert on public.messages
    for each row execute function public.create_message_notifications();

-- ============================================
-- KULLANICI DURUMU (RLS-compatible)
-- ============================================

-- Not: security invoker + kendi profilini güncelleme RLS izniyle çalışır
create or replace function public.set_user_online()
returns void
language plpgsql
security invoker
as $$
begin
    update public.profiles
    set status = 'online',
        updated_at = now()
    where id = auth.uid();
end;
$$;

create or replace function public.set_user_offline()
returns void
language plpgsql
security invoker
as $$
begin
    update public.profiles
    set status = 'offline',
        last_seen = now(),
        updated_at = now()
    where id = auth.uid();
end;
$$;

-- ============================================
-- STORAGE BUCKETS
-- ============================================

insert into storage.buckets (id, name, public)
values
    ('avatars', 'avatars', true),
    ('chat-media', 'chat-media', false),
    ('files', 'files', false)
on conflict (id) do update set
    public = excluded.public;

-- ============================================
-- STORAGE POLİTİKALARI
-- ============================================

-- Eski politikaları temizle
drop policy if exists "Avatarlar herkese açık" on storage.objects;
drop policy if exists "Kullanıcılar avatar yükleyebilir" on storage.objects;
drop policy if exists "Sohbet medyası üyelere açık" on storage.objects;
drop policy if exists "Sohbet medyası yüklenebilir" on storage.objects;
drop policy if exists "Dosyalar üyelere açık" on storage.objects;
drop policy if exists "Dosyalar yüklenebilir" on storage.objects;

-- Avatars: herkes okur, sahibi yazar
create policy "avatars_select_all"
    on storage.objects for select
    using (bucket_id = 'avatars');

create policy "avatars_insert_own"
    on storage.objects for insert
    with check (
        bucket_id = 'avatars'
        and auth.uid()::text = (storage.foldername(name))[1]
    );

create policy "avatars_update_own"
    on storage.objects for update
    using (
        bucket_id = 'avatars'
        and auth.uid()::text = (storage.foldername(name))[1]
    );

create policy "avatars_delete_own"
    on storage.objects for delete
    using (
        bucket_id = 'avatars'
        and auth.uid()::text = (storage.foldername(name))[1]
    );

-- Chat media: sadece sohbet üyeleri okur/yazar
create policy "chat_media_select_member"
    on storage.objects for select
    using (
        bucket_id = 'chat-media'
        and exists (
            select 1 from public.conversation_members cm
            where cm.conversation_id::text = (storage.foldername(name))[1]
            and cm.user_id = auth.uid()
        )
    );

create policy "chat_media_insert_member"
    on storage.objects for insert
    with check (
        bucket_id = 'chat-media'
        and auth.uid() is not null
        and exists (
            select 1 from public.conversation_members cm
            where cm.conversation_id::text = (storage.foldername(name))[1]
            and cm.user_id = auth.uid()
        )
    );

create policy "chat_media_delete_own"
    on storage.objects for delete
    using (
        bucket_id = 'chat-media'
        and owner = auth.uid()
    );

-- Files: sadece sohbet üyeleri
create policy "files_select_member"
    on storage.objects for select
    using (
        bucket_id = 'files'
        and exists (
            select 1 from public.conversation_members cm
            where cm.conversation_id::text = (storage.foldername(name))[1]
            and cm.user_id = auth.uid()
        )
    );

create policy "files_insert_member"
    on storage.objects for insert
    with check (
        bucket_id = 'files'
        and auth.uid() is not null
        and exists (
            select 1 from public.conversation_members cm
            where cm.conversation_id::text = (storage.foldername(name))[1]
            and cm.user_id = auth.uid()
        )
    );

create policy "files_delete_own"
    on storage.objects for delete
    using (
        bucket_id = 'files'
        and owner = auth.uid()
    );

-- ============================================
-- TEMİZLİK FONKSİYONLARI
-- ============================================

-- Eski bildirimleri temizle (30 günden eski okunmuş)
create or replace function public.cleanup_old_notifications()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    delete from public.notifications
    where is_read = true
    and created_at < now() - interval '30 days';
end;
$$;

-- Uzun süredir offline kullanıcıları güncelle
create or replace function public.mark_stale_users_offline()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    update public.profiles
    set status = 'offline',
        last_seen = coalesce(last_seen, now()),
        updated_at = now()
    where status = 'online'
    and updated_at < now() - interval '1 hour';
end;
$$;

-- ============================================
-- ANALİZ / İSTATİSTİK FONKSİYONU
-- ============================================

-- Sohbet detaylarını özet olarak getir
create or replace function public.get_conversation_summary(conv_id uuid)
returns table (
    id uuid,
    type text,
    name text,
    avatar_url text,
    member_count bigint,
    last_message_at timestamptz,
    last_message_preview text
)
language plpgsql
security definer
set search_path = public
as $$
begin
    return query
    select
        c.id,
        c.type,
        c.name,
        c.avatar_url,
        (select count(*) from public.conversation_members where conversation_id = c.id),
        (select max(created_at) from public.messages where conversation_id = c.id and is_deleted = false),
        (select substring(content, 1, 50)
         from public.messages
         where conversation_id = c.id and is_deleted = false
         order by created_at desc limit 1)
    from public.conversations c
    where c.id = conv_id
      and exists (
          select 1 from public.conversation_members
          where conversation_id = c.id and user_id = auth.uid()
      );
end;
$$;

-- ============================================
-- SON
-- ============================================
