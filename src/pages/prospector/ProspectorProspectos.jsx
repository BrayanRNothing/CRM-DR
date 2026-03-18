import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, Search, Plus, Phone, MessageSquare, Mail, Calendar,
  ChevronRight, Tag, Clock, Building, Star, RefreshCcw, UserPlus,
  Download, Upload, X, CheckCircle, AlertCircle, FileText, Trash2
} from 'lucide-react';
import axios from '../../lib/axios';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import ProspectorSidebar from '../../components/prospector/ProspectorSidebar';
import ProspectorNavbar from '../../components/prospector/ProspectorNavbar';
import Modal from '../../components/common/Modal';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const CSV_HEADERS = ['nombres', 'apellidoPaterno', 'apellidoMaterno', 'telefono', 'correo', 'empresa', 'notas'];
const CSV_LABELS = ['Nombres', 'Apellido Paterno', 'Apellido Materno', 'Telefono', 'Correo', 'Empresa', 'Notas'];

function prospectosToCsv(prospectos) {
  const escape = (val) => {
    if (val == null) return '';
    const s = String(val).replace(/"/g, '""');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
  };
  const rows = [CSV_LABELS.join(',')];
  for (const p of prospectos) {
    rows.push(CSV_HEADERS.map(h => escape(p[h])).join(','));
  }
  return rows.join('\n');
}

function parseCsvRow(row) {
  const cells = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"') {
      if (inQuote && row[i + 1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if (ch === ',' && !inQuote) {
      cells.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  cells.push(cur.trim());
  return cells;
}

function csvToProspectos(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { data: [], errors: ['El archivo CSV esta vacio o solo tiene encabezados.'] };

  const header = parseCsvRow(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, ''));
  const colMap = {
    nombres: ['nombres', 'nombre'],
    apellidoPaterno: ['apellidopaterno', 'apellido'],
    apellidoMaterno: ['apellidomaterno'],
    telefono: ['telefono', 'tel', 'phone'],
    correo: ['correo', 'email', 'mail'],
    empresa: ['empresa', 'company'],
    notas: ['notas', 'nota', 'notes', 'comentarios'],
  };

  const colIndex = {};
  for (const [field, aliases] of Object.entries(colMap)) {
    for (const alias of aliases) {
      const idx = header.indexOf(alias);
      if (idx !== -1) { colIndex[field] = idx; break; }
    }
  }

  const errors = [];
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvRow(lines[i]);
    const row = {};
    for (const [field, idx] of Object.entries(colIndex)) {
      row[field] = cells[idx] || '';
    }
    if (!row.nombres && !row.telefono) {
      errors.push(`Fila ${i + 1}: sin nombre ni telefono, omitida.`);
      continue;
    }
    data.push(row);
  }

  return { data, errors };
}

const ProspectorProspectos = () => {
  const { user } = useAuth();
  const [prospectos, setProspectos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEtapa, setFiltroEtapa] = useState('todos');
  const [filtroFecha, setFiltroFecha] = useState('todos'); // 'todos', 'hoy', 'ayer', 'semana', 'mes', 'personalizado'
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [isModalAbierto, setIsModalAbierto] = useState(false);
  const [isCargandoModal, setIsCargandoModal] = useState(false);
  const [nuevoProspecto, setNuevoProspecto] = useState({
    nombres: '', apellidoPaterno: '', apellidoMaterno: '',
    telefono: '', correo: '', empresa: '', notas: ''
  });
  const [isImportModalAbierto, setIsImportModalAbierto] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [csvPreview, setCsvPreview] = useState(null);
  const [importando, setImportando] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);
  const [prospectoAEliminar, setProspectoAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  const fetchProspectos = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filtroEtapa !== 'todos') params.etapa = filtroEtapa;
      if (searchTerm) params.busqueda = searchTerm;
      const response = await axios.get('/api/prospector/prospectos', { params });
      setProspectos(response.data);
    } catch (error) {
      console.error('Error al cargar prospectos:', error);
      toast.error('No se pudieron cargar los prospectos');
    } finally {
      setLoading(false);
    }
  }, [filtroEtapa, searchTerm]);

  useEffect(() => { fetchProspectos(); }, [fetchProspectos]);

  // Auto-refresh cada 5 minutos
  useEffect(() => {
    const interval = setInterval(() => fetchProspectos(), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchProspectos]);

  const handleExportCsv = () => {
    if (prospectos.length === 0) { toast.error('No hay prospectos para exportar.'); return; }
    const csv = prospectosToCsv(prospectos);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prospectos_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${prospectos.length} prospectos exportados.`);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCsvFile(file);
    setImportResult(null);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      setCsvPreview(csvToProspectos(text));
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleImportCsv = async () => {
    if (!csvPreview || csvPreview.data.length === 0) { toast.error('No hay datos validos para importar.'); return; }
    try {
      setImportando(true);
      const response = await axios.post('/api/prospector/importar-csv', { prospectos: csvPreview.data });
      setImportResult(response.data);
      fetchProspectos();
      toast.success(`Importacion completada: ${response.data.insertados} nuevos.`);
    } catch (error) {
      toast.error(error.response?.data?.msg || 'Error al importar el CSV.');
    } finally {
      setImportando(false);
    }
  };

  const resetImportModal = () => {
    setCsvFile(null);
    setCsvPreview(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsImportModalAbierto(false);
  };

  const handleEliminarProspecto = async () => {
    if (!prospectoAEliminar) return;
    try {
      setEliminando(true);
      await axios.delete(`/api/prospector/prospectos/${prospectoAEliminar.id}`);
      toast.success('Prospecto eliminado correctamente');
      setProspectoAEliminar(null);
      fetchProspectos();
    } catch (error) {
      toast.error(error.response?.data?.msg || 'Error al eliminar el prospecto');
    } finally {
      setEliminando(false);
    }
  };

  const handleCrearProspecto = async (e) => {
    e.preventDefault();
    try {
      setIsCargandoModal(true);
      await axios.post('/api/prospector/crear-prospecto', nuevoProspecto);
      toast.success('Prospecto creado exitosamente');
      setIsModalAbierto(false);
      setNuevoProspecto({ nombres: '', apellidoPaterno: '', apellidoMaterno: '', telefono: '', correo: '', empresa: '', notas: '' });
      fetchProspectos();
    } catch (error) {
      toast.error(error.response?.data?.msg || 'Error al crear prospecto');
    } finally {
      setIsCargandoModal(false);
    }
  };

  const getEtapaColor = (etapa) => {
    switch (etapa) {
      case 'prospecto_nuevo': return 'bg-(--theme-100) text-(--theme-700) border-(--theme-200)';
      case 'en_contacto': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'reunion_agendada': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'reunion_realizada': return 'bg-(--theme-100) text-(--theme-700) border-(--theme-200)';
      case 'en_negociacion': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return 'Sin fecha';
    try { return format(new Date(fecha), "d 'de' MMMM, HH:mm", { locale: es }); }
    catch (e) { return 'Fecha invalida'; }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <ProspectorSidebar />
      <div className="flex-1 flex flex-col">
        <ProspectorNavbar />
        <main className="p-4 lg:p-8">
          <div className="w-full">

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Gestion de Prospectos</h1>
                <p className="text-slate-500 mt-1">Administra y da seguimiento a tus prospectos activos</p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <button onClick={handleExportCsv} className="flex items-center gap-2 bg-white hover:bg-(--theme-50) text-(--theme-700) border border-(--theme-200) px-4 py-2.5 rounded-xl font-medium shadow-sm transition-all" title="Exportar lista actual a CSV">
                  <Download className="w-4 h-4" />
                  <span>Exportar CSV</span>
                </button>
                <button onClick={() => setIsImportModalAbierto(true)} className="flex items-center gap-2 bg-white hover:bg-amber-50 text-amber-700 border border-amber-200 px-4 py-2.5 rounded-xl font-medium shadow-sm transition-all" title="Importar prospectos desde CSV">
                  <Upload className="w-4 h-4" />
                  <span>Importar CSV</span>
                </button>
                <button onClick={() => setIsModalAbierto(true)} className="flex items-center gap-2 bg-(--theme-600) hover:bg-(--theme-700) text-white px-4 py-2.5 rounded-xl font-medium shadow-sm transition-all">
                  <UserPlus className="w-5 h-5" />
                  <span>Nuevo Prospecto</span>
                </button>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6 font-sans">
              <div className="grid grid-cols-1 lg:grid-cols-[30%_1fr] gap-4 items-center">

                {/* 30% Búsqueda */}
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input type="text" placeholder="Buscar prospectos..." className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-(--theme-500) focus:border-(--theme-500) transition-all outline-none bg-slate-50 text-sm h-[42px]" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} title="Buscar por nombre, empresa o telefono" />
                </div>

                {/* 70% Filtros */}
                <div className="flex flex-wrap items-center gap-3 w-full">
                  {/* Filtro Etapa (Chips) */}
                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-0.5 overflow-x-auto shrink-0">
                    {[{ key: 'todos', label: 'Todos' }, { key: 'prospecto_nuevo', label: 'Nuevos' }, { key: 'en_contacto', label: 'Contacto' }, { key: 'reunion_agendada', label: 'Agendados' }].map(f => (
                      <button key={f.key} onClick={() => setFiltroEtapa(f.key)} className={`px-2 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${filtroEtapa === f.key ? 'bg-white text-(--theme-600) shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{f.label}</button>
                    ))}
                  </div>

                  {/* Filtro Fecha Select */}
                  <div className="flex flex-col sm:flex-row gap-2 h-[42px]">
                    <select
                      value={filtroFecha}
                      onChange={(e) => setFiltroFecha(e.target.value)}
                      className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50 text-gray-700 focus:ring-2 focus:ring-(--theme-500) focus:outline-none cursor-pointer h-full"
                    >
                      <option value="todos">📅 Cualquier fecha</option>
                      <option value="hoy">Hoy</option>
                      <option value="ayer">Ayer</option>
                      <option value="semana">Últimos 7 días</option>
                      <option value="mes">Últimos 30 días</option>
                      <option value="personalizado">Rango personalizado...</option>
                    </select>
                    {filtroFecha === 'personalizado' && (
                      <div className="flex gap-1 items-center bg-slate-50 border border-slate-200 rounded-xl px-2 h-full">
                        <input
                          type="date"
                          value={fechaDesde}
                          onChange={(e) => setFechaDesde(e.target.value)}
                          className="bg-transparent text-sm w-[110px] focus:outline-none text-slate-700"
                          title="Desde"
                        />
                        <span className="text-slate-400 text-xs">-</span>
                        <input
                          type="date"
                          value={fechaHasta}
                          onChange={(e) => setFechaHasta(e.target.value)}
                          className="bg-transparent text-sm w-[110px] focus:outline-none text-slate-700"
                          title="Hasta"
                        />
                      </div>
                    )}
                  </div>

                  <button onClick={() => fetchProspectos()} className="p-2 text-slate-500 hover:text-(--theme-600) hover:bg-(--theme-50) rounded-xl transition-all border border-slate-200 shrink-0 h-[42px] px-3 flex items-center justify-center ml-auto" title="Actualizar lista">
                    <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loading ? (
                Array(6).fill(0).map((_, i) => (
                  <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-pulse">
                    <div className="flex justify-between mb-4"><div className="h-6 bg-slate-200 rounded-md w-3/4"></div><div className="h-6 bg-slate-200 rounded-full w-10"></div></div>
                    <div className="space-y-3"><div className="h-4 bg-slate-100 rounded w-full"></div><div className="h-4 bg-slate-100 rounded w-5/6"></div><div className="h-4 bg-slate-100 rounded w-4/6"></div></div>
                  </div>
                ))
              ) : prospectos.filter(p => {
                // Apply date filter dynamically on the frontend
                if (filtroFecha === 'todos') return true;

                const hoy = new Date();
                hoy.setHours(0, 0, 0, 0);
                const fechaCreacion = new Date(p.createdAt || p.fechaUltimaEtapa || new Date());
                fechaCreacion.setHours(0, 0, 0, 0);

                if (filtroFecha === 'hoy') return fechaCreacion.getTime() === hoy.getTime();
                if (filtroFecha === 'ayer') {
                  const ayer = new Date(hoy);
                  ayer.setDate(hoy.getDate() - 1);
                  return fechaCreacion.getTime() === ayer.getTime();
                }
                if (filtroFecha === 'semana') {
                  const semanaPasada = new Date(hoy);
                  semanaPasada.setDate(hoy.getDate() - 7);
                  return fechaCreacion >= semanaPasada && fechaCreacion <= hoy;
                }
                if (filtroFecha === 'mes') {
                  const mesPasado = new Date(hoy);
                  mesPasado.setDate(hoy.getDate() - 30);
                  return fechaCreacion >= mesPasado && fechaCreacion <= hoy;
                }
                if (filtroFecha === 'personalizado' && fechaDesde && fechaHasta) {
                  const dDesde = new Date(fechaDesde);
                  dDesde.setHours(0, 0, 0, 0);
                  const dHasta = new Date(fechaHasta);
                  dHasta.setHours(23, 59, 59, 999);
                  return fechaCreacion >= dDesde && fechaCreacion <= dHasta;
                }
                return true;
              }).length > 0 ? (
                prospectos.filter(p => {
                  if (filtroFecha === 'todos') return true;
                  const hoy = new Date();
                  hoy.setHours(0, 0, 0, 0);
                  const fechaCreacion = new Date(p.createdAt || p.fechaUltimaEtapa || new Date());
                  fechaCreacion.setHours(0, 0, 0, 0);

                  if (filtroFecha === 'hoy') return fechaCreacion.getTime() === hoy.getTime();
                  if (filtroFecha === 'ayer') { const ayer = new Date(hoy); ayer.setDate(hoy.getDate() - 1); return fechaCreacion.getTime() === ayer.getTime(); }
                  if (filtroFecha === 'semana') { const semanaPasada = new Date(hoy); semanaPasada.setDate(hoy.getDate() - 7); return fechaCreacion >= semanaPasada && fechaCreacion <= hoy; }
                  if (filtroFecha === 'mes') { const mesPasado = new Date(hoy); mesPasado.setDate(hoy.getDate() - 30); return fechaCreacion >= mesPasado && fechaCreacion <= hoy; }
                  if (filtroFecha === 'personalizado' && fechaDesde && fechaHasta) {
                    const dDesde = new Date(fechaDesde); dDesde.setHours(0, 0, 0, 0);
                    const dHasta = new Date(fechaHasta); dHasta.setHours(23, 59, 59, 999);
                    return fechaCreacion >= dDesde && fechaCreacion <= dHasta;
                  }
                  return true;
                }).map((prospecto) => (
                  <div key={prospecto.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group overflow-hidden">
                    <div className="p-5 border-b border-slate-100">
                      <div className="flex justify-between items-start mb-2">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getEtapaColor(prospecto.etapaEmbudo)}`}>{(prospecto.etapaEmbudo || 'prospecto_nuevo').replace('_', ' ').toUpperCase()}</span>
                        <div className="flex items-center gap-1 text-yellow-500"><Star className={`w-4 h-4 ${prospecto.interes >= 3 ? 'fill-current' : ''}`} /><span className="text-sm font-bold text-slate-700">{prospecto.interes || 0}</span></div>
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 group-hover:text-(--theme-600) transition-colors">{prospecto.nombres} {prospecto.apellidoPaterno}</h3>
                      {prospecto.empresa && (<div className="flex items-center gap-1.5 text-slate-500 mt-1 text-sm font-medium"><Building className="w-4 h-4" /><span>{prospecto.empresa}</span></div>)}
                    </div>
                    <div className="p-5 space-y-3 bg-slate-50/50">
                      <div className="flex items-center gap-3 text-slate-600"><div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center"><Phone className="w-4 h-4 text-(--theme-500)" /></div><span className="text-sm font-medium">{prospecto.telefono}</span></div>
                      {prospecto.correo && (<div className="flex items-center gap-3 text-slate-600"><div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center"><Mail className="w-4 h-4 text-(--theme-500)" /></div><span className="text-sm truncate font-medium">{prospecto.correo}</span></div>)}
                      <div className="flex items-center gap-3 text-slate-500 pt-2 border-t border-slate-100 italic text-xs"><Clock className="w-4 h-4" /><span>Actualizado: {formatearFecha(prospecto.updated_at || prospecto.fechaUltimaEtapa)}</span></div>
                    </div>
                    <div className="px-5 py-4 flex items-center justify-between bg-white">
                      <button
                        onClick={(e) => { e.stopPropagation(); setProspectoAEliminar(prospecto); }}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="Eliminar prospecto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <a href={`/prospector/prospecto/${prospecto.id}`} className="flex items-center gap-2 text-(--theme-600) font-bold text-sm hover:underline">Gestionar<ChevronRight className="w-4 h-4" /></a>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-12 flex flex-col items-center justify-center bg-white rounded-3xl border border-dashed border-slate-300">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4"><Search className="w-8 h-8 text-slate-400" /></div>
                  <h3 className="text-lg font-bold text-slate-800">No se encontraron prospectos</h3>
                  <p className="text-slate-500">Intenta con otros terminos de busqueda o filtros.</p>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Modal de confirmación para eliminar */}
        <Modal isOpen={!!prospectoAEliminar} onClose={() => setProspectoAEliminar(null)} title="Eliminar Prospecto">
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-800">¿Estás seguro de eliminar este prospecto?</p>
                <p className="text-red-700 text-sm mt-1">
                  Se eliminará permanentemente a <strong>{prospectoAEliminar?.nombres} {prospectoAEliminar?.apellidoPaterno}</strong> y todo su historial de actividades. Esta acción no se puede deshacer.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setProspectoAEliminar(null)}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleEliminarProspecto}
                disabled={eliminando}
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-xl font-bold shadow-md disabled:opacity-50 flex items-center gap-2 transition-all"
              >
                <Trash2 className="w-4 h-4" />
                {eliminando ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </Modal>

        <Modal isOpen={isModalAbierto} onClose={() => setIsModalAbierto(false)} title="Agregar Nuevo Prospecto">
          <form onSubmit={handleCrearProspecto} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-semibold text-slate-700 mb-1">Nombres</label><input type="text" className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-(--theme-500) outline-none" value={nuevoProspecto.nombres} onChange={(e) => setNuevoProspecto({ ...nuevoProspecto, nombres: e.target.value })} /></div>
              <div><label className="block text-sm font-semibold text-slate-700 mb-1">Apellido Paterno</label><input type="text" className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-(--theme-500) outline-none" value={nuevoProspecto.apellidoPaterno} onChange={(e) => setNuevoProspecto({ ...nuevoProspecto, apellidoPaterno: e.target.value })} /></div>
              <div><label className="block text-sm font-semibold text-slate-700 mb-1">Telefono</label><input type="tel" className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-(--theme-500) outline-none" value={nuevoProspecto.telefono} onChange={(e) => setNuevoProspecto({ ...nuevoProspecto, telefono: e.target.value })} /></div>
              <div><label className="block text-sm font-semibold text-slate-700 mb-1">Correo Electronico</label><input type="email" className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-(--theme-500) outline-none" value={nuevoProspecto.correo} onChange={(e) => setNuevoProspecto({ ...nuevoProspecto, correo: e.target.value })} /></div>
              <div className="md:col-span-2"><label className="block text-sm font-semibold text-slate-700 mb-1">Empresa</label><input type="text" className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-(--theme-500) outline-none" value={nuevoProspecto.empresa} onChange={(e) => setNuevoProspecto({ ...nuevoProspecto, empresa: e.target.value })} /></div>
              <div className="md:col-span-2"><label className="block text-sm font-semibold text-slate-700 mb-1">Notas Iniciales</label><textarea className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-(--theme-500) outline-none min-h-[100px]" value={nuevoProspecto.notas} onChange={(e) => setNuevoProspecto({ ...nuevoProspecto, notas: e.target.value })} placeholder="Informacion relevante sobre el primer contacto..." /></div>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <button type="button" onClick={() => setIsModalAbierto(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-all">Cancelar</button>
              <button type="submit" disabled={isCargandoModal} className="bg-(--theme-600) hover:bg-(--theme-700) text-white px-6 py-2 rounded-xl font-bold shadow-md disabled:opacity-50 flex items-center gap-2">{isCargandoModal ? 'Creando...' : 'Guardar Prospecto'}</button>
            </div>
          </form>
        </Modal>

        <Modal isOpen={isImportModalAbierto} onClose={resetImportModal} title="Importar Prospectos desde CSV">
          <div className="space-y-5">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              <p className="font-semibold mb-1">Formato esperado del CSV:</p>
              <p className="font-mono text-xs bg-amber-100 rounded p-2 mt-1 overflow-x-auto whitespace-nowrap">Nombres,Apellido Paterno,Apellido Materno,Telefono,Correo,Empresa,Notas</p>
              <p className="mt-2 text-amber-700 text-xs">Todos los campos son opcionales. Los datos se importarán tal como estén en el CSV.</p>
            </div>

            {!importResult && (
              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center cursor-pointer hover:border-(--theme-400) hover:bg-(--theme-50)/30 transition-all" onClick={() => fileInputRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileChange({ target: { files: [f] } }); }}>
                <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileChange} />
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                {csvFile ? (
                  <div><p className="font-semibold text-slate-700">{csvFile.name}</p><p className="text-slate-400 text-sm mt-1">Haz clic para cambiar el archivo</p></div>
                ) : (
                  <div><p className="font-semibold text-slate-600">Arrastra tu CSV aqui o haz clic para seleccionar</p><p className="text-slate-400 text-sm mt-1">Solo archivos .csv</p></div>
                )}
              </div>
            )}

            {csvPreview && !importResult && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">{csvPreview.data.length} prospecto(s) listos para importar</span>
                  {csvPreview.errors.length > 0 && <span className="text-xs text-amber-600 font-medium">{csvPreview.errors.length} fila(s) con advertencias</span>}
                </div>
                {csvPreview.errors.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 max-h-24 overflow-y-auto space-y-1">
                    {csvPreview.errors.map((e, i) => <p key={i}>{e}</p>)}
                  </div>
                )}
                {csvPreview.data.length > 0 && (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-48">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50"><tr>{['Nombres', 'Telefono', 'Empresa', 'Correo'].map(h => <th key={h} className="px-3 py-2 text-left font-semibold text-slate-600">{h}</th>)}</tr></thead>
                      <tbody>
                        {csvPreview.data.slice(0, 10).map((row, i) => (
                          <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                            <td className="px-3 py-2 text-slate-700">{row.nombres} {row.apellidoPaterno}</td>
                            <td className="px-3 py-2 text-slate-600">{row.telefono}</td>
                            <td className="px-3 py-2 text-slate-500">{row.empresa}</td>
                            <td className="px-3 py-2 text-slate-500">{row.correo}</td>
                          </tr>
                        ))}
                        {csvPreview.data.length > 10 && <tr className="border-t border-slate-100"><td colSpan={4} className="px-3 py-2 text-center text-slate-400 italic">...y {csvPreview.data.length - 10} mas</td></tr>}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {importResult && (
              <div className="bg-(--theme-50) border border-(--theme-200) rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3"><CheckCircle className="w-5 h-5 text-(--theme-600)" /><span className="font-semibold text-(--theme-700)">Importacion completada</span></div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white rounded-lg p-3 text-center border border-(--theme-100)"><p className="text-2xl font-bold text-(--theme-600)">{importResult.insertados}</p><p className="text-xs text-slate-500 mt-1">Insertados</p></div>
                  <div className="bg-white rounded-lg p-3 text-center border border-slate-100"><p className="text-2xl font-bold text-amber-500">{importResult.duplicados}</p><p className="text-xs text-slate-500 mt-1">Duplicados</p></div>
                  <div className="bg-white rounded-lg p-3 text-center border border-slate-100"><p className="text-2xl font-bold text-red-400">{importResult.errores}</p><p className="text-xs text-slate-500 mt-1">Errores</p></div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button onClick={resetImportModal} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-all">{importResult ? 'Cerrar' : 'Cancelar'}</button>
              {!importResult && (
                <button onClick={handleImportCsv} disabled={importando || !csvPreview || csvPreview.data.length === 0} className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-xl font-bold shadow-md disabled:opacity-50 flex items-center gap-2 transition-all">
                  <Upload className="w-4 h-4" />
                  {importando ? 'Importando...' : `Importar ${csvPreview?.data.length || 0} prospectos`}
                </button>
              )}
            </div>
          </div>
        </Modal>

      </div>
    </div>
  );
};

export default ProspectorProspectos;
