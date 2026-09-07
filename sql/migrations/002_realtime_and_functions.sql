-- ============================================
-- GETTIC - REALTIME SETUP
-- ============================================

-- Realtime yayınını etkinleştir
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.conversation_members;
alter publication supabase_realtime add table public.message_reads;
alter publication supabase_realtime add table public.notifications;

-- ============================================
-- REALTIME FONKSİYONLARI
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

-- ============================================
-- PRESENCE SİSTEMİ
-- ============================================

-- Kullanıcı durumu güncelleme fonksiyonu
create or replace function public.update_user_status(status text)
returns void as $$
begin
    update public.profiles
    set 
        status = status,
        last_seen = case 
            when status = 'offline' then now()
            else last_seen
        end,
        updated_at = now()
    where id = auth.uid();
end;
$$ language plpgsql security definer;

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
-- BİLDİRİM FONKSİYONLARI
-- ============================================

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
-- ARAMA FONKSİYONLARI
-- ============================================

-- Kullanıcı arama
create or replace function public.search_users(search_term text)
returns table (
    id uuid,
    username text,
    full_name text,
    avatar_url text,
    status text,
    last_seen timestamp with time zone
) as $$
begin
    return query
    select
        p.id,
        p.username,
        p.full_name,
        p.avatar_url,
        p.status,
        p.last_seen
    from public.profiles p
    where 
        p.id != auth.uid()
        and (
            p.username ilike '%' || search_term || '%'
            or p.full_name ilike '%' || search_term || '%'
        )
    order by 
        case when p.status = 'online' then 0 else 1 end,
        p.username
    limit 20;
end;
$$ language plpgsql security definer;

-- Mesaj arama
create or replace function public.search_messages(conversation_id uuid, search_term text)
returns table (
    id uuid,
    conversation_id uuid,
    sender_id uuid,
    content text,
    type text,
    media_url text,
    created_at timestamp with time zone
) as $$
begin
    return query
    select
        m.id,
        m.conversation_id,
        m.sender_id,
        m.content,
        m.type,
        m.media_url,
        m.created_at
    from public.messages m
    where 
        m.conversation_id = conversation_id
        and m.content ilike '%' || search_term || '%'
        and m.is_deleted = false
    order by m.created_at desc
    limit 50;
end;
$$ language plpgsql security definer;

-- ============================================
-- İSTATİSTİK FONKSİYONLARI
-- ============================================

-- Kullanıcı istatistikleri
create or replace function public.get_user_stats(user_id uuid)
returns table (
    total_conversations bigint,
    total_messages bigint,
    total_unread bigint,
    online_friends bigint
) as $$
begin
    return query
    select
        (select count(*) from public.conversation_members where user_id = $1),
        (select count(*) from public.messages where sender_id = $1),
        (
            select count(*)
            from public.messages m
            where m.conversation_id in (
                select conversation_id from public.conversation_members where user_id = $1
            )
            and m.sender_id != $1
            and not exists (
                select 1 from public.message_reads mr
                where mr.message_id = m.id
                and mr.user_id = $1
            )
        ),
        (
            select count(*)
            from public.profiles p
            where p.id in (
                select cm.user_id
                from public.conversation_members cm
                where cm.conversation_id in (
                    select conversation_id from public.conversation_members where user_id = $1
                )
                and cm.user_id != $1
            )
            and p.status = 'online'
        );
end;
$$ language plpgsql security definer;

-- ============================================
-- TEMİZLİK FONKSİYONLARI
-- ============================================

-- Eski mesajları temizle (30 günden eski silinen mesajlar)
create or replace function public.cleanup_deleted_messages()
returns void as $$
begin
    delete from public.messages
    where is_deleted = true
    and deleted_at < now() - interval '30 days';
end;
$$ language plpgsql;

-- Çevrimdışı kullanıcıları güncelle (1 saatten fazla çevrimiçi görünen)
create or replace function public.cleanup_stale_users()
returns void as $$
begin
    update public.profiles
    set status = 'offline',
        last_seen = now()
    where status = 'online'
    and updated_at < now() - interval '1 hour';
end;
$$ language plpgsql;

-- ============================================
-- YETKİLENDİRME YARDIMCILARI
-- ============================================

-- Kullanıcının sohbette olup olmadığını kontrol et
create or replace function public.is_conversation_member(conversation_id uuid, user_id uuid)
returns boolean as $$
begin
    return exists (
        select 1 from public.conversation_members
        where conversation_id = $1
        and user_id = $2
    );
end;
$$ language plpgsql security definer;

-- Kullanıcının admin olup olmadığını kontrol et
create or replace function public.is_conversation_admin(conversation_id uuid, user_id uuid)
returns boolean as $$
begin
    return exists (
        select 1 from public.conversation_members
        where conversation_id = $1
        and user_id = $2
        and role = 'admin'
    );
end;
$$ language plpgsql security definer;

-- ============================================
-- TEST VERİLERİ
-- ============================================

-- Test kullanıcıları oluştur (opsiyonel)
do $$
begin
    -- Test kullanıcıları auth.users'a eklenmeli
    -- Burada sadece profil oluşturma örneği
    if not exists (select 1 from public.profiles where username = 'test_user1') then
        insert into public.profiles (id, username, full_name, status)
        values 
            (gen_random_uuid(), 'test_user1', 'Test Kullanıcı 1', 'online'),
            (gen_random_uuid(), 'test_user2', 'Test Kullanıcı 2', 'offline'),
            (gen_random_uuid(), 'test_user3', 'Test Kullanıcı 3', 'away');
    end if;
end $$;
