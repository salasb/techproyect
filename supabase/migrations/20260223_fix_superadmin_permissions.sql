-- Fix for 42501: permission denied for schema public
-- This script ensures basic usage and select permissions for authenticated roles and Superadmins.

-- 1. Ensure schema usage
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- 2. Basic table permissions (Read-only for authenticated for global lookup where needed)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO service_role;

-- 3. Sequence permissions (If any inserts happen)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- 4. Specific RLS bypass for Superadmins (Postgres side)
-- Instead of bypassing RLS (which requires being owner), we create policies that recognize the SUPERADMIN role.

-- Example: Allow SUPERADMIN to see all profiles
DROP POLICY IF EXISTS "Superadmins see everything" ON "Profile";
CREATE POLICY "Superadmins see everything" ON "Profile"
FOR SELECT TO authenticated
USING (
  (SELECT role FROM "Profile" WHERE id = auth.uid()) = 'SUPERADMIN'
);

-- Apply similar logic to other critical admin tables if they have RLS enabled
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Superadmin global access" ON %I', t);
        EXECUTE format('CREATE POLICY "Superadmin global access" ON %I FOR ALL TO authenticated USING ((SELECT role FROM "public"."Profile" WHERE id = auth.uid()) = ''SUPERADMIN'')', t);
    END LOOP;
END $$;

-- 5. Re-grant permissions on existing tables to be safe
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO service_role;
