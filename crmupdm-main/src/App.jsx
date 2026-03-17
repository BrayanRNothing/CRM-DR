// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Layouts
import ProspectorLayout from './layouts/ProspectorLayout.jsx';
import CloserLayout from './layouts/CloserLayout.jsx';

// Components
import SkeletonLoader from './components/ui/SkeletonLoader.jsx';

// Páginas
import React, { Suspense, lazy } from 'react';
const Login = lazy(() => import('./pages/auth/Login.jsx'));
const Register = lazy(() => import('./pages/auth/Register.jsx'));
const Ajustes = lazy(() => import('./pages/common/Ajustes.jsx'));

const NotFound = lazy(() => import('./pages/NotFound.jsx'));

// Prospector Pages
const ProspectorDashboard = lazy(() => import('./pages/prospector/ProspectorDashboard.jsx'));
const ProspectorCalendario = lazy(() => import('./pages/prospector/ProspectorCalendario.jsx'));
const ProspectorSeguimiento = lazy(() => import('./pages/prospector/ProspectorSeguimiento.jsx'));

// Closer Pages
const CloserDashboard = lazy(() => import('./pages/closer/CloserDashboard.jsx'));
const CloserCalendario = lazy(() => import('./pages/closer/CloserCalendario.jsx'));
const CloserMonitoreoProspectors = lazy(() => import('./pages/closer/CloserMonitoreoProspectors.jsx'));

// Shared Components
const CRMClientes = lazy(() => import('./pages/common/CRMClientes.jsx'));
const UserManagement = lazy(() => import('./pages/common/UserManagement.jsx'));
const UserProfile = lazy(() => import('./pages/common/UserProfile.jsx'));

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

          {/* --- PROSPECTOR --- */}
          <Route path="/prospector" element={<ProspectorLayout />}>
            <Route index element={<ProspectorDashboard />} />
            <Route path="prospectos" element={<ProspectorSeguimiento />} />
            <Route path="calendario" element={<ProspectorCalendario />} />
            <Route path="clientes" element={<CRMClientes />} />
            <Route path="usuarios/prospectors" element={<UserManagement initialRole="prospector" />} />
            <Route path="usuarios/closers" element={<UserManagement initialRole="closer" />} />
            <Route path="users/:id" element={<UserProfile />} />
            <Route path="ajustes" element={<Ajustes />} />
          </Route>

          <Route path="/closer" element={<CloserLayout />}>
            <Route index element={<CloserDashboard />} />
            <Route path="calendario" element={<CloserCalendario />} />
            <Route path="prospectos" element={<ProspectorSeguimiento />} />
            <Route path="clientes" element={<CRMClientes />} />
            <Route path="usuarios/prospectors" element={<UserManagement initialRole="prospector" />} />
            <Route path="usuarios/closers" element={<UserManagement initialRole="closer" />} />
            <Route path="users/:id" element={<UserProfile />} />
            <Route path="monitoreo-prospectors" element={<CloserMonitoreoProspectors />} />
            <Route path="ajustes" element={<Ajustes />} />
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