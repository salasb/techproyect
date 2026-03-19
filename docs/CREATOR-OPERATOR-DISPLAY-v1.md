# Creator y Operator Display (v1.0)

Este documento describe la arquitectura de presentación para usuarios con roles globales (`CREATOR`, `SUPERADMIN`) al interactuar con organizaciones en diversos estados comerciales.

## 1. Problema: Degradación Visual del Superadmin
Anteriormente, el sistema renderizaba etiquetas de "TRIAL", banners de expiración y CTAs de upgrade basándose únicamente en el estado de la organización activa. Esto causaba que los administradores globales de la plataforma vieran una interfaz "degradada" y orientada a ventas al realizar labores de soporte u operación.

## 2. Solución: Resolver Canónico de Presentación
Se ha implementado una capa de abstracción en `src/lib/billing/commercial-display.ts` y un Provider de React `src/components/layout/ShellCommercialDisplay.tsx` que separa el **Estado Comercial Real** del **Estado de Visualización**.

### Reglas de Negocio (Display)
1.  **Si el usuario es Global Operator**:
    *   Se suprimen todos los banners de Paywall (`PaywallBanner`).
    *   Se suprimen los banners de Dunning (cobranza).
    *   El badge de la organización en el header/switcher cambia de "TRIAL" a "Operador".
    *   Se ocultan los CTAs de "Elegir Plan" o "Upgrade".
    *   Se muestra contexto neutro de "Modo Operador Global".
2.  **Si el usuario es Cliente Regular**:
    *   Mantiene la experiencia comercial original (Trial banners, badges de plan, etc.).

## 3. Renderizadores del Shell Corregidos
Se forzó el uso del hook `useShellCommercialDisplay()` en todos los puntos críticos para evitar que lean el estado comercial crudo de la organización:

*   `src/app/(dashboard)/layout.tsx`: Inicializa el `ShellCommercialProvider` con el estado del espacio de trabajo y suscripción.
*   `src/components/layout/AppHeader.tsx`: Suprime banners basado en el resolver central.
*   `src/components/layout/OrgSwitcher.tsx`: Reemplaza badges de "TRIAL" por "Operador" y limpia los subtítulos de estado.
*   `src/components/layout/PaywallBanner.tsx`: Autocontrol de renderizado mediante el resolver.
*   `src/components/dashboard/DunningBanner.tsx`: Autocontrol de renderizado mediante el resolver.
*   `src/app/(dashboard)/(org-required)/settings/billing/page.tsx`: Muestra modo observación.

## 4. Casos de Prueba (QA)
*   **Caso A (Superadmin en Org Trial)**: Debe ver badge azul "Operador", ningún banner superior, y acceso total.
*   **Caso B (Usuario normal en Org Trial)**: Debe ver badge ámbar "TRIAL" y banners de expiración si faltan < 3 días.
*   **Caso C (Superadmin en Billing)**: Debe ver banner informativo "Modo Operador Global - Estás viendo la facturación de...".

## 5. Hardening Arquitectónico
Se establece el contrato de que **ningún componente del shell principal** debe realizar comprobaciones manuales de `subscription.status === 'TRIALING'`. En su lugar, deben consumir el hook `useShellCommercialDisplay()` para obtener flags de visibilidad ya procesados.
