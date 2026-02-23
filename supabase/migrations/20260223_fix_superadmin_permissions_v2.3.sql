-- FIX DEFINITIVO PERMISOS COCKPIT GLOBAL v2.3
-- Objetivo: Eliminar Error 42501 (Permission Denied for schema public) para el rol authenticated.

-- 1. Restaurar USAGE en esquema public para roles Supabase
-- Esto es OBLIGATORIO para que el cliente SSR pueda consultar tablas básicas.
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- 2. Asegurar que Profile es legible por su dueño y por Superadmins
-- Nota: Usamos nombres exactos de tabla (Case Sensitive en Prisma si se crearon con comillas).
-- Verificamos si la tabla es "Profile" o "profile". Según schema.prisma es "Profile".

GRANT SELECT ON "Profile" TO authenticated;
GRANT SELECT ON "Organization" TO authenticated;

-- 3. Políticas RLS para Superadmin (Bypass Lógico)
-- Permitir al Superadmin leer cualquier fila de Profile y Organization para el orquestador.

DROP POLICY IF EXISTS "Superadmin select all profiles" ON "Profile";
CREATE POLICY "Superadmin select all profiles" ON "Profile"
FOR SELECT TO authenticated
USING (
  (SELECT role FROM "Profile" WHERE id = auth.uid()) = 'SUPERADMIN'
  OR id = auth.uid()
);

DROP POLICY IF EXISTS "Superadmin select all organizations" ON "Organization";
CREATE POLICY "Superadmin select all organizations" ON "Organization"
FOR SELECT TO authenticated
USING (
  (SELECT role FROM "Profile" WHERE id = auth.uid()) = 'SUPERADMIN'
);

-- 4. Audit Log: Superadmin debe poder registrar sus acciones
GRANT INSERT ON "AuditLog" TO authenticated;

-- 5. Privilegios para secuencias (si aplica)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
