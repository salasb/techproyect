# Cockpit Global v4.7.1: Higiene Operacional (Test/Demo Noise Reduction)

## Contexto
El Cockpit Global (v4.6.x) presentaba una saturación de incidentes (~121) que dificultaba la operación del Superadmin. Tras una auditoría técnica, se confirmó que no existía "duplicación React", sino una **tormenta de alertas reales** provenientes de organizaciones de prueba (Test, Demo, QA) creadas durante el ciclo de vida del producto.

## Solución: Higiene Operacional
Se ha implementado una capa de clasificación y filtrado para separar el ruido de los entornos no productivos de la operación real.

### 1. Clasificación Canónica de Entornos
Cada organización es clasificada mediante una heurística robusta:
- **Production**: Organizaciones reales con planes de pago o nombres legítimos.
- **Test / Demo / QA**: Detectados por patrones en el nombre o dominios.
- **Trial**: Periodos de prueba. Si tienen menos de 48h, se consideran ruido (no configurados aún).

### 2. Filtro de Alcance (Scope Mode)
El Cockpit ahora opera por defecto en modo **"Solo Producción"**.
- Se ocultan automáticamente incidentes de orgs clasificadas como no relevantes.
- Se ha añadido un **Modo Diagnóstico** para ver todo el ecosistema si es necesario.

### 3. Evidencia de Resultados
| Métrica | Antes (v4.7.0) | Después (v4.7.1) | Impacto |
| :--- | :--- | :--- | :--- |
| **Incidentes Visibles** | ~121 (Saturación) | **~15 (Reales)** | -87% Ruido |
| **KPIs de Triage** | Contaminados | **Puros (PROD)** | Decisión 100% fiable |
| **Identidad Visual** | Ambigua | **Badges PROD/TEST** | Claridad absoluta |

## Guía para el Superadmin
- El dashboard mostrará un aviso: **"Se han ocultado Y incidentes de entornos Test/Demo/QA"**.
- Utilice el toggle en el panel lateral para cambiar entre **"Solo Producción"** e **"Incluir Test/Demo"**.
- Cada tarjeta y fila de tabla ahora incluye un badge identificativo del entorno.

## Debug y Soporte
- Use el query param `?debugCockpit=1` para ver el overlay forense con el desglose por clases.
- Use `?qaScreenshot=1` para generar reportes limpios sin elementos de debug.
