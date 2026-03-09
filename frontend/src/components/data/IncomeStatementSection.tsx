import React, { useMemo } from 'react';
import type { CreateIncomeStatementData } from '../../types/financial';
import { getFullCurrencyFormat } from '../../utils/currency';

interface IncomeStatementSectionProps {
  data: CreateIncomeStatementData;
  onChange: (field: keyof CreateIncomeStatementData, value: string) => void;
  currency?: string;
}

export const IncomeStatementSection: React.FC<IncomeStatementSectionProps> = ({ data, onChange, currency = 'EUR' }) => {
  const currencySymbol = getFullCurrencyFormat(currency);

  // Cálculos automáticos de la Cuenta de Pérdidas y Ganancias
  const calculations = useMemo(() => {
    // INGRESOS
    const revenue = Number(data.revenue) || 0;
    const otherOperatingIncome = Number(data.otherOperatingIncome) || 0;
    const totalRevenue = revenue + otherOperatingIncome;

    // COSTES
    const costOfSales = Number(data.costOfSales) || 0;
    const staffCostsSales = Number(data.staffCostsSales) || 0;
    const totalCostOfSales = costOfSales + staffCostsSales;

    // MARGEN BRUTO = Ingresos - Coste de Ventas
    const grossProfit = totalRevenue - totalCostOfSales;
    const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

    // GASTOS DE EXPLOTACIÓN
    const adminExpenses = Number(data.adminExpenses) || 0;
    const staffCostsAdmin = Number(data.staffCostsAdmin) || 0;
    const depreciation = Number(data.depreciation) || 0;
    const totalOperatingExpenses = adminExpenses + staffCostsAdmin;

    // EBITDA = Margen Bruto - Gastos de Explotación (sin depreciación)
    const ebitda = grossProfit - totalOperatingExpenses;
    const ebitdaMargin = revenue > 0 ? (ebitda / revenue) * 100 : 0;

    // EBIT = EBITDA - Depreciación
    const ebit = ebitda - depreciation;
    const ebitMargin = revenue > 0 ? (ebit / revenue) * 100 : 0;

    // RESULTADO EXCEPCIONAL
    const exceptionalIncome = Number(data.exceptionalIncome) || 0;
    const exceptionalExpenses = Number(data.exceptionalExpenses) || 0;
    const exceptionalResult = exceptionalIncome - exceptionalExpenses;

    // RESULTADO OPERATIVO (EBIT + Excepcional)
    const operatingResult = ebit + exceptionalResult;

    // RESULTADO FINANCIERO
    const financialIncome = Number(data.financialIncome) || 0;
    const financialExpenses = Number(data.financialExpenses) || 0;
    const financialResult = financialIncome - financialExpenses;

    // EBT = Resultado antes de impuestos (EBIT + Financiero)
    const ebt = operatingResult + financialResult;

    // IMPUESTOS
    const incomeTax = Number(data.incomeTax) || 0;
    const effectiveTaxRate = ebt > 0 ? (incomeTax / ebt) * 100 : 0;

    // RESULTADO NETO = EBT - Impuestos
    const netIncome = ebt - incomeTax;
    const netMargin = revenue > 0 ? (netIncome / revenue) * 100 : 0;

    return {
      totalRevenue,
      totalCostOfSales,
      grossProfit,
      grossMargin,
      totalOperatingExpenses,
      ebitda,
      ebitdaMargin,
      ebit,
      ebitMargin,
      exceptionalResult,
      operatingResult,
      financialResult,
      ebt,
      effectiveTaxRate,
      netIncome,
      netMargin,
    };
  }, [data]);

  return (
    <div className="space-y-8">
      {/* CUENTA DE PÉRDIDAS Y GANANCIAS */}
      <div className="bg-gradient-to-r from-amber-50 to-slate-50 p-4 rounded-lg">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">CUENTA DE PÉRDIDAS Y GANANCIAS</h2>

        {/* INGRESOS */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-amber-200">
            1. INGRESOS DE EXPLOTACIÓN
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-lg">
            <FormField
              label="Ingresos por Ventas"
              value={data.revenue?.toString() || ''}
              onChange={(value) => onChange('revenue', value)}
              placeholder="0.00"
              highlight
            />
            <FormField
              label="Otros ingresos operativos"
              value={data.otherOperatingIncome?.toString() || ''}
              onChange={(value) => onChange('otherOperatingIncome', value)}
              placeholder="0.00"
            />
          </div>
          <div className="mt-2 p-3 bg-amber-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-700">Total Ingresos:</span>
              <span className="text-lg font-bold text-amber-700">
                {calculations.totalRevenue.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencySymbol}
              </span>
            </div>
          </div>
        </div>

        {/* COSTE DE VENTAS */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-amber-200">
            2. COSTE DE LAS VENTAS
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-lg">
            <FormField
              label="Coste de las ventas (materiales, producción)"
              value={data.costOfSales?.toString() || ''}
              onChange={(value) => onChange('costOfSales', value)}
              placeholder="0.00"
            />
            <FormField
              label="Costes de personal (ventas)"
              value={data.staffCostsSales?.toString() || ''}
              onChange={(value) => onChange('staffCostsSales', value)}
              placeholder="0.00"
            />
          </div>
          <div className="mt-2 p-3 bg-amber-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-700">Total Coste de Ventas:</span>
              <span className="text-lg font-bold text-amber-700">
                {calculations.totalCostOfSales.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencySymbol}
              </span>
            </div>
          </div>
        </div>

        {/* MARGEN BRUTO */}
        <div className="mb-6 p-4 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg border-2 border-green-300">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xl font-bold text-gray-800">MARGEN BRUTO:</span>
            <span className={`text-2xl font-bold ${calculations.grossProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {calculations.grossProfit.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencySymbol}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Margen Bruto %:</span>
            <span className={`text-lg font-semibold ${calculations.grossMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {calculations.grossMargin.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* GASTOS DE EXPLOTACIÓN */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-amber-200">
            3. GASTOS DE EXPLOTACIÓN
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-lg">
            <FormField
              label="Gastos de administración"
              value={data.adminExpenses?.toString() || ''}
              onChange={(value) => onChange('adminExpenses', value)}
              placeholder="0.00"
            />
            <FormField
              label="Costes de personal (administración)"
              value={data.staffCostsAdmin?.toString() || ''}
              onChange={(value) => onChange('staffCostsAdmin', value)}
              placeholder="0.00"
            />
            <FormField
              label="Depreciación y amortización"
              value={data.depreciation?.toString() || ''}
              onChange={(value) => onChange('depreciation', value)}
              placeholder="0.00"
            />
          </div>
          <div className="mt-2 p-3 bg-amber-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-700">Total Gastos de Explotación (sin depreciación):</span>
              <span className="text-lg font-bold text-amber-700">
                {calculations.totalOperatingExpenses.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencySymbol}
              </span>
            </div>
          </div>
        </div>

        {/* EBITDA */}
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-lg border-2 border-blue-300">
          <div className="flex justify-between items-center mb-2">
            <div>
              <span className="text-xl font-bold text-gray-800">EBITDA:</span>
              <p className="text-xs text-gray-600">(Earnings Before Interest, Taxes, Depreciation & Amortization)</p>
            </div>
            <span className={`text-2xl font-bold ${calculations.ebitda >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
              {calculations.ebitda.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencySymbol}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Margen EBITDA %:</span>
            <span className={`text-lg font-semibold ${calculations.ebitdaMargin >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {calculations.ebitdaMargin.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* EBIT */}
        <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-amber-100 rounded-lg border-2 border-amber-300">
          <div className="flex justify-between items-center mb-2">
            <div>
              <span className="text-xl font-bold text-gray-800">EBIT (Resultado de Explotación):</span>
              <p className="text-xs text-gray-600">(Earnings Before Interest & Taxes)</p>
            </div>
            <span className={`text-2xl font-bold ${calculations.ebit >= 0 ? 'text-amber-700' : 'text-red-700'}`}>
              {calculations.ebit.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencySymbol}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Margen EBIT %:</span>
            <span className={`text-lg font-semibold ${calculations.ebitMargin >= 0 ? 'text-slate-600' : 'text-red-600'}`}>
              {calculations.ebitMargin.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* RESULTADO EXCEPCIONAL */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-amber-200">
            4. RESULTADO EXCEPCIONAL
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-lg">
            <FormField
              label="Ingresos excepcionales"
              value={data.exceptionalIncome?.toString() || ''}
              onChange={(value) => onChange('exceptionalIncome', value)}
              placeholder="0.00"
            />
            <FormField
              label="Gastos excepcionales"
              value={data.exceptionalExpenses?.toString() || ''}
              onChange={(value) => onChange('exceptionalExpenses', value)}
              placeholder="0.00"
            />
          </div>
          <div className="mt-2 p-3 bg-amber-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-700">Resultado Excepcional Neto:</span>
              <span className={`text-lg font-bold ${calculations.exceptionalResult >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {calculations.exceptionalResult.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencySymbol}
              </span>
            </div>
          </div>
        </div>

        {/* RESULTADO FINANCIERO */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-amber-200">
            5. RESULTADO FINANCIERO
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-lg">
            <FormField
              label="Ingresos financieros"
              value={data.financialIncome?.toString() || ''}
              onChange={(value) => onChange('financialIncome', value)}
              placeholder="0.00"
            />
            <FormField
              label="Gastos financieros (intereses)"
              value={data.financialExpenses?.toString() || ''}
              onChange={(value) => onChange('financialExpenses', value)}
              placeholder="0.00"
            />
          </div>
          <div className="mt-2 p-3 bg-amber-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-700">Resultado Financiero Neto:</span>
              <span className={`text-lg font-bold ${calculations.financialResult >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {calculations.financialResult.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencySymbol}
              </span>
            </div>
          </div>
        </div>

        {/* EBT */}
        <div className="mb-6 p-4 bg-gradient-to-r from-yellow-100 to-amber-100 rounded-lg border-2 border-yellow-300">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-xl font-bold text-gray-800">EBT (Resultado antes de Impuestos):</span>
              <p className="text-xs text-gray-600">(Earnings Before Taxes)</p>
            </div>
            <span className={`text-2xl font-bold ${calculations.ebt >= 0 ? 'text-yellow-700' : 'text-red-700'}`}>
              {calculations.ebt.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencySymbol}
            </span>
          </div>
        </div>

        {/* IMPUESTOS */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-amber-200">
            6. IMPUESTO SOBRE LA RENTA
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-lg">
            <FormField
              label="Impuesto sobre la renta"
              value={data.incomeTax?.toString() || ''}
              onChange={(value) => onChange('incomeTax', value)}
              placeholder="0.00"
            />
            <div className="flex flex-col justify-center">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tasa impositiva efectiva
              </label>
              <div className="px-3 py-2 bg-gray-100 rounded-lg">
                <span className="text-lg font-bold text-gray-700">
                  {calculations.effectiveTaxRate.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RESULTADO NETO */}
        <div className="p-5 bg-gradient-to-r from-slate-800 to-slate-900 rounded-lg">
          <div className="flex justify-between items-center mb-3">
            <span className="text-2xl font-bold text-white">RESULTADO NETO:</span>
            <span className={`text-3xl font-bold text-white`}>
              {calculations.netIncome.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencySymbol}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-200">Margen Neto %:</span>
            <span className="text-xl font-bold text-white">
              {calculations.netMargin.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      {/* RESUMEN DE RATIOS */}
      <div className="bg-white p-4 rounded-lg border-2 border-amber-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">📊 Resumen de Márgenes</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <RatioCard
            label="Margen Bruto"
            value={calculations.grossMargin}
            color="green"
          />
          <RatioCard
            label="Margen EBITDA"
            value={calculations.ebitdaMargin}
            color="blue"
          />
          <RatioCard
            label="Margen EBIT"
            value={calculations.ebitMargin}
            color="indigo"
          />
          <RatioCard
            label="Margen Neto"
            value={calculations.netMargin}
            color="amber"
          />
        </div>
      </div>
    </div>
  );
};

// Reusable Form Field Component
const FormField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  highlight?: boolean;
}> = ({ label, value, onChange, placeholder = '0', highlight = false }) => {
  return (
    <div>
      <label className={`block text-sm font-medium mb-1 ${highlight ? 'text-amber-700 font-bold' : 'text-gray-700'}`}>
        {label}
      </label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
          highlight ? 'border-amber-400 bg-amber-50' : 'border-gray-300'
        }`}
        placeholder={placeholder}
        step="0.01"
      />
    </div>
  );
};

// Ratio Card Component
const RatioCard: React.FC<{
  label: string;
  value: number;
  color: 'green' | 'blue' | 'slate' | 'amber';
}> = ({ label, value, color }) => {
  const colorClasses = {
    green: 'bg-green-100 text-green-700',
    blue: 'bg-blue-100 text-blue-700',
    indigo: 'bg-slate-100 text-amber-700',
    amber: 'bg-amber-50 text-amber-700',
  };

  return (
    <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
      <div className="text-xs font-medium mb-1">{label}</div>
      <div className={`text-xl font-bold ${value >= 0 ? '' : 'text-red-600'}`}>
        {value.toFixed(2)}%
      </div>
    </div>
  );
};
