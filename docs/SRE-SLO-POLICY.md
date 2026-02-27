# SRE Policy: SLO v1 (Burn Rate Alerting)

## 1. Definición de SLOs (TechProyect Sprint 3)

| SLO ID | Nombre | Target (30d) | Descripción |
| :--- | :--- | :--- | :--- |
| `AUTH_LOGIN` | Disponibilidad de Login | **99.9%** | Éxito en el flujo de registro/login. |
| `BILLING_PAYMENT` | Procesamiento de Pagos | **98.0%** | Éxito en transacciones de Stripe (excluye fallos de tarjeta). |
| `API_CRITICAL` | Operaciones Críticas | **99.5%** | Éxito en creación de proyectos y cotizaciones. |

## 2. Gestión del Error Budget

- **Error Budget (EB):** El porcentaje de peticiones que "podemos permitirnos" que fallen. 
  - Para 99.9%, el EB es **0.1%**.
- **Burn Rate:** La velocidad a la que consumimos el Error Budget.
  - Burn Rate 1.0 = Consumiremos el EB exactamente en 30 días.
  - Burn Rate > 1.0 = Consumo acelerado.

## 3. Estrategia de Alerting (Multi-window)

Implementamos el modelo de Google SRE para reducir ruido y aumentar la confianza:

### A. Alerta Rápida (Fast Burn)
- **Ventana:** 1 hora.
- **Umbral:** **14.4x** burn rate.
- **Impacto:** Consume el **2%** del presupuesto mensual en solo 1 hora.
- **Severidad:** **CRITICAL**. Requiere intervención inmediata (P0/P1).

### B. Alerta Lenta (Slow Burn)
- **Ventana:** 6 horas.
- **Umbral:** **6.0x** burn rate.
- **Impacto:** Consume el **5%** del presupuesto mensual en 6 horas.
- **Severidad:** **WARNING**. Requiere revisión en horario laboral.

## 4. Playbooks Operacionales

### AUTH_LOGIN (99.9%)
1. Verificar estado de Supabase Auth.
2. Revisar logs de `TELEMETRY:AUTH_LOGIN:FAILURE`.
3. Validar si es un fallo masivo o regional.

### BILLING_PAYMENT (98.0%)
1. Revisar Dashboard de Stripe (Webhooks).
2. Validar cambios recientes en el flujo de checkout.
3. Verificar si el burn rate es por errores técnicos (500) o de negocio (402).

### API_CRITICAL (99.5%)
1. Revisar errores de base de datos (Prisma).
2. Validar latencia de consultas pesadas.
3. Comprobar si hay fallos de validación inesperados tras un despliegue.
