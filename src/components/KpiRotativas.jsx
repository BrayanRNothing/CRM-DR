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
    // customSections no se usa más aquí pero se mantiene en props por compatibilidad
}) {
    const [isEditing, setIsEditing] = useState(false);

    // ── Cálculos ─────────────────────────────────────────────────────────
    const diasAntiguedad = useMemo(() => {
        const f = ClienteSeleccionado?.fechaRegistro || ClienteSeleccionado?.createdAt;
        if (!f) return null;
        return Math.max(1, Math.ceil(Math.abs(new Date() - new Date(f)) / 86400000));
    }, [ClienteSeleccionado]);

    const reunionesRealizadas = actividadesContext?.filter(a => a.tipo === 'cita' && a.resultado === 'exitoso').length || 0;

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
            <div className="flex items-center justify-center gap-1 mt-1">
                <span className="text-xl font-black text-(--theme-500)">{llamadasExitosas}</span>
                <span className="text-base font-bold text-slate-300">/</span>
                <span className="text-xl font-black text-rose-500">{llamadasFallidas}</span>
            </div>
        );
        if (kpi.id === 'facturado_edit') return (
            <div 
                className="flex items-center justify-center gap-0.5 mt-1 relative group cursor-pointer" 
                onClick={() => !isEditing && setIsEditing(true)}
                title="Clic para editar"
            >
                <span className="text-base font-black text-emerald-600 opacity-40">$</span>
                
                {isEditing ? (
                    <input
                        type="text"
                        autoFocus
                        value={valorCliente}
                        onChange={(e) => setValorCliente(e.target.value.replace(/[^0-9.,]/g, ''))}
                        onBlur={(e) => {
                            setIsEditing(false);
                            handleGuardarMetricaPersonalizada(e);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                setIsEditing(false);
                                handleGuardarMetricaPersonalizada(e);
                            }
                        }}
                        placeholder="0"
                        className="text-xl font-black text-emerald-600 bg-transparent border-b border-emerald-300 text-center outline-none focus:ring-0 p-0 px-1"
                        style={{ width: `${Math.max((valorCliente || '').length, 3)}ch`, minWidth: '3ch', maxWidth: '8ch' }}
                    />
                ) : (
                    <span className="text-xl font-black text-emerald-600 border-b border-dashed border-emerald-300/0 group-hover:border-emerald-300/50 transition-colors">
                        {formatNumber(valorCliente)}
                    </span>
                )}

                <select
                    value={monedaSeleccionada}
                    onChange={(e) => setMonedaSeleccionada(e.target.value)}
                    onBlur={handleGuardarMetricaPersonalizada}
                    onClick={(e) => e.stopPropagation()}
                    className="text-[9px] font-black text-slate-400 bg-transparent border-none appearance-none cursor-pointer outline-none ml-0.5 hover:text-slate-600"
                >
                    <option value="MXN">MXN</option>
                    <option value="USD">USD</option>
                </select>

                {!isEditing && (
                    <Pencil className="w-3 h-3 text-emerald-400 opacity-0 group-hover:opacity-100 absolute -right-4 transition-opacity" />
                )}
            </div>
        );
        return <p className={`text-2xl font-black leading-none mt-1 ${kpi.valColor}`}>{kpi.value}</p>;
    };

    return (
        <div className="flex items-stretch gap-2">
            {/* KPIs */}
            <div className="flex-1 min-w-0 overflow-hidden">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
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
        </div>
    );
}
