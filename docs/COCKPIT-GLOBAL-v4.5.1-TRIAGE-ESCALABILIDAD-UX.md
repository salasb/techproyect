# COCKPIT GLOBAL v4.5.1 - TRIAGE & ESCALABILIDAD UX

## 1. OBJETIVOS UX
Optimizar la operatividad del Cockpit Global para manejar altos volúmenes de alertas sin pérdida de foco.
- **Triage Rápido:** Identificar lo urgente (Crítico/SLA vencido) en menos de 3 segundos.
- **Escalabilidad Visual:** Reducir el "fatiga de scroll" mediante agrupación y densidad variable.
- **Filtros Accionables:** Permitir al operador limpiar el ruido visual rápidamente.
- **Consistencia v4.5.0:** Mantener la lógica de negocio y contratos de datos existentes.

## 2. REGLAS DE AGRUPACIÓN (TRIAGE SECTIONS)
Las alertas se agruparán en las siguientes secciones (en orden de prioridad descendente):
1. **🚨 Críticas / SLA Vencido:** Alertas con `severity: 'critical'` o `sla.status: 'BREACHED'`.
2. **⚠️ En Riesgo:** Alertas con `severity: 'warning'` o `sla.status: 'AT_RISK'`.
3. **🔔 Abiertas:** Alertas en estado `open` o `acknowledged` que no caen en las categorías anteriores.
4. **⏳ Pospuestas (Snoozed):** Alertas en estado `snoozed`.
5. **✅ Resueltas Recientes:** Alertas en estado `resolved`.

## 3. FILTROS Y BÚSQUEDA
Barra sticky superior con:
- **Búsqueda:** Filtro por texto en título, descripción, ruleCode u organización.
- **Estado:** Select múltiple (OPEN, ACK, SNOOZED, RESOLVED).
- **Severidad:** Select múltiple (CRITICAL, WARNING, INFO).
- **SLA:** Filtro rápido (VENCIDO, EN RIESGO, OK).
- **Toggle "Solo Accionables":** Oculta automáticamente `snoozed` y `resolved`.

## 4. POLÍTICA DE DENSIDAD
- **Modo Cómodo (Default):** Similar al diseño v4.5.0, con espaciado amplio y toda la descripción visible.
- **Modo Compacto:** 
  - Altura de card reducida (~30% menos).
  - Descripción truncada a 1 línea.
  - Badges y CTAs más pequeños.
  - Ideal para monitores grandes o alta carga operativa.

## 5. PANEL DE TRIAGE (DERECHO)
El panel derecho se convierte en una herramienta táctica:
- **Resumen Numérico:** Contadores vivos por grupo de triage.
- **Shortcuts de Filtrado:** Botones rápidos para "Ver Críticas", "Ver SLA Vencido".
- **Estado de Triage:** Indicador visual de la salud general de la cola.

## 6. QA VISUAL Y FUNCIONAL
- [ ] Secciones colapsables con contadores correctos.
- [ ] Críticas siempre al principio.
- [ ] Filtros actúan en tiempo real (o pseudo-tiempo real en cliente).
- [ ] Toggle de densidad cambia layout sin romper componentes.
- [ ] Acciones (ACK/SNOOZE/RESOLVE) funcionan y refrescan la sección correspondiente.
- [ ] Sin fugas visuales (`[object Object]`).
