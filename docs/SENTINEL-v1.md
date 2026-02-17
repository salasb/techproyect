# Especificación Sentinel v1 - El Copiloto Inteligente

Sentinel es el motor de inteligencia proactiva que supervisa la salud comercial, operativa y financiera de cada organización en TechWise.

## 1. Niveles de Severidad

| Nivel | Nombre   | Impacto | Acción Automática |
|-------|----------|---------|-------------------|
| **S0**| Crítico  | Riesgo de pérdida inmediata de dinero o negocio. | Alerta persistente + Tarea con alta prioridad. |
| **S1**| Alto     | Bloqueo operativo o desabastecimiento inminente. | Alerta persistente + Tarea. |
| **S2**| Medio    | Desviación de plazos o falta de seguimiento.     | Tarea de seguimiento. |
| **S3**| Bajo     | Recordatorios preventivos.                       | Tarea informativa. |

## 2. Matriz de Reglas v1

| Categoría | Regla Sentinel | Severidad | Acción | Threshold Default |
|-----------|----------------|-----------|--------|-------------------|
| **Comercial** | Cotización sin respuesta | S2 | Crear Tarea "Follow-up" | 5 días |
| **Comercial** | Prospecto estancado      | S3 | Tarea "Llamar a Prospecto" | 10 días |
| **Operación** | Proyecto sin actividad   | S2 | Alerta + Tarea "Revisar" | 7 días |
| **Finanzas**  | Margen Proyectado bajo   | S0 | Alerta Crítica | < 15% |
| **Cobranza**  | Documento por vencer     | S3 | Tarea de Recordatorio | 2 días |
| **Inventario**| Stock bajo mínimo        | S1 | Alerta + Tarea de Compra | <= Min Stock |

## 3. Persistencia y Ciclo de Vida

Las alertas Sentinel son **inmutables** en su creación pero poseen un estado de resolución:
- `OPEN`: Detectada por el motor.
- `ACK`: El usuario la reconoció pero no se ha resuelto.
- `RESOLVED`: La condición que disparó la alerta ya no existe o fue cerrada manualmente.

## 4. Configuración por Organización

Cada organización podrá ajustar sus umbrales en `Settings`:
- `sentinel_margin_min`: (Default 15).
- `sentinel_stale_project_days`: (Default 7).
- `sentinel_quote_followup_days`: (Default 5).
