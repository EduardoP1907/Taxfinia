/**
 * Growth Rates Form Component
 * Allows entering growth rates for projections (Sheet 4.1)
 */

import React, { useState } from 'react';

interface GrowthRatesFormProps {
  years: number[];
  onApply: (growthRates: any[]) => Promise<void>;
  baseYear: number;
}

const GrowthRatesForm: React.FC<GrowthRatesFormProps> = ({ years, onApply, baseYear }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Initialize form data with all years except base year
  const projectionYears = years.filter(y => y !== baseYear);
  const [formData, setFormData] = useState<Record<number, any>>(
    projectionYears.reduce((acc, year) => {
      acc[year] = {
        year,
        revenueGrowthRate: 0.05, // 5% default
        costOfSalesGrowthRate: 0.04,
        otherOperatingExpensesGrowthRate: 0.03,
        depreciationGrowthRate: 0.02,
        exceptionalNetGrowthRate: 0,
        financialIncomeGrowthRate: 0,
        financialExpensesGrowthRate: 0,
        totalAssetsGrowthRate: 0.05,
        equityGrowthRate: 0.05,
        totalLiabilitiesGrowthRate: 0.05,
        workingCapitalInvestmentGrowthRate: 0.03,
        fixedAssetsInvestmentGrowthRate: 0.03,
        taxRate: 0.25, // 25% default tax rate
      };
      return acc;
    }, {} as Record<number, any>)
  );

  const handleInputChange = (year: number, field: string, value: string) => {
    const numericValue = parseFloat(value) / 100; // Convert percentage to decimal
    setFormData(prev => ({
      ...prev,
      [year]: {
        ...prev[year],
        [field]: isNaN(numericValue) ? 0 : numericValue,
      },
    }));
  };

  const handleApplyUniformRates = () => {
    const firstYearRates = formData[projectionYears[0]];
    const uniformData = projectionYears.reduce((acc, year) => {
      acc[year] = { ...firstYearRates, year };
      return acc;
    }, {} as Record<number, any>);
    setFormData(uniformData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const growthRatesArray = Object.values(formData);
      await onApply(growthRatesArray);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al aplicar tasas de crecimiento');
    } finally {
      setLoading(false);
    }
  };

  const formatPercentage = (decimal: number): string => {
    return (decimal * 100).toFixed(2);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-gray-800">
          Tasas de Crecimiento por Año
        </h3>
        <button
          type="button"
          onClick={handleApplyUniformRates}
          className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
        >
          Aplicar tasas del primer año a todos
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          Tasas de crecimiento aplicadas correctamente
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="space-y-8">
          {projectionYears.map((year) => (
            <div key={year} className="border border-gray-200 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-gray-700 mb-4">
                Año {year}
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Balance Sheet */}
                <div className="col-span-full">
                  <h5 className="text-sm font-semibold text-blue-700 mb-2">Balance</h5>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Activo (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formatPercentage(formData[year].totalAssetsGrowthRate)}
                    onChange={(e) => handleInputChange(year, 'totalAssetsGrowthRate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Patrimonio Neto (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formatPercentage(formData[year].equityGrowthRate)}
                    onChange={(e) => handleInputChange(year, 'equityGrowthRate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Pasivo (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formatPercentage(formData[year].totalLiabilitiesGrowthRate)}
                    onChange={(e) => handleInputChange(year, 'totalLiabilitiesGrowthRate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Income Statement */}
                <div className="col-span-full mt-4">
                  <h5 className="text-sm font-semibold text-green-700 mb-2">Cuenta de Resultados</h5>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ingresos por Ventas (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formatPercentage(formData[year].revenueGrowthRate)}
                    onChange={(e) => handleInputChange(year, 'revenueGrowthRate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Coste de Ventas (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formatPercentage(formData[year].costOfSalesGrowthRate)}
                    onChange={(e) => handleInputChange(year, 'costOfSalesGrowthRate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Otros Gastos Operativos (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formatPercentage(formData[year].otherOperatingExpensesGrowthRate)}
                    onChange={(e) => handleInputChange(year, 'otherOperatingExpensesGrowthRate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Depreciación (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formatPercentage(formData[year].depreciationGrowthRate)}
                    onChange={(e) => handleInputChange(year, 'depreciationGrowthRate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Financial Results */}
                <div className="col-span-full mt-4">
                  <h5 className="text-sm font-semibold text-amber-700 mb-2">Resultados Financieros</h5>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Resultado Excepcional (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formatPercentage(formData[year].exceptionalNetGrowthRate)}
                    onChange={(e) => handleInputChange(year, 'exceptionalNetGrowthRate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ingresos Financieros (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formatPercentage(formData[year].financialIncomeGrowthRate)}
                    onChange={(e) => handleInputChange(year, 'financialIncomeGrowthRate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gastos Financieros (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formatPercentage(formData[year].financialExpensesGrowthRate)}
                    onChange={(e) => handleInputChange(year, 'financialExpensesGrowthRate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Tax */}
                <div className="col-span-full mt-4">
                  <h5 className="text-sm font-semibold text-orange-700 mb-2">Impuestos</h5>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tasa Impositiva (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formatPercentage(formData[year].taxRate)}
                    onChange={(e) => handleInputChange(year, 'taxRate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Investments */}
                <div className="col-span-full mt-4">
                  <h5 className="text-sm font-semibold text-amber-700 mb-2">Inversiones</h5>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Inversión en Capital de Trabajo (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formatPercentage(formData[year].workingCapitalInvestmentGrowthRate)}
                    onChange={(e) => handleInputChange(year, 'workingCapitalInvestmentGrowthRate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Inversión en Activos Fijos (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formatPercentage(formData[year].fixedAssetsInvestmentGrowthRate)}
                    onChange={(e) => handleInputChange(year, 'fixedAssetsInvestmentGrowthRate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-end space-x-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg font-medium transition-colors"
          >
            {loading ? 'Aplicando...' : 'Aplicar Tasas de Crecimiento'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default GrowthRatesForm;
