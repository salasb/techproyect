# AUDITORÍA DE UI Y ONBOARDING (v1.0)
Fecha: 17 de Marzo, 2026
Estado: AUDITORÍA COMPLETADA - EN EJECUCIÓN

## 1. DETALLE DE PROYECTO: OVERFLOW HORIZONTAL

### Causa Raíz
1.  **Tabs de Navegación:** El componente de navegación por pestañas en `ProjectDetailView.tsx` intenta forzar el estiramiento de todos los ítems (`flex-1`) en anchos móviles/tablet, pero al tener 8 pestañas, el ancho mínimo acumulado supera el viewport.
2.  **CTAs del Header:** Los botones de acción (Cotización, Estados, etc.) están en un contenedor `flex` sin capacidad de `wrap`, lo que empuja el borde derecho de la página en resoluciones intermedias.
3.  **Grillas Rígidas:** El uso de `lg:grid-cols-3` sin ajustes finos para la columna de finanzas causa que el contenido financiero (tablas y totales) desborde si el contenedor es demasiado estrecho.

### Decisión de Diseño
- Implementar `flex-wrap` en CTAs superiores.
- Convertir la navegación por pestañas en un contenedor con **scroll horizontal local** suavizado, evitando que empuje el layout global.
- Asegurar `min-w-0` en hijos flex críticos.

## 2. DASHBOARD: GUÍA DE ACTIVACIÓN

### Causa Raíz
- La lógica de renderizado en `dashboard/page.tsx` solo valida la existencia de la organización (`orgId`), ignorando el estado real de uso del sistema.
- No existe una bandera de "onboarding completado" ni una validación de volumen de datos (ej. ocultar si proyectos > 0).

### Criterio de Visibilidad (Nuevo Contrato)
Ocultar la Guía de Activación si se cumple **CUALQUIERA** de estas condiciones:
1.  El usuario ya tiene al menos 1 proyecto creado.
2.  El usuario ya tiene al menos 1 cotización generada.
3.  La organización está en modo operativo avanzado (validado por `orgStats`).

## 4. IMPLEMENTACIÓN FINAL

### Detalle de Proyecto (Fix Responsivo)
- **Header:** Se aplicó `flex-col md:flex-row` con `min-w-0` y `truncate` para manejar nombres largos sin overflow.
- **CTAs:** Los botones de acción ahora usan `flex-wrap`, permitiendo que se acomoden automáticamente en pantallas estrechas.
- **Tabs:** Implementado sistema de **Local Horizontal Scroll** con `overflow-x-auto` y soporte para `touch-pan-x`. Esto garantiza que el layout principal se mantenga dentro del 100vw.
- **Grilla:** Se optimizó el comportamiento de la barra lateral financiera para ser totalmente fluida.

### Dashboard (Onboarding Inteligente)
- **Lógica de Visibilidad:** La guía de activación ahora depende de datos reales (`projects.length`).
- **Comportamiento:**
    - `proyectos === 0`: Se muestra la guía para incentivar la adopción.
    - `proyectos > 0`: La guía se remueve automáticamente, limpiando el área de trabajo operativa.
- **Fuente de Verdad:** Se utiliza el estado consolidado de la base de datos (Prisma), lo que hace la solución inmune a la pérdida de cookies de sesión.

## 5. CONCLUSIÓN
El sistema ahora ofrece una experiencia profesional tanto en el primer contacto (Dashboard limpio) como en el uso intensivo (Detalle de Proyecto sin errores de scroll).
