import React, { useState, useEffect } from 'react';
import { Calendar, Plus, ChevronDown } from 'lucide-react';
import { Button } from '../ui/Button';
import { financialService } from '../../services/financial.service';

interface YearSelectorProps {
  companyId: string;
  currentYear: number;
  onYearChange: (year: number) => void;
}

export const YearSelector: React.FC<YearSelectorProps> = ({
  companyId,
  currentYear,
  onYearChange,
}) => {
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [showYearList, setShowYearList] = useState(false);
  const [showAddYear, setShowAddYear] = useState(false);
  const [newYear, setNewYear] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAvailableYears();
  }, [companyId]);

  const loadAvailableYears = async () => {
    try {
      const fiscalYears = await financialService.getFiscalYears(companyId);
      const years = fiscalYears.map(fy => fy.year).sort((a, b) => b - a);
      setAvailableYears(years);
    } catch (error) {
      console.error('Error loading fiscal years:', error);
    }
  };

  const handleAddYear = async () => {
    const year = parseInt(newYear);
    if (!year || year < 1900 || year > 2100) {
      alert('Por favor ingresa un año válido');
      return;
    }

    if (availableYears.includes(year)) {
      alert('Este año ya existe');
      return;
    }

    try {
      setLoading(true);
      await financialService.createFiscalYear(companyId, { year });
      await loadAvailableYears();
      setNewYear('');
      setShowAddYear(false);
      onYearChange(year);
    } catch (error) {
      console.error('Error adding year:', error);
      alert('Error al añadir el año');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      {/* Current Year Display */}
      <button
        onClick={() => setShowYearList(!showYearList)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <Calendar className="w-4 h-4 text-gray-500" />
        <span className="font-semibold text-gray-900">Ejercicio {currentYear}</span>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showYearList ? 'rotate-180' : ''}`} />
      </button>

      {/* Year Dropdown */}
      {showYearList && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
          <div className="p-2">
            <div className="text-xs font-semibold text-gray-500 uppercase px-2 py-1">
              Años Disponibles
            </div>
            <div className="max-h-60 overflow-y-auto">
              {availableYears.length > 0 ? (
                availableYears.map(year => (
                  <button
                    key={year}
                    onClick={() => {
                      onYearChange(year);
                      setShowYearList(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                      year === currentYear
                        ? 'bg-amber-50 text-amber-600 font-semibold'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    Ejercicio {year}
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-sm text-gray-500">
                  No hay años disponibles
                </div>
              )}
            </div>

            {/* Add Year Button */}
            <div className="border-t border-gray-200 mt-2 pt-2">
              {!showAddYear ? (
                <button
                  onClick={() => setShowAddYear(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Añadir Nuevo Año
                </button>
              ) : (
                <div className="space-y-2">
                  <input
                    type="number"
                    placeholder="Ej: 2024"
                    value={newYear}
                    onChange={(e) => setNewYear(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                    min="1900"
                    max="2100"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddYear();
                      } else if (e.key === 'Escape') {
                        setShowAddYear(false);
                        setNewYear('');
                      }
                    }}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleAddYear}
                      disabled={loading}
                      isLoading={loading}
                      className="flex-1"
                    >
                      Añadir
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowAddYear(false);
                        setNewYear('');
                      }}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Overlay to close dropdown */}
      {showYearList && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowYearList(false)}
        />
      )}
    </div>
  );
};
