import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AnimatedGridBackground from '../../components/ui/AnimatedGridBackground';
import updmLogo from '../../assets/UPDMLOGO4K.png';


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
                    email
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
        return { level: 3, text: 'Fuerte', color: 'bg-green-500' };
    };

    const passwordStrength = getPasswordStrength();

    return (
        <AnimatedGridBackground mode="light">
            <div className="flex min-h-screen items-center justify-center text-slate-900 px-4 sm:px-6 lg:px-8" style={{ fontFamily: '"Space Grotesk", "Poppins", sans-serif' }}>

                <div className="z-10 w-full max-w-6xl">
                    <div className="grid gap-12 p-4 lg:grid-cols-2 lg:p-8">
                        <div className="flex flex-col justify-center space-y-8 order-last lg:order-first">
                            <div className="p-4">
                                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100/50 bg-emerald-50/50 px-3 py-1 text-xs uppercase tracking-[0.2em] text-emerald-800 font-bold backdrop-blur-sm">
                                    Crea tu cuenta
                                </div>
                                <div className="mt-8 flex items-center">
                                    <img
                                        src={updmLogo}
                                        alt="UPDM"
                                        className="h-32 w-auto drop-shadow-xl"
                                    />
                                </div>
                                <p className="mt-6 text-lg text-slate-800 font-medium leading-relaxed drop-shadow-sm">
                                    Registra tus datos y empieza a gestionar clientes y servicios en minutos.
                                </p>
                            </div>
                            <div className="p-4 text-sm text-emerald-900">
                                <p className="font-bold text-emerald-950 flex items-center gap-2 text-base">
                                    <span className="text-2xl">✨</span> Recomendaciones
                                </p>
                                <ul className="mt-2 space-y-2 text-emerald-900 font-medium">
                                    <li>• Usa una contraseña segura con mayúsculas y números.</li>
                                    <li>• El email es obligatorio para recuperar tu acceso.</li>
                                    <li>• Elige un usuario corto y facil de recordar.</li>
                                </ul>
                            </div>
                        </div>

                        <div className="p-4 lg:p-8 h-fit">
                            <h2 className="text-4xl font-black bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent drop-shadow-sm">Registro</h2>
                            <p className="mt-3 text-base text-slate-700 font-semibold">Completa el formulario para crear tu cuenta.</p>

                            <form onSubmit={handleRegister} className="mt-10 space-y-8">

                                {error && (
                                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center justify-center gap-2 mb-6">
                                        <span>🚫</span> {error}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

                                    {/* COLUMNA IZQUIERDA: Datos Personales */}
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-emerald-700 uppercase mb-2 ml-1">Nombre</label>
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                autoComplete="name"
                                                className="w-full px-4 py-3 bg-white/50 backdrop-blur-sm border border-slate-200/60 rounded-xl text-slate-900 placeholder-slate-500 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 focus:bg-white/80 outline-none transition-all shadow-sm"
                                                placeholder="Nombre completo"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-emerald-700 uppercase mb-2 ml-1">Usuario *</label>
                                            <input
                                                type="text"
                                                value={username}
                                                onChange={(e) => setUsername(e.target.value)}
                                                autoComplete="username"
                                                className="w-full px-4 py-3 bg-white/50 backdrop-blur-sm border border-slate-200/60 rounded-xl text-slate-900 placeholder-slate-500 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 focus:bg-white/80 outline-none transition-all shadow-sm"
                                                placeholder="tu_usuario"
                                                required
                                            />
                                            <p className="text-xs text-slate-500 mt-1 ml-1">Solo letras, numeros y guiones bajos</p>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-emerald-700 uppercase mb-2 ml-1">Email *</label>
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                autoComplete="email"
                                                className="w-full px-4 py-3 bg-white/50 backdrop-blur-sm border border-slate-200/60 rounded-xl text-slate-900 placeholder-slate-500 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 focus:bg-white/80 outline-none transition-all shadow-sm"
                                                placeholder="correo@ejemplo.com"
                                                required
                                            />
                                            <p className="text-xs text-slate-500 mt-1 ml-1">Usaremos este correo para recuperar acceso</p>
                                        </div>
                                    </div>

                                    {/* COLUMNA DERECHA: Seguridad y Contacto */}
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-emerald-700 uppercase mb-2 ml-1">Telefono</label>
                                            <input
                                                type="tel"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                autoComplete="tel"
                                                className="w-full px-4 py-3 bg-white/50 backdrop-blur-sm border border-slate-200/60 rounded-xl text-slate-900 placeholder-slate-500 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 focus:bg-white/80 outline-none transition-all shadow-sm"
                                                placeholder="123 456 7890"
                                            />
                                        </div>

                                        <div className="pb-5">
                                            <label className="block text-xs font-bold text-emerald-700 uppercase mb-2 ml-1">Contraseña</label>
                                            <div className="flex items-center gap-2 rounded-xl border border-slate-200/60 bg-white/50 backdrop-blur-sm px-4 py-3 focus-within:border-emerald-400 focus-within:bg-white/80 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all shadow-sm">
                                                <input
                                                    type={showPassword ? 'text' : 'password'}
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    autoComplete="new-password"
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
                                            {/* Indicador de fortaleza */}
                                            {password && (
                                                <div className="mt-2">
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
                                                    <p className="text-xs text-slate-600">
                                                        Fortaleza: <span className="font-semibold">{passwordStrength.text}</span>
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-emerald-700 uppercase mb-2 ml-1">Confirmar Contraseña</label>
                                            <div className={`flex items-center gap-2 rounded-xl border bg-white/50 backdrop-blur-sm px-4 py-3 focus-within:bg-white/80 focus-within:ring-4 transition-all shadow-sm ${confirmPassword && password !== confirmPassword
                                                ? 'border-red-500 focus-within:ring-red-500/20'
                                                : 'border-slate-200/60 focus-within:ring-emerald-500/10'
                                                }`}
                                            >
                                                <input
                                                    type={showConfirm ? 'text' : 'password'}
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    autoComplete="new-password"
                                                    className="w-full bg-transparent text-slate-900 placeholder-slate-500 outline-none"
                                                    placeholder="••••••••"
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirm((prev) => !prev)}
                                                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-800"
                                                >
                                                    {showConfirm ? 'Ocultar' : 'Mostrar'}
                                                </button>
                                            </div>
                                            {confirmPassword && password !== confirmPassword && (
                                                <p className="text-xs text-red-400 mt-1 ml-1">Las contraseñas no coinciden</p>
                                            )}
                                            {confirmPassword && password === confirmPassword && (
                                                <p className="text-xs text-emerald-600 mt-1 ml-1">✓ Las contraseñas coinciden</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-2">
                                    <label className="flex items-start gap-3 text-sm text-slate-600">
                                        <input
                                            type="checkbox"
                                            checked={acceptTerms}
                                            onChange={(e) => setAcceptTerms(e.target.checked)}
                                            className="mt-0.5 h-4 w-4 rounded border-slate-300 bg-white text-emerald-500 focus:ring-emerald-500/20"
                                        />
                                        <span>
                                            Acepto los terminos y la politica de privacidad.
                                        </span>
                                    </label>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-4 rounded-xl transition-all duration-300 shadow-lg shadow-emerald-500/20 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loading ? 'Validando...' : 'CREAR CUENTA'}
                                    </button>
                                </div>
                            </form>

                            <div className="mt-6 text-center">
                                <p className="text-sm text-slate-600">¿Ya tienes una cuenta? <a href="/" className="text-emerald-700 hover:text-emerald-900 font-semibold hover:underline transition-colors">Iniciar sesion</a></p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AnimatedGridBackground>
    );
};

export default Register;