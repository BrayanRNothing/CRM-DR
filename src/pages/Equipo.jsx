import { useState, useEffect, useCallback } from 'react';
import { Users, UserPlus, Edit2, Power, Crown, Shield, ChevronRight, X, Check, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { getUser, getToken } from '../utils/authUtils';
import API_URL from '../config/api';

// Rol único: vendedor
const ROLES = [
  { value: 'vendedor', label: 'Vendedor', color: '#10b981', bg: '#d1fae5' },
];

const getRolBadge = (rol) => {
  const r = ROLES.find(x => x.value === rol) || { label: rol, color: '#64748b', bg: '#f1f5f9' };
  return (
    <span className="ge-badge" style={{ color: r.color, background: r.bg }}>
      {r.label}
    </span>
  );
};

const inferRoleKey = (rol) => {
  const normalized = String(rol || '').toLowerCase();
  if (normalized === 'vendedor') return 'vendedor';
  if (normalized === 'closer') return 'closer';
  return 'prospector';
};

const initialForm = { usuario: '', contraseña: '', nombre: '', email: '', telefono: '', rol: 'vendedor' };

export default function Equipo() {
  const userAuth = getUser();
  const token = getToken();

  const [equipo, setEquipo] = useState(null);
  const [miembros, setMiembros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const [renameMode, setRenameMode] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);

  const headers = { 'Content-Type': 'application/json', 'x-auth-token': token };

  const fetchEquipo = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/equipos/mi-equipo`, { headers });
      if (!res.ok) throw new Error((await res.json()).mensaje || 'Error al cargar equipo');
      const data = await res.json();
      setEquipo(data.equipo);
      setMiembros(data.miembros || []);
      setNuevoNombre(data.equipo?.nombre || '');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

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
    const accion = miembro.activo ? 'desactivar' : 'TODO: reactivar';
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
    } catch (e) {
      alert(e.message);
    } finally {
      setRenameLoading(false);
    }
  };

  const esOwner = equipo?.esOwner;

  return (
    <div className="ge-root">
      <style>{`
        .ge-root {
          font-family: 'Inter', -apple-system, sans-serif;
          min-height: 100vh;
          background: linear-gradient(135deg, #f8faff 0%, #f0f4ff 100%);
          padding: 2rem;
          color: #0f172a;
        }
        .ge-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem; flex-wrap: wrap; }
        .ge-header-icon { width: 56px; height: 56px; border-radius: 16px; background: linear-gradient(135deg, var(--theme-500, #6366f1), var(--theme-600, #4f46e5)); display: flex; align-items: center; justify-center: center; align-items: center; justify-content: center; box-shadow: 0 8px 24px -4px rgba(99,102,241,.35); }
        .ge-title { font-size: 1.75rem; font-weight: 900; letter-spacing: -0.04em; color: #0f172a; }
        .ge-subtitle { font-size: 0.75rem; color: #64748b; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; margin-top: 2px; }
        .ge-card { background: white; border-radius: 20px; box-shadow: 0 4px 24px -4px rgba(0,0,0,.08); padding: 1.75rem; border: 1px solid #f1f5f9; margin-bottom: 1.5rem; }
        .ge-equipo-row { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
        .ge-equipo-name { font-size: 1.4rem; font-weight: 900; letter-spacing: -0.03em; color: #0f172a; }
        .ge-crown { color: #f59e0b; }
        .ge-input { width: 100%; padding: 0.65rem 1rem; border-radius: 10px; border: 1.5px solid #e2e8f0; font-size: 0.9rem; font-weight: 600; outline: none; transition: border-color 0.2s; background: #f8faff; color: #0f172a; }
        .ge-input:focus { border-color: var(--theme-500, #6366f1); background: white; }
        .ge-btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1.25rem; border-radius: 10px; font-weight: 800; font-size: 0.78rem; letter-spacing: 0.04em; text-transform: uppercase; border: none; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
        .ge-btn-primary { background: linear-gradient(135deg, var(--theme-500, #6366f1), var(--theme-600, #4f46e5)); color: white; box-shadow: 0 4px 12px -2px rgba(99,102,241,.4); }
        .ge-btn-primary:hover { opacity: 0.88; transform: translateY(-1px); }
        .ge-btn-ghost { background: #f1f5f9; color: #475569; }
        .ge-btn-ghost:hover { background: #e2e8f0; }
        .ge-btn-danger { background: #fef2f2; color: #ef4444; }
        .ge-btn-danger:hover { background: #fee2e2; }
        .ge-section-title { font-size: 0.7rem; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; color: #94a3b8; margin-bottom: 1rem; }
        .ge-summary-box { background: #fafbff; border: 1.5px solid #eef2ff; border-radius: 16px; padding: 1rem; }
        .ge-summary-label { font-size: 0.68rem; font-weight: 900; color: #64748b; letter-spacing: 0.08em; text-transform: uppercase; }
        .ge-summary-value { font-size: 1.8rem; font-weight: 900; letter-spacing: -0.04em; color: #0f172a; margin-top: 0.35rem; }
        .ge-summary-hint { font-size: 0.76rem; color: #94a3b8; font-weight: 600; margin-top: 0.2rem; }
        .ge-members-grid { display: grid; gap: 0.75rem; }
        .ge-member-row { display: flex; align-items: center; gap: 1rem; padding: 1rem 1.25rem; border-radius: 14px; border: 1.5px solid #f1f5f9; background: #fafbff; transition: all 0.2s; }
        .ge-member-row:hover { border-color: #e0e7ff; background: white; box-shadow: 0 2px 12px -2px rgba(0,0,0,.06); }
        .ge-avatar { width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, var(--theme-500, #6366f1), var(--theme-600, #4f46e5)); display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 1rem; flex-shrink: 0; }
        .ge-member-info { flex: 1; min-width: 0; }
        .ge-member-name { font-weight: 800; font-size: 0.95rem; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ge-member-usuario { font-size: 0.7rem; color: #94a3b8; font-weight: 600; }
        .ge-badge { font-size: 0.65rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; padding: 0.25rem 0.65rem; border-radius: 20px; }
        .ge-inactive { opacity: 0.45; }
        .ge-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); backdrop-filter: blur(6px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1rem; }
        .ge-modal { background: white; border-radius: 24px; padding: 2rem; width: 100%; max-width: 480px; box-shadow: 0 32px 64px -16px rgba(0,0,0,.2); }
        .ge-modal-title { font-size: 1.3rem; font-weight: 900; letter-spacing: -0.03em; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.75rem; }
        .ge-form-row { margin-bottom: 1rem; }
        .ge-form-label { font-size: 0.68rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #64748b; margin-bottom: 0.4rem; display: block; }
        .ge-select { appearance: none; width: 100%; padding: 0.65rem 1rem; border-radius: 10px; border: 1.5px solid #e2e8f0; font-size: 0.9rem; font-weight: 700; outline: none; background: #f8faff; color: #0f172a; cursor: pointer; }
        .ge-select:focus { border-color: var(--theme-500, #6366f1); }
        .ge-error { background: #fef2f2; color: #ef4444; border-radius: 10px; padding: 0.75rem 1rem; font-size: 0.8rem; font-weight: 700; margin-bottom: 1rem; }
        .ge-success { background: #f0fdf4; color: #16a34a; border-radius: 10px; padding: 0.75rem 1rem; font-size: 0.8rem; font-weight: 700; margin-bottom: 1rem; }
        .ge-empty { text-align: center; padding: 3rem 1rem; color: #94a3b8; font-weight: 600; }
        .ge-spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Header */}
      <div className="ge-header">
        <div className="ge-header-icon">
          <Users size={26} color="white" />
        </div>
        <div>
          <div className="ge-title">Equipo y usuarios</div>
          <div className="ge-subtitle">Gestión unificada de miembros, roles y configuración</div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <button className="ge-btn ge-btn-ghost" onClick={fetchEquipo} title="Actualizar">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <Loader2 size={36} style={{ color: 'var(--theme-500, #6366f1)' }} className="ge-spin" />
        </div>
      )}

      {error && !loading && (
        <div className="ge-error" style={{ maxWidth: 480 }}>⚠️ {error}</div>
      )}

      {!loading && !error && equipo && (
        <>
          {(() => {
            const totales = miembros.reduce((acc, miembro) => {
              acc.total += 1;
              acc.activos += miembro.activo ? 1 : 0;
              acc[inferRoleKey(miembro.rol)] += 1;
              return acc;
            }, { total: 0, activos: 0, prospector: 0, closer: 0, vendedor: 0 });

            return (
              <div className="ge-card">
                <div className="ge-section-title">Resumen rápido</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
                  <div className="ge-summary-box">
                    <div className="ge-summary-label">Miembros</div>
                    <div className="ge-summary-value">{totales.total}</div>
                    <div className="ge-summary-hint">Usuarios dentro del equipo</div>
                  </div>
                  <div className="ge-summary-box">
                    <div className="ge-summary-label">Activos</div>
                    <div className="ge-summary-value">{totales.activos}</div>
                    <div className="ge-summary-hint">Disponibles para operar</div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Info del Equipo */}
          <div className="ge-card">
            <div className="ge-section-title">Información del Equipo</div>
            <div className="ge-equipo-row">
              {renameMode ? (
                <>
                  <input
                    className="ge-input"
                    value={nuevoNombre}
                    onChange={e => setNuevoNombre(e.target.value)}
                    style={{ maxWidth: 300 }}
                    autoFocus
                  />
                  <button className="ge-btn ge-btn-primary" onClick={handleRename} disabled={renameLoading}>
                    {renameLoading ? <Loader2 size={14} className="ge-spin" /> : <Check size={14} />} Guardar
                  </button>
                  <button className="ge-btn ge-btn-ghost" onClick={() => setRenameMode(false)}>
                    <X size={14} /> Cancelar
                  </button>
                </>
              ) : (
                <>
                  <Crown size={22} className="ge-crown" />
                  <span className="ge-equipo-name">{equipo.nombre}</span>
                  {esOwner && (
                    <button className="ge-btn ge-btn-ghost" onClick={() => setRenameMode(true)}>
                      <Edit2 size={14} /> Renombrar
                    </button>
                  )}
                </>
              )}
            </div>
            <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
              {esOwner ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Crown size={12} style={{ color: '#f59e0b' }} /> Eres el propietario de este equipo
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Shield size={12} /> Eres miembro de este equipo
                </span>
              )}
            </div>
          </div>

          {/* Lista de Miembros */}
          <div className="ge-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div className="ge-section-title" style={{ marginBottom: 0 }}>
                Miembros ({miembros.length})
              </div>
              {esOwner && (
                <button className="ge-btn ge-btn-primary" onClick={() => setShowAddModal(true)}>
                  <UserPlus size={15} /> Agregar Miembro
                </button>
              )}
            </div>

            {miembros.length === 0 ? (
              <div className="ge-empty">
                <Users size={40} style={{ marginBottom: 8, opacity: 0.3 }} />
                <div>No hay miembros en el equipo aún</div>
              </div>
            ) : (
              <div className="ge-members-grid">
                {miembros.map(m => (
                  <div key={m.id} className={`ge-member-row${!m.activo ? ' ge-inactive' : ''}`}>
                    <div className="ge-avatar">
                      {m.nombre?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="ge-member-info">
                      <div className="ge-member-name">
                        {m.nombre}
                        {String(m.id) === String(equipo.owner_id) && (
                          <Crown size={13} style={{ color: '#f59e0b', marginLeft: 6, display: 'inline' }} />
                        )}
                        {String(m.id) === String(userAuth?.id) && (
                          <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginLeft: 8, fontWeight: 700 }}>(Tú)</span>
                        )}
                      </div>
                      <div className="ge-member-usuario">@{m.usuario} · {m.email || 'sin correo'}</div>
                    </div>
                    {getRolBadge(m.rol)}
                    {!m.activo && (
                      <span className="ge-badge" style={{ color: '#ef4444', background: '#fef2f2' }}>Inactivo</span>
                    )}
                    {esOwner && String(m.id) !== String(userAuth?.id) && String(m.id) !== String(equipo.owner_id) && (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {m.activo && (
                          <button
                            className="ge-btn ge-btn-danger"
                            onClick={() => handleToggleMember(m)}
                            title="Desactivar miembro"
                          >
                            <Power size={14} />
                          </button>
                        )}
                        <button
                          className="ge-btn ge-btn-danger"
                          onClick={() => handleDeleteMember(m)}
                          title="Eliminar miembro del equipo"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal Agregar Miembro */}
      {showAddModal && (
        <div className="ge-modal-overlay" onClick={e => e.target === e.currentTarget && setShowAddModal(false)}>
          <div className="ge-modal">
            <div className="ge-modal-title">
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, var(--theme-500, #6366f1), var(--theme-600, #4f46e5))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UserPlus size={20} color="white" />
              </div>
              Agregar Miembro
            </div>

            {formError && <div className="ge-error">{formError}</div>}
            {formSuccess && <div className="ge-success">{formSuccess}</div>}

            <form onSubmit={handleAddMember}>
              <div className="ge-form-row">
                <label className="ge-form-label">Nombre completo *</label>
                <input className="ge-input" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} required placeholder="Ej: Ana García" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="ge-form-row">
                  <label className="ge-form-label">Usuario *</label>
                  <input className="ge-input" value={form.usuario} onChange={e => setForm(p => ({ ...p, usuario: e.target.value }))} required placeholder="anagarcia" />
                </div>
                <div className="ge-form-row">
                  <label className="ge-form-label">Contraseña *</label>
                  <input className="ge-input" type="password" value={form.contraseña} onChange={e => setForm(p => ({ ...p, contraseña: e.target.value }))} required placeholder="••••••••" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="ge-form-row">
                  <label className="ge-form-label">Correo</label>
                  <input className="ge-input" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="ana@empresa.com" />
                </div>
                <div className="ge-form-row">
                  <label className="ge-form-label">Teléfono</label>
                  <input className="ge-input" value={form.telefono} onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))} placeholder="+52 55 1234 5678" />
                </div>
              </div>
              <div className="ge-form-row">
                <label className="ge-form-label">Rol *</label>
                <select className="ge-select" value={form.rol} onChange={e => setForm(p => ({ ...p, rol: e.target.value }))}>
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="submit" className="ge-btn ge-btn-primary" disabled={formLoading} style={{ flex: 1 }}>
                  {formLoading ? <Loader2 size={15} className="ge-spin" /> : <UserPlus size={15} />}
                  {formLoading ? 'Agregando...' : 'Agregar al Equipo'}
                </button>
                <button type="button" className="ge-btn ge-btn-ghost" onClick={() => { setShowAddModal(false); setFormError(''); setForm(initialForm); }}>
                  <X size={15} /> Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
