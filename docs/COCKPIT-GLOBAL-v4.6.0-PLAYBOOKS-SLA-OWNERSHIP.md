# Cockpit Global - Fase 3.3: Playbooks + SLA + Ownership (v4.6.0)

Este parche evoluciona el Cockpit Global hacia un centro de orquestación operacional, introduciendo métricas de rendimiento (MTTA/MTTR), cumplimiento de SLA y guías de resolución (Playbooks).

## 1. Objetivo
Transformar el Cockpit de una herramienta reactiva a una proactiva:
**DETECCIÓN → ACCIÓN → ORQUESTACIÓN → CIERRE MEDIBLE**.

## 2. Contrato Operacional v4.6.0

### Catálogo de Playbooks
Mapeado por `ruleCode`, define los pasos necesarios para resolver cada tipo de incidente.
- **SLA Predeterminado**: 15m, 1h, 24h, 72h.
- **Responsable Sugerido**: FINANCE_OPS, SUPPORT, SALES_OPS, SUPERADMIN.
- **Checklist**: Pasos accionables con seguimiento de ejecución.

### Gestión de SLA
- **ON_TRACK**: Incidente dentro del tiempo esperado.
- **AT_RISK**: Menos de 2h para el vencimiento.
- **BREACHED**: SLA superado. Dispara escalación visual y notificaciones de CRITICAL.

### Ownership (Responsabilidad)
- Capacidad de asignar un incidente a un usuario o rol específico.
- Persistencia auditable del responsable.

## 3. Lógica de Re-evaluación v4.6.0
1. **Normalización v4.6**: Toda alerta cargada se normaliza automáticamente al contrato v4.6.
2. **Escalación Automática**: El motor detecta alertas `BREACHED` y genera notificaciones de escalación sin duplicidad.
3. **Reapertura con Historial**: Al reabrir un incidente, se guarda un snapshot del estado anterior (incluyendo checklist) en el campo `history` de la metadata.

## 4. KPIs Operacionales
- **MTTA (Mean Time To Acknowledge)**: Tiempo promedio de respuesta.
- **MTTR (Mean Time To Resolve)**: Tiempo promedio de cierre.
- **SLA Compliance**: Porcentaje de incidentes resueltos dentro del plazo.

## 5. QA Manual Real (Checklist v4.6.0)
| Ruta | Caso | Resultado Esperado | PASS/FAIL |
| :--- | :--- | :--- | :--- |
| `/admin` | Asignar Owner | El owner aparece en el badge de la alerta y persiste. | |
| `/admin` | Abrir Playbook | Se despliega el panel lateral con los pasos correctos. | |
| `/admin` | Check Playbook | Al marcar un paso, se registra quién lo hizo y cambia UI. | |
| `/admin` | SLA Breached | Alertas vencidas rebotan/animan y muestran badge rojo. | |
| `/admin` | KPI MTTA/MTTR | Los bloques superiores muestran números coherentes. | |

## 6. Decisiones Arquitectónicas
- **SLA & Snooze**: El tiempo de SLA **sigue corriendo** durante el Snooze para evitar "maquillaje" de métricas.
- **Metadata Versioning**: Se inyecta `version: "v4.6"` para facilitar futuras migraciones de esquema si fueran necesarias.
