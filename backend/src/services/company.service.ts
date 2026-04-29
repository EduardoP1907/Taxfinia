import prisma from '../config/database';
import { Company, Prisma } from '@prisma/client';

interface CreateCompanyData {
  name: string;
  taxId?: string;
  industry?: string;
  businessActivity?: string;
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
    const company = await prisma.company.create({
      data: {
        userId,
        name: data.name,
        taxId: data.taxId,
        industry: data.industry,
        businessActivity: data.businessActivity,
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

    const updated = await prisma.company.update({
      where: { id: companyId },
      data: {
        name: data.name,
        taxId: data.taxId,
        industry: data.industry,
        businessActivity: data.businessActivity,
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

/** Lock a company so its financial data can no longer be edited */
export async function lockCompany(companyId: string): Promise<void> {
  await prisma.company.update({
    where: { id: companyId },
    data: { isLocked: true },
  });
}
