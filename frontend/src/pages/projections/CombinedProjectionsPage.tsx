/**
 * Combined Projections Page
 * Muestra ambas vistas de proyecciones: Hoja 4.1 (completa) y Hoja 4.2 (simplificada)
 */

import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Projection41Page } from './Projection41Page';
import { ProjectionsPage } from './ProjectionsPage';
import { Projection43Page } from './Projection43Page';

export const CombinedProjectionsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Leer el tab activo de la URL, por defecto 4.1
  const activeTab = searchParams.get('view') || '4.1';

  const handleTabChange = (tab: string) => {
    // Mantener los otros parámetros (companyId, scenarioId) y solo cambiar view
    const newParams = new URLSearchParams(searchParams);
    newParams.set('view', tab);
    setSearchParams(newParams);
  };

  // Componente de tabs que se mostrará en ambas vistas
  const TabsHeader = () => (
    <div className="mb-6 border-b border-gray-200 bg-white rounded-t-lg">
      <nav className="-mb-px flex space-x-8 px-6">
        <button
          onClick={() => handleTabChange('4.1')}
          className={`
            py-4 px-1 border-b-2 font-medium text-sm transition-colors
            ${activeTab === '4.1'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }
          `}
        >
          Hoja 4.1 - Proyección Completa
          <span className="ml-2 text-xs text-gray-400">
            (Balance, P&G, Ratios, FCF)
          </span>
        </button>
        <button
          onClick={() => handleTabChange('4.2')}
          className={`
            py-4 px-1 border-b-2 font-medium text-sm transition-colors
            ${activeTab === '4.2'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }
          `}
        >
          Hoja 4.2 - Proyección Simplificada
          <span className="ml-2 text-xs text-gray-400">
            (Datos editables)
          </span>
        </button>
        <button
          onClick={() => handleTabChange('4.3')}
          className={`
            py-4 px-1 border-b-2 font-medium text-sm transition-colors
            ${activeTab === '4.3'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }
          `}
        >
          Hoja 4.3 - Valoración DCF
          <span className="ml-2 text-xs text-gray-400">
            (Discounted Cash Flow)
          </span>
        </button>
      </nav>
    </div>
  );

  // Renderizar la vista activa (cada una tiene su propio DashboardLayout)
  if (activeTab === '4.1') {
    return (
      <>
        <style>{`
          /* Inyectar los tabs al inicio del contenido */
          .projection-41-page-wrapper {
            position: relative;
          }
        `}</style>
        <div className="projection-41-page-wrapper">
          <Projection41Page tabsHeader={<TabsHeader />} />
        </div>
      </>
    );
  } else if (activeTab === '4.3') {
    return (
      <div className="projection-43-page-wrapper">
        <Projection43Page tabsHeader={<TabsHeader />} />
      </div>
    );
  } else {
    return (
      <div className="projections-42-page-wrapper">
        <ProjectionsPage tabsHeader={<TabsHeader />} />
      </div>
    );
  }
};
