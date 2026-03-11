// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import AppLayout from './layouts/TeamCloserLayout.jsx';

// Components
import SkeletonLoader from './components/ui/SkeletonLoader.jsx';

// Páginas
import React, { Suspense, lazy } from 'react';
const Login = lazy(() => import('./pages/auth/login.jsx'));
const Register = lazy(() => import('./pages/auth/registro.jsx'));
const AjustesEmpresa = lazy(() => import('./pages/settings/AjustesEmpresa.jsx'));

const NotFound = lazy(() => import('./pages/NotFound.jsx'));

// FEATURES (Ahora importamos desde features)
const SeguimientoContactos = lazy(() => import('./features/prospects/SeguimientoProspectos.jsx'));
const CalendarioCompleto = lazy(() => import('./features/calendarios/UserFullCalendar.jsx'));
const DashboardMain = lazy(() => import('./features/dashboards/CloserDashboard.jsx'));

// Otras paginas
const Estadisticas = lazy(() => import('./features/dashboards/Estadisticas.jsx'));

// Shared Components / Features
const Directorio = lazy(() => import('./features/prospects/ListaClientes.jsx'));
const UserManagement = lazy(() => import('./features/users-management/TeamManagement.jsx'));
const UserProfile = lazy(() => import('./pages/users/UserProfile.jsx'));

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#23272f',
            color: '#fff',
            padding: '16px',
            borderRadius: '10px',
            fontSize: '15px',
            boxShadow: '0 4px 24px 0 #0002',
            fontWeight: 500,
          },
          success: {
            duration: 3000,
            style: {
              background: '#16a34a',
              color: '#fff',
            },
            iconTheme: {
              primary: '#22c55e',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            style: {
              background: '#dc2626',
              color: '#fff',
            },
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
          warning: {
            duration: 3500,
            style: {
              background: '#facc15',
              color: '#92400e',
            },
            iconTheme: {
              primary: '#f59e42',
              secondary: '#fff',
            },
          },
          info: {
            duration: 3000,
            style: {
              background: '#2563eb',
              color: '#fff',
            },
            iconTheme: {
              primary: '#60a5fa',
              secondary: '#fff',
            },
          },
        }}
      />
      <Suspense fallback={
        <div className="flex items-center justify-center h-screen p-8">
          <div className="w-full max-w-4xl">
            <SkeletonLoader variant="dashboard" />
          </div>
        </div>
      }>
        <Routes>
          {/* RUTA PÚBLICA (El Login es la raíz "/") */}
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* --- APP PRINCIPAL (CRM UNIFICADO) --- */}
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<DashboardMain />} />
            <Route path="estadisticas" element={<Estadisticas />} />
            <Route path="calendario" element={<CalendarioCompleto />} />
            <Route path="contactos" element={<SeguimientoContactos />} />
            <Route path="directorio" element={<Directorio />} />
            <Route path="usuarios" element={<UserManagement initialRole="prospector" />} />
            <Route path="users/:id" element={<UserProfile />} />
            <Route path="ajustes" element={<AjustesEmpresa />} />
          </Route>



          {/* --- PÁGINA SECRETA DE PREVIEW --- */}


          {/* Si escriben una ruta que no existe, los mandamos al Login */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;