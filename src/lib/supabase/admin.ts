import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

/**
 * Superadmin-level client using SERVICE_ROLE_KEY.
 * ONLY for server-side administrative operations.
 * Never expose this or use it in client components.
 */
export function createAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
        throw new Error("ADMIN_ENV_MISSING: NEXT_PUBLIC_SUPABASE_URL is not defined");
    }
    
    if (!supabaseServiceKey) {
        throw new Error("ADMIN_ENV_MISSING: SUPABASE_SERVICE_ROLE_KEY is not defined");
    }

    return createSupabaseClient<Database>(supabaseUrl, supabaseServiceKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        }
    });
}
