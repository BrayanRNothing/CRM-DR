import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Check } from 'lucide-react';
import { getUser, saveUser, saveToken } from '../../utils/authUtils';
import API_URL from '../../config/api';
import logosolomycrm from '../../assets/logosolomycrm.png';

const LoginMobile = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('expired')) {
      setError(params.get('msg') || 'Tu sesión ha expirado. Por favor inicia sesión de nuevo.');
    }
    const user = getUser();
    if (user) {
      // Todos los usuarios van al dashboard de vendedor
      navigate('/vendedor');
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
        // Todos los usuarios van al dashboard de vendedor
        navigate('/vendedor');
      } else {
        setError(data.mensaje || data.message || 'Credenciales incorrectas');
      }
    } catch {
      setError('No hay conexión con el servidor ⚠️');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/demo-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (response.ok) {
        const userData = data.usuario || data.user;
        saveUser(userData, rememberMe);
        if (data.token) saveToken(data.token, rememberMe);
        setShowDemoModal(false);
        navigate('/vendedor');
      } else {
        setError(data.mensaje || data.message || 'Error al crear cuenta demo');
        setShowDemoModal(false);
      }
    } catch {
      setError('No hay conexión con el servidor ⚠️');
      setShowDemoModal(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-dvh w-full flex flex-col relative overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, #ffffff 0%, #f1f5f9 50%, #e8eef7 100%)',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Orbes de fondo */}
      <div className="absolute pointer-events-none"
        style={{ width: 500, height: 500, top: '-20%', right: '-30%', borderRadius: '50%', background: 'var(--theme-400)', opacity: 0.08, filter: 'blur(80px)' }} />
      <div className="absolute pointer-events-none"
        style={{ width: 400, height: 400, bottom: '-15%', left: '-20%', borderRadius: '50%', background: 'var(--theme-500)', opacity: 0.07, filter: 'blur(80px)' }} />

      {/* Grid sutil */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(var(--theme-200) 1px, transparent 1px), linear-gradient(90deg, var(--theme-200) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        opacity: 0.4,
      }} />

      {/* ── Navbar ── */}
      <div className="relative z-10 px-5 pt-safe">
        <div className="flex items-center justify-between py-4 border-b border-slate-200/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white shadow-sm border border-slate-100 p-1.5 flex items-center justify-center">
              <img src={logosolomycrm} alt="SoloMyCRM" className="w-full h-full object-contain" />
            </div>
            <span className="text-[11px] font-black tracking-[0.2em] uppercase text-slate-700">SoloMyCRM</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowDemoModal(true)}
              className="text-[9px] font-black uppercase tracking-widest text-white bg-(--theme-500) hover:bg-(--theme-600) px-2.5 py-1.5 rounded-lg mr-2"
            >
              Demo
            </button>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">En línea</span>
          </div>
        </div>
        {/* Secciones en fila scrollable */}
        <div className="flex items-center gap-5 overflow-x-auto no-scrollbar py-2.5">
          {[
            { name: 'Página web', to: 'https://solomycrm.com/', isExternal: true },
            { name: 'Contáctanos', to: 'https://www.solomycrm.com/#/contacto', isExternal: true },
            { name: 'Términos', to: '/terminos-y-condiciones', targetBlank: true },
            { name: 'Privacidad', to: '/politica-de-privacidad', targetBlank: true }
          ].map((link) => (
            link.isExternal ? (
              <a
                key={link.name}
                href={link.to}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[9px] font-black uppercase tracking-widest text-slate-300 whitespace-nowrap cursor-pointer hover:text-slate-500 transition-colors"
              >
                {link.name}
              </a>
            ) : (
              <Link
                key={link.name}
                to={link.to}
                target={link.targetBlank ? "_blank" : undefined}
                className="text-[9px] font-black uppercase tracking-widest text-slate-300 whitespace-nowrap cursor-pointer hover:text-slate-500 transition-colors"
              >
                {link.name}
              </Link>
            )
          ))}
        </div>
      </div>

      {/* ── Contenido Principal ── */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-5 py-6">

        {/* Hero compacto */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="bg-amber-100/50 border border-amber-200 text-amber-700 text-[10px] font-bold p-3 rounded-xl mb-6 text-center shadow-sm">
            ⚠️ El modo celular aún está en desarrollo. Funciona mejor en PC.
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-slate-900 leading-tight">
            Bienvenido de <br /><span style={{ color: 'var(--theme-600)' }}>vuelta.</span>
          </h1>
        </motion.div>

        {/* Card formulario */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="rounded-3xl p-6 relative overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.9)',
            boxShadow: '0 20px 60px -10px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)',
          }}
        >
          {/* Shimmer superior */}
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, var(--theme-300)80, transparent)' }} />

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2.5 p-3 rounded-xl mb-4 text-xs font-bold text-red-600"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}
              >
                <span>⚠️</span> {error}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Usuario */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 px-0.5">Usuario</label>
              <div className="relative flex items-center rounded-2xl overflow-hidden transition-all"
                style={{
                  background: focusedField === 'user' ? '#ffffff' : 'rgba(248,250,252,0.8)',
                  border: focusedField === 'user' ? '1.5px solid var(--theme-500)' : '1.5px solid rgba(0,0,0,0.07)',
                  boxShadow: focusedField === 'user' ? '0 0 0 3px var(--theme-500)15' : 'none',
                }}>
                <Mail size={16} className="absolute left-4 pointer-events-none transition-colors"
                  style={{ color: focusedField === 'user' ? 'var(--theme-500)' : '#cbd5e1' }} />
                <input
                  type="text" value={username} onChange={e => setUsername(e.target.value)}
                  onFocus={() => setFocusedField('user')} onBlur={() => setFocusedField(null)}
                  required
                  className="w-full bg-transparent pl-11 pr-4 py-3.5 text-sm font-bold outline-none text-slate-800 placeholder-slate-300"
                  placeholder="Tu usuario"
                />
              </div>
            </div>

            {/* Contraseña */}
            <div>
              <div className="flex items-center justify-between mb-1.5 px-0.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contraseña</label>
                <Link to="/recuperar" className="text-[10px] font-bold transition-colors" style={{ color: 'var(--theme-500)' }}>¿Olvidaste?</Link>
              </div>
              <div className="relative flex items-center rounded-2xl overflow-hidden transition-all"
                style={{
                  background: focusedField === 'pass' ? '#ffffff' : 'rgba(248,250,252,0.8)',
                  border: focusedField === 'pass' ? '1.5px solid var(--theme-500)' : '1.5px solid rgba(0,0,0,0.07)',
                  boxShadow: focusedField === 'pass' ? '0 0 0 3px var(--theme-500)15' : 'none',
                }}>
                <Lock size={16} className="absolute left-4 pointer-events-none"
                  style={{ color: focusedField === 'pass' ? 'var(--theme-500)' : '#cbd5e1' }} />
                <input
                  type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('pass')} onBlur={() => setFocusedField(null)}
                  required
                  className="w-full bg-transparent pl-11 pr-12 py-3.5 text-sm font-bold outline-none text-slate-800 placeholder-slate-300"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 p-1.5 rounded-lg text-slate-300 bg-white/80 border border-slate-100">
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Recordar */}
            <label className="flex items-center gap-3 cursor-pointer px-0.5">
              <div className="relative flex items-center justify-center shrink-0">
                <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)}
                  className="peer appearance-none w-5 h-5 rounded-md border-2 border-slate-200 cursor-pointer transition-all"
                  style={{ backgroundColor: rememberMe ? 'var(--theme-500)' : '', borderColor: rememberMe ? 'var(--theme-500)' : '' }} />
                <Check size={11} strokeWidth={3.5} className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mantener sesión activa</span>
            </label>

            {/* Botón */}
            <motion.button
              type="submit" disabled={loading}
              whileTap={{ scale: 0.98 }}
              className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white shadow-lg flex items-center justify-center gap-2 relative overflow-hidden"
              style={{
                background: loading ? 'var(--theme-300)' : 'linear-gradient(135deg, var(--theme-500), var(--theme-600))',
                boxShadow: loading ? 'none' : '0 12px 30px -8px var(--theme-500)60',
              }}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Validando...
                </>
              ) : 'Ingresar'}
            </motion.button>
          </form>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-6"
        >
          {/* Registro temporalmente oculto
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="font-black" style={{ color: 'var(--theme-600)' }}>Regístrate</Link>
          */}
          <div className="text-[8px] text-slate-300 uppercase tracking-[0.2em] font-bold mt-2">Versión Beta</div>
        </motion.p>
      </div>

      <div className="pb-safe" />

      {/* MODAL DE DEMO */}
      <AnimatePresence>
        {showDemoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowDemoModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
                  <Eye size={20} strokeWidth={2.5} />
                </div>
                <h3 className="text-xl font-black tracking-tight text-slate-900 mb-3">
                  Modo de Prueba
                </h3>
                <p className="text-[11px] font-medium text-slate-500 leading-relaxed mb-6">
                  Estás a punto de entrar al modo de prueba de software. Todos los datos insertados, modificados o cualquier acción que realices <strong>no se guardará permanentemente</strong> y la cuenta se perderá al salir.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDemoModal(false)}
                    className="flex-1 px-3 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDemoLogin}
                    disabled={loading}
                    className="flex-1 px-3 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest text-white bg-amber-500 hover:bg-amber-600 transition-colors flex items-center justify-center gap-2"
                  >
                    {loading ? 'Entrando...' : 'Entrar a Demo'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LoginMobile;
