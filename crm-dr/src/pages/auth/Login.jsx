import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AnimatedGridBackground from '../../components/ui/AnimatedGridBackground';
import medicrmlogo from '../../assets/medicrmlogo.png';
import { getUser, saveUser, saveToken } from '../../utils/authUtils';
import { Mail, Lock, Check, Eye, EyeOff, ShieldCheck, ArrowRight } from 'lucide-react';

// URL DEL BACKEND (Ajústala si pruebas en local)
import API_URL from '../../config/api';
// const API_URL = 'http://localhost:4000'; 

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
      navigate('/app');
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

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

        // Redirigimos a la app unificada
        navigate('/app');
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
    <AnimatedGridBackground mode="light">
      <div className="relative flex min-h-screen items-center justify-center font-sans">

        {/* Decorative Elements (Visible only on right side now) */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-[20%] -right-[10%] h-[600px] w-[600px] rounded-full bg-slate-300/30 blur-[120px]" />
          <div className="absolute -bottom-[20%] right-[20%] h-[700px] w-[700px] rounded-full bg-blue-400/10 blur-[150px]" />
        </div>

        {/* Main Fullscreen Container */}
        <div className="relative z-10 w-full min-h-screen flex flex-col lg:flex-row bg-white/70 backdrop-blur-2xl">

          {/* Left Branding Panel (Fullscreen height, 50% width) */}
          <div className="relative hidden lg:flex flex-col justify-between w-1/2 p-10 xl:p-16 bg-linear-to-br from-blue-950 via-blue-900 to-slate-900 text-white overflow-hidden shadow-2xl z-20">
            {/* Inner abstract shapes */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-slate-400/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4"></div>

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-900/50 px-4 py-1.5 text-xs font-semibold tracking-wide text-blue-200 backdrop-blur-md">
                <ShieldCheck className="w-4 h-4" />
                Acceso Seguro
              </div>
              <div className="mt-10 xl:mt-12 flex justify-start w-full">
                <img src={medicrmlogo} alt="CRM DR" className="w-[90%] max-w-md xl:max-w-xl h-auto drop-shadow-[0_20px_50px_rgba(0,0,0,0.3)] object-contain" />
              </div>
            </div>

            <div className="relative z-10 mt-16">
              <h1 className="text-4xl font-black leading-tight tracking-tight text-white drop-shadow-md">
                Transformando la <br />
                <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-300 to-slate-300">Gestión Médica</span>
              </h1>
              <p className="mt-6 text-blue-100/80 leading-relaxed font-medium">
                Administra clientes, pipeline de ventas, citas y proyecciones desde un ecosistema unificado y elegante.
              </p>

              <div className="mt-10 flex items-center gap-4">
                <div className="flex -space-x-3">
                  <div className="w-10 h-10 rounded-full border-2 border-blue-900 bg-slate-300"></div>
                  <div className="w-10 h-10 rounded-full border-2 border-blue-900 bg-blue-300"></div>
                  <div className="w-10 h-10 rounded-full border-2 border-blue-900 bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-950">+1k</div>
                </div>
                <p className="text-xs font-medium text-blue-200">
                  Usuarios activos<br />cada mes
                </p>
              </div>
            </div>
          </div>

          {/* Right Login Panel (Fullscreen height, 50% width) */}
          <div className="w-full lg:w-1/2 p-6 justify-center sm:p-10 lg:p-16 flex flex-col h-screen overflow-y-auto lg:overflow-hidden bg-transparent relative z-10">

            {/* Mobile Logo Visibility */}
            <div className="lg:hidden flex justify-center w-full mb-8 shrink-0 px-4">
              <img src={medicrmlogo} alt="CRM DR" className="w-[70%] max-w-[280px] h-auto object-contain drop-shadow-xl" />
            </div>

            <div className="max-w-md w-full mx-auto">
              <h2 className="text-2xl xl:text-3xl font-black text-slate-900 tracking-tight">Bienvenido de vuelta</h2>
              <p className="mt-1 xl:mt-2 text-xs xl:text-sm text-slate-500 font-medium">Por favor, ingresa tus credenciales para continuar.</p>

              <form onSubmit={handleLogin} className="mt-6 xl:mt-10 space-y-4 xl:space-y-6">
                {error && (
                  <div className="flex items-start gap-3 p-4 bg-red-50/80 border border-red-100 rounded-2xl text-red-600 text-sm font-medium animate-in fade-in slide-in-from-top-2">
                    <ShieldCheck className="w-5 h-5 shrink-0 text-red-500" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Username Input Group */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Usuario o Correo</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                      <Mail className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoComplete="username"
                      className="block w-full pl-12 pr-4 py-3 xl:py-4 bg-white/80 border border-slate-200/80 rounded-2xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-500 transition-all font-medium shadow-sm"
                      placeholder="tu_usuario@crm.com"
                      required
                    />
                  </div>
                </div>

                {/* Password Input Group */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Contraseña</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      className="block w-full pl-12 pr-12 py-3 xl:py-4 bg-white/80 border border-slate-200/80 rounded-2xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-500 transition-all font-medium shadow-sm"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm mt-4">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${rememberMe ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300 group-hover:border-blue-400'}`}>
                      {rememberMe && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                    </div>
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="hidden"
                    />
                    <span className="text-slate-600 font-medium group-hover:text-slate-900 transition-colors">Recordar sesión</span>
                  </label>
                  <a href="/recuperar" className="text-blue-600 font-bold hover:text-blue-800 transition-colors">¿Olvidaste tu contraseña?</a>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full relative group overflow-hidden bg-blue-950 text-white rounded-2xl py-3 xl:py-4 font-bold tracking-wide transition-all duration-300 hover:shadow-[0_10px_20px_-10px_rgba(23,37,84,0.6)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  <div className="absolute inset-0 bg-linear-to-r from-blue-900 to-blue-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <span className="relative flex items-center justify-center gap-2">
                    {loading ? 'Verificando credenciales...' : 'Iniciar Sesión'}
                    {!loading && <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />}
                  </span>
                </button>
              </form>

              <div className="mt-6 xl:mt-10 text-center">
                <p className="text-slate-500 text-sm font-medium">
                  ¿No tienes una cuenta aún?{' '}
                  <a href="/register" className="text-blue-600 font-bold hover:text-blue-800 hover:underline decoration-2 underline-offset-4 transition-all">
                    Regístrate ahora
                  </a>
                </p>
              </div>
            </div>

            {/* Footer Tag */}
            <div className="fixed bottom-6 right-6 z-30">
              <div className="flex items-center gap-2 rounded-full border border-white/40 bg-white/40 backdrop-blur-md px-4 py-2 text-slate-600 shadow-xs">
                <div className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
                </div>
                <span className="text-xs font-bold tracking-wider text-slate-700">v1.2 Producción</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AnimatedGridBackground>
  );
};

export default Login;