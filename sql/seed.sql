-- ============================================
-- GETTIC - SUPABASE/SEED.SQL
-- Test verileri
-- ============================================

-- Not: Test kullanıcıları auth.users tablosuna eklenmeli
-- Bu dosya sadece örnek verileri gösterir

-- Test kullanıcıları için profiller
insert into public.profiles (id, username, full_name, status)
values 
    ('00000000-0000-0000-0000-000000000001', 'test_user1', 'Test Kullanıcı 1', 'online'),
    ('00000000-0000-0000-0000-000000000002', 'test_user2', 'Test Kullanıcı 2', 'offline'),
    ('00000000-0000-0000-0000-000000000003', 'test_user3', 'Test Kullanıcı 3', 'away')
on conflict (id) do nothing;

-- Test sohbeti (direkt)
insert into public.conversations (id, type, created_by)
values 
    ('00000000-0000-0000-0000-000000000101', 'direct', '00000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

-- Test sohbet üyeleri
insert into public.conversation_members (conversation_id, user_id, role)
values 
    ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'member'),
    ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000002', 'member')
on conflict (conversation_id, user_id) do nothing;

-- Test grubu
insert into public.conversations (id, type, name, created_by)
values 
    ('00000000-0000-0000-0000-000000000102', 'group', 'Test Grubu', '00000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

-- Test grup üyeleri
insert into public.conversation_members (conversation_id, user_id, role)
values 
    ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', 'admin'),
    ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000002', 'member'),
    ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000003', 'member')
on conflict (conversation_id, user_id) do nothing;

-- Test mesajları
insert into public.messages (conversation_id, sender_id, content, type)
values 
    ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'Merhaba!', 'text'),
    ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000002', 'Selam!', 'text'),
    ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', 'Gruba hoş geldiniz!', 'text'),
    ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000002', 'Teşekkürler!', 'text')
on conflict do nothing;
