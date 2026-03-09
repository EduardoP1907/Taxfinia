import React from 'react';
import { type CompanyAnalysisYear } from '../../services/ratios.service';

interface Props {
  years: CompanyAnalysisYear[];
  currency?: string;
}

export const BalanceSheetSection: React.FC<Props> = ({ years, currency = 'EUR' }) => {
  const formatCurrency = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '-';
    return value.toLocaleString('es-ES', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const formatPercentage = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '-';
    return (value * 100).toFixed(2) + '%';
  };

  // Ordenar años de más reciente a más antiguo
  const sortedYears = [...years].sort((a, b) => b.year - a.year);

  // Calcular valores del balance para cada año
  const getBalanceValues = (yearData: CompanyAnalysisYear) => {
    const bs = yearData.balanceSheet;
    if (!bs) return null;

    // ACTIVO
    const tangibleAssets = Number(bs.tangibleAssets || 0);
    const intangibleAssets = Number(bs.intangibleAssets || 0);
    const financialInvestmentsLp = Number(bs.financialInvestmentsLp || 0);
    const otherNoncurrentAssets = Number(bs.otherNoncurrentAssets || 0);
    const nonCurrentAssets = tangibleAssets + intangibleAssets + financialInvestmentsLp + otherNoncurrentAssets;

    const inventory = Number(bs.inventory || 0);
    const accountsReceivable = Number(bs.accountsReceivable || 0);
    const otherReceivables = Number(bs.otherReceivables || 0);
    const taxReceivables = Number(bs.taxReceivables || 0);
    const cashEquivalents = Number(bs.cashEquivalents || 0);
    const currentAssets = inventory + accountsReceivable + otherReceivables + taxReceivables + cashEquivalents;

    const totalAssets = nonCurrentAssets + currentAssets;

    // PASIVO Y PATRIMONIO NETO
    const shareCapital = Number(bs.shareCapital || 0);
    const reserves = Number(bs.reserves || 0);
    const retainedEarnings = Number(bs.retainedEarnings || 0);
    const treasuryStock = Number(bs.treasuryStock || 0);
    const equity = shareCapital + reserves + retainedEarnings - treasuryStock;

    const provisionsLp = Number(bs.provisionsLp || 0);
    const bankDebtLp = Number(bs.bankDebtLp || 0);
    const otherLiabilitiesLp = Number(bs.otherLiabilitiesLp || 0);
    const nonCurrentLiabilities = provisionsLp + bankDebtLp + otherLiabilitiesLp;

    const provisionsSp = Number(bs.provisionsSp || 0);
    const bankDebtSp = Number(bs.bankDebtSp || 0);
    const accountsPayable = Number(bs.accountsPayable || 0);
    const taxLiabilities = Number(bs.taxLiabilities || 0);
    const otherLiabilitiesSp = Number(bs.otherLiabilitiesSp || 0);
    const currentLiabilities = provisionsSp + bankDebtSp + accountsPayable + taxLiabilities + otherLiabilitiesSp;

    const totalLiabilities = nonCurrentLiabilities + currentLiabilities;
    const totalEquityAndLiabilities = equity + totalLiabilities;

    return {
      // Activo No Corriente
      tangibleAssets,
      intangibleAssets,
      financialInvestmentsLp,
      otherNoncurrentAssets,
      nonCurrentAssets,

      // Activo Corriente
      inventory,
      accountsReceivable,
      otherReceivables,
      taxReceivables,
      cashEquivalents,
      currentAssets,

      totalAssets,

      // Patrimonio Neto
      shareCapital,
      reserves,
      retainedEarnings,
      treasuryStock,
      equity,

      // Pasivo No Corriente
      provisionsLp,
      bankDebtLp,
      otherLiabilitiesLp,
      nonCurrentLiabilities,

      // Pasivo Corriente
      provisionsSp,
      bankDebtSp,
      accountsPayable,
      taxLiabilities,
      otherLiabilitiesSp,
      currentLiabilities,

      totalLiabilities,
      totalEquityAndLiabilities,
    };
  };

  const activos = [
    { label: 'A) ACTIVO NO CORRIENTE', key: 'nonCurrentAssets', isBold: true, isTotal: true, bgClass: 'bg-blue-100' },
    { label: 'Inmovilizado material', key: 'tangibleAssets', indent: 1 },
    { label: 'Inmovilizado inmaterial', key: 'intangibleAssets', indent: 1 },
    { label: 'Inversiones financieras LP', key: 'financialInvestmentsLp', indent: 1 },
    { label: 'Otro realizable a largo plazo', key: 'otherNoncurrentAssets', indent: 1 },
    { label: 'B) ACTIVO CORRIENTE', key: 'currentAssets', isBold: true, isTotal: true, bgClass: 'bg-green-100' },
    { label: 'Existencias', key: 'inventory', indent: 1 },
    { label: 'Clientes', key: 'accountsReceivable', indent: 1 },
    { label: 'Otros deudores', key: 'otherReceivables', indent: 1 },
    { label: 'Deudores por impuestos', key: 'taxReceivables', indent: 1 },
    { label: 'Disponible (Caja y bancos)', key: 'cashEquivalents', indent: 1 },
    { label: 'TOTAL ACTIVO', key: 'totalAssets', isBold: true, isTotal: true, bgClass: 'bg-amber-50' },
  ];

  const pasivos = [
    { label: 'A) PATRIMONIO NETO', key: 'equity', isBold: true, isTotal: true, bgClass: 'bg-blue-100' },
    { label: 'Capital social', key: 'shareCapital', indent: 1 },
    { label: 'Reservas', key: 'reserves', indent: 1 },
    { label: 'Resultados acumulados', key: 'retainedEarnings', indent: 1 },
    { label: 'Acciones propias', key: 'treasuryStock', indent: 1, isNegative: true },
    { label: 'B) PASIVO NO CORRIENTE', key: 'nonCurrentLiabilities', isBold: true, isTotal: true, bgClass: 'bg-orange-100' },
    { label: 'Provisiones LP', key: 'provisionsLp', indent: 1 },
    { label: 'Deudas con entidades de crédito LP', key: 'bankDebtLp', indent: 1 },
    { label: 'Otras deudas LP', key: 'otherLiabilitiesLp', indent: 1 },
    { label: 'C) PASIVO CORRIENTE', key: 'currentLiabilities', isBold: true, isTotal: true, bgClass: 'bg-red-100' },
    { label: 'Provisiones CP', key: 'provisionsSp', indent: 1 },
    { label: 'Deudas con entidades de crédito CP', key: 'bankDebtSp', indent: 1 },
    { label: 'Proveedores', key: 'accountsPayable', indent: 1 },
    { label: 'Acreedores por impuestos', key: 'taxLiabilities', indent: 1 },
    { label: 'Otras deudas CP', key: 'otherLiabilitiesSp', indent: 1 },
    { label: 'TOTAL PATRIMONIO NETO Y PASIVO', key: 'totalEquityAndLiabilities', isBold: true, isTotal: true, bgClass: 'bg-amber-50' },
  ];

  return (
    <div className="space-y-8">
      {/* ACTIVO */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Balance de Situación - ACTIVO
        </h2>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                  ACTIVO
                </th>
                {sortedYears.map(year => (
                  <React.Fragment key={year.year}>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {year.year}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      %
                    </th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activos.map((row, index) => {
                const values = sortedYears.map(year => getBalanceValues(year));

                return (
                  <tr
                    key={row.key}
                    className={`
                      ${row.bgClass || (index % 2 === 0 ? 'bg-white' : 'bg-gray-50')}
                      ${row.isBold ? 'font-semibold' : ''}
                      hover:bg-gray-100 transition-colors
                    `}
                  >
                    <td className={`
                      px-4 py-2 text-sm text-gray-900 sticky left-0 z-10
                      ${row.bgClass || (index % 2 === 0 ? 'bg-white' : 'bg-gray-50')}
                      ${row.isBold ? 'font-semibold' : ''}
                      ${row.indent ? `pl-${4 + row.indent * 4}` : ''}
                    `}>
                      {row.label}
                    </td>
                    {values.map((value, yearIndex) => {
                      if (!value) {
                        return (
                          <React.Fragment key={`${row.key}-${yearIndex}`}>
                            <td className="px-4 py-2 text-sm text-right text-gray-500">-</td>
                            <td className="px-4 py-2 text-sm text-right text-gray-500">-</td>
                          </React.Fragment>
                        );
                      }

                      const amount = value[row.key as keyof typeof value] as number;
                      const percentage = value.totalAssets > 0 ? amount / value.totalAssets : 0;
                      const isNegative = amount < 0;

                      return (
                        <React.Fragment key={`${row.key}-${yearIndex}`}>
                          <td className={`
                            px-4 py-2 text-sm text-right
                            ${isNegative ? 'text-red-600' : row.isBold ? 'text-gray-900 font-semibold' : 'text-gray-700'}
                          `}>
                            {formatCurrency(amount)}
                          </td>
                          <td className={`
                            px-4 py-2 text-sm text-right
                            ${isNegative ? 'text-red-600' : 'text-gray-600'}
                          `}>
                            {formatPercentage(percentage)}
                          </td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* PASIVO Y PATRIMONIO NETO */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Balance de Situación - PASIVO Y PATRIMONIO NETO
        </h2>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                  PASIVO Y PATRIMONIO NETO
                </th>
                {sortedYears.map(year => (
                  <React.Fragment key={year.year}>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {year.year}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      %
                    </th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pasivos.map((row, index) => {
                const values = sortedYears.map(year => getBalanceValues(year));

                return (
                  <tr
                    key={row.key}
                    className={`
                      ${row.bgClass || (index % 2 === 0 ? 'bg-white' : 'bg-gray-50')}
                      ${row.isBold ? 'font-semibold' : ''}
                      hover:bg-gray-100 transition-colors
                    `}
                  >
                    <td className={`
                      px-4 py-2 text-sm text-gray-900 sticky left-0 z-10
                      ${row.bgClass || (index % 2 === 0 ? 'bg-white' : 'bg-gray-50')}
                      ${row.isBold ? 'font-semibold' : ''}
                      ${row.indent ? `pl-${4 + row.indent * 4}` : ''}
                    `}>
                      {row.label}
                    </td>
                    {values.map((value, yearIndex) => {
                      if (!value) {
                        return (
                          <React.Fragment key={`${row.key}-${yearIndex}`}>
                            <td className="px-4 py-2 text-sm text-right text-gray-500">-</td>
                            <td className="px-4 py-2 text-sm text-right text-gray-500">-</td>
                          </React.Fragment>
                        );
                      }

                      const amount = value[row.key as keyof typeof value] as number;
                      const percentage = value.totalEquityAndLiabilities > 0 ? amount / value.totalEquityAndLiabilities : 0;
                      const isNegative = amount < 0;

                      return (
                        <React.Fragment key={`${row.key}-${yearIndex}`}>
                          <td className={`
                            px-4 py-2 text-sm text-right
                            ${isNegative ? 'text-red-600' : row.isBold ? 'text-gray-900 font-semibold' : 'text-gray-700'}
                          `}>
                            {formatCurrency(amount)}
                          </td>
                          <td className={`
                            px-4 py-2 text-sm text-right
                            ${isNegative ? 'text-red-600' : 'text-gray-600'}
                          `}>
                            {formatPercentage(percentage)}
                          </td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
