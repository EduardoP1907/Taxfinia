import React from 'react';
import { type CompanyAnalysisYear } from '../../services/ratios.service';

interface Props {
  years: CompanyAnalysisYear[];
}

export const RatiosSection: React.FC<Props> = ({ years }) => {
  const formatNumber = (value: number | null | undefined, decimals = 2): string => {
    if (value === null || value === undefined) return '-';
    return value.toFixed(decimals);
  };

  const formatPercentage = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '-';
    return (value * 100).toFixed(2) + '%';
  };

  const formatDays = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '-';
    return value.toFixed(0) + ' días';
  };

  // Ordenar años de más reciente a más antiguo
  const sortedYears = [...years].sort((a, b) => b.year - a.year);

  const ratioGroups = [
    {
      title: 'Ratios de Liquidez',
      color: 'blue',
      ratios: [
        { label: 'Ratio Corriente (Activo Corriente / Pasivo Corriente)', key: 'currentRatio', format: formatNumber, optimal: '> 1.5' },
        { label: 'Prueba Ácida (Quick Ratio)', key: 'quickRatio', format: formatNumber, optimal: '> 1.0' },
        { label: 'Ratio de Caja (Cash Ratio)', key: 'cashRatio', format: formatNumber, optimal: '> 0.3' },
      ]
    },
    {
      title: 'Ratios de Endeudamiento',
      color: 'orange',
      ratios: [
        { label: 'Deuda / Patrimonio Neto', key: 'debtToEquity', format: formatNumber, optimal: '< 1.5' },
        { label: 'Deuda / Activos Totales', key: 'debtToAssets', format: formatNumber, optimal: '< 0.6' },
        { label: 'Deuda / EBITDA', key: 'debtToEbitda', format: formatNumber, optimal: '< 3.0' },
      ]
    },
    {
      title: 'Ratios de Rentabilidad',
      color: 'green',
      ratios: [
        { label: 'ROE - Return on Equity (Rentabilidad Financiera)', key: 'roe', format: formatPercentage, optimal: '> 15%' },
        { label: 'ROA - Return on Assets (Rentabilidad Económica)', key: 'roa', format: formatPercentage, optimal: '> 10%' },
        { label: 'ROI - Return on Investment', key: 'roi', format: formatPercentage, optimal: '> 12%' },
        { label: 'ROS - Return on Sales', key: 'ros', format: formatPercentage, optimal: '> 5%' },
      ]
    },
    {
      title: 'Ratios de Margen',
      color: 'amber',
      ratios: [
        { label: 'Margen Bruto', key: 'grossMargin', format: formatPercentage, optimal: '> 30%' },
        { label: 'Margen EBITDA', key: 'ebitdaMargin', format: formatPercentage, optimal: '> 15%' },
        { label: 'Margen EBIT', key: 'ebitMargin', format: formatPercentage, optimal: '> 10%' },
        { label: 'Margen Neto', key: 'netMargin', format: formatPercentage, optimal: '> 5%' },
      ]
    },
    {
      title: 'Ratios de Actividad / Gestión',
      color: 'slate',
      ratios: [
        { label: 'Rotación de Activos (Asset Turnover)', key: 'assetTurnover', format: formatNumber, optimal: '> 1.0' },
        { label: 'Rotación de Inventario (Inventory Turnover)', key: 'inventoryTurnover', format: formatNumber, optimal: '> 5' },
        { label: 'Días de Cobro (DSO - Days Sales Outstanding)', key: 'daysSalesOutstanding', format: formatDays, optimal: '< 60 días' },
        { label: 'Días de Pago (DPO - Days Payable Outstanding)', key: 'daysPayableOutstanding', format: formatDays, optimal: '60-90 días' },
        { label: 'Días de Inventario (DIO)', key: 'daysInventoryOutstanding', format: formatDays, optimal: '< 60 días' },
      ]
    },
    {
      title: 'Análisis de Riesgo',
      color: 'red',
      ratios: [
        { label: 'Z-Score de Altman (Riesgo de Insolvencia)', key: 'altmanZScore', format: formatNumber, optimal: '> 2.6' },
      ]
    },
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      blue: { bg: 'bg-blue-50', text: 'text-blue-900', border: 'border-blue-200' },
      orange: { bg: 'bg-orange-50', text: 'text-orange-900', border: 'border-orange-200' },
      green: { bg: 'bg-green-50', text: 'text-green-900', border: 'border-green-200' },
      amber: { bg: 'bg-amber-50', text: 'text-slate-900', border: 'border-amber-200' },
      slate: { bg: 'bg-slate-50', text: 'text-slate-900', border: 'border-amber-200' },
      red: { bg: 'bg-red-50', text: 'text-red-900', border: 'border-red-200' },
    };
    return colors[color] || colors.blue;
  };

  const getStatusColor = (value: number | null | undefined, optimalText: string): string => {
    if (value === null || value === undefined) return 'text-gray-500';

    // Parsear el óptimo
    if (optimalText.includes('>')) {
      const threshold = parseFloat(optimalText.replace(/[^0-9.]/g, ''));
      if (optimalText.includes('%')) {
        return value >= threshold / 100 ? 'text-green-600' : 'text-red-600';
      }
      return value >= threshold ? 'text-green-600' : 'text-red-600';
    } else if (optimalText.includes('<')) {
      const threshold = parseFloat(optimalText.replace(/[^0-9.]/g, ''));
      if (optimalText.includes('%')) {
        return value <= threshold / 100 ? 'text-green-600' : 'text-red-600';
      } else if (optimalText.includes('días')) {
        return value <= threshold ? 'text-green-600' : 'text-red-600';
      }
      return value <= threshold ? 'text-green-600' : 'text-red-600';
    }

    return 'text-gray-700';
  };

  const getAltmanInterpretation = (zScore: number | null | undefined): { text: string; color: string } => {
    if (zScore === null || zScore === undefined) {
      return { text: 'No disponible', color: 'text-gray-500' };
    }

    if (zScore > 2.99) {
      return { text: 'Zona Segura - Bajo riesgo de quiebra', color: 'text-green-600' };
    } else if (zScore >= 1.81) {
      return { text: 'Zona Gris - Riesgo moderado', color: 'text-yellow-600' };
    } else {
      return { text: 'Zona de Peligro - Alto riesgo de quiebra', color: 'text-red-600' };
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Ratios Financieros por Ejercicio
        </h2>
        <p className="text-sm text-gray-600">
          Análisis de ratios clave con valores óptimos de referencia
        </p>
      </div>

      {ratioGroups.map((group, groupIndex) => {
        const colorClasses = getColorClasses(group.color);

        return (
          <div key={groupIndex} className={`border ${colorClasses.border} rounded-lg p-6 ${colorClasses.bg}`}>
            <h3 className={`text-lg font-bold ${colorClasses.text} mb-4`}>
              {group.title}
            </h3>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-white">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-white z-10">
                      Ratio
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Óptimo
                    </th>
                    {sortedYears.map(year => (
                      <th key={year.year} className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {year.year}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {group.ratios.map((ratio, ratioIndex) => {
                    return (
                      <tr key={ratioIndex} className={ratioIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 z-10 bg-inherit">
                          {ratio.label}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {ratio.optimal}
                        </td>
                        {sortedYears.map((year, yearIndex) => {
                          const ratios = year.ratios;
                          if (!ratios) {
                            return (
                              <td key={yearIndex} className="px-4 py-3 text-sm text-right text-gray-500">
                                -
                              </td>
                            );
                          }

                          const value = ratios[ratio.key as keyof typeof ratios] as number | null;
                          const statusColor = getStatusColor(value, ratio.optimal);

                          return (
                            <td key={yearIndex} className={`px-4 py-3 text-sm text-right font-semibold ${statusColor}`}>
                              {ratio.format(value)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Interpretación especial para Z-Score de Altman */}
            {group.title === 'Análisis de Riesgo' && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                {sortedYears.slice(0, 3).map((year, index) => {
                  const zScore = year.ratios?.altmanZScore;
                  const interpretation = getAltmanInterpretation(zScore);

                  return (
                    <div key={index} className="bg-white p-4 rounded-lg border border-gray-200">
                      <div className="text-sm font-semibold text-gray-700 mb-1">
                        {year.year}
                      </div>
                      <div className={`text-lg font-bold ${interpretation.color} mb-1`}>
                        {formatNumber(zScore)}
                      </div>
                      <div className={`text-xs ${interpretation.color}`}>
                        {interpretation.text}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Interpretación de Ratios</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-700">
          <div>
            <p className="font-semibold mb-1">Liquidez:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Corriente &gt; 1.5: Buena capacidad de pago a corto plazo</li>
              <li>Prueba Ácida &gt; 1.0: Capacidad sin depender de inventario</li>
              <li>Cash Ratio &gt; 0.3: Disponibilidad inmediata</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-1">Endeudamiento:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Deuda/Patrimonio &lt; 1.5: Estructura financiera sana</li>
              <li>Deuda/Activos &lt; 0.6: Bajo apalancamiento</li>
              <li>Deuda/EBITDA &lt; 3x: Capacidad de repago adecuada</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-1">Rentabilidad:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>ROE &gt; 15%: Buena rentabilidad para accionistas</li>
              <li>ROA &gt; 10%: Uso eficiente de activos</li>
              <li>Márgenes altos indican mejor eficiencia operativa</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-1">Z-Score de Altman:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>&gt; 2.99: Zona segura (bajo riesgo)</li>
              <li>1.81 - 2.99: Zona gris (precaución)</li>
              <li>&lt; 1.81: Zona de peligro (alto riesgo)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
