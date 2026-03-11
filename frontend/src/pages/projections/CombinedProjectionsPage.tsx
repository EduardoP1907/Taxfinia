/**
 * Combined Projections Page
 * Muestra las hojas de proyecciones: 4.0 (configurar tasas), 4.1 (completa), 4.2 (simplificada), 4.3 (DCF)
 */

import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Projection41Page } from './Projection41Page';
import { ProjectionsPage } from './ProjectionsPage';
import { Projection43Page } from './Projection43Page';
import { GrowthRatesConfigPage } from './GrowthRatesConfigPage';

export const CombinedProjectionsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Leer el tab activo de la URL, por defecto 4.0 (configuración)
  const activeTab = searchParams.get('view') || '4.0';

  const handleTabChange = (tab: string) => {
    // Mantener los otros parámetros (companyId, scenarioId) y solo cambiar view
    const newParams = new URLSearchParams(searchParams);
    newParams.set('view', tab);
    setSearchParams(newParams);
  };

  const TABS = [
    {
      id: '4.0',
      label: 'Hoja 4.0 - Configurar Tasas',
      sublabel: '⭐ Comenzar aquí',
      highlight: true,
    },
    {
      id: '4.1',
      label: 'Hoja 4.1 - Proyección Completa',
      sublabel: 'Balance, P&G, Ratios, FCF',
      highlight: false,
    },
    {
      id: '4.2',
      label: 'Hoja 4.2 - Proyección Simplificada',
      sublabel: 'Edición manual de datos',
      highlight: false,
    },
    {
      id: '4.3',
      label: 'Hoja 4.3 - Valoración DCF',
      sublabel: 'Discounted Cash Flow',
      highlight: false,
    },
  ];

  // Componente de tabs que se mostrará en todas las vistas
  const TabsHeader = () => (
    <div className="mb-6 border-b border-gray-200 bg-white rounded-t-lg">
      <nav className="-mb-px flex space-x-1 px-4 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`
              py-4 px-3 border-b-2 font-medium text-sm transition-colors whitespace-nowrap flex flex-col items-center
              ${activeTab === tab.id
                ? tab.highlight
                  ? 'border-amber-500 text-amber-600'
                  : 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <span>{tab.label}</span>
            <span className={`text-xs mt-0.5 ${activeTab === tab.id ? (tab.highlight ? 'text-amber-500' : 'text-blue-400') : 'text-gray-400'}`}>
              {tab.sublabel}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );

  // Renderizar la vista activa
  if (activeTab === '4.1') {
    return (
      <div className="projection-41-page-wrapper">
        <Projection41Page tabsHeader={<TabsHeader />} />
      </div>
    );
  } else if (activeTab === '4.3') {
    return (
      <div className="projection-43-page-wrapper">
        <Projection43Page tabsHeader={<TabsHeader />} />
      </div>
    );
  } else if (activeTab === '4.2') {
    return (
      <div className="projections-42-page-wrapper">
        <ProjectionsPage tabsHeader={<TabsHeader />} />
      </div>
    );
  } else {
    // 4.0 - Configurar Tasas de Crecimiento (vista por defecto)
    return (
      <div className="projection-40-page-wrapper">
        <GrowthRatesConfigPage tabsHeader={<TabsHeader />} />
      </div>
    );
  }
};
