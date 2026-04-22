import React, { useRef, useState, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
    Edit2, Trash2, X, Plus, CreditCard, FolderOpen, Package,
    FileText, CheckCircle2, Upload, FilePlus, ChevronDown, Eye, Download,
    ShoppingBag, Repeat, TrendingUp, Star
} from 'lucide-react';
import { getToken } from '../utils/authUtils';
import API_URL from '../config/api';

export default function ModulosCliente({
    customSections,
    updateSeccion,
    commitSecciones,
    deleteSeccion,
    onAgregar,
    clienteId,
    rolePath,
    handleGuardarSeccionesPersonalizadas,
    visibleSectionIds = null,
    showAddCard = true,
    containerClassName = 'mt-6',
    fixedCardHeightClass = '',
    horizontalPayments = false,
    children
}) {
    const fileInputRef = useRef(null);
    const [uploadingToSeccion, setUploadingToSeccion] = useState(null);

    // Asegurar que customSections sea un array (por si viene como string JSON del backend)
    const sections = useMemo(() => {
        if (Array.isArray(customSections)) return customSections;
        if (typeof customSections === 'string') {
            try {
                return JSON.parse(customSections || '[]');
            } catch (e) {
                return [];
            }
        }
        return [];
    }, [customSections]);

    const visibleSections = useMemo(() => {
        if (!Array.isArray(visibleSectionIds) || visibleSectionIds.length === 0) {
            return sections;
        }
        const allowed = new Set(visibleSectionIds.map(id => String(id)));
        return sections.filter(seccion => allowed.has(String(seccion.id)));
    }, [sections, visibleSectionIds]);

    const handleFileUpload = async (e, seccionId) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            toast.error('Solo se permiten archivos PDF');
            return;
        }

        if (file.size > 15 * 1024 * 1024) {
            toast.error('El archivo excede el límite de 15MB');
            return;
        }

        setUploadingToSeccion(seccionId);
        const formData = new FormData();
        formData.append('archivo', file);

        try {
            const res = await axios.post(`${API_URL}/api/documentos/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'x-auth-token': getToken()
                }
            });

            const nuevaUrl = res.data.url;
            const nuevoNombre = res.data.nombreArchivo;

            const seccion = sections.find(s => s.id === seccionId);
            const nuevoContenido = [...(seccion.contenido || [])];
            nuevoContenido.push({
                id: Date.now().toString(),
                nombre: nuevoNombre,
                url: nuevaUrl,
                fechaInicio: new Date().toISOString().slice(0, 10),
                fechaVencimiento: ''
            });

            updateSeccion(seccionId, 'contenido', nuevoContenido);
            toast.success('Documento subido correctamente');
            
            // Forzamos guardar en BD después de subir
            setTimeout(() => {
                handleGuardarSeccionesPersonalizadas();
            }, 500);
            
        } catch (error) {
            console.error('Error subiendo archivo:', error);
            toast.error('Error al subir el documento');
        } finally {
            setUploadingToSeccion(null);
            e.target.value = '';
        }
    };

    const renderModuloPayments = (seccion) => {
        const pagos = Array.isArray(seccion.contenido) ? seccion.contenido : [];
        return (
            <div className="flex flex-col flex-1 min-h-0 space-y-3">
                <div className={`${horizontalPayments ? 'flex gap-2 overflow-x-auto hide-scrollbar pb-1' : 'space-y-2 overflow-y-auto hide-scrollbar pr-1'} flex-1 min-h-0`}>
                {pagos.map((pago, idx) => (
                    <div key={pago.id || idx} className={`bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-2 ${horizontalPayments ? 'min-w-[230px] max-w-[260px] shrink-0' : ''}`}>
                        <input
                            type="text"
                            value={pago.descripcion || ''}
                            onChange={(e) => {
                                const newCont = [...pagos];
                                newCont[idx].descripcion = e.target.value;
                                updateSeccion(seccion.id, 'contenido', newCont);
                            }}
                            onBlur={commitSecciones}
                            placeholder="Descripción (ej. Mes Abril)"
                            className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded outline-none focus:ring-1 focus:ring-(--theme-300)"
                        />
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-1 w-full sm:w-auto min-w-[120px]">
                                <span className="text-slate-400 text-xs font-bold">$</span>
                                <input
                                    type="number"
                                    value={pago.monto || ''}
                                    onChange={(e) => {
                                        const newCont = [...pagos];
                                        newCont[idx].monto = e.target.value;
                                        updateSeccion(seccion.id, 'contenido', newCont);
                                    }}
                                    onBlur={commitSecciones}
                                    placeholder="0.00"
                                    className="w-full sm:w-24 text-xs px-2 py-1.5 border border-slate-200 rounded outline-none focus:ring-1 focus:ring-(--theme-300)"
                                />
                            </div>
                            <select
                                value={pago.estado || 'pendiente'}
                                onChange={(e) => {
                                    const newCont = [...pagos];
                                    newCont[idx].estado = e.target.value;
                                    updateSeccion(seccion.id, 'contenido', newCont);
                                    commitSecciones();
                                }}
                                className={`w-full sm:w-auto min-w-[130px] text-xs px-2 py-1.5 border border-slate-200 rounded outline-none ${
                                    pago.estado === 'pagado' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                                }`}
                            >
                                <option value="pendiente">Pendiente</option>
                                <option value="pagado">Pagado</option>
                                <option value="vencido">Vencido</option>
                            </select>
                            <input
                                type="date"
                                value={pago.fecha || ''}
                                onChange={(e) => {
                                    const newCont = [...pagos];
                                    newCont[idx].fecha = e.target.value;
                                    updateSeccion(seccion.id, 'contenido', newCont);
                                    commitSecciones();
                                }}
                                className="w-full sm:w-auto min-w-[145px] text-xs px-2 py-1.5 border border-slate-200 rounded outline-none"
                            />
                            <button
                                onClick={() => {
                                    const newCont = pagos.filter((_, i) => i !== idx);
                                    updateSeccion(seccion.id, 'contenido', newCont);
                                    commitSecciones();
                                }}
                                className="sm:ml-auto p-1.5 text-slate-300 hover:text-red-500 rounded bg-white border border-slate-200"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                ))}
                </div>
                <button
                    onClick={() => {
                        const newCont = [...pagos, { id: Date.now().toString(), descripcion: '', monto: '', estado: 'pendiente', fecha: new Date().toISOString().slice(0,10) }];
                        updateSeccion(seccion.id, 'contenido', newCont);
                    }}
                    className="flex items-center justify-center gap-1.5 w-full py-2 border border-dashed border-slate-300 rounded-lg text-xs font-bold text-slate-500 hover:text-(--theme-600) hover:bg-(--theme-50) hover:border-(--theme-300) transition-all"
                >
                    <Plus className="w-3.5 h-3.5" /> Registrar Nuevo Pago
                </button>
            </div>
        );
    };

    const renderModuloContracts = (seccion) => {
        const contratos = Array.isArray(seccion.contenido) ? seccion.contenido : [];
        return (
            <div className="flex flex-col flex-1 min-h-0 space-y-3">
                <input 
                    type="file" 
                    accept=".pdf,application/pdf"
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={(e) => handleFileUpload(e, uploadingToSeccion)} 
                />
                
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 hide-scrollbar min-h-0">
                    {contratos.map((contrato, idx) => (
                        <div key={contrato.id || idx} className="flex flex-col bg-slate-50 p-3 rounded-lg border border-slate-100 gap-3 group/contract relative">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                                {/* PDF Icon style */}
                                <div className="p-2.5 bg-rose-100 text-rose-600 rounded-lg shrink-0 shadow-sm border border-rose-200">
                                    <FileText className="w-5 h-5" />
                                    <div className="text-[7px] font-black absolute -bottom-1 -right-1 bg-rose-500 text-white px-1 rounded-sm border border-white">PDF</div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <input
                                        type="text"
                                        value={contrato.nombre || ''}
                                        onChange={(e) => {
                                            const newCont = [...contratos];
                                            newCont[idx].nombre = e.target.value;
                                            updateSeccion(seccion.id, 'contenido', newCont);
                                        }}
                                        onBlur={commitSecciones}
                                        placeholder="Nombre del documento (ej. Contrato Confidencialidad)"
                                        className="w-full text-sm font-bold bg-transparent border-none outline-none focus:ring-1 focus:ring-rose-300 rounded px-1 -ml-1 text-slate-700 placeholder:font-normal placeholder:text-slate-400"
                                    />
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Vencimiento:</span>
                                        <input
                                            type="date"
                                            value={contrato.fechaVencimiento || ''}
                                            onChange={(e) => {
                                                const newCont = [...contratos];
                                                newCont[idx].fechaVencimiento = e.target.value;
                                                updateSeccion(seccion.id, 'contenido', newCont);
                                                commitSecciones();
                                            }}
                                            className="text-[10px] px-1.5 py-0.5 border border-slate-200 rounded text-slate-600 outline-none bg-white focus:ring-1 focus:ring-rose-300"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        const newCont = contratos.filter((_, i) => i !== idx);
                                        updateSeccion(seccion.id, 'contenido', newCont);
                                        commitSecciones();
                                    }}
                                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0 opacity-0 group-hover/contract:opacity-100"
                                    title="Eliminar documento"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            {contrato.url && (
                                <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60">
                                    <a 
                                        href={API_URL + contrato.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
                                    >
                                        <Eye className="w-3.5 h-3.5" /> Ver PDF
                                    </a>
                                    <a 
                                        href={API_URL + contrato.url} 
                                        download={contrato.nombre || 'contrato'}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-rose-600 border border-rose-700 rounded-lg text-[10px] font-bold text-white hover:bg-rose-700 transition-colors shadow-sm"
                                    >
                                        <Download className="w-3.5 h-3.5" /> Descargar
                                    </a>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                
                <button
                    onClick={() => {
                        setUploadingToSeccion(seccion.id);
                        fileInputRef.current?.click();
                    }}
                    disabled={uploadingToSeccion === seccion.id}
                    className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-purple-200 bg-purple-50/50 rounded-xl text-xs font-bold text-purple-600 hover:bg-purple-50 hover:border-purple-300 transition-all mt-auto disabled:opacity-50"
                >
                    {uploadingToSeccion === seccion.id ? (
                        <span className="animate-pulse flex items-center gap-2">
                            <Upload className="w-4 h-4 animate-bounce" /> Subiendo archivo...
                        </span>
                    ) : (
                        <>
                            <FilePlus className="w-4 h-4" /> Subir Contrato (PDF)
                        </>
                    )}
                </button>
            </div>
        );
    };

    const renderModuloProducts = (seccion) => {
        const productos = Array.isArray(seccion.contenido) ? seccion.contenido : [];
        return (
            <div className="flex flex-col flex-1 min-h-0 space-y-3">
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 hide-scrollbar min-h-0">
                    {productos.map((producto, idx) => (
                        <div key={producto.id || idx} className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                            <div className="flex flex-wrap items-center gap-2">
                            <input
                                type="text"
                                value={producto.nombre || ''}
                                onChange={(e) => {
                                    const newCont = [...productos];
                                    newCont[idx].nombre = e.target.value;
                                    updateSeccion(seccion.id, 'contenido', newCont);
                                }}
                                onBlur={commitSecciones}
                                placeholder="Nombre del producto"
                                className="flex-1 min-w-40 text-xs px-2 py-1.5 border border-slate-200 rounded outline-none focus:ring-1 focus:ring-(--theme-300)"
                            />
                            <div className="flex items-center gap-1 min-w-[92px]">
                                <span className="text-[10px] text-slate-400">Cant:</span>
                                <input
                                    type="number"
                                    value={producto.cantidad || 1}
                                    onChange={(e) => {
                                        const newCont = [...productos];
                                        newCont[idx].cantidad = e.target.value;
                                        updateSeccion(seccion.id, 'contenido', newCont);
                                    }}
                                    onBlur={commitSecciones}
                                    className="w-14 text-xs px-2 py-1.5 border border-slate-200 rounded outline-none text-center"
                                />
                            </div>
                            <div className="flex items-center gap-1 min-w-[118px]">
                                <span className="text-slate-400 text-xs font-bold">$</span>
                                <input
                                    type="number"
                                    value={producto.precio || ''}
                                    onChange={(e) => {
                                        const newCont = [...productos];
                                        newCont[idx].precio = e.target.value;
                                        updateSeccion(seccion.id, 'contenido', newCont);
                                    }}
                                    onBlur={commitSecciones}
                                    placeholder="Precio"
                                    className="w-20 text-xs px-2 py-1.5 border border-slate-200 rounded outline-none"
                                />
                            </div>
                            <button
                                onClick={() => {
                                    const newCont = productos.filter((_, i) => i !== idx);
                                    updateSeccion(seccion.id, 'contenido', newCont);
                                    commitSecciones();
                                }}
                                className="sm:ml-auto p-1.5 text-slate-300 hover:text-red-500 rounded bg-white border border-slate-200"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            </div>
                        </div>
                    ))}
                </div>
                <button
                    onClick={() => {
                        const newCont = [...productos, { id: Date.now().toString(), nombre: '', cantidad: 1, precio: '' }];
                        updateSeccion(seccion.id, 'contenido', newCont);
                    }}
                    className="flex items-center justify-center gap-1.5 w-full py-2 border border-dashed border-slate-300 rounded-lg text-xs font-bold text-slate-500 hover:text-(--theme-600) hover:bg-(--theme-50) hover:border-(--theme-300) transition-all mt-auto"
                >
                    <Plus className="w-3.5 h-3.5" /> Añadir Producto
                </button>
            </div>
        );
    };

    const renderModuloSales = (seccion) => {
        const ventas = Array.isArray(seccion.contenido) ? seccion.contenido : [];
        const total = ventas.reduce((sum, v) => sum + (parseFloat(v.monto) || 0), 0);
        return (
            <div className="flex flex-col flex-1 min-h-0 space-y-2">
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 shrink-0">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Total ventas</span>
                    <span className="text-sm font-black text-emerald-700">${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 hide-scrollbar min-h-0">
                    {ventas.map((venta, idx) => (
                        <div key={venta.id || idx} className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 group/item">
                            <div className="flex items-start gap-2">
                                <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-md shrink-0 mt-0.5">
                                    <ShoppingBag className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 min-w-0 space-y-1.5">
                                    <input type="text" value={venta.descripcion || ''}
                                        onChange={(e) => { const n=[...ventas]; n[idx].descripcion=e.target.value; updateSeccion(seccion.id,'contenido',n); }}
                                        onBlur={commitSecciones}
                                        placeholder="Descripción del producto/servicio"
                                        className="w-full text-xs font-bold bg-transparent border-none outline-none text-slate-700 placeholder:font-normal placeholder:text-slate-400"
                                    />
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <div className="flex items-center gap-1">
                                            <span className="text-slate-400 text-[10px] font-bold">$</span>
                                            <input type="number" value={venta.monto || ''}
                                                onChange={(e) => { const n=[...ventas]; n[idx].monto=e.target.value; updateSeccion(seccion.id,'contenido',n); }}
                                                onBlur={commitSecciones}
                                                placeholder="0.00" className="w-20 text-[10px] px-1.5 py-0.5 border border-slate-200 rounded outline-none bg-white"
                                            />
                                        </div>
                                        <input type="date" value={venta.fecha || ''}
                                            onChange={(e) => { const n=[...ventas]; n[idx].fecha=e.target.value; updateSeccion(seccion.id,'contenido',n); commitSecciones(); }}
                                            className="text-[10px] px-1.5 py-0.5 border border-slate-200 rounded outline-none bg-white flex-1 min-w-[130px]"
                                        />
                                        <select value={venta.estado || 'completada'}
                                            onChange={(e) => { const n=[...ventas]; n[idx].estado=e.target.value; updateSeccion(seccion.id,'contenido',n); commitSecciones(); }}
                                            className={`text-[10px] px-1.5 py-0.5 border rounded outline-none ${
                                                venta.estado === 'completada' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                : venta.estado === 'cancelada' ? 'bg-red-50 text-red-700 border-red-200'
                                                : 'bg-amber-50 text-amber-700 border-amber-200'
                                            }`}>
                                            <option value="completada">Completada</option>
                                            <option value="pendiente">Pendiente</option>
                                            <option value="cancelada">Cancelada</option>
                                        </select>
                                    </div>
                                </div>
                                <button onClick={() => { const n=ventas.filter((_,i)=>i!==idx); updateSeccion(seccion.id,'contenido',n); commitSecciones(); }}
                                    className="p-1 text-slate-200 hover:text-red-500 rounded opacity-0 group-hover/item:opacity-100 transition-all shrink-0"
                                ><Trash2 className="w-3 h-3" /></button>
                            </div>
                        </div>
                    ))}
                </div>
                <button
                    onClick={() => {
                        const n = [...ventas, { id: Date.now().toString(), descripcion: '', monto: '', estado: 'completada', fecha: new Date().toISOString().slice(0,10) }];
                        updateSeccion(seccion.id, 'contenido', n);
                    }}
                    className="flex items-center justify-center gap-1.5 w-full py-2 border border-dashed border-emerald-300 rounded-lg text-xs font-bold text-emerald-600 hover:bg-emerald-50 hover:border-emerald-400 transition-all mt-auto shrink-0"
                >
                    <Plus className="w-3.5 h-3.5" /> Registrar Venta
                </button>
            </div>
        );
    };

    const renderModuloSubscriptions = (seccion) => {
        const subs = Array.isArray(seccion.contenido) ? seccion.contenido : [];
        const activasCount = subs.filter(s => s.estado === 'activa').length;
        return (
            <div className="flex flex-col flex-1 min-h-0 space-y-2">
                <div className="flex items-center justify-between bg-violet-50 border border-violet-100 rounded-lg px-3 py-2 shrink-0">
                    <span className="text-[10px] font-bold text-violet-700 uppercase tracking-wider">Suscripciones activas</span>
                    <span className="text-sm font-black text-violet-700">{activasCount} / {subs.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 hide-scrollbar min-h-0">
                    {subs.map((sub, idx) => (
                        <div key={sub.id || idx} className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 group/item">
                            <div className="flex items-start gap-2">
                                <div className="p-1.5 bg-violet-100 text-violet-600 rounded-md shrink-0 mt-0.5">
                                    <Repeat className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 min-w-0 space-y-1.5">
                                    <input type="text" value={sub.nombre || ''}
                                        onChange={(e) => { const n=[...subs]; n[idx].nombre=e.target.value; updateSeccion(seccion.id,'contenido',n); }}
                                        onBlur={commitSecciones}
                                        placeholder="Nombre de la suscripción"
                                        className="w-full text-xs font-bold bg-transparent border-none outline-none text-slate-700 placeholder:font-normal placeholder:text-slate-400"
                                    />
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <div className="flex items-center gap-1">
                                            <span className="text-slate-400 text-[10px] font-bold">$</span>
                                            <input type="number" value={sub.monto || ''}
                                                onChange={(e) => { const n=[...subs]; n[idx].monto=e.target.value; updateSeccion(seccion.id,'contenido',n); }}
                                                onBlur={commitSecciones}
                                                placeholder="0.00" className="w-20 text-[10px] px-1.5 py-0.5 border border-slate-200 rounded outline-none bg-white"
                                            />
                                        </div>
                                        <select value={sub.ciclo || 'mensual'}
                                            onChange={(e) => { const n=[...subs]; n[idx].ciclo=e.target.value; updateSeccion(seccion.id,'contenido',n); commitSecciones(); }}
                                            className="text-[10px] px-1.5 py-0.5 border border-slate-200 rounded outline-none bg-white">
                                            <option value="semanal">Semanal</option>
                                            <option value="mensual">Mensual</option>
                                            <option value="trimestral">Trimestral</option>
                                            <option value="anual">Anual</option>
                                        </select>
                                        <select value={sub.estado || 'activa'}
                                            onChange={(e) => { const n=[...subs]; n[idx].estado=e.target.value; updateSeccion(seccion.id,'contenido',n); commitSecciones(); }}
                                            className={`text-[10px] px-1.5 py-0.5 border rounded outline-none ${
                                                sub.estado === 'activa' ? 'bg-violet-50 text-violet-700 border-violet-200'
                                                : sub.estado === 'pausada' ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                : 'bg-slate-50 text-slate-500 border-slate-200'
                                            }`}>
                                            <option value="activa">Activa</option>
                                            <option value="pausada">Pausada</option>
                                            <option value="cancelada">Cancelada</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-slate-400">Renovación:</span>
                                        <input type="date" value={sub.proximaRenovacion || ''}
                                            onChange={(e) => { const n=[...subs]; n[idx].proximaRenovacion=e.target.value; updateSeccion(seccion.id,'contenido',n); commitSecciones(); }}
                                            className="text-[10px] px-1.5 py-0.5 border border-slate-200 rounded outline-none bg-white"
                                        />
                                    </div>
                                </div>
                                <button onClick={() => { const n=subs.filter((_,i)=>i!==idx); updateSeccion(seccion.id,'contenido',n); commitSecciones(); }}
                                    className="p-1 text-slate-200 hover:text-red-500 rounded opacity-0 group-hover/item:opacity-100 transition-all shrink-0"
                                ><Trash2 className="w-3 h-3" /></button>
                            </div>
                        </div>
                    ))}
                </div>
                <button
                    onClick={() => {
                        const n = [...subs, { id: Date.now().toString(), nombre: '', monto: '', estado: 'activa', ciclo: 'mensual', proximaRenovacion: '' }];
                        updateSeccion(seccion.id, 'contenido', n);
                    }}
                    className="flex items-center justify-center gap-1.5 w-full py-2 border border-dashed border-violet-300 rounded-lg text-xs font-bold text-violet-600 hover:bg-violet-50 hover:border-violet-400 transition-all mt-auto shrink-0"
                >
                    <Plus className="w-3.5 h-3.5" /> Agregar Suscripción
                </button>
            </div>
        );
    };

    return (
        <div className={`grid grid-cols-1 xl:grid-cols-2 gap-4 ${containerClassName}`}>
            {children}
            {visibleSections.map(seccion => (
                <div key={seccion.id} className={`bg-white border border-slate-200 rounded-xl p-4 shadow-sm group flex flex-col overflow-hidden ${fixedCardHeightClass || 'min-h-[220px] h-full'}`}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2 flex-1 group/title relative">
                            {seccion.tipo === 'payments' && <CreditCard className="w-5 h-5 text-green-500 shrink-0" />}
                            {seccion.tipo === 'contracts' && <FolderOpen className="w-5 h-5 text-purple-500 shrink-0" />}
                            {seccion.tipo === 'products' && <Package className="w-5 h-5 text-blue-500 shrink-0" />}
                            {seccion.tipo === 'sales' && <ShoppingBag className="w-5 h-5 text-emerald-500 shrink-0" />}
                            {seccion.tipo === 'subscriptions' && <Repeat className="w-5 h-5 text-violet-500 shrink-0" />}
                            
                            <input
                                type="text"
                                value={seccion.titulo}
                                onChange={e => updateSeccion(seccion.id, 'titulo', e.target.value)}
                                onBlur={commitSecciones}
                                className="font-bold text-gray-800 text-sm bg-transparent border-none outline-none focus:ring-1 focus:ring-slate-100 rounded px-1 -ml-1 w-full hover:bg-slate-50 transition-colors cursor-text"
                                placeholder="Título del módulo"
                            />
                            <Edit2 className="w-3 h-3 text-slate-300 opacity-0 group-hover/title:opacity-100 transition-opacity pointer-events-none" />
                        </div>
                        <button
                            onClick={() => deleteSeccion(seccion.id)}
                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all ml-2 shrink-0"
                            title="Eliminar módulo"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex-1 min-h-0 flex flex-col overflow-y-auto pr-1 hide-scrollbar">
                        {seccion.tipo === 'payments' && renderModuloPayments(seccion)}
                        {seccion.tipo === 'contracts' && renderModuloContracts(seccion)}
                        {seccion.tipo === 'products' && renderModuloProducts(seccion)}
                        {seccion.tipo === 'sales' && renderModuloSales(seccion)}
                        {seccion.tipo === 'subscriptions' && renderModuloSubscriptions(seccion)}
                        
                        {/* Notas genéricas (mantener compatibilidad) */}
                        {seccion.tipo === 'note' && (
                            <textarea
                                value={seccion.contenido}
                                onChange={e => updateSeccion(seccion.id, 'contenido', e.target.value)}
                                onBlur={commitSecciones}
                                className="w-full bg-slate-50 border border-slate-100 rounded-lg p-3 text-xs focus:ring-1 focus:ring-(--theme-300) outline-none resize-none h-full min-h-[120px]"
                                placeholder="Escribe tus notas aquí..."
                            />
                        )}

                        {seccion.tipo === 'list' && (
                            <div className="space-y-2 flex-1">
                                {Array.isArray(seccion.contenido) && seccion.contenido.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={item.checked}
                                            onChange={e => {
                                                const newCont = [...seccion.contenido];
                                                newCont[idx].checked = e.target.checked;
                                                updateSeccion(seccion.id, 'contenido', newCont);
                                                commitSecciones();
                                            }}
                                            className="w-4 h-4 text-(--theme-500) rounded border-slate-300 focus:ring-(--theme-500)"
                                        />
                                        <input
                                            type="text"
                                            value={item.text}
                                            onChange={e => {
                                                const newCont = [...seccion.contenido];
                                                newCont[idx].text = e.target.value;
                                                updateSeccion(seccion.id, 'contenido', newCont);
                                            }}
                                            onBlur={commitSecciones}
                                            className={`flex-1 text-xs bg-transparent border-none outline-none focus:ring-1 focus:ring-slate-100 rounded px-1 py-0.5 ${item.checked ? 'line-through text-slate-400' : 'text-slate-700'}`}
                                            placeholder="Elemento de lista"
                                        />
                                        <button
                                            onClick={() => {
                                                const newCont = seccion.contenido.filter((_, i) => i !== idx);
                                                updateSeccion(seccion.id, 'contenido', newCont);
                                                commitSecciones();
                                            }}
                                            className="p-1 text-slate-300 hover:text-red-500"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    onClick={() => {
                                        const actual = Array.isArray(seccion.contenido) ? seccion.contenido : [];
                                        const newCont = [...actual, { text: '', checked: false }];
                                        updateSeccion(seccion.id, 'contenido', newCont);
                                    }}
                                    className="text-[10px] text-(--theme-600) hover:text-(--theme-700) font-bold flex items-center gap-1 mt-3 uppercase tracking-wider"
                                >
                                    <Plus className="w-3 h-3" /> Añadir elemento
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            ))}

            {showAddCard && (
                <div className={`${(visibleSections.length + React.Children.count(children)) % 2 === 0 ? 'xl:col-span-2' : ''}`}>
                    <button
                        onClick={onAgregar}
                        className="w-full group flex flex-col items-center justify-center gap-4 p-8 bg-slate-50 hover:bg-(--theme-50)/30 border-[3px] border-dashed border-slate-300 hover:border-(--theme-400) rounded-2xl transition-all duration-300 min-h-[220px] h-full"
                    >
                        <div className="w-14 h-14 flex items-center justify-center bg-white rounded-full shadow-sm text-slate-400 group-hover:text-(--theme-500) group-hover:scale-110 transition-all border border-slate-100">
                            <Plus className="w-7 h-7" />
                        </div>
                        <div className="text-center">
                            <p className="text-xs font-black text-slate-500 uppercase tracking-widest group-hover:text-(--theme-600) transition-colors">Añadir Módulo</p>
                            <p className="text-[10px] text-slate-400 mt-1">Pagos, contratos, productos, etc.</p>
                        </div>
                    </button>
                </div>
            )}
        </div>
    );
}
