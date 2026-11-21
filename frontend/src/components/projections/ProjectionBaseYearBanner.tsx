import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';
import { companyService } from '../../services/company.service';
import { projectionsService } from '../../services/projections.service';

/**
 * Aviso en las hojas 4.x: el escenario usa un año base anterior al último ejercicio
 * cerrado de la empresa. "Actualizar" crea un escenario NUEVO con base en ese
 * ejercicio y le copia las tasas y el WACC del actual (siguen editables); el
 * anterior se conserva.
 */
export const ProjectionBaseYearBanner: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const companyId = searchParams.get('companyId');
  const scenarioId = searchParams.get('scenarioId');

  const [lastClosedYear, setLastClosedYear] = useState<number | null>(null);
  const [scenario, setScenario] = useState<{ baseYear: number; projectionYears: number } | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    companyService.getCompany(companyId)
      .then(c => { if (!cancelled) setLastClosedYear(c.yearContext?.lastClosedYear ?? null); })
      .catch(() => { /* sin aviso */ });
    return () => { cancelled = true; };
  }, [companyId]);

  useEffect(() => {
    if (!scenarioId) { setScenario(null); return; }
    let cancelled = false;
    projectionsService.getScenario(scenarioId)
      .then(s => { if (!cancelled) setScenario({ baseYear: s.baseYear, projectionYears: s.projectionYears }); })
      .catch(() => { if (!cancelled) setScenario(null); });
    return () => { cancelled = true; };
  }, [scenarioId]);

  if (!companyId || lastClosedYear === null || !scenario || scenario.baseYear >= lastClosedYear) return null;

  const handleUpdate = async () => {
    try {
      setCreating(true);
      const created = await projectionsService.createScenario({
        companyId,
        baseYear: lastClosedYear,
        projectionYears: scenario.projectionYears || 10,
        name: `Proyección base ${lastClosedYear}`,
        copyFromScenarioId: scenarioId ?? undefined,
      });
      toast.success(`Proyección actualizada a base ${lastClosedYear} con tus tasas y WACC anteriores. Puedes ajustarlos.`);
      const p = new URLSearchParams(searchParams);
      p.set('scenarioId', created.id);
      p.set('view', '4.0');
      setSearchParams(p);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'No se pudo actualizar la proyección');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-slate-700">
      <p>
        <strong>Hay un nuevo ejercicio cerrado: {lastClosedYear}.</strong>{' '}
        Esta proyección usa como base {scenario.baseYear}. Al actualizarla se crea una nueva con base {lastClosedYear}
        {' '}que mantiene tus tasas de crecimiento y tu WACC (puedes editarlos); la actual se conserva.
      </p>
      <button
        type="button"
        onClick={handleUpdate}
        disabled={creating}
        className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
      >
        <RefreshCw className={`w-4 h-4 ${creating ? 'animate-spin' : ''}`} aria-hidden="true" />
        Actualizar proyección a base {lastClosedYear}
      </button>
    </div>
  );
};
