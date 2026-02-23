export const dynamic = 'force-dynamic';

export type CockpitMode = "operational" | "safe_mode";

export interface ServerRuntimeConfig {
    mode: CockpitMode;
    isDegradedMode: boolean;
    isAdminClientEnabled: boolean;
    missingVars: string[];
}

/**
 * Centralized configuration check for Server Components.
 * Never throws exceptions. Returns a safe status object for diagnostics.
 */
export function getServerRuntimeConfig(): ServerRuntimeConfig {
    const missingVars: string[] = [];
    
    // 1. Check Public Vars
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missingVars.push('NEXT_PUBLIC_SUPABASE_URL');
    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    
    // 2. Check Admin Vars (Sensitive)
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRole) missingVars.push('SUPABASE_SERVICE_ROLE_KEY');

    const isAdminClientEnabled = !!serviceRole && !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const isDegradedMode = !isAdminClientEnabled || missingVars.length > 0;

    return {
        mode: isAdminClientEnabled ? "operational" : "safe_mode",
        isDegradedMode,
        isAdminClientEnabled,
        missingVars
    };
}
