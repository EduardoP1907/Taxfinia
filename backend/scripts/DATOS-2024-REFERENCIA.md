# DATOS AÑO 2024 - LABORATORIO BARNAFI KRAUSE

## 📋 BALANCE DE SITUACIÓN

### ACTIVO NO CORRIENTE
| Campo | Valor | Celda Excel |
|-------|-------|-------------|
| Inmovilizado Material | 1,997,353,000 | G11 |
| Inmovilizado Inmaterial | 0 | G12 |
| Inversiones Financieras LP | 27,000 | G13 |
| Otro Realizable LP | 0 | G14 |
| **TOTAL ACTIVO NO CORRIENTE** | **1,997,380,000** | |

### ACTIVO CORRIENTE
| Campo | Valor | Celda Excel |
|-------|-------|-------------|
| Existencias | 459,500,000 | G16 |
| Clientes | 4,539,872,000 | G18 |
| Otros Deudores | 4,956,136,000 | G19 |
| Hacienda Deudora | 1,240,309,000 | G20 |
| Disponible (Cash) | 14,049,314,000 | G22 |
| **TOTAL ACTIVO CORRIENTE** | **25,245,131,000** | |

### PATRIMONIO NETO
| Campo | Valor | Celda Excel |
|-------|-------|-------------|
| Capital Social | 0 | G25 |
| Reservas | 0 | G26 |
| Resultados Ejercicios Anteriores | 0 | G27 |
| Acciones Propias | 0 | G28 |
| **TOTAL PATRIMONIO NETO** | **0** ⚠️ | |

⚠️ **NOTA:** El Patrimonio Neto en 0 parece incorrecto. Necesitamos verificar estas celdas.

### PASIVO NO CORRIENTE (Largo Plazo)
| Campo | Valor | Celda Excel |
|-------|-------|-------------|
| Provisiones LP | 0 | G31 |
| Deudas Bancarias LP | 117,891,000 | G32 |
| Otras Deudas LP | 5,308,000 | G34 |
| **TOTAL PASIVO NO CORRIENTE** | **123,199,000** | |

### PASIVO CORRIENTE (Corto Plazo)
| Campo | Valor | Celda Excel |
|-------|-------|-------------|
| Provisiones CP | 0 | G37 |
| Deudas Bancarias CP | 0 | G38 |
| Proveedores | 0 | G39 |
| Hacienda Acreedora | 0 | G40 |
| Otras Deudas CP | 14,049,314,000 | G41 |
| **TOTAL PASIVO CORRIENTE** | **14,049,314,000** | |

---

## 📊 CUENTA DE PÉRDIDAS Y GANANCIAS

### INGRESOS
| Campo | Valor | Celda Excel |
|-------|-------|-------------|
| Ingresos por Ventas | ⚠️ 2024 (año, no valor) | G45 |
| Otros Ingresos de Explotación | 17,773,116,000 | G46 |

⚠️ **PROBLEMA:** La celda G45 tiene el año, no el valor de ventas. Hay que buscar la celda correcta.

### COSTES Y GASTOS
| Campo | Valor | Celda Excel | Observación |
|-------|-------|-------------|-------------|
| Coste de las Ventas | -7,396,779,000 | G48 | Negativo ✓ |
| Gastos Personal - Ventas | -7,396,779,000 | G49 | Negativo ✓ |
| Gastos de Administración | -5,556,118,000 | G51 | Negativo ✓ |
| Gastos Personal - Admin | -5,556,118,000 | G52 | Negativo ✓ |
| Depreciaciones | -435,485,000 | G54 | Negativo ✓ |

### RESULTADOS EXCEPCIONALES
| Campo | Valor | Celda Excel |
|-------|-------|-------------|
| Ingresos Excepcionales | -1,094,400,000 | G57 |
| Gastos Excepcionales | -1,094,400,000 | G58 |

### RESULTADOS FINANCIEROS
| Campo | Valor | Celda Excel |
|-------|-------|-------------|
| Ingresos Financieros | 521,127,000 | G61 |
| Gastos Financieros | 3,811,461,000 | G62 |

### IMPUESTOS
| Campo | Valor | Celda Excel |
|-------|-------|-------------|
| Impuesto sobre Sociedades | 0 | G65 |

---

## 👥 DATOS ADICIONALES

| Campo | Valor | Celda Excel |
|-------|-------|-------------|
| Número de Empleados Promedio | 0 | G70 |

---

## 🎯 RATIOS ESPERADOS DEL EXCEL (Hoja 2.4)

Estos son los valores que deberían salir al calcular los ratios:

| Ratio | Valor Esperado | Celda Excel |
|-------|----------------|-------------|
| **Current Ratio** | 6.415790426302117 | H52 |
| **Quick Ratio (Acid Test)** | 6.171177760742729 | H53 |
| **Cash Ratio** | 0.455749861590222 | H54 |
| **Debt to Equity** | 6.479086282526298 | H10 |

---

## ✅ INSTRUCCIONES PARA INGRESAR EN LA APP

1. Abre: http://localhost:5173
2. Inicia sesión o regístrate
3. Crea empresa: "LABORATORIO BARNAFI KRAUSE"
4. Configura:
   - País: Chile (CL)
   - Moneda: CLP (Peso Chileno)
   - Sector: Farmacéutico
   - Año base: 2024

5. Ve a "Ingresar Datos" → Año 2024
6. Copia los valores de las tablas de arriba
7. **IMPORTANTE:**
   - En los campos negativos de P&G, ingresa solo el valor positivo (la app ya maneja el signo)
   - Si hay campos en 0, déjalos en 0
   - Ignora por ahora Patrimonio Neto (investigaremos las celdas correctas)

8. Guarda y ve a "Informe" → "Ratios"
9. Compara con los valores esperados de la tabla de ratios

---

## 🔍 PENDIENTE DE INVESTIGAR

- ✅ Celda correcta para "Ingresos por Ventas" (G45 tiene el año)
- ✅ Celdas correctas para Patrimonio Neto (G25-G28 están en 0)
- ✅ Verificar si los valores negativos son correctos
- ✅ Verificar celda de número de empleados
