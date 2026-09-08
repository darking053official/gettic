const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');
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
            },
            transport: ws  // WebSocket desteği
        }
    }
);

// Admin client
const supabaseAdmin = environment.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(
        environment.SUPABASE_URL,
        environment.SUPABASE_SERVICE_ROLE_KEY,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            },
            realtime: {
                transport: ws
            }
        }
    )
    : supabase;

module.exports = {
    supabase,
    supabaseAdmin
};
