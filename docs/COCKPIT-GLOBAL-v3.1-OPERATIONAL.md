# Cockpit Global v3.1 - Operational & Hardening

Este documento detalla la evolución de la arquitectura del Cockpit Global (`/admin`) hacia un estado operacional por bloques, mejorando la resiliencia y la experiencia de usuario en entornos con configuración parcial.

## 1. Arquitectura de Bloques Operacionales

En la versión 3.1, hemos pasado de un "Modo Degradado" binario a un sistema de **Estados por Bloque**. Cada sección del dashboard (KPIs, Alertas, Organizaciones, Métricas) opera de forma independiente.

### Estados de Bloque
- **`ok`**: Datos cargados correctamente.
- **`degraded_config`**: Falta configuración en el servidor (`SUPABASE_SERVICE_ROLE_KEY`). Muestra un placeholder premium neutral.
- **`degraded_service`**: Error al consultar el servicio o la base de datos. Se captura el error para no tumbar la página.
- **`empty`**: El servicio respondió correctamente pero no hay registros disponibles.

## 2. Adaptador Maestro (`getCockpitDataSafe`)

El adaptador en `src/lib/superadmin/cockpit-data-adapter.ts` garantiza que el renderizado de servidor nunca falle por problemas de datos:
- Implementa un tiempo de carga medido (`loadTimeMs`).
- Clasifica el sistema global como `operational` o `safe_mode`.
- Registra logs estructurados en el servidor con el prefijo `[CockpitAdapter] [Block:<name>]`.

## 3. UX v3.1: Premium & Resiliente

- **Badge de Estado**: Se ha añadido un indicador visual en el header ("Operational" en verde vs "Safe Mode" en ámbar).
- **Adiós a los Errores Rojos**: Ya no se muestran mensajes de error técnicos ni stacktraces. Se utilizan placeholders estilizados con bordes discontinuos y copys neutrales.
- **Interacción**: Los botones de acción y navegación permanecen activos incluso en modo seguro.

## 4. Checklist de Validación (QA)

### Escenario A: Sin Service Role Key (Safe Mode)
- [ ] Banner superior indica "Capacidad de Infraestructura Limitada".
- [ ] Badge en el header muestra "Safe Mode" en ámbar.
- [ ] KPIs muestran "---" o 0.
- [ ] Bloques de Métricas y Directorio muestran placeholder: "Disponible al completar configuración".
- [ ] Sidebar muestra 1 sola vez cada ítem.

### Escenario B: Con Service Role Key (Operational)
- [ ] Badge en el header muestra "Operational" en verde.
- [ ] Datos reales visibles en KPIs y tablas.
- [ ] Gráficas de rendimiento renderizadas.
- [ ] Logs indican `SystemStatus=operational`.

## 5. Próximos Pasos
- Monitoreo de latencia por bloque.
- Exportación global de datos agregados en formato CSV/Excel.
- Panel de control de Webhooks de infraestructura.

---
**TechWise Global Operations** - v3.1 2026
