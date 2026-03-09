import prisma from '../config/database';
import { Prisma } from '@prisma/client';

// Helper para convertir objetos Prisma Decimal a números
function convertDecimalsToNumbers(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  const cleanData: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'object' && 's' in value && 'e' in value && 'd' in value) {
      // Es un Prisma Decimal, convertir a número
      const decimal = value as { s: number; e: number; d: number[] };
      const sign = decimal.s;
      const exponent = decimal.e;
      const digits = decimal.d;

      // Reconstruir el número desde el Decimal
      let num = 0;
      for (let i = 0; i < digits.length; i++) {
        num = num * 10000000 + digits[i];
      }
      num = num * Math.pow(10, exponent - (digits.length - 1) * 7);
      num = num * sign;

      cleanData[key] = num;
    } else {
      cleanData[key] = value;
    }
  }
  return cleanData;
}

export const financialService = {
  // ============= FISCAL YEARS =============

  /**
   * Obtener todos los años fiscales de una empresa
   */
  async getFiscalYears(companyId: string, userId: string) {
    // Verificar que la empresa pertenece al usuario
    const company = await prisma.company.findFirst({
      where: { id: companyId, userId, deletedAt: null },
    });

    if (!company) {
      throw new Error('Empresa no encontrada');
    }

    return await prisma.fiscalYear.findMany({
      where: { companyId },
      orderBy: { year: 'desc' },
      include: {
        balanceSheet: true,
        incomeStatement: true,
        cashFlow: true,
        additionalData: true,
      },
    });
  },

  /**
   * Crear un nuevo año fiscal
   */
  async createFiscalYear(companyId: string, userId: string, data: { year: number; startDate?: Date; endDate?: Date }) {
    // Verificar que la empresa pertenece al usuario
    const company = await prisma.company.findFirst({
      where: { id: companyId, userId, deletedAt: null },
    });

    if (!company) {
      throw new Error('Empresa no encontrada');
    }

    // Verificar que no existe ya ese año
    const existing = await prisma.fiscalYear.findFirst({
      where: { companyId, year: data.year },
    });

    if (existing) {
      return existing;
    }

    return await prisma.fiscalYear.create({
      data: {
        companyId,
        year: data.year,
        startDate: data.startDate,
        endDate: data.endDate,
      },
    });
  },

  // ============= BALANCE SHEET =============

  /**
   * Obtener balance de un año fiscal
   */
  async getBalanceSheet(fiscalYearId: string, userId: string) {
    // Verificar que el año fiscal pertenece a una empresa del usuario
    const fiscalYear = await prisma.fiscalYear.findFirst({
      where: {
        id: fiscalYearId,
        company: { userId, deletedAt: null },
      },
      include: { balanceSheet: true },
    });

    if (!fiscalYear) {
      throw new Error('Año fiscal no encontrado');
    }

    return fiscalYear.balanceSheet;
  },

  /**
   * Crear o actualizar balance
   */
  async upsertBalanceSheet(fiscalYearId: string, userId: string, data: any) {
    // Verificar que el año fiscal pertenece a una empresa del usuario
    const fiscalYear = await prisma.fiscalYear.findFirst({
      where: {
        id: fiscalYearId,
        company: { userId, deletedAt: null },
      },
    });

    if (!fiscalYear) {
      throw new Error('Año fiscal no encontrado');
    }

    // Limpiar datos: remover campos que no deben estar en el upsert
    const { id, fiscalYearId: _, createdAt, updatedAt, fiscalYear: __, ...dirtyData } = data;

    // Convertir Decimals a números
    const cleanData = convertDecimalsToNumbers(dirtyData);

    // Usar upsert de Prisma
    return await prisma.balanceSheet.upsert({
      where: { fiscalYearId },
      create: {
        ...cleanData,
        fiscalYearId,
      },
      update: cleanData,
    });
  },

  // ============= INCOME STATEMENT =============

  /**
   * Obtener cuenta de P&G de un año fiscal
   */
  async getIncomeStatement(fiscalYearId: string, userId: string) {
    const fiscalYear = await prisma.fiscalYear.findFirst({
      where: {
        id: fiscalYearId,
        company: { userId, deletedAt: null },
      },
      include: { incomeStatement: true },
    });

    if (!fiscalYear) {
      throw new Error('Año fiscal no encontrado');
    }

    return fiscalYear.incomeStatement;
  },

  /**
   * Crear o actualizar cuenta de P&G
   */
  async upsertIncomeStatement(fiscalYearId: string, userId: string, data: any) {
    const fiscalYear = await prisma.fiscalYear.findFirst({
      where: {
        id: fiscalYearId,
        company: { userId, deletedAt: null },
      },
    });

    if (!fiscalYear) {
      throw new Error('Año fiscal no encontrado');
    }

    // Limpiar datos: remover campos que no deben estar en el upsert
    const { id, fiscalYearId: _, createdAt, updatedAt, fiscalYear: __, ...dirtyData } = data;

    // Convertir Decimals a números
    const cleanData = convertDecimalsToNumbers(dirtyData);

    return await prisma.incomeStatement.upsert({
      where: { fiscalYearId },
      create: {
        ...cleanData,
        fiscalYearId,
      },
      update: cleanData,
    });
  },

  // ============= CASH FLOW =============

  /**
   * Obtener flujos de efectivo de un año fiscal
   */
  async getCashFlow(fiscalYearId: string, userId: string) {
    const fiscalYear = await prisma.fiscalYear.findFirst({
      where: {
        id: fiscalYearId,
        company: { userId, deletedAt: null },
      },
      include: { cashFlow: true },
    });

    if (!fiscalYear) {
      throw new Error('Año fiscal no encontrado');
    }

    return fiscalYear.cashFlow;
  },

  /**
   * Crear o actualizar flujos de efectivo
   */
  async upsertCashFlow(fiscalYearId: string, userId: string, data: any) {
    const fiscalYear = await prisma.fiscalYear.findFirst({
      where: {
        id: fiscalYearId,
        company: { userId, deletedAt: null },
      },
    });

    if (!fiscalYear) {
      throw new Error('Año fiscal no encontrado');
    }

    // Limpiar datos: remover campos que no deben estar en el upsert
    const { id, fiscalYearId: _, createdAt, updatedAt, fiscalYear: __, ...dirtyData } = data;

    // Convertir Decimals a números
    const cleanData = convertDecimalsToNumbers(dirtyData);

    return await prisma.cashFlow.upsert({
      where: { fiscalYearId },
      create: {
        ...cleanData,
        fiscalYearId,
      },
      update: cleanData,
    });
  },

  // ============= ADDITIONAL DATA =============

  /**
   * Obtener datos adicionales de un año fiscal
   */
  async getAdditionalData(fiscalYearId: string, userId: string) {
    const fiscalYear = await prisma.fiscalYear.findFirst({
      where: {
        id: fiscalYearId,
        company: { userId, deletedAt: null },
      },
      include: { additionalData: true },
    });

    if (!fiscalYear) {
      throw new Error('Año fiscal no encontrado');
    }

    return fiscalYear.additionalData;
  },

  /**
   * Crear o actualizar datos adicionales
   */
  async upsertAdditionalData(fiscalYearId: string, userId: string, data: any) {
    const fiscalYear = await prisma.fiscalYear.findFirst({
      where: {
        id: fiscalYearId,
        company: { userId, deletedAt: null },
      },
    });

    if (!fiscalYear) {
      throw new Error('Año fiscal no encontrado');
    }

    // Limpiar datos: remover campos que no deben estar en el upsert
    const { id, fiscalYearId: _, createdAt, updatedAt, fiscalYear: __, ...dirtyData } = data;

    // Convertir Decimals a números
    const cleanData = convertDecimalsToNumbers(dirtyData);

    return await prisma.additionalData.upsert({
      where: { fiscalYearId },
      create: {
        ...cleanData,
        fiscalYearId,
      },
      update: cleanData,
    });
  },

  // ============= SUMMARY / ANALYSIS =============

  /**
   * Obtener resumen completo de un año fiscal
   */
  async getFiscalYearSummary(fiscalYearId: string, userId: string) {
    const fiscalYear = await prisma.fiscalYear.findFirst({
      where: {
        id: fiscalYearId,
        company: { userId, deletedAt: null },
      },
      include: {
        company: true,
        balanceSheet: true,
        incomeStatement: true,
        cashFlow: true,
        additionalData: true,
      },
    });

    if (!fiscalYear) {
      throw new Error('Año fiscal no encontrado');
    }

    return fiscalYear;
  },
};
