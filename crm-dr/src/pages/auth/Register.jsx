import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AnimatedGridBackground from '../../components/ui/AnimatedGridBackground';
import updmLogo from '../../assets/medicrmlogo.png';
import { Mail, Lock, Check, Eye, EyeOff, ShieldCheck, ArrowRight, User, Phone } from 'lucide-react';

// URL DEL BACKEND (Ajústala si pruebas en local)
import API_URL from '../../config/api';
// const API_URL = 'http://localhost:4000'; 

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
    const [modoCrm, setModoCrm] = useState('individual');

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
            setError('Debes aceptar los términos para continuar');
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
                    modo_crm: modoCrm
                }),
            });

            const data = await response.json();

            if (response.ok) {
                // Login exitoso
                const userData = data.usuario || data.user;
                sessionStorage.setItem('user', JSON.stringify(userData));
                // Redirigimos a la nueva app genérica
                navigate('/app');
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
        if (strength <= 3) return { level: 2, text: 'Media', color: 'bg-amber-500' };
        return { level: 3, text: 'Fuerte', color: 'bg-emerald-500' };
    };

    const passwordStrength = getPasswordStrength();

    return (
        <AnimatedGridBackground mode="light">
            <div className="relative flex min-h-screen items-center justify-center font-sans">

                {/* Decorative Elements */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute -top-[10%] -left-[10%] h-[500px] w-[500px] rounded-full bg-blue-300/20 blur-[100px]" />
                    <div className="absolute bottom-[0%] right-[0%] h-[600px] w-[600px] rounded-full bg-slate-300/30 blur-[120px]" />
                </div>

                {/* Main Fullscreen Container */}
                <div className="relative z-10 w-full min-h-screen flex flex-col lg:flex-row bg-white/70 backdrop-blur-2xl">
                    <div className="flex flex-col lg:flex-row w-full">

                        {/* Left Branding Panel */}
                        <div className="relative hidden lg:flex flex-col w-1/2 p-10 xl:p-16 bg-linear-to-br from-blue-950 via-blue-900 to-slate-900 text-white overflow-hidden shadow-2xl z-20 pt-16">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                            <div className="absolute bottom-0 left-0 w-80 h-80 bg-slate-400/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4"></div>

                            <div className="relative z-10">
                                <div className="mt-8 xl:mt-12 flex justify-start w-full">
                                    <img src={updmLogo} alt="CRM DR" className="w-[90%] max-w-md xl:max-w-xl h-auto drop-shadow-[0_20px_50px_rgba(0,0,0,0.3)] object-contain" />
                                </div>
                            </div>

                            <div className="relative z-10 mt-16 pb-12">
                                <h1 className="text-3xl font-black leading-tight tracking-tight text-white drop-shadow-md">
                                    Únete ahora a <br />
                                    <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-300 to-slate-200">CRM DR</span>
                                </h1>
                                <p className="mt-6 text-blue-100/80 leading-relaxed font-medium text-sm">
                                    Configura tu espacio de trabajo y obtén acceso total a todas las herramientas que necesitas para crecer.
                                </p>

                                <ul className="mt-8 space-y-4">
                                    <li className="flex items-center gap-3 text-sm text-blue-100/90 font-medium">
                                        <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-400/30">
                                            <ShieldCheck className="w-3.5 h-3.5 text-blue-300" />
                                        </div>
                                        Encriptación Avanzada
                                    </li>
                                    <li className="flex items-center gap-3 text-sm text-blue-100/90 font-medium">
                                        <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-400/30">
                                            <ShieldCheck className="w-3.5 h-3.5 text-blue-300" />
                                        </div>
                                        Escalabilidad Infinita
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Right Register Panel */}
                        <div className="w-full lg:w-1/2 p-6 sm:p-10 lg:p-12 xl:p-16 flex flex-col h-screen overflow-y-auto lg:overflow-hidden bg-transparent relative z-10 transition-all justify-center">

                            {/* Mobile Logo Visibility */}
                            <div className="lg:hidden flex justify-center w-full mb-8 shrink-0 px-4">
                                <img src={updmLogo} alt="CRM DR" className="w-[70%] max-w-[280px] h-auto object-contain drop-shadow-xl" />
                            </div>

                            <div className="w-full">
                                <h2 className="text-2xl xl:text-3xl font-black text-slate-900 tracking-tight">Crea tu cuenta</h2>
                                <p className="mt-1 xl:mt-2 text-xs xl:text-sm text-slate-500 font-medium">Rellena el formulario con tus datos para registrarte.</p>

                                <form onSubmit={handleRegister} className="mt-4 xl:mt-8 space-y-4 xl:space-y-6">

                                    {error && (
                                        <div className="flex items-start gap-3 p-4 bg-red-50/80 border border-red-100 rounded-2xl text-red-600 text-sm font-medium animate-in fade-in slide-in-from-top-2">
                                            <ShieldCheck className="w-5 h-5 shrink-0 text-red-500" />
                                            <span>{error}</span>
                                        </div>
                                    )}

                                    {/* CRM Mode Selection */}
                                    <div className="space-y-1.5 mb-4">
                                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Modalidad de Uso</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setModoCrm('individual')}
                                                className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${
                                                    modoCrm === 'individual'
                                                        ? 'border-blue-600 bg-blue-50/50'
                                                        : 'border-slate-200 hover:border-blue-300'
                                                }`}
                                            >
                                                <User className={`w-6 h-6 mb-1 ${modoCrm === 'individual' ? 'text-blue-600' : 'text-slate-400'}`} />
                                                <span className={`text-sm font-bold ${modoCrm === 'individual' ? 'text-blue-700' : 'text-slate-600'}`}>Uso Individual</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setModoCrm('cooperativo')}
                                                className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${
                                                    modoCrm === 'cooperativo'
                                                        ? 'border-blue-600 bg-blue-50/50'
                                                        : 'border-slate-200 hover:border-blue-300'
                                                }`}
                                            >
                                                <div className="flex mb-1">
                                                    <User className={`w-5 h-5 -mr-2 ${modoCrm === 'cooperativo' ? 'text-blue-600' : 'text-slate-400'}`} />
                                                    <User className={`w-5 h-5 ${modoCrm === 'cooperativo' ? 'text-blue-500' : 'text-slate-300'}`} />
                                                </div>
                                                <span className={`text-sm font-bold ${modoCrm === 'cooperativo' ? 'text-blue-700' : 'text-slate-600'}`}>Uso Cooperativo</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                        {/* Left Column Fields */}
                                        <div className="space-y-3 xl:space-y-5">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Nombre Completo</label>
                                                <div className="relative group">
                                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                                        <User className="w-5 h-5" />
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={name}
                                                        onChange={(e) => setName(e.target.value)}
                                                        className="block w-full pl-12 pr-4 py-3.5 bg-white/80 border border-slate-200/80 rounded-2xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-500 transition-all font-medium shadow-sm"
                                                        placeholder="Juan Pérez"
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Nombre de Usuario *</label>
                                                <div className="relative group">
                                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                                        <User className="w-5 h-5" />
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={username}
                                                        onChange={(e) => setUsername(e.target.value)}
                                                        className="block w-full pl-12 pr-4 py-3.5 bg-white/80 border border-slate-200/80 rounded-2xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-500 transition-all font-medium shadow-sm"
                                                        placeholder="juanp"
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Email *</label>
                                                <div className="relative group">
                                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                                        <Mail className="w-5 h-5" />
                                                    </div>
                                                    <input
                                                        type="email"
                                                        value={email}
                                                        onChange={(e) => setEmail(e.target.value)}
                                                        className="block w-full pl-12 pr-4 py-3.5 bg-white/80 border border-slate-200/80 rounded-2xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-500 transition-all font-medium shadow-sm"
                                                        placeholder="juan@ejemplo.com"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Column Fields */}
                                        <div className="space-y-3 xl:space-y-5">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Teléfono</label>
                                                <div className="relative group">
                                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                                        <Phone className="w-5 h-5" />
                                                    </div>
                                                    <input
                                                        type="tel"
                                                        value={phone}
                                                        onChange={(e) => setPhone(e.target.value)}
                                                        className="block w-full pl-12 pr-4 py-3.5 bg-white/80 border border-slate-200/80 rounded-2xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-500 transition-all font-medium shadow-sm"
                                                        placeholder="123 456 7890"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="flex justify-between items-center ml-1">
                                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Contraseña</span>
                                                </label>
                                                <div className="relative group">
                                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                                        <Lock className="w-5 h-5" />
                                                    </div>
                                                    <input
                                                        type={showPassword ? 'text' : 'password'}
                                                        value={password}
                                                        onChange={(e) => setPassword(e.target.value)}
                                                        className="block w-full pl-12 pr-12 py-2.5 xl:py-3 bg-white/80 border border-slate-200/80 rounded-2xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-500 transition-all font-medium shadow-sm"
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
                                                {/* Password Strength Indicator */}
                                                {password && (
                                                    <div className="mt-2 pl-1">
                                                        <div className="flex gap-1 mb-1.5">
                                                            {[1, 2, 3].map((level) => (
                                                                <div
                                                                    key={level}
                                                                    className={`h-1 flex-1 rounded-full transition-all duration-300 ${level <= passwordStrength.level ? passwordStrength.color : 'bg-slate-200'}`}
                                                                ></div>
                                                            ))}
                                                        </div>
                                                        <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                                                            Fortaleza: <span className={`${passwordStrength.color.replace('bg-', 'text-')}`}>{passwordStrength.text}</span>
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Confirmar Contraseña</label>
                                                <div className="relative group">
                                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                                        <Lock className="w-5 h-5" />
                                                    </div>
                                                    <input
                                                        type={showConfirm ? 'text' : 'password'}
                                                        value={confirmPassword}
                                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                                        className={`block w-full pl-12 pr-12 py-2.5 xl:py-3 bg-white/80 border rounded-2xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-4 transition-all font-medium shadow-sm ${confirmPassword && password !== confirmPassword
                                                            ? 'border-red-400 focus:border-red-500 focus:ring-red-400/20'
                                                            : 'border-slate-200/80 focus:border-blue-500 focus:ring-blue-600/10'
                                                            }`}
                                                        placeholder="••••••••"
                                                        required
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowConfirm(!showConfirm)}
                                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-blue-600 transition-colors"
                                                    >
                                                        {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Area */}
                                    <div className="pt-2 xl:pt-4 space-y-4 xl:space-y-6">
                                        <label className="flex items-start gap-3 cursor-pointer group">
                                            <div className={`mt-0.5 w-5 h-5 shrink-0 rounded-md border flex items-center justify-center transition-all ${acceptTerms ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300 group-hover:border-blue-400'}`}>
                                                {acceptTerms && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={acceptTerms}
                                                onChange={(e) => setAcceptTerms(e.target.checked)}
                                                className="hidden"
                                            />
                                            <span className="text-slate-600 text-sm font-medium group-hover:text-slate-900 transition-colors">
                                                He leído y acepto los <a href="#" className="text-blue-600 hover:underline">términos de servicio</a> y la <a href="#" className="text-blue-600 hover:underline">política de privacidad</a>.
                                            </span>
                                        </label>

                                        <button
                                            type="submit"
                                            disabled={loading || !acceptTerms}
                                            className="w-full relative group overflow-hidden bg-blue-950 text-white rounded-2xl py-3 xl:py-4 font-bold tracking-wide transition-all duration-300 hover:shadow-[0_10px_20px_-10px_rgba(23,37,84,0.6)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-none"
                                        >
                                            <div className="absolute inset-0 bg-linear-to-r from-blue-900 to-blue-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                                            <span className="relative flex items-center justify-center gap-2">
                                                {loading ? 'Procesando registro...' : 'Crear Cuenta'}
                                                {!loading && <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />}
                                            </span>
                                        </button>
                                    </div>
                                </form>

                                <div className="mt-4 xl:mt-6 text-center pt-4 xl:pt-6 border-t border-slate-200/60">
                                    <p className="text-slate-500 text-sm font-medium">
                                        ¿Ya tienes una cuenta?{' '}
                                        <a href="/" className="text-blue-600 font-bold hover:text-blue-800 hover:underline decoration-2 underline-offset-4 transition-all">
                                            Inicia Sesión aquí
                                        </a>
                                    </p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </AnimatedGridBackground>
    );
};

export default Register;