import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AnimatedGridBackground from '../../components/ui/AnimatedGridBackground';



import { Sparkles, ShieldCheck, Mail, Lock, User, Phone } from 'lucide-react';

// URL DEL BACKEND
import API_URL from '../../config/api';

const Register = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [rol, setRol] = useState('prospector');

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');

        // Validación de contraseñas
        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        if (!username.trim()) {
            setError('El nombre de usuario es requerido');
            return;
        }

        if (username.length < 3) {
            setError('El nombre de usuario debe tener al menos 3 caracteres');
            return;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            setError('El usuario solo puede contener letras, números y guiones bajos');
            return;
        }

        if (!email.trim()) {
            setError('El email es requerido');
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError('El email no es valido');
            return;
        }

        if (!acceptTerms) {
            setError('Debes aceptar los terminos para continuar');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(`${API_URL}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    usuario: username,
                    contraseña: password,
                    nombre: name,
                    telefono: phone,
                    email,
                    rol
                }),
            });

            const data = await response.json();

            if (response.ok) {
                // Login exitoso
                const userData = data.usuario || data.user;
                sessionStorage.setItem('user', JSON.stringify(userData));

                // Redirigimos según el rol
                const { rol } = userData;
                switch (rol) {
                    case 'prospector': navigate('/prospector'); break;
                    case 'closer': navigate('/closer'); break;
                    case 'vendedor': navigate('/vendedor'); break;
                    case 'usuario': navigate('/usuario'); break;
                    default: navigate('/'); break;
                }
            } else {
                setError(data.mensaje || data.message || 'Error al registrar usuario');
            }
        } catch (err) {
            console.error('Error:', err);
            setError('No hay conexión con el servidor ⚠️');
        } finally {
            setLoading(false);
        }
    };

    // Calcular fortaleza de contraseña
    const getPasswordStrength = () => {
        if (!password) return { level: 0, text: '', color: '' };

        let strength = 0;
        if (password.length >= 6) strength++;
        if (password.length >= 10) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;

        if (strength <= 1) return { level: 1, text: 'Débil', color: 'bg-red-500' };
        if (strength <= 3) return { level: 2, text: 'Media', color: 'bg-yellow-500' };
        return { level: 3, text: 'Fuerte', color: 'bg-(--theme-500)' };
    };

    const passwordStrength = getPasswordStrength();

    return (
        <div className="min-h-screen w-full flex bg-slate-50 font-['Inter',sans-serif]">
            {/* 🔴 Lado Izquierdo - Panel Decorativo Inmersivo 🔴 */}
            <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden bg-(--theme-900) justify-center items-center">
                <div className="absolute top-0 left-0 w-full h-full bg-linear-to-br from-(--theme-600) via-(--theme-900) to-(--theme-950) opacity-90"></div>
                
                <div className="absolute -top-32 -left-32 w-96 h-96 bg-(--theme-500) rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob"></div>
                <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-(--theme-300) rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
                
                <div className="relative z-10 p-16 max-w-lg text-white">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-8">
                        <Sparkles className="w-4 h-4 text-(--theme-300)" />
                        <span className="text-sm font-medium tracking-wide">Plataforma CRM Premium</span>
                    </div>
                    
                    <h1 className="text-5xl font-black mb-6 leading-tight drop-shadow-md">
                        Únete a la <br/>
                        <span className="text-transparent bg-clip-text bg-linear-to-r from-(--theme-200) to-(--theme-400)">
                            evolución hoy.
                        </span>
                    </h1>
                    
                    <p className="text-(--theme-100) text-lg leading-relaxed mb-4 opacity-90">
                        Crea tu cuenta en segundos y obtén acceso total a nuestro conjunto moderno de herramientas administrativas.
                    </p>
                    
                    <ul className="mt-8 space-y-4 text-(--theme-100) opacity-90 font-medium">
                        <li className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-(--theme-500)/30 border border-(--theme-500)/50 flex items-center justify-center text-(--theme-200) text-xs font-bold">✓</span>
                            Organiza todos tus prospectos
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-(--theme-500)/30 border border-(--theme-500)/50 flex items-center justify-center text-(--theme-200) text-xs font-bold">✓</span>
                            Cierra acuerdos rápidamente
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-(--theme-500)/30 border border-(--theme-500)/50 flex items-center justify-center text-(--theme-200) text-xs font-bold">✓</span>
                            Reportes en tiempo real
                        </li>
                    </ul>
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-linear-to-t from-(--theme-950) to-transparent opacity-80"
                     style={{ backgroundImage: 'radial-gradient(var(--theme-500) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
            </div>

            {/* 🟢 Lado Derecho - Formulario de Registro 🟢 */}
            <div className="w-full lg:w-[55%] flex items-center justify-center p-8 sm:p-12 relative overflow-hidden overflow-y-auto">
                <div className="lg:hidden absolute top-0 right-0 w-72 h-72 bg-(--theme-200) rounded-full mix-blend-multiply blur-3xl opacity-30 animate-blob"></div>
                <div className="lg:hidden absolute bottom-0 left-0 w-72 h-72 bg-(--theme-400) rounded-full mix-blend-multiply blur-3xl opacity-30 animate-blob animation-delay-2000"></div>

                <div className="w-full max-w-2xl relative z-10 m-auto py-8">
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-linear-to-br from-(--theme-500) to-(--theme-700) shadow-xl shadow-(--theme-500)/30 mb-6 transform -rotate-3 transition-transform hover:-rotate-6">
                            <User className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Crear Cuenta</h2>
                        <p className="text-slate-500 mt-2 font-medium">Completa los datos para registrarte en el sistema</p>
                    </div>

                    <form onSubmit={handleRegister} className="space-y-6">
                        {error && (
                            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm shadow-sm animate-pulse-once">
                                <span className="font-bold shrink-0 text-xl">🚫</span>
                                <p className="font-semibold">{error}</p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            {/* Role Selection */}
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 ml-1">
                                    Selecciona tu Rol *
                                </label>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { id: 'prospector', label: 'Prospector', icon: '🔍' },
                                        { id: 'closer', label: 'Closer', icon: '🎯' },
                                        { id: 'vendedor', label: 'Vendedor', icon: '🛡️' }
                                    ].map((role) => (
                                        <button
                                            key={role.id}
                                            type="button"
                                            onClick={() => setRol(role.id)}
                                            className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${
                                                rol === role.id 
                                                ? 'border-(--theme-500) bg-(--theme-50) text-(--theme-700) shadow-sm' 
                                                : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
                                            }`}
                                        >
                                            <span className="text-xl mb-1">{role.icon}</span>
                                            <span className="text-[10px] font-bold uppercase tracking-tight">{role.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* COLUMNA IZQUIERDA: Datos Personales */}
                            <div className="space-y-5">
                                <div className="relative group">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 ml-1 transition-colors group-focus-within:text-(--theme-600)">
                                        Nombre Completo
                                    </label>
                                    <div className="relative flex items-center">
                                        <User className="absolute left-4 w-5 h-5 text-slate-400 group-focus-within:text-(--theme-500) transition-colors" />
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-(--theme-500) focus:ring-4 focus:ring-opacity-10 transition-all shadow-sm shadow-slate-200/50"
                                            placeholder="Ej. Juan Pérez"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="relative group">
                                    <div className="flex justify-between items-baseline mb-1 ml-1">
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 transition-colors group-focus-within:text-(--theme-600)">
                                            Usuario *
                                        </label>
                                        <span className="text-[10px] text-slate-400 font-medium">Sin espacios</span>
                                    </div>
                                    <div className="relative flex items-center">
                                        <ShieldCheck className="absolute left-4 w-5 h-5 text-slate-400 group-focus-within:text-(--theme-500) transition-colors" />
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-(--theme-500) focus:ring-4 focus:ring-opacity-10 transition-all shadow-sm shadow-slate-200/50"
                                            placeholder="juanp"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="relative group">
                                    <div className="flex justify-between items-baseline mb-1 ml-1">
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 transition-colors group-focus-within:text-(--theme-600)">
                                            Correo Electrónico *
                                        </label>
                                    </div>
                                    <div className="relative flex items-center">
                                        <Mail className="absolute left-4 w-5 h-5 text-slate-400 group-focus-within:text-(--theme-500) transition-colors" />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-(--theme-500) focus:ring-4 focus:ring-opacity-10 transition-all shadow-sm shadow-slate-200/50"
                                            placeholder="correo@ejemplo.com"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* COLUMNA DERECHA: Seguridad y Contacto */}
                            <div className="space-y-5">
                                <div className="relative group">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 ml-1 transition-colors group-focus-within:text-(--theme-600)">
                                        Teléfono
                                    </label>
                                    <div className="relative flex items-center">
                                        <Phone className="absolute left-4 w-5 h-5 text-slate-400 group-focus-within:text-(--theme-500) transition-colors" />
                                        <input
                                            type="tel"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-(--theme-500) focus:ring-4 focus:ring-opacity-10 transition-all shadow-sm shadow-slate-200/50"
                                            placeholder="+1 234 567 890"
                                        />
                                    </div>
                                </div>

                                <div className="relative group">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 ml-1 transition-colors group-focus-within:text-(--theme-600)">
                                        Contraseña
                                    </label>
                                    <div className="relative flex items-center">
                                        <Lock className="absolute left-4 w-5 h-5 text-slate-400 group-focus-within:text-(--theme-500) transition-colors" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full pl-12 pr-16 py-3.5 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-(--theme-500) focus:ring-4 focus:ring-opacity-10 transition-all shadow-sm shadow-slate-200/50"
                                            placeholder="••••••••"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 text-xs font-bold text-slate-400 hover:text-(--theme-600) transition-colors"
                                        >
                                            {showPassword ? 'OCULTAR' : 'MOSTRAR'}
                                        </button>
                                    </div>
                                    
                                    {/* Indicador de fortaleza */}
                                    {password && (
                                        <div className="mt-2 ml-1">
                                            <div className="flex gap-1 mb-1">
                                                {[1, 2, 3].map((level) => (
                                                    <div
                                                        key={level}
                                                        className={`h-1 flex-1 rounded-full transition-all ${level <= passwordStrength.level
                                                            ? passwordStrength.color
                                                            : 'bg-slate-200'
                                                            }`}
                                                    ></div>
                                                ))}
                                            </div>
                                            <p className="text-[10px] text-slate-500 font-medium tracking-wide flex justify-between">
                                                Seguridad <span>{passwordStrength.text}</span>
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="relative group">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 ml-1 transition-colors group-focus-within:text-(--theme-600)">
                                        Confirmar Contraseña
                                    </label>
                                    <div className="relative flex items-center">
                                        <Lock className="absolute left-4 w-5 h-5 text-(--theme-300) group-focus-within:text-(--theme-500) transition-colors" />
                                        <input
                                            type={showConfirm ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className={`w-full pl-12 pr-16 py-3.5 bg-white border rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-opacity-10 transition-all shadow-sm shadow-slate-200/50 ${
                                                confirmPassword && password !== confirmPassword 
                                                ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' 
                                                : 'border-slate-200 focus:border-(--theme-500) focus:ring-(--theme-500)'
                                            }`}
                                            placeholder="••••••••"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirm(!showConfirm)}
                                            className="absolute right-4 text-xs font-bold text-slate-400 hover:text-(--theme-600) transition-colors"
                                        >
                                            {showConfirm ? 'OCULTAR' : 'MOSTRAR'}
                                        </button>
                                    </div>
                                    {confirmPassword && password !== confirmPassword && (
                                        <p className="text-xs text-red-500 mt-1.5 ml-1 font-medium">Las contraseñas no coinciden</p>
                                    )}
                                    {confirmPassword && password === confirmPassword && (
                                        <p className="text-xs text-(--theme-600) mt-1.5 ml-1 font-medium flex items-center gap-1">✓ Coinciden</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex flex-col gap-6">
                            <label className="flex items-start gap-3 cursor-pointer group hover:bg-slate-100/50 p-2 rounded-xl transition-colors">
                                <div className="relative flex items-center justify-center mt-0.5 shrink-0">
                                    <input
                                        type="checkbox"
                                        checked={acceptTerms}
                                        onChange={(e) => setAcceptTerms(e.target.checked)}
                                        className="peer sr-only"
                                    />
                                    <div className="w-5 h-5 border-2 border-slate-300 rounded peer-checked:bg-(--theme-500) peer-checked:border-(--theme-500) transition-all"></div>
                                    <svg className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 14 10" fill="none">
                                        <path d="M1 5L4.5 8.5L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                                <span className="text-sm font-medium text-slate-600 group-hover:text-slate-800 transition-colors">
                                    He leído y acepto los <a href="#" className="font-bold text-(--theme-600) hover:underline">términos de servicio</a> y la <a href="#" className="font-bold text-(--theme-600) hover:underline">política de privacidad</a>.
                                </span>
                            </label>

                            <button
                                type="submit"
                                disabled={loading}
                                className="group relative w-full flex items-center justify-center gap-2 bg-linear-to-r from-(--theme-500) to-(--theme-600) text-white py-4 px-8 rounded-2xl font-bold text-lg shadow-xl shadow-(--theme-500)/30 hover:shadow-2xl hover:shadow-(--theme-500)/40 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none transition-all duration-200 overflow-hidden"
                            >
                                <div className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-500 ease-out z-0"></div>
                                <span className="relative z-10">{loading ? 'Validando...' : 'Crear mi Cuenta'}</span>
                            </button>
                        </div>
                    </form>

                    <p className="mt-8 text-center text-sm text-slate-500 font-medium">
                        ¿Ya tienes una cuenta?{' '}
                        <a href="/" className="font-bold text-(--theme-600) hover:text-(--theme-800) hover:underline underline-offset-4 transition-all">
                            Inicia sesión aquí
                        </a>
                    </p>
                </div>
            </div>
            
            {/* Badge Flotante Producción */}
            <div className="fixed bottom-4 right-4 z-50 pointer-events-none hidden md:block">
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

export default Register;
