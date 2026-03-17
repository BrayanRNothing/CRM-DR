import React, { useState, useEffect } from 'react';
import Avatar from '../../components/ui/Avatar';
import API_URL from '../../config/api';
import { Mail, Phone, Calendar, CheckCircle2, XCircle } from 'lucide-react';

const GoogleIcon = ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);

const SharedUserList = ({ role, title }) => {
    const [usuarios, setUsuarios] = useState([]);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        const cargarUsuarios = async () => {
            setCargando(true);
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${API_URL}/api/usuarios`, {
                    headers: { 'x-auth-token': token }
                });
                if (res.ok) {
                    const data = await res.json();
                    setUsuarios(data.filter(u => u.rol === role));
                }
            } catch (error) {
                console.error('Error cargando usuarios:', error);
            } finally {
                setCargando(false);
            }
        };
        cargarUsuarios();
    }, [role]);

    const roleGradient = role === 'closer'
        ? 'from-blue-500 to-indigo-600'
        : 'from-teal-500 to-emerald-600';

    const roleBadge = role === 'closer'
        ? 'bg-blue-50 text-blue-700 border-blue-200'
        : 'bg-teal-50 text-teal-700 border-teal-200';

    return (
        <div className="p-6 min-h-screen bg-slate-50">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-black text-gray-800">{title}</h1>
                    <p className="text-gray-400 mt-1 text-sm">{usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''} registrado{usuarios.length !== 1 ? 's' : ''}</p>
                </div>

                {cargando ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-teal-500 border-opacity-50" />
                    </div>
                ) : usuarios.length === 0 ? (
                    <div className="bg-white rounded-2xl p-10 text-center border border-slate-200">
                        <div className="text-5xl mb-4">👥</div>
                        <h3 className="text-xl font-medium text-gray-800">No hay usuarios</h3>
                        <p className="text-gray-400 mt-2 text-sm">No se encontraron usuarios con el rol "{role}".</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {usuarios.map((user) => {
                            // Google Calendar: we track per user in a hypothetical campo. 
                            // Since this is stored in localStorage per browser, we show "Desconocido" for other users.
                            // The current logged-in user can be compared to show real status.
                            const currentUser = (() => { try { return JSON.parse(localStorage.getItem('usuario')); } catch { return null; } })();
                            const isMe = currentUser?.id === user.id;
                            const hasGoogle = isMe ? !!localStorage.getItem('google_access_token') : null;

                            return (
                                <div key={user.id}
                                    className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all group">
                                    {/* Color bar */}
                                    <div className={`h-1.5 bg-gradient-to-r ${roleGradient}`} />

                                    <div className="p-5">
                                        {/* Avatar + name */}
                                        <div className="flex items-center gap-3 mb-4">
                                            <Avatar name={user.nombre} size="lg" />
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-gray-900 truncate">{user.nombre}</h3>
                                                <p className="text-xs text-gray-400 truncate">@{user.usuario}</p>
                                            </div>
                                        </div>

                                        {/* Google Calendar Status */}
                                        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl mb-4 text-sm font-medium
                                            ${hasGoogle === true ? 'bg-green-50 border border-green-200 text-green-700' :
                                                hasGoogle === false ? 'bg-red-50 border border-red-200 text-red-600' :
                                                    'bg-slate-50 border border-slate-200 text-slate-500'}`}>
                                            <GoogleIcon size={15} />
                                            <span className="flex-1 text-xs">Google Calendar</span>
                                            {hasGoogle === true && <CheckCircle2 size={14} className="text-green-500" />}
                                            {hasGoogle === false && <XCircle size={14} className="text-red-400" />}
                                            {hasGoogle === null && <span className="text-[10px] text-slate-400">No disponible</span>}
                                        </div>

                                        {/* Contact info */}
                                        <div className="space-y-2 pt-3 border-t border-slate-100">
                                            {user.email ? (
                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                    <Mail size={13} className="text-gray-400 flex-shrink-0" />
                                                    <span className="truncate">{user.email}</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-xs text-gray-300">
                                                    <Mail size={13} className="flex-shrink-0" />
                                                    <span>Sin email registrado</span>
                                                </div>
                                            )}
                                            {user.telefono ? (
                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                    <Phone size={13} className="text-gray-400 flex-shrink-0" />
                                                    <span>{user.telefono}</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-xs text-gray-300">
                                                    <Phone size={13} className="flex-shrink-0" />
                                                    <span>Sin teléfono</span>
                                                </div>
                                            )}
                                            {user.fechaCreacion && (
                                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                                    <Calendar size={13} className="text-gray-300 flex-shrink-0" />
                                                    <span>Miembro desde {new Date(user.fechaCreacion).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
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
        </div>
    );
};

export default SharedUserList;
