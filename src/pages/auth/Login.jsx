import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AnimatedGridBackground from '../../components/ui/AnimatedGridBackground';

import Register from './Register';
import { getUser, saveUser, saveToken } from '../../utils/authUtils';

// URL DEL BACKEND
import API_URL from '../../config/api';

// Íconos decorativos
import { Mail, Lock, LogIn, Sparkles, ShieldCheck, AlertCircle } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Mostrar mensaje si fue redirigido por token expirado
    const params = new URLSearchParams(window.location.search);
    if (params.get('expired')) {
      const msg = params.get('msg') || 'Tu sesión ha expirado. Por favor inicia sesión de nuevo.';
      setError(msg);
    }

    // Auto-login si hay sesión guardada
    const user = getUser();
    if (user) {
      const { rol } = user;
      switch (rol) {
        case 'prospector': navigate('/prospector'); break;
        case 'closer': navigate('/closer'); break;
        case 'vendedor': navigate('/vendedor'); break;
        default: break;
      }
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Si no es el usuario local, intentar con el backend
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ usuario: username, contraseña: password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Login exitoso - guardar usuario y token
        const userData = data.usuario || data.user;
        saveUser(userData, rememberMe);
        if (data.token) {
          saveToken(data.token, rememberMe);
        }

        // Redirigimos según el rol
        const { rol } = userData;
        switch (rol) {
          case 'prospector': navigate('/prospector'); break;
          case 'closer': navigate('/closer'); break;
          case 'vendedor': navigate('/vendedor'); break;
          default: navigate('/'); // Por seguridad
        }
      } else {
        setError(data.mensaje || data.message || 'Credenciales incorrectas');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('No hay conexión con el servidor. Verifica que el backend esté en ejecución ⚠️');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-slate-50 font-['Inter',sans-serif]">
      {/* 🔴 Lado Izquierdo - Panel Decorativo Inmersivo 🔴 */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-(--theme-900) justify-center items-center">
        {/* Elementos Decorativos con Glassmorphism */}
        <div className="absolute top-0 left-0 w-full h-full bg-linear-to-br from-(--theme-700) via-(--theme-900) to-(--theme-950) opacity-90"></div>
        
        {/* Orb blur */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-(--theme-500) rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-(--theme-300) rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        
        {/* Contenido flotante izquierdo */}
        <div className="relative z-10 p-16 max-w-lg text-white">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-8">
            <Sparkles className="w-4 h-4 text-(--theme-300)" />
            <span className="text-sm font-medium tracking-wide">Plataforma CRM Premium</span>
          </div>
          
          <h1 className="text-5xl font-black mb-6 leading-tight drop-shadow-md">
            Gestiona tu éxito <br/>
            <span className="text-transparent bg-clip-text bg-linear-to-r from-(--theme-200) to-(--theme-400)">
              sin complicaciones.
            </span>
          </h1>
          
          <p className="text-(--theme-100) text-lg leading-relaxed mb-12 opacity-90">
            Cierra más ventas, aumenta tu productividad y administra toda tu cartera de prospectos desde una única interfaz intuitiva e inteligente.
          </p>
          
          {/* Tarjeta de Testimonio Flotante (Soft UI) */}
          <div className="relative bg-white/10 backdrop-blur-lg border border-white/20 p-6 rounded-3xl shadow-2xl">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-full bg-linear-to-br from-(--theme-300) to-(--theme-600) flex items-center justify-center font-bold text-lg shadow-inner">
                S
              </div>
              <div>
                <p className="text-sm italic text-white/90 mb-2">
                  "El nivel de organización que logramos con este sistema multiplicó nuestros cierres por tres."
                </p>
                <p className="text-xs font-bold text-(--theme-200)">— Sistema Administrativo</p>
              </div>
            </div>
          </div>
        </div>

        {/* Patrón de cuadrícula inferior */}
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-linear-to-t from-(--theme-950) to-transparent opacity-80"
             style={{ backgroundImage: 'radial-gradient(var(--theme-500) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      {/* 🟢 Lado Derecho - Formulario de Acceso 🟢 */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 relative overflow-hidden">
        {/* Background blobs for mobile only (hidden on LG so it's clean on split view) */}
        <div className="lg:hidden absolute top-0 right-0 w-72 h-72 bg-(--theme-200) rounded-full mix-blend-multiply blur-3xl opacity-30 animate-blob"></div>
        <div className="lg:hidden absolute bottom-0 left-0 w-72 h-72 bg-(--theme-400) rounded-full mix-blend-multiply blur-3xl opacity-30 animate-blob animation-delay-2000"></div>

        <div className="w-full max-w-md relative z-10">
          
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-linear-to-br from-(--theme-500) to-(--theme-700) shadow-xl shadow-(--theme-500)/30 mb-6 transform rotate-3 transition-transform hover:rotate-6">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">Iniciar Sesión</h2>
            <p className="text-slate-500 mt-2 font-medium">Ingresa tus credenciales para continuar</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            
            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm shadow-sm animate-pulse-once">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="font-semibold">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div className="relative group">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 ml-1 transition-colors group-focus-within:text-(--theme-600)">
                  Usuario o Correo
                </label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-4 w-5 h-5 text-slate-400 group-focus-within:text-(--theme-500) transition-colors" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    required
                    style={{ '--tw-ring-color': 'var(--theme-500)' }}
                    className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-(--theme-500) focus:ring-4 focus:ring-opacity-10 transition-all shadow-sm shadow-slate-200/50"
                    placeholder="ejemplo@correo.com"
                  />
                </div>
              </div>

              <div className="relative group">
                <div className="flex items-center justify-between mb-1 ml-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 transition-colors group-focus-within:text-(--theme-600)">
                    Contraseña
                  </label>
                  <a href="/recuperar" className="text-xs font-semibold text-(--theme-600) hover:text-(--theme-800) mr-1">
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>
                <div className="relative flex items-center">
                  <Lock className="absolute left-4 w-5 h-5 text-slate-400 group-focus-within:text-(--theme-500) transition-colors" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    style={{ '--tw-ring-color': 'var(--theme-500)' }}
                    className="w-full pl-12 pr-16 py-3.5 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-(--theme-500) focus:ring-4 focus:ring-opacity-10 transition-all shadow-sm shadow-slate-200/50"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 text-xs font-bold text-slate-400 hover:text-(--theme-600) transition-colors"
                  >
                    {showPassword ? 'OCULTAR' : 'MOSTRAR'}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="w-5 h-5 border-2 border-slate-300 rounded peer-checked:bg-(--theme-500) peer-checked:border-(--theme-500) transition-all"></div>
                  <svg className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 14 10" fill="none">
                    <path d="M1 5L4.5 8.5L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="text-sm font-medium text-slate-600 group-hover:text-slate-800 transition-colors">Recordar mi sesión</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex items-center justify-center gap-2 bg-linear-to-r from-(--theme-500) to-(--theme-600) text-white py-4 px-8 rounded-2xl font-bold text-lg shadow-xl shadow-(--theme-500)/30 hover:shadow-2xl hover:shadow-(--theme-500)/40 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none transition-all duration-200 overflow-hidden"
            >
              <div className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-500 ease-out z-0"></div>
              <span className="relative z-10">{loading ? 'Validando Acceso...' : 'Entrar al Sistema'}</span>
              {!loading && <LogIn className="relative z-10 w-5 h-5 group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500 font-medium">
            ¿Aún no tienes cuenta?{' '}
            <a href="/register" className="font-bold text-(--theme-600) hover:text-(--theme-800) hover:underline underline-offset-4 transition-all">
              Regístrate aquí
            </a>
          </p>

        </div>
      </div>
      
      {/* Badge Flotante Producción */}
      <div className="fixed bottom-4 right-4 z-50 pointer-events-none">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur border border-slate-200 shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-(--theme-400) opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-(--theme-500)"></span>
          </span>
          <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500">v1.1 Estables</span>
        </div>
      </div>
      
    </div>
  );
};

export default Login;
