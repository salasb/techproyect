# POLÍTICA DE TIPO DE CAMBIO USD/CLP (v1.0)
Fecha: 18 de Marzo, 2026
Autor: Principal Product Engineer

## 1. DEFINICIONES

El sistema utiliza un esquema de tipo de cambio compuesto para proteger el margen comercial y cubrir variaciones intradía.

### A. USD Observado (Oficial)
- **Descripción:** Valor oficial del dólar para el día actual.
- **Fuente:** Banco Central de Chile (obtenido vía API de mindicador.cl).
- **Actualización:** Cada 1 hora (cacheado en servidor).

### B. Recargo Comercial
- **Descripción:** Valor fijo en CLP que se suma al USD Observado.
- **Propósito:** Cobertura de riesgo cambiario y comisiones bancarias.
- **Configuración:** Definido globalmente en "Configuración > Parámetros Generales".
- **Default:** +5 CLP.

### C. USD Aplicado (Final)
- **Fórmula:** `USD Aplicado = USD Observado + Recargo Comercial`
- **Uso:** Este es el valor que se utiliza para todos los cálculos de conversión de moneda en proyectos, cotizaciones y reportes financieros.

## 2. CONTRATO UX

### Visualización en Finanzas
Cuando un proyecto o cálculo utilice USD, se debe mostrar un bloque informativo con el desglose:
- Valor observado hoy.
- Recargo comercial aplicado.
- Valor final resultante.
- Fecha y fuente de la referencia.

## 3. FALLBACK Y ERRORES

Si la fuente oficial (mindicador.cl) no responde:
1. Se utiliza el último valor exitoso registrado o el fallback estático del sistema (855 CLP).
2. Se aplica el **Recargo Comercial** sobre dicho fallback.
3. Se indica claramente en la UI que el valor es "Referencial" debido a un fallo en la sincronización.

## 4. PERSISTENCIA
El recargo comercial se almacena en la tabla `Settings` campo `dollarSurcharge`.
