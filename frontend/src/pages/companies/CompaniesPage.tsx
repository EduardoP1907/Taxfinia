import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { Building2, Plus, Pencil, Trash2, FileText, Calendar } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { CompanyFormModal } from '../../components/companies/CompanyFormModal';
import { companyService } from '../../services/company.service';
import type { Company, CreateCompanyData, UpdateCompanyData } from '../../types/company';
import { useNavigate } from 'react-router-dom';
import { useCompanyStore } from '../../store/companyStore';

export const CompaniesPage: React.FC = () => {
  const navigate = useNavigate();
  const setSelectedCompanyInStore = useCompanyStore((state) => state.setSelectedCompany);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      setIsLoading(true);
      const data = await companyService.getCompanies();
      setCompanies(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar las empresas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCompany = async (data: CreateCompanyData | UpdateCompanyData) => {
    await companyService.createCompany(data as CreateCompanyData);
    await loadCompanies();
  };

  const handleUpdateCompany = async (data: UpdateCompanyData) => {
    if (selectedCompany) {
      const updatedCompany = await companyService.updateCompany(selectedCompany.id, data);
      setSelectedCompanyInStore(updatedCompany);
      await loadCompanies();
    }
  };

  const handleDeleteCompany = async (id: string) => {
    try {
      await companyService.deleteCompany(id);
      await loadCompanies();
      setDeleteConfirm(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al eliminar la empresa');
    }
  };

  const handleOpenModal = (company?: Company) => {
    setSelectedCompany(company || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCompany(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getCurrencySymbol = (currency: string = 'EUR') => {
    const symbols: { [key: string]: string } = {
      EUR: '€',
      USD: '$',
      MXN: '$',
      ARS: '$',
      COP: '$',
      CLP: '$',
      PEN: 'S/',
      GBP: '£',
    };
    return symbols[currency] || currency;
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Mis Empresas</h1>
            <p className="text-gray-600">
              Gestiona las empresas que analizas ({companies.length})
            </p>
          </div>
          <Button className="flex items-center gap-2" onClick={() => handleOpenModal()}>
            <Plus className="w-5 h-5" />
            Nueva Empresa
          </Button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
          </div>
        ) : companies.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                <Building2 className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No tienes empresas registradas
              </h3>
              <p className="text-gray-600 mb-6">
                Crea tu primera empresa para comenzar a analizar datos financieros
              </p>
              <Button onClick={() => handleOpenModal()}>
                <Plus className="w-5 h-5 mr-2" />
                Crear Primera Empresa
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.map((company) => (
              <Card key={company.id} className="hover:shadow-lg transition-shadow">
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-slate-700 to-slate-900 rounded-lg flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-lg">
                          {company.name}
                        </h3>
                        {company.taxId && (
                          <p className="text-sm text-gray-500">{company.taxId}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="space-y-2 mb-4">
                    {company.industry && (
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="font-medium mr-2">Sector:</span>
                        {company.industry}
                      </div>
                    )}
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      Año base: {company.baseYear}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="font-medium mr-2">Moneda:</span>
                      {getCurrencySymbol(company.currency)}
                    </div>
                    {company.employees && (
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="font-medium mr-2">Empleados:</span>
                        {company.employees}
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  {company.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {company.description}
                    </p>
                  )}

                  {/* Footer */}
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500 mb-3">
                      Actualizado: {formatDate(company.updatedAt)}
                    </p>

                    {deleteConfirm === company.id ? (
                      <div className="space-y-2">
                        <p className="text-sm text-red-600 font-medium">
                          ¿Eliminar esta empresa?
                        </p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDeleteCompany(company.id)}
                            className="flex-1"
                          >
                            Sí, eliminar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeleteConfirm(null)}
                            className="flex-1"
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => {
                            setSelectedCompanyInStore(company);
                            navigate(`/datos?companyId=${company.id}&year=${company.baseYear || new Date().getFullYear()}`);
                          }}
                          className="flex-1"
                        >
                          <FileText className="w-4 h-4 mr-1" />
                          Datos
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenModal(company)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDeleteConfirm(company.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Info Card */}
        {companies.length > 0 && (
          <div className="mt-8">
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                💡 Próximos pasos
              </h3>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li>• Haz clic en "Datos" para ingresar información financiera</li>
                <li>• Completa los datos de al menos 3 ejercicios fiscales</li>
                <li>• El sistema calculará automáticamente los ratios financieros</li>
                <li>• Genera el informe económico-financiero completo</li>
              </ul>
            </Card>
          </div>
        )}
      </div>

      {/* Modal */}
      <CompanyFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={selectedCompany ? handleUpdateCompany : handleCreateCompany}
        company={selectedCompany}
        title={selectedCompany ? 'Editar Empresa' : 'Nueva Empresa'}
      />
    </DashboardLayout>
  );
};
