# SUPERADMIN ENTRY UX & IDENTITY v2.0.2

Este documento detalla la arquitectura de la experiencia de usuario para el rol SUPERADMIN tras la estabilización v2.0.2.

## 1. Identidad vs Contexto Operativo

Se ha separado explícitamente quién es el usuario de qué está haciendo:

*   **Identidad**: Siempre visible en el Header (Top-Right) mostrando Email/Nombre y el Badge `SuperAdmin`. Esto garantiza que el usuario sepa bajo qué permisos está actuando en todo momento.
*   **Contexto Operativo**: 
    *   **Modo Global**: Cuando el usuario está en `/admin`, ve el `Global Cockpit`. Se muestra un indicador de "Modo Global".
    *   **Modo Local**: Cuando el usuario opera dentro de una organización, se activa el `OperatingContextBanner` en la parte superior, indicando el nombre de la organización y ofreciendo un acceso rápido para volver al Cockpit.

## 2. Flujo de Entrada (Canonical Landing)

Regla de navegación post-login y en root (`/`):
*   Si el usuario tiene rol `SUPERADMIN` y **no tiene una organización seleccionada**: Redirección automática a `/admin`.
*   Si el usuario tiene rol `SUPERADMIN` y **tiene una organización seleccionada**: Entra al Dashboard local de esa organización, pero con el Banner de Contexto activo.

## 3. Mejoras en Confianza (Anti-Friction)

*   **Alerta de Perfil**: El mensaje "Perfil incompleto" ha sido suavizado. Ahora indica que la sincronización está en curso y ofrece un botón de recarga antes de sugerir el diagnóstico técnico.
*   **Org Switcher**: Etiquetas más claras ("Organización Activa" vs "Ninguna") para eliminar la sensación de pérdida de contexto.

## 4. Testabilidad

Se han estandarizado los siguientes `data-testid`:
*   `user-identity-chip`: Chip de identidad en el header.
*   `user-role-badge`: Badge de rol (SuperAdmin).
*   `global-mode-badge`: Indicador de modo global en `/admin`.
*   `local-context-banner`: Banner de operación local para superadmins.
*   `back-to-cockpit-button`: Botón de retorno al cockpit.
*   `org-active-label`: Etiqueta de estado en el switcher.
