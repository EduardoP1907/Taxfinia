---
name: taxfinia-financial-context
description: Contexto financiero completo del proyecto TAXFINIA — fórmulas Excel, estructura de hojas, patrones de cálculo, ratios financieros y flujo de implementación.
---

# Taxfinia Financial Context

Skill de contexto para el proyecto **TAXFINIA**: aplicación web que replica los cálculos financieros del archivo Excel `TAXFINMHO2024.xlsx` (27 hojas, 638+ fórmulas). Toda fórmula en el backend **debe coincidir exactamente** con el Excel.

## Cuándo usar esta skill

Actívala siempre que necesites:
- Implementar o corregir un ratio o cálculo financiero
- Entender la estructura de hojas del Excel y sus referencias
- Agregar un nuevo campo al Balance, P&G o Flujo de Caja
- Depurar discrepancias entre resultados de la app y el Excel
- Seguir las convenciones del proyecto para código financiero

## Estructura del Excel TAXFINMHO2024.xlsx

### Hojas de entrada
| Hoja | Propósito |
|------|-----------|
| **DATOS** | Datos de entrada: Balance (filas 10-46), P&G (46-68), Flujos |
| **DEPURAR** | Ajustes y correcciones de datos |

### Hojas de cálculo (fuente de fórmulas)
| Hoja | Propósito |
|------|-----------|
| **CalcBal** | Cálculos auxiliares de balance — la mayoría de ratios se derivan de aquí |
| **2.1** | Análisis de Resultados (P&G): EBITDA, EBIT, márgenes |
| **2.2** | Análisis de Balance |
| **2.3** | Estado de Flujos de Efectivo |
| **2.4** | Ratios Financieros ⭐ — referencia principal |
| **2.5** | Análisis de Riesgo: Altman Z-Score, Springate |

### Hojas de valoración
| Hoja | Propósito |
|------|-----------|
| **3.1-3.3** | Valoración estática (Balance, Acciones, Métodos Clásicos) |
| **4.1-4.5** | Valoración dinámica (DCF, EVA) |
| **RESUMEN VALOR** | Resumen de valoración |
| **CalcValor1, CalcValor3** | Cálculos intermedios de valoración |

## Estructura de datos de entrada (Hoja DATOS)

### Balance — ACTIVO
```
ACTIVO NO CORRIENTE (G10) = SUM(G11:G14)
  G11: Inmovilizado material        → tangibleAssets
  G12: Inmovilizado inmaterial      → intangibleAssets
  G13: Inversiones financieras LP   → financialInvestmentsLp
  G14: Otro realizable LP           → otherNoncurrentAssets

ACTIVO CORRIENTE (G15) = G16 + G17 + G21
  G16: Existencias                  → inventory
  G17: Realizable = G18+G19+G20
    G18: Clientes                   → accountsReceivable
    G19: Otros                      → otherReceivables
    G20: Impuestos                  → taxReceivables
  G21: Disponible                   → cashEquivalents

TOTAL ACTIVO (G24) = G10 + G15
```

### Balance — PASIVO Y PATRIMONIO NETO
```
PATRIMONIO NETO (G28) = SUM(G29:G32)
  G29: Capital social               → shareCapital
  G30: Reservas                     → reserves
  G31: Resultado del ejercicio      → retainedEarnings
  G32: Otros                        → treasuryStock (resta si es autocartera)

PASIVO NO CORRIENTE (G34) = SUM(G35:G37)
  G35: Provisiones LP               → provisionsLp
  G36: Deudas LP                    → bankDebtLp
  G37: Otras LP                     → otherLiabilitiesLp

PASIVO CORRIENTE (G39) = SUM(G40:G45)
  G40: Provisiones CP               → provisionsSp
  G41: Deudas CP                    → bankDebtSp
  G42: Proveedores                  → accountsPayable
  G43: Otros CP                     → otherLiabilitiesSp
  G44: Impuestos CP                 → taxLiabilities
  G45: Otras CP                     (incluido en otherLiabilitiesSp)
```

### Cuenta de P&G
```
G46: Ingresos por Ventas            → revenue
G48: Coste de las ventas            → costOfSales (= G49 + G50)
  G49: Coste ventas                 → costOfSales
  G50: Coste personal ventas        → staffCostsSales
G52: Gastos de explotación          → (= G53 + G54 + G55 + G56)
  G53: Gastos administración        → adminExpenses
  G54: Gastos personal admin        → staffCostsAdmin
  G55: Amortizaciones               → depreciation
  G56: Otros gastos explotación     → (incluido en adminExpenses)
G59: Ingresos excepcionales         → exceptionalIncome
G60: Gastos excepcionales           → exceptionalExpenses
G63: Ingresos financieros           → financialIncome
G64: Gastos financieros             → financialExpenses
G66: Impuestos                      → incomeTax
```

## Cadena de cálculo de resultados (Hoja 2.1)

```
Ventas (revenue)
  − Coste de ventas (costOfSales + staffCostsSales)
  = Margen Bruto                         [H14]

Margen Bruto
  − Gastos explotación (adminExpenses + staffCostsAdmin)  ← SIN amortizaciones
  = EBITDA                               [H20]

EBITDA
  − Amortizaciones (depreciation)
  = Resultado de Explotación             [H24]

Resultado de Explotación
  + Resultado Excepcional (exceptionalIncome − exceptionalExpenses)
  = EBIT                                 [H30]

EBIT
  + Resultado Financiero (financialIncome − financialExpenses)
  = EBT                                  [H38]

EBT
  − Impuestos (incomeTax)
  = Resultado Neto                       [H42]
```

**CRÍTICO:** `EBITDA` NO incluye amortizaciones. Los `adminExpenses` en el código representan G53+G56 pero NO incluyen G55 (depreciación).

## Ratios implementados (Hoja 2.4 → CalcBal)

### Liquidez
| Ratio | Excel | Fórmula | Valor test |
|-------|-------|---------|------------|
| Liquidez General | H52 → CalcBal!K155 | AC / PC | 6.4158 |
| Acid Test | H53 → CalcBal!K156 | (AC − Existencias) / PC | 6.1712 |
| Disponibilidad | H54 → CalcBal!K158 | Disponible / PC | 0.4557 |

### Financiación
| Ratio | Excel | Fórmula | Valor test |
|-------|-------|---------|------------|
| Capitalización | H9 → CalcBal!K119 | PN / (PN + PNC) | 0.8663 |
| Autonomía | H10 | PN / Pasivo Total | 6.48 |

### Rentabilidad
| Ratio | Fórmula |
|-------|---------|
| ROE | (Resultado Neto / PN) × 100 |
| ROA | (EBITDA − Depreciación) / Activo Total × 100 ← usa Resultado Operativo, NO EBIT |
| ROI | (EBIT / (PN + Deuda Financiera)) × 100 |
| ROS | (Resultado Neto / Ventas) × 100 |

**IMPORTANTE ROA:** El Excel usa `Resultado Operativo = EBITDA − Depreciación` (hoja 4.1, G26), NO el EBIT (que incluye excepcionales).

### Actividad
| Ratio | Fórmula |
|-------|---------|
| Rotación Activos | Ventas / Activo Total |
| Rotación Existencias (coste) | Coste ventas / Existencias → K163 valor: 16.097 |
| Rotación Existencias (ventas) | Ventas / Existencias → K165 valor: 38.679 |
| Plazo Medio Cobro (DSO) | (Clientes / Ventas) × 365 |
| Plazo Medio Pago (DPO) | (Proveedores / Coste ventas) × 365 |
| Días Inventario (DIO) | (Existencias / Coste ventas) × 365 |
| Ciclo de Caja | DSO + DIO − DPO |

### Riesgo
```
Altman Z-Score (empresas no cotizadas):
  Z = 0.717×X1 + 0.847×X2 + 3.107×X3 + 0.420×X4 + 0.998×X5
  X1 = Fondo Maniobra / Activo Total
  X2 = Reservas / Activo Total
  X3 = EBIT / Activo Total
  X4 = PN / Pasivo Total
  X5 = Ventas / Activo Total
  Z > 2.9: zona segura | 1.23–2.9: zona gris | Z < 1.23: zona peligro

Springate S-Score:
  S = 1.03×A + 3.07×B + 0.66×C + 0.4×D
  A = Fondo Maniobra / Activo Total
  B = EBIT / Activo Total
  C = EBT / Pasivo Corriente
  D = Ventas / Activo Total
  S > 0.862: empresa sana | S < 0.862: empresa en riesgo
```

## Archivos clave del proyecto

```
backend/src/utils/ratios.ts          ← Funciones puras de cálculo (fuente de verdad)
backend/src/services/ratios.service.ts ← Orquestación: fetch DB + llamar ratios.ts
backend/src/controllers/              ← HTTP handlers
backend/prisma/schema.prisma          ← Modelos de base de datos
FORMULAS-EXCEL.md                     ← Documentación completa de fórmulas Excel
excel-analysis.json                   ← Export JSON de todas las fórmulas
ratios-formulas.json                  ← Fórmulas específicas de ratios
```

## Patrones de código obligatorios

### 1. Función pura en `utils/ratios.ts`
```typescript
// Sheet 2.4, Row XX → CalcBal!KYY
// Valor test: X.XXXX
export function calculateXxx(param: number, ...): number | null {
  if (denominator === 0) return null;   // SIEMPRE proteger división por cero
  return numerator / denominator;
}
```

### 2. Conversión de Decimal Prisma en `ratios.service.ts`
```typescript
function toNumber(value: Decimal | null | undefined): number {
  if (!value) return 0;
  return parseFloat(value.toString());
}
```

### 3. Manejo de null en respuestas API
```typescript
// Usar formatRatio() de utils/ratios.ts para display
formatRatio(value, 2)  // → "6.42" o "n/d" si null
```

### 4. Precisión decimal
- Cálculos intermedios: mínimo 4 decimales, nunca redondear en medio
- Almacenamiento DB: `Decimal(15,2)` para valores monetarios
- Display: redondear solo al mostrar al usuario

## Flujo para implementar un nuevo cálculo financiero

1. **Localizar en Excel** → hoja 2.4 o 2.5, anotar celda y valor de prueba
2. **Rastrear fórmula** → si referencia CalcBal, buscar en esa hoja la fórmula real
3. **Documentar** en `FORMULAS-EXCEL.md` si no está
4. **Crear función pura** en `backend/src/utils/ratios.ts` con comentario de referencia Excel
5. **Usar en servicio** en `backend/src/services/ratios.service.ts` mapeando campos Prisma
6. **Verificar** contra valor de prueba del Excel (empresa: "LABORATORIO BARNAFI KRAUSE", año 2024)

## Datos de prueba (referencia para verificar resultados)

- **Empresa:** LABORATORIO BARNAFI KRAUSE (INDICE!G19)
- **Año:** 2024 (INDICE!H21)
- **Datos entrada:** Hoja DATOS, columna G (año 2024)
- **Ratios esperados:** Hoja 2.4, columna H

Valores de referencia confirmados:
- Liquidez General: **6.4158**
- Acid Test: **6.1712**
- Cash Ratio: **0.4557**
- Capitalización: **0.8663**
- Rotación Existencias (coste): **16.097**
- Rotación Existencias (ventas): **38.679**

## Convenciones de nomenclatura

| Concepto | Nombre en código |
|----------|-----------------|
| Activo No Corriente | `nonCurrentAssets` |
| Activo Corriente | `currentAssets` |
| Pasivo No Corriente | `nonCurrentLiabilities` |
| Pasivo Corriente | `currentLiabilities` |
| Patrimonio Neto | `equity` |
| Fondo de Maniobra | `workingCapital` |
| Inmovilizado material | `tangibleAssets` |
| Existencias | `inventory` |
| Clientes | `accountsReceivable` |
| Disponible | `cashEquivalents` |
| Deudas LP | `bankDebtLp` |
| Deudas CP | `bankDebtSp` |
| Proveedores | `accountsPayable` |
| Resultado Neto | `netIncome` |

## Estado de implementación

**Completado:** Autenticación, CRUD empresas, entrada de datos financieros (Balance, P&G, Flujos, Adicionales), motor de ratios (liquidez, apalancamiento, rentabilidad, actividad, riesgo Altman/Springate).

**Pendiente:** Métodos de valoración (DCF, Múltiplos, EVA, Valor Libro), proyecciones financieras, dashboard multi-año, benchmarking sectorial, importación Excel/CSV.
