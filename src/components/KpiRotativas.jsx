import React, { useState, useMemo } from 'react';
import { TrendingUp, AlertTriangle, ArrowRightLeft, Phone, Users, Clock, CreditCard, ShoppingBag, RefreshCw } from 'lucide-react';

export default function KpiRotativas({
    ClienteSeleccionado,
    actividadesContext,
    llamadasExitosas,
    llamadasFallidas,
    valorCliente,
    setValorCliente,
    monedaSeleccionada,
    setMonedaSeleccionada,
    guardandoMetrica,
    handleGuardarMetricaPersonalizada,
    customSections
}) {
    const [paginaActual, setPaginaActual] = useState(0);
    const [animating, setAnimating] = useState(false);

    // ── Parsear secciones ────────────────────────────────────────────────
    const sections = useMemo(() => {
        if (Array.isArray(customSections)) return customSections;
        if (typeof customSections === 'string') {
            try { return JSON.parse(customSections || '[]'); } catch { return []; }
        }
        return [];
    }, [customSections]);

    // ── Cálculos ─────────────────────────────────────────────────────────
    const totalFacturado = sections
        .filter(s => s.tipo === 'payments').flatMap(s => s.contenido || [])
        .filter(p => p.estado === 'pagado')
        .reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0);

    const pagosPendientes = sections
        .filter(s => s.tipo === 'payments').flatMap(s => s.contenido || [])
        .filter(p => p.estado === 'pendiente' || p.estado === 'vencido');
    const cantidadPendientes = pagosPendientes.length;
    const montoPendiente = pagosPendientes.reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0);

    const hoy = new Date().toISOString().slice(0, 10);
    const contratosActivos = sections
        .filter(s => s.tipo === 'contracts').flatMap(s => s.contenido || [])
        .filter(c => c.fechaVencimiento && c.fechaVencimiento >= hoy).length;

    const totalVentas = sections
        .filter(s => s.tipo === 'sales').flatMap(s => s.contenido || [])
        .reduce((sum, v) => sum + (parseFloat(v.monto) || 0), 0);

    const suscripcionesActivas = sections
        .filter(s => s.tipo === 'subscriptions').flatMap(s => s.contenido || [])
        .filter(s => s.estado === 'activa' || !s.estado).length;

    const diasAntiguedad = useMemo(() => {
        const f = ClienteSeleccionado?.fechaRegistro || ClienteSeleccionado?.createdAt;
        if (!f) return null;
        return Math.max(1, Math.ceil(Math.abs(new Date() - new Date(f)) / 86400000));
    }, [ClienteSeleccionado]);

    const reunionesRealizadas = actividadesContext?.filter(a => a.tipo === 'cita' && a.resultado === 'exitoso').length || 0;

    // ── Páginas de KPIs ──────────────────────────────────────────────────
    const paginas = [
        // Página 0: Finanzas
        [
            {
                id: 'facturado', label: 'Facturado',
                value: `$${totalFacturado.toLocaleString()}`,
                sub: 'Ingresos confirmados',
                icon: <TrendingUp className="w-3.5 h-3.5" />,
                valColor: 'text-emerald-600', iconColor: 'text-emerald-500',
                bg: 'bg-white', border: 'border-slate-200',
            },
            {
                id: 'cobrar', label: 'Por Cobrar',
                value: `$${montoPendiente.toLocaleString()}`,
                sub: `${cantidadPendientes} pendiente${cantidadPendientes !== 1 ? 's' : ''}`,
                icon: cantidadPendientes > 0 ? <AlertTriangle className="w-3.5 h-3.5" /> : <CreditCard className="w-3.5 h-3.5" />,
                valColor: cantidadPendientes > 0 ? 'text-amber-600' : 'text-slate-400',
                iconColor: cantidadPendientes > 0 ? 'text-amber-500' : 'text-slate-300',
                bg: cantidadPendientes > 0 ? 'bg-amber-50/40' : 'bg-white',
                border: cantidadPendientes > 0 ? 'border-amber-200' : 'border-slate-200',
            },
            {
                id: 'ventas', label: 'Ventas',
                value: `$${totalVentas.toLocaleString()}`,
                sub: 'Total historial',
                icon: <ShoppingBag className="w-3.5 h-3.5" />,
                valColor: 'text-blue-600', iconColor: 'text-blue-400',
                bg: 'bg-white', border: 'border-slate-200',
            },
            {
                id: 'suscripciones', label: 'Suscripciones',
                value: suscripcionesActivas,
                sub: 'Activas',
                icon: <RefreshCw className="w-3.5 h-3.5" />,
                valColor: 'text-violet-600', iconColor: 'text-violet-400',
                bg: 'bg-white', border: 'border-slate-200',
            },
        ],
        // Página 1: Seguimiento
        [
            {
                id: 'antiguedad', label: 'Antigüedad',
                value: diasAntiguedad ? `${diasAntiguedad}d` : 'N/A',
                sub: diasAntiguedad
                    ? `Desde ${new Date(ClienteSeleccionado?.fechaRegistro || ClienteSeleccionado?.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}`
                    : 'Sin fecha',
                icon: <Clock className="w-3.5 h-3.5" />,
                valColor: 'text-(--theme-600)', iconColor: 'text-(--theme-400)',
                bg: 'bg-white', border: 'border-slate-200',
            },
            {
                id: 'llamadas', label: 'Llamadas',
                value: null,
                sub: 'Sí / No contestó',
                icon: <Phone className="w-3.5 h-3.5" />,
                valColor: 'text-(--theme-500)', iconColor: 'text-(--theme-400)',
                bg: 'bg-white', border: 'border-slate-200',
            },
            {
                id: 'reuniones', label: 'Reuniones',
                value: reunionesRealizadas,
                sub: 'Realizadas',
                icon: <Users className="w-3.5 h-3.5" />,
                valColor: 'text-(--theme-500)', iconColor: 'text-(--theme-400)',
                bg: 'bg-white', border: 'border-slate-200',
            },
            {
                id: 'valor', label: 'Valor Est.',
                value: null,
                sub: guardandoMetrica ? 'Guardando...' : 'Proyección',
                icon: <TrendingUp className="w-3.5 h-3.5" />,
                valColor: 'text-(--theme-600)', iconColor: 'text-(--theme-500)',
                bg: 'bg-white', border: 'border-slate-200',
            },
        ],
    ];

    const totalPaginas = paginas.length;

    // ── Navegación con animación ─────────────────────────────────────────
    const togglePage = () => {
        if (animating) return;
        setAnimating(true);
        setTimeout(() => {
            setPaginaActual(p => (p + 1) % totalPaginas);
            setAnimating(false);
        }, 280);
    };

    const getSlideStyle = () => {
        if (!animating) return { transform: 'translateX(0)', opacity: 1, transition: 'transform 0.28s ease, opacity 0.28s ease' };
        return {
            transform: 'translateX(-6%)',
            opacity: 0,
            transition: 'transform 0.28s ease, opacity 0.28s ease',
        };
    };

    const kpisActuales = paginas[paginaActual];

    const renderValor = (kpi) => {
        if (kpi.id === 'llamadas') return (
            <div className="flex items-center justify-center gap-1 mt-1">
                <span className="text-xl font-black text-(--theme-500)">{llamadasExitosas}</span>
                <span className="text-base font-bold text-slate-300">/</span>
                <span className="text-xl font-black text-rose-500">{llamadasFallidas}</span>
            </div>
        );
        if (kpi.id === 'valor') return (
            <div className="flex items-center justify-center gap-0.5 mt-1">
                <span className="text-base font-black text-(--theme-600) opacity-40">$</span>
                <input
                    type="text"
                    value={valorCliente}
                    onChange={(e) => setValorCliente(e.target.value.replace(/[^0-9.,]/g, ''))}
                    onBlur={handleGuardarMetricaPersonalizada}
                    placeholder="0"
                    className="text-xl font-black text-(--theme-600) bg-transparent border-none text-center outline-none focus:ring-0 p-0"
                    style={{ width: `${Math.max((valorCliente || '').length, 3)}ch`, minWidth: '3ch', maxWidth: '9ch' }}
                />
                <select
                    value={monedaSeleccionada}
                    onChange={(e) => setMonedaSeleccionada(e.target.value)}
                    onBlur={handleGuardarMetricaPersonalizada}
                    className="text-[9px] font-black text-slate-400 bg-transparent border-none appearance-none cursor-pointer outline-none ml-0.5"
                >
                    <option value="MXN">MXN</option>
                    <option value="USD">USD</option>
                </select>
            </div>
        );
        return <p className={`text-2xl font-black leading-none mt-1 ${kpi.valColor}`}>{kpi.value}</p>;
    };

    return (
        <div className="flex items-stretch gap-2">
            {/* KPIs en carrusel */}
            <div className="flex-1 min-w-0 overflow-hidden">
                <div style={getSlideStyle()} className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {kpisActuales.map((kpi) => (
                        <div
                            key={kpi.id}
                            className={`${kpi.bg} ${kpi.border} border rounded-xl px-3 py-3 shadow-sm flex flex-col items-center justify-center text-center min-h-[90px]`}
                        >
                            {/* Ícono + label */}
                            <div className={`flex items-center gap-1 ${kpi.iconColor}`}>
                                {kpi.icon}
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">{kpi.label}</p>
                            </div>

                            {/* Valor */}
                            {renderValor(kpi)}

                            {/* Sub */}
                            <p className="text-[10px] text-slate-400 mt-1.5 leading-none">{kpi.sub}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Botón de intercambio lateral */}
            <button
                onClick={togglePage}
                className="flex-shrink-0 w-8 sm:w-10 flex items-center justify-center self-stretch rounded-xl bg-white hover:bg-(--theme-50) text-(--theme-500) transition-all active:scale-95 shadow-sm border border-slate-200 hover:border-(--theme-300)"
                title="Cambiar vista de KPIs"
            >
                <ArrowRightLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
        </div>
    );
}
