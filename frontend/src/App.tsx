import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { PrivateRoute } from './components/PrivateRoute';

// Auth pages
import { RegisterPage } from './pages/auth/RegisterPage';
import { LoginPage } from './pages/auth/LoginPage';
import { VerifyOtpPage } from './pages/auth/VerifyOtpPage';

// Dashboard pages
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { CompaniesPage } from './pages/companies/CompaniesPage';
import { MultiYearDataEntryPage } from './pages/data/MultiYearDataEntryPage';
import { ReportPage } from './pages/report/ReportPage';
import { CombinedProjectionsPage } from './pages/projections/CombinedProjectionsPage';
import { Projection41Page } from './pages/projections/Projection41Page';
import { Projection43Page } from './pages/projections/Projection43Page';

function App() {
  const { initializeAuth, isLoading } = useAuthStore();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-amber-500 mx-auto mb-4"></div>
          <p className="text-slate-400 font-medium tracking-widest text-sm uppercase">Cargando PROMETHEIA...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/verify-otp" element={<VerifyOtpPage />} />

        {/* Rutas protegidas */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <DashboardPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/empresas"
          element={
            <PrivateRoute>
              <CompaniesPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/datos"
          element={
            <PrivateRoute>
              <MultiYearDataEntryPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/informe"
          element={
            <PrivateRoute>
              <ReportPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/proyecciones"
          element={
            <PrivateRoute>
              <CombinedProjectionsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/proyecciones-41"
          element={
            <PrivateRoute>
              <Projection41Page />
            </PrivateRoute>
          }
        />
        <Route
          path="/proyecciones-43"
          element={
            <PrivateRoute>
              <Projection43Page />
            </PrivateRoute>
          }
        />

        {/* Redirecciones */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
