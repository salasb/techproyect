# AUDITORÍA DE LAYOUT Y TIPO DE CAMBIO (v1.0)
Fecha: 17 de Marzo, 2026
Estado: AUDITORÍA COMPLETADA - EN EJECUCIÓN

## 1. DETALLE DE PROYECTO: OVERFLOW HORIZONTAL

### Causa Raíz Exacta
1.  **Header Actions (`flex gap-2 justify-end`):** Los botones superiores no tienen capacidad de `wrap`, lo que empuja el borde derecho de la página en anchos menores a 1280px si hay múltiples CTAs visibles.
2.  **Navigation Tabs:** El contenedor de pestañas (`TabsList` equivalente) intenta mantener todos los ítems visibles sin scroll lateral, colisionando en resoluciones de tablet.
3.  **Sticky Finance Panel:** El panel derecho en `lg:grid-cols-3` no tiene un ancho mínimo flexible, provocando que el contenido central (pestañas de finanzas) se comprima hasta desbordar.

### Decisión de Responsive
- Implementar `flex-wrap` en CTAs superiores con alineación dinámica.
- Convertir la navegación de pestañas en un contenedor con **scroll horizontal local** suavizado.
- Ajustar la grilla principal para pasar de 1 a 3 columnas de forma más fluida, asegurando que los contenedores financieros tengan `min-w-0`.

## 2. MONEDA USD Y TIPO DE CAMBIO

### Contrato UX
- Si el proyecto está en USD, se mostrará un banner informativo en el panel de Finanzas con el valor del dólar del día.
- **Fuente de Verdad:** Se migrará a una integración más robusta o se etiquetará claramente la fuente oficial. (Banco Central vía Mindicador o API BDE).
- **Cálculos:** El sistema utiliza el tipo de cambio para mostrar equivalencias en CLP/UF, permitiendo una visión bimoneda transparente.

### Fallback
- Si la API externa falla, se utilizará el último valor cacheado o el fallback estático (855 CLP/USD), marcándolo como "Referencial".

## 3. CHECKLIST QA
- [ ] Detalle de Proyecto: Sin scroll horizontal global en resoluciones de 768px a 1920px.
- [ ] CTAs Superiores: Se apilan correctamente en móvil.
- [ ] Tabs: Desplazables lateralmente en móvil/tablet.
- [ ] USD: Valor del dólar visible con fecha y fuente.
- [ ] USD: Cambio de moneda en tiempo real actualiza las equivalencias.
