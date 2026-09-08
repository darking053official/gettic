-- ============================================
-- GETTIC - SUPABASE/MIGRATIONS/003_REALTIME_SETUP.SQL
-- Realtime yapılandırması
-- ============================================

-- Realtime yayınını etkinleştir
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.conversation_members;
alter publication supabase_realtime add table public.message_reads;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.profiles;

-- ============================================
-- TRIGGER FONKSİYONLARI
-- ============================================

-- Mesaj gönderildiğinde sohbet updated_at güncelle
create or replace function public.handle_new_message()
returns trigger as $$
begin
    update public.conversations
    set updated_at = now()
    where id = new.conversation_id;
    
    -- Okundu bilgisini otomatik ekle (kendi mesajı için)
    insert into public.message_reads (message_id, conversation_id, user_id)
    values (new.id, new.conversation_id, new.sender_id)
    on conflict (message_id, user_id) do nothing;
    
    return new;
end;
$$ language plpgsql security definer;

create trigger on_message_created
    after insert on public.messages
    for each row execute function public.handle_new_message();

-- Mesaj silindiğinde okundu bilgilerini temizle
create or replace function public.handle_message_delete()
returns trigger as $$
begin
    delete from public.message_reads
    where message_id = old.id;
    
    return old;
end;
$$ language plpgsql security definer;

create trigger on_message_deleted
    after delete on public.messages
    for each row execute function public.handle_message_delete();

-- Yeni mesaj bildirimi oluştur
create or replace function public.create_message_notification()
returns trigger as $$
declare
    conversation_record record;
    member_record record;
    sender_username text;
begin
    -- Sohbet bilgilerini al
    select * into conversation_record
    from public.conversations
    where id = new.conversation_id;
    
    -- Gönderen kullanıcı adını al
    select username into sender_username
    from public.profiles
    where id = new.sender_id;
    
    -- Sohbet üyelerine bildirim gönder
    for member_record in
        select user_id
        from public.conversation_members
        where conversation_id = new.conversation_id
        and user_id != new.sender_id
    loop
        insert into public.notifications (user_id, title, content, type, url)
        values (
            member_record.user_id,
            case 
                when conversation_record.type = 'group' then conversation_record.name
                else sender_username
            end,
            case 
                when new.type = 'text' then new.content
                when new.type = 'image' then 'Görsel gönderdi'
                when new.type = 'video' then 'Video gönderdi'
                when new.type = 'voice' then 'Sesli mesaj gönderdi'
                else 'Dosya gönderdi'
            end,
            'info',
            '/chat.html?conversation=' || new.conversation_id
        );
    end loop;
    
    return new;
end;
$$ language plpgsql security definer;

create trigger on_message_notification
    after insert on public.messages
    for each row execute function public.create_message_notification();

-- ============================================
-- KULLANICI DURUMU FONKSİYONLARI
-- ============================================

-- Kullanıcı çevrimiçi olduğunda
create or replace function public.set_user_online()
returns void as $$
begin
    update public.profiles
    set 
        status = 'online',
        updated_at = now()
    where id = auth.uid();
end;
$$ language plpgsql security definer;

-- Kullanıcı çevrimdışı olduğunda
create or replace function public.set_user_offline()
returns void as $$
begin
    update public.profiles
    set 
        status = 'offline',
        last_seen = now(),
        updated_at = now()
    where id = auth.uid();
end;
$$ language plpgsql security definer;

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
create policy "Avatarlar herkese açık"
    on storage.objects for select
    using (bucket_id = 'avatars');

create policy "Kullanıcılar avatar yükleyebilir"
    on storage.objects for insert
    with check (
        bucket_id = 'avatars'
        and auth.uid()::text = (storage.foldername(name))[1]
    );

create policy "Sohbet medyası üyelere açık"
    on storage.objects for select
    using (bucket_id = 'chat-media');

create policy "Sohbet medyası yüklenebilir"
    on storage.objects for insert
    with check (
        bucket_id = 'chat-media'
        and auth.uid() is not null
    );

create policy "Dosyalar üyelere açık"
    on storage.objects for select
    using (bucket_id = 'files');

create policy "Dosyalar yüklenebilir"
    on storage.objects for insert
    with check (
        bucket_id = 'files'
        and auth.uid() is not null
    );
