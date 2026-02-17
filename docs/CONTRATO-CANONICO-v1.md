
# Contrato Canónico TechWise SaaS v1

Este documento define la fuente de verdad y las reglas maestras que rigen el comportamiento del sistema.

## 1. Entidades y Ciclo de Vida

### Proyectos / Trabajos (Core)
- **Identidad**: El Proyecto es el contenedor de valor.
- **Regla W0**: Puede existir sin un Cliente asociado en etapas iniciales (`LEVANTAMIENTO`).
- **Estados**: Seguimos el Enum `ProjectStatus` (EN_ESPERA, EN_CURSO, BLOQUEADO, CERRADO).
- **Etapas**: Seguimos el Enum `ProjectStage` (LEVANTAMIENTO, DISENO, DESARROLLO, QA, IMPLEMENTACION).

### Clientes y Prospectos
- **Prospecto**: Cliente con estado `PROSPECT`. Proviene del CRM.
- **Cliente Formal**: Se considera cliente a partir del envío de la primera cotización.
- **Bloqueo Canónico**: No se puede avanzar a estados comerciales (`COTIZACION`) sin un Cliente asignado.

### Sistema de Tareas
- **Multiplicidad**: Un proyecto puede tener N tareas paralelas.
- **Visibilidad**: La tarea pendiente más urgente es la que representa la salud del proyecto en vistas generales.

## 2. Reglas de Negocio W0

1. **Jerarquía Monetaria**: La moneda se define por Proyecto (`Project.currency`), primando sobre la configuración de la organización.
2. **Kardex**: Registro histórico de movimientos de inventario (`IN`, `OUT`, `TRANSFER`).
   - *Definición*: El Kardex es el registro detallado de las entradas y salidas de mercancías, que permite conocer el saldo exacto y el valor del inventario en cualquier momento.

## 3. Arquitectura de Información (IA) v2

Estructura de navegación por PROCESOS:
- **Command Center**: Dashboard estratégico y bandeja unificada de tareas.
- **Vender**: Pipeline de Oportunidades, Cotizaciones y Base de Clientes.
- **Ejecutar**: Gestión de Proyectos, Tareas paralelas y Calendario operativo.
- **Cobrar**: Facturación y Seguimiento de Pagos.
- **Inventario**: Catálogo central, Ubicaciones y Atajo de Escáner QR.
- **Reportes**: Análisis de rentabilidad y tendencias.
- **Configuración**: Ajustes globales y Gestión de Equipo.

## 4. Modos de Operación

## 5. Ciclo de Ventas y Cotizaciones (Wave 1)

### Versionado de Cotizaciones
- **Snapshot Inmutable**: Al enviar una cotización, se crea una versión "congelada" (Snapshot). No se puede editar una versión enviada o aceptada.
- **Revisión (vN+1)**: Cualquier cambio en una cotización enviada genera automáticamente una nueva versión correlativa.
- **Estado Maestro**: La versión marcada como `ACCEPTED` es la que rige los valores financieros del Proyecto.

### Promoción de Contactos
- **Prospecto a Cliente**: Un contacto con estado `PROSPECT` se convierte automáticamente en `CLIENT` al momento de enviársele la primera cotización formal.
- **Datos Mínimos**: Un cliente formal puede existir sin RUT inicialmente, pero es obligatorio para la facturación.

### Cierres y Aprendizaje
- **Razón de Cierre**: Es obligatorio especificar una `closeReason` (enum) al cerrar o cancelar cualquier Oportunidad o Proyecto.
- **Propósito**: Alimentar el reporte de pérdida comercial para optimización de procesos.

## 6. Sistema de Tareas Unificado
- **Bandeja Única**: El Dashboard consolida tareas de CRM, Operaciones y Cobranza.
- **Priorización Canónica**: Las tareas se ordenan por `dueDate` (vencimiento) y `priority` (Alto/Normal).
