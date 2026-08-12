import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
    Edit2, Trash2, X, Plus, CheckCircle2, Upload, Target, FileText
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
    const [uploadingState, setUploadingState] = useState(null);
    const fileInputRef = useRef(null);

    const defaultEtapas = ['Prospecto Nuevo', 'Cita Generada', 'Propuesta Enviada', 'Negociación', 'Cierre Ganado'];

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
                let parsedEtapas = [];
                try {
                    const parsed = JSON.parse(opp.etapas_json);
                    parsedEtapas = Array.isArray(parsed?.nombres) ? parsed.nombres : defaultEtapas;
                } catch(e) {
                    parsedEtapas = defaultEtapas;
                }
                
                let parsedContent = {};
                try {
                    parsedContent = opp.notas ? JSON.parse(opp.notas) : {};
                } catch(e) {
                    parsedContent = {};
                }

                return {
                    ...opp,
                    parsedEtapas,
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
                etapa: 'abierta',
                etapas_json: JSON.stringify({ nombres: defaultEtapas, actual: 0 }),
                notas: JSON.stringify({ url: null, nombreArchivo: null })
            }, {
                headers: { 'x-auth-token': token }
            });
            
            const newOpp = {
                ...res.data,
                parsedEtapas: defaultEtapas,
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
                monto: campos.monto !== undefined ? campos.monto : oppActual.monto,
                etapa: campos.etapa !== undefined ? campos.etapa : oppActual.etapa,
            };
            
            let currentParsedEtapas = campos.parsedEtapas !== undefined ? campos.parsedEtapas : oppActual.parsedEtapas;
            let currentEtapaActual = campos.etapaActual !== undefined ? campos.etapaActual : 
                (oppActual.etapas_json ? (JSON.parse(oppActual.etapas_json)?.actual || 0) : 0);
            
            payload.etapas_json = JSON.stringify({ nombres: currentParsedEtapas, actual: currentEtapaActual });
            
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
                const isCerrada = opp.etapa === 'ganada' || opp.etapa === 'perdida';
                const etapaActual = opp.etapas_json ? (JSON.parse(opp.etapas_json)?.actual || 0) : 0;
                const url = opp.parsedContent?.url;
                const nombreArchivo = opp.parsedContent?.nombreArchivo;

                return (
                    <div key={opp.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm group flex flex-col overflow-hidden h-auto min-h-[300px]">
                        {/* Header */}
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-2 flex-1 group/title relative">
                                <Target className="w-5 h-5 text-blue-500 shrink-0" />
                                <input
                                    type="text"
                                    value={opp.titulo}
                                    onChange={e => actualizarOportunidad(opp.id, { titulo: e.target.value })}
                                    className="font-bold text-gray-800 text-sm bg-transparent border-none outline-none focus:ring-1 focus:ring-slate-100 rounded px-1 -ml-1 w-full hover:bg-slate-50 transition-colors cursor-text"
                                    placeholder="Nombre de la Oportunidad"
                                />
                                <Edit2 className="w-3 h-3 text-slate-300 opacity-0 group-hover/title:opacity-100 transition-opacity pointer-events-none" />
                            </div>
                            <button
                                onClick={() => eliminarOportunidad(opp.id)}
                                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all ml-2 shrink-0"
                                title="Eliminar oportunidad"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-h-0 flex flex-col overflow-y-auto pr-1 hide-scrollbar">
                            <div className="flex flex-col flex-1">
                                <div className="flex items-center gap-4 flex-wrap bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
                                    <div className="flex-1 min-w-[200px]">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Valor Estimado</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                                            <input 
                                                type="number"
                                                value={opp.monto || ''}
                                                onChange={e => actualizarOportunidad(opp.id, { monto: e.target.value })}
                                                placeholder="0.00"
                                                disabled={isCerrada}
                                                className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all disabled:bg-slate-50"
                                            />
                                        </div>
                                    </div>
                                    <div className="shrink-0 flex flex-col justify-center">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block text-right">Estado</label>
                                        {!isCerrada ? (
                                            <div className="px-3 py-1 bg-amber-100 text-amber-700 font-black text-[10px] rounded-full uppercase tracking-wider border border-amber-200 shadow-sm animate-pulse">
                                                EN PROGRESO
                                            </div>
                                        ) : (
                                            <div className={`px-3 py-1 font-black text-[10px] rounded-full uppercase tracking-wider border shadow-sm ${opp.etapa === 'ganada' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                                                {opp.etapa === 'ganada' ? 'GANADA' : 'PERDIDA'}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Timeline */}
                                <div className="relative pt-6 pb-4 overflow-x-auto hide-scrollbar flex justify-center sm:justify-start">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center sm:min-w-max mx-auto px-2 gap-4 sm:gap-0 w-full sm:w-auto">
                                        {opp.parsedEtapas.map((etapa, stepIdx) => {
                                            const isCompleted = stepIdx < etapaActual;
                                            const isCurrent = stepIdx === etapaActual;
                                            const isLast = stepIdx === opp.parsedEtapas.length - 1;
                                            
                                            return (
                                                <div key={stepIdx} className="flex flex-row sm:flex-col items-center relative group/step w-full sm:w-auto sm:min-w-[120px]">
                                                    {/* Connecting Line */}
                                                    {!isLast && (
                                                        <>
                                                            <div className={`hidden sm:block absolute top-4 left-1/2 w-full h-[3px] z-0 ${isCompleted ? 'bg-blue-500' : 'bg-slate-200'}`}></div>
                                                            <div className={`sm:hidden absolute top-8 left-4 w-[3px] h-full z-0 ${isCompleted ? 'bg-blue-500' : 'bg-slate-200'}`}></div>
                                                        </>
                                                    )}
                                                    
                                                    {/* Step Node */}
                                                    <div 
                                                        className={`w-8 h-8 rounded-full flex items-center justify-center border-[3px] transition-colors z-10 bg-white shrink-0 ${!isCerrada ? 'cursor-pointer' : ''} ${
                                                            isCompleted ? 'border-blue-500 text-blue-500' : 
                                                            isCurrent ? 'border-blue-500 text-blue-500 ring-4 ring-blue-100' : 
                                                            'border-slate-300 text-slate-300'
                                                        }`}
                                                        onClick={() => { if (!isCerrada) actualizarOportunidad(opp.id, { etapaActual: stepIdx }); }}
                                                    >
                                                        {isCompleted ? <CheckCircle2 className="w-4 h-4 fill-blue-500 text-white" /> : (isCurrent ? <div className="w-2.5 h-2.5 rounded-full bg-blue-500" /> : null)}
                                                    </div>

                                                    {/* Editable Label */}
                                                    <input 
                                                        type="text"
                                                        value={etapa}
                                                        onChange={(e) => {
                                                            const newEtapas = [...opp.parsedEtapas];
                                                            newEtapas[stepIdx] = e.target.value;
                                                            actualizarOportunidad(opp.id, { parsedEtapas: newEtapas });
                                                        }}
                                                        className={`ml-3 sm:ml-0 sm:mt-2 text-[11px] font-bold sm:text-center text-left bg-transparent border-b border-transparent focus:border-blue-300 outline-none flex-1 sm:flex-none sm:w-[100px] truncate ${isCompleted || isCurrent ? 'text-slate-800' : 'text-slate-400'}`}
                                                        disabled={isCerrada}
                                                    />

                                                    {/* Delete step button */}
                                                    {!isCerrada && (
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const newEtapas = [...opp.parsedEtapas];
                                                                newEtapas.splice(stepIdx, 1);
                                                                actualizarOportunidad(opp.id, { 
                                                                    parsedEtapas: newEtapas,
                                                                    etapaActual: etapaActual >= newEtapas.length ? Math.max(0, newEtapas.length - 1) : etapaActual
                                                                });
                                                            }}
                                                            className="absolute sm:-top-1 sm:right-1/2 sm:translate-x-6 right-0 p-0.5 bg-red-100 text-red-500 rounded-full opacity-0 group-hover/step:opacity-100 transition-opacity z-20"
                                                            title="Eliminar etapa"
                                                        ><X className="w-3 h-3" /></button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                        
                                        {/* Add Step Button */}
                                        {!isCerrada && (
                                            <div className="flex flex-row sm:flex-col items-center justify-start sm:ml-2 sm:pt-1 mt-2 sm:mt-0 w-full sm:w-auto">
                                                <div className="w-8 flex justify-center shrink-0">
                                                    <button 
                                                        onClick={() => {
                                                            const newEtapas = [...opp.parsedEtapas];
                                                            newEtapas.push('Nueva Etapa');
                                                            actualizarOportunidad(opp.id, { parsedEtapas: newEtapas });
                                                        }}
                                                        className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-dashed border-slate-300 text-slate-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                                                        title="Añadir etapa"
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                    </button>
                                                </div>
                                                <span className="sm:hidden ml-3 text-[11px] font-bold text-slate-400">Añadir etapa</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Footer: Attachment & Close buttons */}
                                <div className="mt-2 pt-3 border-t border-slate-200/60 flex items-center justify-between gap-3 flex-wrap">
                                    <div className="flex items-center gap-2">
                                        {url ? (
                                            <div className="flex items-center gap-2">
                                                <a href={API_URL + url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-bold hover:bg-blue-100 transition-colors border border-blue-200">
                                                    <FileText className="w-3.5 h-3.5" /> {nombreArchivo || 'Cotización.pdf'}
                                                </a>
                                                {!isCerrada && (
                                                    <button 
                                                        onClick={() => actualizarOportunidad(opp.id, { parsedContent: { url: null, nombreArchivo: null } })}
                                                        className="p-1.5 text-slate-400 hover:text-red-500 rounded bg-white border border-slate-200"
                                                    ><Trash2 className="w-3.5 h-3.5" /></button>
                                                )}
                                            </div>
                                        ) : (
                                            !isCerrada && (
                                                <button 
                                                    onClick={() => {
                                                        setUploadingState({ oppId: opp.id });
                                                        fileInputRef.current?.click();
                                                    }}
                                                    disabled={uploadingState?.oppId === opp.id}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-slate-300 rounded-lg text-[10px] font-bold text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                                                >
                                                    {uploadingState?.oppId === opp.id ? <Upload className="w-3.5 h-3.5 animate-bounce" /> : <Upload className="w-3.5 h-3.5" />}
                                                    Adjuntar Cotización
                                                </button>
                                            )
                                        )}
                                    </div>

                                    {!isCerrada && (
                                        <div className="flex flex-wrap items-center gap-2 mt-3 sm:mt-0 w-full sm:w-auto justify-end">
                                            <button
                                                onClick={async () => {
                                                    if (!opp.titulo || opp.titulo.trim() === '') {
                                                        toast.error('Por favor asigna un nombre a la oportunidad');
                                                        return;
                                                    }
                                                    await actualizarOportunidad(opp.id, { etapa: 'perdida' });
                                                    if (onOportunidadCerrada) await onOportunidadCerrada(opp, 'perdida');
                                                }}
                                                className="px-3 py-1.5 rounded bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 text-[10px] font-bold transition-colors border border-red-200 w-full sm:w-auto flex-1 sm:flex-none min-w-[120px] text-center"
                                            >
                                                Cerrar Perdida
                                            </button>
                                            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                                                <button
                                                    onClick={async () => {
                                                        if (!opp.titulo || opp.titulo.trim() === '') {
                                                            toast.error('Por favor asigna un nombre a la oportunidad');
                                                            return;
                                                        }
                                                        if (!opp.monto || isNaN(parseFloat(opp.monto)) || parseFloat(opp.monto) <= 0) {
                                                            toast.error('Por favor ingresa un monto estimado mayor a $0 para registrar la venta');
                                                            return;
                                                        }
                                                        await actualizarOportunidad(opp.id, { etapa: 'ganada' });
                                                        if (onOportunidadCerrada) await onOportunidadCerrada(opp, 'ganada', 'venta');
                                                    }}
                                                    className="w-full sm:w-auto px-3 py-1.5 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 text-[10px] font-bold transition-colors border border-emerald-200 flex-1 min-w-[120px]"
                                                >
                                                    Ganada (Venta)
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        if (!opp.titulo || opp.titulo.trim() === '') {
                                                            toast.error('Por favor asigna un nombre a la oportunidad');
                                                            return;
                                                        }
                                                        if (!opp.monto || isNaN(parseFloat(opp.monto)) || parseFloat(opp.monto) <= 0) {
                                                            toast.error('Por favor ingresa un monto estimado mayor a $0 para registrar la suscripción');
                                                            return;
                                                        }
                                                        await actualizarOportunidad(opp.id, { etapa: 'ganada' });
                                                        if (onOportunidadCerrada) await onOportunidadCerrada(opp, 'ganada', 'suscripcion');
                                                    }}
                                                    className="w-full sm:w-auto px-3 py-1.5 rounded bg-violet-50 text-violet-600 hover:bg-violet-100 hover:text-violet-700 text-[10px] font-bold transition-colors border border-violet-200 flex-1 min-w-[120px]"
                                                >
                                                    Ganada (Suscripción)
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
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
