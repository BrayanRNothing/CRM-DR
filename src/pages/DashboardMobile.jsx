import React, { useState } from 'react';

import { 
    TrendingUp, Users, Phone, Target, 
    Calendar, Bell, AlertTriangle, 
    ChevronRight, ArrowRight, BarChart3, 
    DollarSign, CheckCircle2, Zap, Activity, Clock
} from 'lucide-react';

const PERIODOS = [
    { key: 'dia', label: 'Hoy' },
    { key: 'semana', label: 'Semana' },
    { key: 'mes', label: 'Mes' },
];

const DashboardMobile = ({ 
    vendedorData, 
    closerData, 
    recordatorios, 
    reuniones, 
    periodo, 
    setPeriodo 
}) => {
    const mP = vendedorData?.periodos?.[periodo] || {};
    
    const formatMoney = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
    const formatNumber = new Intl.NumberFormat('es-MX');

    let montoFacturado = 0;
    if (periodo === 'dia') {
        montoFacturado = closerData?.metricas?.ventas?.ventasHoy || 0;
    } else if (periodo === 'mes') {
        montoFacturado = closerData?.metricas?.ventas?.montoMes || 0;
    } else {
        // Fallback para semana si el backend no lo envía explícitamente, o total
        montoFacturado = closerData?.metricas?.ventas?.montoMes || 0; 
    }

    const hoy = new Date();
    hoy.setHours(0,0,0,0);
    
    const finDeHoy = new Date();
    finDeHoy.setHours(23,59,59,999);

    // Próximas reuniones (Hoy o futuro)
    const reunionesProximas = (reuniones || [])
        .filter(r => new Date(r.fecha) >= hoy)
        .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
        .slice(0, 4);

    // Recordatorios pendientes (Vencidos o para hoy)
    const recordatoriosPendientes = (recordatorios || [])
        .filter(r => new Date(r.proximaLlamada) <= finDeHoy)
        .sort((a, b) => new Date(a.proximaLlamada) - new Date(b.proximaLlamada))
        .slice(0, 4);

    return (
        <div className="bg-slate-50/60 min-h-screen pb-24 font-sans">
            
            {/* Topbar Sticky Minimalista */}
            <div className="bg-white px-5 pt-4 pb-4 border-b border-slate-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)] sticky top-0 z-20">
                <div className="flex bg-slate-100/80 p-1 rounded-xl">
                    {PERIODOS.map((p) => (
                        <button
                            key={p.key}
                            onClick={() => setPeriodo(p.key)}
                            className={`flex-1 px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all ${
                                periodo === p.key 
                                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' 
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="px-5 pt-5 flex flex-col gap-6">
                
                {/* KPIs Grid 2x2 */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-linear-to-br from-blue-400 to-blue-600 rounded-[20px] p-4 shadow-md relative overflow-hidden text-white flex-1 min-h-[100px]">
                        <div className="absolute right-0 top-0 h-full w-1/3 bg-white/10 skew-x-12 transform origin-top-right"></div>
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div className="flex items-center gap-2 mb-2 opacity-90">
                                <Users size={14} className="drop-shadow-sm" />
                                <span className="text-[10px] font-bold uppercase tracking-widest drop-shadow-sm">Nuevos</span>
                            </div>
                            <h3 className="text-3xl font-black drop-shadow-md">{formatNumber.format(mP.prospectos || 0)}</h3>
                        </div>
                    </div>

                    <div className="bg-linear-to-br from-(--theme-400) to-(--theme-600) rounded-[20px] p-4 shadow-md relative overflow-hidden text-white flex-1 min-h-[100px]">
                        <div className="absolute right-0 top-0 h-full w-1/3 bg-white/10 skew-x-12 transform origin-top-right"></div>
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div className="flex items-center gap-2 mb-2 opacity-90">
                                <Phone size={14} className="drop-shadow-sm" />
                                <span className="text-[10px] font-bold uppercase tracking-widest drop-shadow-sm">Llamadas</span>
                            </div>
                            <h3 className="text-3xl font-black drop-shadow-md">{formatNumber.format(mP.llamadas || 0)}</h3>
                        </div>
                    </div>

                    <div className="bg-linear-to-br from-purple-400 to-purple-600 rounded-[20px] p-4 shadow-md relative overflow-hidden text-white flex-1 min-h-[100px]">
                        <div className="absolute right-0 top-0 h-full w-1/3 bg-white/10 skew-x-12 transform origin-top-right"></div>
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div className="flex items-center gap-2 mb-2 opacity-90">
                                <Calendar size={14} className="drop-shadow-sm" />
                                <span className="text-[10px] font-bold uppercase tracking-widest drop-shadow-sm">Citas</span>
                            </div>
                            <h3 className="text-3xl font-black drop-shadow-md">{formatNumber.format(mP.reuniones || 0)}</h3>
                        </div>
                    </div>

                    <div className="bg-linear-to-br from-emerald-400 to-emerald-600 rounded-[20px] p-4 shadow-md relative overflow-hidden text-white flex-1 min-h-[100px]">
                        <div className="absolute right-0 top-0 h-full w-1/3 bg-white/10 skew-x-12 transform origin-top-right"></div>
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div className="flex items-center gap-2 mb-2 opacity-90">
                                <CheckCircle2 size={14} className="drop-shadow-sm" />
                                <span className="text-[10px] font-bold uppercase tracking-widest drop-shadow-sm">Facturado</span>
                            </div>
                            <h3 className="text-xl font-black tracking-tight leading-tight mt-1 drop-shadow-md">
                                {formatMoney.format(montoFacturado)}
                            </h3>
                        </div>
                    </div>
                </div>

                {/* Próximas Reuniones */}
                <div className="flex flex-col gap-3 mt-2">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-[12px] font-black uppercase tracking-widest text-slate-800 flex items-center gap-1.5">
                            <Calendar size={14} className="text-purple-500" /> Próximas Reuniones
                        </h3>
                        <span className="text-[10px] font-bold text-slate-400">{reunionesProximas.length} en agenda</span>
                    </div>

                    {reunionesProximas.length > 0 ? (
                        <div className="flex flex-col gap-2.5">
                            {reunionesProximas.map((cita, i) => (
                                <div key={i} className="bg-white rounded-2xl p-3.5 border-l-4 border-l-purple-500 border border-slate-100 shadow-xs flex justify-between items-center">
                                    <div className="flex flex-col min-w-0">
                                        <p className="text-[13px] font-bold text-slate-900 truncate">
                                            {cita.cliente?.nombres || cita.nombres || cita.nombre}
                                        </p>
                                        <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                                            <Clock size={12} />
                                            {new Date(cita.fecha).toLocaleString('es-MX', { 
                                                weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit' 
                                            })}
                                        </p>
                                    </div>
                                    <button className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center shrink-0">
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl p-6 border border-slate-100 text-center flex flex-col items-center justify-center shadow-xs">
                            <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-2">
                                <Calendar size={18} />
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium">No tienes reuniones próximas agendadas.</p>
                        </div>
                    )}
                </div>

                {/* Recordatorios Pendientes */}
                <div className="flex flex-col gap-3 mt-2">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-[12px] font-black uppercase tracking-widest text-slate-800 flex items-center gap-1.5">
                            <Bell size={14} className="text-rose-500" /> Recordatorios Pendientes
                        </h3>
                        {recordatoriosPendientes.length > 0 && (
                            <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">{recordatoriosPendientes.length} pendientes</span>
                        )}
                    </div>

                    {recordatoriosPendientes.length > 0 ? (
                        <div className="flex flex-col gap-2.5">
                            {recordatoriosPendientes.map((rec, i) => (
                                <div key={i} className="bg-white rounded-2xl p-3.5 border-l-4 border-l-rose-500 border border-slate-100 shadow-xs flex justify-between items-center">
                                    <div className="flex flex-col min-w-0">
                                        <p className="text-[13px] font-bold text-slate-900 truncate">
                                            {rec.nombres || rec.nombre || 'Sin nombre'}
                                        </p>
                                        <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                                            <Phone size={12} />
                                            {rec.telefono || 'Sin número'}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end shrink-0">
                                        <span className="text-[10px] font-bold text-rose-500 mb-1">
                                            {new Date(rec.proximaLlamada).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                                        </span>
                                        <button className="w-7 h-7 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center">
                                            <ChevronRight size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl p-6 border border-slate-100 text-center flex flex-col items-center justify-center shadow-xs">
                            <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-2">
                                <CheckCircle2 size={18} />
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium">Todos tus recordatorios están al día.</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default DashboardMobile;
