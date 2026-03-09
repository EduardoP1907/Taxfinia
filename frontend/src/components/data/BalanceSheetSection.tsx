import React, { useMemo } from 'react';
import type { CreateBalanceSheetData } from '../../types/financial';
import { getFullCurrencyFormat } from '../../utils/currency';

interface BalanceSheetSectionProps {
  data: CreateBalanceSheetData;
  onChange: (field: keyof CreateBalanceSheetData, value: string) => void;
  currency?: string;
}

export const BalanceSheetSection: React.FC<BalanceSheetSectionProps> = ({ data, onChange, currency = 'EUR' }) => {
  const currencySymbol = getFullCurrencyFormat(currency);

  // Cálculos automáticos del Balance
  const calculations = useMemo(() => {
    const tangibleAssets = Number(data.tangibleAssets) || 0;
    const intangibleAssets = Number(data.intangibleAssets) || 0;
    const financialInvestmentsLp = Number(data.financialInvestmentsLp) || 0;
    const otherNoncurrentAssets = Number(data.otherNoncurrentAssets) || 0;

    const inventory = Number(data.inventory) || 0;
    const accountsReceivable = Number(data.accountsReceivable) || 0;
    const otherReceivables = Number(data.otherReceivables) || 0;
    const taxReceivables = Number(data.taxReceivables) || 0;
    const cashEquivalents = Number(data.cashEquivalents) || 0;

    const shareCapital = Number(data.shareCapital) || 0;
    const reserves = Number(data.reserves) || 0;
    const retainedEarnings = Number(data.retainedEarnings) || 0;
    const treasuryStock = Number(data.treasuryStock) || 0;

    const provisionsLp = Number(data.provisionsLp) || 0;
    const bankDebtLp = Number(data.bankDebtLp) || 0;
    const otherLiabilitiesLp = Number(data.otherLiabilitiesLp) || 0;

    const provisionsSp = Number(data.provisionsSp) || 0;
    const bankDebtSp = Number(data.bankDebtSp) || 0;
    const accountsPayable = Number(data.accountsPayable) || 0;
    const taxLiabilities = Number(data.taxLiabilities) || 0;
    const otherLiabilitiesSp = Number(data.otherLiabilitiesSp) || 0;

    // TOTALES ACTIVO
    const totalNoncurrentAssets = tangibleAssets + intangibleAssets + financialInvestmentsLp + otherNoncurrentAssets;
    const totalCurrentAssets = inventory + accountsReceivable + otherReceivables + taxReceivables + cashEquivalents;
    const totalAssets = totalNoncurrentAssets + totalCurrentAssets;

    // TOTALES PASIVO Y PATRIMONIO NETO
    const totalEquity = shareCapital + reserves + retainedEarnings - treasuryStock;
    const totalNoncurrentLiabilities = provisionsLp + bankDebtLp + otherLiabilitiesLp;
    const totalCurrentLiabilities = provisionsSp + bankDebtSp + accountsPayable + taxLiabilities + otherLiabilitiesSp;
    const totalLiabilities = totalNoncurrentLiabilities + totalCurrentLiabilities;
    const totalLiabilitiesAndEquity = totalEquity + totalLiabilities;

    // VALIDACIÓN: El balance debe cuadrar
    const balanceDifference = totalAssets - totalLiabilitiesAndEquity;
    const isBalanced = Math.abs(balanceDifference) < 0.01; // Tolerancia de 1 céntimo

    // FONDO DE MANIOBRA (Working Capital)
    const workingCapital = totalCurrentAssets - totalCurrentLiabilities;

    return {
      totalNoncurrentAssets,
      totalCurrentAssets,
      totalAssets,
      totalEquity,
      totalNoncurrentLiabilities,
      totalCurrentLiabilities,
      totalLiabilities,
      totalLiabilitiesAndEquity,
      balanceDifference,
      isBalanced,
      workingCapital,
    };
  }, [data]);

  return (
    <div className="space-y-8">
      {/* ACTIVO */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-4 rounded-lg">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">ACTIVO</h2>

        {/* ACTIVO NO CORRIENTE */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-amber-200">
            A) ACTIVO NO CORRIENTE
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-lg">
            <FormField
              label="Inmovilizado material"
              value={data.tangibleAssets?.toString() || ''}
              onChange={(value) => onChange('tangibleAssets', value)}
              placeholder="0.00"
            />
            <FormField
              label="Inmovilizado inmaterial"
              value={data.intangibleAssets?.toString() || ''}
              onChange={(value) => onChange('intangibleAssets', value)}
              placeholder="0.00"
            />
            <FormField
              label="Inversiones financieras LP"
              value={data.financialInvestmentsLp?.toString() || ''}
              onChange={(value) => onChange('financialInvestmentsLp', value)}
              placeholder="0.00"
            />
            <FormField
              label="Otros activos no corrientes"
              value={data.otherNoncurrentAssets?.toString() || ''}
              onChange={(value) => onChange('otherNoncurrentAssets', value)}
              placeholder="0.00"
            />
          </div>
          <div className="mt-2 p-3 bg-slate-100 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-700">Total Activo No Corriente:</span>
              <span className="text-lg font-bold text-amber-700">
                {calculations.totalNoncurrentAssets.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencySymbol}
              </span>
            </div>
          </div>
        </div>

        {/* ACTIVO CORRIENTE */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-amber-200">
            B) ACTIVO CORRIENTE
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-lg">
            <FormField
              label="Existencias (Inventario)"
              value={data.inventory?.toString() || ''}
              onChange={(value) => onChange('inventory', value)}
              placeholder="0.00"
            />
            <FormField
              label="Clientes (Cuentas por cobrar)"
              value={data.accountsReceivable?.toString() || ''}
              onChange={(value) => onChange('accountsReceivable', value)}
              placeholder="0.00"
            />
            <FormField
              label="Otros deudores"
              value={data.otherReceivables?.toString() || ''}
              onChange={(value) => onChange('otherReceivables', value)}
              placeholder="0.00"
            />
            <FormField
              label="Créditos fiscales"
              value={data.taxReceivables?.toString() || ''}
              onChange={(value) => onChange('taxReceivables', value)}
              placeholder="0.00"
            />
            <FormField
              label="Efectivo y equivalentes (Disponible)"
              value={data.cashEquivalents?.toString() || ''}
              onChange={(value) => onChange('cashEquivalents', value)}
              placeholder="0.00"
            />
          </div>
          <div className="mt-2 p-3 bg-slate-100 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-700">Total Activo Corriente:</span>
              <span className="text-lg font-bold text-amber-700">
                {calculations.totalCurrentAssets.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencySymbol}
              </span>
            </div>
          </div>
        </div>

        {/* TOTAL ACTIVO */}
        <div className="p-4 bg-gradient-to-r from-slate-700 to-slate-800 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-xl font-bold text-white">TOTAL ACTIVO:</span>
            <span className="text-2xl font-bold text-white">
              {calculations.totalAssets.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencySymbol}
            </span>
          </div>
        </div>
      </div>

      {/* PATRIMONIO NETO Y PASIVO */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">PATRIMONIO NETO Y PASIVO</h2>

        {/* PATRIMONIO NETO */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-emerald-200">
            A) PATRIMONIO NETO
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-lg">
            <FormField
              label="Capital social"
              value={data.shareCapital?.toString() || ''}
              onChange={(value) => onChange('shareCapital', value)}
              placeholder="0.00"
            />
            <FormField
              label="Reservas"
              value={data.reserves?.toString() || ''}
              onChange={(value) => onChange('reserves', value)}
              placeholder="0.00"
            />
            <FormField
              label="Resultados acumulados"
              value={data.retainedEarnings?.toString() || ''}
              onChange={(value) => onChange('retainedEarnings', value)}
              placeholder="0.00"
            />
            <FormField
              label="Acciones propias (restar)"
              value={data.treasuryStock?.toString() || ''}
              onChange={(value) => onChange('treasuryStock', value)}
              placeholder="0.00"
            />
          </div>
          <div className="mt-2 p-3 bg-emerald-100 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-700">Total Patrimonio Neto:</span>
              <span className="text-lg font-bold text-emerald-700">
                {calculations.totalEquity.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencySymbol}
              </span>
            </div>
          </div>
        </div>

        {/* PASIVO NO CORRIENTE */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-emerald-200">
            B) PASIVO NO CORRIENTE
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-lg">
            <FormField
              label="Provisiones LP"
              value={data.provisionsLp?.toString() || ''}
              onChange={(value) => onChange('provisionsLp', value)}
              placeholder="0.00"
            />
            <FormField
              label="Deudas bancarias LP"
              value={data.bankDebtLp?.toString() || ''}
              onChange={(value) => onChange('bankDebtLp', value)}
              placeholder="0.00"
            />
            <FormField
              label="Otros pasivos LP"
              value={data.otherLiabilitiesLp?.toString() || ''}
              onChange={(value) => onChange('otherLiabilitiesLp', value)}
              placeholder="0.00"
            />
          </div>
          <div className="mt-2 p-3 bg-emerald-100 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-700">Total Pasivo No Corriente:</span>
              <span className="text-lg font-bold text-emerald-700">
                {calculations.totalNoncurrentLiabilities.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencySymbol}
              </span>
            </div>
          </div>
        </div>

        {/* PASIVO CORRIENTE */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-emerald-200">
            C) PASIVO CORRIENTE
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-lg">
            <FormField
              label="Provisiones CP"
              value={data.provisionsSp?.toString() || ''}
              onChange={(value) => onChange('provisionsSp', value)}
              placeholder="0.00"
            />
            <FormField
              label="Deudas bancarias CP"
              value={data.bankDebtSp?.toString() || ''}
              onChange={(value) => onChange('bankDebtSp', value)}
              placeholder="0.00"
            />
            <FormField
              label="Proveedores (Cuentas por pagar)"
              value={data.accountsPayable?.toString() || ''}
              onChange={(value) => onChange('accountsPayable', value)}
              placeholder="0.00"
            />
            <FormField
              label="Deudas fiscales"
              value={data.taxLiabilities?.toString() || ''}
              onChange={(value) => onChange('taxLiabilities', value)}
              placeholder="0.00"
            />
            <FormField
              label="Otros pasivos CP"
              value={data.otherLiabilitiesSp?.toString() || ''}
              onChange={(value) => onChange('otherLiabilitiesSp', value)}
              placeholder="0.00"
            />
          </div>
          <div className="mt-2 p-3 bg-emerald-100 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-700">Total Pasivo Corriente:</span>
              <span className="text-lg font-bold text-emerald-700">
                {calculations.totalCurrentLiabilities.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencySymbol}
              </span>
            </div>
          </div>
        </div>

        {/* TOTAL PASIVO */}
        <div className="mb-4 p-3 bg-emerald-200 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-700">Total Pasivo:</span>
            <span className="text-lg font-bold text-emerald-800">
              {calculations.totalLiabilities.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencySymbol}
            </span>
          </div>
        </div>

        {/* TOTAL PATRIMONIO NETO Y PASIVO */}
        <div className="p-4 bg-gradient-to-r from-emerald-600 to-green-600 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-xl font-bold text-white">TOTAL PATRIMONIO NETO Y PASIVO:</span>
            <span className="text-2xl font-bold text-white">
              {calculations.totalLiabilitiesAndEquity.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencySymbol}
            </span>
          </div>
        </div>
      </div>

      {/* VALIDACIÓN DEL BALANCE */}
      <div className={`p-4 rounded-lg border-2 ${
        calculations.isBalanced
          ? 'bg-green-50 border-green-500'
          : 'bg-red-50 border-red-500'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg mb-1">
              {calculations.isBalanced ? '✓ Balance Cuadrado' : '⚠ Balance Descuadrado'}
            </h3>
            <p className={`text-sm ${calculations.isBalanced ? 'text-green-700' : 'text-red-700'}`}>
              Diferencia: {Math.abs(calculations.balanceDifference).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencySymbol}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-700">Fondo de Maniobra:</p>
            <p className={`text-lg font-bold ${
              calculations.workingCapital >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {calculations.workingCapital.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencySymbol}
            </p>
          </div>
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
}> = ({ label, value, onChange, placeholder = '0' }) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        placeholder={placeholder}
        step="0.01"
      />
    </div>
  );
};
