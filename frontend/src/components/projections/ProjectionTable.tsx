/**
 * Projection Table Component
 * Displays projection data similar to Excel Sheet 4.1
 */

import React from 'react';
import { type FinancialProjection } from '../../services/projections.service';

interface ProjectionTableProps {
  projections: FinancialProjection[];
  baseYear: number;
}

const ProjectionTable: React.FC<ProjectionTableProps> = ({ projections, baseYear }) => {
  const formatNumber = (value: number | null | undefined, decimals: number = 2): string => {
    if (value === null || value === undefined || isNaN(value)) return '-';
    return new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  };

  const formatPercent = (value: number | null | undefined): string => {
    if (value === null || value === undefined || isNaN(value)) return '-';
    return `${formatNumber(value * 100, 2)}%`;
  };

  // Sort projections by year
  const sortedProjections = [...projections].sort((a, b) => a.year - b.year);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-100 border-b-2 border-gray-300">
            <th className="px-4 py-3 text-left font-semibold text-gray-700 sticky left-0 bg-gray-100 z-10 min-w-[250px]">
              Concepto
            </th>
            {sortedProjections.map((proj) => (
              <th
                key={proj.id}
                className={`px-4 py-3 text-center font-semibold ${
                  proj.year === baseYear
                    ? 'bg-blue-100 text-blue-900'
                    : 'text-gray-700'
                }`}
              >
                {proj.year}
                {proj.year === baseYear && (
                  <div className="text-xs font-normal text-blue-700">Base</div>
                )}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-200">
          {/* BALANCE SHEET SECTION */}
          <tr className="bg-blue-50">
            <td colSpan={sortedProjections.length + 1} className="px-4 py-2 font-bold text-blue-900 sticky left-0 bg-blue-50 z-10">
              BALANCE DE SITUACIÓN
            </td>
          </tr>

          <tr className="hover:bg-gray-50">
            <td className="px-4 py-2 sticky left-0 bg-white z-10">TOTAL ACTIVO</td>
            {sortedProjections.map((proj) => (
              <td key={proj.id} className="px-4 py-2 text-right font-medium">
                {formatNumber(proj.totalAssets, 0)}
              </td>
            ))}
          </tr>

          <tr className="hover:bg-gray-50 bg-gray-50">
            <td className="px-4 py-2 pl-8 text-gray-600 sticky left-0 bg-gray-50 z-10">
              Tasa crecimiento
            </td>
            {sortedProjections.map((proj) => (
              <td key={proj.id} className="px-4 py-2 text-right text-gray-600">
                {formatPercent(proj.totalAssetsGrowthRate)}
              </td>
            ))}
          </tr>

          <tr className="hover:bg-gray-50">
            <td className="px-4 py-2 sticky left-0 bg-white z-10">PATRIMONIO NETO</td>
            {sortedProjections.map((proj) => (
              <td key={proj.id} className="px-4 py-2 text-right font-medium">
                {formatNumber(proj.equity, 0)}
              </td>
            ))}
          </tr>

          <tr className="hover:bg-gray-50 bg-gray-50">
            <td className="px-4 py-2 pl-8 text-gray-600 sticky left-0 bg-gray-50 z-10">
              Tasa crecimiento
            </td>
            {sortedProjections.map((proj) => (
              <td key={proj.id} className="px-4 py-2 text-right text-gray-600">
                {formatPercent(proj.equityGrowthRate)}
              </td>
            ))}
          </tr>

          <tr className="hover:bg-gray-50">
            <td className="px-4 py-2 sticky left-0 bg-white z-10">TOTAL PASIVO</td>
            {sortedProjections.map((proj) => (
              <td key={proj.id} className="px-4 py-2 text-right font-medium">
                {formatNumber(proj.totalLiabilities, 0)}
              </td>
            ))}
          </tr>

          <tr className="hover:bg-gray-50 bg-gray-50">
            <td className="px-4 py-2 pl-8 text-gray-600 sticky left-0 bg-gray-50 z-10">
              Tasa crecimiento
            </td>
            {sortedProjections.map((proj) => (
              <td key={proj.id} className="px-4 py-2 text-right text-gray-600">
                {formatPercent(proj.totalLiabilitiesGrowthRate)}
              </td>
            ))}
          </tr>

          {/* INCOME STATEMENT SECTION */}
          <tr className="bg-green-50">
            <td colSpan={sortedProjections.length + 1} className="px-4 py-2 font-bold text-green-900 sticky left-0 bg-green-50 z-10">
              CUENTA DE RESULTADOS
            </td>
          </tr>

          <tr className="hover:bg-gray-50">
            <td className="px-4 py-2 sticky left-0 bg-white z-10">Ingresos por VENTAS</td>
            {sortedProjections.map((proj) => (
              <td key={proj.id} className="px-4 py-2 text-right font-medium">
                {formatNumber(proj.revenue, 0)}
              </td>
            ))}
          </tr>

          <tr className="hover:bg-gray-50 bg-gray-50">
            <td className="px-4 py-2 pl-8 text-gray-600 sticky left-0 bg-gray-50 z-10">
              Tasa crecimiento
            </td>
            {sortedProjections.map((proj) => (
              <td key={proj.id} className="px-4 py-2 text-right text-gray-600">
                {formatPercent(proj.revenueGrowthRate)}
              </td>
            ))}
          </tr>

          <tr className="hover:bg-gray-50">
            <td className="px-4 py-2 sticky left-0 bg-white z-10">Coste de las ventas</td>
            {sortedProjections.map((proj) => (
              <td key={proj.id} className="px-4 py-2 text-right font-medium">
                {formatNumber(proj.costOfSales, 0)}
              </td>
            ))}
          </tr>

          <tr className="hover:bg-gray-50 bg-gray-50">
            <td className="px-4 py-2 pl-8 text-gray-600 sticky left-0 bg-gray-50 z-10">
              Tasa crecimiento
            </td>
            {sortedProjections.map((proj) => (
              <td key={proj.id} className="px-4 py-2 text-right text-gray-600">
                {formatPercent(proj.costOfSalesGrowthRate)}
              </td>
            ))}
          </tr>

          <tr className="hover:bg-gray-50">
            <td className="px-4 py-2 sticky left-0 bg-white z-10">Otros gastos de explotación</td>
            {sortedProjections.map((proj) => (
              <td key={proj.id} className="px-4 py-2 text-right font-medium">
                {formatNumber(proj.otherOperatingExpenses, 0)}
              </td>
            ))}
          </tr>

          <tr className="hover:bg-gray-50 bg-gray-50">
            <td className="px-4 py-2 pl-8 text-gray-600 sticky left-0 bg-gray-50 z-10">
              Tasa crecimiento
            </td>
            {sortedProjections.map((proj) => (
              <td key={proj.id} className="px-4 py-2 text-right text-gray-600">
                {formatPercent(proj.otherOperatingExpensesGrowthRate)}
              </td>
            ))}
          </tr>

          <tr className="hover:bg-gray-50">
            <td className="px-4 py-2 sticky left-0 bg-white z-10">Depreciaciones</td>
            {sortedProjections.map((proj) => (
              <td key={proj.id} className="px-4 py-2 text-right font-medium">
                {formatNumber(proj.depreciation, 0)}
              </td>
            ))}
          </tr>

          <tr className="hover:bg-gray-50 bg-gray-50">
            <td className="px-4 py-2 pl-8 text-gray-600 sticky left-0 bg-gray-50 z-10">
              Tasa crecimiento
            </td>
            {sortedProjections.map((proj) => (
              <td key={proj.id} className="px-4 py-2 text-right text-gray-600">
                {formatPercent(proj.depreciationGrowthRate)}
              </td>
            ))}
          </tr>

          {/* CALCULATED METRICS */}
          <tr className="bg-yellow-50">
            <td colSpan={sortedProjections.length + 1} className="px-4 py-2 font-bold text-yellow-900 sticky left-0 bg-yellow-50 z-10">
              MÉTRICAS CALCULADAS
            </td>
          </tr>

          <tr className="hover:bg-gray-50 bg-blue-100">
            <td className="px-4 py-2 font-semibold sticky left-0 bg-blue-100 z-10">EBITDA</td>
            {sortedProjections.map((proj) => (
              <td key={proj.id} className="px-4 py-2 text-right font-bold text-blue-900">
                {formatNumber(proj.ebitda, 0)}
              </td>
            ))}
          </tr>

          <tr className="hover:bg-gray-50 bg-blue-100">
            <td className="px-4 py-2 font-semibold sticky left-0 bg-blue-100 z-10">EBIT</td>
            {sortedProjections.map((proj) => (
              <td key={proj.id} className="px-4 py-2 text-right font-bold text-blue-900">
                {formatNumber(proj.ebit, 0)}
              </td>
            ))}
          </tr>

          <tr className="hover:bg-gray-50">
            <td className="px-4 py-2 sticky left-0 bg-white z-10">Resultado excepcional neto</td>
            {sortedProjections.map((proj) => (
              <td key={proj.id} className="px-4 py-2 text-right font-medium">
                {formatNumber(proj.exceptionalNet, 0)}
              </td>
            ))}
          </tr>

          <tr className="hover:bg-gray-50">
            <td className="px-4 py-2 sticky left-0 bg-white z-10">Ingresos financieros</td>
            {sortedProjections.map((proj) => (
              <td key={proj.id} className="px-4 py-2 text-right font-medium">
                {formatNumber(proj.financialIncome, 0)}
              </td>
            ))}
          </tr>

          <tr className="hover:bg-gray-50">
            <td className="px-4 py-2 sticky left-0 bg-white z-10">Gastos financieros</td>
            {sortedProjections.map((proj) => (
              <td key={proj.id} className="px-4 py-2 text-right font-medium">
                {formatNumber(proj.financialExpenses, 0)}
              </td>
            ))}
          </tr>

          <tr className="hover:bg-gray-50 bg-amber-50">
            <td className="px-4 py-2 font-semibold sticky left-0 bg-amber-50 z-10">EBT (B.A.I.)</td>
            {sortedProjections.map((proj) => (
              <td key={proj.id} className="px-4 py-2 text-right font-bold text-slate-900">
                {formatNumber(proj.ebt, 0)}
              </td>
            ))}
          </tr>

          <tr className="hover:bg-gray-50">
            <td className="px-4 py-2 sticky left-0 bg-white z-10">Impuesto sobre beneficios</td>
            {sortedProjections.map((proj) => (
              <td key={proj.id} className="px-4 py-2 text-right font-medium">
                {formatNumber(proj.incomeTax, 0)}
              </td>
            ))}
          </tr>

          <tr className="hover:bg-gray-50 bg-gray-50">
            <td className="px-4 py-2 pl-8 text-gray-600 sticky left-0 bg-gray-50 z-10">
              Tasa impositiva
            </td>
            {sortedProjections.map((proj) => (
              <td key={proj.id} className="px-4 py-2 text-right text-gray-600">
                {formatPercent(proj.taxRate)}
              </td>
            ))}
          </tr>

          <tr className="hover:bg-gray-50 bg-green-100">
            <td className="px-4 py-2 font-semibold sticky left-0 bg-green-100 z-10">BENEFICIO NETO</td>
            {sortedProjections.map((proj) => (
              <td key={proj.id} className="px-4 py-2 text-right font-bold text-green-900">
                {formatNumber(proj.netIncome, 0)}
              </td>
            ))}
          </tr>

          <tr className="hover:bg-gray-50 bg-blue-100">
            <td className="px-4 py-2 font-semibold sticky left-0 bg-blue-100 z-10">NOPAT</td>
            {sortedProjections.map((proj) => (
              <td key={proj.id} className="px-4 py-2 text-right font-bold text-blue-900">
                {formatNumber(proj.nopat, 0)}
              </td>
            ))}
          </tr>

          {/* RATIOS SECTION */}
          <tr className="bg-orange-50">
            <td colSpan={sortedProjections.length + 1} className="px-4 py-2 font-bold text-orange-900 sticky left-0 bg-orange-50 z-10">
              RATIOS
            </td>
          </tr>

          <tr className="hover:bg-gray-50">
            <td className="px-4 py-2 sticky left-0 bg-white z-10">ROA (%)</td>
            {sortedProjections.map((proj) => (
              <td key={proj.id} className="px-4 py-2 text-right font-medium">
                {formatPercent(proj.roa !== null ? proj.roa / 100 : null)}
              </td>
            ))}
          </tr>

          <tr className="hover:bg-gray-50">
            <td className="px-4 py-2 sticky left-0 bg-white z-10">ROE (%)</td>
            {sortedProjections.map((proj) => (
              <td key={proj.id} className="px-4 py-2 text-right font-medium">
                {formatPercent(proj.roe !== null ? proj.roe / 100 : null)}
              </td>
            ))}
          </tr>

          <tr className="hover:bg-gray-50">
            <td className="px-4 py-2 sticky left-0 bg-white z-10">Apalancamiento financiero</td>
            {sortedProjections.map((proj) => (
              <td key={proj.id} className="px-4 py-2 text-right font-medium">
                {formatNumber(proj.financialLeverage, 2)}
              </td>
            ))}
          </tr>

          <tr className="hover:bg-gray-50">
            <td className="px-4 py-2 sticky left-0 bg-white z-10">Riesgo operativo</td>
            {sortedProjections.map((proj) => (
              <td key={proj.id} className="px-4 py-2 text-right font-medium">
                {formatNumber(proj.operationalRisk, 2)}
              </td>
            ))}
          </tr>

          <tr className="hover:bg-gray-50">
            <td className="px-4 py-2 sticky left-0 bg-white z-10">Riesgo financiero</td>
            {sortedProjections.map((proj) => (
              <td key={proj.id} className="px-4 py-2 text-right font-medium">
                {formatNumber(proj.financialRisk, 2)}
              </td>
            ))}
          </tr>

          {/* CASH FLOW SECTION */}
          <tr className="bg-slate-50">
            <td colSpan={sortedProjections.length + 1} className="px-4 py-2 font-bold text-slate-900 sticky left-0 bg-slate-50 z-10">
              FLUJO DE CAJA
            </td>
          </tr>

          <tr className="hover:bg-gray-50">
            <td className="px-4 py-2 sticky left-0 bg-white z-10">Inversión en capital de trabajo</td>
            {sortedProjections.map((proj) => (
              <td key={proj.id} className="px-4 py-2 text-right font-medium">
                {formatNumber(proj.workingCapitalInvestment, 0)}
              </td>
            ))}
          </tr>

          <tr className="hover:bg-gray-50">
            <td className="px-4 py-2 sticky left-0 bg-white z-10">Inversión en activos fijos</td>
            {sortedProjections.map((proj) => (
              <td key={proj.id} className="px-4 py-2 text-right font-medium">
                {formatNumber(proj.fixedAssetsInvestment, 0)}
              </td>
            ))}
          </tr>

          <tr className="hover:bg-gray-50 bg-blue-100">
            <td className="px-4 py-2 font-semibold sticky left-0 bg-blue-100 z-10">Flujo de caja bruto</td>
            {sortedProjections.map((proj) => (
              <td key={proj.id} className="px-4 py-2 text-right font-bold text-blue-900">
                {formatNumber(proj.grossCashFlow, 0)}
              </td>
            ))}
          </tr>

          <tr className="hover:bg-gray-50 bg-green-100">
            <td className="px-4 py-2 font-semibold sticky left-0 bg-green-100 z-10">Free Cash Flow (FCF)</td>
            {sortedProjections.map((proj) => (
              <td key={proj.id} className="px-4 py-2 text-right font-bold text-green-900">
                {formatNumber(proj.freeCashFlow, 0)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default ProjectionTable;
