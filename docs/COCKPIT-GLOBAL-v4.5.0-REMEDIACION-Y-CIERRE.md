# Cockpit Global - Fase 3.2: Remediación y Cierre Operacional (v4.5.0)

Este parche evoluciona el Cockpit Global hacia un loop de remediación completo, permitiendo no solo detectar incidentes sino gestionarlos hasta su cierre con trazabilidad total.

## 1. Objetivo
Cerrar el ciclo de vida de las alertas operacionales:
**DETECCIÓN → ACKNOWLEDGE → SNOOZE/ACTION → RESOLVE → CIERRE/REAPERTURA**.

## 2. Contrato Operacional v4.5.0

### Estados de Alerta
- **OPEN** (Mapeado a `ACTIVE` en DB): Alerta detectada y pendiente de revisión.
- **ACKNOWLEDGED**: El Superadmin ha tomado conocimiento.
- **SNOOZED**: Silenciada temporalmente (1h, 24h, 7d).
- **RESOLVED**: Marcada como solucionada.

### Modelo de Datos (Extendido vía Metadata)
Se utiliza el campo `metadata` de `SuperadminAlert` para persistir el estado operacional sin alterar el esquema de la base de datos:
- `snoozedUntil`: Fecha ISO de expiración del silencio.
- `acknowledgedBy` / `resolvedBy`: Identidad del actor.
- `resolutionNote`: Justificación del cierre.
- `reopenCount`: Contador de veces que la regla volvió a disparar tras ser resuelta.

## 3. Lógica de Transición y Re-evaluación
El motor de salud (`AlertsService`) ahora aplica las siguientes reglas en cada evaluación:
1. **Reapertura Automática**: Si una alerta está `RESOLVED` pero la condición de la regla vuelve a ser `true`, la alerta se reabre (`OPEN`) y se incrementa el `reopenCount`.
2. **Expiración de Snooze**: Si una alerta está silenciada y el tiempo ha expirado, vuelve a aparecer en el panel principal como `OPEN`.
3. **Persistencia de Acción**: Si una alerta es disparada pero ya existe una acción humana (ACK), se respeta el estado hasta que la regla deje de disparar o sea resuelta.

## 4. Acciones del Servidor
- `acknowledgeCockpitAlert(fingerprint)`: Acusa recibo de una alerta.
- `snoozeCockpitAlert(fingerprint, duration)`: Silencia la alerta.
- `resolveCockpitAlert(fingerprint, note)`: Cierra el incidente.

## 5. QA Manual Real (Checklist v4.5.0)
| Ruta | Caso | Resultado Esperado | PASS/FAIL |
| :--- | :--- | :--- | :--- |
| `/admin` | Acknowledge | Alerta cambia a estado ACKNOWLEDGED visualmente | |
| `/admin` | Snooze 1h | Alerta desaparece del panel "Activas" | |
| `/admin` | Resolve | Alerta se marca como RESUELTA con nota | |
| `/admin` | Reapertura | Si la falla persiste, "Recalcular" reabre la alerta resuelta | |
| `/admin` | Trazabilidad | El Toast muestra el Trace ID de la acción | |

## 6. Riesgos y Bloqueos
- **Limpieza de Alertas**: Las alertas `RESOLVED` que dejen de disparar por mucho tiempo podrían acumularse (se recomienda un job de purga en fases futuras).
- **Snooze UI**: La ocultación en UI depende de la fecha actual del servidor comparada con `metadata.snoozedUntil`.
