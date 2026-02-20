# ACCESO SUPERADMIN FUNDACIONAL v1.3

## 1. Contrato de Autorización
El sistema TechProyect/TechWise separa estrictamente la **Identidad Global** del **Contexto Local**.
- **Contexto Local**: Depende de `app-org-id` (cookie) y de los registros en `OrganizationMember`. Se utiliza exclusivamente para acceder a módulos comerciales de una organización (ej. Quotes, Invoices, CRM).
- **Identidad Global**: Depende EXCLUSIVAMENTE del campo `Profile.role` en la base de datos (con valor `SUPERADMIN`). 
  
*Regla de Oro*: Ninguna cookie, token de organización, o estado de membresía local puede jamás otorgar o denegar el acceso a rutas globales de administración (`/admin/*`). La única fuente de verdad es la comprobación `workspace.isSuperadmin === true`.

## 2. Prioridad entre Role Global vs Contexto Local
1. **Evaluación de Identidad**: Primero se lee el `user.id` desde Supabase Auth y se busca su `Profile`.
2. **Flag Global**: Si `Profile.role === 'SUPERADMIN'`, se marca `isSuperadmin = true` inmediatamente.
3. **Pase Libre**: Las rutas bajo `/admin` requieren únicamente este flag. Si un Superadmin navega al portal comercial, la falta de contexto local (ej. no tener org) disparará un *Empty State Premium*, requiriendo que el Superadmin seleccione o cree una org explícitamente sin pasar por el onboarding de usuario regular.

## 3. Kill Switch: `SUPERADMIN_BOOTSTRAP_ENABLED`
Para proteger el entorno en producción una vez inicializado, el mecanismo de auto-promoción ("Bootstrap Fundacional") está protegido por un flag de entorno:
- `SUPERADMIN_BOOTSTRAP_ENABLED="true"`: Permite la autopromoción si el email del usuario figura en el allowlist.
- `SUPERADMIN_BOOTSTRAP_ENABLED="false"` (o ausente): El mecanismo de bootstrapping está estrictamente apagado. Cualquier usuario en el allowlist será tratado como usuario normal a menos que ya posea el rol `SUPERADMIN` en DB.

## 4. Auditoría de Elevación Idempotente
Toda auto-promoción a `SUPERADMIN` generará un registro auditable en la tabla `AuditLog` con los siguientes datos:
- `action`: "SUPERADMIN_AUTO_BOOTSTRAP"
- `userId`: ID del usuario ascendido.
- `userName`: Email del usuario ascendido.
- `details`: Metadata extendida indicando el entorno y los roles modificados.
- **Idempotencia**: Solo se disparará una escritura a la DB (tanto de Profile como de AuditLog) en la transición real. Si un usuario ya es `SUPERADMIN`, el flujo resolver ignorará el chequeo y no generará logs repetitivos por cada request.

## 5. Árbol de Decisión del Resolver
El `workspace-resolver` ejecuta las siguientes comprobaciones para la evaluación global:
1. ¿Usuario autenticado? (Si no -> `NOT_AUTHENTICATED`)
2. ¿Perfil existe? (Si no -> `PROFILE_MISSING`)
3. ¿`Profile.role === 'SUPERADMIN'`?
   - Sí -> `isSuperadmin = true`. Se ignora bootstrap.
   - No -> ¿`SUPERADMIN_BOOTSTRAP_ENABLED === 'true'`?
     - Sí -> ¿Email normalizado está en `SUPERADMIN_ALLOWLIST`?
       - Sí -> Promover en BD (`role = 'SUPERADMIN'`), Log de Auditoría, Setear `isSuperadmin = true`.
       - No -> Continúa evaluación local.
     - No -> Continúa evaluación local.
4. Resolución Local (Organizations, Memberships, Cookie App-Org-Id).

## 6. Diagnóstico Forense (Workspace Doctor v1.3)
La ruta `/api/_debug/workspace-doctor` se expande para reportar un nodo `bootstrap` detallado, que no expone secretos (como el allowlist), sino el estado lógico evaluado para dicho request:
```json
"bootstrap": {
    "enabled": true/false,
    "allowlistMatched": true/false, // basado en la comparativa del email actual de sesión
    "attempted": true/false,
    "promotedThisRequest": true/false,
    "error": "..." | null
}
```

## 7. Matriz de Casos Requeridos
| Email en Allowlist | Bootstrap Flag | Role DB actual | Orgs Actuales | Resultado Esperado |
| --- | --- | --- | --- | --- |
| SÍ | TRUE | Normal | Ninguna | Superadmin, Audit Log, Dashboard Empty State Admin |
| SÍ | TRUE | Normal | 1 Org | Superadmin, Audit Log, Dashboard Normal modo Superadmin |
| SÍ | FALSE | Normal | Ninguna | Normal, NO PROMOCIÓN, Onboarding Estándar |
| NO | TRUE | Normal | Ninguna | Normal, NO PROMOCIÓN, Onboarding Estándar |
| SÍ | TRUE | SUPERADMIN | N/A | Superadmin, NO Write DB, Dashboard Normal |
| N/A | N/A | SUPERADMIN | Cookie Rota/Ausente | Superadmin mantiene acceso global en /admin, cae a Empty State en el root. |
