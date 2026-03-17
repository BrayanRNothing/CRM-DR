import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AnimatedGridBackground from '../../components/ui/AnimatedGridBackground';
import { ChevronLeft, User, Phone, Mail, BadgeCheck, Shield } from 'lucide-react';
import { getUser } from '../../utils/authUtils';
import toast from 'react-hot-toast';

const UserProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const currentUser = getUser();

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const token = sessionStorage.getItem('token') || localStorage.getItem('token');
                // Reutilizamos el endpoint de usuarios. Para ver un usuario específico quizás necesitemos un endpoint GET /:id
                // Si no existe, podemos buscarlo en la lista completa o implementar endpoint

                // Opción A: Implementar GET /api/usuarios/:id en backend (no lo hicimos, solo PUT y DELETE)
                // Opción B: Traer todos y filtrar (ineficiente pero funciona rápido ahora)
                // Vamos a asumir que implementaremos GET /:id o usaremos filtro. 
                // Revisando rutas: router.put('/:id'), router.delete('/:id'). FALTABA GET /:id individual.
                // Modificaré el fetch para traer la lista y filtrar por ahora, para no tocar backend de nuevo si no es crítico.

                const response = await fetch('http://localhost:4000/api/usuarios', {
                    headers: { 'x-auth-token': token }
                });

                if (response.ok) {
                    const users = await response.json();
                    const found = users.find(u => u.id === parseInt(id));
                    if (found) {
                        setUserProfile(found);
                    } else {
                        toast.error('Usuario no encontrado');
                    }
                } else {
                    toast.error('Error al cargar usuarios');
                }
            } catch (error) {
                console.error("Error fetching user profile:", error);
                toast.error('Error de conexión');
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchUser();
        }
    }, [id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-10 h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
            </div>
        );
    }

    if (!userProfile) {
        return (
            <div className="p-8 text-center text-gray-500">
                <p>Usuario no encontrado o no disponible.</p>
                <button onClick={() => navigate(-1)} className="mt-4 text-blue-500 underline">Volver</button>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-4xl mx-auto animate-fade-in-up">
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6 transition-colors"
            >
                <ChevronLeft size={20} />
                <span>Volver</span>
            </button>

            <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
                {/* Header Banner */}
                <div className="h-32 bg-gradient-to-r from-teal-500 to-blue-600 relative">
                    <div className="absolute -bottom-12 left-8">
                        <div className="w-24 h-24 rounded-2xl bg-white p-1 shadow-lg flex items-center justify-center text-4xl font-bold text-teal-600">
                            {userProfile.nombre.charAt(0)}
                        </div>
                    </div>
                </div>

                <div className="pt-16 pb-8 px-8">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                                {userProfile.nombre}
                                {userProfile.activo && <BadgeCheck className="text-white bg-blue-500 rounded-full p-0.5 w-6 h-6" />}
                            </h1>
                            <p className="text-gray-500 text-lg flex items-center gap-2 mt-1">
                                <Shield className="w-4 h-4" />
                                {userProfile.rol.charAt(0).toUpperCase() + userProfile.rol.slice(1)}
                            </p>
                        </div>
                        <div className="text-right">
                            <span className={`px-4 py-2 rounded-full text-sm font-medium ${userProfile.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {userProfile.activo ? 'Activo' : 'Inactivo'}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                        <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 bg-white rounded-xl shadow-sm text-gray-700">
                                    <User className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Usuario</p>
                                    <p className="font-semibold text-gray-800">{userProfile.usuario}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 bg-white rounded-xl shadow-sm text-blue-600">
                                    <Mail className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Email</p>
                                    <p className="font-semibold text-gray-800">{userProfile.email || 'No registrado'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 bg-white rounded-xl shadow-sm text-green-600">
                                    <Phone className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Teléfono</p>
                                    <p className="font-semibold text-gray-800">{userProfile.telefono || 'No registrado'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 bg-white rounded-xl shadow-sm text-purple-600">
                                    <BadgeCheck className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Se unió</p>
                                    <p className="font-semibold text-gray-800">{userProfile.fechaCreacion || 'Recientemente'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserProfile;
