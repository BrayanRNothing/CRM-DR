import React, { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { UserPlus, Users, Loader2, Pencil, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import API_URL from '../config/api';
import { getToken, getUser } from '../utils/authUtils';

const initialForm = {
  usuario: '',
  contraseña: '',
  nombre: '',
  email: '',
  telefono: '',
  equipoNombre: ''
};

export default function AdminPanel() {
  const currentUser = useMemo(() => getUser(), []);
  const token = getToken();

  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [editingOwner, setEditingOwner] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [expandedOwnerId, setExpandedOwnerId] = useState(null);
  const [sortBy, setSortBy] = useState('estado_suscripcion');

  const isAdminRoot = currentUser?.rol === 'admin';

  const fetchOwners = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/usuarios/all`, {
        headers: { 'x-auth-token': token }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.mensaje || 'No se pudieron cargar los usuarios');
      setOwners(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(error.message || 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminRoot) {
      fetchOwners();
    }
  }, [isAdminRoot]);

  const sortedOwners = useMemo(() => {
    let sorted = [...owners];
    switch (sortBy) {
      case 'estado_suscripcion':
        sorted.sort((a, b) => {
          if (b.activo !== a.activo) return (b.activo ? 1 : 0) - (a.activo ? 1 : 0);
          if (b.plan_activo !== a.plan_activo) return (b.plan_activo ? 1 : 0) - (a.plan_activo ? 1 : 0);
          return new Date(b.fechaCreacion || 0) - new Date(a.fechaCreacion || 0);
        });
        break;
      case 'fecha_desc':
        sorted.sort((a, b) => new Date(b.fechaCreacion || 0) < new Date(a.fechaCreacion || 0) ? -1 : 1);
        break;
      case 'suscripcion_activa':
        sorted.sort((a, b) => (b.plan_activo ? 1 : 0) - (a.plan_activo ? 1 : 0));
        break;
      case 'estado_activos':
        sorted.sort((a, b) => (b.activo ? 1 : 0) - (a.activo ? 1 : 0));
        break;
      case 'estado_desactivados':
        sorted.sort((a, b) => (a.activo ? 1 : 0) - (b.activo ? 1 : 0));
        break;
      default:
        break;
    }
    return sorted;
  }, [owners, sortBy]);

  const groupedOwners = useMemo(() => {
    const ownersMap = new Map();
    const subUsers = [];

    sortedOwners.forEach(user => {
      if (user.owner_id && user.id !== user.owner_id) {
        subUsers.push(user);
      } else {
        ownersMap.set(user.id, { ...user, subUsers: [] });
      }
    });

    subUsers.forEach(sub => {
      const owner = ownersMap.get(sub.owner_id);
      if (owner) {
        owner.subUsers.push(sub);
      } else {
        ownersMap.set(sub.id, { ...sub, subUsers: [] });
      }
    });

    return Array.from(ownersMap.values());
  }, [sortedOwners]);

  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  if (!isAdminRoot) {
    return <Navigate to="/vendedor" replace />;
  }

  const handleInput = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateOwner = async (event) => {
    event.preventDefault();

    if (!form.usuario.trim() || !form.contraseña.trim() || !form.nombre.trim()) {
      toast.error('Usuario, contraseña y nombre son obligatorios');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/usuarios/team-owners`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify(form)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.mensaje || 'No se pudo crear propietario de equipo');

      toast.success('Propietario de equipo creado correctamente');
      setForm(initialForm);
      setCreatorOpen(false);
      fetchOwners();
    } catch (error) {
      toast.error(error.message || 'Error al crear propietario de equipo');
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = (owner) => {
    setEditingOwner(owner);
    setCreatorOpen(true);
    setForm({
      usuario: owner.usuario || '',
      contraseña: '',
      nombre: owner.nombre || '',
      email: owner.email || '',
      telefono: owner.telefono || '',
      equipoNombre: owner.team_name || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingOwner(null);
    setForm(initialForm);
    setCreatorOpen(false);
  };

  const handleUpdateOwner = async (event) => {
    event.preventDefault();

    if (!editingOwner) return;

    if (!form.usuario.trim() || !form.nombre.trim()) {
      toast.error('Usuario y nombre son obligatorios');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        usuario: form.usuario,
        nombre: form.nombre,
        email: form.email,
        telefono: form.telefono,
        equipoNombre: form.equipoNombre
      };

      if (form.contraseña.trim()) {
        payload.contraseña = form.contraseña;
      }

      const res = await fetch(`${API_URL}/api/usuarios/team-owners/${editingOwner.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.mensaje || 'No se pudo actualizar propietario de equipo');

      toast.success('Propietario de equipo actualizado');
      handleCancelEdit();
      fetchOwners();
    } catch (error) {
      toast.error(error.message || 'Error al actualizar propietario de equipo');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOwner = async (owner, hardDelete = false) => {
    const actionText = hardDelete ? 'eliminar permanentemente' : 'desactivar';
    const confirmDelete = window.confirm(
      hardDelete
        ? `¿⚠️ ATENCIÓN ⚠️\nEstás a punto de ELIMINAR PERMANENTEMENTE a ${owner.nombre} y TODOS sus clientes, ventas y tareas.\n\nEsta acción NO se puede deshacer.\n\n¿Seguro que quieres continuar?`
        : `¿Seguro que quieres desactivar a ${owner.nombre}? Sus datos se conservarán.`
    );
    if (!confirmDelete) return;

    setDeletingId(owner.id);
    try {
      const url = `${API_URL}/api/usuarios/team-owners/${owner.id}${hardDelete ? '?hard=true' : ''}`;
      const res = await fetch(url, {
        method: 'DELETE',
        headers: { 'x-auth-token': token }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.mensaje || `No se pudo ${actionText} el propietario de equipo`);

      toast.success(hardDelete ? 'Usuario eliminado permanentemente' : 'Usuario desactivado');
      if (editingOwner && editingOwner.id === owner.id) {
        handleCancelEdit();
      }
      fetchOwners();
    } catch (error) {
      toast.error(error.message || `Error al ${actionText} propietario de equipo`);
    } finally {
      setDeletingId(null);
    }
  };

  const toggleOwnerMembers = (ownerId) => {
    setExpandedOwnerId((current) => (String(current) === String(ownerId) ? null : ownerId));
  };

  return (
    <>
      <div className="w-full min-h-full bg-slate-50 p-6 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">Administración de usuarios del sistema</h1>
              <p className="text-xs md:text-sm text-gray-500 mt-0.5 leading-snug">
                Gestiona propietarios de equipo y revisa los usuarios creados por cada uno
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingOwner(null);
                setForm(initialForm);
                setCreatorOpen(true);
              }}
              className="w-full sm:w-auto justify-center flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors text-xs md:text-sm font-medium"
            >
              <UserPlus className="w-4 h-4 md:w-5 md:h-5" />
              Crear usuario del sistema
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="text-sm text-slate-600">
                Usuarios propietarios activos: <span className="font-bold text-slate-900">{groupedOwners.filter(o => o.activo).length}</span> de <span className="font-bold text-slate-900">{groupedOwners.length}</span>
              </div>
              <p className="text-xs text-slate-500">
                Haz click en "usuarios creados" para ver el detalle de cada equipo.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <h2 className="font-black text-slate-900 text-lg">Propietarios creados</h2>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="estado_suscripcion">Recomendado (Suscripción y Estado)</option>
                <option value="fecha_desc">Más recientes</option>
                <option value="suscripcion_activa">Suscripción Activa</option>
                <option value="estado_activos">Usuarios Activos</option>
                <option value="estado_desactivados">Usuarios Desactivados</option>
              </select>
            </div>

            {loading ? (
              <div className="h-40 flex items-center justify-center text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Cargando...
              </div>
            ) : owners.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-slate-500 text-sm">
                Aún no hay propietarios de equipo creados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-sm border-collapse">
                  <thead>
                    <tr className="text-left text-slate-500 border-b border-slate-100">
                      <th className="py-2 text-left font-black uppercase tracking-[0.16em] text-[10px] text-slate-500 w-1/4">Usuario</th>
                      <th className="py-2 text-left font-black uppercase tracking-[0.16em] text-[10px] text-slate-500">Credenciales</th>
                      <th className="py-2 text-left font-black uppercase tracking-[0.16em] text-[10px] text-slate-500">Equipo</th>
                      <th className="py-2 text-left font-black uppercase tracking-[0.16em] text-[10px] text-slate-500">Suscripción</th>
                      <th className="py-2 text-right font-black uppercase tracking-[0.16em] text-[10px] text-slate-500">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedOwners.map((owner, ownerIndex) => {
                      const isEvenRow = ownerIndex % 2 === 0;
                      const baseRowClass = isEvenRow
                        ? 'bg-white hover:bg-slate-50/70'
                        : 'bg-slate-100/70 hover:bg-slate-200/60';

                      return (
                        <React.Fragment key={owner.id}>
                        <tr className={`border-b border-slate-200 text-slate-800 align-top transition-colors ${baseRowClass} ${!owner.activo ? 'opacity-70 grayscale-[20%]' : ''}`}>
                          <td className="py-3 font-semibold">
                            <div className="flex flex-col gap-1">
                              <span>{owner.nombre}</span>
                              {!owner.activo && (
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 self-start">
                                  DESACTIVADO
                                </span>
                              )}
                              <span className="text-xs text-slate-500 font-normal">Creado: {new Date(owner.fechaCreacion).toLocaleDateString()}</span>
                              {owner.subUsers.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => toggleOwnerMembers(owner.id)}
                                  className="mt-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 self-start"
                                >
                                  {expandedOwnerId === owner.id ? 'Ocultar usuarios' : `Ver ${owner.subUsers.length} usuarios`}
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="py-3">
                            <div className="flex flex-col gap-1 text-sm">
                              <span className="font-medium text-slate-700">@{owner.usuario}</span>
                              <span className="text-slate-500 text-xs">{owner.email || '-'}</span>
                              <span className="text-slate-500 text-xs">{owner.telefono || '-'}</span>
                            </div>
                          </td>
                          <td className="py-3 text-sm">
                            <div className="flex flex-col gap-1">
                              <span>{owner.team_name || '-'}</span>
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-600 self-start">
                                {owner.rol}
                              </span>
                            </div>
                          </td>
                          <td className="py-3">
                            <div className="flex flex-col gap-1 text-sm">
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${owner.plan_activo ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                <span className="font-medium capitalize">{owner.plan || 'Básico'}</span>
                              </div>
                              {owner.plan_vencimiento ? (
                                <span className="text-xs text-slate-500">Vence: {new Date(owner.plan_vencimiento).toLocaleDateString()}</span>
                              ) : (
                                <span className="text-xs text-slate-500">Sin vencimiento</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3">
                            <div className="flex items-center justify-end gap-2">
                              {!owner.plan_activo && owner.activo ? (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (window.confirm('¿Activar acceso gratuito indefinido a este usuario?')) {
                                      try {
                                        const res = await fetch(`${API_URL}/api/usuarios/${owner.id}/activate-plan`, {
                                          method: 'POST',
                                          headers: { 'x-auth-token': token }
                                        });
                                        if (res.ok) {
                                          toast.success('Suscripción activada');
                                          fetchOwners();
                                        } else {
                                          toast.error('Error al activar');
                                        }
                                      } catch (err) {
                                        toast.error('Error de red al activar');
                                      }
                                    }
                                  }}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors font-medium text-sm"
                                >
                                  Activar Gratis
                                </button>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => handleStartEdit(owner)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" /> Editar
                              </button>
                              {owner.activo ? (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteOwner(owner, false)}
                                  disabled={deletingId === owner.id}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 disabled:opacity-60 transition-colors"
                                  title="Desactivar usuario (conservar historial)"
                                >
                                  {deletingId === owner.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} 
                                  Desactivar
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteOwner(owner, true)}
                                  disabled={deletingId === owner.id}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 transition-colors shadow-sm"
                                  title="Eliminar usuario y todos sus datos para siempre"
                                >
                                  {deletingId === owner.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} 
                                  Eliminar Permanente
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {expandedOwnerId === owner.id && owner.subUsers.map(sub => (
                          <tr key={sub.id} className="border-b border-slate-100 bg-indigo-50/30 text-slate-800 align-top transition-colors">
                            <td className="py-3 font-semibold pl-6 border-l-4 border-indigo-400">
                              <div className="flex flex-col gap-1">
                                <span className="flex items-center gap-2 text-sm text-indigo-900">
                                  <Users className="w-3.5 h-3.5 text-indigo-500" />
                                  {sub.nombre}
                                </span>
                                {!sub.activo && (
                                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 self-start">
                                    DESACTIVADO
                                  </span>
                                )}
                                <span className="text-xs text-slate-500 font-normal">Creado: {new Date(sub.fechaCreacion).toLocaleDateString()}</span>
                              </div>
                            </td>
                            <td className="py-3">
                              <div className="flex flex-col gap-1 text-sm">
                                <span className="font-medium text-slate-700">@{sub.usuario}</span>
                                <span className="text-slate-500 text-xs">{sub.email || '-'}</span>
                                <span className="text-slate-500 text-xs">{sub.telefono || '-'}</span>
                              </div>
                            </td>
                            <td className="py-3 text-sm">
                              <div className="flex flex-col gap-1">
                                <span className="text-slate-500">Miembro del equipo</span>
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-600 self-start">
                                  {sub.rol}
                                </span>
                              </div>
                            </td>
                            <td className="py-3">
                              <div className="flex flex-col gap-1 text-sm text-slate-500">
                                <span className="italic text-xs">Suscripción gestionada por el dueño</span>
                              </div>
                            </td>
                            <td className="py-3">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(sub)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors text-xs"
                                >
                                  <Pencil className="w-3.5 h-3.5" /> Editar
                                </button>
                                {sub.activo ? (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteOwner(sub, false)}
                                    disabled={deletingId === sub.id}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 disabled:opacity-60 transition-colors text-xs"
                                  >
                                    {deletingId === sub.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} 
                                    Desactivar
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteOwner(sub, true)}
                                    disabled={deletingId === sub.id}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 transition-colors shadow-sm text-xs"
                                  >
                                    {deletingId === sub.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} 
                                    Eliminar Permanente
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {creatorOpen && (
        <div
          className="fixed inset-0 z-1200 bg-slate-950/50 backdrop-blur-sm flex items-start justify-end p-4 md:p-6"
          onClick={(event) => {
            if (event.target === event.currentTarget) handleCancelEdit();
          }}
        >
          <form onSubmit={editingOwner ? handleUpdateOwner : handleCreateOwner} className="w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-2xl overflow-hidden mt-0 md:mt-4">
            <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-100 bg-slate-50/80">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Usuario del sistema</p>
                <h2 className="font-black text-slate-900 text-lg flex items-center gap-2 mt-1">
                  <UserPlus className="w-5 h-5" /> {editingOwner ? 'Editar usuario del sistema' : 'Crear usuario del sistema'}
                </h2>
              </div>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-600">
                Este usuario quedará como propietario de su equipo y podrá crear otros usuarios dentro de ese equipo.
              </p>

              <input
                name="nombre"
                value={form.nombre}
                onChange={handleInput}
                placeholder="Nombre completo"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-slate-300"
                required
              />
              <input
                name="usuario"
                value={form.usuario}
                onChange={handleInput}
                placeholder="Usuario"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-slate-300"
                required
              />
              <input
                name="contraseña"
                type="password"
                value={form.contraseña}
                onChange={handleInput}
                placeholder={editingOwner ? 'Nueva contraseña (opcional)' : 'Contraseña'}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-slate-300"
                required={!editingOwner}
              />
              <input
                name="equipoNombre"
                value={form.equipoNombre}
                onChange={handleInput}
                placeholder="Nombre del equipo (opcional)"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-slate-300"
              />
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleInput}
                placeholder="Email"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-slate-300"
              />
              <input
                name="telefono"
                value={form.telefono}
                onChange={handleInput}
                placeholder="Teléfono"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-slate-300"
              />

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  {saving ? (editingOwner ? 'Guardando...' : 'Creando...') : (editingOwner ? 'Guardar cambios' : 'Crear usuario del sistema')}
                </button>

                {editingOwner && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors flex items-center justify-center"
                    title="Cancelar edición"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
