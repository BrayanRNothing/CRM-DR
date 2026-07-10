import React, { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { UserPlus, Users, Loader2, Pencil, Trash2, X, Shield, Mail, Phone, Clock, ChevronRight, ChevronsRight, ChevronDown, Zap, CreditCard, Key, Copy, Check, Settings, Activity } from 'lucide-react';
import toast from 'react-hot-toast';
import API_URL from '../config/api';
import { getToken, getUser } from '../utils/authUtils';
import socket from '../config/socket';
import AdminUserDetalle from '../components/AdminUserDetalle';

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
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [lastConnections, setLastConnections] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);

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

  useEffect(() => {
    socket.emit('get_online_users');

    socket.on('online_users_list', (userIds) => {
      setOnlineUsers(new Set(userIds.map(id => Number(id))));
    });

    const handleStatusChange = (data) => {
      const { userId, isOnline, ultimaConexion } = data;
      setOnlineUsers(prev => {
        const next = new Set(prev);
        if (isOnline) {
          next.add(Number(userId));
        } else {
          next.delete(Number(userId));
        }
        return next;
      });

      if (!isOnline && ultimaConexion) {
        setLastConnections(prev => ({ ...prev, [Number(userId)]: ultimaConexion }));
      }
    };

    socket.on('user_status_changed', handleStatusChange);

    return () => {
      socket.off('online_users_list');
      socket.off('user_status_changed', handleStatusChange);
    };
  }, []);

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

  const normalOwners = useMemo(() => groupedOwners.filter(o => !o.usuario?.startsWith('demo_')), [groupedOwners]);
  const demoOwners = useMemo(() => groupedOwners.filter(o => o.usuario?.startsWith('demo_')), [groupedOwners]);

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

  const handleForcePassword = async (userId, newPassword) => {
    try {
      const res = await fetch(`${API_URL}/api/usuarios/${userId}/force-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({ nuevaContraseña: newPassword })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.mensaje || 'No se pudo cambiar la contraseña');
      
      toast.success('Contraseña actualizada correctamente');
    } catch (error) {
      toast.error(error.message || 'Error al cambiar la contraseña');
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

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const getAvatarColor = (name) => {
    const colors = ['bg-blue-100 text-blue-700', 'bg-indigo-100 text-indigo-700', 'bg-purple-100 text-purple-700', 'bg-pink-100 text-pink-700', 'bg-emerald-100 text-emerald-700', 'bg-teal-100 text-teal-700'];
    if (!name) return colors[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const renderTable = (ownersList, isDemo) => (
    <div className="overflow-x-auto bg-white rounded-xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05),0_0_1px_rgba(0,0,0,0.1)]">
      <table className="w-full min-w-[900px] text-sm text-left">
        <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500">
          <tr>
            <th className="py-4 px-5 font-bold uppercase tracking-wider text-[11px] rounded-tl-xl w-[30%]">Usuario & Contacto</th>
            <th className="py-4 px-5 font-bold uppercase tracking-wider text-[11px] w-[20%] text-center">Equipo</th>
            <th className="py-4 px-5 font-bold uppercase tracking-wider text-[11px] w-[20%]">Suscripción</th>
            <th className="py-4 px-5 font-bold uppercase tracking-wider text-[11px] w-[15%]">Actividad</th>
            <th className="py-4 px-5 font-bold uppercase tracking-wider text-[11px] text-right rounded-tr-xl w-[15%]">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {ownersList.map((owner, index) => {
            const isOnline = onlineUsers.has(owner.id);
            const avatarColor = getAvatarColor(owner.nombre);
            
            return (
              <React.Fragment key={owner.id}>
              <tr className={`transition-colors border-b-4 border-white ${
                  !owner.activo 
                    ? (index % 2 === 0 ? 'bg-slate-50 opacity-75 grayscale-[20%]' : 'bg-slate-100 opacity-75 grayscale-[20%]')
                    : isDemo 
                      ? (index % 2 === 0 ? 'bg-orange-50/30 hover:bg-orange-50/60' : 'bg-orange-50/50 hover:bg-orange-50/80')
                      : owner.plan_activo 
                        ? (index % 2 === 0 ? 'bg-emerald-50/40 hover:bg-emerald-50/70' : 'bg-emerald-50/60 hover:bg-emerald-50/80')
                        : (index % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50 hover:bg-slate-100')
                }`}>
                {/* 1. Usuario & Contacto */}
                <td className="py-4 px-5 align-top">
                  <div className="flex items-start gap-3.5">
                    <div className="flex flex-col min-w-0 pt-0.5">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-slate-900 truncate">{owner.nombre}</span>
                        {!owner.activo && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-red-100 text-red-700">Inactivo</span>
                        )}
                        {isDemo && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-orange-100 text-orange-700">Demo</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate mb-0.5">
                        <Shield className="w-3 h-3 text-slate-400" />
                        <span className="font-medium text-slate-600">@{owner.usuario}</span>
                      </div>
                      {owner.telefono && (
                        <div className="flex items-center gap-3 text-xs text-slate-500 truncate mt-1">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {owner.telefono}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </td>

                {/* 2. Equipo */}
                <td className="py-4 px-5 align-middle">
                  <div className="flex items-center justify-center">
                    {owner.subUsers.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setExpandedOwnerId(expandedOwnerId === owner.id ? null : owner.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all shadow-sm ${expandedOwnerId === owner.id ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-white text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200'}`}
                      >
                        <Users className="w-3.5 h-3.5" />
                        {owner.subUsers.length} miembros
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandedOwnerId === owner.id ? 'rotate-180' : ''}`} />
                      </button>
                    ) : (
                      <span className="text-xs font-semibold text-slate-400">Sin miembros</span>
                    )}
                  </div>
                </td>

                {/* 3. Suscripción */}
                <td className="py-4 px-5 align-top">
                  <div className="flex flex-col gap-2 pt-0.5 items-start">
                    {owner.plan_activo && !isDemo ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200 shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.5)] animate-pulse"></span>
                        {String(owner.plan || 'PRO').toUpperCase()} {String(owner.plan || '').toLowerCase().includes('gratis') ? '(Gratis)' : String(owner.plan || '').toLowerCase().includes('anual') ? '($1,990)' : '($199)'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold border border-slate-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                        {String(owner.plan || 'BÁSICO').toUpperCase()} (Gratis)
                      </span>
                    )}
                    {owner.plan_vencimiento ? (
                      <span className="text-[11px] text-slate-500 font-medium bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                        Vence: {new Date(owner.plan_vencimiento).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-medium">Sin vencimiento</span>
                    )}
                  </div>
                </td>

                {/* 4. Actividad */}
                <td className="py-4 px-5 align-top">
                  <div className="flex flex-col gap-2 pt-1">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.6)]' : 'bg-slate-300'}`}></div>
                      <span className={`text-[11px] font-bold uppercase tracking-wider ${isOnline ? 'text-emerald-700' : 'text-slate-500'}`}>
                        {isOnline ? 'En línea' : 'Desconectado'}
                      </span>
                    </div>
                    {!isOnline && (lastConnections[owner.id] || owner.ultimaConexion) && (
                      <span className="text-[10px] text-slate-400 mt-1">
                        Últ: {new Date(lastConnections[owner.id] || owner.ultimaConexion).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    )}
                  </div>
                </td>

                {/* 5. Acciones */}
                <td className="py-4 px-5 align-top">
                  <div className="flex flex-wrap items-center justify-end gap-1.5 pt-0.5">
                    <button
                      onClick={() => setSelectedUser(owner)}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-black tracking-widest uppercase text-white bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all focus:ring-4 focus:ring-indigo-600/20"
                    >
                      Gestionar
                      <ChevronsRight className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
              {expandedOwnerId === owner.id && owner.subUsers.length > 0 && owner.subUsers.map((sub, idx) => (
                <tr key={sub.id} className="bg-slate-50/60 border-b border-slate-100/50 hover:bg-slate-100/60 transition-colors">
                  {/* 1. Usuario & Contacto (Member) */}
                  <td className="py-3 px-5 align-top pl-12 border-l-4 border-indigo-300">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col min-w-0 pt-0.5">
                        <span className="font-semibold text-slate-800 text-sm truncate">{sub.nombre}</span>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate mt-0.5">
                          <Shield className="w-3 h-3 text-slate-400" />
                          <span className="font-medium text-slate-600">@{sub.usuario}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  {/* 2. Equipo */}
                  <td className="py-3 px-5 align-middle text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-sm">Miembro</span>
                  </td>
                  {/* 3. Suscripción */}
                  <td className="py-3 px-5 align-middle">
                    <span className="text-xs text-slate-500 font-medium">Plan Heredado</span>
                  </td>
                  {/* 4. Actividad */}
                  <td className="py-3 px-5 align-middle">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${onlineUsers.has(sub.id) ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                        <span className={`text-[10px] font-bold uppercase ${onlineUsers.has(sub.id) ? 'text-emerald-700' : 'text-slate-500'}`}>
                          {onlineUsers.has(sub.id) ? 'En línea' : 'Desconectado'}
                        </span>
                      </div>
                    </div>
                  </td>
                  {/* 5. Acciones */}
                  <td className="py-3 px-5 align-middle">
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedUser({...sub, subUsers: [], plan: owner.plan, plan_activo: owner.plan_activo, stripe_subscription_id: 'Heredado', stripe_customer_id: 'Heredado'})}
                        className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase text-slate-600 bg-white border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 shadow-sm transition-all"
                      >
                        Gestionar
                      </button>
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
  );

  if (selectedUser) {
    return (
      <AdminUserDetalle
        user={selectedUser}
        token={token}
        onVolver={() => setSelectedUser(null)}
        onActualizado={fetchOwners}
        handleForcePassword={handleForcePassword}
        handleStartEdit={(u) => { setSelectedUser(null); handleStartEdit(u); }}
        handleDeleteOwner={(u, p) => { setSelectedUser(null); handleDeleteOwner(u, p); }}
      />
    );
  }

  return (
    <>
      <div className="w-full min-h-full bg-slate-50 p-6 md:p-8">
        <div className="w-full max-w-full mx-auto space-y-6">
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
                Usuarios propietarios activos: <span className="font-bold text-slate-900">{normalOwners.filter(o => o.activo).length}</span> de <span className="font-bold text-slate-900">{normalOwners.length}</span> (Normales)
                <span className="mx-2 text-slate-300">|</span>
                Demos: <span className="font-bold text-slate-900">{demoOwners.length}</span>
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
              <>
                {renderTable(normalOwners, false)}
                
                {demoOwners.length > 0 && (
                  <div className="mt-8 border-t border-slate-200 pt-8">
                    <h3 className="font-black text-slate-900 text-lg mb-4 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-orange-400"></span>
                      Usuarios Demo (Pruebas)
                    </h3>
                    <p className="text-sm text-slate-500 mb-4">
                      Estos usuarios fueron creados desde la página principal de prueba. No son clientes reales.
                    </p>
                    {renderTable(demoOwners, true)}
                  </div>
                )}
              </>
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
