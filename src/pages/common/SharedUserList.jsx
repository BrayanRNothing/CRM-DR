import React, { useState, useEffect } from 'react';
import Avatar from '../../components/ui/Avatar';
import API_URL from '../../config/api';

const SharedUserList = ({ role, title }) => {
    const [usuarios, setUsuarios] = useState([]);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        const cargarUsuarios = async () => {
            setCargando(true);
            try {
                const res = await fetch(`${API_URL}/api/usuarios`);
                if (res.ok) {
                    const data = await res.json();
                    // Filtrar por el rol solicitado
                    const filtrados = data.filter(u => u.rol === role);
                    setUsuarios(filtrados);
                }
            } catch (error) {
                console.error('Error cargando usuarios:', error);
            } finally {
                setCargando(false);
            }
        };

        cargarUsuarios();
    }, [role]);

    return (
        <div className="p-6 min-h-screen bg-slate-50">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">{title}</h1>
                    <p className="text-gray-500 mt-2">Directorio de usuarios registrados como {role}.</p>
                </div>

                {cargando ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-teal-500 border-opacity-50"></div>
                    </div>
                ) : usuarios.length === 0 ? (
                    <div className="bg-white rounded-2xl p-10 text-center border border-slate-200">
                        <div className="text-5xl mb-4">👥</div>
                        <h3 className="text-xl font-medium text-gray-800">No hay usuarios encontrados</h3>
                        <p className="text-gray-500 mt-2">No se encontraron usuarios registrados con el rol "{role}".</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {usuarios.map((user) => (
                            <div key={user.id} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-start gap-4">
                                    <Avatar name={user.nombre} size="lg" className="bg-teal-100 text-teal-700" />
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-lg text-gray-900 truncate">{user.nombre}</h3>
                                        <p className="text-sm text-gray-500 truncate mb-2">@{user.username}</p>

                                        <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700 uppercase tracking-wide">
                                            {user.rol}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 space-y-3 pt-4 border-t border-slate-100">
                                    {user.email && (
                                        <div className="flex items-center gap-3 text-sm text-gray-600">
                                            <span className="text-lg">📧</span>
                                            <span className="truncate">{user.email}</span>
                                        </div>
                                    )}
                                    {user.telefono && (
                                        <div className="flex items-center gap-3 text-sm text-gray-600">
                                            <span className="text-lg">📱</span>
                                            <span className="truncate">{user.telefono}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-3 text-sm text-gray-600">
                                        <span className="text-lg">🆔</span>
                                        <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-xs">{user.id}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SharedUserList;
