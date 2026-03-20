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
Se forzó el uso del hook `useShellCommercialDisplay()` en todos los puntos críticos para evitar que lean el estado comercial crudo de la organización. Se implementó una detección agresiva de rol en el Provider para asegurar la cobertura del bypass.

Componentes actualizados:
*   `src/app/(dashboard)/layout.tsx`: Ahora utiliza `resolveAccessContext()` (la fuente de verdad de más alto nivel) para inicializar el `ShellCommercialProvider`.
*   `src/components/layout/AppHeader.tsx`: Control centralizado de banners. Inyecta logs de depuración para trazar la supresión.
*   `src/components/layout/OrgSwitcher.tsx`: Rediseño del trigger para Operadores Globales. Se eliminó el badge "TRIAL" y el punto de estado ámbar, reemplazándolos por un badge índigo de "Operador" con brillo.
*   `src/components/layout/PaywallBanner.tsx`: Autocontrol de renderizado con validación de bypass.
*   `src/components/dashboard/DunningBanner.tsx`: Autocontrol de renderizado con validación de bypass.

## 4. Casos de Prueba (QA)
*   **Caso A (Superadmin en Org Trial)**: Header limpio (sin banner azul), sin badge "TRIAL", switcher en modo "Operador".
*   **Caso B (Usuario normal en Org Trial)**: Mantiene la experiencia comercial íntegra (TRIAL visible).
*   **Caso C (Failsafe)**: Si el rol no se resuelve a tiempo, el Provider aplica un default defensivo.

## 5. Hardening Arquitectónico
Se establece el contrato de que **ningún componente del shell principal** debe realizar comprobaciones manuales de `subscription.status === 'TRIALING'`. El uso de `useShellCommercialDisplay()` es obligatorio para cualquier señal visual de marketing, límites o upgrade.

