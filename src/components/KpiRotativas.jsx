import React, { useState, useMemo } from 'react';
import { TrendingUp, Phone, Users, Clock, Pencil } from 'lucide-react';

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
    // ── Cálculos ─────────────────────────────────────────────────────────
    const diasAntiguedad = useMemo(() => {
        const f = ClienteSeleccionado?.fechaRegistro || ClienteSeleccionado?.createdAt;
        if (!f) return null;
        return Math.max(1, Math.ceil(Math.abs(new Date() - new Date(f)) / 86400000));
    }, [ClienteSeleccionado]);

    const reunionesRealizadas = actividadesContext?.filter(a => a.tipo === 'cita' && a.resultado === 'exitoso').length || 0;

    const totalFacturado = useMemo(() => {
        if (!customSections) return 0;
        let total = 0;
        customSections.forEach(sec => {
            if (sec.tipo === 'sales' || sec.tipo === 'subscriptions') {
                if (Array.isArray(sec.contenido)) {
                    sec.contenido.forEach(item => {
                        const m = parseFloat(item.monto);
                        if (!isNaN(m)) total += m;
                    });
                }
            }
        });
        return total;
    }, [customSections]);

    const formatNumber = (val) => {
        if (!val) return '0';
        const num = parseFloat(val.toString().replace(/,/g, ''));
        if (isNaN(num)) return val;
        if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
        return num.toString();
    };

    // ── KPIs ──────────────────────────────────────────────────
    const kpisActuales = [
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
            id: 'facturado_edit', label: 'Facturado',
            value: null,
            sub: guardandoMetrica ? 'Guardando...' : 'Ingresos confirmados',
            icon: <TrendingUp className="w-3.5 h-3.5" />,
            valColor: 'text-emerald-600', iconColor: 'text-emerald-500',
            bg: 'bg-white', border: 'border-emerald-200',
        }
    ];

    const renderValor = (kpi) => {
        if (kpi.id === 'llamadas') return (
            <div className="flex items-center justify-center gap-1">
                <span className="text-2xl font-black text-(--theme-500)" title="Contestadas">{llamadasExitosas}</span>
                <span className="text-xl font-bold text-slate-300">/</span>
                <span className="text-2xl font-black text-rose-500" title="No contestadas">{llamadasFallidas}</span>
            </div>
        );
        if (kpi.id === 'facturado_edit') return (
            <div className="flex items-center justify-center gap-0.5 relative group" title="Monto total de ventas y suscripciones registradas">
                <span className="text-xl font-black text-emerald-600 opacity-50">$</span>
                <span className="text-2xl font-black text-emerald-600 truncate max-w-[120px]">
                    {formatNumber(totalFacturado)}
                </span>
            </div>
        );
        if (kpi.id === 'reuniones') return (
            <p className={`text-3xl font-black ${kpi.valColor}`}>{kpi.value}</p>
        );
        return <p className={`text-2xl font-black ${kpi.valColor}`}>{kpi.value}</p>;
    };

    return (
        <div className="flex items-stretch gap-2">
            {/* KPIs */}
            <div className="flex-1 min-w-0 overflow-hidden">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {kpisActuales.map((kpi) => (
                        <div
                            key={kpi.id}
                            className={`${kpi.bg} ${kpi.border} border rounded-xl p-4 shadow-sm flex flex-col justify-center text-center`}
                        >
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{kpi.label}</p>

                            {/* Valor */}
                            {renderValor(kpi)}

                            {/* Sub */}
                            <p className={`text-[10px] text-gray-400 mt-1 ${kpi.id === 'llamadas' ? 'font-bold italic' : 'font-bold'}`}>{kpi.sub}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
