import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, X, Settings2, GripVertical, Phone, Mail, Star,
    MessageSquare, Clock, Edit2, Trash2, Share2, Check,
    Palette, MoreHorizontal, ArrowUpDown, EyeOff, Eye,
    ChevronDown, ChevronsUpDown, LayoutGrid, Maximize2,
    Minimize2, AlignLeft, Columns, Sliders, RotateCcw,
    Building2, Calendar, Zap, AlertCircle, Info
} from 'lucide-react';


const ETAPAS_PROSPECTO_LIST = ['prospecto_nuevo', 'en_contacto', 'reunion_agendada', 'reunion_realizada', 'en_negociacion', 'venta_ganada', 'perdido'];
const esProspecto = (etapa) => ETAPAS_PROSPECTO_LIST.includes(etapa);

/* ═══════════════════════════════════════════════════════════════
   CONSTANTES & HELPERS
═══════════════════════════════════════════════════════════════ */

const COLUMN_COLORS = [
    { id: 'slate',   hex: '#475569', header: 'bg-slate-600',   badge: 'bg-slate-100 text-slate-700',    card: 'border-l-slate-400',   dot: 'bg-slate-500',   ring: 'ring-slate-400' },
    { id: 'blue',    hex: '#2563eb', header: 'bg-blue-600',    badge: 'bg-blue-100 text-blue-700',      card: 'border-l-blue-400',    dot: 'bg-blue-500',    ring: 'ring-blue-400' },
    { id: 'violet',  hex: '#7c3aed', header: 'bg-violet-600',  badge: 'bg-violet-100 text-violet-700',  card: 'border-l-violet-400',  dot: 'bg-violet-500',  ring: 'ring-violet-400' },
    { id: 'emerald', hex: '#059669', header: 'bg-emerald-600', badge: 'bg-emerald-100 text-emerald-700',card: 'border-l-emerald-400', dot: 'bg-emerald-500', ring: 'ring-emerald-400' },
    { id: 'amber',   hex: '#d97706', header: 'bg-amber-500',   badge: 'bg-amber-100 text-amber-700',    card: 'border-l-amber-400',   dot: 'bg-amber-500',   ring: 'ring-amber-400' },
    { id: 'rose',    hex: '#e11d48', header: 'bg-rose-600',    badge: 'bg-rose-100 text-rose-700',      card: 'border-l-rose-400',    dot: 'bg-rose-500',    ring: 'ring-rose-400' },
    { id: 'cyan',    hex: '#0891b2', header: 'bg-cyan-600',    badge: 'bg-cyan-100 text-cyan-700',      card: 'border-l-cyan-400',    dot: 'bg-cyan-500',    ring: 'ring-cyan-400' },
    { id: 'orange',  hex: '#ea580c', header: 'bg-orange-500',  badge: 'bg-orange-100 text-orange-700',  card: 'border-l-orange-400',  dot: 'bg-orange-500',  ring: 'ring-orange-400' },
    { id: 'white',   hex: '#ffffff', header: 'bg-white border-2 border-slate-200', badge: 'bg-slate-100 text-slate-700', card: 'border-l-slate-200', dot: 'bg-slate-200', ring: 'ring-slate-200' },
    { id: 'teal',    hex: '#0d9488', header: 'bg-teal-600',    badge: 'bg-teal-100 text-teal-700',      card: 'border-l-teal-400',    dot: 'bg-teal-500',    ring: 'ring-teal-400' },
];

const BOARD_THEMES = [
    { id: 'light',      label: 'Claro',         bg: 'bg-slate-100',          colBg: 'bg-white/80 border border-slate-200' },
    { id: 'soft',       label: 'Suave',         bg: 'bg-slate-200/60',       colBg: 'bg-white border border-slate-200' },
    { id: 'dark',       label: 'Oscuro',        bg: 'bg-slate-800',          colBg: 'bg-slate-700 border border-slate-600' },
    { id: 'indigo',     label: 'Índigo',        bg: 'bg-indigo-950',         colBg: 'bg-indigo-900/80 border border-indigo-700' },
    { id: 'ocean',      label: 'Océano',        bg: 'bg-gradient-to-br from-blue-950 to-cyan-900', colBg: 'bg-blue-900/60 border border-blue-700' },
    { id: 'forest',     label: 'Bosque',        bg: 'bg-gradient-to-br from-emerald-950 to-teal-900', colBg: 'bg-emerald-900/60 border border-emerald-700' },
    { id: 'sunset',     label: 'Atardecer',     bg: 'bg-gradient-to-br from-orange-900 to-rose-900', colBg: 'bg-orange-900/50 border border-orange-700' },
];

const CARD_SIZES = [
    { id: 'compact',  label: 'Compacta',  icon: Minimize2 },
    { id: 'detailed', label: 'Detallada', icon: Maximize2 },
];

const COL_WIDTHS = [
    { id: 'narrow', label: 'Angosta',  px: '230px' },
    { id: 'normal', label: 'Normal',   px: '280px' },
    { id: 'wide',   label: 'Ancha',    px: '340px' },
];


const SORT_OPTIONS = [
    { id: 'default',    label: 'Por defecto'      },
    { id: 'name_asc',   label: 'Nombre A→Z'       },
    { id: 'name_desc',  label: 'Nombre Z→A'       },
    { id: 'value_desc', label: 'Mayor facturado'  },
    { id: 'stars_desc', label: 'Mayor interés'    },
    { id: 'recent',     label: 'Más reciente'     },
];

const DEFAULT_COLUMNS = [
    { id: 'oportunidad_nuevo',       label: 'Oportunidad nuevo',       colorId: 'emerald', wipLimit: 0 },
    { id: 'en_progreso',      label: 'En seguimiento',      colorId: 'blue',    wipLimit: 0 },
    { id: 'negociacion',  label: 'Oportunidad activa',  colorId: 'violet',  wipLimit: 0 },
    { id: 'reunion_con_oportunidad', label: 'Reunión con oportunidad',  colorId: 'amber',   wipLimit: 0 },
    { id: 'perdida',            label: 'Inactivo',            colorId: 'slate',   wipLimit: 0 },
];

const DEFAULT_PREFS = {
    cardSize: 'normal',
    colWidth: 'normal',
    themeId: 'light',
    sortBy: 'default',
    hideEmpty: false,
    fields: {
        company: true, stars: true, phone: true, email: true,
        money: true, lastActivity: true, reminder: false, etapa: false,
    },
};

const STORAGE_COLS_KEY  = 'kanban_oportunidades_cols_v3';
const STORAGE_PREFS_KEY = 'kanban_oportunidades_prefs_v3';

const getColor   = (id) => COLUMN_COLORS.find(c => c.id === id) || COLUMN_COLORS[0];
const getTheme   = (id) => BOARD_THEMES.find(t => t.id === id) || BOARD_THEMES[0];
const getWidth   = (id) => COL_WIDTHS.find(w => w.id === id) || COL_WIDTHS[1];
const getClientCol = (c, defaultColId) => c.etapa || defaultColId || 'nueva';

const formatMoney = (c) => {
    const v = Number(c.monto || c.customMetricValue) || 0;
    if (!v) return '$0';
    return `$${v.toLocaleString('es-MX')}`;
};

const sortClients = (list, sortBy) => {
    const arr = [...list];
    switch (sortBy) {
        case 'name_asc':   return arr.sort((a, b) => (a.titulo||'').localeCompare(b.titulo||''));
        case 'name_desc':  return arr.sort((a, b) => (b.titulo||'').localeCompare(a.titulo||''));
        case 'value_desc': return arr.sort((a, b) => (Number(b.monto||b.customMetricValue)||0) - (Number(a.monto||a.customMetricValue)||0));
        case 'stars_desc': return arr.sort((a, b) => (b.interes??5) - (a.interes??5));
        case 'recent':     return arr.sort((a, b) => new Date(b.fechaUltimaEtapa||0) - new Date(a.fechaUltimaEtapa||0));
        default: return arr;
    }
};

/* ═══════════════════════════════════════════════════════════════
   CARD DE CLIENTE
═══════════════════════════════════════════════════════════════ */

const OportunidadCard = ({ oportunidad, cardSize, fields, colorId, isDragging, onVerDetalles, onEditar, onEliminar, onCompartir, isOwner }) => {
    const isDark = false; // could be passed from theme
    const DOT_COLORS = ['bg-rose-500', 'bg-emerald-500', 'bg-amber-400', 'bg-slate-400'];
    const charCode = String(oportunidad._id || oportunidad.id || 'a').charCodeAt(0) + (oportunidad.titulo?.length || 0);
    const dotColor = DOT_COLORS[charCode % DOT_COLORS.length];

    const titulo = oportunidad.titulo || 'Sin título';
    const nombreCliente = oportunidad.cliente_nombres || oportunidad.cliente_empresa || 'Sin cliente asignado';
    const money  = formatMoney(oportunidad);
    const c = getColor(colorId);
    const isCompact  = cardSize === 'compact';
    const isDetailed = cardSize === 'detailed';

    return (
        <div
            className={`group relative bg-white rounded-xl border border-slate-200/80
                shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer select-none
                ${isDragging ? 'opacity-30 scale-95 rotate-1 shadow-none' : 'hover:-translate-y-0.5'}
                ${isCompact ? 'p-2' : isDetailed ? 'p-4' : 'p-3'}`}
            onClick={() => onVerDetalles(oportunidad)}
        >
            {/* Color Dot */}
            <div className={`absolute ${isDetailed ? 'top-5 right-4' : 'right-[10%] top-1/2 -translate-y-1/2'} flex items-center justify-center`}>
                <div className={`w-2.5 h-2.5 rounded-full animate-dot-ping ${dotColor}`} />
            </div>

            {/* Header: titulo */}
            <div className="flex items-start justify-between gap-1.5">
                <div className="min-w-0 flex-1 pr-2">
                    <p className={`font-bold text-gray-900 leading-tight truncate ${isCompact ? 'text-xs' : 'text-sm'}`}>
                        {titulo}
                    </p>
                    <p className={`text-slate-500 truncate mt-0.5 text-[11px]`}>
                        {nombreCliente}
                    </p>
                    <div className="mt-1.5">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${esProspecto(oportunidad.cliente_etapaEmbudo) ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                            {esProspecto(oportunidad.cliente_etapaEmbudo) ? 'PROSPECTO' : 'CLIENTE'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Footer: money */}
            <div className={`flex items-center justify-between ${isCompact ? 'mt-1.5' : 'mt-2.5 pt-1'}`}>
                {money && money !== '$-' && money !== '$0' && money !== '$0.00' ? (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">{money}</span>
                ) : (
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100 border-dashed">$ No definido</span>
                )}
            </div>

            {/* Drag grip hint */}
            <GripVertical className="absolute bottom-2 right-2 w-3 h-3 text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════════
   HEADER EDITABLE DE COLUMNA
═══════════════════════════════════════════════════════════════ */

const ColumnHeader = ({ column, count, totalValue, onUpdate, onDelete, canDelete, themeIsDark, sortBy, onSortChange, setDragEnabled }) => {
    const [editingLabel, setEditingLabel] = useState(false);
    const [label, setLabel] = useState(column.label);
    const [showColMenu, setShowColMenu] = useState(false);
    const [editingWip, setEditingWip] = useState(false);
    const [wipVal, setWipVal] = useState(String(column.wipLimit || ''));
    const inputRef = useRef(null);
    const colMenuRef = useRef(null);
    const c = getColor(column.colorId);
    const isWhite = c.id === 'white';
    const wipOver = column.wipLimit > 0 && count > column.wipLimit;

    useEffect(() => {
        const fn = (e) => {
            if (colMenuRef.current && !colMenuRef.current.contains(e.target)) setShowColMenu(false);
        };
        document.addEventListener('mousedown', fn);
        return () => document.removeEventListener('mousedown', fn);
    }, []);

    const saveLabel = () => {
        const t = label.trim();
        if (t) onUpdate({ ...column, label: t });
        else setLabel(column.label);
        setEditingLabel(false);
    };

    const saveWip = () => {
        const n = parseInt(wipVal, 10);
        onUpdate({ ...column, wipLimit: isNaN(n) || n < 0 ? 0 : n });
        setEditingWip(false);
    };

    const textColor = themeIsDark ? 'text-slate-200' : 'text-slate-800';

    return (
        <div className={`rounded-xl overflow-visible shadow-sm ${c.header}`}>
                <div className="flex items-center gap-1.5 px-3 py-2.5">
                    {/* Drag handle for column */}
                    <div 
                        onMouseEnter={() => setDragEnabled?.(true)}
                        onMouseLeave={() => setDragEnabled?.(false)}
                        className={`cursor-grab active:cursor-grabbing p-1 -ml-1 rounded opacity-60 hover:opacity-100 transition-colors ${isWhite ? 'hover:bg-slate-100' : 'hover:bg-white/20'}`}
                    >
                        <GripVertical className={`w-3.5 h-3.5 shrink-0 ${isWhite ? 'text-slate-400' : 'text-white'}`} />
                    </div>

                    {/* Label editable */}
                    <div className="flex-1 min-w-0">
                        {editingLabel ? (
                            <input
                                ref={inputRef}
                                value={label}
                                onChange={e => setLabel(e.target.value)}
                                onBlur={saveLabel}
                                onKeyDown={e => { if (e.key === 'Enter') saveLabel(); if (e.key === 'Escape') { setLabel(column.label); setEditingLabel(false); } }}
                                className={`w-full text-xs font-bold rounded-md px-2 py-0.5 outline-none border ${isWhite ? 'bg-slate-50 text-slate-900 border-slate-300 focus:border-blue-500 placeholder-slate-400' : 'bg-white/20 text-white placeholder-white/50 border-white/40 focus:border-white/70'}`}
                                autoFocus
                            />
                        ) : (
                            <button
                                onClick={() => { setEditingLabel(true); setTimeout(() => inputRef.current?.select(), 40); }}
                                className="w-full text-left hover:underline underline-offset-2 flex flex-col"
                                title="Click para renombrar"
                            >
                                <span className={`font-bold text-xs truncate ${isWhite ? 'text-slate-800' : 'text-white'}`}>{column.label}</span>
                                <span className={`text-[10px] font-medium mt-0.5 ${totalValue > 0 ? (isWhite ? 'text-slate-500' : 'text-white/80') : 'invisible'}`}>
                                    ${(totalValue || 0).toLocaleString('es-MX')}
                                </span>
                            </button>
                        )}
                    </div>

                    {/* Badges */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        {/* WIP badge */}
                        {column.wipLimit > 0 && (
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${wipOver ? 'bg-red-500 text-white animate-pulse' : (isWhite ? 'bg-slate-100 text-slate-700' : 'bg-white/20 text-white')}`}>
                                {count}/{column.wipLimit}
                            </span>
                        )}
                        {!column.wipLimit && (
                            <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${isWhite ? 'bg-slate-100 text-slate-700' : 'bg-white/20 text-white'}`}>{count}</span>
                        )}

                        {/* Column menu */}
                        <div className="relative" ref={colMenuRef}>
                            <button onClick={() => { setShowColMenu(v => !v); }}
                                className={`p-1 rounded transition-colors ${isWhite ? 'hover:bg-slate-100 text-slate-400 hover:text-slate-700' : 'hover:bg-white/20 text-white/80 hover:text-white'}`}>
                                <MoreHorizontal className="w-3.5 h-3.5" />
                            </button>
                            {showColMenu && (
                                <div className="absolute right-0 top-7 z-[70] bg-white border border-slate-200 rounded-xl shadow-2xl min-w-[180px] py-1.5 animate-in fade-in zoom-in-95 duration-100">
                                    <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        Color de columna
                                    </div>
                                    <div className="px-3 pb-2 pt-1 grid grid-cols-5 gap-1.5">
                                        {COLUMN_COLORS.map(col => (
                                            <button key={col.id} onClick={() => { onUpdate({ ...column, colorId: col.id }); setShowColMenu(false); }}
                                                className={`w-6 h-6 rounded-lg ${col.header} flex items-center justify-center hover:scale-110 transition-transform`} title={col.id}>
                                                {column.colorId === col.id && <Check className="w-3.5 h-3.5 text-white" />}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="border-t border-slate-100 my-1" />
                                    
                                    <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        Ordenar columna
                                    </div>
                                    {SORT_OPTIONS.map(s => (
                                        <button key={s.id} onClick={() => { onSortChange(column.id, s.id); setShowColMenu(false); }}
                                            className={`flex items-center justify-between gap-2 w-full px-3 py-1.5 text-xs transition-colors ${(column.sortBy || 'default') === s.id ? 'text-blue-700 bg-blue-50 font-bold' : 'text-slate-700 hover:bg-slate-50'}`}>
                                            {s.label}
                                            {(column.sortBy || 'default') === s.id && <Check className="w-3 h-3" />}
                                        </button>
                                    ))}
                                    <div className="border-t border-slate-100 my-1" />
                                    {/* WIP limit */}
                                    <div className="px-3 py-2">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Límite WIP</div>
                                        {editingWip ? (
                                            <div className="flex items-center gap-1.5">
                                                <input
                                                    value={wipVal}
                                                    onChange={e => setWipVal(e.target.value)}
                                                    onKeyDown={e => { if (e.key === 'Enter') saveWip(); if (e.key === 'Escape') setEditingWip(false); }}
                                                    className="w-14 px-2 py-1 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-blue-400 outline-none"
                                                    placeholder="0=sin límite"
                                                    autoFocus
                                                    type="number" min="0"
                                                />
                                                <button onClick={saveWip} className="text-xs text-blue-600 font-bold">OK</button>
                                            </div>
                                        ) : (
                                            <button onClick={() => setEditingWip(true)}
                                                className="text-xs text-slate-600 hover:text-blue-600 hover:underline">
                                                {column.wipLimit > 0 ? `Límite: ${column.wipLimit}` : 'Sin límite — Click para setear'}
                                            </button>
                                        )}
                                    </div>
                                    <div className="border-t border-slate-100 my-1" />
                                    {canDelete && (
                                        <button onClick={() => { onDelete(column.id); setShowColMenu(false); }}
                                            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors">
                                            <Trash2 className="w-3.5 h-3.5" /> Eliminar columna
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* WIP warning bar */}
                {wipOver && (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-red-500/80 text-white text-[10px] font-bold">
                        <AlertCircle className="w-3 h-3" /> Límite superado ({count}/{column.wipLimit})
                    </div>
                )}
            </div>
    );
};

/* ═══════════════════════════════════════════════════════════════
   COLUMNA KANBAN
═══════════════════════════════════════════════════════════════ */

const KanbanColumn = ({
    column, clients, prefs, themeIsDark,
    onVerDetalles, onEditar, onEliminar, onCompartir, isOwnerRecord,
    onUpdate, onDelete, canDelete, onDrop, dragging, setDragging,
    onColDragStart, onColDragOver, onColDrop, onSortChange,
    colWidth,
}) => {
    const [dragOver, setDragOver] = useState(false);
    const [dragEnabled, setDragEnabled] = useState(false);
    const colRef = useRef(null);
    const c = getColor(column.colorId);
    const theme = getTheme(prefs.themeId);
    const sorted = sortClients(clients, column.sortBy || prefs.sortBy);

    // Column drag (reorder)
    const handleColDragStart = (e) => {
        e.dataTransfer.setData('colId', column.id);
        e.dataTransfer.effectAllowed = 'move';
        onColDragStart(column.id);
    };

    // Card drop
    const handleDragOver = (e) => { 
        e.preventDefault(); 
        e.stopPropagation(); 
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
        setDragOver(true); 
    };
    const handleDragEnter = (e) => {
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    };
    const handleDragLeave = (e) => { if (!colRef.current?.contains(e.relatedTarget)) setDragOver(false); };
    const handleDrop = (e) => {
        e.preventDefault(); e.stopPropagation();
        setDragOver(false);
        const oportunidadId = e.dataTransfer.getData('oportunidadId');
        const colId = e.dataTransfer.getData('colId');
        if (oportunidadId) onDrop(oportunidadId, column.id);
        if (colId && colId !== column.id) onColDrop(colId, column.id);
    };

    const wipOver = column.wipLimit > 0 && clients.length > column.wipLimit;
    const textMuted = themeIsDark ? 'text-slate-400' : 'text-slate-400';
    const columnTotalValue = clients.reduce((acc, c) => acc + (Number(c.monto || c.customMetricValue) || 0), 0);

    return (
        <div
            ref={colRef}
            draggable={dragEnabled}
            onDragStart={handleColDragStart}
            onDragEnter={e => { handleDragEnter(e); onColDragOver(column.id); }}
            onDragOver={e => { e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'; onColDragOver(column.id); handleDragOver(e); }}
            onDrop={handleDrop}
            onDragLeave={handleDragLeave}
            style={{ minWidth: colWidth, maxWidth: colWidth, flexShrink: 0 }}
            className={`flex flex-col gap-3 transition-all duration-200 h-full
                ${dragOver ? 'scale-[1.01]' : ''}`}
        >
            {/* Header editable */}
            <ColumnHeader
                column={column}
                count={clients.length}
                totalValue={columnTotalValue}
                onUpdate={onUpdate}
                onDelete={onDelete}
                canDelete={canDelete}
                themeIsDark={themeIsDark}
                sortBy={column.sortBy || prefs.sortBy}
                onSortChange={onSortChange}
                setDragEnabled={setDragEnabled}
            />

            {/* Cards */}
            <div
                className={`flex flex-col gap-2 p-2.5 overflow-y-auto flex-1 min-h-0 scrollbar-hide rounded-xl ${theme.colBg} ${dragOver ? 'ring-2 ring-blue-400 ring-offset-1' : ''} ${wipOver ? 'ring-2 ring-red-400/60' : ''}`}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {sorted.length === 0 ? (
                    <div className={`flex flex-col items-center justify-center flex-1 min-h-[100px] h-full rounded-xl border-2 border-dashed transition-colors
                        ${dragOver ? 'border-blue-400 bg-blue-50/40' : themeIsDark ? 'border-slate-600' : 'border-slate-200'}`}>
                        {dragOver && (
                            <p className={`text-[11px] italic ${textMuted}`}>
                                Soltar aquí
                            </p>
                        )}
                    </div>
                ) : (
                    <AnimatePresence>
                        {sorted.map(oportunidad => {
                            const id = String(oportunidad._id || oportunidad.id);
                            return (
                                <motion.div
                                    key={id}
                                    layoutId={`card-${id}`}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                                    draggable
                                    onDragStart={e => { 
                                        e.stopPropagation();
                                        e.dataTransfer.effectAllowed = 'move';
                                        e.dataTransfer.setData('oportunidadId', id); 
                                        setDragging(id); 
                                    }}
                                    onDragEnd={() => setDragging(null)}
                                >
                                    <OportunidadCard
                                        oportunidad={oportunidad}
                                        cardSize={prefs.cardSize}
                                        fields={prefs.fields}
                                        colorId={column.colorId}
                                        isDragging={dragging === id}
                                        onVerDetalles={onVerDetalles}
                                        onEditar={onEditar}
                                        onEliminar={onEliminar}
                                        onCompartir={onCompartir}
                                        isOwner={oportunidad.esPropietario === true || isOwnerRecord(oportunidad)}
                                    />
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                )}

                {/* Drop zone when dragging */}
                {dragging && sorted.length > 0 && (
                    <div className={`h-16 shrink-0 rounded-xl border-2 border-dashed transition-colors flex items-center justify-center
                        ${dragOver ? 'border-blue-400 bg-blue-50/30' : themeIsDark ? 'border-slate-600/40' : 'border-slate-200/60'}`}>
                        <p className={`text-[10px] ${textMuted}`}>Soltar aquí</p>
                    </div>
                )}
            </div>
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════════
   PANEL DE CONFIGURACIÓN
═══════════════════════════════════════════════════════════════ */



/* ═══════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
═══════════════════════════════════════════════════════════════ */

const KanbanOportunidades = ({
    oportunidades,
    onVerDetalles,
    abrirModalEditar,
    setOportunidadAEliminar,
    handleToggleCompartido,
    isOwnerRecord,
    onEtapaChange,
}) => {
    /* ── State ── */
    const [columns, setColumns] = useState(() => {
        try { const s = localStorage.getItem(STORAGE_COLS_KEY); if (s) return JSON.parse(s); } catch {}
        return DEFAULT_COLUMNS;
    });

    const [prefs, setPrefs] = useState(() => {
        try { const s = localStorage.getItem(STORAGE_PREFS_KEY); if (s) return { ...DEFAULT_PREFS, ...JSON.parse(s) }; } catch {}
        return DEFAULT_PREFS;
    });

    const [dragging, setDragging] = useState(null);       // oportunidadId being dragged
    const [draggingCol, setDraggingCol] = useState(null); // colId being dragged
    const [showSettings, setShowSettings] = useState(false);
    const [isAddingColumn, setIsAddingColumn] = useState(false);
    
    const [portalNode, setPortalNode] = useState(null);
    const [settingsPortalNode, setSettingsPortalNode] = useState(null);
    const scrollContainerRef = useRef(null);

    useEffect(() => {
        setPortalNode(document.getElementById('kanban-toolbar-portal-target'));
        setSettingsPortalNode(document.getElementById('kanban-settings-portal-target'));
    }, []);

    /* ── Scroll Horizontal con Rueda ── */
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        let targetScroll = container.scrollLeft;
        let isAnimating = false;
        let animationFrame = null;

        const updateScroll = () => {
            const diff = targetScroll - container.scrollLeft;
            if (Math.abs(diff) < 1) {
                container.scrollLeft = targetScroll;
                isAnimating = false;
                return;
            }
            container.scrollLeft += diff * 0.15; // Suavidad (15% por frame)
            animationFrame = requestAnimationFrame(updateScroll);
        };

        const handleWheel = (e) => {
            if (Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return; // Already scrolling horizontally

            let target = e.target;
            let canScrollY = false;

            while (target && target !== container) {
                const style = window.getComputedStyle(target);
                const overflowY = style.overflowY;
                if ((overflowY === 'auto' || overflowY === 'scroll') && target.scrollHeight > target.clientHeight) {
                    canScrollY = true;
                    break;
                }
                target = target.parentElement;
            }

            if (!canScrollY) {
                e.preventDefault();
                // Acumulamos el delta en targetScroll y animamos hacia allá
                targetScroll = Math.max(0, Math.min(targetScroll + (e.deltaY * 1.5), container.scrollWidth - container.clientWidth));
                if (!isAnimating) {
                    isAnimating = true;
                    animationFrame = requestAnimationFrame(updateScroll);
                }
            }
        };

        // Si el usuario hace scroll nativo (trackpad o barra), actualizamos el target para evitar saltos
        const handleManualScroll = () => {
            if (!isAnimating) targetScroll = container.scrollLeft;
        };

        container.addEventListener('wheel', handleWheel, { passive: false });
        container.addEventListener('scroll', handleManualScroll);
        
        return () => {
            container.removeEventListener('wheel', handleWheel);
            container.removeEventListener('scroll', handleManualScroll);
            if (animationFrame) cancelAnimationFrame(animationFrame);
        };
    }, []);

    /* ── Persistencia ── */
    useEffect(() => { localStorage.setItem(STORAGE_COLS_KEY, JSON.stringify(columns)); }, [columns]);
    useEffect(() => { localStorage.setItem(STORAGE_PREFS_KEY, JSON.stringify(prefs)); }, [prefs]);

    /* ── Derived ── */
    const theme      = getTheme(prefs.themeId);
    const colWidthPx = getWidth(prefs.colWidth).px;
    const themeIsDark = ['dark','indigo','ocean','forest','sunset'].includes(prefs.themeId);

    /* ── Agrupamiento de oportunidades ── */
    const grouped = useMemo(() => {
        const map = {};
        columns.forEach(c => { map[c.id] = []; });
        const defaultColId = columns[0]?.id;
        oportunidades.forEach(cl => {
            const col = getClientCol(cl, defaultColId);
            if (map[col] !== undefined) map[col].push(cl);
            else if (defaultColId && map[defaultColId]) map[defaultColId].push(cl);
        });
        return map;
    }, [oportunidades, columns]);

    /* ── Column CRUD ── */
    const updateColumn = useCallback((updated) =>
        setColumns(p => p.map(c => c.id === updated.id ? updated : c)), []);

    const deleteColumn = useCallback((id) => {
        const defaultColId = columns[0]?.id;
        const hasItems = oportunidades.some(cl => getClientCol(cl, defaultColId) === id);
        if (hasItems) {
            alert('Por favor mueve los oportunidades a otra columna antes de eliminar esta.');
            return;
        }
        setColumns(p => p.filter(c => c.id !== id));
    }, [oportunidades, columns]);

    const resetColumns = useCallback(() => {
        setColumns(DEFAULT_COLUMNS);
        localStorage.removeItem(STORAGE_COLS_KEY);
    }, []);

    const addColumn = () => {
        if (isAddingColumn) return;
        setIsAddingColumn(true);
        
        setColumns(p => {
            const nextPosition = p.length + 1;
            const randomColor = COLUMN_COLORS[Math.floor(Math.random() * COLUMN_COLORS.length)].id;
            return [...p, { id: `col_${Date.now()}`, label: `Columna ${nextPosition}`, colorId: randomColor, wipLimit: 0 }];
        });

        // Esperar a que renderice la columna y hacer scroll suave
        setTimeout(() => {
            if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTo({
                    left: scrollContainerRef.current.scrollWidth,
                    behavior: 'smooth'
                });
            }
            // Rehabilitar el botón despues de la animación
            setTimeout(() => setIsAddingColumn(false), 300);
        }, 100);
    };

    /* ── Column sort ── */
    const handleSortChange = useCallback((colId, sortBy) => {
        setColumns(p => p.map(c => c.id === colId ? { ...c, sortBy } : c));
    }, []);

    /* ── Drag: cards ── */
    const handleCardDrop = async (oportunidadId, colId) => {
        setDragging(null);
        if (onEtapaChange) await onEtapaChange(oportunidadId, colId);
    };

    /* ── Drag: columns reorder ── */
    const colDragOverRef = useRef(null);
    const handleColDragStart = useCallback((colId) => setDraggingCol(colId), []);
    const handleColDragOver  = useCallback((colId) => { colDragOverRef.current = colId; }, []);
    const handleColDrop      = useCallback((fromId, toId) => {
        if (!fromId || !toId || fromId === toId) return;
        setColumns(prev => {
            const arr = [...prev];
            const fi = arr.findIndex(c => c.id === fromId);
            const ti = arr.findIndex(c => c.id === toId);
            if (fi < 0 || ti < 0) return prev;
            const [col] = arr.splice(fi, 1);
            arr.splice(ti, 0, col);
            return arr;
        });
        setDraggingCol(null);
    }, []);

    const visibleColumns = prefs.hideEmpty
        ? columns.filter(c => (grouped[c.id]?.length ?? 0) > 0)
        : columns;

    const totalOportunidades = oportunidades.length;


    const settingsDropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (settingsDropdownRef.current && !settingsDropdownRef.current.contains(e.target)) {
                setShowSettings(false);
            }
        };
        if (showSettings) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showSettings]);

    const settingsButtonAndDropdown = (
        <div className="relative w-full h-full" ref={settingsDropdownRef}>
            <button onClick={() => setShowSettings(v => !v)}
                className={`flex items-center justify-center w-full h-full transition-colors shrink-0 outline-none
                    ${showSettings ? 'bg-slate-100 text-slate-800' : 'bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
                title="Ajustes Kanban"
            >
                <Settings2 className="w-4 h-4" />
            </button>

            <AnimatePresence>
                {showSettings && (
                    <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full right-0 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden"
                    >
                        <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700">Ajustes Kanban</span>
                        </div>
                        <div className="p-2 flex flex-col gap-3">
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-1">Tamaño de tarjeta</label>
                                <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-md">
                                    {CARD_SIZES.map(s => (
                                        <button key={s.id} onClick={() => setPrefs(p => ({ ...p, cardSize: s.id }))}
                                            className={`flex flex-col items-center justify-center py-1.5 rounded text-[10px] font-bold transition-colors ${prefs.cardSize === s.id ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}`}>
                                            <s.icon className="w-3.5 h-3.5 mb-0.5" />
                                            {s.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-1">Ancho de columna</label>
                                <select
                                    value={prefs.colWidth}
                                    onChange={e => setPrefs(p => ({ ...p, colWidth: e.target.value }))}
                                    className="w-full h-8 bg-slate-50 border border-slate-200 rounded-md text-[11px] font-semibold text-slate-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 px-2 outline-none cursor-pointer"
                                >
                                    {COL_WIDTHS.map(w => (
                                        <option key={w.id} value={w.id}>{w.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );

    return (
        <div className={`flex flex-col flex-1 min-h-0 w-full rounded-2xl overflow-hidden transition-colors duration-300`}>
            {/* ── Toolbar ── */}
            {settingsPortalNode && createPortal(settingsButtonAndDropdown, settingsPortalNode)}

            {/* ── Board ── */}
            <div className={`rounded-2xl transition-colors duration-300 flex-1 min-h-0 relative ${theme.bg}`}>
                {visibleColumns.length === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <EyeOff className="w-10 h-10 text-slate-400 mb-3 opacity-50" />
                        <p className="text-slate-400 font-semibold text-sm">Todas las columnas están vacías</p>
                        <button onClick={() => setPrefs(p => ({ ...p, hideEmpty: false }))}
                            className="mt-3 text-xs text-blue-600 hover:underline font-bold">
                            Mostrar columnas vacías
                        </button>
                    </div>
                ) : (
                    <div 
                        ref={scrollContainerRef}
                        className="absolute inset-0 p-3 flex gap-3 overflow-x-auto overflow-y-hidden custom-scrollbar items-stretch"
                        onDragEnter={e => { e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'; }}
                        onDragOver={e => { e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'; }}
                        onDrop={e => {
                            const colId = e.dataTransfer.getData('colId');
                            if (colId && colDragOverRef.current) handleColDrop(colId, colDragOverRef.current);
                        }}
                    >
                        {visibleColumns.map(col => (
                            <KanbanColumn
                                key={col.id}
                                column={col}
                                clients={grouped[col.id] || []}
                                prefs={prefs}
                                themeIsDark={themeIsDark}
                                onVerDetalles={onVerDetalles}
                                onEditar={abrirModalEditar}
                                onEliminar={setOportunidadAEliminar}
                                onCompartir={handleToggleCompartido}
                                isOwnerRecord={isOwnerRecord}
                                onUpdate={updateColumn}
                                onDelete={deleteColumn}
                                canDelete={columns.length > 1}
                                onDrop={handleCardDrop}
                                dragging={dragging}
                                setDragging={setDragging}
                                onColDragStart={handleColDragStart}
                                onColDragOver={handleColDragOver}
                                onColDrop={handleColDrop}
                                onSortChange={handleSortChange}
                                colWidth={colWidthPx}
                            />
                        ))}
                        
                        {/* Phantom Column */}
                        <div 
                            onClick={isAddingColumn ? undefined : addColumn}
                            style={{ minWidth: colWidthPx, maxWidth: colWidthPx }}
                            className={`shrink-0 flex flex-col gap-3 transition-all duration-200 h-full group focus:outline-none
                                ${isAddingColumn ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                            {/* Fake Header */}
                            <div className={`rounded-xl border-2 border-dashed transition-colors
                                ${themeIsDark ? 'border-slate-600/50 group-hover:border-blue-400 group-hover:bg-slate-800/30' : 'border-slate-300/70 group-hover:border-blue-400 group-hover:bg-blue-50/30'}`}>
                                {/* Contenido invisible calcado de una cabecera real para forzar la altura exacta */}
                                <div className="flex items-center gap-1.5 px-3 py-2.5 invisible">
                                    <div className="p-1 -ml-1">
                                        <GripVertical className="w-3.5 h-3.5 shrink-0" />
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col">
                                        <span className="font-bold text-xs">X</span>
                                        <span className="text-[10px] font-medium mt-0.5">X</span>
                                    </div>
                                </div>
                            </div>

                            {/* Fake Body */}
                            <div className={`flex-1 min-h-0 rounded-xl border-2 border-dashed transition-colors flex flex-col items-center justify-center
                                ${themeIsDark ? 'border-slate-600/50 group-hover:border-blue-400 group-hover:bg-slate-800/30' : 'border-slate-300/70 group-hover:border-blue-400 group-hover:bg-blue-50/30'}`}>
                                <div className={`flex flex-col items-center justify-center transition-colors opacity-50 group-hover:opacity-100 ${themeIsDark ? 'text-slate-500 group-hover:text-blue-400' : 'text-slate-400 group-hover:text-blue-500'}`}>
                                    <Plus className="w-8 h-8 mb-2" />
                                    <span className="text-sm font-bold">Añadir Columna</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default KanbanOportunidades;
