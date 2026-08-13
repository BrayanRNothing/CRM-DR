import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
    Edit2, Trash2, X, Plus, CheckCircle2, Upload, Target, FileText, XCircle, Star, DollarSign, Briefcase
} from 'lucide-react';
import { getToken } from '../utils/authUtils';
import API_URL from '../config/api';

export default function OportunidadesPanel({
    clienteId,
    onOportunidadCerrada, // Optional callback if we want to notify parent
    onOportunidadesChange, // Callback to notify parent of changes in opportunities
    containerClassName = ''
}) {
    const [oportunidades, setOportunidades] = useState([]);
    const [loading, setLoading] = useState(true);
    const fileInputRef = useRef(null);

    const [kanbanColumns, setKanbanColumns] = useState([]);

    const DEFAULT_KANBAN_COLUMNS = [
        { id: 'nueva', label: 'Nueva Oportunidad', colorId: 'emerald' },
        { id: 'calificacion', label: 'Calificación', colorId: 'blue' },
        { id: 'cotizacion', label: 'Cotización Enviada', colorId: 'violet' },
        { id: 'negociacion', label: 'En Negociación', colorId: 'amber' },
        { id: 'ganada', label: 'Venta Ganada', colorId: 'emerald' },
        { id: 'perdida', label: 'Perdida', colorId: 'slate' }
    ];

    useEffect(() => {
        try {
            const colsStr = localStorage.getItem('kanban_oportunidades_cols_v4');
            if (colsStr) {
                setKanbanColumns(JSON.parse(colsStr));
            } else {
                setKanbanColumns(DEFAULT_KANBAN_COLUMNS);
            }
        } catch (e) {
            setKanbanColumns(DEFAULT_KANBAN_COLUMNS);
        }
    }, []);

    const getColumnClasses = (colorId, isCurrent) => {
        const colors = {
            slate: { active: 'bg-slate-500 text-white', faded: 'bg-slate-50 text-slate-500 border-transparent' },
            blue: { active: 'bg-blue-500 text-white', faded: 'bg-blue-50 text-blue-500 border-transparent' },
            violet: { active: 'bg-violet-500 text-white', faded: 'bg-violet-50 text-violet-500 border-transparent' },
            emerald: { active: 'bg-emerald-500 text-white', faded: 'bg-emerald-50 text-emerald-600 border-transparent' },
            amber: { active: 'bg-amber-500 text-white', faded: 'bg-amber-50 text-amber-600 border-transparent' },
            rose: { active: 'bg-rose-500 text-white', faded: 'bg-rose-50 text-rose-500 border-transparent' },
            cyan: { active: 'bg-cyan-500 text-white', faded: 'bg-cyan-50 text-cyan-600 border-transparent' },
            orange: { active: 'bg-orange-500 text-white', faded: 'bg-orange-50 text-orange-500 border-transparent' },
            teal: { active: 'bg-teal-500 text-white', faded: 'bg-teal-50 text-teal-600 border-transparent' },
            white: { active: 'bg-slate-700 text-white', faded: 'bg-slate-50 text-slate-500 border-transparent' }
        };
        const c = colors[colorId] || colors.slate;
        if (isCurrent) return { class: `${c.active} shadow-sm font-bold border-transparent` };
        return { class: `${c.faded} font-medium opacity-80 hover:opacity-100` };
    };

    useEffect(() => {
        cargarOportunidades();
    }, [clienteId]);

    useEffect(() => {
        if (onOportunidadesChange) {
            onOportunidadesChange(oportunidades);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [oportunidades]);

    const cargarOportunidades = async () => {
        try {
            setLoading(true);
            const token = getToken();
            const res = await axios.get(`${API_URL}/api/oportunidades/${clienteId}`, {
                headers: { 'x-auth-token': token }
            });
            // Parsamos el JSON
            const data = res.data.map(opp => {
                let parsedContent = {};
                try {
                    parsedContent = opp.notas ? JSON.parse(opp.notas) : {};
                } catch (e) {
                    parsedContent = {};
                }

                return {
                    ...opp,
                    parsedContent
                };
            });
            setOportunidades(data);
        } catch (error) {
            console.error('Error cargando oportunidades:', error);
            // toast.error('Error al cargar oportunidades de venta');
        } finally {
            setLoading(false);
        }
    };

    const crearOportunidad = async () => {
        try {
            const token = getToken();
            const res = await axios.post(`${API_URL}/api/oportunidades`, {
                cliente_id: clienteId,
                titulo: `OP-${Math.floor(1000 + Math.random() * 9000)}`,
                monto: 0,
                etapa: kanbanColumns.length > 0 ? kanbanColumns[0].id : 'nueva',
                etapas_json: JSON.stringify({ actual: 0 }),
                notas: JSON.stringify({ url: null, nombreArchivo: null })
            }, {
                headers: { 'x-auth-token': token }
            });

            const newOpp = {
                ...res.data,
                parsedContent: { url: null, nombreArchivo: null }
            };
            setOportunidades([...oportunidades, newOpp]);
            toast.success('Oportunidad creada');
        } catch (error) {
            console.error('Error:', error);
            toast.error('Error al crear oportunidad');
        }
    };

    const actualizarOportunidad = async (id, campos) => {
        try {
            const token = getToken();

            // Actualizamos optimísticamente la UI
            setOportunidades(prev => prev.map(o => o.id === id ? { ...o, ...campos } : o));

            // Si viene parsedEtapas o actual o parsedContent, lo metemos en los campos nativos
            const oppActual = oportunidades.find(o => o.id === id);
            if (!oppActual) return;

            const payload = {
                titulo: campos.titulo !== undefined ? campos.titulo : oppActual.titulo,
                monto: campos.monto !== undefined ? (campos.monto === '' ? 0 : Number(campos.monto)) : oppActual.monto,
                etapa: campos.etapa !== undefined ? campos.etapa : oppActual.etapa,
                estado: campos.estado !== undefined ? campos.estado : oppActual.estado,
                etapas_json: campos.etapas_json !== undefined ? campos.etapas_json : (oppActual.etapas_json || '[]')
            };

            let currentContent = { ...oppActual.parsedContent, ...campos.parsedContent };
            payload.notas = JSON.stringify(currentContent);

            await axios.put(`${API_URL}/api/oportunidades/${id}`, payload, {
                headers: { 'x-auth-token': token }
            });

            // Opcional: Recargar si es necesario
        } catch (error) {
            console.error('Error:', error);
            toast.error('Error al actualizar');
            cargarOportunidades(); // Rollback
        }
    };

    const eliminarOportunidad = async (id) => {
        if (!window.confirm('¿Eliminar esta oportunidad?')) return;
        try {
            const token = getToken();
            await axios.delete(`${API_URL}/api/oportunidades/${id}`, {
                headers: { 'x-auth-token': token }
            });
            setOportunidades(prev => prev.filter(o => o.id !== id));
            toast.success('Eliminada correctamente');
        } catch (error) {
            console.error('Error:', error);
            toast.error('Error al eliminar');
        }
    };

    const handleFileUpload = async (e) => {
        if (!uploadingState || !e.target.files.length) return;
        const file = e.target.files[0];

        const formData = new FormData();
        formData.append('file', file);

        try {
            const token = getToken();
            const res = await axios.post(`${API_URL}/api/documentos/upload`, formData, {
                headers: { 'x-auth-token': token, 'Content-Type': 'multipart/form-data' }
            });

            const fileUrl = res.data.fileUrl;
            actualizarOportunidad(uploadingState.oppId, {
                parsedContent: { url: fileUrl, nombreArchivo: file.name }
            });

            toast.success('Archivo subido');
        } catch (error) {
            console.error('Error subiendo archivo', error);
            toast.error('Error al subir archivo');
        } finally {
            setUploadingState(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    if (loading) {
        return <div className="text-center p-4 text-slate-400">Cargando oportunidades...</div>;
    }

    return (
        <div className={`grid grid-cols-1 gap-4 ${containerClassName}`}>
            <input
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileUpload}
            />

            {oportunidades.map(opp => {
                const isCerrada = opp.estado === 'ganada' || opp.estado === 'perdida';
                const url = opp.parsedContent?.url;
                const nombreArchivo = opp.parsedContent?.nombreArchivo;

                // Estilos del contenedor de la tarjeta según el estado
                let cardStyles = 'bg-white border-slate-200';
                if (opp.estado === 'ganada') cardStyles = 'bg-emerald-50/50 border-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)] ring-1 ring-emerald-200';
                if (opp.estado === 'perdida') cardStyles = 'bg-slate-50/80 border-slate-300 opacity-90';

                return (
                    <div key={opp.id} className={`border rounded-xl p-4 shadow-sm hover:shadow transition-all group flex flex-col gap-4 relative overflow-hidden ${cardStyles}`}>
                        
                        {/* Marca de agua / Estampita visual para estado */}
                        {opp.estado === 'ganada' && (
                            <div className="absolute -right-6 top-6 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest px-8 py-1 rotate-45 shadow-sm z-10">
                                Ganada
                            </div>
                        )}
                        {opp.estado === 'perdida' && (
                            <div className="absolute -right-6 top-6 bg-slate-500 text-white text-[10px] font-black uppercase tracking-widest px-8 py-1 rotate-45 shadow-sm z-10">
                                Perdida
                            </div>
                        )}
                        {/* Header: Titulo & Valor */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-(--theme-50) text-(--theme-600) rounded-lg border border-(--theme-100)">
                                    <DollarSign className="w-4 h-4" />
                                </div>
                                <div className="relative group/title">
                                    <input
                                        type="text"
                                        value={opp.titulo}
                                        onChange={e => actualizarOportunidad(opp.id, { titulo: e.target.value })}
                                        disabled={isCerrada}
                                        className="font-bold text-slate-700 text-sm bg-transparent border border-transparent focus:border-slate-200 focus:bg-slate-50 rounded-lg outline-none px-2 py-1.5 w-48 sm:w-64 transition-colors placeholder:text-slate-300 placeholder:font-normal disabled:opacity-80"
                                        placeholder="Nombre de la Oportunidad"
                                    />
                                    {!isCerrada && <Edit2 className="w-3 h-3 text-slate-300 opacity-0 group-hover/title:opacity-100 transition-opacity pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />}
                                </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                                <div className="flex flex-col items-end">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Valor</label>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-lg font-bold text-(--theme-600) opacity-70">$</span>
                                        <input
                                            type="number"
                                            value={opp.monto || ''}
                                            onChange={e => actualizarOportunidad(opp.id, { monto: e.target.value })}
                                            placeholder="0.00"
                                            disabled={isCerrada}
                                            className="w-24 bg-transparent text-lg font-black text-slate-700 outline-none border-b-2 border-transparent focus:border-(--theme-400) pb-0.5 text-right transition-colors disabled:opacity-70"
                                        />
                                    </div>
                                </div>
                                <div className="w-[1px] h-8 bg-slate-200"></div>
                                <button
                                    onClick={() => eliminarOportunidad(opp.id)}
                                    className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-colors shrink-0"
                                    title="Eliminar oportunidad"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Kanban Progress Bar */}
                        <div className="w-full">
                            <div className="flex w-full gap-1 overflow-x-auto hide-scrollbar">
                                {kanbanColumns.map((column, stepIdx) => {
                                    const etapaActual = Math.max(0, kanbanColumns.findIndex(c => c.id === opp.etapa));
                                    const isCurrent = stepIdx === etapaActual;
                                    const styles = getColumnClasses(column.colorId || 'slate', isCurrent);

                                    return (
                                        <div
                                            key={column.id}
                                            onClick={() => { if (!isCerrada) actualizarOportunidad(opp.id, { etapa: column.id }); }}
                                            className={`
                                                relative flex items-center justify-center min-w-[80px] flex-1 py-1.5 px-2 rounded-md border transition-all duration-300
                                                ${!isCerrada ? 'cursor-pointer hover:shadow-sm' : ''}
                                                ${styles.class}
                                            `}
                                        >
                                            <span className="text-[9px] font-bold uppercase tracking-wider text-center leading-tight">
                                                {column.label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Footer: Close buttons */}
                        {!isCerrada && (
                            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-center gap-2">
                                <button
                                    onClick={async () => {
                                        if (!opp.titulo || opp.titulo.trim() === '') {
                                            toast.error('La oportunidad necesita un título');
                                            return;
                                        }
                                        await actualizarOportunidad(opp.id, { estado: 'perdida' });
                                        if (onOportunidadCerrada) onOportunidadCerrada(opp, 'perdida');
                                    }}
                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-lg border border-slate-200 text-slate-500 bg-white hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all shadow-sm"
                                >
                                    <XCircle className="w-3.5 h-3.5" /> Perdida
                                </button>

                                <button
                                    onClick={async () => {
                                        if (!opp.titulo || opp.titulo.trim() === '') {
                                            toast.error('La oportunidad necesita un título');
                                            return;
                                        }
                                        await actualizarOportunidad(opp.id, { estado: 'ganada' });
                                        if (onOportunidadCerrada) onOportunidadCerrada(opp, 'ganada', 'venta');
                                    }}
                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                                >
                                    <DollarSign className="w-3.5 h-3.5" /> Ganada (Venta)
                                </button>

                                <button
                                    onClick={async () => {
                                        if (!opp.titulo || opp.titulo.trim() === '') {
                                            toast.error('La oportunidad necesita un título');
                                            return;
                                        }
                                        await actualizarOportunidad(opp.id, { estado: 'ganada' });
                                        if (onOportunidadCerrada) onOportunidadCerrada(opp, 'ganada', 'suscripcion');
                                    }}
                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-lg border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-500 hover:text-white transition-all shadow-sm"
                                >
                                    <Star className="w-3.5 h-3.5" /> Ganada (Suscripción)
                                </button>
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Bóton Añadir Oportunidad */}
            <div className="w-full">
                <button
                    onClick={crearOportunidad}
                    className="w-full group flex flex-col items-center justify-center gap-3 p-5 bg-white hover:bg-slate-50 border border-dashed border-slate-300 hover:border-(--theme-400) rounded-xl transition-all duration-300 min-h-[120px]"
                >
                    <div className="w-10 h-10 flex items-center justify-center bg-slate-50 rounded-full text-slate-400 group-hover:text-(--theme-600) group-hover:scale-110 group-hover:bg-white transition-all border border-slate-100 shadow-sm">
                        <Plus className="w-5 h-5" />
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-(--theme-600) transition-colors">Añadir Oportunidad de Venta</p>
                        <p className="text-[9px] text-slate-400 mt-1">Crea una nueva línea de tiempo para dar seguimiento a una venta</p>
                    </div>
                </button>
            </div>
        </div>
    );
}
