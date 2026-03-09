import React from 'react';
import { type CompanyAnalysisYear } from '../../services/ratios.service';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, PieChart } from 'lucide-react';
import { Card } from '../ui/Card';

interface Props {
  years: CompanyAnalysisYear[];
  currency?: string;
}

export const IncomeStatementSection: React.FC<Props> = ({ years }) => {
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

  // Calcular valores intermedios para cada año
  const getIntermediateValues = (yearData: CompanyAnalysisYear) => {
    const is = yearData.incomeStatement;
    if (!is) return null;

    const revenue = Number(is.revenue || 0);
    const costOfSales = Number(is.costOfSales || 0);
    const staffCostsSales = Number(is.staffCostsSales || 0);
    const adminExpenses = Number(is.adminExpenses || 0);
    const staffCostsAdmin = Number(is.staffCostsAdmin || 0);
    const depreciation = Number(is.depreciation || 0);
    const exceptionalIncome = Number(is.exceptionalIncome || 0);
    const exceptionalExpenses = Number(is.exceptionalExpenses || 0);
    const financialIncome = Number(is.financialIncome || 0);
    const financialExpenses = Number(is.financialExpenses || 0);
    const incomeTax = Number(is.incomeTax || 0);

    // Cálculos según el Excel
    const grossMargin = revenue - costOfSales - staffCostsSales;
    const ebitda = grossMargin - adminExpenses - staffCostsAdmin;
    const operatingIncome = ebitda - depreciation;
    const exceptionalResult = exceptionalIncome - exceptionalExpenses;
    const ebit = operatingIncome + exceptionalResult;
    const financialResult = financialIncome - financialExpenses;
    const ebt = ebit + financialResult;
    const netIncome = ebt - incomeTax;

    return {
      revenue,
      costOfSales: costOfSales + staffCostsSales,
      grossMargin,
      adminExpenses: adminExpenses + staffCostsAdmin,
      ebitda,
      depreciation,
      operatingIncome,
      exceptionalIncome,
      exceptionalExpenses,
      exceptionalResult,
      ebit,
      financialIncome,
      financialExpenses,
      financialResult,
      ebt,
      incomeTax,
      netIncome,
    };
  };

  const rows = [
    { label: 'Ingresos por Ventas', key: 'revenue', isBold: true },
    { label: 'Coste de las ventas (-)', key: 'costOfSales', isNegative: true },
    { label: 'Margen Bruto', key: 'grossMargin', isBold: true, bgClass: 'bg-green-50' },
    { label: 'Gastos de administración (-)', key: 'adminExpenses', isNegative: true },
    { label: 'EBITDA', key: 'ebitda', isBold: true, bgClass: 'bg-blue-50' },
    { label: 'Depreciaciones (-)', key: 'depreciation', isNegative: true },
    { label: 'Resultado de explotación', key: 'operatingIncome', isBold: true, bgClass: 'bg-amber-50' },
    { label: 'Ingresos excepcionales (+)', key: 'exceptionalIncome' },
    { label: 'Gastos excepcionales (-)', key: 'exceptionalExpenses', isNegative: true },
    { label: 'Resultado excepcional', key: 'exceptionalResult', isBold: true },
    { label: 'EBIT (Resultado antes de intereses e impuestos)', key: 'ebit', isBold: true, bgClass: 'bg-slate-50' },
    { label: 'Ingresos financieros (+)', key: 'financialIncome' },
    { label: 'Gastos financieros (-)', key: 'financialExpenses', isNegative: true },
    { label: 'Resultado Financiero', key: 'financialResult', isBold: true },
    { label: 'EBT (Beneficio antes de impuestos)', key: 'ebt', isBold: true, bgClass: 'bg-yellow-50' },
    { label: 'Impuestos (-)', key: 'incomeTax', isNegative: true },
    { label: 'Resultado Neto', key: 'netIncome', isBold: true, bgClass: 'bg-green-100' },
  ];

  // Preparar datos para gráficos (ordenados cronológicamente)
  const chartYears = [...years].sort((a, b) => a.year - b.year);

  // Datos para gráfico de ingresos (3 tipos de ingresos)
  const revenueChartData = chartYears.map(year => {
    const is = year.incomeStatement;
    return {
      year: year.year,
      ventas: Number(is?.revenue || 0),
      financieros: Number(is?.financialIncome || 0),
      excepcionales: Number(is?.exceptionalIncome || 0),
    };
  });

  // Datos para gráfico de resultados (EBITDA, NOPAT, BAI, NETO)
  const resultsChartData = chartYears.map(year => {
    const values = getIntermediateValues(year);
    if (!values) {
      return {
        year: year.year,
        ebitda: 0,
        nopat: 0,
        bai: 0,
        neto: 0,
      };
    }

    // NOPAT = EBIT × (1 - Tax Rate on Income)
    // Según Excel: Tax Rate on Income = Impuestos / (Ventas + Ingresos Excepcionales + Ingresos Financieros)
    const totalIncome = values.revenue + values.exceptionalIncome + values.financialIncome;
    const taxRateOnIncome = totalIncome > 0 ? values.incomeTax / totalIncome : 0;
    const nopat = values.ebit * (1 - taxRateOnIncome);

    return {
      year: year.year,
      ebitda: values.ebitda,
      nopat: nopat,
      bai: values.ebt, // BAI = Beneficio Antes de Impuestos = EBT
      neto: values.netIncome,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Pérdidas y Ganancias - Resumen
        </h2>
        <p className="text-sm text-gray-600">
          Análisis de resultados por ejercicio con análisis vertical (% sobre ventas)
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                RESULTADOS
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
            {rows.map((row, index) => {
              const values = sortedYears.map(year => getIntermediateValues(year));

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
                    const percentage = value.revenue > 0 ? amount / value.revenue : 0;
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

      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">Definiciones</h4>
        <ul className="text-xs text-blue-800 space-y-1">
          <li><strong>Margen Bruto:</strong> Ingresos - Coste de ventas</li>
          <li><strong>EBITDA:</strong> Earnings Before Interest, Taxes, Depreciation & Amortization</li>
          <li><strong>EBIT:</strong> Earnings Before Interest & Taxes</li>
          <li><strong>EBT:</strong> Earnings Before Taxes (Beneficio antes de impuestos)</li>
        </ul>
      </div>

      {/* Gráficos - Solo mostrar si hay 2 o más años */}
      {years.length >= 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Gráfico de Ingresos - Barras Apiladas */}
          <Card>
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">Evolución de Ingresos</h3>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="year"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                  />
                  <Tooltip
                    formatter={(value: number | undefined) => value !== undefined ? formatCurrency(value) : '0'}
                    labelStyle={{ color: '#000' }}
                  />
                  <Legend />
                  <Bar
                    dataKey="ventas"
                    stackId="ingresos"
                    fill="#3b82f6"
                    name="Ventas"
                  />
                  <Bar
                    dataKey="financieros"
                    stackId="ingresos"
                    fill="#1e3a8a"
                    name="Financieros"
                  />
                  <Bar
                    dataKey="excepcionales"
                    stackId="ingresos"
                    fill="#10b981"
                    name="Excepcionales"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Gráfico de Resultados - Barras Agrupadas */}
          <Card>
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <PieChart className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Evolución de Resultados</h3>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={resultsChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="year"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                  />
                  <Tooltip
                    formatter={(value: number | undefined) => value !== undefined ? formatCurrency(value) : '0'}
                    labelStyle={{ color: '#000' }}
                  />
                  <Legend />
                  <Bar
                    dataKey="ebitda"
                    fill="#3b82f6"
                    name="EBITDA"
                  />
                  <Bar
                    dataKey="nopat"
                    fill="#10b981"
                    name="NOPAT"
                  />
                  <Bar
                    dataKey="bai"
                    fill="#ef4444"
                    name="BAI"
                  />
                  <Bar
                    dataKey="neto"
                    fill="#a855f7"
                    name="NETO"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
