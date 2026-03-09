import React, { useMemo } from 'react';
import type { CreateAdditionalDataData } from '../../types/financial';
import { getFullCurrencyFormat } from '../../utils/currency';

interface AdditionalDataSectionProps {
  data: CreateAdditionalDataData;
  onChange: (field: keyof CreateAdditionalDataData, value: string) => void;
  currency?: string;
}

export const AdditionalDataSection: React.FC<AdditionalDataSectionProps> = ({ data, onChange, currency = 'EUR' }) => {
  const currencySymbol = getFullCurrencyFormat(currency);

  // Cálculos automáticos de datos adicionales
  const calculations = useMemo(() => {
    const sharesOutstanding = Number(data.sharesOutstanding) || 0;
    const sharePrice = Number(data.sharePrice) || 0;
    const dividendsPerShare = Number(data.dividendsPerShare) || 0;
    const marketCap = Number(data.marketCap) || 0;

    // Si tenemos acciones y precio, calcular capitalización automáticamente
    const autoMarketCap = sharesOutstanding > 0 && sharePrice > 0
      ? sharesOutstanding * sharePrice
      : marketCap;

    // Dividend yield = (Dividendo por acción / Precio de la acción) * 100
    const dividendYield = sharePrice > 0 && dividendsPerShare > 0
      ? (dividendsPerShare / sharePrice) * 100
      : 0;

    // Dividendo total = Dividendo por acción * Número de acciones
    const totalDividends = sharesOutstanding > 0 && dividendsPerShare > 0
      ? sharesOutstanding * dividendsPerShare
      : 0;

    return {
      autoMarketCap,
      dividendYield,
      totalDividends,
    };
  }, [data]);

  return (
    <div className="space-y-8">
      {/* DATOS ADICIONALES */}
      <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-4 rounded-lg">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">DATOS ADICIONALES</h2>

        {/* INFORMACIÓN BURSÁTIL */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-orange-200">
            📈 INFORMACIÓN BURSÁTIL Y ACCIONARIAL
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-lg">
            <FormField
              label="Número de acciones/participaciones"
              value={data.sharesOutstanding?.toString() || ''}
              onChange={(value) => onChange('sharesOutstanding', value)}
              placeholder="0"
              type="number"
              step="1"
            />
            <FormField
              label="Precio por acción (valor promedio del ejercicio)"
              value={data.sharePrice?.toString() || ''}
              onChange={(value) => onChange('sharePrice', value)}
              placeholder="0.00"
              type="number"
              step="0.01"
            />
            <FormField
              label="Dividendos"
              value={data.dividendsPerShare?.toString() || ''}
              onChange={(value) => onChange('dividendsPerShare', value)}
              placeholder="0.00"
              type="number"
              step="0.01"
            />
            <div className="flex flex-col justify-center">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dividend Yield
              </label>
              <div className="px-3 py-2 bg-orange-100 rounded-lg">
                <span className="text-lg font-bold text-orange-700">
                  {calculations.dividendYield.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          {/* Cálculos automáticos bursátiles */}
          {(Number(data.sharesOutstanding) > 0 || Number(data.dividendsPerShare) > 0) && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {Number(data.sharesOutstanding) > 0 && Number(data.sharePrice) > 0 && (
                <div className="p-3 bg-orange-100 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Capitalización calculada:</span>
                    <span className="text-lg font-bold text-orange-700">
                      {calculations.autoMarketCap.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencySymbol}
                    </span>
                  </div>
                </div>
              )}
              {calculations.totalDividends > 0 && (
                <div className="p-3 bg-orange-100 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Total dividendos distribuidos:</span>
                    <span className="text-lg font-bold text-orange-700">
                      {calculations.totalDividends.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencySymbol}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* INFORMACIÓN DE PERSONAL */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-orange-200">
            👥 INFORMACIÓN DE PERSONAL
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-lg">
            <FormField
              label="Personal asalariado (cifra media del ejercicio)"
              value={data.averageEmployees?.toString() || ''}
              onChange={(value) => onChange('averageEmployees', value)}
              placeholder="0"
              type="number"
              step="1"
            />
          </div>
          <div className="mt-2 p-3 bg-orange-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Nota:</strong> Este dato se utilizará para calcular ratios de productividad como ventas por empleado y EBITDA por empleado.
            </p>
          </div>
        </div>

        {/* VALORACIÓN DE MERCADO */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-orange-200">
            💰 VALORACIÓN DE MERCADO
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-lg">
            <FormField
              label="Capitalización de mercado (€)"
              value={data.marketCap?.toString() || ''}
              onChange={(value) => onChange('marketCap', value)}
              placeholder="0.00"
              type="number"
              step="0.01"
            />
            <FormField
              label="Valor de empresa - EV (€)"
              value={data.enterpriseValue?.toString() || ''}
              onChange={(value) => onChange('enterpriseValue', value)}
              placeholder="0.00"
              type="number"
              step="0.01"
            />
          </div>
          <div className="mt-2 p-3 bg-orange-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Market Cap:</strong> Precio de la acción × Número de acciones
            </p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Enterprise Value (EV):</strong> Market Cap + Deuda Neta (Deuda Total - Efectivo)
            </p>
          </div>
        </div>

        {/* INVENTARIO Y COMPRAS */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-orange-200">
            📦 INVENTARIO Y COMPRAS
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-lg">
            <FormField
              label="Existencias PROMEDIO del ejercicio"
              value={data.averageInventory?.toString() || ''}
              onChange={(value) => onChange('averageInventory', value)}
              placeholder="0.00"
              type="number"
              step="0.01"
            />
            <FormField
              label="Consumo - coste del material vendido"
              value={data.materialCost?.toString() || ''}
              onChange={(value) => onChange('materialCost', value)}
              placeholder="0.00"
              type="number"
              step="0.01"
            />
            <FormField
              label="Compras"
              value={data.purchases?.toString() || ''}
              onChange={(value) => onChange('purchases', value)}
              placeholder="0.00"
              type="number"
              step="0.01"
            />
          </div>
          <div className="mt-2 p-3 bg-orange-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Existencias promedio:</strong> (Existencias iniciales + Existencias finales) / 2
            </p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Consumo:</strong> Valor del material que se ha vendido o consumido en el ejercicio
            </p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Compras:</strong> Total de compras realizadas durante el ejercicio
            </p>
          </div>
        </div>

        {/* IMPUESTOS (IVA) */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-orange-200">
            💸 IMPUESTOS (IVA)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-lg">
            <FormField
              label="% IVA promedio aplicado a las ventas"
              value={data.averageVatSales?.toString() || ''}
              onChange={(value) => onChange('averageVatSales', value)}
              placeholder="0.00"
              type="number"
              step="0.01"
            />
            <FormField
              label="% IVA promedio aplicado a las compras"
              value={data.averageVatPurchases?.toString() || ''}
              onChange={(value) => onChange('averageVatPurchases', value)}
              placeholder="0.00"
              type="number"
              step="0.01"
            />
          </div>
          <div className="mt-2 p-3 bg-orange-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Nota:</strong> Introduce el porcentaje de IVA promedio. Ejemplos: 21% (general), 10% (reducido), 4% (superreducido)
            </p>
          </div>
        </div>

        {/* FINANCIACIÓN */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-orange-200">
            🏦 FINANCIACIÓN
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-lg">
            <FormField
              label="Amortizaciones préstamos"
              value={data.loanAmortization?.toString() || ''}
              onChange={(value) => onChange('loanAmortization', value)}
              placeholder="0.00"
              type="number"
              step="0.01"
            />
          </div>
          <div className="mt-2 p-3 bg-orange-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Amortizaciones de préstamos:</strong> Total de pagos realizados para amortizar el principal de los préstamos durante el ejercicio (no incluye intereses)
            </p>
          </div>
        </div>

        {/* GUÍA DE CAMPOS */}
        <div className="bg-white p-4 rounded-lg border-2 border-orange-200">
          <h4 className="font-bold text-gray-900 mb-3 flex items-center">
            <span className="text-orange-600 mr-2">ℹ️</span>
            Guía de Campos Opcionales
          </h4>
          <div className="space-y-2 text-sm text-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
              <div>
                <span className="font-semibold">Acciones en circulación:</span>
                <p className="text-gray-600">Total de acciones emitidas (solo empresas cotizadas)</p>
              </div>
              <div>
                <span className="font-semibold">Precio de la acción:</span>
                <p className="text-gray-600">Precio promedio de mercado del ejercicio</p>
              </div>
              <div>
                <span className="font-semibold">Dividendos por acción:</span>
                <p className="text-gray-600">Dividendo distribuido por acción en el ejercicio</p>
              </div>
              <div>
                <span className="font-semibold">Empleados promedio:</span>
                <p className="text-gray-600">Número medio de empleados (para ratios de productividad)</p>
              </div>
              <div>
                <span className="font-semibold">Existencias promedio:</span>
                <p className="text-gray-600">Media entre existencias iniciales y finales</p>
              </div>
              <div>
                <span className="font-semibold">Consumo de material:</span>
                <p className="text-gray-600">Coste del material vendido o consumido</p>
              </div>
              <div>
                <span className="font-semibold">Compras:</span>
                <p className="text-gray-600">Total de compras realizadas en el ejercicio</p>
              </div>
              <div>
                <span className="font-semibold">% IVA ventas/compras:</span>
                <p className="text-gray-600">Porcentaje promedio de IVA aplicado</p>
              </div>
              <div>
                <span className="font-semibold">Amortizaciones préstamos:</span>
                <p className="text-gray-600">Pagos de principal (sin incluir intereses)</p>
              </div>
              <div>
                <span className="font-semibold">Market Cap:</span>
                <p className="text-gray-600">Se calcula automáticamente (acciones × precio)</p>
              </div>
              <div>
                <span className="font-semibold">Enterprise Value:</span>
                <p className="text-gray-600">Valor total incluyendo deuda neta</p>
              </div>
            </div>
          </div>
        </div>

        {/* NOTA IMPORTANTE */}
        <div className="mt-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Información opcional:</strong> Estos datos son opcionales. Si tu empresa no cotiza en bolsa, puedes dejar los campos bursátiles vacíos.
                El campo de empleados es útil para calcular ratios de productividad.
              </p>
            </div>
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
  type?: string;
  step?: string;
}> = ({ label, value, onChange, placeholder = '0', type = 'number', step = '0.01' }) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        placeholder={placeholder}
        step={step}
      />
    </div>
  );
};
