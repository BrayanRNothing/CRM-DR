import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Phone, Eye, EyeOff, ArrowRight, Shield, TrendingUp, Calendar } from 'lucide-react';
import API_URL from '../../config/api';
import logosolomycrm from '../../assets/logosolomycrm.png';

/* ─── Feature pill ─── */
const FeaturePill = ({ icon: Icon, text, delay }) => (
  <motion.div
    initial={{ opacity: 0, x: -16 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.5, delay, ease: 'easeOut' }}
    className="flex items-center gap-2.5 px-4 py-2 rounded-full border w-fit"
    style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)' }}
  >
    <div className="p-1 rounded-full" style={{ background: 'var(--theme-500)25' }}>
      <Icon size={13} style={{ color: 'var(--theme-300)' }} />
    </div>
    <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.65)' }}>{text}</span>
  </motion.div>
);

const ROLES = [
  { id: 'prospector', label: 'Prospector', emoji: '🔍', desc: 'Generar leads' },
  { id: 'closer', label: 'Closer', emoji: '🎯', desc: 'Cerrar ventas' },
  { id: 'vendedor', label: 'Vendedor', emoji: '🛡️', desc: 'Ciclo completo' },
];

const Register = () => {
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
  const [rol, setRol] = useState('prospector');
  const [focusedField, setFocusedField] = useState(null);

  const getPasswordStrength = () => {
    if (!password) return { level: 0, text: '', color: '' };
    let s = 0;
    if (password.length >= 6) s++;
    if (password.length >= 10) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
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
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return setError('El usuario solo puede contener letras, números y guiones bajos');
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('El email no es válido');
    if (!acceptTerms) return setError('Debes aceptar los términos para continuar');
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: username, contraseña: password, nombre: name, telefono: phone, email, rol }),
      });
      const data = await response.json();
      if (response.ok) {
        const userData = data.usuario || data.user;
        sessionStorage.setItem('user', JSON.stringify(userData));
        const { rol: userRol } = userData;
        if (userRol === 'prospector') navigate('/prospector');
        else if (userRol === 'closer') navigate('/closer');
        else if (userRol === 'vendedor') navigate('/vendedor');
        else navigate('/');
      } else {
        setError(data.mensaje || data.message || 'Error al registrar usuario');
      }
    } catch {
      setError('No hay conexión con el servidor ⚠️');
    } finally {
      setLoading(false);
    }
  };

  /* Estilos base del input */
  const inputWrapStyle = (key, hasError = false) => ({
    background: focusedField === key ? 'var(--theme-950)' : 'rgba(0,0,0,0.25)',
    border: hasError
      ? '1px solid rgba(239,68,68,0.5)'
      : focusedField === key
        ? '1px solid var(--theme-500)'
        : '1px solid rgba(255,255,255,0.09)',
    boxShadow: focusedField === key ? '0 0 0 3px var(--theme-500)20' : 'none',
    borderRadius: '12px',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    position: 'relative',
  });

  const inputCls = "w-full pl-10 pr-4 py-3 bg-transparent text-white text-sm outline-none placeholder-white/20";

  return (
    <div
      className="min-h-dvh w-full flex overflow-hidden relative"
      style={{
        fontFamily: "'Inter', sans-serif",
        background: 'linear-gradient(135deg, var(--theme-950) 0%, color-mix(in srgb, var(--theme-950) 70%, black) 50%, black 100%)',
      }}
    >
      {/* Orbes */}
      <div className="absolute rounded-full pointer-events-none"
        style={{ width: 600, height: 600, top: '-15%', left: '-8%', background: 'var(--theme-700)', opacity: 0.18, filter: 'blur(100px)' }} />
      <div className="absolute rounded-full pointer-events-none"
        style={{ width: 450, height: 450, bottom: '-20%', right: '-5%', background: 'var(--theme-600)', opacity: 0.12, filter: 'blur(90px)' }} />

      {/* Grid */}
      <div className="absolute inset-0" style={{
        backgroundImage: 'linear-gradient(var(--theme-700) 1px, transparent 1px), linear-gradient(90deg, var(--theme-700) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
        opacity: 0.06,
      }} />

      {/* ────── PANEL IZQUIERDO ────── */}
      <div className="hidden lg:flex lg:w-[40%] flex-col justify-between p-12 2xl:p-20 relative z-10 shrink-0">
        {/* Logo */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center p-1.5"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <img src={logosolomycrm} alt="SoloMyCRM" className="w-full h-full object-contain" />
          </div>
          <span className="text-xs font-bold tracking-[0.2em] uppercase" style={{ color: 'var(--theme-300)' }}>SoloMyCRM</span>
        </motion.div>

        <div className="space-y-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <p className="text-xs font-semibold tracking-[0.3em] uppercase mb-4" style={{ color: 'var(--theme-400)' }}>
              Únete a la élite
            </p>
            <h1 className="text-5xl 2xl:text-7xl font-black leading-[1.05] tracking-tighter text-white">
              Crea tu<br />
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(120deg, var(--theme-200), var(--theme-400))' }}>
                cuenta.
              </span>
            </h1>
          </motion.div>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
            className="text-sm leading-relaxed max-w-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Configura tu perfil en minutos y empieza a gestionar prospectos de inmediato.
          </motion.p>

          <div className="flex flex-col gap-2.5">
            <FeaturePill icon={TrendingUp} text="Onboarding inmediato" delay={0.35} />
            <FeaturePill icon={Calendar} text="Agenda lista para citas" delay={0.45} />
            <FeaturePill icon={Shield} text="Seguridad de nivel bancario" delay={0.55} />
          </div>
        </div>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
          className="text-[10px] font-bold tracking-[0.3em] uppercase"
          style={{ color: 'rgba(255,255,255,0.15)' }}>
          solomycrm new account
        </motion.p>
      </div>

      {/* ────── PANEL DERECHO - FORMULARIO ────── */}
      <div className="w-full lg:w-[60%] flex items-center justify-center p-4 sm:p-8 lg:p-10 relative z-10 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-2xl my-auto"
        >
          {/* Glass card */}
          <div className="rounded-3xl p-6 sm:p-8 relative overflow-hidden" style={{
            background: 'linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 40px 80px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.05)',
            backdropFilter: 'blur(24px)',
          }}>
            {/* Línea de brillo */}
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: `linear-gradient(90deg, transparent, var(--theme-400)60, transparent)` }} />

            {/* Header */}
            <div className="text-center mb-5">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 overflow-hidden p-2"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <img src={logosolomycrm} alt="SoloMyCRM" className="w-full h-full object-contain" />
              </div>
              <h2 className="text-xl font-black text-white tracking-tight">Crear Cuenta</h2>
              <p className="text-xs mt-1 font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Completa los datos para registrarte en el sistema
              </p>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className="flex items-center gap-3 p-3 rounded-xl mb-4 text-sm"
                  style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}
                >
                  <span style={{ color: '#f87171' }}>⚠</span>
                  <p className="font-medium" style={{ color: '#fca5a5' }}>{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleRegister}>
              {/* Selección de Rol */}
              <div className="mb-5">
                <label className="block text-[10px] font-bold uppercase tracking-[0.15em] mb-2.5"
                  style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Selecciona tu Rol *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {ROLES.map((role) => {
                    const isActive = rol === role.id;
                    return (
                      <button key={role.id} type="button" onClick={() => setRol(role.id)}
                        className="flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200"
                        style={{
                          background: isActive ? 'var(--theme-900)' : 'rgba(255,255,255,0.03)',
                          border: isActive ? '1px solid var(--theme-500)' : '1px solid rgba(255,255,255,0.08)',
                          boxShadow: isActive ? '0 0 0 2px var(--theme-500)20' : 'none',
                        }}>
                        <span className="text-base mb-0.5">{role.emoji}</span>
                        <span className="text-[10px] font-bold tracking-wide"
                          style={{ color: isActive ? 'var(--theme-300)' : 'rgba(255,255,255,0.4)' }}>
                          {role.label}
                        </span>
                        <span className="text-[8px] mt-0.5" style={{ color: 'rgba(255,255,255,0.2)' }}>{role.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Grid de campos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {/* Nombre */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: 'rgba(255,255,255,0.4)' }}>Nombre Completo</label>
                  <div style={inputWrapStyle('name')}>
                    <User size={14} className="absolute left-3.5 pointer-events-none" style={{ color: 'rgba(255,255,255,0.25)' }} />
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                      onFocus={() => setFocusedField('name')} onBlur={() => setFocusedField(null)}
                      className={inputCls} placeholder="Juan Pérez" />
                  </div>
                </div>

                {/* Usuario */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: 'rgba(255,255,255,0.4)' }}>Usuario *</label>
                    <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.2)' }}>Sin espacios</span>
                  </div>
                  <div style={inputWrapStyle('user')}>
                    <User size={14} className="absolute left-3.5 pointer-events-none" style={{ color: 'rgba(255,255,255,0.25)' }} />
                    <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                      onFocus={() => setFocusedField('user')} onBlur={() => setFocusedField(null)}
                      required className={inputCls} placeholder="juanp" />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: 'rgba(255,255,255,0.4)' }}>Correo *</label>
                  <div style={inputWrapStyle('email')}>
                    <Mail size={14} className="absolute left-3.5 pointer-events-none" style={{ color: 'rgba(255,255,255,0.25)' }} />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)}
                      required className={inputCls} placeholder="correo@ejemplo.com" />
                  </div>
                </div>

                {/* Teléfono */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: 'rgba(255,255,255,0.4)' }}>Teléfono</label>
                  <div style={inputWrapStyle('phone')}>
                    <Phone size={14} className="absolute left-3.5 pointer-events-none" style={{ color: 'rgba(255,255,255,0.25)' }} />
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                      onFocus={() => setFocusedField('phone')} onBlur={() => setFocusedField(null)}
                      className={inputCls} placeholder="+1 234 567 890" />
                  </div>
                </div>

                {/* Contraseña */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: 'rgba(255,255,255,0.4)' }}>Contraseña *</label>
                  <div style={inputWrapStyle('pass')}>
                    <Lock size={14} className="absolute left-3.5 pointer-events-none" style={{ color: 'rgba(255,255,255,0.25)' }} />
                    <input type={showPassword ? 'text' : 'password'} value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField('pass')} onBlur={() => setFocusedField(null)}
                      required className="w-full pl-10 pr-10 py-3 bg-transparent text-white text-sm outline-none placeholder-white/20"
                      placeholder="••••••••" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {password && (
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex gap-1 flex-1">
                        {[1, 2, 3].map((lvl) => (
                          <div key={lvl} className="h-0.5 flex-1 rounded-full transition-all"
                            style={{ background: lvl <= pwStrength.level ? pwStrength.color : 'rgba(255,255,255,0.08)' }} />
                        ))}
                      </div>
                      <span className="text-[9px] font-semibold" style={{ color: pwStrength.color }}>{pwStrength.text}</span>
                    </div>
                  )}
                </div>

                {/* Confirmar contraseña */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: 'rgba(255,255,255,0.4)' }}>Confirmar Contraseña *</label>
                  <div style={inputWrapStyle('confirm', confirmPassword && password !== confirmPassword)}>
                    <Lock size={14} className="absolute left-3.5 pointer-events-none" style={{ color: 'rgba(255,255,255,0.25)' }} />
                    <input type={showConfirm ? 'text' : 'password'} value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onFocus={() => setFocusedField('confirm')} onBlur={() => setFocusedField(null)}
                      required className="w-full pl-10 pr-10 py-3 bg-transparent text-white text-sm outline-none placeholder-white/20"
                      placeholder="••••••••" />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {confirmPassword && (
                    <p className="text-[9px] font-semibold mt-1"
                      style={{ color: password === confirmPassword ? 'var(--theme-400)' : '#ef4444' }}>
                      {password === confirmPassword ? '✓ Las contraseñas coinciden' : '✗ No coinciden'}
                    </p>
                  )}
                </div>
              </div>

              {/* Términos + Submit */}
              <div className="space-y-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <label className="flex items-start gap-2.5 cursor-pointer group">
                  <div className="relative flex items-center justify-center mt-0.5 shrink-0">
                    <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="sr-only" />
                    <div className="rounded transition-all" style={{
                      width: 16, height: 16,
                      background: acceptTerms ? 'var(--theme-500)' : 'rgba(255,255,255,0.06)',
                      border: acceptTerms ? '1px solid var(--theme-500)' : '1px solid rgba(255,255,255,0.15)',
                    }} />
                    {acceptTerms && (
                      <svg className="absolute w-2 h-2 text-white pointer-events-none" viewBox="0 0 14 10" fill="none">
                        <path d="M1 5L4.5 8.5L13 1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    He leído y acepto los{' '}
                    <Link to="/terminos-y-condiciones" className="underline" style={{ color: 'var(--theme-400)' }}>términos de servicio</Link>
                    {' '}y la{' '}
                    <Link to="/politica-de-privacidad" className="underline" style={{ color: 'var(--theme-400)' }}>política de privacidad</Link>
                  </span>
                </label>

                <motion.button type="submit" disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.01 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                  className="relative w-full py-3.5 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2.5"
                  style={{
                    background: loading ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, var(--theme-500), var(--theme-700))',
                    boxShadow: loading ? 'none' : '0 8px 32px var(--theme-700)50, 0 2px 8px rgba(0,0,0,0.3)',
                  }}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Creando cuenta...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">Crear mi Cuenta <ArrowRight size={15} /></span>
                  )}
                </motion.button>

                <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  ¿Ya tienes cuenta?{' '}
                  <a href="/" className="font-bold transition-colors" style={{ color: 'var(--theme-400)' }}>
                    Inicia sesión aquí
                  </a>
                </p>
              </div>
            </form>
          </div>
        </motion.div>
      </div>

      {/* Badge versión */}
      <div className="fixed bottom-4 right-4 z-50 pointer-events-none">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}>
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: 'var(--theme-400)' }} />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: 'var(--theme-500)' }} />
          </span>
          <span className="text-[9px] uppercase tracking-widest font-bold" style={{ color: 'rgba(255,255,255,0.3)' }}>v1.1 Estable</span>
        </div>
      </div>
    </div>
  );
};

export default Register;
