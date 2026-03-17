import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AnimatedGridBackground from '../../components/ui/AnimatedGridBackground';
import updmLogo from '../../assets/UPDMLOGO4K.png';
import Register from './Register';
import { getUser, saveUser, saveToken } from '../../utils/authUtils';

// URL DEL BACKEND (Ajústala si pruebas en local)
import API_URL from '../../config/api';
// const API_URL = 'http://localhost:4000'; 

const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Auto-login si hay sesión guardada
    const user = getUser();
    if (user) {
      const { rol } = user;
      switch (rol) {
        case 'prospector': navigate('/prospector'); break;
        case 'closer': navigate('/closer'); break;
        case 'tecnico': navigate('/tecnico'); break;
        case 'distribuidor': navigate('/distribuidor'); break;
        case 'usuario': navigate('/usuario'); break;
        default: break;
      }
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // 🔐 USUARIOS DE PRUEBA LOCALES
    if (username === 'closer' && password === '123') {
      const localUser = { id: 1, nombre: 'Closer Test', username: 'closer', email: 'closer@test.com', rol: 'closer' };
      saveUser(localUser, rememberMe);
      setLoading(false);
      navigate('/closer');
      return;
    }
    if (username === 'prospector' && password === '123') {
      const localUser = { id: 2, nombre: 'Prospector Test', username: 'prospector', email: 'prospor@test.com', rol: 'prospector' };
      saveUser(localUser, rememberMe);
      setLoading(false);
      navigate('/prospector');
      return;
    }

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
          case 'tecnico': navigate('/tecnico'); break;
          case 'distribuidor': navigate('/distribuidor'); break;
          case 'usuario': navigate('/usuario'); break;
          default: navigate('/'); // Por seguridad
        }
      } else {
        setError(data.mensaje || data.message || 'Credenciales incorrectas');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('No hay conexión con el servidor. Usa admin/123 para acceso local ⚠️');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatedGridBackground mode="light">
      <div
        className="relative flex min-h-screen items-center justify-center px-4 py-10 text-slate-900 sm:px-6 lg:px-8"
        style={{ fontFamily: '"Space Grotesk", "Poppins", sans-serif' }}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 right-10 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-teal-400/20 blur-3xl" />
        </div>

        <div className="relative w-full max-w-5xl">
          <div className="grid gap-12 p-4 lg:grid-cols-2 lg:p-8 items-center">
            <div className="flex flex-col justify-between space-y-8">
              <div className="p-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100/50 bg-emerald-50/50 px-3 py-1 text-xs uppercase tracking-[0.2em] text-emerald-800 font-bold backdrop-blur-sm">
                  Acceso seguro
                </div>
                <div className="mt-8 flex items-center">
                  <img
                    src={updmLogo}
                    alt="UPDM"
                    className="h-32 w-auto drop-shadow-xl"
                  />
                </div>
                <p className="mt-6 text-lg text-slate-800 font-medium leading-relaxed drop-shadow-sm">
                  Administra clientes, servicios y reportes desde un solo lugar.
                </p>
              </div>
              <div className="p-4 text-sm text-emerald-900">
                <p className="font-bold text-emerald-950 flex items-center gap-2 text-base">
                  <span className="text-2xl">🛡️</span> Tip de seguridad
                </p>
                <p className="mt-2 text-emerald-900 font-medium">Usa una contraseña única y no la compartas con nadie.</p>
              </div>
            </div>

            <div className="p-8">
              <h2 className="text-4xl font-black bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent drop-shadow-sm">Inicia sesión</h2>
              <p className="mt-3 text-base text-slate-700 font-semibold">Completa tus datos para continuar.</p>

              <form onSubmit={handleLogin} className="mt-10 space-y-8">
                {error && (
                  <div className="rounded-2xl border border-red-200/50 bg-red-50/80 backdrop-blur-sm px-4 py-3 text-sm text-red-700 shadow-sm">
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-emerald-800 ml-1 mb-1">Usuario o correo</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoComplete="username"
                      className="mt-1 w-full rounded-xl border border-slate-200/60 bg-white/50 backdrop-blur-sm px-4 py-3.5 text-slate-900 placeholder-slate-500 focus:border-emerald-400 focus:bg-white/80 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-sm"
                      placeholder="Ingresa tu usuario"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-emerald-800 ml-1 mb-1">Contraseña</label>
                    <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200/60 bg-white/50 backdrop-blur-sm px-4 py-3.5 focus-within:border-emerald-400 focus-within:bg-white/80 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all shadow-sm">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        className="w-full bg-transparent text-slate-900 placeholder-slate-500 outline-none"
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="text-xs font-semibold text-emerald-600 hover:text-emerald-800"
                      >
                        {showPassword ? 'Ocultar' : 'Mostrar'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 bg-white text-emerald-500 focus:ring-emerald-500/20"
                    />
                    Recordar sesión
                  </label>
                  <a href="/recuperar" className="text-emerald-700 hover:text-emerald-900">
                    Olvidaste tu contraseña?
                  </a>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3.5 font-bold text-white shadow-lg shadow-emerald-500/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-emerald-500/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Validando...' : 'Iniciar sesión'}
                </button>

                <div className="text-center text-xs text-slate-600 font-medium">
                  No tienes una cuenta?{' '}
                  <a href="/register" className="text-emerald-700 hover:text-emerald-900 underline decoration-2 underline-offset-4 hover:decoration-emerald-900">
                    Regístrate aquí
                  </a>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="fixed bottom-4 left-4 z-20">
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-slate-600 shadow-sm backdrop-blur-sm">
            <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500"></div>
            <span className="text-xs font-medium">v0.0.0 Producción</span>
          </div>
        </div>
      </div>
    </AnimatedGridBackground>
  );
};

export default Login;