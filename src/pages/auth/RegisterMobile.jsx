import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Phone, Eye, EyeOff, Shield, Check, ArrowRight, Zap } from 'lucide-react';
import { getUser, saveUser, saveToken } from '../../utils/authUtils';
import API_URL from '../../config/api';
import logosolomycrm from '../../assets/logosolomycrm.png';

const DEFAULT_ROL = 'vendedor';

const RegisterMobile = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  useEffect(() => {
    const user = getUser();
    if (user) navigate('/vendedor');
  }, [navigate]);

  const getPasswordStrength = () => {
    if (!password) return { level: 0, text: '', color: '' };
    let s = 0;
    if (password.length >= 6) s++;
    if (password.length >= 10) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (s <= 1) return { level: 1, text: 'Débil', color: '#ef4444' };
    if (s <= 3) return { level: 2, text: 'Media', color: '#f59e0b' };
    return { level: 3, text: 'Fuerte', color: 'var(--theme-400)' };
  };
  const pwStrength = getPasswordStrength();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) return setError('Las contraseñas no coinciden');
    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres');
    if (!username.trim() || username.length < 3) return setError('El usuario debe tener al menos 3 caracteres');
    if (!acceptTerms) return setError('Debes aceptar los términos');
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: username, contraseña: password, nombre: name, telefono: phone, email, rol: DEFAULT_ROL }),
      });
      const data = await response.json();
      if (response.ok) {
        const userData = data.usuario || data.user;
        saveUser(userData);
        if (data.token) saveToken(data.token);
        navigate('/vendedor');
      } else {
        setError(data.mensaje || data.message || 'Error al registrar');
      }
    } catch {
      setError('Error de conexión ⚠️');
    } finally {
      setLoading(false);
    }
  };

  const fieldStyle = (key, hasError = false) => ({
    background: focusedField === key ? '#ffffff' : 'rgba(248,250,252,0.8)',
    border: hasError
      ? '1.5px solid rgba(239,68,68,0.5)'
      : focusedField === key
        ? '1.5px solid var(--theme-500)'
        : '1.5px solid rgba(0,0,0,0.07)',
    boxShadow: focusedField === key ? '0 0 0 3px var(--theme-500)15' : 'none',
    transition: 'all 0.2s',
  });

  return (
    <div
      className="min-h-dvh w-full flex flex-col relative overflow-x-hidden"
      style={{
        background: 'linear-gradient(160deg, #ffffff 0%, #f1f5f9 50%, #e8eef7 100%)',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Orbes de fondo */}
      <div className="absolute pointer-events-none"
        style={{ width: 500, height: 500, top: '-10%', right: '-30%', borderRadius: '50%', background: 'var(--theme-400)', opacity: 0.08, filter: 'blur(80px)' }} />
      <div className="absolute pointer-events-none"
        style={{ width: 400, height: 400, bottom: '10%', left: '-20%', borderRadius: '50%', background: 'var(--theme-500)', opacity: 0.07, filter: 'blur(80px)' }} />

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
          <Link to="/" className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-700 transition-colors">
            ← Ingresar
          </Link>
        </div>
        <div className="flex items-center gap-5 overflow-x-auto no-scrollbar py-2.5">
          {[
            { name: 'Página web', to: 'https://solomycrm.com/', isExternal: true },
            { name: 'Contáctanos', to: 'https://www.solomycrm.com/#/contacto', isExternal: true },
            { name: 'Términos', to: '/terminos-y-condiciones', targetBlank: true },
            { name: 'Privacidad', to: '/politica-de-privacidad', targetBlank: true }
          ].map((link) => (
            link.isExternal ? (
              <a key={link.name} href={link.to} target="_blank" rel="noopener noreferrer" className="text-[9px] font-black uppercase tracking-widest text-slate-300 whitespace-nowrap cursor-pointer hover:text-slate-500 transition-colors">
                {link.name}
              </a>
            ) : (
              <Link key={link.name} to={link.to} target={link.targetBlank ? "_blank" : undefined} className="text-[9px] font-black uppercase tracking-widest text-slate-300 whitespace-nowrap cursor-pointer hover:text-slate-500 transition-colors">
                {link.name}
              </Link>
            )
          ))}
        </div>
      </div>

      {/* ── Contenido Principal ── */}
      <div className="relative z-10 flex-1 px-5 py-4 overflow-y-auto">

        {/* Hero compacto */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1">Crea tu cuenta gratis</p>
          <h1 className="text-3xl font-black tracking-tighter text-slate-900 leading-tight">
            Únete y empieza <br /><span style={{ color: 'var(--theme-600)' }}>a vender.</span>
          </h1>
        </motion.div>

        {/* Card formulario */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="rounded-3xl p-5 relative overflow-hidden mb-6"
          style={{
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.9)',
            boxShadow: '0 20px 60px -10px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)',
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, var(--theme-300)80, transparent)' }} />

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2.5 p-3 rounded-xl mb-4 text-xs font-bold text-red-600"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}
              >
                <span>⚠️</span> {error}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Nombre completo</label>
                <div className="relative flex items-center rounded-2xl overflow-hidden" style={fieldStyle('name')}>
                  <User size={15} className="absolute left-3.5 pointer-events-none text-slate-300" />
                  <input type="text" value={name} onChange={e => setName(e.target.value)} onFocus={() => setFocusedField('name')} onBlur={() => setFocusedField(null)} className="w-full bg-transparent pl-10 pr-4 py-3.5 text-sm font-bold outline-none text-slate-800 placeholder-slate-300" placeholder="Juan Pérez" />
                </div>
              </div>

              <div className="col-span-2">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Usuario *</label>
                <div className="relative flex items-center rounded-2xl overflow-hidden" style={fieldStyle('user')}>
                  <Zap size={15} className="absolute left-3.5 pointer-events-none text-slate-300" />
                  <input type="text" value={username} onChange={e => setUsername(e.target.value)} onFocus={() => setFocusedField('user')} onBlur={() => setFocusedField(null)} required className="w-full bg-transparent pl-10 pr-4 py-3.5 text-sm font-bold outline-none text-slate-800 placeholder-slate-300" placeholder="id_usuario" />
                </div>
              </div>

              <div className="col-span-2">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Correo *</label>
                <div className="relative flex items-center rounded-2xl overflow-hidden" style={fieldStyle('email')}>
                  <Mail size={15} className="absolute left-3.5 pointer-events-none text-slate-300" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)} required className="w-full bg-transparent pl-10 pr-4 py-3.5 text-sm font-bold outline-none text-slate-800 placeholder-slate-300" placeholder="correo@ejemplo.com" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Contraseña *</label>
                <div className="relative flex items-center rounded-2xl overflow-hidden" style={fieldStyle('pass')}>
                  <Lock size={15} className="absolute left-3.5 pointer-events-none text-slate-300" />
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} onFocus={() => setFocusedField('pass')} onBlur={() => setFocusedField(null)} required className="w-full bg-transparent pl-10 pr-9 py-3.5 text-sm font-bold outline-none text-slate-800 placeholder-slate-300" placeholder="••••••" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 text-slate-300"> {showPassword ? <EyeOff size={14} /> : <Eye size={14} />} </button>
                </div>
                {password && (
                  <div className="flex gap-1 mt-1.5 px-0.5">
                    {[1, 2, 3].map((lvl) => (
                      <div key={lvl} className="h-1 flex-1 rounded-full transition-all" style={{ background: lvl <= pwStrength.level ? pwStrength.color : 'rgba(0,0,0,0.05)' }} />
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Confirmar *</label>
                <div className="relative flex items-center rounded-2xl overflow-hidden" style={fieldStyle('confirm')}>
                  <Lock size={15} className="absolute left-3.5 pointer-events-none text-slate-300" />
                  <input type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} onFocus={() => setFocusedField('confirm')} onBlur={() => setFocusedField(null)} required className="w-full bg-transparent pl-10 pr-9 py-3.5 text-sm font-bold outline-none text-slate-800 placeholder-slate-300" placeholder="••••••" />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 text-slate-300"> {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />} </button>
                </div>
              </div>
            </div>

            <label className="flex items-start gap-3 cursor-pointer py-1">
              <div className="relative flex items-center justify-center mt-0.5 shrink-0">
                <input type="checkbox" checked={acceptTerms} onChange={e => setAcceptTerms(e.target.checked)} className="peer appearance-none w-5 h-5 rounded-md border-2 border-slate-200 transition-all" style={{ backgroundColor: acceptTerms ? 'var(--theme-500)' : '', borderColor: acceptTerms ? 'var(--theme-500)' : '' }} />
                <Check size={11} strokeWidth={3.5} className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none" />
              </div>
              <span className="text-[10px] leading-relaxed text-slate-400 font-bold uppercase tracking-wider">
                Acepto los <Link to="/terminos-y-condiciones" target="_blank" className="text-(--theme-600) font-black">términos</Link> y la <Link to="/politica-de-privacidad" target="_blank" className="text-(--theme-600) font-black">política</Link>.
              </span>
            </label>

            <motion.button
              type="submit" disabled={loading} whileTap={{ scale: 0.98 }}
              className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white shadow-lg flex items-center justify-center gap-2 relative overflow-hidden"
              style={{
                background: loading ? 'var(--theme-300)' : 'linear-gradient(135deg, var(--theme-500), var(--theme-600))',
                boxShadow: loading ? 'none' : '0 12px 30px -8px var(--theme-500)60',
              }}
            >
              {loading ? ( <div className="flex items-center gap-2"> <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Procesando... </div> ) : ( <><ArrowRight size={15} /> Crear mi Cuenta</> )}
            </motion.button>
          </form>
        </motion.div>

        <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest pb-6">
          ¿Ya tienes cuenta? <Link to="/" className="font-black" style={{ color: 'var(--theme-600)' }}>Inicia sesión</Link>
        </p>
      </div>

      <div className="pb-safe" />
    </div>
  );
};

export default RegisterMobile;
