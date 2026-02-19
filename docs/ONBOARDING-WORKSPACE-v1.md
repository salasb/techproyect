# Onboarding & Workspace Resolution (v1.0)

Este documento describe la nueva arquitectura de resolución de espacios de trabajo (workspaces) y el flujo de "Soft-Onboarding".

## Arquitectura

### 1. Middleware (Edge Runtime)
- **Función**: Verifica la autenticación (Supabase Auth) y aplica headers de seguridad.
- **Cambio**: Ya NO resuelve organizaciones ni redirige por falta de una. Esto garantiza un middleware ultra-ligero (< 1MB) y evita bucles de redirección infinitos.

### 2. Workspace Resolver (Node Runtime)
- **Ruta**: `src/lib/auth/workspace-resolver.ts`
- **Función `getWorkspaceState()`**:
    - Obtiene el usuario de la sesión.
    - Consulta Prisma para obtener membresías activas.
    - **Auto-provisioning**: Si el usuario no tiene ninguna organización, el sistema crea automáticamente una llamada "Mi Organización" (modo SOLO) y le asigna el rol OWNER.
    - Resuelve la organización activa basándose en la cookie `app-org-id` o selecciona la primera disponible.

### 3. Soft-Gating (UI Layer)
- **Componente**: `OrgGate` (`src/components/auth/OrgGate.tsx`).
- **Comportamiento**: 
    - El Dashboard principal siempre es accesible.
    - Las rutas críticas (Proyectos, Inventario, CRM, etc.) están agrupadas en `(dashboard)/(org-required)`.
    - Si un usuario entra a estas rutas sin una organización activa, ve un "bloqueo suave" con un CTA para configurar su cuenta.

## Flujo de Usuario
1. **Login**: Siempre termina en `/dashboard`.
2. **Nuevo Usuario**: 
    - Al llegar al `/dashboard`, `getWorkspaceState` detecta 0 orgs.
    - Crea automáticamente "Mi Organización".
    - Muestra un banner de bienvenida notificando la creación del espacio.
3. **Usuario Existente**:
    - Funciona normalmente. Si el cookie org ID no coincide, el resolver lo sincroniza automáticamente.

## Diagnóstico
- Endpoint: `/api/_debug/org-resolution` (Gateado por `DEBUG_ORG=1`).
- Muestra el estado completo retornado por el `workspace-resolver`.
