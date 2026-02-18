# ACTIVATION-CONTRATO-v1

## Objetivo
Definir los eventos canónicos para medir el funnel de activación y el Time-to-Value (TTV) en TechProyect.

## Eventos Canónicos

| Evento | Definición | Relevancia | Idempotencia |
| :--- | :--- | :--- | :--- |
| `ORG_CREATED` | Organización creada en el sistema. | Inicio del Funnel | Sí (una vez por Org) |
| `FIRST_PROJECT_CREATED` | Primer proyecto creado. | Intención de uso | Sí |
| `FIRST_CLIENT_CREATED` | Primer cliente formalizado. | Configuración base | Sí |
| `FIRST_QUOTE_DRAFT_CREATED` | Primer borrador de cotización. | Exploración Valor | Sí |
| `FIRST_QUOTE_SENT` | **FIRST_VALUE**. Cotización enviada al cliente. | **A-ha Moment** | Sí |
| `FIRST_INVOICE_CREATED` | Primera factura generada. | Monetización | Sí |
| `FIRST_TEAM_INVITE_SENT` | Primera invitación a miembro (TEAM). | Expansión | Sí |
| `FIRST_TEAM_MEMBER_JOINED` | Primer miembro se une (TEAM). | Colaboración | Sí |

## Propiedades de Evento
- `id`: UUID único.
- `organizationId`: Obligatorio (multitenancy).
- `userId`: Persona que ejecutó la acción.
- `eventName`: Nombre del evento (Upper Snake Case).
- `occurredAt`: Timestamp ISO.
- `entityId`: ID de la entidad relacionada (ej: projectId).
- `metadata`: JSON con contexto adicional (ej: mode "SOLO" o "TEAM").

## Funnel Stages (Derivados)
1. **REGISTERED**: `ORG_CREATED`
2. **ACTIVE_EXPLORER**: `FIRST_PROJECT_CREATED`
3. **VALUE_DISCOVERY**: `FIRST_QUOTE_DRAFT_CREATED`
4. **ACTIVATED**: `FIRST_QUOTE_SENT` (TTV se calcula hasta aquí)
5. **EXPANDED**: `FIRST_TEAM_INVITE_SENT`

## Reglas de Implementación
1. Los eventos `FIRST_*` se registran mediante `trackFirst` para evitar duplicidad.
2. La tabla `ActivationEvent` es la fuente de verdad histórica.
3. `OrganizationStats` mantiene el estado denormalizado para alto rendimiento en dashboards.
