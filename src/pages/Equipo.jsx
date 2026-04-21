import { useState, useEffect, useCallback } from 'react';
import { Users, UserPlus, Edit2, Power, Crown, Shield, X, Check, Loader2, RefreshCw, Trash2, Search, Download, AlertTriangle } from 'lucide-react';
import { getUser, getToken } from '../utils/authUtils';
import API_URL from '../config/api';

const ROL_UNICO = { value: 'vendedor', label: 'Vendedor', color: '#10b981', bg: '#d1fae5' };



const normalizeText = (value) => String(value || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const getRolBadge = (rol) => {
  return (
    <span className="ge-badge" style={{ color: ROL_UNICO.color, background: ROL_UNICO.bg }}>
      {ROL_UNICO.label}
    </span>
  );
};

const inferRoleKey = (rol) => {
  const normalized = String(rol || '').toLowerCase();
  if (normalized === 'vendedor') return 'vendedor';
  if (normalized === 'closer') return 'closer';
  return 'prospector';
};

const initialForm = { usuario: '', contraseña: '', nombre: '', email: '', telefono: '' };
const initialEditForm = { nombre: '', email: '', telefono: '' };

export default function Equipo() {
  const userAuth = getUser();
  const token = getToken();

  const [equipo, setEquipo] = useState(null);
  const [miembros, setMiembros] = useState([]);
  const [resumen, setResumen] = useState({ total: 0, activos: 0, inactivos: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filters, setFilters] = useState({ busqueda: '', estado: 'todos' });
  const [draftFilters, setDraftFilters] = useState({ busqueda: '', estado: 'todos' });

  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const [editMember, setEditMember] = useState(null);
  const [editForm, setEditForm] = useState(initialEditForm);
  const [editLoading, setEditLoading] = useState(false);

  const [renameMode, setRenameMode] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);



  const headers = { 'Content-Type': 'application/json', 'x-auth-token': token };

  const fetchEquipo = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filters.busqueda.trim()) params.set('busqueda', filters.busqueda.trim());
      if (filters.estado && filters.estado !== 'todos') params.set('estado', filters.estado);

      const url = `${API_URL}/api/equipos/mi-equipo${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error((await res.json()).mensaje || 'Error al cargar equipo');
      const data = await res.json();
      setEquipo(data.equipo);
      setMiembros(data.miembros || []);
      setResumen(data.resumen || { total: 0, activos: 0, inactivos: 0 });
      setNuevoNombre(data.equipo?.nombre || '');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filters.busqueda, filters.estado]);

  const applyFilters = () => {
    setFilters({
      busqueda: draftFilters.busqueda,
      estado: draftFilters.estado,
    });
  };



  useEffect(() => { fetchEquipo(); }, [fetchEquipo]);

  const handleAddMember = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    setFormSuccess('');
    try {
      const res = await fetch(`${API_URL}/api/equipos/agregar-miembro`, {
        method: 'POST',
        headers,
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.mensaje || 'Error al agregar miembro');
      setFormSuccess(`✅ ${data.usuario?.nombre} fue agregado al equipo`);
      setForm(initialForm);
      fetchEquipo();
      setTimeout(() => { setShowAddModal(false); setFormSuccess(''); }, 2000);
    } catch (e) {
      setFormError(e.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleMember = async (miembro) => {
    if (String(miembro.id) === String(userAuth?.id)) return;
    if (!window.confirm(`¿Desactivar a ${miembro.nombre}?`)) return;
    try {
      const res = await fetch(`${API_URL}/api/equipos/miembro/${miembro.id}`, {
        method: 'DELETE', headers
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.mensaje);
      fetchEquipo();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleReactivateMember = async (miembro) => {
    if (!window.confirm(`¿Reactivar a ${miembro.nombre}?`)) return;
    try {
      const res = await fetch(`${API_URL}/api/equipos/miembro/${miembro.id}/reactivar`, {
        method: 'PATCH', headers
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.mensaje);
      fetchEquipo();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleDeleteMember = async (miembro) => {
    if (String(miembro.id) === String(userAuth?.id)) {
      alert('No puedes eliminarte a ti mismo');
      return;
    }
    if (String(miembro.id) === String(equipo.owner_id)) {
      alert('No puedes eliminar al propietario del equipo');
      return;
    }
    if (!window.confirm(`¿Eliminar permanentemente a ${miembro.nombre} del equipo?`)) return;
    try {
      const res = await fetch(`${API_URL}/api/equipos/miembro/${miembro.id}/eliminar`, {
        method: 'DELETE', headers
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.mensaje);
      fetchEquipo();
    } catch (e) {
      alert(e.message);
    }
  };

  const openEditModal = (miembro) => {
    setEditMember(miembro);
    setEditForm({
      nombre: miembro.nombre || '',
      email: miembro.email || '',
      telefono: miembro.telefono || '',
    });
  };

  const handleEditMember = async (e) => {
    e.preventDefault();
    if (!editMember) return;
    setEditLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/equipos/miembro/${editMember.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.mensaje || 'No se pudo actualizar el miembro');
      setEditMember(null);
      setEditForm(initialEditForm);
      fetchEquipo();
    } catch (e2) {
      alert(e2.message);
    } finally {
      setEditLoading(false);
    }
  };



  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.busqueda.trim()) params.set('busqueda', filters.busqueda.trim());
      if (filters.estado && filters.estado !== 'todos') params.set('estado', filters.estado);

      const res = await fetch(`${API_URL}/api/equipos/exportar-miembros.csv?${params.toString()}`, { headers });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.mensaje || 'No se pudo exportar el CSV');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `equipo_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert(e.message);
    }
  };

  const handleRename = async () => {
    if (!nuevoNombre.trim()) return;
    setRenameLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/equipos/mi-equipo`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ nombre: nuevoNombre }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.mensaje);
      setEquipo(prev => ({ ...prev, nombre: nuevoNombre }));
      setRenameMode(false);
      fetchEquipo();
    } catch (e) {
      alert(e.message);
    } finally {
      setRenameLoading(false);
    }
  };

  const esOwner = equipo?.esOwner;
  const busquedaActiva = normalizeText(filters.busqueda.trim());
  const miembrosFiltrados = miembros.filter((m) => {
    if (filters.estado === 'activo' && !m.activo) return false;
    if (filters.estado === 'inactivo' && m.activo) return false;
    if (!busquedaActiva) return true;

    const nombre = normalizeText(m.nombre);
    const usuario = normalizeText(m.usuario);
    const email = normalizeText(m.email);
    return nombre.includes(busquedaActiva) || usuario.includes(busquedaActiva) || email.includes(busquedaActiva);
  });

  return (
    <div className="min-h-screen md:bg-slate-50 md:p-6 bg-white -m-4 md:m-0 p-4 pb-8 md:pb-6">
      {/* Team Info Card - NOW AT THE TOP */}
      <div className="max-w-full mx-auto space-y-6">
        {!loading && !error && equipo && (
          <div className="bg-white md:rounded-2xl p-5 border border-slate-200 shadow-sm md:shadow-md transition-all">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-(--theme-500) to-(--theme-600) flex items-center justify-center shadow-lg shadow-(--theme-500)/20">
                  <Crown size={28} className="text-white" />
                </div>
                <div>
                  {renameMode ? (
                    <div className="flex items-center gap-2">
                      <input
                        className="bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-2 font-semibold text-gray-800 outline-none focus:border-(--theme-500) transition-all"
                        value={nuevoNombre}
                        onChange={e => setNuevoNombre(e.target.value)}
                        autoFocus
                      />
                      <button className="p-2 bg-(--theme-500) text-white rounded-xl hover:opacity-90 transition-all" onClick={handleRename} disabled={renameLoading}>
                        {renameLoading ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                      </button>
                      <button className="p-2 bg-gray-100 text-gray-500 rounded-xl hover:bg-gray-200 transition-all" onClick={() => setRenameMode(false)}>
                        <X size={18} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900 leading-tight">{equipo.nombre}</h1>
                        {esOwner && (
                          <button
                            className="p-1.5 text-gray-400 hover:text-(--theme-600) hover:bg-(--theme-50) rounded-lg transition-all"
                            onClick={() => setRenameMode(true)}
                          >
                            <Edit2 size={16} />
                          </button>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mt-1">
                        {esOwner ? 'Propietario del Equipo' : 'Miembro del Equipo'}
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 md:gap-3 w-full md:w-auto mt-2 md:mt-0">
                <button
                  className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-3 py-2 md:px-4 md:py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] md:text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all shadow-sm"
                  onClick={fetchEquipo}
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                  ACTUALIZAR
                </button>
                {esOwner && (
                  <button
                    className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-3 py-2 md:px-4 md:py-2.5 bg-linear-to-r from-(--theme-600) to-(--theme-500) text-white rounded-xl text-[11px] md:text-xs font-bold shadow-lg shadow-(--theme-600)/20 hover:-translate-y-0.5 transition-all"
                    onClick={() => setShowAddModal(true)}
                  >
                    <UserPlus size={14} />
                    AGREGAR MIEMBRO
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {loading && !equipo && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={48} className="animate-spin text-(--theme-500) mb-4" />
            <p className="text-gray-500 font-semibold uppercase tracking-widest text-xs">Cargando datos del equipo...</p>
          </div>
        )}

        {error && (
          <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3 text-rose-600 font-semibold">
            <AlertTriangle size={20} />
            {error}
          </div>
        )}

        {/* Member List Section */}
        {!loading && equipo && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-white md:rounded-2xl p-5 border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-lg md:text-xl font-bold text-gray-900 leading-tight">Miembros del Equipo</h2>
                  <p className="text-[10px] md:text-xs text-gray-400 font-semibold uppercase tracking-widest mt-1">Gestión de acceso y roles</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-(--theme-500) transition-colors" size={16} />
                    <input
                      className="pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium w-full md:w-64 outline-none focus:bg-white focus:border-(--theme-500) focus:ring-4 focus:ring-(--theme-500)/10 transition-all"
                      value={draftFilters.busqueda}
                      onChange={e => setDraftFilters(prev => ({ ...prev, busqueda: e.target.value }))}
                      placeholder="Buscar por nombre, usuario..."
                    />
                  </div>
                  <select
                    className="flex-1 sm:flex-none px-3 py-2 md:px-4 md:py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs md:text-sm font-semibold text-gray-700 outline-none focus:bg-white focus:border-(--theme-500) transition-all cursor-pointer w-full sm:w-auto"
                    value={draftFilters.estado}
                    onChange={e => setDraftFilters(prev => ({ ...prev, estado: e.target.value }))}
                  >
                    <option value="todos">Todos los estados</option>
                    <option value="activo">Activos</option>
                    <option value="inactivo">Inactivos</option>
                  </select>
                  <button
                    className="flex-1 sm:flex-none px-4 py-2 md:px-6 md:py-2.5 bg-gray-900 text-white rounded-xl text-[11px] md:text-xs font-bold shadow-sm hover:bg-black transition-all whitespace-nowrap"
                    onClick={applyFilters}
                  >
                    FILTRAR
                  </button>
                  {esOwner && (
                    <button
                      className="p-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all"
                      onClick={handleExportCSV}
                      title="Exportar a CSV"
                    >
                      <Download size={18} />
                    </button>
                  )}
                </div>
              </div>

              {miembrosFiltrados.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                  <Users size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 font-semibold">No se encontraron miembros</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {miembrosFiltrados.map(m => (
                    <div
                      key={m.id}
                      className={`group relative p-5 bg-white border border-gray-200 rounded-2xl transition-all hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1 ${!m.activo ? 'grayscale opacity-70' : ''}`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-linear-to-br from-(--theme-50) to-(--theme-100) text-(--theme-600) flex items-center justify-center font-bold text-lg border border-(--theme-100)">
                            {m.nombre?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-gray-900 truncate max-w-[120px]">{m.nombre}</h3>
                              {String(m.id) === String(equipo.owner_id) && <Crown size={14} className="text-amber-500" />}
                              {m.googleLinked && (
                                <div title="Google Calendar Vinculado">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 font-semibold">@{m.usuario}</p>
                          </div>
                        </div>
                        <div className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tighter ${m.activo ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                          {m.activo ? 'ACTIVO' : 'INACTIVO'}
                        </div>
                      </div>

                      <div className="space-y-2 mb-6 text-xs text-gray-500 font-semibold">
                        <div className="flex items-center gap-2">
                          <Shield size={12} className="text-gray-400" />
                          <span className="uppercase tracking-widest">{ROL_UNICO.label}</span>
                        </div>
                        <div className="flex items-center gap-2 truncate">
                          <Search size={12} className="text-gray-400" />
                          <span className="truncate">{m.email || 'Sin correo registrado'}</span>
                        </div>
                      </div>

                      {esOwner && String(m.id) !== String(userAuth?.id) && (
                        <div className="flex items-center gap-2 pt-4 border-t border-gray-50">
                          <button
                            className="flex-1 py-2 bg-gray-50 text-gray-600 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-gray-100 transition-all flex items-center justify-center gap-1"
                            onClick={() => openEditModal(m)}
                          >
                            <Edit2 size={12} /> EDITAR
                          </button>
                          {m.activo ? (
                            <button
                              className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                              onClick={() => handleToggleMember(m)}
                              title="Desactivar"
                            >
                              <Power size={14} />
                            </button>
                          ) : (
                            <button
                              className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                              onClick={() => handleReactivateMember(m)}
                              title="Reactivar"
                            >
                              <Check size={14} />
                            </button>
                          )}
                          <button
                            className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            onClick={() => handleDeleteMember(m)}
                            title="Eliminar"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}

                      {String(m.id) === String(userAuth?.id) && (
                        <div className="pt-4 border-t border-gray-50 text-center">
                          <span className="text-[10px] font-bold text-(--theme-600) bg-(--theme-50) px-3 py-1 rounded-full border border-(--theme-100)">ESTE ERES TÚ</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>


          </div>
        )}
      </div>

      {/* Modal Agregar Miembro */}
      {showAddModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] p-8 w-full max-w-xl shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
                  <UserPlus size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 leading-none">Nuevo Miembro</h3>
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest mt-1">Integrar al equipo</p>
                </div>
              </div>
              <button
                className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-all"
                onClick={() => { setShowAddModal(false); setFormError(''); setForm(initialForm); }}
              >
                <X size={24} />
              </button>
            </div>

            {formError && (
              <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 font-semibold text-sm">
                <AlertTriangle size={18} /> {formError}
              </div>
            )}
            {formSuccess && (
              <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-600 font-semibold text-sm italic">
                {formSuccess}
              </div>
            )}

            <form onSubmit={handleAddMember} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Nombre Completo *</label>
                <input
                  className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-sm font-semibold text-gray-800 outline-none focus:bg-white focus:border-indigo-500 focus:shadow-lg focus:shadow-indigo-500/10 transition-all"
                  value={form.nombre}
                  onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                  required
                  placeholder="Ej: Ana María García"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Usuario *</label>
                  <input
                    className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-sm font-semibold text-gray-800 outline-none focus:bg-white focus:border-indigo-500 transition-all font-mono"
                    value={form.usuario}
                    onChange={e => setForm(p => ({ ...p, usuario: e.target.value }))}
                    required
                    placeholder="amgarcia"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Contraseña *</label>
                  <input
                    className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-sm font-semibold text-gray-800 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                    type="password"
                    value={form.contraseña}
                    onChange={e => setForm(p => ({ ...p, contraseña: e.target.value }))}
                    required
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Correo Electrónico</label>
                  <input
                    className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-sm font-semibold text-gray-800 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                    type="email"
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="ana@empresa.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Teléfono</label>
                  <input
                    className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-sm font-semibold text-gray-800 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                    value={form.telefono}
                    onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))}
                    placeholder="+52 55 ..."
                  />
                </div>
              </div>

              <div className="pt-6 flex gap-4">
                <button
                  type="submit"
                  className="flex-1 py-4 bg-indigo-600 text-white rounded-[20px] text-xs font-bold uppercase tracking-widest shadow-xl shadow-indigo-600/30 hover:-translate-y-1 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  disabled={formLoading}
                >
                  {formLoading ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
                  {formLoading ? 'PROCESANDO...' : 'DAR DE ALTA EN EQUIPO'}
                </button>
                <button
                  type="button"
                  className="px-8 py-4 bg-gray-100 text-gray-500 rounded-[20px] text-xs font-bold uppercase tracking-widest hover:bg-gray-200 transition-all"
                  onClick={() => { setShowAddModal(false); setFormError(''); setForm(initialForm); }}
                >
                  CANCELAR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal (Reusing add modal styles) */}
      {editMember && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] p-8 w-full max-w-xl shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-inner">
                  <Edit2 size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 leading-none">Editar Perfil</h3>
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest mt-1">{editMember.nombre}</p>
                </div>
              </div>
              <button
                className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-all"
                onClick={() => setEditMember(null)}
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleEditMember} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Nombre Completo *</label>
                <input
                  className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-sm font-semibold text-gray-800 outline-none focus:bg-white focus:border-amber-500 transition-all"
                  value={editForm.nombre}
                  onChange={e => setEditForm(p => ({ ...p, nombre: e.target.value }))}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Correo Electrónico</label>
                  <input
                    className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-sm font-semibold text-gray-800 outline-none focus:bg-white focus:border-amber-500 transition-all"
                    type="email"
                    value={editForm.email}
                    onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Teléfono</label>
                  <input
                    className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-sm font-semibold text-gray-800 outline-none focus:bg-white focus:border-amber-500 transition-all"
                    value={editForm.telefono}
                    onChange={e => setEditForm(p => ({ ...p, telefono: e.target.value }))}
                  />
                </div>
              </div>

              <div className="pt-6 flex gap-4">
                <button
                  type="submit"
                  className="flex-1 py-4 bg-amber-500 text-white rounded-[20px] text-xs font-bold uppercase tracking-widest shadow-xl shadow-amber-500/30 hover:-translate-y-1 transition-all disabled:opacity-50"
                  disabled={editLoading}
                >
                  {editLoading ? 'GUARDANDO...' : 'ACTUALIZAR DATOS'}
                </button>
                <button
                  type="button"
                  className="px-8 py-4 bg-gray-100 text-gray-500 rounded-[20px] text-xs font-bold uppercase tracking-widest hover:bg-gray-200 transition-all"
                  onClick={() => setEditMember(null)}
                >
                  CANCELAR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
