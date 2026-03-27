import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ArrowDown, Layout, Shield, Check } from 'lucide-react';
import { getUser, saveUser, saveToken } from '../../utils/authUtils';
import API_URL from '../../config/api';
import logosolomycrm from '../../assets/logosolomycrm.png';
import AnimatedGridBackground from '../../components/ui/AnimatedGridBackground';
import Typewriter from 'typewriter-effect';

const MOCK_SCROLL_ITEMS = [
  "Gestión de Pipeline Visual",
  "Sincronización de Agenda",
  "Análisis de Rendimiento",
  "Base Centralizada",
  "Seguimiento en Tiempo Real",
  "Automatización de Tareas",
  "Seguridad de Datos de Cifrado",
  "Reportes Multi-empresa"
];

const ScrollingContent = () => (
  <div className="absolute inset-0 overflow-hidden flex flex-col items-center pointer-events-none" style={{ maskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)' }}>
    <motion.div
      animate={{ y: [0, -800] }}
      transition={{ repeat: Infinity, duration: 30, ease: 'linear' }}
      className="flex flex-col gap-4 w-full px-6 py-4 mt-8"
    >
      {[...MOCK_SCROLL_ITEMS, ...MOCK_SCROLL_ITEMS, ...MOCK_SCROLL_ITEMS].map((item, i) => (
        <div key={i} className="py-4 px-6 rounded-2xl border flex items-center gap-3 bg-white/60 backdrop-blur-md shadow-sm" style={{ borderColor: 'rgba(255,255,255,0.6)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-white shadow-sm" style={{ border: '1px solid var(--theme-200)' }}>
            <Layout size={14} style={{ color: 'var(--theme-500)' }} />
          </div>
          <span className="text-sm font-semibold tracking-wide text-slate-700">{item}</span>
        </div>
      ))}
    </motion.div>
  </div>
);

const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('expired')) {
      setError(params.get('msg') || 'Tu sesión ha expirado. Por favor inicia sesión de nuevo.');
    }
    const user = getUser();
    if (user) {
      const { rol } = user;
      if (rol === 'prospector') navigate('/prospector');
      else if (rol === 'closer') navigate('/closer');
      else if (rol === 'vendedor') navigate('/vendedor');
    }
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
        const { rol } = userData;
        if (rol === 'prospector') navigate('/prospector');
        else if (rol === 'closer') navigate('/closer');
        else if (rol === 'vendedor') navigate('/vendedor');
        else navigate('/');
      } else {
        setError(data.mensaje || data.message || 'Credenciales incorrectas');
      }
    } catch {
      setError('No hay conexión con el servidor ⚠️');
    } finally {
      setLoading(false);
    }
  };

  const inputWrapStyle = (key) => ({
    background: focusedField === key ? 'white' : 'rgba(255,255,255,0.5)',
    border: focusedField === key
      ? '1px solid var(--theme-500)'
      : '1px solid rgba(0,0,0,0.08)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  });

  return (
    <AnimatedGridBackground mode="light">
      <div className="min-h-screen w-full flex flex-col p-2.5 gap-2.5 overflow-x-hidden relative font-sans">

        {/* ────── TOP: NAVBAR (Full Width) ────── */}
        <div className="w-full shrink-0 z-30">
          <div className="flex items-center justify-between gap-6 px-8 py-4 bg-white/80 backdrop-blur-md border border-white/40 rounded-2xl shadow-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-r from-transparent via-(--theme-500)/5 to-transparent opacity-50 pointer-events-none" />
            
            {/* Brand Title & Typewriter */}
            <div className="flex items-center gap-4 relative z-10 shrink-0">
              <strong className="text-xs font-black tracking-[0.25em] uppercase text-slate-900">
                <Typewriter
                  options={{
                    strings: ['solomycrm.com'],
                    autoStart: true, loop: true, delay: 100, deleteSpeed: 50, pauseFor: 30000, cursor: '|'
                  }}
                />
              </strong>
            </div>

            {/* Nav Links - Distributed */}
            <div className="hidden md:flex items-center justify-between flex-1 max-w-5xl ml-12 relative z-10">
              {[
                { name: 'Página web', to: '#' },
                { name: 'Suscripciones', to: '#' },
                { name: 'Contáctanos', to: '#' },
                { name: 'Términos y condiciones de uso', to: '/terminos-y-condiciones' },
                { name: 'Política de privacidad', to: '/politica-de-privacidad' }
              ].map((link) => (
                <Link 
                  key={link.name} 
                  to={link.to} 
                  className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors"
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ────── MIDDLE: CONTENT SPLIT (Hero + Login) ────── */}
        <div className="h-[82vh] flex flex-col lg:flex-row gap-2.5 shrink-0">
          
          {/* Left Hero Content */}
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4 bg-white/40 backdrop-blur-sm border border-white/30 rounded-3xl premium-reflejo overflow-hidden relative">
            <div className="absolute inset-0 bg-linear-to-br from-transparent via-(--theme-500)/5 to-transparent opacity-30 pointer-events-none" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 p-8 max-w-2xl">
              <h1 className="text-4xl md:text-5xl lg:text-7xl font-black tracking-tighter leading-[1.05] mb-6 text-slate-900">
                Gestiona el<br />
                <span className="text-transparent bg-clip-text bg-linear-to-r from-(--theme-500) to-(--theme-800)">
                  éxito hoy.
                </span>
              </h1>
              <p className="text-sm md:text-base font-medium mx-auto leading-relaxed text-slate-600 mb-8 max-w-lg">
                Sincroniza tu equipo, automatiza cierres y escala tu CRM con una infraestructura diseñada para el rendimiento extremo.
              </p>
              <div className="flex items-center justify-center gap-4">
                <div className="px-5 py-2.5 rounded-full bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest shadow-xl">Explorar Capacidades</div>
                <div className="px-5 py-2.5 rounded-full bg-white/80 text-slate-600 text-[10px] font-black uppercase tracking-widest border border-slate-200 shadow-sm">Ver Demo</div>
              </div>
            </motion.div>
          </div>

          {/* Right Login Card */}
          <div className="w-full lg:w-[480px] shrink-0 relative flex h-full">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-(--theme-500)/10 blur-[100px] rounded-full pointer-events-none" />
            
            <motion.div
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              className="w-full h-full bg-white/95 backdrop-blur-2xl border border-white/80 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] flex flex-col overflow-hidden relative z-10"
            >
              <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, black 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

              <div className="flex-1 flex flex-col justify-center px-10 sm:px-14 py-8 relative z-10">
                <div className="flex flex-col items-center mb-10">
                  <div className="w-24 h-24 flex items-center justify-center p-2 mb-4 relative group">
                    <div className="absolute inset-0 bg-(--theme-500)/5 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    <img src={logosolomycrm} alt="SoloMyCRM" className="w-full h-full object-contain relative z-10 drop-shadow-[0_10px_10px_rgba(0,0,0,0.05)] transition-transform duration-500 group-hover:scale-110" />
                  </div>
                  <div className="text-center">
                    <h2 className="text-3xl font-black tracking-tighter text-slate-900 leading-tight">Inicia sesión</h2>
                    <div className="mt-4">
                      <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-sm bg-(--theme-50) text-(--theme-600) border border-(--theme-100)">
                        <Shield size={14} /> Acceso Administrativo
                      </span>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                  <AnimatePresence mode="wait">
                    {error && (
                      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-[11px] font-black uppercase tracking-wider flex items-center gap-3 shadow-sm">
                        <span className="text-lg">⚠</span> {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="space-y-4">
                    <div className="group">
                      <label className="text-[10px] font-black uppercase tracking-widest px-1 text-slate-400 group-focus-within:text-(--theme-500) transition-colors inline-block mb-2">Usuario</label>
                      <div className="relative flex items-center rounded-2xl overflow-hidden bg-slate-50/50 group-hover:bg-slate-50 transition-colors" style={inputWrapStyle('user')}>
                        <Mail size={18} className="absolute left-5 pointer-events-none" style={{ color: focusedField === 'user' ? 'var(--theme-500)' : 'var(--theme-300)' }} />
                        <input type="text" value={username} onChange={e => setUsername(e.target.value)} onFocus={() => setFocusedField('user')} onBlur={() => setFocusedField(null)} required className="w-full bg-transparent pl-14 pr-4 py-4 text-base font-bold outline-none text-slate-800 placeholder-slate-300" placeholder="ej. brayan_admin" />
                      </div>
                    </div>

                    <div className="group">
                      <div className="flex items-center justify-between px-1 mb-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-focus-within:text-(--theme-500) transition-colors">Contraseña</label>
                        <Link to="/recuperar" className="text-[10px] font-bold text-slate-300 hover:text-slate-500 transition-colors">¿Olvidaste tu contraseña?</Link>
                      </div>
                      <div className="relative flex items-center rounded-2xl overflow-hidden bg-slate-50/50 group-hover:bg-slate-50 transition-colors" style={inputWrapStyle('pass')}>
                        <Lock size={18} className="absolute left-5 pointer-events-none" style={{ color: focusedField === 'pass' ? 'var(--theme-500)' : 'var(--theme-300)' }} />
                        <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} onFocus={() => setFocusedField('pass')} onBlur={() => setFocusedField(null)} required className="w-full bg-transparent pl-14 pr-14 py-4 text-base font-bold outline-none text-slate-800 placeholder-slate-300" placeholder="••••••••" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 text-slate-300 hover:text-slate-500 transition-colors bg-white px-2 py-1.5 rounded-lg shadow-sm border border-slate-100">
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 px-1">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative flex items-center justify-center">
                        <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="peer appearance-none w-5 h-5 rounded-md border-2 border-slate-200 transition-all cursor-pointer hover:border-slate-300" style={{ backgroundColor: rememberMe ? 'var(--theme-500)' : 'transparent', borderColor: rememberMe ? 'var(--theme-500)' : '' }} />
                        <Check size={12} strokeWidth={4} className="absolute text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-600 transition-colors">Mantener sesión activa</span>
                    </label>
                  </div>

                  <div className="pt-2">
                    <motion.button
                      type="submit" disabled={loading}
                      whileHover={{ scale: 1.01, translateY: -2 }} whileTap={{ scale: 0.98 }}
                      className="w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest text-white flex items-center justify-center gap-3 transition-all relative overflow-hidden group shadow-lg"
                      style={{
                        background: loading ? 'var(--theme-300)' : 'linear-gradient(to right, var(--theme-500), var(--theme-600))',
                        boxShadow: loading ? 'none' : '0 15px 30px -10px var(--theme-500)60',
                      }}
                    >
                      {!loading && <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />}
                      {loading ? (
                        <div className="flex items-center gap-2 relative z-10">
                          <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          Validando...
                        </div>
                      ) : (
                        <span className="relative z-10 flex items-center gap-2">Ingresar <ArrowRight size={16} /></span>
                      )}
                    </motion.button>
                  </div>
                </form>
              </div>

              <div className="bg-linear-to-b from-slate-50/50 to-slate-100/50 border-t border-slate-100 px-8 py-6 text-center relative z-10">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  ¿No tienes una cuenta? <Link to="/register" className="font-black hover:opacity-70 transition-opacity ml-1" style={{ color: 'var(--theme-600)' }}>Regístrate ahora</Link>
                </p>
              </div>
            </motion.div>
          </div>
        </div>

        {/* ────── BOTTOM: EMPTY SECTION (Full Width) ────── */}
        <div className="w-full h-screen shrink-0 bg-white/40 backdrop-blur-md border border-white/40 rounded-3xl shadow-sm overflow-hidden relative z-20" />

      </div>
    </AnimatedGridBackground>
  );
};

export default Login;

