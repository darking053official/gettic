// ============================================
// GETTIC - CONFIG/SUPABASE.JS
// Supabase client yapılandırması
// ============================================

const { createClient } = require('@supabase/supabase-js');
const { environment } = require('./environment');

// Supabase client oluştur
const supabase = createClient(
    environment.SUPABASE_URL,
    environment.SUPABASE_SERVICE_ROLE_KEY || environment.SUPABASE_ANON_KEY,
    {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true
        },
        realtime: {
            params: {
                eventsPerSecond: 10
            }
        }
    }
);

// Admin client (service role key ile)
const supabaseAdmin = environment.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(
        environment.SUPABASE_URL,
        environment.SUPABASE_SERVICE_ROLE_KEY,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )
    : supabase;

module.exports = {
    supabase,
    supabaseAdmin
};
