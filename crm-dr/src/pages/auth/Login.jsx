import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import medicrmlogo from '../../assets/medicrmlogo.png';
import { getUser, saveUser, saveToken } from '../../utils/authUtils';
import { Mail, Lock, Eye, EyeOff, ShieldAlert, ArrowRight, Sparkles, Check, Hexagon } from 'lucide-react';
import API_URL from '../../services/api';

// --- CONFIGURACIÓN PERSONALIZABLE ---
const CUSTOM_CONFIG = {
  crmName: "CRM DR",
  subtitle: "Ecosistema de Gestión Médica Avanzada.",
  logoWidth: "w-44 lg:w-52",
};
// ------------------------------------

const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 150);
    const params = new URLSearchParams(window.location.search);
    if (params.get('expired')) {
      setError(params.get('msg') || 'Tu sesión ha expirado.');
    }
    if (getUser()) navigate('/app');
    return () => clearTimeout(timer);
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: username, contraseña: password }),
      });
      const data = await response.json();
      if (response.ok) {
        const userData = data.usuario || data.user;
        saveUser(userData, rememberMe);
        if (data.token) saveToken(data.token, rememberMe);
        navigate('/app');
      } else {
        setError(data.mensaje || data.message || 'Credenciales incorrectas');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-[#050914] text-slate-200 font-sans overflow-hidden selection:bg-blue-500/30 relative">
      
      {/* KEYFRAMES */}
      <style>{`
        @keyframes float-complex {
          0% { transform: translate(0, 0) rotate(0deg) scale(1); }
          33% { transform: translate(3vw, -4vh) rotate(3deg) scale(1.05); }
          66% { transform: translate(-2vw, 3vh) rotate(-2deg) scale(0.95); }
          100% { transform: translate(0, 0) rotate(0deg) scale(1); }
        }
        @keyframes sway {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-4vw, -4vh) scale(1.1); }
          100% { transform: translate(0, 0) scale(1); }
        }
        .animate-orbe-1 { animation: float-complex 20s ease-in-out infinite; }
        .animate-orbe-2 { animation: sway 25s ease-in-out infinite reverse; }
        .animate-orbe-3 { animation: float-complex 28s ease-in-out infinite 2s; }
      `}</style>

      {/* ============== FONDO GLOBAL INMERSIVO ============== */}
      {/* Todo el fondo es la animación. Sin tarjetas, el diseño flota sobre esto. */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden mix-blend-screen">
        <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-blue-600/20 filter blur-[130px] animate-orbe-1"></div>
        <div className="absolute top-[20%] right-[-10%] w-[70vw] h-[70vw] rounded-full bg-indigo-500/20 filter blur-[150px] animate-orbe-2"></div>
        <div className="absolute bottom-[-20%] left-[10%] w-[60vw] h-[60vw] rounded-full bg-cyan-500/15 filter blur-[140px] animate-orbe-3"></div>
        
        {/* Textura sutil y Noise */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0wIDBoNDB2NDBIMHoiIGZpbGw9Im5vbmUiLz4KPHBhdGggZD0iTTAgNDBoNDBWMEgweiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDIpIiBzdHJva2Utd2lkdGg9IjEiLz4KPC9zdmc+')] opacity-50"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjAwIDIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZmlsdGVyIGlkPSJub2lzZUZpbHRlciI+CiAgICA8ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC44NSIgbnVtT2N0YXZlcz0iMyIgc3RpdGNoVGlsZXM9InN0aXRjaCIvPgogIDwvZmlsdGVyPgogIDxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNub2lzZUZpbHRlcikiIG9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] mix-blend-overlay"></div>
      </div>

      {/* ============== ESTRUCTURA SPLIT-SCREEN FULLSCREEN ============== */}
      <div className={`relative z-10 w-full flex flex-col lg:flex-row h-screen transition-all duration-1000 transform ${mounted ? 'opacity-100' : 'opacity-0'}`}>

        {/* --- LADO IZQUIERDO: Branding inmersivo --- */}
        <div className="hidden lg:flex lg:w-[55%] xl:w-[60%] flex-col px-12 xl:px-24 py-16 justify-between relative isolate border-r border-white/[0.05] bg-black/10 backdrop-blur-[2px]">
          
          <div className="flex w-full justify-between items-start">
            <img src={medicrmlogo} alt="Logo" className={`${CUSTOM_CONFIG.logoWidth} h-auto object-contain brightness-0 invert opacity-90 drop-shadow-2xl`} />
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 text-blue-300 text-xs font-bold tracking-widest uppercase shadow-[0_0_20px_rgba(59,130,246,0.15)] backdrop-blur-md">
              <Sparkles className="w-4 h-4" /> Premium Access
            </div>
          </div>

          <div className="flex flex-col max-w-2xl mt-auto mb-20 z-10">
            <div className="mb-8 inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-blue-500/30 text-blue-400 backdrop-blur-md">
              <Hexagon className="w-7 h-7" />
            </div>

            <h1 className="text-5xl xl:text-6xl 2xl:text-7xl font-black tracking-tight text-white mb-6 leading-[1.1] drop-shadow-xl">
              El control de tu clínica, <br/>
              <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-400 via-cyan-300 to-white">
                absolutamente perfecto.
              </span>
            </h1>
            <p className="text-lg xl:text-xl text-blue-100/70 leading-relaxed font-light">
              {CUSTOM_CONFIG.subtitle} Una interfaz inmersiva diseñada específicamente para maximizar la eficiencia y seguridad médica.
            </p>
            
            <div className="mt-14 flex items-center gap-6 text-sm font-medium">
              <div className="flex -space-x-4">
                <div className="w-10 h-10 rounded-full border-2 border-[#090e17] bg-slate-300/[0.9]"></div>
                <div className="w-10 h-10 rounded-full border-2 border-[#090e17] bg-blue-400/[0.9]"></div>
                <div className="w-10 h-10 rounded-full border-2 border-[#090e17] bg-cyan-600/[0.9] flex items-center justify-center text-[10px] text-white backdrop-blur-md">+2k</div>
              </div>
              <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl backdrop-blur-md">
                <div className="text-white font-semibold flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                  Sistema Activo
                </div>
                <div className="text-slate-400 text-xs mt-0.5">Operaciones seguras en curso</div>
              </div>
            </div>
          </div>
        </div>

        {/* --- LADO DERECHO: Formulario (Glassmorphism sutil integrado al entorno) --- */}
        <div className="w-full lg:w-[45%] xl:w-[40%] flex flex-col justify-center px-8 sm:px-16 xl:px-24 relative z-20 bg-black/[0.45] backdrop-blur-[20px] shadow-[-30px_0_50px_rgba(0,0,0,0.5)]">
          
          <div className="w-full max-w-[420px] mx-auto">
            
            {/* Logo Mobile */}
            <div className="lg:hidden w-full flex justify-start mb-12">
              <img src={medicrmlogo} alt="Logo" className="w-48 h-auto object-contain brightness-0 invert opacity-90 drop-shadow-xl" />
            </div>

            <div className="mb-10 text-left">
              <h2 className="text-3xl xl:text-4xl font-bold text-white tracking-tight leading-tight">Bienvenido</h2>
              <p className="text-slate-400 mt-2 text-sm xl:text-base font-medium">Accede a tu cuenta de {CUSTOM_CONFIG.crmName}</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              
              {error && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium backdrop-blur-md">
                  <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Input en su máxima pureza material glass */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Correo de Acceso</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-12 pr-4 py-4 bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 rounded-2xl text-white placeholder-slate-500 focus:bg-white/[0.08] focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all text-sm font-medium backdrop-blur-md"
                    placeholder="doctor@clinica.com"
                    required
                  />
                </div>
              </div>

              {/* Contraseña */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Clave de Seguridad</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-cyan-400 transition-colors">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-12 pr-12 py-4 bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 rounded-2xl text-white placeholder-slate-500 focus:bg-white/[0.08] focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all text-sm font-medium backdrop-blur-md"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-white transition-colors focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Controles extra */}
              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${rememberMe ? 'bg-blue-600 border-blue-600 shadow-[0_0_12px_rgba(37,99,235,0.5)]' : 'bg-transparent border-slate-500 group-hover:border-slate-300'}`}>
                    {rememberMe && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                  </div>
                  <span className="text-sm text-slate-400 font-medium group-hover:text-white transition-colors">
                    Sesión contínua
                  </span>
                </label>
                <a href="/recuperar" className="text-sm text-blue-400 font-bold hover:text-blue-300 transition-colors">
                  ¿Olvidaste la clave?
                </a>
              </div>

              {/* Bóton inmersivo masivo */}
              <button
                type="submit"
                disabled={loading}
                className="mt-8 w-full relative group overflow-hidden bg-white text-black rounded-2xl py-4 font-bold tracking-wide transition-all duration-300 hover:bg-slate-200 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-[0_0_30px_rgba(255,255,255,0.1)]"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {loading ? 'Verificando...' : 'Autorizar Acceso'}
                  {!loading && <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" strokeWidth={2.5} />}
                </span>
              </button>
            </form>

            <div className="mt-12 text-left text-sm font-medium text-slate-500">
              <p>
                ¿Requiere sistema en su clínica? <br/>
                <a href="/register" className="text-white font-bold hover:text-slate-300 transition-colors decoration-2 hover:underline underline-offset-4 mt-1 inline-block">
                   Contactar administración
                </a>
              </p>
            </div>
            
          </div>
        </div>
      </div>
      
    </div>
  );
};

export default Login;