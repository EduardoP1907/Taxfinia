/**
 * Growth Rates Modal
 * Modal para configurar tasas de crecimiento automáticas en las proyecciones
 */

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { toast } from 'sonner';

interface GrowthRate {
  field: string;
  label: string;
  rate: number;
  category: 'balance' | 'income' | 'financial' | 'investment';
}

interface GrowthRatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (rates: GrowthRate[]) => Promise<void>;
  currentRates?: GrowthRate[];
}

export const GrowthRatesModal: React.FC<GrowthRatesModalProps> = ({
  isOpen,
  onClose,
  onApply,
  currentRates = [],
}) => {
  const [rates, setRates] = useState<GrowthRate[]>([
    // Balance
    { field: 'totalAssets', label: 'Total Activo', rate: 0, category: 'balance' },
    { field: 'equity', label: 'Patrimonio Neto', rate: 0, category: 'balance' },
    { field: 'totalLiabilities', label: 'Total Pasivo', rate: 0, category: 'balance' },

    // Income Statement
    { field: 'revenue', label: 'Ingresos', rate: 0, category: 'income' },
    { field: 'costOfSales', label: 'Coste de Ventas', rate: 0, category: 'income' },
    { field: 'otherOperatingExpenses', label: 'Gastos de Explotación', rate: 0, category: 'income' },
    { field: 'depreciation', label: 'Depreciación', rate: 0, category: 'income' },
    { field: 'exceptionalNet', label: 'Resultado Excepcional', rate: 0, category: 'income' },

    // Financial
    { field: 'financialIncome', label: 'Ingresos Financieros', rate: 0, category: 'financial' },
    { field: 'financialExpenses', label: 'Gastos Financieros', rate: 0, category: 'financial' },

    // Investment
    { field: 'workingCapitalInvestment', label: 'Inversión en Capital Circulante', rate: 0, category: 'investment' },
    { field: 'fixedAssetsInvestment', label: 'Inversión en Activo Fijo', rate: 0, category: 'investment' },
  ]);

  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (currentRates && currentRates.length > 0) {
      setRates((prev) =>
        prev.map((rate) => {
          const current = currentRates.find((cr) => cr.field === rate.field);
          return current ? { ...rate, rate: current.rate } : rate;
        })
      );
    }
  }, [currentRates]);

  const handleRateChange = (field: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setRates((prev) =>
      prev.map((rate) =>
        rate.field === field ? { ...rate, rate: numValue } : rate
      )
    );
  };

  const handleApplyAll = (category: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setRates((prev) =>
      prev.map((rate) =>
        rate.category === category ? { ...rate, rate: numValue } : rate
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setApplying(true);
      await onApply(rates);
      toast.success('Tasas de crecimiento aplicadas correctamente');
      onClose();
    } catch (error: any) {
      toast.error('Error al aplicar tasas de crecimiento');
      console.error('Error:', error);
    } finally {
      setApplying(false);
    }
  };

  if (!isOpen) return null;

  const categoryLabels = {
    balance: 'Balance',
    income: 'Cuenta de Resultados',
    financial: 'Resultados Financieros',
    investment: 'Inversiones',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Tasas de Crecimiento Automático
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Configura tasas de crecimiento anual (%) para aplicar a todas las proyecciones
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-6 py-4 space-y-6">
            {/* Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Cómo funciona:</strong> Ingresa el porcentaje de crecimiento anual deseado.
                Por ejemplo, si pones 5% en Ingresos, cada año proyectado crecerá un 5% respecto
                al anterior.
              </p>
              <p className="text-xs text-blue-600 mt-2">
                Las tasas se aplicarán de forma compuesta: Año 2 = Año 1 × (1 + tasa/100)
              </p>
            </div>

            {/* Rates by Category */}
            {(['balance', 'income', 'financial', 'investment'] as const).map((category) => {
              const categoryRates = rates.filter((r) => r.category === category);

              return (
                <div key={category} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {categoryLabels[category]}
                    </h3>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600">Aplicar a todos:</label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="%"
                        onChange={(e) => handleApplyAll(category, e.target.value)}
                        className="w-24 text-right"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {categoryRates.map((rate) => (
                      <div
                        key={rate.field}
                        className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg"
                      >
                        <label className="flex-1 text-sm text-gray-700">
                          {rate.label}
                        </label>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            step="0.1"
                            value={rate.rate === 0 ? '' : rate.rate}
                            onChange={(e) => handleRateChange(rate.field, e.target.value)}
                            className="w-24 text-right"
                            placeholder="0"
                          />
                          <span className="text-gray-600 text-sm">%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <strong>Nota:</strong> Los valores se aplicarán a partir del año base
            </div>
            <div className="flex gap-3">
              <Button type="button" onClick={onClose} variant="outline">
                Cancelar
              </Button>
              <Button type="submit" disabled={applying}>
                {applying ? 'Aplicando...' : 'Aplicar Tasas'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
