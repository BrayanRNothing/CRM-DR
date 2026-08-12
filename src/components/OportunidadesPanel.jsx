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
    containerClassName = ''
}) {
    const [oportunidades, setOportunidades] = useState([]);
    const [loading, setLoading] = useState(true);
    const fileInputRef = useRef(null);

    const [kanbanColumns, setKanbanColumns] = useState([]);

    const DEFAULT_KANBAN_COLUMNS = [
        { id: 'nueva',        label: 'Nueva Oportunidad',  colorId: 'emerald' },
        { id: 'calificacion', label: 'Calificación',       colorId: 'blue' },
        { id: 'cotizacion',   label: 'Cotización Enviada', colorId: 'violet' },
        { id: 'negociacion',  label: 'En Negociación',     colorId: 'amber' },
        { id: 'ganada',       label: 'Venta Ganada',       colorId: 'emerald' },
        { id: 'perdida',      label: 'Perdida',            colorId: 'slate' }
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

    const getColumnClasses = (colorId, isCurrent, isCompleted) => {
        const colors = {
            slate: { active: 'bg-slate-500 text-white', completed: 'bg-slate-100 text-slate-600 border-slate-100', dot: 'bg-slate-500' },
            blue: { active: 'bg-blue-500 text-white', completed: 'bg-blue-100 text-blue-700 border-blue-100', dot: 'bg-blue-500' },
            violet: { active: 'bg-violet-500 text-white', completed: 'bg-violet-100 text-violet-700 border-violet-100', dot: 'bg-violet-500' },
            emerald: { active: 'bg-emerald-500 text-white', completed: 'bg-emerald-100 text-emerald-700 border-emerald-100', dot: 'bg-emerald-500' },
            amber: { active: 'bg-amber-500 text-white', completed: 'bg-amber-100 text-amber-700 border-amber-100', dot: 'bg-amber-500' },
            rose: { active: 'bg-rose-500 text-white', completed: 'bg-rose-100 text-rose-700 border-rose-100', dot: 'bg-rose-500' },
            cyan: { active: 'bg-cyan-500 text-white', completed: 'bg-cyan-100 text-cyan-700 border-cyan-100', dot: 'bg-cyan-500' },
            orange: { active: 'bg-orange-500 text-white', completed: 'bg-orange-100 text-orange-700 border-orange-100', dot: 'bg-orange-500' },
            teal: { active: 'bg-teal-500 text-white', completed: 'bg-teal-100 text-teal-700 border-teal-100', dot: 'bg-teal-500' },
            white: { active: 'bg-slate-700 text-white', completed: 'bg-slate-100 text-slate-700 border-slate-100', dot: 'bg-slate-700' }
        };
        const c = colors[colorId] || colors.slate;
        if (isCurrent) return { class: `${c.active} shadow-md scale-[1.02] z-10 font-bold border-transparent`, dot: c.dot };
        if (isCompleted) return { class: `${c.completed} font-semibold`, dot: '' };
        return { class: 'bg-slate-50 text-slate-400 border-slate-50', dot: '' };
    };

    useEffect(() => {
        cargarOportunidades();
    }, [clienteId]);

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
                } catch(e) {
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
            };
            
            payload.etapas_json = JSON.stringify({ actual: 0 });
            
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
                const isCerrada = false; // Removido por columnas dinámicas, el estado no se bloquea por etapas duras
                const etapaActual = opp.etapas_json ? (JSON.parse(opp.etapas_json)?.actual || 0) : 0;
                const url = opp.parsedContent?.url;
                const nombreArchivo = opp.parsedContent?.nombreArchivo;

                return (
                    <div key={opp.id} className={`border-2 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow group flex flex-col gap-5 relative overflow-hidden ${opp.etapa === 'ganada' ? 'bg-emerald-50/50 border-emerald-200/80' : 'bg-white border-slate-100'}`}>
                        {/* Header: Titulo & Valor */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="flex items-center gap-3 flex-1 w-full">
                                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl shadow-sm border border-blue-100">
                                    <Briefcase className="w-5 h-5" />
                                </div>
                                <div className="flex-1 relative group/title">
                                    <input
                                        type="text"
                                        value={opp.titulo}
                                        onChange={e => actualizarOportunidad(opp.id, { titulo: e.target.value })}
                                        className="font-black text-slate-800 text-xl bg-transparent border-b-2 border-transparent focus:border-blue-400 outline-none px-2 py-1.5 -ml-2 w-full hover:bg-slate-50 transition-colors placeholder:text-slate-300 placeholder:font-normal"
                                        placeholder="Nombre de la Oportunidad"
                                    />
                                    <Edit2 className="w-4 h-4 text-slate-300 opacity-0 group-hover/title:opacity-100 transition-opacity pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-4 shrink-0 bg-slate-50/80 px-4 py-2 rounded-xl border border-slate-100">
                                <div className="flex flex-col items-end">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Valor</label>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-xl font-bold text-emerald-600">$</span>
                                        <input 
                                            type="number"
                                            value={opp.monto || ''}
                                            onChange={e => actualizarOportunidad(opp.id, { monto: e.target.value })}
                                            placeholder="0.00"
                                            disabled={isCerrada}
                                            className="w-32 bg-transparent text-2xl font-black text-slate-700 outline-none border-b-2 border-transparent focus:border-emerald-500 pb-0.5 text-right transition-colors disabled:opacity-70"
                                        />
                                    </div>
                                </div>
                                <div className="w-[1px] h-10 bg-slate-200"></div>
                                <button
                                    onClick={() => eliminarOportunidad(opp.id)}
                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                                    title="Eliminar oportunidad"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Kanban Progress Bar */}
                        <div className="w-full">
                            <div className="flex w-full gap-2 overflow-x-auto hide-scrollbar">
                                {kanbanColumns.map((column, stepIdx) => {
                                    const etapaActual = Math.max(0, kanbanColumns.findIndex(c => c.id === opp.etapa));
                                    const isCompleted = stepIdx < etapaActual;
                                    const isCurrent = stepIdx === etapaActual;
                                    const styles = getColumnClasses(column.colorId || 'slate', isCurrent, isCompleted);
                                    
                                    return (
                                        <div 
                                            key={column.id}
                                            onClick={() => { if (!isCerrada) actualizarOportunidad(opp.id, { etapa: column.id }); }}
                                            className={`
                                                relative flex items-center justify-center min-w-[100px] flex-1 py-2 px-3 rounded-lg border transition-all duration-300
                                                ${!isCerrada ? 'cursor-pointer hover:shadow-sm hover:scale-[1.02]' : ''}
                                                ${styles.class}
                                            `}
                                        >
                                            <span className="text-[10px] font-black uppercase tracking-wider text-center leading-tight">
                                                {column.label}
                                            </span>
                                            {isCurrent && (
                                                <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full ${styles.dot} shadow-sm animate-pulse`}></div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Footer: Close buttons */}
                        {!isCerrada && (
                            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-center gap-3">
                                <button
                                    onClick={async () => {
                                        if (!opp.titulo || opp.titulo.trim() === '') {
                                            toast.error('La oportunidad necesita un título');
                                            return;
                                        }
                                        await actualizarOportunidad(opp.id, { etapa: 'perdida' });
                                    }}
                                    className="flex items-center gap-2 px-5 py-2.5 text-xs font-black rounded-xl border-2 border-red-100 text-red-500 bg-white hover:bg-red-50 hover:border-red-200 transition-all shadow-sm hover:shadow"
                                >
                                    <XCircle className="w-4 h-4" /> Perdida
                                </button>
                                
                                <button
                                    onClick={async () => {
                                        if (!opp.titulo || opp.titulo.trim() === '') {
                                            toast.error('La oportunidad necesita un título');
                                            return;
                                        }
                                        await actualizarOportunidad(opp.id, { etapa: 'ganada' });
                                        if (onOportunidadCerrada) onOportunidadCerrada(opp, 'venta');
                                    }}
                                    className="flex items-center gap-2 px-5 py-2.5 text-xs font-black rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 border-2 border-emerald-500 hover:border-emerald-600 transition-all shadow-sm hover:shadow-md shadow-emerald-500/20"
                                >
                                    <DollarSign className="w-4 h-4" /> Ganada (Venta)
                                </button>

                                <button
                                    onClick={async () => {
                                        if (!opp.titulo || opp.titulo.trim() === '') {
                                            toast.error('La oportunidad necesita un título');
                                            return;
                                        }
                                        await actualizarOportunidad(opp.id, { etapa: 'ganada' });
                                        if (onOportunidadCerrada) onOportunidadCerrada(opp, 'suscripcion');
                                    }}
                                    className="flex items-center gap-2 px-5 py-2.5 text-xs font-black rounded-xl bg-violet-500 text-white hover:bg-violet-600 border-2 border-violet-500 hover:border-violet-600 transition-all shadow-sm hover:shadow-md shadow-violet-500/20"
                                >
                                    <Star className="w-4 h-4" /> Ganada (Suscripción)
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
                    className="w-full group flex flex-col items-center justify-center gap-4 p-8 bg-slate-50 hover:bg-emerald-50/30 border-[3px] border-dashed border-slate-300 hover:border-emerald-400 rounded-2xl transition-all duration-300 min-h-[160px] h-full"
                >
                    <div className="w-14 h-14 flex items-center justify-center bg-white rounded-full shadow-sm text-slate-400 group-hover:text-emerald-500 group-hover:scale-110 transition-all border border-slate-100">
                        <Plus className="w-7 h-7" />
                    </div>
                    <div className="text-center">
                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest group-hover:text-emerald-600 transition-colors">Añadir Oportunidad de Venta</p>
                        <p className="text-[10px] text-slate-400 mt-1">Crea una nueva línea de tiempo para dar seguimiento a una venta</p>
                    </div>
                </button>
            </div>
        </div>
    );
}
