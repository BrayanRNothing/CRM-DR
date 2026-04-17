// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Layouts
// Todos los layouts dinámicos abajo

// Components
import SkeletonLoader from './components/ui/SkeletonLoader.jsx';

// Componentes Globales
import React, { Suspense, lazy, useEffect } from 'react';
import useThemeStore, { THEMES } from './store/themeStore.js';
import ScrollToTop from './components/ScrollToTop.jsx';

const lazyWithRetry = (importer) =>
  lazy(async () => {
    try {
      const module = await importer();
      sessionStorage.removeItem('lazy-reload');
      return module;
    } catch (error) {
      const hasReloaded = sessionStorage.getItem('lazy-reload');
      if (!hasReloaded) {
        sessionStorage.setItem('lazy-reload', 'true');
        window.location.reload();
        return { default: () => null };
      }
      throw error;
    }
  });

const Login = lazyWithRetry(() => import('./pages/auth/Login.jsx'));
const Register = lazyWithRetry(() => import('./pages/auth/Register.jsx'));
const Ajustes = lazyWithRetry(() => import('./pages/Ajustes.jsx'));
const TerminosCondiciones = lazyWithRetry(() => import('./pages/TerminosCondiciones.jsx'));
const PoliticaPrivacidad = lazyWithRetry(() => import('./pages/PoliticaPrivacidad.jsx'));

const NotFound = lazyWithRetry(() => import('./pages/NotFound.jsx'));

// Legacy pages was removed

// Core Pages
const MainLayout = lazyWithRetry(() => import('./layouts/MainLayout.jsx'));
const Dashboard = lazyWithRetry(() => import('./pages/Dashboard.jsx'));
const Calendario = lazyWithRetry(() => import('./pages/Calendario.jsx'));
const Seguimiento = lazyWithRetry(() => import('./pages/Seguimiento.jsx'));
const Clientes = lazyWithRetry(() => import('./pages/Clientes.jsx'));

// Shared Components
const Equipo = lazyWithRetry(() => import('./pages/Equipo.jsx'));
const AdminPanel = lazyWithRetry(() => import('./pages/AdminPanel.jsx'));

function App() {
  const currentThemeId = useThemeStore((state) => state.currentThemeId);

  useEffect(() => {
    // Obtenemos la clase `theme-*` correcta basada en el ID seleccionado.
    const activeThemeConfig = THEMES.find((t) => t.id === currentThemeId) || THEMES[0];
    const newThemeClass = activeThemeConfig.className;

    // Quitamos viejos theamas y agregamos el actual al body para efecto global
    document.body.classList.remove(...THEMES.map((t) => t.className));
    document.body.classList.add(newThemeClass);
  }, [currentThemeId]);

  return (
    <BrowserRouter>
      <ScrollToTop />
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
          <Route path="/terminos-y-condiciones" element={<TerminosCondiciones />} />
          <Route path="/politica-de-privacidad" element={<PoliticaPrivacidad />} />

          {/* --- VENDEDOR / CORE --- */}
          <Route path="/vendedor" element={<MainLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="calendario" element={<Calendario />} />
            <Route path="prospectos" element={<Seguimiento />} />
            <Route path="clientes" element={<Clientes />} />
            <Route path="equipo" element={<Equipo />} />
            <Route path="admin" element={<AdminPanel />} />
            <Route path="usuarios" element={<Navigate to="/vendedor/equipo" replace />} />
            <Route path="usuarios/*" element={<Navigate to="/vendedor/equipo" replace />} />
            <Route path="users/:id" element={<Navigate to="/vendedor/equipo" replace />} />
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
