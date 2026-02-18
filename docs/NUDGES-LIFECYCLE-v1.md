# NUDGES-LIFECYCLE-v1

## Objetivo
Optimizar la activación (TTV) y conversión (Trial→Paid) mediante recordatorios oportunos y no intrusivos.

## Nudge Engine Rules (In-App)
| ID | Condición | Mensaje | CTA | Prioridad |
| :--- | :--- | :--- | :--- | :--- |
| `N_01` | `!FIRST_PROJECT_CREATED` (D+0) | "Crea tu primer proyecto para empezar a cotizar." | `/projects/new` | High |
| `N_02` | `FIRST_PROJECT_CREATED` && `!FIRST_QUOTE_DRAFT` (D+1) | "Genera tu primer borrador de cotización." | `/projects` | Medium |
| `N_03` | `FIRST_QUOTE_DRAFT` && `!FIRST_QUOTE_SENT` (D+2) | "Envía tu cotización y cierra ventas hoy." | `/projects` | High |
| `N_04` | `TRIAL_ENDS_IN` <= 3 | "Tu trial expira pronto. Configura tu suscripción." | `/settings/billing` | High |
| `N_05` | `TEAM_MODE` && `!FIRST_MEMBER` | "Invita a tu equipo para colaborar." | `/settings/users` | Medium |

## Lifecycle Emails (Resend)
| Template | DedupeKey | Disparador | Regla |
| :--- | :--- | :--- | :--- |
| `WELCOME` | `welcome_{userId}` | Instantáneo | Al crear Profile/Org |
| `MISSING_PROJ` | `miss_proj_{orgId}_d1` | D+1 | `!FIRST_PROJECT_CREATED` |
| `MISSING_QUOTE` | `miss_quote_{orgId}_d3` | D+3 | `FIRST_PROJECT_CREATED` && `!FIRST_QUOTE_SENT` |
| `TRIAL_7D` | `trial_7d_{orgId}` | Trial-7d | Recordatorio preventivo |
| `TRIAL_3D` | `trial_3d_{orgId}` | Trial-3d | Urgente |
| `TRIAL_EXP` | `trial_exp_{orgId}` | Trial-0h | Aviso de PAUSED |

## Reglas de Notificación
1. **Deduplicación**: Cada email/nudge usa una `dedupeKey`.
2. **Prioridad**: El Notification Center ordena por severidad.
3. **Frecuencia**: Máximo 1 email de lifecycle por día por usuario.
4. **Opt-out**: Si `receiveProductTips` es falso, solo se envían emails de suscripción (Trial 7/3/1/Exp).

## Estructura Nudge (JS)
```typescript
interface Nudge {
  id: string; // N_01, etc
  type: 'ONBOARDING' | 'BILLING' | 'TIP';
  severity: 'info' | 'warn';
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  dedupeKey: string;
}
```
