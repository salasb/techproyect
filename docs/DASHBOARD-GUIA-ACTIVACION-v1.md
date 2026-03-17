# AUDITORÍA DE LA GUÍA DE ACTIVACIÓN (v1.0)
Fecha: 17 de Marzo, 2026
Autor: Principal Product Engineer / TechProyect

## 1. INCONSISTENCIAS DETECTADAS

### Causa Raíz Exacta
La guía de activación se basa en **eventos históricos** trackeados en la tabla `activationEvent`, en lugar de consultar el **estado real** de las entidades en la base de datos.
- **Error Crítico:** Si un usuario inició la creación de un proyecto pero esta falló, o si el proyecto fue eliminado posteriormente, el evento `FIRST_PROJECT_CREATED` persiste en el histórico y la guía lo marca como completado eternamente.
- **Progreso Falso:** El porcentaje del 33% es el resultado de tener 1 de 3 pasos (o 2 de 6 en el servicio) marcados como "true" por el simple hecho de existir el registro del evento en algún momento del tiempo.

### Fuentes de Verdad Actuales
- **Backend:** `ActivationService.getActivationChecklist` consulta `activationEvent`.
- **Frontend:** `ActivationChecklist.tsx` recibe `stats.attributes` (una copia denormalizada de los eventos).

## 2. CONTRATO CORREGIDO

### Fuente de Verdad Basada en Entidades
Cada paso se validará contra el conteo real de registros en el contexto de la organización activa:
1.  **Proyecto Creado:** `count(Project) >= 1`
2.  **Ítems Agregados:** `count(QuoteItem) >= 1` (Indica que el usuario ya sabe poblar un proyecto).
3.  **Borrador de Cotización:** `count(Quote) >= 1`
4.  **Cotización Enviada:** `count(Quote where status in [SENT, ACCEPTED]) >= 1`

### Fórmula de Progreso
`Progress % = (Pasos Completados / Total Pasos) * 100`
Con 4 pasos, los estados serán: 0%, 25%, 50%, 75%, 100%.

### Criterio de Visibilidad
- **Mostrar:** Si `projectsCount === 0` o el progreso es `< 100%`.
- **Ocultar:** Si el progreso llega al 100% o el usuario tiene actividad recurrente (ej. > 3 proyectos).

## 4. IMPLEMENTACIÓN FINAL

### Arquitectura de Onboarding v2.0
- **Servicio Unificado:** `ActivationService.getActivationChecklist` ahora es el único responsable de calcular el estado de activación usando consultas directas a Prisma.
- **Scoping por Organización:** Las validaciones (`count`) se ejecutan estrictamente bajo el `organizationId` activo, eliminando fugas de estado global.
- **Desbloqueo Secuencial:** Se introdujo la propiedad `locked` en los pasos. La UI ahora visualiza estados deshabilitados con iconos de candado y mensajes de requerimiento.

### Secuencia de Pasos Real
1.  **Crea tu primer proyecto:** `count(Project) > 0`
2.  **Puebla tu proyecto:** `count(QuoteItem) > 0`
3.  **Genera una propuesta:** `count(Quote) > 0`
4.  **Envía tu primera oferta:** `count(Quote where status in [SENT, ACCEPTED]) > 0`

### Fórmula de Éxito
`Progreso = (N Pasos Completos / 4) * 100`

## 5. CONCLUSIÓN
La guía ha dejado de ser una lista de "slogans" tachados por eventos pasados para convertirse en un asistente de flujo de trabajo que refleja la salud real del ciclo comercial del usuario.
