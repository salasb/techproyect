# Auditoría y Correcciones: Cotizaciones, Reportes y Rendimiento (v1.0)

## 1. Cotizaciones List: Duplicidad Visual
- **Causa Raíz:** En la vista de lista, se agrupaba por estado mostrando el badge del estado en el título del grupo (ej: "Borrador (3)") y a la vez el componente `QuoteListItem` internamente volvía a imprimir el badge `StatusBadge`. En la vista de grid, se generaba redundancia visual al no darle la suficiente jerarquía al nombre del cliente frente al estado.
- **Contrato Visual Corregido:** 
  - Vista Lista: El nombre de proyecto y cliente ahora tienen mayor predominancia tipográfica. 
  - Vista Tarjeta (Grid): Layout rediseñado. El `StatusBadge` aparece una sola vez en la esquina superior izquierda como ancla rápida. El nombre del cliente toma protagonismo inmediato. 
- **Decisión UX:** Reducir el ruido visual (menos elementos iterados) y maximizar el reconocimiento del cliente en el primer pantallazo, asegurando la elegancia de la tarjeta.

## 2. Reportes Financieros: Panel Vacío Confuso
- **Causa Raíz:** El cálculo de `totalRevenue` y métricas asociadas en proyectos 'Borrador' o sin ítems aceptados daba `0`. Sin embargo, la condicional `hasData` chequeaba únicamente `totalRevenue > 0 || projectsRaw.length > 0`. Esto causaba que, al existir proyectos borrador (sin revenue configurado), el panel renderizara todo en $0 y 0%, transmitiendo la falsa sensación de sistema "roto". 
  Además, la métrica "Cotizaciones Pendientes" evaluaba `p.status === 'EN_ESPERA'`, pero dicho estado del proyecto no asegura que exista una cotización enviada.
- **Corrección Funcional:**
  - `hasData` actualizado a: `totalRevenue > 0 || totalMargin > 0 || activeProjects > 0 || pendingQuotes > 0`.
  - La métrica de cotizaciones pendientes ahora es exacta a la lógica de negocio: `p.quoteSentDate && !p.acceptedAt`.
  - Se agregó un `empty state` amistoso si no se cumplen las métricas, explicando cómo se activa.

## 3. Vista Individual de Cotización: "Aceptación Digital" vs "Aceptar"
- **Causa Raíz:** El toggle "Aceptación Digital" estaba sobrecargado: al activarse, configuraba el `acceptedAt` a la fecha actual y forzaba el cambio de estado de la cotización, solapando funcionalmente lo que hacía el botón "Aceptar" del flujo principal, y causando duplicidad de intención y ambigüedad para el usuario.
- **Contrato Corregido:**
  - **Aceptar (Botón):** Acción comercial explícita que confirma la cotización y transiciona el estado del proyecto a EN_CURSO.
  - **Aceptación Digital (Toggle):** Acción de configuración puramente documental/sistémica (habilitar flujo o timbre en el PDF/Portal). Para soportarlo, se migró a depender del campo `digitalAcceptance` (Booleano) en el esquema Prisma, el cual predeterminadamente inicia activo para permitir que los clientes firmen digitalmente.

## 4. Header de Cotización: Reorganización UX
- **Correcciones:** Se agruparon las acciones en bloques lógicos y contextuales:
  - **Navegación:** Botón Volver reposicionado con mayor claridad.
  - **Acciones Principales:** Botones transaccionales (`Enviar`, `Aceptar`, `Rechazar`, `Revisar`).
  - **Configuración:** `Aceptación Digital` contenida como un toggle visual y sin bloquear estado.
  - **Exportación:** Impresión, descarga y Compartir unificados en el extremo derecho.
  Todo el panel se consolidó dentro del contenedor con fondo blanco elevando el peso visual.

## 5. Performance General (Dashboard)
- **Causa Raíz:** El `DashboardPage` ejecutaba 10 peticiones SQL (`Promise.all`) + API calls externas, reteniendo todo el hilo de renderizado del Server Component a la espera de que todas se resolvieran (incluyendo un timeout forzado de 3 segundos para el motor Sentinel). 
- **Estrategia Aplicada:**
  - **Streaming / Suspense:** Se extrajo toda la carga de datos a un componente interno asíncrono (`DashboardContent`) envuelto en `<Suspense>`, permitiendo que la interfaz "cáscara" (sidebar, topbar, background) renderice instantáneamente.
  - El usuario ya no siente la pantalla bloqueada, sino que percibe una carga por bloques fluida.

## 6. Observabilidad Aplicada
- Se inyectó log transaccional con esquema estándar (`traceId`, `route`, `user`, `durationMs`, `sourceOfTruth`, `result`) en la carga de:
  - Listado de Cotizaciones (`/quotes`)
  - Reportes Financieros (`/reports`)
  - Dashboard Base (`/dashboard`)
  - Vista Detalle Cotización (`/projects/[id]/quote`)

## 7. QA Checklist de Cierre
- [x] CASO 1: "Borrador" aparece una sola vez por tarjeta/listado.
- [x] CASO 2: Cliente tiene mejor jerarquía (legibilidad tipográfica) y no compite con el estado.
- [x] CASO 3: Reportes en $0 despliegan "Empty State" claro, si no hay proyectos EN_CURSO ni totalRevenue.
- [x] CASO 4: Botón "Aceptar" cambia estado. Toggle "Aceptación Digital" solo habilita la configuración mediante la nueva variable de BD.
- [x] CASO 5: Dashboard no bloquea el FCP inicial y utiliza `<Suspense>`.
- [x] CASO 6: No regresión completada y lint/build sin errores críticos.
