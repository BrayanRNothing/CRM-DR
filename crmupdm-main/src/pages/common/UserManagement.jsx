import React, { useState, useEffect } from 'react';
import Avatar from '../../components/ui/Avatar';
import toast from 'react-hot-toast';
import API_URL from '../../config/api';
import { getToken } from '../../utils/authUtils';
import { X, User, Phone, Mail, Lock, Shield, Trash2, Edit2, Search, Plus, Calendar, CheckCircle2, XCircle, Eye, EyeOff, Target } from 'lucide-react';

const GoogleIcon = ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);

const inp = 'w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#8bc34a]/20 focus:border-[#8bc34a] outline-none transition-all shadow-sm';

function ModalUsuario({ modoEdicion, formData, setFormData, handleSubmit, cerrarModal }) {
    const isCloser = formData.rol === 'closer';
    const [showPassword, setShowPassword] = useState(false);

    // Theme configuration based on role
    const theme = isCloser ? {
        gradient: 'from-blue-600 to-indigo-600',
        lightBg: 'bg-blue-50/50',
        iconColor: 'text-blue-500',
        ring: 'focus:ring-blue-500',
        button: 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30'
    } : {
        gradient: 'from-[#8bc34a] to-[#4caf50]',
        lightBg: 'bg-green-50/50',
        iconColor: 'text-[#8bc34a]',
        ring: 'focus:ring-[#8bc34a]',
        button: 'bg-[#8bc34a] hover:bg-[#7cb342] shadow-[#8bc34a]/30'
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-black/50 transition-opacity" onClick={cerrarModal} />
            <div className={`relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 flex flex-col max-h-[85vh]`}>

                {/* Dynamic Header */}
                <div className={`flex-none bg-gradient-to-r ${theme.gradient} p-6 sm:p-8 text-white flex justify-between items-start shadow-lg relative overflow-hidden z-10`}>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                {modoEdicion ? <Edit2 size={24} className="text-white" /> : <Plus size={24} className="text-white" />}
                            </div>
                            <h2 className="text-2xl font-black tracking-tight">{modoEdicion ? 'Editar Usuario' : 'Nuevo Miembro'}</h2>
                        </div>
                        <p className="text-white/90 text-sm font-medium pl-1">{modoEdicion ? 'Actualiza los datos del perfil.' : 'Registra un nuevo usuario en el equipo.'}</p>
                    </div>
                    <button onClick={cerrarModal} className="relative z-10 p-2 rounded-full hover:bg-white/20 transition-colors text-white/80 hover:text-white">
                        <X size={24} strokeWidth={2.5} />
                    </button>
                    {/* Decorative circles */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden h-full">
                    <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 scrollbar-thin">

                        {/* Role Selection Cards */}
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 pl-1">Seleccionar Rol</label>
                            <div className="grid grid-cols-2 gap-4">
                                <button type="button"
                                    onClick={() => setFormData(p => ({ ...p, rol: 'prospector' }))}
                                    className={`relative flex flex-col items-center justify-center p-4 border-2 rounded-2xl transition-all duration-300 group ${!isCloser
                                        ? 'border-[#8bc34a] bg-green-50 shadow-md shadow-green-100 scale-[1.02]'
                                        : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50 opacity-60 hover:opacity-100'
                                        }`}>
                                    {formData.rol === 'prospector' && (
                                        <div className="absolute top-3 right-3 text-[#8bc34a]"><CheckCircle2 size={18} fill="#8bc34a" className="text-white" /></div>
                                    )}
                                    <div className={`p-3 rounded-2xl mb-3 transition-colors ${!isCloser ? 'bg-[#8bc34a] text-white shadow-lg shadow-green-200' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                                        <Search size={24} strokeWidth={2.5} />
                                    </div>
                                    <span className={`font-black text-sm tracking-wide ${!isCloser ? 'text-[#8bc34a]' : 'text-slate-500'}`}>PROSPECTOR</span>
                                </button>

                                <button type="button"
                                    onClick={() => setFormData(p => ({ ...p, rol: 'closer' }))}
                                    className={`relative flex flex-col items-center justify-center p-4 border-2 rounded-2xl transition-all duration-300 group ${isCloser
                                        ? 'border-blue-600 bg-blue-50 shadow-md shadow-blue-100 scale-[1.02]'
                                        : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50 opacity-60 hover:opacity-100'
                                        }`}>
                                    {formData.rol === 'closer' && (
                                        <div className="absolute top-3 right-3 text-blue-600"><CheckCircle2 size={18} fill="#2563eb" className="text-white" /></div>
                                    )}
                                    <div className={`p-3 rounded-2xl mb-3 transition-colors ${isCloser ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                                        <Target size={24} strokeWidth={2.5} />
                                    </div>
                                    <span className={`font-black text-sm tracking-wide ${isCloser ? 'text-blue-600' : 'text-slate-500'}`}>CLOSER</span>
                                </button>
                            </div>
                        </div>

                        {/* Inputs Grid */}
                        <div className="grid grid-cols-2 gap-5">
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 pl-1">Información Personal</label>
                                <div className="group relative transition-all">
                                    <User size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${theme.iconColor}`} />
                                    <input type="text" value={formData.nombre}
                                        onChange={e => setFormData(p => ({ ...p, nombre: e.target.value }))}
                                        className={`${inp} pl-12 bg-slate-50 border-transparent focus:bg-white ${theme.ring}`} placeholder="Nombre Completo" required />
                                </div>
                            </div>

                            <div>
                                <div className="group relative transition-all">
                                    <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-bold text-sm transition-colors ${theme.iconColor}`}>@</span>
                                    <input type="text" value={formData.username}
                                        onChange={e => setFormData(p => ({ ...p, username: e.target.value }))}
                                        className={`${inp} pl-10 bg-slate-50 border-transparent focus:bg-white ${theme.ring} ${modoEdicion ? 'text-gray-400 cursor-not-allowed' : ''}`}
                                        placeholder="usuario" required disabled={modoEdicion} />
                                </div>
                            </div>

                            <div>
                                <div className="group relative transition-all">
                                    <Phone size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${theme.iconColor}`} />
                                    <input type="tel" value={formData.telefono}
                                        onChange={e => setFormData(p => ({ ...p, telefono: e.target.value }))}
                                        className={`${inp} pl-12 bg-slate-50 border-transparent focus:bg-white ${theme.ring}`} placeholder="Teléfono" />
                                </div>
                            </div>

                            <div className="col-span-2">
                                <div className="group relative transition-all">
                                    <Mail size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${theme.iconColor}`} />
                                    <input type="email" value={formData.email}
                                        onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                                        className={`${inp} pl-12 bg-slate-50 border-transparent focus:bg-white ${theme.ring}`} placeholder="correo@ejemplo.com" />
                                </div>
                            </div>

                            <div className="col-span-2 pt-2">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 pl-1">
                                    Seguridad {modoEdicion && <span className="normal-case font-medium text-gray-300 ml-1">(Opcional)</span>}
                                </label>
                                <div className="group relative transition-all">
                                    <Lock size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${theme.iconColor}`} />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={formData.password}
                                        onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                                        className={`${inp} pl-12 pr-12 bg-slate-50 border-transparent focus:bg-white ${theme.ring}`}
                                        placeholder={modoEdicion ? '••••••••' : 'Crear contraseña'}
                                        required={!modoEdicion}
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none">
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>
                    {/* Footer Buttons */}
                    <div className="flex-none p-6 sm:p-8 pt-2 border-t border-gray-100 bg-white">
                        <div className="flex gap-3">
                            <button type="button" onClick={cerrarModal}
                                className="px-6 py-3.5 rounded-xl border-2 border-slate-100 text-slate-500 font-bold hover:bg-slate-50 hover:text-slate-700 hover:border-slate-200 transition-all active:scale-95">
                                Cancelar
                            </button>
                            <button type="submit"
                                className={`flex-1 py-3.5 rounded-xl text-white font-bold transition-all active:scale-95 shadow-lg ${theme.button}`}>
                                {modoEdicion ? 'Guardar Cambios' : 'Crear Cuenta'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

function ConfirmarEliminarModal({ visible, nombre, onConfirm, onCancel, loading }) {
    if (!visible) return null;
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white p-6 rounded-2xl shadow-2xl text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">🗑️</div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">¿Eliminar usuario?</h2>
                <p className="text-gray-500 mb-6 text-sm">Se eliminará a <strong className="text-gray-800">{nombre}</strong>. Esta acción no se puede deshacer.</p>
                <div className="flex gap-3">
                    <button onClick={onCancel} disabled={loading} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-colors">Cancelar</button>
                    <button onClick={onConfirm} disabled={loading}
                        className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-600/30 disabled:opacity-60">
                        {loading ? 'Eliminando...' : 'Sí, Eliminar'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function UserManagement({ initialRole }) {
    const [usuarios, setUsuarios] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [modalAbierto, setModalAbierto] = useState(false);
    const [modoEdicion, setModoEdicion] = useState(false);
    const [usuarioEditando, setUsuarioEditando] = useState(null);
    const [formData, setFormData] = useState({ username: '', nombre: '', email: '', telefono: '', password: '', rol: initialRole || 'prospector' });
    const [confirmarEliminar, setConfirmarEliminar] = useState({ visible: false, id: null, nombre: '' });
    const [eliminando, setEliminando] = useState(false);

    const token = () => getToken();

    useEffect(() => { cargarUsuarios(); }, []);
    useEffect(() => {
        if (initialRole) setFormData(p => ({ ...p, rol: initialRole }));
    }, [initialRole]);

    const cargarUsuarios = async () => {
        setCargando(true);
        try {
            const res = await fetch(`${API_URL}/api/usuarios`, {
                headers: { 'x-auth-token': token() }
            });
            if (!res.ok) throw new Error('Error fetching users');
            const data = await res.json();
            setUsuarios(data.filter(u => u.activo !== 0));
        } catch (err) {
            console.error(err);
            toast.error('Error al cargar usuarios');
        } finally {
            setCargando(false);
        }
    };

    const abrirModal = () => {
        setFormData({ username: '', nombre: '', email: '', telefono: '', password: '', rol: initialRole || 'prospector' });
        setModoEdicion(false);
        setUsuarioEditando(null);
        setModalAbierto(true);
    };

    const abrirModalEditar = (u) => {
        setFormData({ username: u.usuario || '', nombre: u.nombre, email: u.email || '', telefono: u.telefono || '', password: '', rol: u.rol });
        setModoEdicion(true);
        setUsuarioEditando(u);
        setModalAbierto(true);
    };

    const cerrarModal = () => {
        setModalAbierto(false);
        setFormData({ username: '', nombre: '', email: '', telefono: '', password: '', rol: initialRole || 'prospector' });
        setModoEdicion(false);
        setUsuarioEditando(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.username || (!formData.password && !modoEdicion)) {
            toast.error('Usuario y contraseña son requeridos');
            return;
        }
        const payload = { nombre: formData.nombre, usuario: formData.username, email: formData.email, telefono: formData.telefono, rol: formData.rol, contraseña: formData.password };
        if (modoEdicion && !formData.password) delete payload.contraseña;
        try {
            const res = await fetch(
                modoEdicion ? `${API_URL}/api/usuarios/${usuarioEditando.id}` : `${API_URL}/api/usuarios`,
                {
                    method: modoEdicion ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-auth-token': token() },
                    body: JSON.stringify(payload)
                }
            );
            const data = await res.json();
            if (res.ok) {
                toast.success(modoEdicion ? '✅ Usuario actualizado' : '✅ Usuario creado');
                cargarUsuarios();
                cerrarModal();
            } else {
                toast.error(data.mensaje || 'Error al guardar');
            }
        } catch (err) {
            toast.error('Error de conexión');
        }
    };

    const handleEliminar = (id, nombre) => setConfirmarEliminar({ visible: true, id, nombre });

    const confirmarEliminarUsuario = async () => {
        if (eliminando) return;
        setEliminando(true);
        const { id, nombre } = confirmarEliminar;
        try {
            const res = await fetch(`${API_URL}/api/usuarios/${id}`, {
                method: 'DELETE',
                headers: { 'x-auth-token': token() }
            });
            if (res.ok) { toast.success(`🗑️ "${nombre}" eliminado`); cargarUsuarios(); }
            else toast.error('Error al eliminar');
        } catch { toast.error('Error de conexión'); }
        finally {
            setEliminando(false);
            setConfirmarEliminar({ visible: false, id: null, nombre: '' });
        }
    };

    const filtered = usuarios.filter(u => {
        const matchRole = initialRole ? u.rol === initialRole : true;
        const q = searchTerm.toLowerCase();
        return matchRole && (u.nombre.toLowerCase().includes(q) || u.usuario?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
    });

    const me = (() => { try { return JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user')); } catch { return null; } })();
    const myGoogleToken = localStorage.getItem('google_access_token');

    const getRoleStyle = (role) => role === 'closer'
        ? { bar: 'from-blue-500 to-indigo-600', badge: 'bg-blue-50 text-blue-700 border-blue-200', label: '🎯 Closer' }
        : { bar: 'from-teal-500 to-emerald-600', badge: 'bg-teal-50 text-teal-700 border-teal-200', label: '🔍 Prospector' };

    return (
        <div className="w-full min-h-full bg-slate-50 p-6 md:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900">Gestión de Usuarios</h1>
                        <p className="text-gray-400 mt-0.5 text-sm">{filtered.length} usuario{filtered.length !== 1 ? 's' : ''}{initialRole ? ` · ${initialRole}` : ''}</p>
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto">
                        <div className="relative flex-1 sm:flex-none">
                            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input type="text" placeholder="Buscar..." value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#8bc34a]/20 focus:border-[#8bc34a] shadow-sm w-full sm:w-56 text-sm transition-all" />
                        </div>
                        <button onClick={abrirModal}
                            className="flex items-center gap-2 px-4 py-2.5 bg-[#8bc34a] hover:bg-[#7cb342] text-white font-bold rounded-xl shadow-lg shadow-[#8bc34a]/30 active:scale-95 transition-all text-sm whitespace-nowrap">
                            <Plus size={18} /> Nuevo Usuario
                        </button>
                    </div>
                </div>

                {/* Cards Grid */}
                {cargando ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="w-10 h-10 border-4 border-[#8bc34a] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center shadow-sm">
                        <div className="text-5xl mb-4">👥</div>
                        <h3 className="text-lg font-bold text-gray-700">Sin usuarios</h3>
                        <p className="text-gray-400 text-sm mt-1">No se encontraron usuarios con estos filtros.</p>
                        <button onClick={abrirModal} className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-[#8bc34a] text-white font-bold rounded-xl text-sm hover:bg-[#7cb342] transition-colors">
                            <Plus size={16} /> Crear primer usuario
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filtered.map(user => {
                            const role = getRoleStyle(user.rol);
                            // Ahora el backend nos manda si tiene Google vinculado (ya sea prospector o closer si lo implementaran, pero enfocado en closer)
                            const hasGoogle = typeof user.googleLinked === 'boolean' ? user.googleLinked : null;
                            return (
                                <div key={user.id} className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                                    {/* Role color bar */}
                                    

                                    <div className="p-5">
                                        {/* Avatar + Name + Actions row */}
                                        <div className="flex items-start gap-3 mb-4">
                                            <Avatar name={user.nombre} size="lg" />
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-gray-900 truncate leading-tight">{user.nombre}</h3>
                                                <p className="text-xs text-gray-400 truncate">@{user.usuario}</p>
                                                <span className={`inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border ${role.badge}`}>
                                                    {role.label}
                                                </span>
                                            </div>
                                            <div className="flex flex-col gap-1.5 flex-shrink-0">
                                                <button onClick={() => abrirModalEditar(user)}
                                                    className="p-1.5 text-blue-500 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                                    title="Editar">
                                                    <Edit2 size={15} />
                                                </button>
                                                <button onClick={() => handleEliminar(user.id, user.nombre)}
                                                    className="p-1.5 text-red-400 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                                                    title="Eliminar">
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Google Calendar status */}
                                        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl mb-3 text-xs font-semibold border
                                            ${hasGoogle === true ? 'bg-green-50 border-green-200 text-green-700' :
                                                hasGoogle === false ? 'bg-orange-50 border-orange-200 text-orange-600' :
                                                    'bg-slate-50 border-slate-200 text-slate-400'}`}>
                                            <GoogleIcon size={14} />
                                            <span className="flex-1">Google Calendar {hasGoogle === false ? '(No vinculado)' : ''}</span>
                                            {hasGoogle === true && <CheckCircle2 size={13} className="text-green-500" />}
                                            {hasGoogle === false && <XCircle size={13} className="text-orange-400" />}
                                            {hasGoogle === null && <span className="text-[10px] font-normal">No aplicable</span>}
                                        </div>

                                        {/* Contact + date */}
                                        <div className="space-y-1.5 pt-3 border-t border-slate-100">
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <Mail size={12} className="text-gray-300 flex-shrink-0" />
                                                <span className="truncate">{user.email || <span className="text-gray-300 italic">Sin email</span>}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <Phone size={12} className="text-gray-300 flex-shrink-0" />
                                                <span>{user.telefono || <span className="text-gray-300 italic">Sin teléfono</span>}</span>
                                            </div>
                                            {user.fechaCreacion && (
                                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                                    <Calendar size={12} className="text-gray-300 flex-shrink-0" />
                                                    <span>Desde {new Date(user.fechaCreacion).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {modalAbierto && (
                <ModalUsuario modoEdicion={modoEdicion} formData={formData}
                    setFormData={setFormData} handleSubmit={handleSubmit} cerrarModal={cerrarModal} />
            )}
            <ConfirmarEliminarModal
                visible={confirmarEliminar.visible} nombre={confirmarEliminar.nombre}
                onConfirm={confirmarEliminarUsuario}
                onCancel={() => setConfirmarEliminar({ visible: false, id: null, nombre: '' })}
                loading={eliminando} />
        </div>
    );
}

export default UserManagement;
