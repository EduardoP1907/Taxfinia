/**
 * Projections Service - Hoja 4.1 del Excel
 * Maneja las proyecciones financieras a 10 años con todas las métricas
 */

import prisma from '../config/database';
import { Decimal } from '@prisma/client/runtime/library';
import * as projFormulas from '../utils/projections';
import type * as dcfTypes from '../utils/dcf';

// Helper para convertir Decimal a number
function toNumber(value: Decimal | null | undefined): number {
  if (!value) return 0;
  return parseFloat(value.toString());
}

export class ProjectionsService {
  /**
   * Crear un nuevo escenario de proyección
   */
  async createProjectionScenario(
    companyId: string,
    baseYear?: number,
    projectionYears: number = 10,
    name?: string
  ) {
    // Verificar que la empresa existe
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        fiscalYears: {
          include: {
            incomeStatement: true,
            balanceSheet: true,
            calculatedRatios: true,
          },
          orderBy: { year: 'desc' },
        },
      },
    });

    if (!company) {
      throw new Error('Empresa no encontrada');
    }

    if (!company.fiscalYears || company.fiscalYears.length === 0) {
      throw new Error('La empresa no tiene años fiscales con datos');
    }

    // Si no se especifica año base, buscar el último año que TENGA datos reales
    let actualBaseYear = baseYear;
    let baseFiscalYear = null;

    if (actualBaseYear) {
      baseFiscalYear = company.fiscalYears.find(fy => fy.year === actualBaseYear);
      if (!baseFiscalYear) {
        throw new Error(`No se encontraron datos para el año ${actualBaseYear}`);
      }
    } else {
      baseFiscalYear = company.fiscalYears.find(
        fy => fy.incomeStatement !== null && fy.balanceSheet !== null
      );
      if (!baseFiscalYear) {
        throw new Error('No se encontró ningún año con datos financieros completos');
      }
      actualBaseYear = baseFiscalYear.year;
    }

    // Crear el escenario de proyección
    const scenario = await prisma.projectionScenario.create({
      data: {
        companyId,
        name: name || `Proyección ${actualBaseYear}-${actualBaseYear + projectionYears}`,
        baseYear: actualBaseYear,
        projectionYears,
      },
    });

    // Crear año base con datos históricos
    await this.createBaseYearProjection(scenario.id, baseFiscalYear);

    // Crear años futuros (vacíos inicialmente)
    for (let i = 1; i <= projectionYears; i++) {
      const year = actualBaseYear + i;
      await prisma.financialProjection.create({
        data: {
          scenarioId: scenario.id,
          year,
          revenue: 0,
          costOfSales: 0,
          otherOperatingExpenses: 0,
          depreciation: 0,
          exceptionalNet: 0,
          financialIncome: 0,
          financialExpenses: 0,
          incomeTax: 0,
          totalAssets: 0,
          equity: 0,
          totalLiabilities: 0,
          workingCapitalInvestment: 0,
          fixedAssetsInvestment: 0,
        },
      });
    }

    return this.getProjectionScenario(scenario.id);
  }

  /**
   * Crear proyección del año base con datos históricos
   */
  private async createBaseYearProjection(scenarioId: string, baseFiscalYear: any) {
    const income = baseFiscalYear.incomeStatement;
    const balance = baseFiscalYear.balanceSheet;

    // Calcular totales del balance
    const totalAssets =
      toNumber(balance.tangibleAssets) +
      toNumber(balance.intangibleAssets) +
      toNumber(balance.financialInvestmentsLp) +
      toNumber(balance.otherNoncurrentAssets) +
      toNumber(balance.inventory) +
      toNumber(balance.accountsReceivable) +
      toNumber(balance.otherReceivables) +
      toNumber(balance.taxReceivables) +
      toNumber(balance.cashEquivalents);

    const equity =
      toNumber(balance.shareCapital) +
      toNumber(balance.reserves) +
      toNumber(balance.retainedEarnings) -
      toNumber(balance.treasuryStock);

    const totalLiabilities =
      toNumber(balance.provisionsLp) +
      toNumber(balance.bankDebtLp) +
      toNumber(balance.otherLiabilitiesLp) +
      toNumber(balance.provisionsSp) +
      toNumber(balance.bankDebtSp) +
      toNumber(balance.accountsPayable) +
      toNumber(balance.taxLiabilities) +
      toNumber(balance.otherLiabilitiesSp);

    // Pasivo Corto Plazo (para cálculo de Coste Financiero)
    // Hoja 2.2: H29 = SUMA(H30:H34) = Provisiones CP + Deudas CP + Proveedores + Impuestos CP + Otras CP
    const currentLiabilities =
      toNumber(balance.provisionsSp) +
      toNumber(balance.bankDebtSp) +
      toNumber(balance.accountsPayable) +
      toNumber(balance.taxLiabilities) +
      toNumber(balance.otherLiabilitiesSp);

    const revenue = toNumber(income.revenue);
    const costOfSales = toNumber(income.costOfSales);
    const otherOperatingExpenses =
      toNumber(income.adminExpenses) + toNumber(income.staffCostsAdmin);
    const depreciation = toNumber(income.depreciation);
    const exceptionalNet =
      toNumber(income.exceptionalIncome) - toNumber(income.exceptionalExpenses);
    const financialIncome = toNumber(income.financialIncome);
    const financialExpenses = toNumber(income.financialExpenses);
    const incomeTax = toNumber(income.incomeTax);

    // Buscar año fiscal anterior para cálculo de FCF
    const priorFiscalYear = await prisma.fiscalYear.findFirst({
      where: {
        companyId: baseFiscalYear.companyId,
        year: baseFiscalYear.year - 1,
      },
      include: {
        balanceSheet: true,
      },
    });

    let totalAssetsPrior: number | undefined = undefined;
    if (priorFiscalYear?.balanceSheet) {
      const priorBalance = priorFiscalYear.balanceSheet;
      totalAssetsPrior =
        toNumber(priorBalance.tangibleAssets) +
        toNumber(priorBalance.intangibleAssets) +
        toNumber(priorBalance.financialInvestmentsLp) +
        toNumber(priorBalance.otherNoncurrentAssets) +
        toNumber(priorBalance.inventory) +
        toNumber(priorBalance.accountsReceivable) +
        toNumber(priorBalance.otherReceivables) +
        toNumber(priorBalance.taxReceivables) +
        toNumber(priorBalance.cashEquivalents);
    }

    // Calcular métricas derivadas
    const calculated = this.calculateAllMetrics({
      revenue,
      costOfSales,
      otherOperatingExpenses,
      depreciation,
      exceptionalNet,
      financialIncome,
      financialExpenses,
      incomeTax,
      totalAssets,
      equity,
      totalLiabilities,
      currentLiabilities, // Pasivo Corto Plazo para Coste Financiero
      workingCapitalInvestment: 0,
      fixedAssetsInvestment: 0,
      totalAssetsPrior, // Pasar año anterior si existe
    });

    return prisma.financialProjection.create({
      data: {
        scenarioId,
        year: baseFiscalYear.year,
        // Balance Sheet
        totalAssets,
        equity,
        totalLiabilities,
        // Income Statement
        revenue,
        costOfSales,
        otherOperatingExpenses,
        depreciation,
        exceptionalNet,
        // Financial Results
        financialIncome,
        financialExpenses,
        // Tax (incomeTax ya viene en calculated, no duplicar)
        // Investments
        workingCapitalInvestment: 0,
        fixedAssetsInvestment: 0,
        // Calculated metrics
        ...calculated,
      },
    });
  }

  /**
   * Calcular todas las métricas derivadas (Hoja 4.1)
   */
  private calculateAllMetrics(data: {
    revenue: number;
    costOfSales: number;
    otherOperatingExpenses: number;
    depreciation: number;
    exceptionalNet: number;
    financialIncome: number;
    financialExpenses: number;
    financialNet?: number; // Calculado desde financialNetRate
    financialNetRate?: number; // % ingresado por usuario
    incomeTax: number;
    totalAssets: number;
    equity: number;
    totalLiabilities: number;
    currentLiabilities?: number; // Pasivo Corto Plazo (para Coste Financiero)
    workingCapitalInvestment: number;
    fixedAssetsInvestment: number;
    incomeTaxRate?: number; // Tasa impositiva del año base
    totalAssetsPrior?: number; // Total Activo del año anterior (para calcular FCF)
    // Datos del año base para calcular variaciones %
    baseYear?: {
      revenue: number;
      operatingResult: number;
      ebt: number;
    };
  }) {
    // Calcular EBITDA
    const ebitda = projFormulas.calculateEBITDA(
      data.revenue,
      data.costOfSales,
      data.otherOperatingExpenses
    );

    // Calcular Resultado Explotación (EBITDA - Depreciation, SIN excepcionales)
    const operatingResult = projFormulas.calculateOperatingResult(
      ebitda,
      data.depreciation
    );

    // Calcular EBIT (Resultado Explotación + Excepcionales)
    const ebit = projFormulas.calculateEBIT(
      operatingResult,
      data.exceptionalNet
    );

    // Calcular Financieros Netos (puede venir calculado o como %)
    let financialNet: number;
    if (data.financialNet !== undefined) {
      financialNet = data.financialNet;
    } else if (data.financialNetRate !== undefined) {
      // Calcular desde % del revenue
      financialNet = data.revenue * data.financialNetRate;
    } else {
      // Default: calcular desde ingresos y gastos financieros
      financialNet = projFormulas.calculateFinancialNet(
        data.financialIncome,
        data.financialExpenses
      );
    }

    // Calcular EBT (EBIT + Financieros Netos)
    const ebt = projFormulas.calculateEBT(ebit, financialNet);

    // Calcular tasa impositiva (usar la del año base si se proporciona)
    const taxRate = data.incomeTaxRate !== undefined
      ? data.incomeTaxRate
      : ebt > 0 ? data.incomeTax / ebt : 0.25;

    // Calcular Impuestos
    const incomeTax = projFormulas.calculateIncomeTax(ebt, taxRate);

    // Calcular Net Income
    const netIncome = projFormulas.calculateNetIncome(ebt, incomeTax);

    // Calcular NOPAT (EBIT × (1 - taxRate))
    const nopat = projFormulas.calculateNOPAT(ebit, taxRate);

    // Calcular flujos
    const grossCashFlow = projFormulas.calculateGrossCashFlow(
      nopat,
      data.depreciation
    );

    // Free Cash Flow según Excel: FCF = NOPAT - (Total Activo Actual - Total Activo Anterior)
    const freeCashFlow = data.totalAssetsPrior !== undefined
      ? projFormulas.calculateFreeCashFlow(
          nopat,
          data.totalAssets,
          data.totalAssetsPrior
        )
      : null;

    // Calcular variaciones % desde año base (si se proporciona)
    let revenueVariation: number | null = null;
    let operatingResultVariation: number | null = null;
    let ebtVariation: number | null = null;

    if (data.baseYear) {
      if (data.baseYear.revenue > 0) {
        revenueVariation = (data.revenue / data.baseYear.revenue) - 1; // Formula: (I11/G11)-1
      }
      if (data.baseYear.operatingResult > 0) {
        operatingResultVariation = (operatingResult / data.baseYear.operatingResult) - 1; // (I17/G17)-1
      }
      if (data.baseYear.ebt > 0) {
        ebtVariation = (ebt / data.baseYear.ebt) - 1; // (I22/G22)-1
      }
    }

    // Calcular ratios
    const roa = projFormulas.calculateROA(operatingResult, data.totalAssets);
    const roe = projFormulas.calculateROE(netIncome, data.equity);

    // Apalancamiento Financiero: (TotalActivo/Equity) × (EBT/OperatingResult)
    const financialLeverage = projFormulas.calculateFinancialLeverage(
      data.totalAssets,
      data.equity,
      ebt,
      operatingResult
    );

    // Riesgo Operativo: (VarResExplot/ResExplot) / (VarVentas/Revenue)
    const operationalRisk =
      revenueVariation !== null && operatingResultVariation !== null
        ? projFormulas.calculateOperationalRisk(
            operatingResultVariation,
            operatingResult,
            revenueVariation,
            data.revenue
          )
        : null;

    // Riesgo Financiero: (VarBAI/EBT) / (VarResExplot/ResExplot)
    const financialRisk =
      ebtVariation !== null && operatingResultVariation !== null
        ? projFormulas.calculateFinancialRisk(
            ebtVariation,
            ebt,
            operatingResultVariation,
            operatingResult
          )
        : null;

    // Calcular coste financiero (%) - Excel formula: SI(G9=0;0;-G21/(G9))
    // G9 = Pasivo Corto Plazo (Hoja 2.2, H29 = SUMA(H30:H34))
    // G21 = Resultado Financiero (Hoja 2.1, H36 = Ingresos Financieros - Gastos Financieros)
    // Fórmula: -Resultado Financiero / Pasivo Corto Plazo
    const financialResult = data.financialIncome - data.financialExpenses;
    const liabilitiesForCostRate = data.currentLiabilities ?? data.totalLiabilities; // Usar Pasivo CP si está disponible
    const financialCostRate =
      liabilitiesForCostRate > 0
        ? -financialResult / liabilitiesForCostRate
        : null;

    return {
      ebitda,
      operatingResult,
      ebit,
      financialNet,
      ebt,
      netIncome,
      nopat,
      grossCashFlow,
      freeCashFlow,
      roa,
      roe,
      financialLeverage,
      operationalRisk,
      financialRisk,
      financialCostRate,
      incomeTaxRate: taxRate,
      revenueVariation,
      operatingResultVariation,
      ebtVariation,
      incomeTax,
    };
  }

  /**
   * Obtener escenario con todas sus proyecciones
   */
  async getProjectionScenario(scenarioId: string) {
    const scenario = await prisma.projectionScenario.findUnique({
      where: { id: scenarioId },
      include: {
        projections: {
          orderBy: { year: 'asc' },
        },
        company: true,
      },
    });

    if (!scenario) {
      throw new Error('Escenario de proyección no encontrado');
    }

    return scenario;
  }

  /**
   * Obtener todos los escenarios de una empresa
   */
  async getCompanyProjectionScenarios(companyId: string) {
    const scenarios = await prisma.projectionScenario.findMany({
      where: { companyId },
      include: {
        projections: {
          orderBy: { year: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return scenarios;
  }

  /**
   * Actualizar una proyección específica y recalcular valores
   * Si se actualizan tasas de crecimiento, proyecta automáticamente los valores
   * Si se actualizan valores, calcula automáticamente las tasas de crecimiento
   */
  async updateProjection(
    projectionId: string,
    data: any
  ) {
    // Obtener proyección actual
    const currentProjection = await prisma.financialProjection.findUnique({
      where: { id: projectionId },
      include: {
        scenario: {
          include: {
            projections: {
              orderBy: { year: 'asc' },
            },
          },
        },
      },
    });

    if (!currentProjection) {
      throw new Error('Proyección no encontrada');
    }

    // Detectar si se están actualizando tasas de crecimiento
    const isUpdatingGrowthRate = Object.keys(data).some(key =>
      key.endsWith('GrowthRate')
    );

    // Buscar proyección del año anterior para cálculo de FCF y tasas de crecimiento
    const priorProjection = currentProjection.scenario.projections.find(
      p => p.year === currentProjection.year - 1
    );

    // Si se están actualizando VALORES (no tasas) y existe año anterior,
    // calcular automáticamente las tasas de crecimiento
    const isNotBaseYear = priorProjection !== undefined;
    const valueFieldsMap: Record<string, string> = {
      revenue: 'revenueGrowthRate',
      costOfSales: 'costOfSalesGrowthRate',
      otherOperatingExpenses: 'otherOperatingExpensesGrowthRate',
      depreciation: 'depreciationGrowthRate',
      exceptionalNet: 'exceptionalNetGrowthRate',
      financialIncome: 'financialIncomeGrowthRate',
      financialExpenses: 'financialExpensesGrowthRate',
      totalAssets: 'totalAssetsGrowthRate',
      equity: 'equityGrowthRate',
      totalLiabilities: 'totalLiabilitiesGrowthRate',
    };

    // Calcular tasas de crecimiento automáticamente si se actualizan valores
    let autoCalculatedGrowthRate = false;
    if (isNotBaseYear && !isUpdatingGrowthRate) {
      for (const [valueField, rateField] of Object.entries(valueFieldsMap)) {
        if (data[valueField] !== undefined && priorProjection) {
          const newValue = toNumber(data[valueField]);
          const priorValue = toNumber((priorProjection as any)[valueField]);

          if (priorValue > 0) {
            // Calcular tasa: (Nuevo - Anterior) / Anterior
            const growthRate = (newValue - priorValue) / priorValue;
            data[rateField] = growthRate;
            autoCalculatedGrowthRate = true;
            console.log(`🔄 Calculado automáticamente ${rateField}: ${(growthRate * 100).toFixed(2)}% (${newValue} vs ${priorValue})`);
          }
        }
      }
    }

    // Obtener datos del año base para cálculo de variaciones %
    const baseProjection = currentProjection.scenario.projections
      .sort((a, b) => a.year - b.year)[0];

    // Determinar si es año base o año proyectado
    const isBaseYear = currentProjection.year === baseProjection.year;

    // Para años proyectados, Financieros Netos siempre usa el valor del año base
    // Fórmula Excel: SI(I123=0;$G21;I123) donde I123=0, entonces usa $G21
    const financialNetForCalculation = isBaseYear
      ? (data.financialNet ?? undefined) // Año base: puede usar lo que venga en data
      : toNumber(baseProjection.financialNet); // Año proyectado: usar año base

    // Merge data con valores actuales
    const updatedData = {
      revenue: data.revenue ?? toNumber(currentProjection.revenue),
      costOfSales: data.costOfSales ?? toNumber(currentProjection.costOfSales),
      otherOperatingExpenses: data.otherOperatingExpenses ?? toNumber(currentProjection.otherOperatingExpenses),
      depreciation: data.depreciation ?? toNumber(currentProjection.depreciation),
      exceptionalNet: data.exceptionalNet ?? toNumber(currentProjection.exceptionalNet),
      financialIncome: data.financialIncome ?? toNumber(currentProjection.financialIncome),
      financialExpenses: data.financialExpenses ?? toNumber(currentProjection.financialExpenses),
      financialNet: financialNetForCalculation,
      financialNetRate: isBaseYear ? data.financialNetRate : undefined, // Solo para año base
      incomeTax: data.incomeTax ?? toNumber(currentProjection.incomeTax),
      totalAssets: data.totalAssets ?? toNumber(currentProjection.totalAssets),
      equity: data.equity ?? toNumber(currentProjection.equity),
      totalLiabilities: data.totalLiabilities ?? toNumber(currentProjection.totalLiabilities),
      workingCapitalInvestment: data.workingCapitalInvestment ?? toNumber(currentProjection.workingCapitalInvestment),
      fixedAssetsInvestment: data.fixedAssetsInvestment ?? toNumber(currentProjection.fixedAssetsInvestment),
      incomeTaxRate: data.incomeTaxRate ?? toNumber(baseProjection.incomeTaxRate),
      // Pasar Total Activo del año anterior para cálculo de FCF según Excel
      totalAssetsPrior: priorProjection ? toNumber(priorProjection.totalAssets) : undefined,
      // Pasar datos del año base para calcular variaciones %
      baseYear: currentProjection.year !== baseProjection.year ? {
        revenue: toNumber(baseProjection.revenue),
        operatingResult: toNumber(baseProjection.operatingResult),
        ebt: toNumber(baseProjection.ebt),
      } : undefined,
    };

    // Calcular métricas
    const calculated = this.calculateAllMetrics(updatedData);

    // Actualizar en BD
    let projection = await prisma.financialProjection.update({
      where: { id: projectionId },
      data: {
        ...data,
        ...calculated,
      },
    });

    // Si se actualizaron tasas de crecimiento (manual o automáticamente),
    // aplicarlas automáticamente al escenario
    if (isUpdatingGrowthRate || autoCalculatedGrowthRate) {
      console.log('🚀 Aplicando tasas de crecimiento a años futuros...');
      const updatedScenario = await this.applyStoredGrowthRatesFromYear(
        currentProjection.scenario.id,
        currentProjection.year
      );
      // Buscar la proyección actualizada en el escenario recién calculado
      const updatedProjection = updatedScenario.projections.find(
        p => p.id === projectionId
      );
      if (updatedProjection) {
        projection = updatedProjection;
      }
    }

    return projection;
  }

  /**
   * Aplicar tasas de crecimiento uniformes a todos los años
   * (Versión simplificada para usar desde el frontend)
   */
  async applyUniformGrowthRates(
    scenarioId: string,
    rates: {
      totalAssets?: number;
      equity?: number;
      totalLiabilities?: number;
      revenue?: number;
      costOfSales?: number;
      otherOperatingExpenses?: number;
      depreciation?: number;
      exceptionalNet?: number;
      financialIncome?: number;
      financialExpenses?: number;
      workingCapitalInvestment?: number;
      fixedAssetsInvestment?: number;
      incomeTaxRate?: number;
    }
  ) {
    const scenario = await this.getProjectionScenario(scenarioId);
    const projections = scenario.projections.sort((a, b) => a.year - b.year);

    // Crear array de tasas por año (todas iguales)
    const ratesByYear = projections.slice(1).map(proj => ({
      year: proj.year,
      totalAssetsGrowthRate: rates.totalAssets !== undefined ? rates.totalAssets / 100 : undefined,
      equityGrowthRate: rates.equity !== undefined ? rates.equity / 100 : undefined,
      totalLiabilitiesGrowthRate: rates.totalLiabilities !== undefined ? rates.totalLiabilities / 100 : undefined,
      revenueGrowthRate: rates.revenue !== undefined ? rates.revenue / 100 : undefined,
      costOfSalesGrowthRate: rates.costOfSales !== undefined ? rates.costOfSales / 100 : undefined,
      otherOperatingExpensesGrowthRate: rates.otherOperatingExpenses !== undefined ? rates.otherOperatingExpenses / 100 : undefined,
      depreciationGrowthRate: rates.depreciation !== undefined ? rates.depreciation / 100 : undefined,
      exceptionalNetGrowthRate: rates.exceptionalNet !== undefined ? rates.exceptionalNet / 100 : undefined,
      financialIncomeGrowthRate: rates.financialIncome !== undefined ? rates.financialIncome / 100 : undefined,
      financialExpensesGrowthRate: rates.financialExpenses !== undefined ? rates.financialExpenses / 100 : undefined,
      incomeTaxRate: rates.incomeTaxRate !== undefined ? rates.incomeTaxRate / 100 : undefined,
    }));

    return this.applyGrowthRatesToScenario(scenarioId, ratesByYear);
  }

  /**
   * Aplicar tasas de crecimiento a un escenario completo
   * Implementa la lógica de la hoja 4.1 del Excel
   */
  async applyGrowthRatesToScenario(
    scenarioId: string,
    growthRatesByYear: Array<{
      year: number;
      revenueGrowthRate?: number;
      costOfSalesGrowthRate?: number;
      otherOperatingExpensesGrowthRate?: number;
      depreciationGrowthRate?: number;
      exceptionalNetGrowthRate?: number;
      financialIncomeGrowthRate?: number;
      financialExpensesGrowthRate?: number;
      totalAssetsGrowthRate?: number;
      equityGrowthRate?: number;
      totalLiabilitiesGrowthRate?: number;
      incomeTaxRate?: number;
    }>
  ) {
    const scenario = await this.getProjectionScenario(scenarioId);
    const projections = scenario.projections;

    // Ordenar proyecciones por año
    const sortedProjections = projections.sort((a, b) => a.year - b.year);
    const baseProjection = sortedProjections[0];

    // Aplicar tasas año por año
    for (let i = 1; i < sortedProjections.length; i++) {
      const currentProjection = sortedProjections[i];
      const priorProjection = sortedProjections[i - 1];
      const rates = growthRatesByYear.find(r => r.year === currentProjection.year);

      if (!rates) continue;

      // Aplicar crecimiento desde el año anterior
      const newRevenue = projFormulas.applyGrowthRateFromPriorYear(
        toNumber(priorProjection.revenue),
        rates.revenueGrowthRate
      );

      const newCostOfSales = projFormulas.applyGrowthRateFromPriorYear(
        toNumber(priorProjection.costOfSales),
        rates.costOfSalesGrowthRate
      );

      const newOtherOperatingExpenses = projFormulas.applyGrowthRateFromPriorYear(
        toNumber(priorProjection.otherOperatingExpenses),
        rates.otherOperatingExpensesGrowthRate
      );

      const newDepreciation = projFormulas.applyGrowthRateFromPriorYear(
        toNumber(priorProjection.depreciation),
        rates.depreciationGrowthRate
      );

      const newExceptionalNet = projFormulas.applyGrowthRateFromPriorYear(
        toNumber(priorProjection.exceptionalNet),
        rates.exceptionalNetGrowthRate
      );

      const newFinancialIncome = projFormulas.applyGrowthRateFromPriorYear(
        toNumber(priorProjection.financialIncome),
        rates.financialIncomeGrowthRate
      );

      const newFinancialExpenses = projFormulas.applyGrowthRateFromPriorYear(
        toNumber(priorProjection.financialExpenses),
        rates.financialExpensesGrowthRate
      );

      const newTotalAssets = projFormulas.applyGrowthRateFromPriorYear(
        toNumber(priorProjection.totalAssets),
        rates.totalAssetsGrowthRate
      );

      const newEquity = projFormulas.applyGrowthRateFromPriorYear(
        toNumber(priorProjection.equity),
        rates.equityGrowthRate
      );

      const newTotalLiabilities = projFormulas.applyGrowthRateFromPriorYear(
        toNumber(priorProjection.totalLiabilities),
        rates.totalLiabilitiesGrowthRate
      );

      // Calcular impuesto basado en EBT y tasa
      const ebitdaTemp = projFormulas.calculateEBITDA(
        newRevenue,
        newCostOfSales,
        newOtherOperatingExpenses
      );
      const operatingResultTemp = projFormulas.calculateOperatingResult(
        ebitdaTemp,
        newDepreciation
      );
      const ebitTemp = projFormulas.calculateEBIT(
        operatingResultTemp,
        newExceptionalNet
      );
      // Proyectar Financieros Netos usando financialIncomeGrowthRate como tasa del neto
      const baseFinancialNetForApply = toNumber(baseProjection.financialNet);
      const priorFinancialNetForApply = toNumber(priorProjection.financialNet) || baseFinancialNetForApply;
      const newFinancialNet = rates.financialIncomeGrowthRate && rates.financialIncomeGrowthRate !== 0
        ? projFormulas.applyGrowthRateFromPriorYear(priorFinancialNetForApply, rates.financialIncomeGrowthRate)
        : baseFinancialNetForApply;

      const ebtTemp = projFormulas.calculateEBT(
        ebitTemp,
        newFinancialNet
      );

      const newIncomeTax = rates.incomeTaxRate
        ? ebtTemp * rates.incomeTaxRate
        : toNumber(priorProjection.incomeTax);

      // Actualizar proyección
      await this.updateProjection(currentProjection.id, {
        revenue: newRevenue,
        revenueGrowthRate: rates.revenueGrowthRate,
        costOfSales: newCostOfSales,
        costOfSalesGrowthRate: rates.costOfSalesGrowthRate,
        otherOperatingExpenses: newOtherOperatingExpenses,
        otherOperatingExpensesGrowthRate: rates.otherOperatingExpensesGrowthRate,
        depreciation: newDepreciation,
        depreciationGrowthRate: rates.depreciationGrowthRate,
        exceptionalNet: newExceptionalNet,
        exceptionalNetGrowthRate: rates.exceptionalNetGrowthRate,
        financialIncome: newFinancialIncome,
        financialIncomeGrowthRate: rates.financialIncomeGrowthRate,
        financialExpenses: newFinancialExpenses,
        financialExpensesGrowthRate: rates.financialExpensesGrowthRate,
        financialNet: newFinancialNet,
        totalAssets: newTotalAssets,
        totalAssetsGrowthRate: rates.totalAssetsGrowthRate,
        equity: newEquity,
        equityGrowthRate: rates.equityGrowthRate,
        totalLiabilities: newTotalLiabilities,
        totalLiabilitiesGrowthRate: rates.totalLiabilitiesGrowthRate,
        incomeTax: newIncomeTax,
        incomeTaxRate: rates.incomeTaxRate,
      });
    }

    return this.getProjectionScenario(scenarioId);
  }

  /**
   * Recalcular todas las métricas de un escenario
   */
  async recalculateScenarioMetrics(scenarioId: string) {
    const scenario = await this.getProjectionScenario(scenarioId);

    // Ordenar proyecciones por año para tener acceso al año anterior
    const sortedProjections = [...scenario.projections].sort((a, b) => a.year - b.year);
    const baseProjection = sortedProjections[0];

    for (let i = 0; i < sortedProjections.length; i++) {
      const projection = sortedProjections[i];
      const priorProjection = i > 0 ? sortedProjections[i - 1] : null;

      const data = {
        revenue: toNumber(projection.revenue),
        costOfSales: toNumber(projection.costOfSales),
        otherOperatingExpenses: toNumber(projection.otherOperatingExpenses),
        depreciation: toNumber(projection.depreciation),
        exceptionalNet: toNumber(projection.exceptionalNet),
        financialIncome: toNumber(projection.financialIncome),
        financialExpenses: toNumber(projection.financialExpenses),
        financialNet: toNumber(projection.financialNet),
        financialNetRate: toNumber(projection.financialNetRate),
        incomeTax: toNumber(projection.incomeTax),
        totalAssets: toNumber(projection.totalAssets),
        equity: toNumber(projection.equity),
        totalLiabilities: toNumber(projection.totalLiabilities),
        workingCapitalInvestment: toNumber(projection.workingCapitalInvestment),
        fixedAssetsInvestment: toNumber(projection.fixedAssetsInvestment),
        incomeTaxRate: toNumber(projection.incomeTaxRate) || toNumber(baseProjection.incomeTaxRate),
        // Pasar Total Activo del año anterior para cálculo de FCF según Excel
        totalAssetsPrior: priorProjection ? toNumber(priorProjection.totalAssets) : undefined,
        // Pasar datos del año base para calcular variaciones %
        baseYear: i > 0 ? {
          revenue: toNumber(baseProjection.revenue),
          operatingResult: toNumber(baseProjection.operatingResult),
          ebt: toNumber(baseProjection.ebt),
        } : undefined,
      };

      const calculated = this.calculateAllMetrics(data);

      await prisma.financialProjection.update({
        where: { id: projection.id },
        data: calculated,
      });
    }

    return this.getProjectionScenario(scenarioId);
  }

  /**
   * Aplicar tasas de crecimiento almacenadas desde un año específico hacia adelante
   * Proyecta valores de cada año basándose en el año anterior y la tasa de crecimiento almacenada
   */
  async applyStoredGrowthRatesFromYear(
    scenarioId: string,
    fromYear: number
  ) {
    const scenario = await this.getProjectionScenario(scenarioId);
    const sortedProjections = [...scenario.projections].sort((a, b) => a.year - b.year);
    const baseProjection = sortedProjections[0];

    // Encontrar el índice del año desde el cual aplicar
    const startIndex = sortedProjections.findIndex(p => p.year === fromYear);
    if (startIndex < 0) {
      throw new Error(`Año ${fromYear} no encontrado en el escenario`);
    }

    // Aplicar tasas desde el año especificado hacia adelante
    for (let i = startIndex; i < sortedProjections.length; i++) {
      const currentProjection = sortedProjections[i];
      const priorProjection = i > 0 ? sortedProjections[i - 1] : null;

      // Si no hay año anterior, no podemos proyectar (es el año base)
      if (!priorProjection) continue;

      // Proyectar cada campo usando su tasa de crecimiento desde el año ANTERIOR
      // Fórmula Excel para primer año (2025): SI(tasa=0; $G12; ($G12*tasa)+$G12) = año_base × (1 + tasa)
      // Fórmula Excel para siguientes (2026+): SI(tasa=0; I11; (I11*tasa)+I11) = año_anterior × (1 + tasa)
      // Ambos casos se resuelven proyectando desde el año anterior (priorProjection)
      const newRevenue = currentProjection.revenueGrowthRate !== null
        ? projFormulas.applyGrowthRateFromPriorYear(
            toNumber(priorProjection.revenue),
            toNumber(currentProjection.revenueGrowthRate)
          )
        : toNumber(currentProjection.revenue);

      const newCostOfSales = currentProjection.costOfSalesGrowthRate !== null
        ? projFormulas.applyGrowthRateFromPriorYear(
            toNumber(priorProjection.costOfSales),
            toNumber(currentProjection.costOfSalesGrowthRate)
          )
        : toNumber(currentProjection.costOfSales);

      const newOtherOperatingExpenses = currentProjection.otherOperatingExpensesGrowthRate !== null
        ? projFormulas.applyGrowthRateFromPriorYear(
            toNumber(priorProjection.otherOperatingExpenses),
            toNumber(currentProjection.otherOperatingExpensesGrowthRate)
          )
        : toNumber(currentProjection.otherOperatingExpenses);

      const newDepreciation = currentProjection.depreciationGrowthRate !== null
        ? projFormulas.applyGrowthRateFromPriorYear(
            toNumber(priorProjection.depreciation),
            toNumber(currentProjection.depreciationGrowthRate)
          )
        : toNumber(currentProjection.depreciation);

      const newExceptionalNet = currentProjection.exceptionalNetGrowthRate !== null
        ? projFormulas.applyGrowthRateFromPriorYear(
            toNumber(priorProjection.exceptionalNet),
            toNumber(currentProjection.exceptionalNetGrowthRate)
          )
        : toNumber(currentProjection.exceptionalNet);

      const newFinancialIncome = currentProjection.financialIncomeGrowthRate !== null
        ? projFormulas.applyGrowthRateFromPriorYear(
            toNumber(priorProjection.financialIncome),
            toNumber(currentProjection.financialIncomeGrowthRate)
          )
        : toNumber(currentProjection.financialIncome);

      const newFinancialExpenses = currentProjection.financialExpensesGrowthRate !== null
        ? projFormulas.applyGrowthRateFromPriorYear(
            toNumber(priorProjection.financialExpenses),
            toNumber(currentProjection.financialExpensesGrowthRate)
          )
        : toNumber(currentProjection.financialExpenses);

      const newTotalAssets = currentProjection.totalAssetsGrowthRate !== null
        ? projFormulas.applyGrowthRateFromPriorYear(
            toNumber(priorProjection.totalAssets),
            toNumber(currentProjection.totalAssetsGrowthRate)
          )
        : toNumber(currentProjection.totalAssets);

      const newEquity = currentProjection.equityGrowthRate !== null
        ? projFormulas.applyGrowthRateFromPriorYear(
            toNumber(priorProjection.equity),
            toNumber(currentProjection.equityGrowthRate)
          )
        : toNumber(currentProjection.equity);

      const newTotalLiabilities = currentProjection.totalLiabilitiesGrowthRate !== null
        ? projFormulas.applyGrowthRateFromPriorYear(
            toNumber(priorProjection.totalLiabilities),
            toNumber(currentProjection.totalLiabilitiesGrowthRate)
          )
        : toNumber(currentProjection.totalLiabilities);

      // Calcular tasa impositiva si está definida, sino usar del año base
      const taxRate = currentProjection.incomeTaxRate
        ? toNumber(currentProjection.incomeTaxRate)
        : toNumber(baseProjection.incomeTaxRate);

      // Financieros Netos: si hay tasa definida (financialIncomeGrowthRate), proyectar desde año anterior;
      // si no hay tasa, usar el valor del año base como fallback.
      const baseFinancialNet = toNumber(baseProjection.financialNet);
      const priorFinancialNet = toNumber((priorProjection as any).financialNet) || baseFinancialNet;
      const financialNetGrowthRate = currentProjection.financialIncomeGrowthRate !== null
        ? toNumber(currentProjection.financialIncomeGrowthRate)
        : null;
      const newFinancialNet = financialNetGrowthRate !== null && financialNetGrowthRate !== 0
        ? projFormulas.applyGrowthRateFromPriorYear(priorFinancialNet, financialNetGrowthRate)
        : baseFinancialNet;

      // Calcular métricas con los nuevos valores
      const calculated = this.calculateAllMetrics({
        revenue: newRevenue,
        costOfSales: newCostOfSales,
        otherOperatingExpenses: newOtherOperatingExpenses,
        depreciation: newDepreciation,
        exceptionalNet: newExceptionalNet,
        financialIncome: newFinancialIncome,
        financialExpenses: newFinancialExpenses,
        financialNet: newFinancialNet,
        incomeTax: 0, // Se recalculará según la tasa
        totalAssets: newTotalAssets,
        equity: newEquity,
        totalLiabilities: newTotalLiabilities,
        workingCapitalInvestment: 0,
        fixedAssetsInvestment: 0,
        incomeTaxRate: taxRate,
        totalAssetsPrior: priorProjection ? toNumber(priorProjection.totalAssets) : undefined,
        // Pasar datos del año base para calcular variaciones %
        baseYear: {
          revenue: toNumber(baseProjection.revenue),
          operatingResult: toNumber(baseProjection.operatingResult),
          ebt: toNumber(baseProjection.ebt),
        },
      });

      // Actualizar la proyección con los valores proyectados
      await prisma.financialProjection.update({
        where: { id: currentProjection.id },
        data: {
          revenue: newRevenue,
          costOfSales: newCostOfSales,
          otherOperatingExpenses: newOtherOperatingExpenses,
          depreciation: newDepreciation,
          exceptionalNet: newExceptionalNet,
          financialIncome: newFinancialIncome,
          financialExpenses: newFinancialExpenses,
          totalAssets: newTotalAssets,
          equity: newEquity,
          totalLiabilities: newTotalLiabilities,
          ...calculated,
        },
      });

      // Actualizar en el array para que el siguiente año use estos valores (cast to any to avoid Decimal type issues)
      sortedProjections[i] = {
        ...currentProjection,
        revenue: newRevenue as any,
        costOfSales: newCostOfSales as any,
        otherOperatingExpenses: newOtherOperatingExpenses as any,
        depreciation: newDepreciation as any,
        exceptionalNet: newExceptionalNet as any,
        financialIncome: newFinancialIncome as any,
        financialExpenses: newFinancialExpenses as any,
        financialNet: newFinancialNet as any,
        totalAssets: newTotalAssets as any,
        equity: newEquity as any,
        totalLiabilities: newTotalLiabilities as any,
      };
    }

    return this.getProjectionScenario(scenarioId);
  }

  /**
   * Eliminar escenario de proyección
   */
  async deleteProjectionScenario(scenarioId: string) {
    await prisma.projectionScenario.delete({
      where: { id: scenarioId },
    });

    return { success: true };
  }

  /**
   * Actualizar configuración del escenario
   */
  async updateScenarioConfig(
    scenarioId: string,
    data: {
      name?: string;
      description?: string;
    }
  ) {
    const updated = await prisma.projectionScenario.update({
      where: { id: scenarioId },
      data,
      include: {
        projections: {
          orderBy: { year: 'asc' },
        },
      },
    });

    return updated;
  }

  // ==================== MÉTODOS DCF (Hoja 4.3) ====================

  /**
   * Actualizar parámetros DCF del escenario
   */
  async updateDCFParameters(
    scenarioId: string,
    params: {
      wacc?: number;              // WACC directo (preferido sobre el calculado)
      riskFreeRate?: number;
      beta?: number;
      marketRiskPremium?: number;
      costOfDebt?: number;
      taxRateForWacc?: number;
      terminalGrowthRate?: number;
      netDebt?: number;
    }
  ) {
    // Importar funciones DCF
    const dcf = await import('../utils/dcf');

    let costOfEquity: number | undefined;
    let wacc: number | undefined;

    // Si el usuario ingresó el WACC directamente, usarlo sin recalcular
    if (params.wacc !== undefined && params.wacc > 0) {
      wacc = params.wacc;
    } else if (
      // Si no, intentar calcularlo desde los componentes CAPM
      params.riskFreeRate !== undefined &&
      params.beta !== undefined &&
      params.marketRiskPremium !== undefined
    ) {
      costOfEquity = dcf.calculateCostOfEquity(
        params.riskFreeRate,
        params.beta,
        params.marketRiskPremium
      );

      if (
        costOfEquity !== undefined &&
        params.costOfDebt !== undefined &&
        params.taxRateForWacc !== undefined
      ) {
        const scenario = await prisma.projectionScenario.findUnique({
          where: { id: scenarioId },
          include: {
            projections: {
              where: { year: { equals: (await prisma.projectionScenario.findUnique({ where: { id: scenarioId } }))?.baseYear } },
            },
          },
        });

        if (scenario && scenario.projections.length > 0) {
          const baseYear = scenario.projections[0];
          const equity = toNumber(baseYear.equity);
          const debt = toNumber(baseYear.totalLiabilities);

          const calculatedWacc = dcf.calculateWACC(
            equity,
            debt,
            costOfEquity,
            params.costOfDebt,
            params.taxRateForWacc
          );

          if (calculatedWacc !== null) {
            wacc = calculatedWacc;
          }
        }
      }
    }

    // Actualizar el escenario con los nuevos parámetros
    const updated = await prisma.projectionScenario.update({
      where: { id: scenarioId },
      data: {
        riskFreeRate: params.riskFreeRate,
        beta: params.beta,
        marketRiskPremium: params.marketRiskPremium,
        costOfEquity: costOfEquity,
        costOfDebt: params.costOfDebt,
        taxRateForWacc: params.taxRateForWacc,
        wacc: wacc,
        terminalGrowthRate: params.terminalGrowthRate,
        netDebt: params.netDebt,
      },
      include: {
        projections: {
          orderBy: { year: 'asc' },
        },
      },
    });

    return updated;
  }

  /**
   * Calcular la valoración DCF completa
   */
  async calculateDCFValuation(scenarioId: string) {
    // Importar funciones DCF
    const dcf = await import('../utils/dcf');

    // Obtener el escenario con todas las proyecciones
    const scenario = await prisma.projectionScenario.findUnique({
      where: { id: scenarioId },
      include: {
        projections: {
          orderBy: { year: 'asc' },
        },
        company: {
          include: {
            fiscalYears: {
              where: { year: { equals: (await prisma.projectionScenario.findUnique({ where: { id: scenarioId } }))?.baseYear } },
              include: {
                additionalData: true,
              },
            },
          },
        },
      },
    });

    if (!scenario) {
      throw new Error('Escenario no encontrado');
    }

    // Validar que tengamos los parámetros necesarios
    if (!scenario.wacc) {
      throw new Error('WACC no calculado. Actualice los parámetros DCF primero.');
    }

    if (!scenario.terminalGrowthRate) {
      throw new Error('Tasa de crecimiento terminal no definida.');
    }

    // Obtener FCFs de todas las proyecciones (excluyendo año base)
    const projections = scenario.projections.filter(p => p.year !== scenario.baseYear);

    if (projections.length === 0) {
      throw new Error('No hay proyecciones disponibles para valorar.');
    }

    const fcfs = projections.map(p => toNumber(p.freeCashFlow));

    // Obtener datos del año base para equity, debt, y acciones
    const baseYearProj = scenario.projections.find(p => p.year === scenario.baseYear);
    if (!baseYearProj) {
      throw new Error('Año base no encontrado en las proyecciones.');
    }

    const equity = toNumber(baseYearProj.equity);
    const debt = toNumber(baseYearProj.totalLiabilities);

    // Obtener shares outstanding del año base
    let sharesOutstanding = 1; // Default para evitar división por cero
    if (scenario.company.fiscalYears.length > 0) {
      const baseFiscalYear = scenario.company.fiscalYears[0];
      if (baseFiscalYear.additionalData?.sharesOutstanding) {
        sharesOutstanding = Number(baseFiscalYear.additionalData.sharesOutstanding);
      }
    }

    // Preparar inputs para DCF
    // Si el escenario tiene WACC guardado directamente, lo usamos (tiene prioridad sobre CAPM)
    const savedWacc = toNumber(scenario.wacc);
    const inputs: dcfTypes.DCFInputs = {
      equity,
      debt,
      riskFreeRate: toNumber(scenario.riskFreeRate) || 0.025,
      beta: toNumber(scenario.beta) || 1.0,
      marketRiskPremium: toNumber(scenario.marketRiskPremium) || 0.06,
      costOfDebt: toNumber(scenario.costOfDebt) || 0.04,
      taxRate: toNumber(scenario.taxRateForWacc) || 0.25,
      precomputedWacc: savedWacc > 0 ? savedWacc : undefined,
      fcfs,
      perpetualGrowthRate: toNumber(scenario.terminalGrowthRate),
      netDebt: toNumber(scenario.netDebt) || 0,
      sharesOutstanding,
    };

    // Realizar la valoración DCF
    const results = dcf.performDCFValuation(inputs);

    // Actualizar el escenario con los resultados
    await prisma.projectionScenario.update({
      where: { id: scenarioId },
      data: {
        costOfEquity: results.costOfEquity,
        wacc: results.wacc,
        sumPvOfFCFs: results.sumPvOfFCFs,
        terminalValue: results.terminalValue,
        pvOfTerminalValue: results.pvOfTerminalValue,
        enterpriseValue: results.enterpriseValue,
        equityValue: results.equityValue,
        valuePerShare: results.valuePerShare,
      },
    });

    // Actualizar cada proyección con su discount factor y PV
    for (let i = 0; i < results.pvFCFs.length; i++) {
      const pvData = results.pvFCFs[i];
      const projection = projections[i];

      await prisma.financialProjection.update({
        where: { id: projection.id },
        data: {
          discountFactor: pvData.discountFactor,
          pvOfFCF: pvData.pvOfFCF,
        },
      });
    }

    // Retornar el escenario actualizado con todos los resultados
    return this.getProjectionScenario(scenarioId);
  }

  /**
   * Obtener los resultados DCF de un escenario
   */
  async getDCFResults(scenarioId: string) {
    const scenario = await prisma.projectionScenario.findUnique({
      where: { id: scenarioId },
      include: {
        projections: {
          where: {
            year: { gt: (await prisma.projectionScenario.findUnique({ where: { id: scenarioId } }))?.baseYear || 0 },
          },
          orderBy: { year: 'asc' },
        },
      },
    });

    if (!scenario) {
      throw new Error('Escenario no encontrado');
    }

    return {
      // Parámetros WACC
      riskFreeRate: toNumber(scenario.riskFreeRate),
      beta: toNumber(scenario.beta),
      marketRiskPremium: toNumber(scenario.marketRiskPremium),
      costOfEquity: toNumber(scenario.costOfEquity),
      costOfDebt: toNumber(scenario.costOfDebt),
      taxRateForWacc: toNumber(scenario.taxRateForWacc),
      wacc: toNumber(scenario.wacc),

      // Parámetros de valoración
      terminalGrowthRate: toNumber(scenario.terminalGrowthRate),
      netDebt: toNumber(scenario.netDebt),

      // Resultados
      sumPvOfFCFs: toNumber(scenario.sumPvOfFCFs),
      terminalValue: toNumber(scenario.terminalValue),
      pvOfTerminalValue: toNumber(scenario.pvOfTerminalValue),
      enterpriseValue: toNumber(scenario.enterpriseValue),
      equityValue: toNumber(scenario.equityValue),
      valuePerShare: toNumber(scenario.valuePerShare),

      // Proyecciones con discount factors
      projections: scenario.projections.map(p => ({
        year: p.year,
        freeCashFlow: toNumber(p.freeCashFlow),
        discountFactor: toNumber(p.discountFactor),
        pvOfFCF: toNumber(p.pvOfFCF),
      })),
    };
  }
}
