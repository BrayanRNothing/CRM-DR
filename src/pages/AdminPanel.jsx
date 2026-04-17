import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { UserPlus, ShieldCheck, Users, Building2, Loader2, KeyRound, Pencil, Trash2, X } from 'lucide-react';
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
      fetchOwners();
    } catch (error) {
      toast.error(error.message || 'Error al crear propietario de equipo');
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = (owner) => {
    setEditingOwner(owner);
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

  return (
    <div className="w-full min-h-full bg-slate-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-gradient-to-r from-slate-900 to-slate-700 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck className="w-6 h-6" />
            <h1 className="text-2xl font-black tracking-tight">Panel Admin Root</h1>
          </div>
          <p className="text-slate-200 text-sm">Desde este panel puedes crear propietarios de equipo para nuevos equipos.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 text-sm font-semibold mb-2">
              <Users className="w-4 h-4" /> Propietarios activos
            </div>
            <div className="text-3xl font-black text-slate-900">{owners.length}</div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 text-sm font-semibold mb-2">
              <Building2 className="w-4 h-4" /> Equipos creados
            </div>
            <div className="text-3xl font-black text-slate-900">{owners.length}</div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 text-sm font-semibold mb-2">
              <KeyRound className="w-4 h-4" /> Acceso exclusivo
            </div>
            <div className="text-sm text-slate-700 font-semibold">Solo visible para usuario admin root</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <form onSubmit={editingOwner ? handleUpdateOwner : handleCreateOwner} className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
            <h2 className="font-black text-slate-900 text-lg flex items-center gap-2">
              <UserPlus className="w-5 h-5" /> {editingOwner ? 'Editar propietario de equipo' : 'Crear propietario de equipo'}
            </h2>

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

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                {saving ? (editingOwner ? 'Guardando...' : 'Creando...') : (editingOwner ? 'Guardar cambios' : 'Crear propietario')}
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
          </form>

          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
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
                <table className="w-full min-w-[620px] text-sm">
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
                    {owners.map((owner) => (
                      <tr key={owner.id} className="border-b border-slate-50 text-slate-800">
                        <td className="py-3 font-semibold">{owner.nombre}</td>
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
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
