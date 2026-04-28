import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { Button } from '../../components/ui/Button';
import { CompanyFormModal } from '../../components/companies/CompanyFormModal';
import { companyService } from '../../services/company.service';
import type { Company, CreateCompanyData, UpdateCompanyData } from '../../types/company';
import { useNavigate } from 'react-router-dom';
import { useCompanyStore } from '../../store/companyStore';
import { Building2, Plus, Pencil, Trash2, FileText, Calendar, Briefcase, Users, DollarSign } from 'lucide-react';

export const CompaniesPage: React.FC = () => {
  const navigate = useNavigate();
  const setSelectedCompanyInStore = useCompanyStore((s) => s.setSelectedCompany);

  const [companies, setCompanies]         = useState<Company[]>([]);
  const [isLoading, setIsLoading]         = useState(true);
  const [isModalOpen, setIsModalOpen]     = useState(false);
  const [selectedCompany, setSelected]    = useState<Company | null>(null);
  const [error, setError]                 = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => { loadCompanies(); }, []);

  const loadCompanies = async () => {
    try {
      setIsLoading(true);
      setCompanies(await companyService.getCompanies());
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar las empresas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (data: CreateCompanyData | UpdateCompanyData) => {
    await companyService.createCompany(data as CreateCompanyData);
    await loadCompanies();
  };

  const handleUpdate = async (data: UpdateCompanyData) => {
    if (selectedCompany) {
      const updated = await companyService.updateCompany(selectedCompany.id, data);
      setSelectedCompanyInStore(updated);
      await loadCompanies();
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await companyService.deleteCompany(id);
      await loadCompanies();
      setDeleteConfirm(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al eliminar la empresa');
    }
  };

  const openModal = (company?: Company) => { setSelected(company || null); setIsModalOpen(true); };
  const closeModal = () => { setIsModalOpen(false); setSelected(null); };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });

  const currencySymbol = (c = 'EUR') =>
    ({ EUR: '€', USD: '$', MXN: '$', ARS: '$', COP: '$', CLP: '$', PEN: 'S/', GBP: '£' }[c] ?? c);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">

        {/* ── Page header ──────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-data text-[10px] text-slate-400 tracking-[0.2em] uppercase">/ Portfolio</span>
            </div>
            <h1 className="font-display text-3xl font-extrabold text-slate-900 leading-tight">Mis Empresas</h1>
            <p className="text-slate-500 text-sm mt-1">
              {companies.length === 0
                ? 'Aún no tienes empresas registradas'
                : `${companies.length} empresa${companies.length > 1 ? 's' : ''} en el portfolio`}
            </p>
          </div>
          <Button onClick={() => openModal()} size="md">
            <Plus className="w-4 h-4" />
            Nueva Empresa
          </Button>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        {/* ── Loading ───────────────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>

        /* ── Empty state ─────────────────────────────────────────────────── */
        ) : companies.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 border-dashed py-20 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-7 h-7 text-slate-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">Sin empresas todavía</h3>
            <p className="text-slate-500 text-sm mb-6 max-w-xs mx-auto">
              Crea tu primera empresa para comenzar a analizar datos financieros
            </p>
            <Button onClick={() => openModal()}>
              <Plus className="w-4 h-4" />
              Crear Primera Empresa
            </Button>
          </div>

        /* ── Company grid ────────────────────────────────────────────────── */
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {companies.map((company) => (
              <div
                key={company.id}
                className="group bg-white rounded-xl border border-slate-200 hover:border-amber-200 hover:shadow-md transition-all duration-200 overflow-hidden"
              >
                {/* Card top accent */}
                <div className="h-1 bg-gradient-to-r from-amber-500 to-amber-300 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                <div className="p-5">
                  {/* Header */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-amber-500 transition-colors duration-200">
                      <Building2 className="w-5 h-5 text-white group-hover:text-slate-900 transition-colors duration-200" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 text-sm leading-tight truncate">
                        {company.name}
                      </h3>
                      {company.taxId && (
                        <p className="font-data text-[11px] text-slate-400 mt-0.5">{company.taxId}</p>
                      )}
                    </div>
                  </div>

                  {/* Meta pills */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {company.industry && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-600">
                        <Briefcase className="w-3 h-3" />
                        {company.industry}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-600">
                      <Calendar className="w-3 h-3" />
                      {company.baseYear}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-600">
                      <DollarSign className="w-3 h-3" />
                      {currencySymbol(company.currency)}
                    </span>
                    {company.employees && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-600">
                        <Users className="w-3 h-3" />
                        {company.employees}
                      </span>
                    )}
                  </div>

                  {company.description && (
                    <p className="text-xs text-slate-500 mb-4 line-clamp-2 leading-relaxed">
                      {company.description}
                    </p>
                  )}

                  {/* Footer */}
                  <div className="pt-3 border-t border-slate-100">
                    <p className="font-data text-[10px] text-slate-400 mb-3">
                      Actualizado {formatDate(company.updatedAt)}
                    </p>

                    {deleteConfirm === company.id ? (
                      <div className="space-y-2">
                        <p className="text-xs text-red-600 font-medium">¿Eliminar esta empresa?</p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="danger" onClick={() => handleDelete(company.id)} className="flex-1">
                            Sí, eliminar
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setDeleteConfirm(null)} className="flex-1">
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="primary"
                          className="flex-1"
                          onClick={() => {
                            setSelectedCompanyInStore(company);
                            navigate(`/datos?companyId=${company.id}&year=${company.baseYear || new Date().getFullYear()}`);
                          }}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Datos
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openModal(company)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setDeleteConfirm(company.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Tips ─────────────────────────────────────────────────────────── */}
        {companies.length > 0 && (
          <div className="mt-6 px-5 py-4 bg-white rounded-xl border border-slate-200 flex items-start gap-3">
            <div className="w-1 h-full min-h-[16px] bg-amber-500 rounded-full flex-shrink-0 mt-1" />
            <div>
              <p className="text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Próximos pasos</p>
              <ul className="space-y-1 text-xs text-slate-500">
                <li>Haz clic en "Datos" para ingresar información financiera</li>
                <li>Completa los datos de al menos 3 ejercicios fiscales</li>
                <li>El sistema calculará automáticamente los ratios financieros</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      <CompanyFormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={selectedCompany ? handleUpdate : handleCreate}
        company={selectedCompany}
        title={selectedCompany ? 'Editar Empresa' : 'Nueva Empresa'}
      />
    </DashboardLayout>
  );
};
