import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    TrendingUp, Users, Phone, Target, 
    Calendar, Bell, AlertTriangle, 
    ChevronRight, ArrowRight, BarChart3, 
    DollarSign, CheckCircle2 
} from 'lucide-react';
import StatCard from '../components/ui/StatCard';

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
    teamTasks,
    periodo, 
    setPeriodo 
}) => {
    const [activeTab, setActiveTab] = useState('resumen');

    // Cálculos rápidos (reutilizados del dashboard original pero simplificados)
    const mP = vendedorData.periodos?.[periodo] || {};
    const totalEntrada = vendedorData.embudo.total || 0;
    const enContacto = vendedorData.embudo.en_contacto || 0;
    const negociacion = (vendedorData.embudo.reunion_agendada || 0) + (closerData.embudo.reunion_realizada || 0);
    const ganadas = closerData.embudo.venta_ganada || 0;
    
    const formatMoney = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });

    const tabs = [
        { key: 'resumen', label: 'Resumen', icon: TrendingUp },
        { key: 'pendientes', label: 'Tareas', icon: Bell },
        { key: 'metricas', label: 'KPIs', icon: BarChart3 },
    ];

    return (
        <div className="flex flex-col gap-6 pb-12">
            
            {/* ── Period Selector (Pills) ── */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-800 tracking-tight">Mi Actividad</h2>
                <div className="flex bg-white/50 backdrop-blur-md p-1 rounded-xl border border-white/40 shadow-sm">
                    {PERIODOS.map((p) => (
                        <button
                            key={p.key}
                            onClick={() => setPeriodo(p.key)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                periodo === p.key 
                                ? 'bg-(--theme-500) text-white shadow-md' 
                                : 'text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Top Metrics Grid ── */}
            <div className="grid grid-cols-2 gap-3">
                <StatCard title="Entrada" value={totalEntrada} icon="📥" color="blue" />
                <StatCard title="Ganadas" value={ganadas} icon="🏆" color="yellow" />
                <StatCard title="Llamadas" value={mP.llamadas || 0} icon="📞" color="green" />
                <StatCard title="Cierres $" value={formatMoney.format(closerData.metricas.ventas.montoMes || 0)} icon="💰" color="purple" />
            </div>

            {/* ── Simplified Pipeline (Vertical) ── */}
            <div className="bg-white/80 backdrop-blur-xl border border-white/40 rounded-3xl p-5 shadow-sm overflow-hidden relative premium-reflejo">
                <div className="flex items-center gap-2 mb-6">
                    <Target className="w-4 h-4 text-(--theme-500)" />
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Pipeline Comercial</span>
                </div>
                
                <div className="space-y-6 relative">
                    {/* Línea conectora */}
                    <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-slate-100" />
                    
                    {[
                        { label: 'Prospectos Nuevos', val: totalEntrada, color: 'bg-blue-500', icon: Users },
                        { label: 'En Contacto', val: enContacto, color: 'bg-(--theme-500)', icon: Phone },
                        { label: 'Negociación', val: negociacion, color: 'bg-indigo-500', icon: Calendar },
                        { label: 'Ventas Cerradas', val: ganadas, color: 'bg-emerald-500', icon: CheckCircle2 },
                    ].map((step, i) => (
                        <div key={i} className="flex items-center gap-4 relative z-10">
                            <div className={`w-10 h-10 rounded-full ${step.color} border-4 border-white shadow-sm flex items-center justify-center text-white`}>
                                <step.icon size={16} />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{step.label}</span>
                                    <span className="text-sm font-black text-slate-800">{step.val}</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-100 rounded-full mt-2 overflow-hidden">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: totalEntrada > 0 ? `${(step.val / totalEntrada) * 100}%` : '0%' }}
                                        className={`h-full ${step.color}`}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Navigation Tabs ── */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 bg-slate-100/50 p-1.5 rounded-2xl">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                activeTab === tab.key 
                                ? 'bg-white text-(--theme-600) shadow-sm' 
                                : 'text-slate-400'
                            }`}
                        >
                            <tab.icon size={14} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    {activeTab === 'resumen' && (
                        <motion.div 
                            key="resumen"
                            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                            className="bg-white/60 backdrop-blur-md border border-white/40 rounded-3xl p-5"
                        >
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Próximas Citas</h3>
                            <div className="space-y-3">
                                {reuniones.slice(0, 3).map((r, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-(--theme-50) flex items-center justify-center text-(--theme-600)">
                                                <Calendar size={18} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-slate-800 uppercase tracking-tight">{r.cliente?.nombres || 'Cliente'}</span>
                                                <span className="text-[10px] font-bold text-slate-400">{new Date(r.fecha).toLocaleDateString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </div>
                                        <ChevronRight size={16} className="text-slate-300" />
                                    </div>
                                ))}
                                {reuniones.length === 0 && <p className="text-[10px] text-center text-slate-400 py-4 font-bold uppercase">No hay citas pendientes</p>}
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'pendientes' && (
                        <motion.div 
                            key="pendientes"
                            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                            className="bg-white/60 backdrop-blur-md border border-white/40 rounded-3xl p-5"
                        >
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Recordatorios Urgentes</h3>
                            <div className="space-y-3">
                                {recordatorios.slice(0, 5).map((rec, i) => (
                                    <div key={i} className={`flex items-center justify-between p-3 rounded-2xl border shadow-sm ${
                                        new Date(rec.proximaLlamada) < new Date() ? 'bg-rose-50 border-rose-100' : 'bg-white border-slate-100'
                                    }`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                                new Date(rec.proximaLlamada) < new Date() ? 'bg-rose-100 text-rose-500' : 'bg-orange-50 text-orange-500'
                                            }`}>
                                                <Bell size={18} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-slate-800 uppercase tracking-tight">{rec.nombres || rec.nombre}</span>
                                                <span className="text-[10px] font-bold text-slate-400">{rec.telefono || 'Sin número'}</span>
                                            </div>
                                        </div>
                                        <ArrowRight size={16} className="text-slate-300" />
                                    </div>
                                ))}
                                {recordatorios.length === 0 && <p className="text-[10px] text-center text-slate-400 py-4 font-bold uppercase">Todo al día</p>}
                            </div>

                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mt-8 mb-4">Tareas de Equipo</h3>
                            <div className="space-y-3">
                                {teamTasks.map((t, i) => (
                                    <div key={i} className={`p-4 rounded-2xl border shadow-sm ${t.estado === 'completada' ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-100'}`}>
                                        <div className="flex items-start gap-3">
                                            <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                                                t.prioridad === 'alta' ? 'bg-rose-500' :
                                                t.prioridad === 'media' ? 'bg-amber-500' :
                                                'bg-blue-500'
                                            }`} />
                                            <div className="flex-1 min-w-0">
                                                <span className={`text-xs font-black uppercase tracking-tight block ${t.estado === 'completada' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                                                    {t.titulo}
                                                </span>
                                                {t.descripcion && <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{t.descripcion}</p>}
                                                <div className="flex items-center gap-3 mt-2">
                                                    <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                                                        <Users size={10} />
                                                        {t.vendedorNombre}
                                                    </span>
                                                    {t.fechaLimite && (
                                                        <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                                                            <Calendar size={10} />
                                                            {new Date(t.fechaLimite).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {teamTasks.length === 0 && <p className="text-[10px] text-center text-slate-400 py-4 font-bold uppercase">Sin tareas de equipo</p>}
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'metricas' && (
                        <motion.div 
                            key="metricas"
                            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                            className="space-y-4"
                        >
                            {[
                                { label: 'Tasa de Contacto', val: vendedorData.tasasConversion.contacto, color: 'text-blue-500' },
                                { label: 'Tasa de Cierre', val: closerData.tasasConversion.cierre, color: 'text-emerald-500' },
                            ].map((kpi, i) => (
                                <div key={i} className="bg-white/80 backdrop-blur-xl border border-white/40 rounded-3xl p-5 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{kpi.label}</p>
                                            <p className={`text-2xl font-black mt-1 ${kpi.color}`}>{kpi.val.toFixed(1)}%</p>
                                        </div>
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-50`}>
                                            <BarChart3 size={24} className="text-slate-300" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {(vendedorData.tasasConversion.contacto < 30 || closerData.tasasConversion.cierre < 30) && (
                                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-center gap-3">
                                    <AlertTriangle className="text-amber-500 shrink-0" size={20} />
                                    <p className="text-xs font-bold text-amber-700 leading-tight uppercase tracking-tight">Detectamos etapas débiles en tu embudo. Revisa tus seguimientos.</p>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

        </div>
    );
};

export default DashboardMobile;
