# Billing v1 (MVP Facturación & Stripe)

## 1. Resumen de Arquitectura
El sistema de facturación está integrado con **Stripe** para la gestión de suscripciones y el procesamiento de pagos. Se utiliza un modelo multi-inquilino donde cada organización tiene su propio `providerCustomerId` en Stripe.

### Componentes Clave:
- **Gestión**: `/settings/organization/billing` - Panel central de la suscripción.
- **Portal de Stripe**: Acceso seguro para gestionar tarjetas y descargar facturas.
- **Checkout**: Proceso de upgrade para pasar de TRIAL a planes de pago.
- **Guards**: Protección transversal que bloquea la escritura si la cuenta está en mora o pausada.

## 2. Estados Operacionales
| Estado | Descripción | Impacto en App |
| :--- | :--- | :--- |
| `TRIALING` | Período de prueba activo. | Funcionalidad completa. |
| `ACTIVE` | Suscripción al día. | Funcionalidad completa. |
| `PAST_DUE` | Error en el último cobro. | **Modo Lectura** (Banner de advertencia). |
| `PAUSED` | Suspensión manual o por impago prolongado. | **Modo Lectura Crítico**. |
| `CANCELED` | Suscripción terminada. | **Modo Lectura Crítico**. |

## 3. Matriz de Permisos (RBAC)
| Acción | Permiso Requerido | Nivel |
| :--- | :--- | :--- |
| Ver Billing | `BILLING_MANAGE` | Organización |
| Acceder al Portal | `BILLING_MANAGE` | Organización |
| Iniciar Checkout | `BILLING_MANAGE` | Organización |

## 4. Protección de Escritura (Read-Only)
Se utiliza el guard `ensureNotPaused(orgId)` en todas las Server Actions de creación, actualización o eliminación. 
Si el estado es `PAUSED` o `PAST_DUE`, la acción lanza un error `READ_ONLY_MODE` que es capturado por la UI para mostrar el banner de bloqueo.

## 5. Auditoría
Eventos registrados en `auditLog`:
- `BILLING_CHECKOUT_CREATED`: Al iniciar un proceso de suscripción.
- `BILLING_PORTAL_ACCESSED`: Al entrar a gestionar datos en Stripe.
- `SUBSCRIPTION_UPDATED`: Al recibir el webhook de cambio de estado (Stripe -> DB).

## 6. QA Checklist
- [ ] Acceder a Billing como Owner: Debe cargar el plan actual.
- [ ] Intentar entrar a Billing como Member: Debe dar 403 Forbidden.
- [ ] Crear portal session: Debe redirigir a Stripe.
- [ ] Simular estado `PAUSED`: Verificar que no se pueden crear proyectos.
- [ ] Verificar que el banner de Dunning aparece en estados no activos.

---
*TechWise Engineering v1.0*
