import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Plus, X, Settings2, GripVertical, Phone, Mail, Star, MessageSquare, Clock, Edit2, Trash2, Share2, Check, Palette, MoreHorizontal } from 'lucide-react';

/* ─── Paleta de colores para columnas ─── */
const COLUMN_COLORS = [
    { id: 'slate',   header: 'bg-slate-700',  badge: 'bg-slate-100 text-slate-700',   card: 'border-l-slate-400',  dot: 'bg-slate-500'  },
    { id: 'blue',    header: 'bg-blue-600',   badge: 'bg-blue-100 text-blue-700',     card: 'border-l-blue-400',   dot: 'bg-blue-500'   },
    { id: 'violet',  header: 'bg-violet-600', badge: 'bg-violet-100 text-violet-700', card: 'border-l-violet-400', dot: 'bg-violet-500' },
    { id: 'emerald', header: 'bg-emerald-600',badge: 'bg-emerald-100 text-emerald-700',card:'border-l-emerald-400', dot: 'bg-emerald-500'},
    { id: 'amber',   header: 'bg-amber-500',  badge: 'bg-amber-100 text-amber-700',   card: 'border-l-amber-400',  dot: 'bg-amber-500'  },
    { id: 'rose',    header: 'bg-rose-600',   badge: 'bg-rose-100 text-rose-700',     card: 'border-l-rose-400',   dot: 'bg-rose-500'   },
    { id: 'cyan',    header: 'bg-cyan-600',   badge: 'bg-cyan-100 text-cyan-700',     card: 'border-l-cyan-400',   dot: 'bg-cyan-500'   },
    { id: 'orange',  header: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700', card: 'border-l-orange-400', dot: 'bg-orange-500' },
];

const getColor = (id) => COLUMN_COLORS.find(c => c.id === id) || COLUMN_COLORS[0];

/* ─── Columnas por defecto ─── */
const DEFAULT_COLUMNS = [
    { id: 'cliente_nuevo',      label: 'Cliente nuevo',      colorId: 'emerald' },
    { id: 'en_seguimiento',     label: 'En seguimiento',     colorId: 'blue'    },
    { id: 'oportunidad_activa', label: 'Oportunidad activa', colorId: 'violet'  },
    { id: 'reunion_con_cliente',label: 'Reunión con cliente', colorId: 'amber'  },
    { id: 'inactivo',           label: 'Inactivo',           colorId: 'slate'   },
];

const STORAGE_KEY = 'kanban_clientes_columns_v2';

/* ─── Helpers ─── */
const getClienteCol = (cliente) =>
    cliente.etapaCliente || 'cliente_nuevo';

const formatMoney = (cliente) => {
    const val = Number(cliente.totalFacturado || cliente.customMetricValue) || 0;
    if (!val) return null;
    return `$${val.toLocaleString('es-MX')}`;
};

/* ─── Mini Card ─── */
const ClienteCard = ({
    cliente, onVerDetalles, onEditar, onEliminar, onCompartir, isOwner,
    isDragging, dragRef
}) => {
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        if (!showMenu) return;
        const handle = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
        document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, [showMenu]);

    const nombre = `${cliente.nombres || ''} ${cliente.apellidoPaterno || ''}`.trim();
    const money = formatMoney(cliente);
    const interes = cliente.interes ?? 5;

    return (
        <div
            ref={dragRef}
            className={`group bg-white rounded-xl border border-slate-200 border-l-4 ${getColor(cliente._kanbanColor || 'slate').card}
                shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer select-none
                ${isDragging ? 'opacity-40 scale-95 rotate-1' : 'hover:-translate-y-0.5'}`}
            onClick={() => onVerDetalles(cliente)}
        >
            <div className="p-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                        <p className="font-bold text-gray-900 text-sm leading-tight truncate">{nombre}</p>
                        {cliente.empresa && (
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">{cliente.empresa}</p>
                        )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                        {/* Menú contextual */}
                        <div className="relative" ref={menuRef}>
                            <button
                                onClick={() => setShowMenu(v => !v)}
                                className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all"
                            >
                                <MoreHorizontal className="w-3.5 h-3.5" />
                            </button>
                            {showMenu && (
                                <div className="absolute right-0 top-6 z-50 bg-white border border-slate-200 rounded-xl shadow-xl min-w-[140px] py-1 animate-in fade-in zoom-in duration-150">
                                    <button
                                        onClick={() => { setShowMenu(false); onEditar(cliente); }}
                                        className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" /> Editar
                                    </button>
                                    {isOwner && (
                                        <button
                                            onClick={() => { setShowMenu(false); onCompartir(cliente, !cliente.compartido); }}
                                            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                                        >
                                            <Share2 className="w-3.5 h-3.5" />
                                            {cliente.compartido ? 'Dejar de compartir' : 'Compartir'}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => { setShowMenu(false); onEliminar(cliente); }}
                                        className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-600 hover:bg-red-50"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" /> Eliminar
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Stars */}
                <div className="flex items-center gap-0.5 mb-2">
                    {[1,2,3,4,5].map(v => (
                        <Star key={v} className={`w-2.5 h-2.5 ${interes >= v ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-100'}`} />
                    ))}
                </div>

                {/* Contacto */}
                <div className="space-y-1">
                    {cliente.telefono && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{cliente.telefono}</span>
                        </div>
                    )}
                    {cliente.correo && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{cliente.correo}</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100">
                    {money ? (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            {money}
                        </span>
                    ) : <span />}
                    {cliente.ultimaActTipo && (
                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                            {cliente.ultimaActTipo === 'llamada' && <Phone className="w-2.5 h-2.5" />}
                            {cliente.ultimaActTipo === 'whatsapp' && <MessageSquare className="w-2.5 h-2.5" />}
                            {cliente.ultimaActTipo === 'correo' && <Mail className="w-2.5 h-2.5" />}
                            {!['llamada','whatsapp','correo'].includes(cliente.ultimaActTipo) && <Clock className="w-2.5 h-2.5" />}
                            <span className="capitalize">{cliente.ultimaActTipo}</span>
                        </div>
                    )}
                    {/* Drag handle visual */}
                    <GripVertical className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
            </div>
        </div>
    );
};

/* ─── Column Header Editor ─── */
const ColumnEditor = ({ column, onUpdate, onDelete, canDelete }) => {
    const [editing, setEditing] = useState(false);
    const [label, setLabel] = useState(column.label);
    const [showPalette, setShowPalette] = useState(false);
    const inputRef = useRef(null);

    const save = () => {
        const trimmed = label.trim();
        if (trimmed) onUpdate({ ...column, label: trimmed });
        setEditing(false);
    };

    return (
        <div className="relative">
            <div className={`flex items-center justify-between px-3 py-2.5 rounded-t-xl ${getColor(column.colorId).header}`}>
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    {editing ? (
                        <input
                            ref={inputRef}
                            value={label}
                            onChange={e => setLabel(e.target.value)}
                            onBlur={save}
                            onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setLabel(column.label); setEditing(false); } }}
                            className="bg-white/20 text-white placeholder-white/60 text-xs font-bold rounded px-2 py-0.5 outline-none border border-white/40 w-full"
                            autoFocus
                        />
                    ) : (
                        <button
                            onClick={() => { setEditing(true); setTimeout(() => inputRef.current?.select(), 50); }}
                            className="text-white font-bold text-xs truncate hover:underline text-left"
                            title="Click para renombrar"
                        >
                            {column.label}
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                    {/* Paleta */}
                    <button
                        onClick={() => setShowPalette(v => !v)}
                        className="p-1 rounded hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                        title="Cambiar color"
                    >
                        <Palette className="w-3.5 h-3.5" />
                    </button>
                    {canDelete && (
                        <button
                            onClick={onDelete}
                            className="p-1 rounded hover:bg-white/20 text-white/70 hover:text-white transition-colors"
                            title="Eliminar columna"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Paleta de colores */}
            {showPalette && (
                <div className="absolute top-10 right-0 z-50 bg-white border border-slate-200 rounded-xl shadow-xl p-2 flex flex-wrap gap-1.5 w-44">
                    {COLUMN_COLORS.map(c => (
                        <button
                            key={c.id}
                            onClick={() => { onUpdate({ ...column, colorId: c.id }); setShowPalette(false); }}
                            className={`w-7 h-7 rounded-lg ${c.header} flex items-center justify-center transition-transform hover:scale-110`}
                            title={c.id}
                        >
                            {column.colorId === c.id && <Check className="w-3.5 h-3.5 text-white" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

/* ─── Kanban Column ─── */
const KanbanColumn = ({
    column, clients, onVerDetalles, onEditar, onEliminar, onCompartir,
    isOwnerRecord, onUpdate, onDelete, canDelete, onDrop, dragging, setDragging
}) => {
    const [dragOver, setDragOver] = useState(false);
    const color = getColor(column.colorId);

    const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
    const handleDragLeave = () => setDragOver(false);
    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const clienteId = e.dataTransfer.getData('clienteId');
        if (clienteId) onDrop(clienteId, column.id);
    };

    return (
        <div
            className={`flex flex-col rounded-xl border-2 transition-all duration-200 min-w-[270px] max-w-[300px] flex-shrink-0 h-fit max-h-[calc(100vh-260px)]
                ${dragOver ? 'border-dashed border-blue-400 bg-blue-50/60 scale-[1.01]' : 'border-transparent bg-slate-100/70'}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Header editable */}
            <ColumnEditor column={column} onUpdate={onUpdate} onDelete={onDelete} canDelete={canDelete} />

            {/* Badge de conteo */}
            <div className="px-3 py-2 flex items-center justify-between bg-slate-100/80">
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${color.badge}`}>
                    {clients.length} {clients.length === 1 ? 'cliente' : 'clientes'}
                </span>
                {dragOver && (
                    <span className="text-[10px] text-blue-600 font-bold animate-pulse">Soltar aquí ↓</span>
                )}
            </div>

            {/* Zona scrolleable de cards */}
            <div className="flex flex-col gap-2 p-2.5 overflow-y-auto flex-1"
                style={{ maxHeight: 'calc(100vh - 340px)' }}>
                {clients.length === 0 && (
                    <div className={`flex flex-col items-center justify-center py-8 rounded-lg border-2 border-dashed transition-colors
                        ${dragOver ? 'border-blue-300 bg-blue-50' : 'border-slate-200'}`}>
                        <div className={`w-8 h-8 rounded-full ${color.dot} opacity-20 mb-2`} />
                        <p className="text-[11px] text-slate-400 italic">Sin clientes</p>
                    </div>
                )}
                {clients.map(cliente => {
                    const id = cliente._id || cliente.id;
                    return (
                        <div
                            key={id}
                            draggable
                            onDragStart={(e) => {
                                e.dataTransfer.setData('clienteId', String(id));
                                setDragging(String(id));
                            }}
                            onDragEnd={() => setDragging(null)}
                        >
                            <ClienteCard
                                cliente={cliente}
                                onVerDetalles={onVerDetalles}
                                onEditar={onEditar}
                                onEliminar={setEliminar => onEliminar(setEliminar)}
                                onCompartir={onCompartir}
                                isOwner={cliente.esPropietario === true || isOwnerRecord(cliente)}
                                isDragging={dragging === String(id)}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

/* ─── Componente principal KanbanClientes ─── */
const KanbanClientes = ({
    clientes,
    onVerDetalles,
    abrirModalEditar,
    setClienteAEliminar,
    handleToggleCompartido,
    isOwnerRecord,
    onEtapaChange, // async (clienteId, nuevaEtapa) => void
}) => {
    const [columns, setColumns] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) return JSON.parse(saved);
        } catch {}
        return DEFAULT_COLUMNS;
    });
    const [dragging, setDragging] = useState(null);
    const [showAddCol, setShowAddCol] = useState(false);
    const [newColLabel, setNewColLabel] = useState('');
    const [newColColor, setNewColColor] = useState('blue');
    const [showSettings, setShowSettings] = useState(false);

    // Persistir columnas
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(columns));
    }, [columns]);

    // Agrupar clientes por columna
    const clientesByCol = useCallback(() => {
        const map = {};
        columns.forEach(c => { map[c.id] = []; });
        clientes.forEach(cl => {
            const col = getClienteCol(cl);
            if (map[col]) {
                map[col].push(cl);
            } else {
                // Si la etapa no tiene columna, va a la primera
                map[columns[0].id]?.push(cl);
            }
        });
        return map;
    }, [clientes, columns]);

    const grouped = clientesByCol();

    const handleDrop = async (clienteId, colId) => {
        setDragging(null);
        if (!onEtapaChange) return;
        await onEtapaChange(clienteId, colId);
    };

    const addColumn = () => {
        const trimmed = newColLabel.trim();
        if (!trimmed) return;
        const newId = `col_${Date.now()}`;
        setColumns(prev => [...prev, { id: newId, label: trimmed, colorId: newColColor }]);
        setNewColLabel('');
        setNewColColor('blue');
        setShowAddCol(false);
    };

    const updateColumn = (updated) => {
        setColumns(prev => prev.map(c => c.id === updated.id ? updated : c));
    };

    const deleteColumn = (id) => {
        setColumns(prev => prev.filter(c => c.id !== id));
    };

    const resetColumns = () => {
        setColumns(DEFAULT_COLUMNS);
        localStorage.removeItem(STORAGE_KEY);
        setShowSettings(false);
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Toolbar Kanban */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-xs text-slate-500 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-semibold">{clientes.length} clientes</span>
                    <span className="text-slate-300">·</span>
                    <span>{columns.length} columnas</span>
                </div>

                <button
                    onClick={() => setShowAddCol(v => !v)}
                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:border-blue-400 hover:text-blue-600 shadow-sm transition-all"
                >
                    <Plus className="w-3.5 h-3.5" /> Nueva columna
                </button>

                <button
                    onClick={() => setShowSettings(v => !v)}
                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:border-violet-400 hover:text-violet-600 shadow-sm transition-all"
                >
                    <Settings2 className="w-3.5 h-3.5" /> Configurar
                </button>

                {/* Info drag */}
                <p className="text-[11px] text-slate-400 ml-auto hidden lg:block">
                    💡 Arrastra las tarjetas entre columnas para cambiar etapa
                </p>
            </div>

            {/* Panel agregar columna */}
            {showAddCol && (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-md flex flex-wrap items-end gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Nombre</label>
                        <input
                            value={newColLabel}
                            onChange={e => setNewColLabel(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') addColumn(); if (e.key === 'Escape') setShowAddCol(false); }}
                            placeholder="Ej: Propuesta enviada"
                            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Color</label>
                        <div className="flex gap-1.5">
                            {COLUMN_COLORS.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => setNewColColor(c.id)}
                                    className={`w-7 h-7 rounded-lg ${c.header} flex items-center justify-center transition-transform hover:scale-110 ${newColColor === c.id ? 'ring-2 ring-offset-1 ring-white scale-110' : ''}`}
                                >
                                    {newColColor === c.id && <Check className="w-3.5 h-3.5 text-white" />}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={addColumn}
                            disabled={!newColLabel.trim()}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-40 transition-colors"
                        >
                            Agregar
                        </button>
                        <button
                            onClick={() => { setShowAddCol(false); setNewColLabel(''); }}
                            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* Panel configuración */}
            {showSettings && (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-md animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-black text-slate-800">Configuración del Kanban</h3>
                        <button onClick={() => setShowSettings(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
                        {columns.map(col => {
                            const c = getColor(col.colorId);
                            return (
                                <div key={col.id} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                                    <div className={`w-3 h-3 rounded-full shrink-0 ${c.dot}`} />
                                    <span className="text-xs font-semibold text-slate-700 flex-1 truncate">{col.label}</span>
                                    <span className="text-[10px] text-slate-400 font-mono">{grouped[col.id]?.length ?? 0}</span>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex gap-2 pt-3 border-t border-slate-100">
                        <button
                            onClick={resetColumns}
                            className="px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors"
                        >
                            Restablecer columnas por defecto
                        </button>
                        <p className="text-[11px] text-slate-400 self-center ml-2">
                            Haz clic en el nombre de una columna para renombrarla, o en 🎨 para cambiar su color.
                        </p>
                    </div>
                </div>
            )}

            {/* Board Kanban horizontal */}
            <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: '400px' }}>
                {columns.map(col => (
                    <KanbanColumn
                        key={col.id}
                        column={col}
                        clients={grouped[col.id] || []}
                        onVerDetalles={onVerDetalles}
                        onEditar={abrirModalEditar}
                        onEliminar={setClienteAEliminar}
                        onCompartir={handleToggleCompartido}
                        isOwnerRecord={isOwnerRecord}
                        onUpdate={updateColumn}
                        onDelete={() => deleteColumn(col.id)}
                        canDelete={columns.length > 1}
                        onDrop={handleDrop}
                        dragging={dragging}
                        setDragging={setDragging}
                    />
                ))}
            </div>
        </div>
    );
};

export default KanbanClientes;
