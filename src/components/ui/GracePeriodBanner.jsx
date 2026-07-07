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
            const res = await fetch(`${API_URL}/api/auth/billing-portal`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token,
                },
            });

            const data = await res.json();

            if (res.ok && data.url) {
                window.location.href = data.url;
            } else if (data.code === 'NO_STRIPE_CUSTOMER') {
                alert('Tu cuenta no tiene una suscripción de Stripe. Contacta a soporte.');
            } else {
                alert('No se pudo abrir el portal de facturación. Intenta de nuevo.');
            }
        } catch (err) {
            console.error('Error abriendo billing portal:', err);
            alert('Error de conexión. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                background: urgente
                    ? 'linear-gradient(90deg, #7f1d1d 0%, #991b1b 100%)'
                    : 'linear-gradient(90deg, #78350f 0%, #92400e 100%)',
                borderBottom: urgente ? '1px solid #ef4444' : '1px solid #f59e0b',
                padding: '10px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
                zIndex: 100,
                position: 'relative',
            }}
        >
            {/* Ícono + Texto */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                <span style={{ fontSize: '18px' }}>{urgente ? '🚨' : '⚠️'}</span>
                <div>
                    <p style={{
                        margin: 0,
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '13px',
                        lineHeight: 1.3,
                    }}>
                        {urgente
                            ? `¡Tu acceso expira hoy! Renueva ahora para no perder tus datos.`
                            : `Tu suscripción fue cancelada o el pago falló. Tienes ${diasRestantes} día${diasRestantes !== 1 ? 's' : ''} de acceso restante${diasRestantes !== 1 ? 's' : ''}.`
                        }
                    </p>
                    <p style={{
                        margin: 0,
                        color: urgente ? '#fca5a5' : '#fde68a',
                        fontSize: '11px',
                        marginTop: '2px',
                    }}>
                        Puedes renovar tu plan, actualizar tu tarjeta o exportar tus datos.
                    </p>
                </div>
            </div>

            {/* Botones */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                    onClick={handleManageSubscription}
                    disabled={loading}
                    style={{
                        background: urgente ? '#ef4444' : '#f59e0b',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 14px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.7 : 1,
                        whiteSpace: 'nowrap',
                        transition: 'opacity 0.2s',
                    }}
                >
                    {loading ? 'Cargando...' : '💳 Gestionar suscripción'}
                </button>

                {/* Botón cerrar (solo si no es urgente) */}
                {!urgente && (
                    <button
                        onClick={() => setDismissed(true)}
                        title="Cerrar aviso temporalmente"
                        style={{
                            background: 'transparent',
                            border: '1px solid rgba(255,255,255,0.3)',
                            borderRadius: '6px',
                            color: 'rgba(255,255,255,0.7)',
                            cursor: 'pointer',
                            padding: '5px 8px',
                            fontSize: '14px',
                            lineHeight: 1,
                        }}
                    >
                        ✕
                    </button>
                )}
            </div>
        </div>
    );
};

export default GracePeriodBanner;
