# RESOLUCIÓN DE LAYOUT Y MONEDA: DETALLE DE PROYECTO (v1.0)
Fecha: 17 de Marzo, 2026
Estado: FINALIZADO

## 1. DIAGNÓSTICO DE CAUSA RAÍZ

### Overflow Horizontal
- **CTAs del Header:** El contenedor `flex` de acciones superiores obligaba a todos los botones a estar en una sola línea, desbordando el ancho en resoluciones < 1440px.
- **Tabs de Navegación:** La barra de pestañas forzaba un ancho mínimo basado en el texto de los 8 módulos, sin permitir el wrap ni el scroll interno.

### Selector de Moneda
- Estaba ubicado en el header global, ocupando espacio valioso y permitiendo cambios de moneda en contextos donde no era relevante (ej. Bitácora o Configuración), lo que generaba confusión UX.

## 2. CAMBIOS IMPLEMENTADOS

### Saneamiento de Layout
- **Header:** Se aplicó `flex-wrap` y `flex-col md:flex-row` para asegurar que el título y las acciones se adapten al ancho disponible.
- **Tabs:** Implementado **Local Horizontal Scroll**. Las pestañas ahora fluyen lateralmente en dispositivos táctiles o pantallas estrechas sin empujar el layout de la página.
- **Contenedores:** Se añadió `min-w-0` y `truncate` en elementos clave para asegurar el comportamiento de encogimiento (shrink).

### Gestión de Moneda (USD/CLP)
- **Reubicación:** El selector de moneda ahora vive exclusivamente en la pestaña **Finanzas**.
- **Información FX:** Se añadió un bloque de transparencia financiera cuando se visualiza en USD:
    - Tasa de cambio: Valor observado.
    - Fuente: Banco Central de Chile (via Mindicador API).
    - Fecha: Fecha de vigencia del valor obtenido.
- **Fallback:** En caso de fallo de la API de indicadores, el sistema usa el fallback persistido sin romper la UI.

## 3. EVIDENCIA QA
- [x] Detalle de Proyecto: Cero scroll horizontal global en 1024px y 1280px.
- [x] Tabs: Desplazables en móvil sin overflow.
- [x] Moneda: Switch visible solo en "Finanzas".
- [x] FX Info: Bloque emerald visible al activar USD con fuente clara.
