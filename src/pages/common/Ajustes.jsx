import React, { useState, useEffect } from 'react';
import {
    User, Lock, Shield, Monitor, LogOut,
    Link2, Link2Off, CheckCircle2, Mail, Phone,
    AlertCircle, Bell, Save, KeyRound, Palette, Camera
} from 'lucide-react';
import Avatar from '../../components/ui/Avatar';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import API_URL from '../../config/api';
import { getUser, saveUser, getToken } from '../../utils/authUtils';
import useThemeStore, { THEMES } from '../../store/themeStore.js';

const GoogleIcon = ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);

const Toggle = ({ value, onChange }) => (
    <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative shrink-0 w-12 h-6 rounded-full transition-all duration-300 focus:outline-none ${value ? 'bg-linear-to-r from-(--theme-500) to-(--theme-400) shadow-lg shadow-(--theme-500)/30' : 'bg-slate-200'}`}
    >
        <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow-md transition-transform duration-300 ${value ? 'translate-x-6' : ''}`} />
    </button>
);

export default function VendedorAjustes() {
    const navigate = useNavigate();
    const [user, setUser] = useState({ nombre: 'Usuario', usuario: 'usuario', email: '', telefono: '', rol: 'prospector', id: null });
    const [notifs, setNotifs] = useState({ email: true, tasks: true, updates: false });
    const [googleConnected, setGoogleConnected] = useState(false);
    const [googleUser, setGoogleUser] = useState(null);
    const [savingProfile, setSavingProfile] = useState(false);
    const [savingPass, setSavingPass] = useState(false);
    const [profileForm, setProfileForm] = useState({ nombre: '', email: '', telefono: '' });
    const [passForm, setPassForm] = useState({ next: '', confirm: '' });
    const [activeTab, setActiveTab] = useState('perfil');

    // Theme Global State
    const { currentThemeId, setTheme } = useThemeStore();

    useEffect(() => {
        const storedUser = getUser();
        if (storedUser) {
            setUser(storedUser);
            setProfileForm({ nombre: storedUser.nombre || '', email: storedUser.email || '', telefono: storedUser.telefono || '' });
        }
        const gLinked = localStorage.getItem('google_linked');
        if (gLinked === 'true') {
            setGoogleConnected(true);
        }
    }, []);

    const loginGoogle = useGoogleLogin({
        flow: 'auth-code',
        scope: 'openid profile email https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events',
        access_type: 'offline',
        prompt: 'consent',
        include_granted_scopes: false,
        onSuccess: async (codeResponse) => {
            const tid = toast.loading('Vinculando cuenta de Google...');
            try {
                const res = await fetch(`${API_URL}/api/google/save-tokens`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-auth-token': getToken() },
                    body: JSON.stringify({ code: codeResponse.code })
                });
                if (res.ok) {
                    setGoogleConnected(true);
                    localStorage.setItem('google_linked', 'true');
                    toast.success('¡Google vinculado correctamente!', { id: tid });
                } else {
                    toast.error('Ocurrió un error al guardar credenciales.', { id: tid });
                }
            } catch (err) {
                toast.error('Error de red', { id: tid });
            }
        },
        onError: () => toast.error('Error al conectar Google'),
    });

    const handleDisconnectGoogle = () => {
        // En una app real debríamos borrar el token en el backend también
        localStorage.removeItem('google_linked');
        setGoogleConnected(false);
        toast.success('Cuenta Google desvinculada localmente');
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        const userId = user?.id || user?._id;
        if (!userId) return toast.error('No se pudo identificar el usuario');
        setSavingProfile(true);
        try {
            const token = getToken();
            const res = await fetch(`${API_URL}/api/usuarios/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify({ nombre: profileForm.nombre, email: profileForm.email, telefono: profileForm.telefono })
            });
            if (res.ok) {
                const updated = { ...user, ...profileForm };
                saveUser(updated, !!localStorage.getItem('user'));
                setUser(updated);
                toast.success('✅ Perfil actualizado');
            } else toast.error('Error al guardar');
        } catch { toast.error('Error de conexión'); }
        finally { setSavingProfile(false); }
    };

    const handleSavePass = async (e) => {
        e.preventDefault();
        if (passForm.next !== passForm.confirm) return toast.error('Las contraseñas no coinciden');
        if (passForm.next.length < 6) return toast.error('Mínimo 6 caracteres');
        const userId = user?.id || user?._id;
        if (!userId) return toast.error('No se pudo identificar el usuario');
        setSavingPass(true);
        try {
            const token = getToken();
            const res = await fetch(`${API_URL}/api/usuarios/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify({ contraseña: passForm.next })
            });
            if (res.ok) { setPassForm({ next: '', confirm: '' }); toast.success('🔒 Contraseña actualizada'); }
            else toast.error('Error al actualizar');
        } catch { toast.error('Error de conexión'); }
        finally { setSavingPass(false); }
    };

    const handleLogout = () => {
        localStorage.clear();
        sessionStorage.clear();
        navigate('/');
    };

    const roleColors = {
        closer: 'from-(--theme-500) to-(--theme-600)',
        prospector: 'from-(--theme-500) to-(--theme-600)',
    };
    const roleBg = roleColors[user?.rol] || 'from-slate-500 to-slate-600';

    const inp = "w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-(--theme-500)/30 focus:border-(--theme-500) outline-none transition-all text-sm shadow-sm";

    const tabs = [
        { id: 'perfil', label: 'Perfil', icon: User },
        { id: 'seguridad', label: 'Seguridad', icon: KeyRound },
        { id: 'integraciones', label: 'Google', icon: Link2 },
        { id: 'preferencias', label: 'Preferencias', icon: Palette },
    ];

    return (
        <div className="w-full h-screen overflow-hidden bg-slate-50/50">
            <div className="h-full overflow-y-auto">
                <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 pb-32">

                    {/* ═══ HERO HEADER ═══ */}
                    <div className="relative rounded-3xl overflow-hidden mb-8 shadow-xl border border-slate-200/50">
                        {/* Gradient Banner */}
                        <div className={`h-32 sm:h-40 bg-linear-to-br ${roleBg} relative`} />

                        {/* Content below banner */}
                        <div className="bg-white px-5 sm:px-8 pb-5">
                            {/* Avatar overlapping banner */}
                            <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-8 sm:-mt-10">
                                <div className="relative w-fit">
                                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white p-1 shadow-lg ring-4 ring-white flex items-center justify-center">
                                        <div className={`w-full h-full rounded-2xl bg-linear-to-br ${roleBg} flex items-center justify-center text-white text-3xl sm:text-4xl font-black shadow-sm`}>
                                            {String(user?.nombre || 'U').charAt(0).toUpperCase()}
                                        </div>
                                    </div>
                                    {googleConnected && (
                                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md">
                                            <CheckCircle2 className="text-green-500" size={16} fill="currentColor" />
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 pb-0">
                                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">{user?.nombre || 'Usuario'}</h1>
                                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                        <span className="text-slate-400 text-sm">@{user?.usuario || 'usuario'}</span>
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold text-white bg-linear-to-r ${roleBg}`}>
                                            {user?.rol || 'Rol'}
                                        </span>
                                        {googleConnected && (
                                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-600 border border-green-200">
                                                <GoogleIcon size={11} /> Vinculado
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={handleLogout}
                                    className="self-start sm:self-end flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-red-500 bg-red-50 hover:bg-red-100 border border-red-100 transition-all"
                                >
                                    <LogOut size={15} />
                                    <span>Salir</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ═══ TABS ═══ */}
                    <div className="flex gap-1 bg-white p-1.5 rounded-2xl shadow-md border border-slate-200 mb-8 overflow-x-auto max-w-2xl">
                        {tabs.map(({ id, label, icon: Icon }) => (
                            <button
                                key={id}
                                onClick={() => setActiveTab(id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all flex-1 justify-center
                                    ${activeTab === id
                                        ? `bg-linear-to-r ${roleBg} text-white shadow-md`
                                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                            >
                                <Icon size={15} />
                                <span className="hidden sm:inline">{label}</span>
                            </button>
                        ))}
                    </div>

                    {/* ═══ TAB: PERFIL ═══ */}
                    {activeTab === 'perfil' && (
                        <form onSubmit={handleSaveProfile}>
                            <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
                                <div className="" />
                                <div className="p-6 sm:p-8">
                                    <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2.5">
                                        <div className={`p-2 rounded-xl bg-linear-to-br ${roleBg}`}>
                                            <User className="text-white" size={16} />
                                        </div>
                                        Información Personal
                                    </h2>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <div className="sm:col-span-2">
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nombre Completo</label>
                                            <div className="relative">
                                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                                                <input type="text" value={profileForm.nombre}
                                                    onChange={e => setProfileForm(p => ({ ...p, nombre: e.target.value }))}
                                                    className={`${inp} pl-10`} placeholder="Tu nombre completo" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email</label>
                                            <div className="relative">
                                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                                                <input type="email" value={profileForm.email}
                                                    onChange={e => setProfileForm(p => ({ ...p, email: e.target.value }))}
                                                    className={`${inp} pl-10`} placeholder="correo@ejemplo.com" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Teléfono</label>
                                            <div className="relative">
                                                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                                                <input type="tel" value={profileForm.telefono}
                                                    onChange={e => setProfileForm(p => ({ ...p, telefono: e.target.value }))}
                                                    className={`${inp} pl-10`} placeholder="+52 000 000 0000" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-8 flex justify-end">
                                        <button type="submit" disabled={savingProfile}
                                            className={`flex items-center gap-2 px-8 py-3 rounded-xl text-white font-bold text-sm shadow-lg bg-linear-to-r ${roleBg} hover:opacity-90 active:scale-95 transition-all disabled:opacity-50`}>
                                            <Save size={16} />
                                            {savingProfile ? 'Guardando...' : 'Guardar Cambios'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    )}

                    {/* ═══ TAB: SEGURIDAD ═══ */}
                    {activeTab === 'seguridad' && (
                        <form onSubmit={handleSavePass}>
                            <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
                                <div className="" />
                                <div className="p-6 sm:p-8">
                                    <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2.5">
                                        <div className="p-2 rounded-xl bg-linear-to-br from-(--theme-500) to-purple-600">
                                            <Shield className="text-white" size={16} />
                                        </div>
                                        Cambiar Contraseña
                                    </h2>
                                    <div className="max-w-md space-y-5">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nueva Contraseña</label>
                                            <div className="relative">
                                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                                                <input type="password" value={passForm.next}
                                                    onChange={e => setPassForm(p => ({ ...p, next: e.target.value }))}
                                                    className={`${inp} pl-10`} placeholder="Mínimo 6 caracteres" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Confirmar Contraseña</label>
                                            <div className="relative">
                                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                                                <input type="password" value={passForm.confirm}
                                                    onChange={e => setPassForm(p => ({ ...p, confirm: e.target.value }))}
                                                    className={`${inp} pl-10 ${passForm.confirm && passForm.confirm !== passForm.next ? 'border-red-400 ring-2 ring-red-400/20' : ''}`}
                                                    placeholder="Repite la contraseña" />
                                            </div>
                                            {passForm.confirm && passForm.confirm !== passForm.next && (
                                                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                                                    <AlertCircle size={12} /> Las contraseñas no coinciden
                                                </p>
                                            )}
                                        </div>

                                        {/* Password strength indicator */}
                                        {passForm.next && (
                                            <div>
                                                <p className="text-xs text-slate-500 mb-1.5">Fortaleza</p>
                                                <div className="flex gap-1">
                                                    {[6, 10, 14].map((len, i) => (
                                                        <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${passForm.next.length >= len ? ['bg-red-400', 'bg-yellow-400', 'bg-green-500'][i] : 'bg-slate-100'}`} />
                                                    ))}
                                                </div>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    {passForm.next.length < 6 ? 'Muy corta' : passForm.next.length < 10 ? 'Débil' : passForm.next.length < 14 ? 'Buena' : 'Excelente'}
                                                </p>
                                            </div>
                                        )}

                                        <button type="submit" disabled={savingPass}
                                            className="flex items-center gap-2 px-8 py-3 rounded-xl text-white font-bold text-sm shadow-lg bg-linear-to-r from-(--theme-500) to-purple-600 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50">
                                            <KeyRound size={16} />
                                            {savingPass ? 'Actualizando...' : 'Actualizar Contraseña'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    )}

                    {/* ═══ TAB: INTEGRACIONES (Google) ═══ */}
                    {activeTab === 'integraciones' && (
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="" />
                            <div className="p-6 sm:p-8">
                                <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2.5">
                                    <div className="p-2 rounded-xl bg-white border border-slate-200 shadow-sm">
                                        <GoogleIcon size={16} />
                                    </div>
                                    Cuenta Google
                                </h2>

                                {googleConnected ? (
                                    <div className="space-y-4 max-w-md">
                                        <div className="relative p-5 bg-linear-to-br from-green-50 to-(--theme-50) border border-green-200 rounded-2xl overflow-hidden">
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-green-200/30 rounded-full -translate-y-8 translate-x-8" />
                                            <div className="flex items-center gap-4">
                                                {user?.nombre ? (
                                                    <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-md shrink-0 text-xl font-bold text-green-700">
                                                        {String(user?.nombre).charAt(0).toUpperCase()}
                                                    </div>
                                                ) : (
                                                    <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-md shrink-0">
                                                        <GoogleIcon size={28} />
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-green-900 truncate">Vínculo con Calendario Activo</p>
                                                    <p className="text-sm text-green-600 truncate">El sistema puede agendar por ti</p>
                                                </div>
                                                <div className="shrink-0 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm">
                                                    <CheckCircle2 className="text-green-500" size={18} fill="currentColor" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-2.5 p-3 bg-(--theme-50) rounded-xl text-sm text-(--theme-700)">
                                            <span className="mt-0.5">ℹ️</span>
                                            <span>Tu cuenta está vinculada. Puedes acceder a tu Calendario desde el menú principal.</span>
                                        </div>

                                        <button onClick={handleDisconnectGoogle}
                                            className="w-full flex items-center justify-center gap-2 py-3 px-5 bg-white border-2 border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50 hover:border-red-300 active:scale-95 transition-all text-sm">
                                            <Link2Off size={16} />
                                            Desvincular Cuenta Google
                                        </button>
                                    </div>
                                ) : (
                                    <div className="max-w-md">
                                        <div className="text-center py-8 px-4">
                                            <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center">
                                                <GoogleIcon size={36} />
                                            </div>
                                            <h3 className="font-bold text-slate-700 text-lg mb-1">Ninguna cuenta vinculada</h3>
                                            <p className="text-slate-400 text-sm mb-6">Vincula tu Google para usar el Calendario integrado</p>
                                            <button onClick={() => loginGoogle()}
                                                className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-white border-2 border-slate-200 text-slate-700 font-bold rounded-2xl hover:border-(--theme-400) hover:shadow-lg hover:shadow-(--theme-500)/10 active:scale-95 transition-all text-sm">
                                                <GoogleIcon size={20} />
                                                Vincular con Google
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ═══ TAB: PREFERENCIAS ═══ */}
                    {activeTab === 'preferencias' && (
                        <div className="space-y-4">

                            {/* Notificaciones */}
                            <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
                                <div className="" />
                                <div className="p-6 sm:p-8">
                                    <h2 className="text-base font-bold text-slate-800 mb-5 flex items-center gap-2">
                                        <div className="p-2 rounded-xl bg-linear-to-br from-violet-500 to-purple-600">
                                            <Bell className="text-white" size={15} />
                                        </div>
                                        Notificaciones
                                    </h2>
                                    <div className="space-y-3">
                                        {[
                                            { key: 'email', label: 'Por Email', desc: 'Alertas enviadas a tu correo' },
                                            { key: 'tasks', label: 'Tareas', desc: 'Recordatorios de tareas pendientes' },
                                            { key: 'updates', label: 'Actualizaciones', desc: 'Novedades del sistema' },
                                        ].map(({ key, label, desc }) => (
                                            <div key={key} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                <div>
                                                    <p className="font-semibold text-slate-700 text-sm">{label}</p>
                                                    <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                                                </div>
                                                <Toggle value={notifs[key]} onChange={v => setNotifs(p => ({ ...p, [key]: v }))} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Apariencia / Tema */}
                            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                                <div className="p-6 sm:p-8">
                                    <h2 className="text-base font-bold text-slate-800 mb-5 flex items-center gap-2">
                                        <div className="p-2 rounded-xl bg-slate-100 text-slate-600">
                                            <Palette size={15} />
                                        </div>
                                        Apariencia del Sistema
                                    </h2>
                                    <p className="text-sm text-slate-500 mb-4">
                                        Personaliza el color de acento principal del CRM en tu dispositivo.
                                    </p>

                                    <div className="flex flex-wrap gap-4">
                                        {THEMES.map((theme) => {
                                            const isActive = currentThemeId === theme.id;
                                            return (
                                                <button
                                                    type="button"
                                                    key={theme.id}
                                                    onClick={() => setTheme(theme.id)}
                                                    className={`group relative flex items-center gap-3 p-3 pr-5 rounded-2xl border-2 transition-all ${isActive ? 'bg-slate-50 border-slate-300 shadow-sm' : 'border-transparent hover:bg-slate-50'}`}
                                                >
                                                    <div
                                                        className={`w-8 h-8 rounded-full shadow-sm flex items-center justify-center transition-transform ${isActive ? 'scale-110 ring-2 ring-offset-2' : 'group-hover:scale-110'}`}
                                                        style={{ backgroundColor: theme.color, ringColor: theme.color }}
                                                    >
                                                        {isActive && <CheckCircle2 size={16} className="text-white" />}
                                                    </div>
                                                    <span className={`text-sm font-semibold ${isActive ? 'text-slate-900' : 'text-slate-600'}`}>
                                                        {theme.label}
                                                    </span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>

                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
