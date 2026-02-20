# Acceso Superadmin Fundacional v1.2

## 1. Filosofía
Para la versión 1.2, se estableció la separación definitiva entre **Autenticación, Rol Global y Entorno Operativo (Workspace)**.

El objetivo primario de este flujo fundacional (Zero-to-One) es que el creador del sistema / instalador principal sea promovido de forma automática y silenciosa al rol maestro (`SUPERADMIN`) en el preciso instante en que la aplicación intenta resolver su sesión. 

## 2. Separación de Contextos y Orden de Resolución
1. **Resolver Autenticado (Supabase Auth)**: Garantiza quién es la persona mediante su token / email.
2. **Resolver Profile**: Obtiene la información desde PostgreSQL (Prisma). Si no existe, el estado es `PROFILE_MISSING`.
3. **Rol Global**: Analiza el `Profile.role`. 
  - **Auto-Promoción (Bootstrap)**: Si el rol *no* es `SUPERADMIN`, pero el email del Auth se encuentra documentado en la variable entorno `SUPERADMIN_ALLOWLIST`, el sistema *muta* el perfil elevándole sus privilegios a `SUPERADMIN` dentro del mismo ciclo de resolución.
4. **Resolver Workspace (app-org-id / memberships)**: Solamente entra a deliberar qué organización cargar (o si no tiene ninguna). Esto sucede de forma ajena y posterior a la determinación del Rol Global.

## 3. Comportamiento en Frío (Creador sin Org)
Si un `SUPERADMIN` ingresa y no tiene ninguna organización creada ni membresía (`NO_ORG`), no se le obligará a ver el "Workspace Setup Banner" estándar (el típico *Onboarding* restrictivo).
En su lugar, sabrá que ya cuenta con los privilegios para gestionar la plataforma, leyendo en su dashboard:
*"Eres Superadmin. Selecciona una organización para operar o crea una nueva."*

Esto previene que el instalador caiga víctima de su propio *paywall/onboarding* cuando en realidad solo necesita entrar a `/admin`.

## 4. SUPERADMIN_ALLOWLIST
- **Formato**: Lista de correos separados por comas (e.g. `SUPERADMIN_ALLOWLIST=admin@company.com,tech@company.com`).
- Es evaluada a primera vista. Es **idempotente**.

## 5. Prevención de Riesgos y Domain Hop
La lectura obligatoria del resolver central resguarda contra *Domain Hopping* (Vercel Previews). Porque:
- Las Cookies se evitan como fuente de verdad del Rol. Todo se lee desde Prisma `Profile`.
- La falta de cookie `app-org-id` entre dominios derivará en `ORG_MULTI_NO_SELECTION` o `NO_ORG`, pero `isSuperadmin` viajará permanentemente en memoria `true`. Nadie perderá sus llaves de control global.
