import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, Lock, User, Phone, Eye, EyeOff,
  ArrowRight, Shield, Check, Layout,
  TrendingUp, Calendar, Zap
} from 'lucide-react';
import { getUser, saveUser, saveToken } from '../../utils/authUtils';
import API_URL from '../../config/api';
import logosolomycrm from '../../assets/logosolomycrm.png';
import AnimatedGridBackground from '../../components/ui/AnimatedGridBackground';
import Typewriter from 'typewriter-effect';
import RegisterMobile from './RegisterMobile';

const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
};

const dynamicTexts = [
  {
    title: "Potencia tu \nequipo.",
    subtitle: "Únete a la plataforma de gestión comercial más avanzada diseñada para el crecimiento acelerado."
  },
  {
    title: "Control total \nde tus ventas.",
    subtitle: "Configura tu cuenta en segundos y empieza a cerrar tratos con visibilidad total."
  },
  {
    title: "Escalabilidad \nsin límites.",
    subtitle: "Nuestra infraestructura crece contigo, asegurando que nunca pierdas una oportunidad."
  }
];

const DynamicHeroText = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % dynamicTexts.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative z-10 w-full max-w-xl">
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -30, filter: 'blur(10px)' }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        >
          <h1 className="text-6xl md:text-7xl lg:text-[100px] font-black tracking-tighter leading-[0.95] mb-6 text-slate-900 whitespace-pre-line">
            {dynamicTexts[index].title.split('\n').map((line, i) => (
              <span key={i} className={i === 1 ? 'text-(--theme-600)' : ''}>
                {line}{i === 0 ? '\n' : ''}
              </span>
            ))}
          </h1>
          <p className="text-lg md:text-xl font-medium leading-relaxed text-slate-500 max-w-lg">
            {dynamicTexts[index].subtitle}
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

const FloatingIcons = () => {
  const icons = [
    (props) => (
      <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M3 7a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" /><path d="M7 3v4h4" /><path d="M9 17l0 4" /><path d="M17 14l0 7" /><path d="M13 13l0 8" /><path d="M21 12l0 9" /></svg>
    ),
    (props) => (
      <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M18 21v-14" /><path d="M9 15l3 -3l3 3" /><path d="M15 10l3 -3l3 3" /><path d="M3 21l18 0" /><path d="M12 21l0 -9" /><path d="M3 6l3 -3l3 3" /><path d="M6 21v-18" /></svg>
    ),
    (props) => (
      <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M18 3a4 4 0 0 1 4 4v8a4 4 0 0 1 -4 4h-4.724l-4.762 2.857a1 1 0 0 1 -1.508 -.743l-.006 -.114v-2h-1a4 4 0 0 1 -3.995 -3.8l-.005 -.2v-8a4 4 0 0 1 4 -4zm-2.8 9.286a1 1 0 0 0 -1.414 .014a2.5 2.5 0 0 1 -3.572 0a1 1 0 0 0 -1.428 1.4a4.5 4.5 0 0 0 6.428 0a1 1 0 0 0 -.014 -1.414m-5.69 -4.286h-.01a1 1 0 1 0 0 2h.01a1 1 0 0 0 0 -2m5 0h-.01a1 1 0 0 0 0 2h.01a1 1 0 0 0 0 -2" /></svg>
    ),
    (props) => (
      <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M16.7 8a3 3 0 0 0 -2.7 -2h-4a3 3 0 0 0 0 6h4a3 3 0 0 1 0 6h-4a3 3 0 0 1 -2.7 -2" /><path d="M12 3v3m0 12v3" /></svg>
    ),
  ];

  const floatingItems = React.useMemo(() => {
    const count = 30;
    return Array.from({ length: count }).map((_, i) => ({
      id: i,
      Icon: icons[i % icons.length],
      x: (i / count) * 100 + (Math.random() * (100 / count) * 0.2),
      duration: 12 + Math.random() * 6,
      delay: Math.random() * -30,
      scale: 0.8 + Math.random() * 0.4,
      opacity: 0.5 + Math.random() * 0.4,
    }));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {floatingItems.map((item) => (
        <motion.div
          key={item.id}
          initial={{ top: "-15%", opacity: item.opacity }}
          animate={{
            top: ["-15%", "115%"],
            opacity: item.opacity,
          }}
          transition={{
            duration: item.duration,
            repeat: Infinity,
            delay: item.delay,
            ease: "linear",
          }}
          style={{
            position: 'absolute',
            left: `${item.x}%`,
            scale: item.scale,
          }}
          className="text-slate-300"
        >
          <item.Icon size={44} />
        </motion.div>
      ))}
    </div>
  );
};

const DEFAULT_ROL = 'vendedor';

const Register = () => {
  const navigate = useNavigate();
  const { width } = useWindowSize();

  // States
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
    if (!acceptTerms) return setError('Debes aceptar los términos para continuar');
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
        setError(data.mensaje || data.message || 'Error al registrar usuario');
      }
    } catch {
      setError('No hay conexión con el servidor ⚠️');
    } finally {
      setLoading(false);
    }
  };

  if (width < 1024) {
    return <RegisterMobile />;
  }

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

            <div className="hidden md:flex items-center justify-between flex-1 max-w-5xl ml-12 relative z-10">
              {[
                { name: 'Página web', to: 'https://solomycrm.com/', isExternal: true },
                { name: 'Contáctanos', to: 'https://www.solomycrm.com/#/contacto', isExternal: true },
                { name: 'Términos y condiciones de uso', to: '/terminos-y-condiciones', targetBlank: true },
                { name: 'Política de privacidad', to: '/politica-de-privacidad', targetBlank: true }
              ].map((link) => (
                link.isExternal ? (
                  <a key={link.name} href={link.to} target="_blank" rel="noopener noreferrer" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors">
                    {link.name}
                  </a>
                ) : (
                  <Link key={link.name} to={link.to} target={link.targetBlank ? "_blank" : undefined} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors">
                    {link.name}
                  </Link>
                )
              ))}
            </div>
          </div>
        </div>

        {/* ────── MIDDLE: CONTENT SPLIT (Hero + Register) ────── */}
        <div className="min-h-[82vh] flex flex-col lg:flex-row gap-2.5 shrink-0">

          {/* Left Hero Content */}
          <div className="flex-1 flex flex-col justify-between text-left p-8 md:p-12 bg-white border border-white/30 rounded-3xl premium-reflejo overflow-hidden relative min-h-[600px]">
            <FloatingIcons />
            <div className="absolute inset-0 bg-linear-to-br from-transparent via-(--theme-500)/5 to-transparent opacity-30 pointer-events-none" />

            <div className="relative z-20 w-full flex justify-between items-start gap-8">
              <DynamicHeroText />
              <div className="absolute -top-4 -right-4 md:-top-6 md:-right-6 hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200/50 bg-white/30 backdrop-blur-sm opacity-60 hover:opacity-100 transition-opacity z-30">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Únete a la V15</span>
              </div>
            </div>

            <div className="relative z-20 w-full grid grid-cols-2 lg:grid-cols-4 gap-6 mt-auto pt-10 border-t border-slate-100">
              {[
                { val: "100%", label: "Seguridad Cloud" },
                { val: "2min", label: "Setup Rápido" },
                { val: "∞", label: "Almacenamiento" },
                { val: "24/7", label: "Soporte VIP" },
              ].map((metric, i) => (
                <div key={i} className="flex flex-col gap-1 border-l border-slate-200/60 pl-4 lg:first:border-l-0 lg:first:pl-0">
                  <span className="text-3xl md:text-4xl font-black text-(--theme-600) tracking-tighter">{metric.val}</span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{metric.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Register Card */}
          <div className="w-full lg:w-[580px] shrink-0 relative flex h-full">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-(--theme-500)/10 blur-[100px] rounded-full pointer-events-none" />

            <motion.div
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              className="w-full h-full bg-white/95 backdrop-blur-2xl border border-white/80 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] flex flex-col overflow-hidden relative z-10"
            >
              <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, black 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

              <div className="flex-1 flex flex-col justify-center px-10 sm:px-14 py-8 relative z-10">
                <div className="flex flex-col items-center mb-8">
                  <div className="w-20 h-20 flex items-center justify-center p-2 mb-4 relative group">
                    <div className="absolute inset-0 bg-(--theme-500)/5 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    <img src={logosolomycrm} alt="SoloMyCRM" className="w-full h-full object-contain relative z-10 drop-shadow-[0_10px_10px_rgba(0,0,0,0.05)] transition-transform duration-500 group-hover:scale-110" />
                  </div>
                  <div className="text-center">
                    <h2 className="text-3xl font-black tracking-tighter text-(--theme-600) leading-tight">Crea tu cuenta</h2>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2">Empieza a escalar hoy mismo</p>
                  </div>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                  <AnimatePresence mode="wait">
                    {error && (
                      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-[11px] font-black uppercase tracking-wider flex items-center gap-3 shadow-sm">
                        <span className="text-lg">⚠</span> {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="group">
                      <label className="text-[10px] font-black uppercase tracking-widest px-1 text-slate-400 mb-2 inline-block">Nombre</label>
                      <div className="relative flex items-center rounded-2xl overflow-hidden" style={inputWrapStyle('name')}>
                        <User size={18} className="absolute left-5 pointer-events-none" style={{ color: focusedField === 'name' ? 'var(--theme-500)' : 'var(--theme-300)' }} />
                        <input type="text" value={name} onChange={e => setName(e.target.value)} onFocus={() => setFocusedField('name')} onBlur={() => setFocusedField(null)} className="w-full bg-transparent pl-14 pr-4 py-3.5 text-sm font-bold outline-none text-slate-800" placeholder="Nombre completo" />
                      </div>
                    </div>

                    <div className="group">
                      <label className="text-[10px] font-black uppercase tracking-widest px-1 text-slate-400 mb-2 inline-block">Usuario</label>
                      <div className="relative flex items-center rounded-2xl overflow-hidden" style={inputWrapStyle('user')}>
                        <Zap size={18} className="absolute left-5 pointer-events-none" style={{ color: focusedField === 'user' ? 'var(--theme-500)' : 'var(--theme-300)' }} />
                        <input type="text" value={username} onChange={e => setUsername(e.target.value)} onFocus={() => setFocusedField('user')} onBlur={() => setFocusedField(null)} required className="w-full bg-transparent pl-14 pr-4 py-3.5 text-sm font-bold outline-none text-slate-800" placeholder="usuario" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="group">
                      <label className="text-[10px] font-black uppercase tracking-widest px-1 text-slate-400 mb-2 inline-block">Email</label>
                      <div className="relative flex items-center rounded-2xl overflow-hidden" style={inputWrapStyle('email')}>
                        <Mail size={18} className="absolute left-5 pointer-events-none" style={{ color: focusedField === 'email' ? 'var(--theme-500)' : 'var(--theme-300)' }} />
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)} required className="w-full bg-transparent pl-14 pr-4 py-3.5 text-sm font-bold outline-none text-slate-800" placeholder="correo@ejemplo.com" />
                      </div>
                    </div>

                    <div className="group">
                      <label className="text-[10px] font-black uppercase tracking-widest px-1 text-slate-400 mb-2 inline-block">Teléfono</label>
                      <div className="relative flex items-center rounded-2xl overflow-hidden" style={inputWrapStyle('phone')}>
                        <Phone size={18} className="absolute left-5 pointer-events-none" style={{ color: focusedField === 'phone' ? 'var(--theme-500)' : 'var(--theme-300)' }} />
                        <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} onFocus={() => setFocusedField('phone')} onBlur={() => setFocusedField(null)} className="w-full bg-transparent pl-14 pr-4 py-3.5 text-sm font-bold outline-none text-slate-800" placeholder="+1 234 567 890" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="group">
                      <label className="text-[10px] font-black uppercase tracking-widest px-1 text-slate-400 mb-2 inline-block">Contraseña</label>
                      <div className="relative flex items-center rounded-2xl overflow-hidden" style={inputWrapStyle('pass')}>
                        <Lock size={18} className="absolute left-5 pointer-events-none" style={{ color: focusedField === 'pass' ? 'var(--theme-500)' : 'var(--theme-300)' }} />
                        <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} onFocus={() => setFocusedField('pass')} onBlur={() => setFocusedField(null)} required className="w-full bg-transparent pl-14 pr-12 py-3.5 text-sm font-bold outline-none text-slate-800" placeholder="••••••" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 text-slate-300 hover:text-slate-500">
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {password && (
                        <div className="flex items-center gap-1 mt-1.5 px-1">
                          {[1, 2, 3].map((lvl) => (
                            <div key={lvl} className="h-1 flex-1 rounded-full transition-all" style={{ background: lvl <= pwStrength.level ? pwStrength.color : 'rgba(0,0,0,0.05)' }} />
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="group">
                      <label className="text-[10px] font-black uppercase tracking-widest px-1 text-slate-400 mb-2 inline-block">Confirmar</label>
                      <div className="relative flex items-center rounded-2xl overflow-hidden" style={inputWrapStyle('confirm')}>
                        <Lock size={18} className="absolute left-5 pointer-events-none" style={{ color: focusedField === 'confirm' ? 'var(--theme-500)' : 'var(--theme-300)' }} />
                        <input type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} onFocus={() => setFocusedField('confirm')} onBlur={() => setFocusedField(null)} required className="w-full bg-transparent pl-14 pr-12 py-3.5 text-sm font-bold outline-none text-slate-800" placeholder="••••••" />
                        <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 text-slate-300 hover:text-slate-500">
                          {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 px-1 pt-2">
                    <label className="flex items-start gap-3 cursor-pointer group mt-1">
                      <div className="relative flex items-center justify-center mt-0.5">
                        <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="peer appearance-none w-5 h-5 rounded-md border-2 border-slate-200 transition-all cursor-pointer" style={{ backgroundColor: acceptTerms ? 'var(--theme-500)' : 'transparent', borderColor: acceptTerms ? 'var(--theme-500)' : '' }} />
                        <Check size={12} strokeWidth={4} className="absolute text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                      </div>
                    </label>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-relaxed">
                      He leído y acepto los <Link to="/terminos-y-condiciones" target="_blank" className="text-(--theme-600) font-black">términos de servicio</Link> y la <Link to="/politica-de-privacidad" target="_blank" className="text-(--theme-600) font-black">política de privacidad</Link>.
                    </span>
                  </div>

                  <div className="pt-4">
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
                          Procesando...
                        </div>
                      ) : (
                        <span className="relative z-10 flex items-center gap-2">Crear mi Cuenta <ArrowRight size={16} /></span>
                      )}
                    </motion.button>
                  </div>
                </form>
              </div>

              <div className="bg-linear-to-b from-slate-50/50 to-slate-100/50 border-t border-slate-100 px-8 py-6 text-center relative z-10">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  ¿Ya tienes una cuenta? <Link to="/" className="font-black hover:opacity-70 transition-opacity ml-1" style={{ color: 'var(--theme-600)' }}>Inicia sesión aquí</Link>
                </p>
              </div>
            </motion.div>
          </div>
        </div>

        {/* ────── BOTTOM: COMING SOON SECTION (Full Width) ────── */}
        <div className="w-full h-screen shrink-0 bg-white border border-white/40 rounded-3xl shadow-sm overflow-hidden relative z-20 flex flex-col items-center justify-center text-center p-8">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, black 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="relative z-10"
          >
            <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.3em] bg-(--theme-50) text-(--theme-600) border border-(--theme-100)">
              Nuevas Capacidades
            </div>
            <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-(--theme-600) mb-6">
              Próximamente.
            </h2>
            <p className="text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
              Estamos construyendo la próxima generación de herramientas analíticas para potenciar tu equipo comercial al máximo nivel.
            </p>

            <div className="mt-12 flex justify-center gap-4">
              <div className="w-1.5 h-1.5 rounded-full bg-(--theme-100)" />
              <div className="w-1.5 h-1.5 rounded-full bg-(--theme-600) animate-pulse" />
              <div className="w-1.5 h-1.5 rounded-full bg-(--theme-100)" />
            </div>
          </motion.div>
        </div>

      </div>
    </AnimatedGridBackground>
  );
};

export default Register;
