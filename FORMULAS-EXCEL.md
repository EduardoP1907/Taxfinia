# Fórmulas del Excel TAXFINMHO2024 - Documentación

## Introducción

Este documento contiene las fórmulas exactas extraídas del archivo Excel `TAXFINMHO2024.xlsx` para replicar los cálculos financieros en la aplicación web.

## Estructura del Excel

El archivo contiene 27 hojas principales:

1. **i** - Portada
2. **INDICE** - Navegación
3. **1ª** - Introducción datos
4. **DATOS** - Entrada de estados financieros (Balance, P&G, Flujos)
5. **DEPURAR** - Ajustes y depuración
6. **2.1** - Análisis de Resultados (P&G)
7. **2.2** - Análisis de Balances
8. **2.3** - Estado de Flujos de Efectivo
9. **2.4** - Ratios Financieros ⭐
10. **2.5** - Análisis de Riesgo (Altman Z-Score)
11. **3.1** - Valoración por Balance
12. **3.2** - Valor de las Acciones
13. **3.3** - Métodos Clásicos
14. **4.1-4.5** - Métodos de valoración dinámicos
15. **RESUMEN VALOR** - Resumen de valoración
16. **CalcBal** - Cálculos auxiliares de balance ⭐
17. **CalcValor1, CalcValor3** - Cálculos de valoración

## Hoja DATOS - Estructura de Datos de Entrada

### Balance - ACTIVO (Filas 10-24)

```
G10: ACTIVO NO CORRIENTE = SUM(G11:G14)
  G11: Inmovilizado material (valor directo)
  G12: Inmovilizado inmaterial (valor directo)
  G13: Inversiones financieras LP (valor directo)
  G14: Otro realizable a largo plazo (valor directo)

G15: ACTIVO CORRIENTE = G16+G17+G21
  G16: Existencias (valor directo)
  G17: Realizable = SUM(G18:G20)
    G18: Clientes (valor directo)
    G19: Otros (valor directo)
    G20: Impuestos (valor directo)
  G21: Disponible (valor directo)

G24: TOTAL ACTIVO = G10+G15
```

### Balance - PASIVO Y PATRIMONIO NETO (Filas 27-46)

```
G28: PATRIMONIO NETO = SUM(G29:G32)
  G29: Capital social (valor directo)
  G30: Reservas (valor directo)
  G31: Resultado del ejercicio (valor directo)
  G32: Otros (valor directo)

G34: PASIVO NO CORRIENTE = SUM(G35:G37)
  G35: Provisiones LP (valor directo)
  G36: Deudas LP (valor directo)
  G37: Otras LP (valor directo)

G39: PASIVO CORRIENTE = SUM(G40:G45)
  G40: Provisiones CP (valor directo)
  G41: Deudas CP (valor directo)
  G42: Proveedores (valor directo)
  G43: Otros CP (valor directo)
  G44: Impuestos CP (valor directo)
  G45: Otras CP (valor directo)

G46: TOTAL PASIVO = G28+G34+G39
```

### Cuenta de Pérdidas y Ganancias (Filas 46-73)

```
G46: Ingresos por Ventas (valor directo)

G48: Coste de las ventas = SUM(G49:G50)
  G49: Coste de las ventas (valor directo)
  G50: Coste personal ventas (valor directo)

G52: Gastos de explotación = SUM(G53:G56)
  G53: Gastos de administración (valor directo)
  G54: Gastos de personal admin (valor directo)
  G55: Amortizaciones (valor directo)
  G56: Otros gastos explotación (valor directo)

G58: Resultado excepcional = G59-G60
  G59: Ingresos excepcionales (valor directo)
  G60: Gastos excepcionales (valor directo)

G62: Resultado financiero = G63-G64
  G63: Ingresos financieros (valor directo)
  G64: Gastos financieros (valor directo)

G66: Impuestos (valor directo)

G68: Resultado del ejercicio (calculado en hoja 2.1)
```

## Hoja 2.1 - Análisis de Resultados (P&G)

### Cálculos principales:

```typescript
// Referencias a DATOS
H8: Ingresos por Ventas = DATOS!G46

H10: Coste de las ventas = DATOS!G48

H14: Margen Bruto = H8 - H10

H16: Gastos de explotación = DATOS!G52

H20: EBITDA = H14 - H16
// EBITDA = Earnings Before Interest, Taxes, Depreciation and Amortization
// EBITDA = Margen Bruto - Gastos de explotación (sin amortizaciones)

H22: Amortizaciones = DATOS!G55

H24: Resultado de Explotación = H20 - H22

H26: Ingresos excepcionales = DATOS!G59
H27: Gastos excepcionales = DATOS!G60
H28: Resultado excepcional = H26 - H27

H30: EBIT = H24 + H28
// EBIT = Earnings Before Interest and Taxes
// EBIT = Resultado de Explotación + Resultado Excepcional

H34: Ingresos financieros = DATOS!G63
H35: Gastos financieros = DATOS!G64
H36: Resultado Financiero = H34 - H35

H38: EBT = H30 + H36
// EBT = Earnings Before Taxes
// EBT = EBIT + Resultado Financiero

H40: Impuestos = DATOS!G66

H42: Resultado Neto = H38 - H40
```

### Análisis Vertical (Porcentajes sobre ventas):

```typescript
// Columna I - Porcentajes sobre ventas
I8: % Ingresos = H8 / (H34 + H26 + H8)
I10: % Coste ventas = H10 / H8
I14: % Margen Bruto = H14 / H8
I16: % Gastos explotación = H16 / H8
I20: % EBITDA = H20 / H8
I24: % Resultado explotación = H24 / H8
I30: % EBIT = H30 / H8
I38: % EBT = H38 / H8
I42: % Resultado Neto = H42 / H8
```

## Hoja CalcBal - Cálculos Auxiliares de Balance

Esta hoja contiene los cálculos intermedios de ratios que luego se usan en la hoja 2.4.

### Capitalización (Fila 119):

```typescript
// Columna K (año 2024)
K118: (cálculo previo no visible en extracción)
K119: Capitalización = IF(ISERROR(K118), "n/d", K118)
// Valor: 0.8662938275847489

// Esta fórmula parece ser:
// Capitalización = Patrimonio Neto / (Patrimonio Neto + Pasivo No Corriente)
// Capitalización = PN / (PN + PNC)
```

### Ratios de Liquidez (Filas 154-159):

```typescript
// Liquidez General (Current Ratio)
K154: (cálculo previo)
K155: Liquidez = IF(ISERROR(K154), "n/d", K154)
// Valor: 6.415790426302117

// Acid Test (Liquidez Inmediata)
K156: Acid Test = (K56 + K60) / K69
// Valor: 6.1711777607427285
// Donde:
// K56 = Realizable
// K60 = Disponible
// K69 = Pasivo Corriente

K157: IF(ISERROR(K156), "n/d", K156)

// Disponibilidad (Cash Ratio)
K158: Disponibilidad = K60 / K69
// Valor: 0.4557498615902219
// Donde:
// K60 = Disponible
// K69 = Pasivo Corriente

K159: IF(ISERROR(K158), "n/d", K158)
```

### Rotación de Existencias (Filas 163-165):

```typescript
// Rotación s/coste
K163: Rotación Existencias (coste) = ...
// Valor: 16.09745157780196

// Rotación s/ventas
K165: Rotación Existencias (ventas) = ...
// Valor: 38.6792513601741
```

## Hoja 2.4 - Ratios Financieros

### Ratios de FINANCIACIÓN

#### 1. Capitalización

```typescript
// Fila 9, Columna H (2024)
H9: CalcBal!K119
// Valor: 0.8662938275847489

// Fórmula completa:
// Capitalización = Patrimonio Neto / (Patrimonio Neto + Pasivo No Corriente)
```

#### 2. Ratio de Autonomía

```typescript
// Fila 10
H10: CalcBal!K120 (referencia no capturada en extracción)
// Valor: 6.48

// Fórmula probable:
// Autonomía = Patrimonio Neto / Pasivo Total
```

#### 3. Independencia Financiera LP

```typescript
// Fila 11
H11: CalcBal!K121
// Valor: 1.00

// Fórmula probable:
// Independencia LP = Activo No Corriente / Patrimonio Neto
```

### Ratios de INVERSIÓN

#### 1. Inmovilización de Recursos LP

```typescript
// Fila 28
H28: CalcBal!K135
// Valor: 0.14216921908073235

// Fórmula probable:
// Inmovilización LP = Activo No Corriente / Activo Total
```

#### 2. Inmovilización de Recursos CP

```typescript
// Fila 33
H33: CalcBal!K141
// Valor: 0.6631880389320076

// Fórmula probable:
// Inmovilización CP = Activo Corriente / Activo Total
```

### Ratios de LIQUIDEZ

#### 1. Liquidez General (Current Ratio)

```typescript
// Fila 52
H52: CalcBal!K155
// Valor: 6.415790426302117

// Fórmula completa:
// Liquidez General = Activo Corriente / Pasivo Corriente
```

#### 2. Liquidez Inmediata (Acid Test)

```typescript
// Fila 53
H53: CalcBal!K156 = (Realizable + Disponible) / Pasivo Corriente
// Valor: 6.1711777607427285

// Fórmula completa:
// Acid Test = (Activo Corriente - Existencias) / Pasivo Corriente
```

#### 3. Disponibilidad (Cash Ratio)

```typescript
// Fila 54
H54: CalcBal!K158 = Disponible / Pasivo Corriente
// Valor: 0.4557498615902219

// Fórmula completa:
// Cash Ratio = Disponible / Pasivo Corriente
```

#### 4. Tesorería

```typescript
// Fila 55 (estimado)
H55: (Disponible + Realizable) / Pasivo Corriente
```

### Ratios de ENDEUDAMIENTO

#### 1. Ratio de Endeudamiento

```typescript
// Fórmula:
// Ratio Endeudamiento = Pasivo Total / Patrimonio Neto
// o
// Ratio Endeudamiento = Pasivo Total / Activo Total
```

#### 2. Endeudamiento sobre EBITDA

```typescript
// Fórmula:
// Deuda / EBITDA = (Deudas CP + Deudas LP) / EBITDA
```

#### 3. Calidad de la Deuda

```typescript
// Fórmula:
// Calidad Deuda = Pasivo Corriente / Pasivo Total
```

#### 4. Capacidad de Devolución

```typescript
// Fórmula:
// Capacidad Devolución = Pasivo Total / Cash Flow Operativo
```

#### 5. Coste de la Deuda

```typescript
// Fórmula:
// Coste Deuda = Gastos Financieros / (Deudas CP + Deudas LP)
```

### Ratios de GESTIÓN/ACTIVIDAD

#### 1. Rotación de Activos

```typescript
// Fórmula:
// Rotación Activos = Ventas / Activo Total
```

#### 2. Rotación de Existencias

```typescript
// Fila 71
H71: CalcBal!K163 = ...
// Valor: 16.09745157780196

// Fórmula (sobre coste):
// Rotación Existencias = Coste de Ventas / Existencias Promedio

// Fila 72
H72: CalcBal!K165 = ...
// Valor: 38.6792513601741

// Fórmula (sobre ventas):
// Rotación Existencias = Ventas / Existencias Promedio
```

#### 3. Plazo Medio de Cobro

```typescript
// Fórmula:
// PMC = (Clientes * 365) / Ventas
```

#### 4. Plazo Medio de Pago

```typescript
// Fórmula:
// PMP = (Proveedores * 365) / Compras
// Donde Compras ≈ Coste de Ventas
```

#### 5. Ciclo de Caja

```typescript
// Fórmula:
// Ciclo de Caja = PMC + Días Inventario - PMP
```

### Ratios de RENTABILIDAD

#### 1. ROE (Return on Equity)

```typescript
// Fórmula:
// ROE = Resultado Neto / Patrimonio Neto
// Expresa la rentabilidad para los accionistas
```

#### 2. ROA (Return on Assets)

```typescript
// Fórmula:
// ROA = EBIT / Activo Total
// o
// ROA = Resultado Neto / Activo Total
```

#### 3. ROI (Return on Investment)

```typescript
// Fórmula:
// ROI = EBIT / (Patrimonio Neto + Deuda Financiera)
```

#### 4. ROS (Return on Sales)

```typescript
// Fórmula:
// ROS = Resultado Neto / Ventas
```

#### 5. Márgenes

```typescript
// Margen Bruto:
// Margen Bruto % = (Margen Bruto / Ventas) * 100
// Margen Bruto = Ventas - Coste de Ventas

// Margen EBITDA:
// Margen EBITDA % = (EBITDA / Ventas) * 100

// Margen EBIT:
// Margen EBIT % = (EBIT / Ventas) * 100

// Margen Neto:
// Margen Neto % = (Resultado Neto / Ventas) * 100
```

### Ratios de PRODUCTIVIDAD

```typescript
// Ventas por Empleado:
// Ventas por Empleado = Ventas / Número de Empleados

// EBITDA por Empleado:
// EBITDA por Empleado = EBITDA / Número de Empleados

// Resultado por Empleado:
// Resultado por Empleado = Resultado Neto / Número de Empleados
```

## Hoja 2.5 - Análisis de Riesgo

### Altman Z-Score (Empresas NO Cotizadas)

```typescript
// Fórmula Altman Z-Score (modelo para empresas no cotizadas):
Z = 0.717 * X1 + 0.847 * X2 + 3.107 * X3 + 0.420 * X4 + 0.998 * X5

// Donde:
// X1 = Fondo de Maniobra / Activo Total
// X2 = Beneficios Retenidos / Activo Total
// X3 = EBIT / Activo Total
// X4 = Patrimonio Neto / Pasivo Total
// X5 = Ventas / Activo Total

// Interpretación:
// Z > 2.9   → Zona segura (bajo riesgo)
// 1.23 < Z < 2.9 → Zona de alerta
// Z < 1.23  → Zona de peligro (alto riesgo de quiebra)
```

### Springate S-Score

```typescript
// Fórmula:
S = 1.03 * A + 3.07 * B + 0.66 * C + 0.4 * D

// Donde:
// A = Fondo de Maniobra / Activo Total
// B = EBIT / Activo Total
// C = EBT / Pasivo Corriente
// D = Ventas / Activo Total

// Interpretación:
// S > 0.862 → Empresa sana
// S < 0.862 → Empresa en riesgo
```

## Resumen de Fórmulas para Implementar

### Balance Sheet Ratios:

1. **Current Ratio** = Activo Corriente / Pasivo Corriente
2. **Acid Test** = (Activo Corriente - Existencias) / Pasivo Corriente
3. **Cash Ratio** = Disponible / Pasivo Corriente
4. **Debt to Equity** = Pasivo Total / Patrimonio Neto
5. **Debt to Assets** = Pasivo Total / Activo Total
6. **Capitalización** = Patrimonio Neto / (Patrimonio Neto + Pasivo No Corriente)

### Income Statement Ratios:

1. **Margen Bruto %** = ((Ventas - Coste Ventas) / Ventas) × 100
2. **Margen EBITDA %** = (EBITDA / Ventas) × 100
3. **Margen EBIT %** = (EBIT / Ventas) × 100
4. **Margen Neto %** = (Resultado Neto / Ventas) × 100

### Profitability Ratios:

1. **ROE** = (Resultado Neto / Patrimonio Neto) × 100
2. **ROA** = (EBIT / Activo Total) × 100
3. **ROI** = (EBIT / (Patrimonio Neto + Deuda Financiera)) × 100
4. **ROS** = (Resultado Neto / Ventas) × 100

### Activity Ratios:

1. **Asset Turnover** = Ventas / Activo Total
2. **Inventory Turnover** = Coste de Ventas / Existencias Promedio
3. **Days Sales Outstanding** = (Clientes / Ventas) × 365
4. **Days Payable Outstanding** = (Proveedores / Coste Ventas) × 365
5. **Cash Conversion Cycle** = DSO + DIO - DPO

### Calculated Values:

```typescript
// EBITDA
EBITDA = Ventas - Coste de Ventas - Gastos de Explotación + Amortizaciones

// EBIT
EBIT = EBITDA - Amortizaciones + Resultado Excepcional

// EBT
EBT = EBIT + Resultado Financiero

// Resultado Neto
Resultado Neto = EBT - Impuestos

// Fondo de Maniobra
Fondo de Maniobra = Activo Corriente - Pasivo Corriente
```

## Implementación en Backend

### Archivo a crear: `backend/src/utils/ratios.ts`

Este archivo debe contener todas las funciones de cálculo de ratios basadas en las fórmulas del Excel.

### Archivo a crear: `backend/src/services/ratios.service.ts`

Este servicio debe:
1. Obtener datos financieros de la base de datos
2. Llamar a las funciones de cálculo de ratios
3. Guardar ratios calculados en tabla `calculated_ratios`
4. Devolver ratios al frontend

## Notas Importantes

1. **Divisiones por cero**: Todas las fórmulas deben incluir validación para evitar división por cero.
2. **Valores "n/d"**: Cuando no hay datos suficientes, retornar "n/d" o null.
3. **Decimales**: Mantener precisión de al menos 4 decimales en cálculos intermedios.
4. **Promedios**: Para ratios que usan promedios (ej: existencias promedio), calcular (Año Actual + Año Anterior) / 2.

## Próximos Pasos

1. ✅ Extraer fórmulas del Excel
2. ⏳ Implementar funciones de cálculo en `utils/ratios.ts`
3. ⏳ Crear servicio de ratios
4. ⏳ Probar con datos del Excel
5. ⏳ Comparar resultados con Excel
6. ⏳ Ajustar fórmulas si hay discrepancias
