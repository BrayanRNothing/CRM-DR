
import React, { useState, useEffect } from 'react';
import Avatar from '../../components/ui/Avatar';
import toast from 'react-hot-toast';
import API_URL from '../../config/api';
import { X, User, Phone, Mail, Lock, Shield } from 'lucide-react';
import AnimatedGridBackground from '../../components/ui/AnimatedGridBackground';

function ModalUsuario({ modoEdicion, formData, setFormData, handleSubmit, cerrarModal }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header Elegante */}
                <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 text-white flex justify-between items-start border-b border-white/10 relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/5 opacity-0 hover:opacity-100 transition-opacity pointer-events-none" />
                    <div className="relative z-10 pr-8">
                        <h2 className="text-2xl font-bold tracking-tight text-white mb-1 flex items-center gap-2">
                            {modoEdicion ? '✏️ Editar Usuario' : '✨ Nuevo Usuario'}
                        </h2>
                        <p className="text-slate-400 text-sm">
                            {modoEdicion ? 'Actualiza la información del usuario.' : 'Ingresa los datos para registrar un nuevo usuario.'}
                        </p>
                    </div>
                    <button
                        onClick={cerrarModal}
                        className="text-slate-400 hover:text-white hover:bg-white/10 p-2 rounded-full transition-all focus:outline-none absolute right-4 top-4"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Formulario */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-slate-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Nombre Completo *</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                    <User size={18} />
                                </div>
                                <input
                                    type="text"
                                    value={formData.nombre}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, nombre: e.target.value }))}
                                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                                    placeholder="Ej. Juan Pérez"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Usuario *</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                    <span className="font-bold text-sm">@</span>
                                </div>
                                <input
                                    type="text"
                                    value={formData.username}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
                                    className="w-full pl-9 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm disabled:bg-slate-100 disabled:text-slate-500"
                                    placeholder="usuario123"
                                    required
                                    disabled={modoEdicion}
                                />
                            </div>
                            {modoEdicion && <p className="text-[10px] text-slate-400 mt-1 ml-1">El usuario no se puede modificar</p>}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Teléfono</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                    <Phone size={18} />
                                </div>
                                <input
                                    type="tel"
                                    value={formData.telefono}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, telefono: e.target.value }))}
                                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                                    placeholder="Teléfono"
                                />
                            </div>
                        </div>

                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Email (Opcional)</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                    <Mail size={18} />
                                </div>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                                    placeholder="correo@ejemplo.com"
                                />
                            </div>
                        </div>

                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                                Contraseña {modoEdicion && '(Opcional)'}
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                                    placeholder={modoEdicion ? "••••••••" : "Contraseña segura"}
                                    required={!modoEdicion}
                                />
                            </div>
                        </div>

                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Rol *</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                    <Shield size={18} />
                                </div>
                                <select
                                    value={formData.rol}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, rol: e.target.value }))}
                                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm appearance-none cursor-pointer"
                                    required
                                >
                                    <option value="closer">🎯 Closer</option>
                                    <option value="prospector">🔍 Prospector</option>
                                    <option value="usuario">👤 Usuario (Por asignar)</option>
                                </select>
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500">
                                    <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-slate-100 mt-2">
                        <button
                            type="button"
                            onClick={cerrarModal}
                            className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 hover:text-slate-800 transition-colors flex-1"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold hover:shadow-lg hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex-1"
                        >
                            {modoEdicion ? 'Guardar Cambios' : 'Crear Usuario'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function ConfirmarEliminarModal({ visible, nombre, onConfirm, onCancel, loading }) {
    if (!visible) return null;
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-100 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70" />
            <div className="relative z-10 w-full max-w-xs bg-white p-6 rounded-2xl border border-gray-200 shadow-2xl text-gray-800 flex flex-col items-center">
                <div className="text-4xl mb-2">⚠️</div>
                <h2 className="text-lg font-bold mb-2 text-center">¿Eliminar usuario?</h2>
                <p className="mb-4 text-center">Se eliminará <span className="font-semibold">{nombre}</span> y no se podrá recuperar.</p>
                <div className="flex gap-3 w-full">
                    <button onClick={onCancel} disabled={loading} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 rounded-lg">Cancelar</button>
                    <button
                        onClick={() => {
                            onConfirm();
                        }}
                        disabled={loading}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-lg disabled:opacity-60"
                    >
                        {loading ? 'Eliminando...' : 'Eliminar'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function UserManagement({ initialRole = 'menu' }) {
    const API_BASE = API_URL;
    const [usuarios, setUsuarios] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [vistaActual, setVistaActual] = useState(initialRole);
    const [modalAbierto, setModalAbierto] = useState(false);
    const [modoEdicion, setModoEdicion] = useState(false);
    const [usuarioEditando, setUsuarioEditando] = useState(null);
    const [formData, setFormData] = useState({
        username: '',
        nombre: '',
        email: '',
        telefono: '',
        password: '',
        rol: 'usuario'
    });

    // Estado para confirmación de borrado
    const [confirmarEliminar, setConfirmarEliminar] = useState({ visible: false, id: null, nombre: '' });
    const [eliminando, setEliminando] = useState(false);

    useEffect(() => {
        cargarUsuarios();
    }, []);

    // Update view if prop changes
    useEffect(() => {
        setVistaActual(initialRole);
    }, [initialRole]);

    const cargarUsuarios = async () => {
        setCargando(true);
        try {
            const res = await fetch(`${API_BASE}/api/usuarios`);
            const data = await res.json();
            setUsuarios(data);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setCargando(false);
        }
    };

    const abrirModal = (rol) => {
        setFormData({ username: '', nombre: '', email: '', telefono: '', password: '', rol: rol === 'menu' ? 'usuario' : rol });
        setModoEdicion(false);
        setUsuarioEditando(null);
        setModalAbierto(true);
    };

    const abrirModalEditar = (usuario) => {
        setFormData({
            username: usuario.username || '',
            nombre: usuario.nombre,
            email: usuario.email || '',
            telefono: usuario.telefono || '',
            password: '',
            rol: usuario.rol
        });
        setModoEdicion(true);
        setUsuarioEditando(usuario);
        setModalAbierto(true);
    };

    const cerrarModal = () => {
        setModalAbierto(false);
        setFormData({ username: '', nombre: '', email: '', telefono: '', password: '', rol: 'usuario' });
        setModoEdicion(false);
        setUsuarioEditando(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.username || (!formData.password && !modoEdicion)) {
            toast.error('Usuario y contraseña son requeridos');
            return;
        }

        const payload = {
            nombre: formData.nombre,
            usuario: formData.username,
            email: formData.email,
            telefono: formData.telefono,
            rol: formData.rol,
            contraseña: formData.password
        };

        // Si estamos editando y no hay contraseña nueva, la quitamos del payload
        if (modoEdicion && !formData.password) {
            delete payload.contraseña;
        }

        try {
            if (modoEdicion) {
                const res = await fetch(`${API_BASE}/api/usuarios/${usuarioEditando.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    toast.success('✅ Usuario actualizado');
                    cargarUsuarios();
                    cerrarModal();
                } else {
                    toast.error('Error al actualizar');
                }
            } else {
                const res = await fetch(`${API_BASE}/api/usuarios`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    toast.success('✅ Usuario creado');
                    cargarUsuarios();
                    cerrarModal();
                } else {
                    toast.error('Error al crear');
                }
            }
        } catch (error) {
            console.error(error);
            toast.error('Error de conexión');
        }
    };


    const handleEliminar = (id, nombre) => {
        setConfirmarEliminar({ visible: true, id, nombre });
    };

    const confirmarEliminarUsuario = async () => {
        if (eliminando) return;
        setEliminando(true);
        const { id, nombre } = confirmarEliminar;
        try {
            const res = await fetch(`${API_BASE}/api/usuarios/${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                toast.success(`🗑️ Usuario "${nombre}" eliminado`);
                cargarUsuarios();
            } else {
                toast.error('Error al eliminar');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error de conexión');
        } finally {
            setEliminando(false);
            setConfirmarEliminar({ visible: false, id: null, nombre: '' });
        }
    };

    const closers = usuarios.filter(u => u.rol === 'closer');
    const prospectors = usuarios.filter(u => u.rol === 'prospector');
    const usuariosFinales = usuarios.filter(u => u.rol === 'usuario');

    const renderTarjetaUsuario = (user, color) => (
        <div key={user.id} className={`bg-${color}-50 border-2 border-${color}-300 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all`}>
            <div className="flex items-start gap-4 mb-4">
                <Avatar name={user.nombre} size="lg" />
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg text-gray-800 truncate">{user.nombre}</h3>
                    <p className="text-sm text-gray-600 truncate flex items-center gap-1">
                        <span>👤</span> @{user.username}
                    </p>
                    {user.email && (
                        <p className="text-xs text-gray-500 truncate flex items-center gap-1 mt-1">
                            <span>📧</span> {user.email}
                        </p>
                    )}
                    <div className={`bg-${color}-200 text-${color}-800 px-3 py-1 rounded-full text-xs font-bold inline-block mt-2 uppercase`}>
                        {user.rol === 'closer' && '🎯 '}
                        {user.rol === 'prospector' && '🔍 '}
                        {user.rol === 'usuario' && '👤 '}
                        {user.rol}
                    </div>
                </div>
            </div>

            <div className="bg-white/50 rounded-lg p-3 mb-4 space-y-1">
                <p className="text-xs text-gray-600 flex items-center gap-2">
                    <span className="font-semibold">🆔 ID:</span>
                    <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{user.id}</span>
                </p>
                <div className="flex gap-2">
                    <button
                        onClick={() => abrirModalEditar(user)}
                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold py-2.5 px-3 rounded-lg transition shadow-md hover:shadow-lg"
                    >
                        ✏️ Editar
                    </button>
                    <button
                        onClick={() => handleEliminar(user.id, user.nombre)}
                        className={`flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-bold py-2.5 px-3 rounded-lg transition shadow-md hover:shadow-lg`}
                    >
                        🗑️ Eliminar
                    </button>
                </div>
            </div>
        </div>
    );



    const getRoleTitle = (role) => {
        switch (role) {
            case 'closer': return 'Closers';
            case 'prospector': return 'Prospectors';
            case 'usuario': return 'Usuarios (Por Asignar)';
            default: return 'Usuarios';
        }
    }

    const getRoleList = (role) => {
        switch (role) {
            case 'closer': return closers;
            case 'prospector': return prospectors;
            default: return usuariosFinales;
        }
    }

    const getRoleColor = (role) => {
        switch (role) {
            case 'closer': return 'blue';
            case 'prospector': return 'teal';
            default: return 'gray';
        }
    }

    return (
        <div className="w-full h-screen overflow-hidden bg-slate-50">
            <AnimatedGridBackground mode="light" particleCount={50}>
                <div className="h-full w-full overflow-y-auto p-6">
                    <div className="max-w-7xl mx-auto pb-12">
                        <div className="flex justify-between items-center flex-wrap gap-4 mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">{getRoleTitle(vistaActual)}</h2>
                                <p className="text-gray-500 text-sm">{getRoleList(vistaActual).length} usuarios registrados</p>
                            </div>
                            <button
                                onClick={() => abrirModal(vistaActual)}
                                className={`bg-${getRoleColor(vistaActual) === 'teal' ? 'teal' : 'blue'}-600 hover:bg-${getRoleColor(vistaActual) === 'teal' ? 'teal' : 'blue'}-700 text-white px-6 py-3 rounded-lg font-bold shadow-md transition-all active:scale-95`}
                            >
                                + Crear {vistaActual === 'menu' ? 'Usuario' : vistaActual.charAt(0).toUpperCase() + vistaActual.slice(1)}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {getRoleList(vistaActual).map(user => renderTarjetaUsuario(user, getRoleColor(vistaActual)))}
                        </div>

                        {getRoleList(vistaActual).length === 0 && (
                            <div className="text-center py-20 bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200">
                                <p className="text-gray-500">No hay usuarios en esta categoría.</p>
                            </div>
                        )}
                    </div>
                    {modalAbierto && (
                        <ModalUsuario
                            modoEdicion={modoEdicion}
                            formData={formData}
                            setFormData={setFormData}
                            handleSubmit={handleSubmit}
                            cerrarModal={cerrarModal}
                        />
                    )}
                    <ConfirmarEliminarModal
                        visible={confirmarEliminar.visible}
                        nombre={confirmarEliminar.nombre}
                        onConfirm={confirmarEliminarUsuario}
                        onCancel={() => setConfirmarEliminar({ visible: false, id: null, nombre: '' })}
                        loading={eliminando}
                    />
                </div>
            </AnimatedGridBackground>
        </div>
    );
}

export default UserManagement;
