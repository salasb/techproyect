# Creator y Operator Display (v1.0)

Este documento describe la arquitectura de presentación para usuarios con roles globales (`CREATOR`, `SUPERADMIN`) al interactuar con organizaciones en diversos estados comerciales.

## 1. Problema: Degradación Visual del Superadmin
Anteriormente, el sistema renderizaba etiquetas de "TRIAL", banners de expiración y CTAs de upgrade basándose únicamente en el estado de la organización activa. Esto causaba que los administradores globales de la plataforma vieran una interfaz "degradada" y orientada a ventas al realizar labores de soporte u operación.

## 2. Solución: Resolver Canónico de Presentación
Se ha implementado una capa de abstracción en `src/lib/billing/commercial-display.ts` que separa el **Estado Comercial Real** del **Estado de Visualización**.

### Reglas de Negocio (Display)
1.  **Si el usuario es Global Operator**:
    *   Se suprimen todos los banners de Paywall (`PaywallBanner`).
    *   Se suprimen los banners de Dunning (cobranza).
    *   El badge de la organización en el header/switcher cambia de "TRIAL" a "Operador".
    *   Se ocultan los CTAs de "Elegir Plan" o "Upgrade".
    *   Se muestra contexto neutro de "Modo Operador Global".
2.  **Si el usuario es Cliente Regular**:
    *   Mantiene la experiencia comercial original (Trial banners, badges de plan, etc.).

## 3. Componentes Afectados
*   `AppHeader.tsx`: Controla la renderización de banners superiores y el paso de contexto al switcher.
*   `OrgSwitcher.tsx`: Muestra el badge de estado de la organización y las etiquetas de observación.
*   `BillingPage.tsx`: Muestra banners informativos de modo operador en lugar de advertencias de bloqueo.

## 4. Casos de Prueba (QA)
*   **Caso A (Superadmin en Org Trial)**: Debe ver badge azul "Operador", ningún banner superior, y acceso total.
*   **Caso B (Usuario normal en Org Trial)**: Debe ver badge ámbar "TRIAL" y banners de expiración si faltan < 3 días.
*   **Caso C (Superadmin en Billing)**: Debe ver banner informativo "Modo Operador Global - Estás viendo la facturación de...".
