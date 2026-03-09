import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import type { Company, CreateCompanyData, UpdateCompanyData } from '../../types/company';

interface CompanyFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCompanyData | UpdateCompanyData) => Promise<void>;
  company?: Company | null;
  title: string;
}

export const CompanyFormModal: React.FC<CompanyFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  company,
  title,
}) => {
  const currentYear = new Date().getFullYear();

  const countryCurrencyMap: Record<string, string> = {
    CL: 'CLP', ES: 'EUR', US: 'USD', MX: 'MXN',
    AR: 'ARS', CO: 'COP', PE: 'PEN', UK: 'GBP',
    FR: 'EUR', DE: 'EUR',
  };

  const [formData, setFormData] = useState({
    name: '',
    taxId: '',
    industry: '',
    businessActivity: '',
    country: 'CL',
    description: '',
    website: '',
    employees: '',
    foundedYear: '',
    baseYear: currentYear.toString(),
    currency: 'CLP',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name,
        taxId: company.taxId || '',
        industry: company.industry || '',
        businessActivity: (company as any).businessActivity || '',
        country: company.country || 'CL',
        description: company.description || '',
        website: company.website || '',
        employees: company.employees?.toString() || '',
        foundedYear: company.foundedYear?.toString() || '',
        baseYear: company.baseYear.toString(),
        currency: company.currency || 'CLP',
      });
    } else {
      // Reset form for new company
      setFormData({
        name: '',
        taxId: '',
        industry: '',
        businessActivity: '',
        country: 'CL',
        description: '',
        website: '',
        employees: '',
        foundedYear: '',
        baseYear: currentYear.toString(),
        currency: 'CLP',
      });
    }
    setError('');
  }, [company, isOpen, currentYear]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'country') {
      const autoCurrency = countryCurrencyMap[value];
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        ...(autoCurrency ? { currency: autoCurrency } : {}),
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const dataToSubmit: any = {
        name: formData.name,
        taxId: formData.taxId || undefined,
        industry: formData.industry || undefined,
        businessActivity: formData.businessActivity || undefined,
        country: formData.country || undefined,
        description: formData.description || undefined,
        website: formData.website || undefined,
        employees: formData.employees ? parseInt(formData.employees) : undefined,
        foundedYear: formData.foundedYear ? parseInt(formData.foundedYear) : undefined,
        baseYear: parseInt(formData.baseYear),
        currency: formData.currency || undefined,
      };

      await onSubmit(dataToSubmit);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar la empresa');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Información Básica */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Nombre de la empresa *"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Ej: ABC Technologies S.L."
            required
          />

          <Input
            label="RUT de empresa"
            name="taxId"
            value={formData.taxId}
            onChange={handleChange}
            placeholder="Ej: 12345678-9"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Sector/Industria"
            name="industry"
            value={formData.industry}
            onChange={handleChange}
            placeholder="Ej: Tecnología, Retail, Manufactura"
          />

          <Input
            label="Giro / Actividad"
            name="businessActivity"
            value={formData.businessActivity}
            onChange={handleChange}
            placeholder="Ej: Venta al por mayor de alimentos"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              País
            </label>
            <select
              name="country"
              value={formData.country}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="ES">España</option>
              <option value="US">Estados Unidos</option>
              <option value="MX">México</option>
              <option value="AR">Argentina</option>
              <option value="CO">Colombia</option>
              <option value="CL">Chile</option>
              <option value="PE">Perú</option>
              <option value="UK">Reino Unido</option>
              <option value="FR">Francia</option>
              <option value="DE">Alemania</option>
            </select>
          </div>
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descripción
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
            placeholder="Breve descripción de la empresa..."
          />
        </div>

        {/* Información Adicional */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Sitio web"
            name="website"
            type="url"
            value={formData.website}
            onChange={handleChange}
            placeholder="https://www.ejemplo.com"
          />

          <Input
            label="Número de empleados"
            name="employees"
            type="number"
            min="0"
            value={formData.employees}
            onChange={handleChange}
            placeholder="Ej: 50"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Año de fundación"
            name="foundedYear"
            type="number"
            min="1800"
            max={currentYear}
            value={formData.foundedYear}
            onChange={handleChange}
            placeholder={currentYear.toString()}
          />

          <Input
            label="Año base de análisis *"
            name="baseYear"
            type="number"
            min="1900"
            max={currentYear + 1}
            value={formData.baseYear}
            onChange={handleChange}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Moneda *
            </label>
            <select
              name="currency"
              value={formData.currency}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="EUR">EUR (€)</option>
              <option value="USD">USD ($)</option>
              <option value="MXN">MXN ($)</option>
              <option value="ARS">ARS ($)</option>
              <option value="COP">COP ($)</option>
              <option value="CLP">CLP ($)</option>
              <option value="PEN">PEN (S/)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button type="submit" isLoading={isLoading}>
            {company ? 'Actualizar' : 'Crear'} Empresa
          </Button>
        </div>
      </form>
    </Modal>
  );
};
