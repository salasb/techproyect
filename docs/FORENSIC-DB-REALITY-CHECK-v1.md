# Forensic DB Reality Check v1

En escenarios donde ocurre el de-sincronismo (Vercel cookies desajustadas, migraciones de tabla mal aplicadas, etc.), resulta imperativo separar un fallo visual/de UX de una real pérdida de datos en DB.

Para cumplir esto, se introdujo la herramienta Forense de Diagnóstico Local: `GET /api/_debug/workspace-doctor`.

## ¿Cómo Funciona?
1. Protegido globalmente: Para evitar exposición de metadata, solo responde si `DEBUG_WORKSPACE=1` en el `.env`.
2. Lee `host` y `referer` para reportar posibles falsos positivos por Domain-Hop (Ej: la sesión recae sobre `*.vercel.app` cuando las cookies están ancladas a un dominio en particular).
3. Inspecciona bases referenciales en Prisma DB y cruza información contra `Auth.Users` de Supabase.

## Banderas de Diagnóstico (Flags)
- `profileMissing`: (boolean) TRUE indica desincronización severa. Autenticaste vía Supabase, se validó tu Token JWT, pero la DB Prisma Carece del registro paralelo `Profile`. Causa spinners infinitos y fallos lógicos graves.
- `dbLooksEmpty`: (boolean) TRUE indica que a tu Prisma se le conectó una base vacía recién nacida (< 5 orgs y < 5 profiles totales). Ocurre a veces cuando Vercel Preview clona erróneamente su ENVs y apunta a una Database Subtituta vacía (Empty DB Forking).
- `cookieMissingButHasMemberships`: (boolean) TRUE denota que en DB sí tienes datos asociados, pero tu navegador local no está enviando la cookie. Fallo local, no fallo de BD.
- `domainHopLikely`: (boolean) TRUE si el host actual es una preview app ajena al canonical site y además las cookies faltan.

## Acciones Recomendadas
- Si la base realmente se lee como "Empty" y estás en producción: Alarma Roja. Probablemente hay pérdida en `DATABASE_URL`.
- Si `profileMissing` se muestra en rojo en un Dashboard: El usuario inició sesión pero se saltó pasos de middleware; requiere reparación manual/SQL insert de su registro Profile.
