# Cockpit Global v4.7.2: Agrupación Operativa y Acciones Masivas

## Contexto
Tras implementar la Higiene Operacional (v4.7.1), el Cockpit Global ya no presenta ruido de entornos de prueba. Sin embargo, el volumen de incidentes reales en producción puede seguir siendo alto (~121). Esta actualización introduce la **Agrupación Operativa** para gestionar la saturación visual.

## Solución: Agrupación y Drill-down
Se ha transformado el grid principal de una lista plana a una jerarquía de grupos accionables.

### 1. Contrato `CockpitAlertGroup`
Los incidentes se agrupan en el servidor mediante la clave: `ruleCode | severity | operationalState`.
Esto permite colapsar cientos de alertas en ~10-15 tarjetas de resumen.

### 2. Acciones Masivas
Cada grupo permite ejecutar acciones en lote con un solo click:
- **Bulk ACK**: Acusar recibo a todas las organizaciones del grupo.
- **Bulk SNOOZE**: Posponer todo el grupo (24h default).
- **Bulk RESOLVE**: Resolución masiva con nota obligatoria.

### 3. Trazabilidad y Auditoría
Cada acción masiva genera un **Trace ID** único y un log de auditoría que registra exactamente cuántos incidentes fueron afectados y por qué usuario.

## Métricas de Impacto
| Métrica | Antes (v4.7.1) | Después (v4.7.2) | Mejora |
| :--- | :--- | :--- | :--- |
| **Tarjetas en Grid** | 121 (Planos) | **~12 Grupos** | -90% Carga Visual |
| **Tiempo de Triage** | ~10 min | **~1 min** | Acciones masivas |
| **Precisión** | Alta | **Máxima** | Drill-down org-by-org |

## Guía de Uso
1. **Vista Agrupada**: Es la vista por defecto. Muestra el resumen por tipo de fallo.
2. **Ver Casos**: Botón que expande el grupo para ver las organizaciones individuales.
3. **Acciones Masivas**: Botón en la esquina superior de la tarjeta de grupo.
4. **Vista Individual**: Toggle en la barra superior para volver a la lista plana tradicional.
