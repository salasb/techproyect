# TechProyect: Onboarding & Billing (Wave 3)

Este documento describe la arquitectura comercial y los flujos de monetización implementados para transformar TechProyect en una plataforma SaaS multi-tenencia.

## 1. Ciclo de Vida de la Suscripción

| Estado | Descripción | Limitaciones |
| :--- | :--- | :--- |
| `TRIALING` | Periodo inicial de 14 días (sin tarjeta). | Acceso total a funciones Pro. |
| `ACTIVE` | Suscripción pagada y vigente. | Acceso Pro ilimitado. |
| `PAUSED` | Trial expirado o pago fallido (Past Due). | **Solo Lectura**: Bloquea CUD (Create/Update/Delete). |
| `CANCELED`| Suscripción terminada por el usuario. | Solo Lectura hasta fin de periodo. |

## 2. Flujo de Onboarding Atómico (`/start`)

El wizard de onboarding realiza las siguientes acciones en una única transacción de base de datos:
1.  **Organization**: Creación de la entidad con su `OrganizationMode` (`SOLO` o `TEAM`).
2.  **Membership**: El usuario que crea la org se asigna como `owner` con estado `ACTIVE`.
3.  **Subscription**: Creación automática de entrada con estado `TRIALING` y fecha de expiración a 14 días.
4.  **Stats**: Inicialización de `OrganizationStats` (Health Score 100).

## 3. Enforcement: Modo Lectura (PAUSE)

La protección se aplica en tres capas:
- **Middleware**: Redirección a `/start` si no hay organización activa.
- **Guards (Server Actions)**: La función `ensureNotPaused` intercepta mutaciones y lanza excepciones si la cuenta está en `PAUSED`.
- **UI (PaywallBanner)**: Aviso persistente con CTA para activar plan Pro.

## 4. Lógica Comercial "Cliente Real"

- **Prospecto**: Entidad creada vía Quick Create o CRM con estado `PROSPECT`.
- **Formalización**: El estado cambia automáticamente a `CLIENT` cuando se convierte una Oportunidad en Proyecto (indicando un compromiso comercial firme).

## 5. Integración de Facturación (Stripe Ready)

- **Provider Agnostic**: El modelo `Subscription` guarda `provider` y `providerCustomerId`.
- **Sincronización**:
    - **Checkout**: Flujo que redirecciona a Stripe para activar el plan.
    - **Webhooks**: Sincronizan cambios de estado (ej. `subscription.updated` -> `ACTIVE`).
    - **Portal**: Acceso directo al Stripe Customer Portal para gestionar métodos de pago.

## 6. Multi-Tenancy Robusta

- Todas las queries utilizan `organizationId` obtenido del contexto de sesión/cookies.
- Se recomienda el uso de **RLS (Row Level Security)** en Supabase como última línea de defensa para el filtrado de datos entre organizaciones.
