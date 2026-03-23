# OLA 1B: Dashboard Multi-Moneda (No Hardcode)

## Problema Detectado
El componente `DashboardKPIs` tenía hardcodeado el formateo de moneda en `CLP` (`es-CL`). Esto provocaba que incluso si una organización configuraba su cuenta en `USD` o `UF`, los indicadores comerciales del dashboard mostraran el símbolo `$` chileno y sin decimales, rompiendo la experiencia de usuario para clientes internacionales o especializados.

## Solución Implementada
Se ha refactorizado el componente de KPIs para que sea dinámico y respete la configuración de moneda de la organización.

### Cambios Clave:
1. **Componente Parametrizado:** `DashboardKPIs` ahora acepta las props `currency` y `locale`.
2. **Formateador Dinámico:** Se reemplazó el `Intl.NumberFormat` estático por uno que utiliza las props recibidas. Además, maneja la precisión de decimales de forma inteligente (0 decimales para CLP, 2 para el resto).
3. **Inyección desde Page:** La página del dashboard ahora pasa la moneda configurada en `Settings` y determina el locale adecuado (`en-US` para USD, `es-CL` para el resto) en tiempo de renderizado.

## Archivos Modificados
- `src/components/dashboard/DashboardKPIs.tsx`
- `src/app/(dashboard)/dashboard/page.tsx`

## Resultado
El Dashboard ahora es visualmente coherente con la realidad financiera del negocio. Una organización en USD verá indicadores en formato internacional (`USD $1,234.56`) de forma automática.
