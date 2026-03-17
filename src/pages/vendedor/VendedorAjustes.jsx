import React, { useState, useEffect } from 'react';
import { Settings, User, Bell, Lock, Shield, Monitor, LogOut, Sun, Moon } from 'lucide-react';
import AnimatedGridBackground from '../../components/ui/AnimatedGridBackground';
import Avatar from '../../components/ui/Avatar';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const VendedorAjustes = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState({
        nombre: 'Usuario',
        usuario: 'usuario',
        email: 'usuario@ejemplo.com',
        telefono: '',
        rol: 'usuario',
        activo: true
    });
    const [theme, setTheme] = useState('light');
    const [notifications, setNotifications] = useState({
        email: true,
        tasks: true,
        updates: false
    });

    useEffect(() => {
        const storedUser = localStorage.getItem('usuario');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Error parsing user data", e);
            }
        }
    }, []);

    const handleSaveProfile = (e) => {
        e.preventDefault();
        toast.promise(
            new Promise(resolve => setTimeout(resolve, 800)),
            {
                loading: 'Guardando...',
                success: 'Perfil actualizado',
                error: 'Error',
            }
        );
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        navigate('/');
        window.location.reload();
    };

    const Section = ({ title, icon: Icon, children, className = "" }) => (
        <div className={`bg-white/90 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 shadow-sm ${className}`}>
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                <Icon className="text-slate-400" size={20} />
                {title}
            </h2>
            {children}
        </div>
    );

    return (
        <div className="w-full h-screen overflow-hidden bg-slate-50">
            <AnimatedGridBackground mode={theme} particleCount={40}>
                <div className="h-full w-full overflow-y-auto p-4 md:p-6">
                    {/* Contenedor Full Width */}
                    <div className="max-w-[98%] mx-auto pb-20">

                        {/* Header Full Width */}
                        <div className="flex items-center gap-6 mb-8 bg-white/60 backdrop-blur-md p-6 rounded-2xl border border-white/50 shadow-sm">
                            <Avatar name={user.nombre} size="xl" className="shadow-lg ring-4 ring-white" />
                            <div>
                                <h1 className="text-3xl font-bold text-slate-900">{user.nombre}</h1>
                                <p className="text-slate-500 text-lg flex items-center gap-3">
                                    @{user.usuario}
                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
                                    <span className={`px-3 py-0.5 rounded-full text-sm font-bold uppercase tracking-wide ${user.rol === 'admin' ? 'bg-purple-100 text-purple-700' :
                                            user.rol === 'closer' ? 'bg-blue-100 text-blue-700' :
                                                'bg-teal-100 text-teal-700'
                                        }`}>
                                        {user.rol}
                                    </span>
                                </p>
                            </div>
                            <div className="ml-auto flex items-center gap-4">
                                <button className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-medium transition-colors shadow-sm">
                                    Ver Perfil Público
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-xl hover:bg-red-100 font-medium transition-colors flex items-center gap-2"
                                >
                                    <LogOut size={18} /> Cerrar Sesión
                                </button>
                            </div>
                        </div>

                        {/* Grid Responsivo Full Width */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                            {/* Columna 1: Info Personal */}
                            <form onSubmit={handleSaveProfile} className="lg:col-span-1 h-full">
                                <Section title="Información Personal" icon={User} className="h-full">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 mb-1">Nombre Completo</label>
                                            <input type="text" defaultValue={user.nombre} className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 mb-1">Email</label>
                                            <input type="email" defaultValue={user.email} className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 mb-1">Teléfono</label>
                                            <input type="tel" defaultValue={user.telefono} className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" />
                                        </div>
                                        <div className="pt-4 mt-auto">
                                            <button type="submit" className="w-full px-5 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all">
                                                Guardar Cambios
                                            </button>
                                        </div>
                                    </div>
                                </Section>
                            </form>

                            {/* Columna 2: Seguridad */}
                            <div className="lg:col-span-1 h-full">
                                <Section title="Seguridad & Acceso" icon={Shield} className="h-full">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 mb-1">Contraseña Actual</label>
                                            <input type="password" placeholder="••••••••" className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                                        </div>
                                        <div className="h-px bg-slate-100 my-2"></div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 mb-1">Nueva Contraseña</label>
                                            <input type="password" placeholder="••••••••" className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 mb-1">Confirmar Nueva Contraseña</label>
                                            <input type="password" placeholder="••••••••" className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                                        </div>
                                        <div className="pt-4">
                                            <button className="w-full px-5 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all">
                                                Actualizar Contraseña
                                            </button>
                                        </div>
                                    </div>
                                </Section>
                            </div>

                            {/* Columna 3: Preferencias */}
                            <div className="lg:col-span-1 h-full">
                                <Section title="Preferencias del Sistema" icon={Monitor} className="h-full">
                                    <div className="space-y-4">
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                            <h3 className="font-bold text-slate-700 mb-2">Apariencia</h3>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-lg ${theme === 'light' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                                        {theme === 'light' ? <Sun size={18} /> : <Moon size={18} />}
                                                    </div>
                                                    <span className="text-sm font-medium text-slate-600">Modo Oscuro</span>
                                                </div>
                                                <button
                                                    onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                                                    className={`w-12 h-6 rounded-full relative transition-colors ${theme === 'dark' ? 'bg-indigo-600' : 'bg-slate-300'}`}
                                                >
                                                    <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform shadow-sm ${theme === 'dark' ? 'translate-x-6' : ''}`} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                            <h3 className="font-bold text-slate-700 mb-2">Notificaciones</h3>
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sm font-medium text-slate-600">Email</span>
                                                    </div>
                                                    <button
                                                        onClick={() => setNotifications(prev => ({ ...prev, email: !prev.email }))}
                                                        className={`w-10 h-5 rounded-full relative transition-colors ${notifications.email ? 'bg-green-500' : 'bg-slate-300'}`}
                                                    >
                                                        <div className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform shadow-sm ${notifications.email ? 'translate-x-5' : ''}`} />
                                                    </button>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sm font-medium text-slate-600">Tareas</span>
                                                    </div>
                                                    <button
                                                        onClick={() => setNotifications(prev => ({ ...prev, tasks: !prev.tasks }))}
                                                        className={`w-10 h-5 rounded-full relative transition-colors ${notifications.tasks ? 'bg-green-500' : 'bg-slate-300'}`}
                                                    >
                                                        <div className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform shadow-sm ${notifications.tasks ? 'translate-x-5' : ''}`} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Section>
                            </div>

                        </div>
                    </div>
                </div>
            </AnimatedGridBackground>
        </div>
    );
};

export default VendedorAjustes;
