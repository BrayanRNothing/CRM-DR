// src/components/ui/GracePeriodBanner.jsx
// Banner que se muestra cuando la suscripción venció pero el usuario aún tiene acceso
// durante el periodo de gracia de 3 días.

import React, { useState } from 'react';
import { getToken } from '../../utils/authUtils';
import API_URL from '../../config/api';

const GracePeriodBanner = ({ diasRestantes }) => {
    const [loading, setLoading] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    if (dismissed) return null;

    const urgente = diasRestantes <= 1;

    const handleManageSubscription = async () => {
        setLoading(true);
        try {
            const token = getToken();
            const res = await fetch(`${API_URL}/api/auth/create-renewal-checkout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token,
                },
            });

            const data = await res.json();

            if (res.ok && data.url) {
                window.location.href = data.url;
            } else {
                alert('No se pudo abrir la pasarela de pago. Intenta de nuevo.');
            }
        } catch (err) {
            console.error('Error abriendo pasarela de pago:', err);
            alert('Error de conexión. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className={`relative flex items-center justify-between flex-wrap gap-4 px-5 py-3 md:px-8 border-b shadow-sm z-50 transition-colors duration-300
                ${urgente 
                    ? 'bg-red-50/90 border-red-200 backdrop-blur-md' 
                    : 'bg-amber-50/90 border-amber-200 backdrop-blur-md'
                }`}
        >
            {/* Fondo decorativo (glassmorphism) */}
            <div className={`absolute inset-0 opacity-20 pointer-events-none 
                ${urgente ? 'bg-gradient-to-r from-red-100 to-red-50' : 'bg-gradient-to-r from-amber-100 to-amber-50'}`} 
            />

            {/* Ícono + Texto */}
            <div className="relative flex items-center gap-3 flex-1">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full shadow-sm border 
                    ${urgente ? 'bg-red-100 border-red-200 text-red-600' : 'bg-amber-100 border-amber-200 text-amber-600'}`}>
                    <span className="text-lg">{urgente ? '🚨' : '⚠️'}</span>
                </div>
                <div>
                    <h3 className={`m-0 font-bold text-sm leading-tight
                        ${urgente ? 'text-red-800' : 'text-amber-800'}`}>
                        {urgente
                            ? `¡Tu acceso expira hoy! Renueva ahora para no perder tus datos.`
                            : `Tu suscripción está cancelada. Tienes ${diasRestantes} día${diasRestantes !== 1 ? 's' : ''} de gracia.`
                        }
                    </h3>
                    <p className={`m-0 text-xs mt-0.5 font-medium
                        ${urgente ? 'text-red-600' : 'text-amber-600'}`}>
                        Gestiona tu plan para evitar interrupciones en tu servicio.
                    </p>
                </div>
            </div>

            {/* Botones */}
            <div className="relative flex items-center gap-2">
                <button
                    onClick={handleManageSubscription}
                    disabled={loading}
                    className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-white font-bold text-xs shadow-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 whitespace-nowrap
                        ${urgente ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-500 hover:bg-amber-600'}`}
                >
                    {loading ? 'Cargando...' : '💳 Gestionar suscripción'}
                </button>

                {/* Botón cerrar (solo si no es urgente) */}
                {!urgente && (
                    <button
                        onClick={() => setDismissed(true)}
                        title="Cerrar aviso temporalmente"
                        className="flex items-center justify-center w-8 h-8 rounded-lg bg-transparent border border-amber-200 text-amber-600 hover:bg-amber-100 hover:text-amber-800 transition-colors cursor-pointer"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
};

export default GracePeriodBanner;
