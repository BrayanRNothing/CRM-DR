// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import AppLayout from './layouts/AppLayout.jsx';

// Components
import SkeletonLoader from './components/ui/SkeletonLoader.jsx';

// Páginas
import React, { Suspense, lazy } from 'react';
const Login = lazy(() => import('./pages/auth/Login.jsx'));
const Register = lazy(() => import('./pages/auth/Register.jsx'));
const AjustesEmpresa = lazy(() => import('./pages/settings/AjustesEmpresa.jsx'));

const NotFound = lazy(() => import('./pages/NotFound.jsx'));


const SeguimientoContactos = lazy(() => import('./pages/contacts/SeguimientoContactos.jsx'));
const CalendarioCompleto = lazy(() => import('./pages/calendar/CalendarioCompleto.jsx'));




const DashboardMain = lazy(() => import('./pages/dashboard/DashboardMain.jsx'));
const Estadisticas = lazy(() => import('./pages/dashboard/Estadisticas.jsx'));

// Shared Components
const Directorio = lazy(() => import('./pages/contacts/Directorio.jsx'));
const UserManagement = lazy(() => import('./pages/users/UserManagement.jsx'));
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