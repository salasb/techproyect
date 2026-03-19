# Entitlements y Navegación Comercial (v1.0)

Este documento establece el contrato canónico para la gestión de acceso, visibilidad de módulos (entitlements) y la estructura de navegación en TechProyect, asegurando una clara separación entre el rol de plataforma, el rol local y el plan comercial.

## 1. Modelo de Identidad y Acceso

El acceso y las capacidades dentro de la plataforma se determinan por la interacción de tres ejes:

1.  **Rol Global de Plataforma (`globalRole`)**:
    *   `CREATOR` / `SUPERADMIN`: Tiene acceso administrativo y operativo transversal a todas las organizaciones. **No está sujeto a restricciones comerciales** (bypass de plan/trial).
    *   `STAFF`: Personal de soporte interno.
    *   `NONE` / `USER`: Usuario regular de la plataforma.

2.  **Rol Local de Organización (`orgRole`)**:
    *   `OWNER`: Propietario de la organización.
    *   `ADMIN`: Administrador de la organización.
    *   `MEMBER`: Miembro regular con permisos operativos.
    *   `VIEWER`: Acceso de solo lectura.

3.  **Plan Comercial y Estado (`orgPlan` / `subscriptionStatus`)**:
    *   `FREE`, `PRO`, `ENTERPRISE`, etc. (Define los *Entitlements*).
    *   `TRIALING`, `ACTIVE`, `PAUSED`, `PAST_DUE` (Define el estado de la suscripción).

## 2. La Regla de Oro

*   **Los roles dan permisos** (Qué puede hacer el usuario: crear, editar, borrar).
*   **El plan da características (features/entitlements)** (Qué módulos están encendidos para la organización).
*   **El `CREATOR` / `SUPERADMIN` realiza un bypass comercial** para operar, diagnosticar o testear, sin verse afectado visual ni funcionalmente por los límites del plan (ej. no se le trata como usuario "Trial").

## 3. Entitlements Canónicos

Los módulos visibles y accesibles dependen estrictamente de los *entitlements* derivados del plan de la organización (o del bypass del Superadmin).

### 3.1. Core Comercial (Mínimo siempre visible)
*   Dashboard (Command Center)
*   Oportunidades (Pipeline)
*   Cotizaciones (Quotes)
*   Clientes
*   Proyectos (Ejecución)
*   Calendario
*   Facturación y Ajustes (Settings)

### 3.2. Módulos Opcionales (Por Plan)
*   Catálogo
*   Ubicaciones / Bodegas
*   Escáner QR
*   Inventario General

## 4. Reglas UX y Navegación Dinámica

1.  **Ocultamiento por defecto**: Si la organización no tiene el entitlement para un módulo (ej. Inventario), este **NO** debe aparecer en el Sidebar ni en ningún menú de navegación.
2.  **Protección de Rutas**: Si un usuario accede por URL directa a un módulo no habilitado, el sistema debe interceptarlo y mostrar un *Empty State* claro ("Módulo no incluido en tu plan"), con un CTA (Call To Action) para actualizar el plan (Upgrade).
3.  **Bypass de Superadmin**: 
    *   El Superadmin **nunca** debe ver banners de "Trial" o "Upgrade" dirigidos a sí mismo.
    *   Puede acceder a todos los módulos opcionales para fines operativos, independientemente del plan real de la organización.
    *   En las vistas de Facturación/Settings, debe mostrarse un indicador claro de "Modo Operador Global".

## 5. Implementación Centralizada

La fuente de verdad para estas evaluaciones es un "Resolver de Entitlements" (`src/lib/billing/entitlements.ts` o integrado en el `workspace-resolver`), que encapsula la lógica para determinar:
*   `canBypassCommercialRestrictions`
*   `effectiveEntitlements` (Inventario, etc.)
*   `showTrialBanner` / `showUpgradeCTA`

Este resolver es consumido por el Sidebar, los layouts principales, y los guards de ruta de Next.js.
