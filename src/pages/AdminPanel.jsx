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

  const isAdminRoot = currentUser?.rol === 'admin';

  const fetchOwners = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/usuarios/team-owners`, {
        headers: { 'x-auth-token': token }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.mensaje || 'No se pudo cargar propietarios de equipo');
      setOwners(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(error.message || 'Error al cargar propietarios de equipo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminRoot) {
      fetchOwners();
    }
  }, [isAdminRoot]);

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
      equipoNombre: owner.equipo?.nombre || ''
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

  const handleDeleteOwner = async (owner) => {
    const confirmDelete = window.confirm(`¿Seguro que quieres eliminar a ${owner.nombre}?`);
    if (!confirmDelete) return;

    setDeletingId(owner.id);
    try {
      const res = await fetch(`${API_URL}/api/usuarios/team-owners/${owner.id}`, {
        method: 'DELETE',
        headers: { 'x-auth-token': token }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.mensaje || 'No se pudo eliminar propietario de equipo');

      toast.success('Propietario de equipo eliminado');
      if (editingOwner && editingOwner.id === owner.id) {
        handleCancelEdit();
      }
      fetchOwners();
    } catch (error) {
      toast.error(error.message || 'Error al eliminar propietario de equipo');
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
                Usuarios propietarios activos: <span className="font-bold text-slate-900">{owners.length}</span>
              </div>
              <p className="text-xs text-slate-500">
                Haz click en "usuarios creados" para ver el detalle de cada equipo.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <h2 className="font-black text-slate-900 text-lg mb-4">Propietarios creados</h2>

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
                      <th className="py-2">Nombre</th>
                      <th className="py-2">Usuario</th>
                      <th className="py-2">Equipo</th>
                      <th className="py-2">Email</th>
                      <th className="py-2">Teléfono</th>
                      <th className="py-2 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {owners.map((owner, ownerIndex) => {
                      const miembros = Array.isArray(owner.miembros) ? owner.miembros : [];
                      const isExpanded = String(expandedOwnerId) === String(owner.id);
                      const isEvenRow = ownerIndex % 2 === 0;
                      const baseRowClass = isEvenRow
                        ? 'bg-white hover:bg-slate-50/70'
                        : 'bg-slate-100/70 hover:bg-slate-200/60';
                      const expandedRowClass = isEvenRow
                        ? 'bg-slate-100/80 border-b border-slate-200'
                        : 'bg-slate-200/70 border-b border-slate-300/70';

                      return (
                        <React.Fragment key={owner.id}>
                          <tr className={`border-b border-slate-200 text-slate-800 align-top transition-colors ${baseRowClass}`}>
                            <td className="py-3 font-semibold">
                              <div className="flex flex-col gap-2">
                                <span>{owner.nombre}</span>
                                <button
                                  type="button"
                                  onClick={() => toggleOwnerMembers(owner.id)}
                                  className="self-start inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                                >
                                  <Users className="w-3 h-3" />
                                  {miembros.length} usuarios creados
                                </button>
                              </div>
                            </td>
                            <td className="py-3">{owner.usuario}</td>
                            <td className="py-3">{owner.equipo?.nombre || '-'}</td>
                            <td className="py-3">{owner.email || '-'}</td>
                            <td className="py-3">{owner.telefono || '-'}</td>
                            <td className="py-3">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(owner)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                                >
                                  <Pencil className="w-3.5 h-3.5" /> Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteOwner(owner)}
                                  disabled={deletingId === owner.id}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-60 transition-colors"
                                >
                                  {deletingId === owner.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Eliminar
                                </button>
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className={expandedRowClass}>
                              <td colSpan="6" className="py-4 px-4">
                                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                  <div className="flex items-center justify-between gap-3 mb-3">
                                    <div>
                                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Usuarios creados por este usuario</p>
                                      <h3 className="text-sm font-black text-slate-900">{owner.nombre}</h3>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => toggleOwnerMembers(owner.id)}
                                      className="text-xs font-bold text-slate-500 hover:text-slate-900"
                                    >
                                      Ocultar
                                    </button>
                                  </div>

                                  {miembros.length === 0 ? (
                                    <div className="text-sm text-slate-500">Este usuario aún no tiene usuarios creados en su equipo.</div>
                                  ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                      {miembros.map((miembro) => (
                                        <div key={miembro.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                          <div className="flex items-start justify-between gap-3">
                                            <div>
                                              <p className="font-bold text-slate-900 leading-tight">{miembro.nombre}</p>
                                              <p className="text-xs text-slate-500">@{miembro.usuario}</p>
                                            </div>
                                            <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white">
                                              {miembro.rol}
                                            </span>
                                          </div>
                                          <div className="mt-3 space-y-1 text-xs text-slate-600">
                                            <div>Email: {miembro.email || '-'}</div>
                                            <div>Teléfono: {miembro.telefono || '-'}</div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
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
