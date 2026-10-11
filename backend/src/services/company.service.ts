import prisma from '../config/database';
import { Company, Prisma } from '@prisma/client';
import {
  AccessError, getAccessUser, isPrivileged, validateTaxId, assertTaxIdAvailable,
  companyHasConsolidatedData, consolidateAnnualYears, unconsolidateAnnualYears,
} from './access.service';

/** Empresas activas permitidas por usuario (los privilegiados no tienen límite). */
export const MAX_COMPANIES_PER_USER = 1;

interface CreateCompanyData {
  name: string;
  taxId?: string;
  industry?: string;
  businessActivity?: string;
  companySize?: string;
  country?: string;
  description?: string;
  website?: string;
  employees?: number;
  foundedYear?: number;
  baseYear: number;
  currency?: string;
}

interface UpdateCompanyData {
  name?: string;
  taxId?: string;
  industry?: string;
  businessActivity?: string;
  companySize?: string;
  country?: string;
  description?: string;
  website?: string;
  employees?: number;
  foundedYear?: number;
  baseYear?: number;
  currency?: string;
}

export class CompanyService {
  async createCompany(userId: string, data: CreateCompanyData): Promise<Company> {
    const user = await getAccessUser(userId);
    if (!user) throw new AccessError('Usuario no encontrado', 401);
    const privileged = isPrivileged(user);

    let taxId = data.taxId;
    if (!privileged) {
      const count = await prisma.company.count({ where: { userId, deletedAt: null } });
      if (count >= MAX_COMPANIES_PER_USER) {
        throw new AccessError('Tu cuenta permite registrar una sola empresa.', 403);
      }
      taxId = validateTaxId(data.taxId, data.country);
      await assertTaxIdAvailable(taxId);
    }

    const company = await prisma.company.create({
      data: {
        userId,
        name: data.name,
        taxId,
        industry: data.industry,
        businessActivity: data.businessActivity,
        companySize: data.companySize,
        country: data.country || 'ES',
        description: data.description,
        website: data.website,
        employees: data.employees,
        foundedYear: data.foundedYear,
        baseYear: data.baseYear,
        currency: data.currency || 'EUR',
      },
    });

    return company;
  }

  async getCompanies(userId: string): Promise<Company[]> {
    const companies = await prisma.company.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return companies;
  }

  async getCompanyById(companyId: string, userId: string): Promise<Company | null> {
    const company = await prisma.company.findFirst({
      where: {
        id: companyId,
        userId,
        deletedAt: null,
      },
      include: {
        fiscalYears: {
          orderBy: {
            year: 'desc',
          },
        },
      },
    });

    return company;
  }

  async updateCompany(
    companyId: string,
    userId: string,
    data: UpdateCompanyData
  ): Promise<Company> {
    // Verificar que la empresa pertenece al usuario
    const company = await prisma.company.findFirst({
      where: {
        id: companyId,
        userId,
        deletedAt: null,
      },
    });

    if (!company) {
      throw new Error('Empresa no encontrada');
    }

    // Antifraude: tras el primer informe o consulta al asistente, la identidad de
    // la empresa (razón social y RUT) queda fija; el RUT siempre debe ser válido y único.
    let taxId = data.taxId;
    const user = await getAccessUser(userId);
    if (user && !isPrivileged(user)) {
      const norm = (v: string | null | undefined) => (v ?? '').replace(/[^0-9A-Za-z]/g, '').toUpperCase();
      const nameChanged = data.name !== undefined && data.name.trim() !== company.name.trim();
      const taxIdChanged = data.taxId !== undefined && norm(data.taxId) !== norm(company.taxId);
      if ((nameChanged || taxIdChanged) && await companyHasConsolidatedData(companyId)) {
        throw new AccessError('La razón social y el RUT no se pueden modificar después de generar un informe o usar el asistente.', 403);
      }
      if (taxIdChanged || (data.country !== undefined && data.country !== company.country)) {
        taxId = validateTaxId(data.taxId ?? company.taxId, data.country ?? company.country);
        await assertTaxIdAvailable(taxId, companyId);
      }
    }

    const updated = await prisma.company.update({
      where: { id: companyId },
      data: {
        name: data.name,
        taxId,
        industry: data.industry,
        businessActivity: data.businessActivity,
        companySize: data.companySize,
        country: data.country,
        description: data.description,
        website: data.website,
        employees: data.employees,
        foundedYear: data.foundedYear,
        baseYear: data.baseYear,
        currency: data.currency,
        updatedAt: new Date(),
      },
    });

    return updated;
  }

  async deleteCompany(companyId: string, userId: string): Promise<void> {
    // Verificar que la empresa pertenece al usuario
    const company = await prisma.company.findFirst({
      where: {
        id: companyId,
        userId,
        deletedAt: null,
      },
    });

    if (!company) {
      throw new Error('Empresa no encontrada');
    }

    // Antifraude: una empresa con informes o datos consolidados no se puede
    // eliminar (evita borrarla y registrar otra con la misma suscripción).
    const user = await getAccessUser(userId);
    if (user && !isPrivileged(user) && await companyHasConsolidatedData(companyId)) {
      throw new AccessError('Esta empresa ya tiene informes generados y no se puede eliminar. Contacta al administrador si necesitas hacerlo.', 403);
    }

    // Soft delete
    await prisma.company.update({
      where: { id: companyId },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  async getCompanySummary(companyId: string, userId: string) {
    const company = await this.getCompanyById(companyId, userId);

    if (!company) {
      throw new Error('Empresa no encontrada');
    }

    // Obtener años fiscales
    const fiscalYears = await prisma.fiscalYear.findMany({
      where: { companyId },
      orderBy: { year: 'desc' },
    });

    // Contar balances completados
    const balanceSheets = await prisma.balanceSheet.count({
      where: {
        fiscalYear: {
          companyId,
        },
      },
    });

    // Contar P&G completados
    const incomeStatements = await prisma.incomeStatement.count({
      where: {
        fiscalYear: {
          companyId,
        },
      },
    });

    return {
      company,
      fiscalYearsCount: fiscalYears.length,
      balanceSheetsCount: balanceSheets,
      incomeStatementsCount: incomeStatements,
      lastUpdated: company.updatedAt,
    };
  }
  async getDashboardStats(userId: string): Promise<{
    companyCount: number;
    reportCount: number;
    analysisCount: number;
  }> {
    const companies = await prisma.company.findMany({
      where: { userId, deletedAt: null },
      select: { id: true },
    });
    const companyIds = companies.map((c) => c.id);

    const [reportCount, analysisCount] = await Promise.all([
      prisma.report.count({
        where: { companyId: { in: companyIds }, status: 'COMPLETED' },
      }),
      prisma.calculatedRatios.count({
        where: { fiscalYear: { companyId: { in: companyIds } } },
      }),
    ]);

    return {
      companyCount: companyIds.length,
      reportCount,
      analysisCount,
    };
  }
}

export const companyService = new CompanyService();

/**
 * Consolida los ejercicios anuales de la empresa (quedan solo lectura).
 * Se llama al generar el informe anual y al usar el asistente IA.
 * Las empresas de usuarios exentos o administradores nunca se consolidan.
 */
export async function lockCompany(companyId: string): Promise<void> {
  await consolidateAnnualYears(companyId);
}

/** Admin: habilita de nuevo la edición de todos los ejercicios anuales */
export async function unlockCompany(companyId: string): Promise<void> {
  await unconsolidateAnnualYears(companyId);
}

/** Get all companies (admin view — across all users) */
export async function getAllCompaniesAdmin(): Promise<{
  id: string; name: string; taxId: string | null; isLocked: boolean;
  userId: string; createdAt: Date; currency: string;
  consolidatedYears: number[];
}[]> {
  const companies = await prisma.company.findMany({
    where: { deletedAt: null },
    select: {
      id: true, name: true, taxId: true, userId: true, createdAt: true, currency: true,
      fiscalYears: {
        where: { quarter: 0, month: 0, consolidatedAt: { not: null } },
        select: { year: true },
        orderBy: { year: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  // isLocked = tiene algún ejercicio consolidado (compatibilidad con el panel admin)
  return companies.map(({ fiscalYears, ...c }) => ({
    ...c,
    consolidatedYears: fiscalYears.map(f => f.year),
    isLocked: fiscalYears.length > 0,
  }));
}
