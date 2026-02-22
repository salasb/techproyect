# QA GAPS POST v2.0 - STABILIZATION

Este documento identifica los puntos que aún requieren validación manual o supervisada tras la estabilización P0 v2.0.1.

## 1. Flujo de Pago / Stripe
*   **Estado**: No bloqueado por errores 500, pero requiere probar con tarjetas de prueba en el entorno de Vercel.
*   **Acción**: Validar que el checkout de Stripe se abra correctamente desde el dashboard de una nueva organización.

## 2. Invitaciones de Equipo
*   **Estado**: El componente es visible, pero el envío real de correos depende del API Key de SMTP/SendGrid.
*   **Acción**: Verificar que no fallen silenciosamente si la variable de entorno falta.

## 3. Webhooks de Facturación
*   **Estado**: Endpoint habilitado, pero la sincronización depende de la configuración del webhook en el Dashboard de Stripe hacia la URL de Vercel.
*   **Acción**: Realizar un pago de prueba y verificar la actualización del estado de suscripción en el sistema.

## 4. Persistencia de Perfil
*   **Estado**: Se añadió un fallback para crear el `Profile` si falta.
*   **Acción**: Monitorear logs en Vercel para asegurar que el trigger de Supabase Auth no esté fallando y forzando siempre al fallback de la aplicación.
