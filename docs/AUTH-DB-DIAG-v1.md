# Diagnóstico de Fallos en Supabase Auth (`/signup` 500 y Delete failures)

## 1. El Problema (`/signup` 500)
Si los logs de Auth en Supabase muestran un error HTTP 500 con el mensaje `"Database error saving new user"`, **no es un problema del código Node.js ni del cliente Supabase**, sino un fallo a nivel de base de datos de PostgreSQL al intentar insertar la nueva fila en el esquema interno `auth.users`.

### Causas Comunes:
1. **Triggers Fallidos (Postgres)**: En muchos proyectos se utiliza un trigger en `auth.users` (`AFTER INSERT`) para crear automáticamente un registro en `public.Profile` o inicializar organizaciones. Si la función plpgsql que ejecuta este trigger tiene un error lógico (ej. intenta insertar un campo `NULL` en una columna requerida de la tabla pública), la transacción completa del `INSERT` en `auth.users` hace un `ROLLBACK` y Supabase devuelve un 500.
2. **Permisos de RLS en el Trigger**: Si el trigger usa una función con privilegios del invocador (`SECURITY INVOKER`) en lugar de `SECURITY DEFINER`, podría no tener permisos para escribir en el esquema `public` al ejecutarse bajo el rol del servicio de Auth.

## 2. El Problema (`Failed to delete user`)
Cuando el Dashboard de Supabase no puede eliminar un usuario (o la herramienta de purga de test users falla), se debe casi siempre a restricciones de Integridad Referencial (Foreign Keys).

### Causas Comunes:
1. **Foreign Keys Estrictas (RESTRICT/NO ACTION)**: Tablas en el esquema `public` (como `Profile`, `OrganizationMember`, `AuditLog`, o los objetos en `storage.objects`) hacen referencia al `id` del usuario en `auth.users`. Si la clave foránea no tiene la directiva `ON DELETE CASCADE`, PostgreSQL bloqueará proactivamente cualquier intento de borrar el registro maestro en `auth.users` para evitar datos huérfanos.
2. **Storage Objects**: Todo archivo subido a Supabase Storage almacena el `owner` (que mapea al `userId`). Supabase no borra usuarios si tienen archivos en sus buckets a menos que se borren primero los objetos físicos o la FK de `storage.objects` esté configurada en cascada (algo poco recomendado por seguridad).

## 3. Herramienta de Diagnóstico Interna
Para facilitar la resolución de estos problemas sin tener que navegar por la consola SQL de Supabase, hemos incorporado un script de diagnóstico que audita los triggers y las constraints que apuntan a `auth.users`.

### Ejecución:
Desde la raíz del proyecto, ejecuta:
```bash
npx ts-node scripts/diagnose-auth-db.ts
```

### Resultados Esperados:
1. **Triggers**: Mostrará qué funciones se están disparando durante el ciclo de vida del usuario. Deberás revisar la definición de esas funciones en migraciones pasadas para encontrar bugs.
2. **Constraints**: Listará qué tablas del esquema `public` están referenciando a `auth.users`. Si necesitas eliminar usuarios y falla, deberás borrar primero los registros en esas tablas listadas (lo cual ya hace nuestra herramienta interna `/api/admin/auth/purge-test-users`).

---
*TechWise Engineering v1.0*
