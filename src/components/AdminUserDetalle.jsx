import React from 'react';
import { Mail, Phone, X, Shield, Zap, Pencil, Trash2, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import API_URL from '../config/api';

const getInitials = (name) => {
  if (!name) return 'U';
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

const getAvatarColor = (name) => {
  const colors = [
    'bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500',
    'bg-rose-500', 'bg-orange-500', 'bg-amber-500', 'bg-emerald-500',
    'bg-teal-500', 'bg-cyan-500'
  ];
  if (!name) return colors[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export default function AdminUserDetalle({
  user,
  token,
  onVolver,
  onActualizado,
  handleForcePassword,
  handleStartEdit,
  handleDeleteOwner
}) {
  if (!user) return null;

  return (
    <div className="w-full min-h-[calc(100vh-64px)] bg-slate-50 p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header con botón volver */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={onVolver}
            className="p-2 -ml-2 rounded-full hover:bg-slate-200 text-slate-500 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 leading-tight">Detalles del Usuario</h1>
            <p className="text-sm text-slate-500 mt-0.5">Gestión avanzada de cuenta y suscripción</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Columna Izquierda (Perfil y Contacto) */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Tarjeta Perfil */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col items-center text-center">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center font-bold text-3xl text-white shadow-lg mb-4 ${getAvatarColor(user.nombre)}`}>
                {getInitials(user.nombre)}
              </div>
              <h2 className="text-xl font-bold text-slate-900">{user.nombre}</h2>
              <p className="text-slate-500 font-medium mb-4">@{user.usuario}</p>
              
              <div className="w-full flex gap-2">
                <button
                  onClick={() => handleStartEdit(user)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
                >
                  <Pencil className="w-4 h-4" /> Editar
                </button>
              </div>
            </div>

            {/* Tarjeta Contacto */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-500" />
                Información de Contacto
              </h3>
              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Correo Electrónico</span>
                  <div className="flex items-center gap-2 text-slate-700 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span className="truncate">{user.email || 'No registrado'}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Teléfono</span>
                  <div className="flex items-center gap-2 text-slate-700 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span>{user.telefono || 'No registrado'}</span>
                  </div>
                </div>
              </div>
            </div>
            
          </div>

          {/* Columna Central y Derecha */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Tarjeta Stripe / Suscripción */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-100 pb-3">Estado de Suscripción</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Plan Actual</span>
                  <span className="text-lg font-black text-slate-800">{String(user.plan || 'BÁSICO').toUpperCase()}</span>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Vencimiento</span>
                  <span className="text-lg font-bold text-slate-700">
                    {user.plan_vencimiento ? new Date(user.plan_vencimiento).toLocaleDateString() : 'Ilimitado'}
                  </span>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between bg-slate-50 px-4 py-3 rounded-lg border border-slate-100">
                  <span className="text-sm font-semibold text-slate-600">Stripe Customer ID</span>
                  <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">{user.stripe_customer_id || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between bg-slate-50 px-4 py-3 rounded-lg border border-slate-100">
                  <span className="text-sm font-semibold text-slate-600">Stripe Sub ID</span>
                  <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">{user.stripe_subscription_id || 'N/A'}</span>
                </div>
              </div>

              {!user.plan_activo && user.activo && !user.usuario.startsWith('demo_') && (
                <button
                  onClick={async () => {
                    if (window.confirm('¿Activar acceso gratuito indefinido a este usuario?')) {
                      try {
                        const res = await fetch(`${API_URL}/api/usuarios/${user.id}/activate-plan`, {
                          method: 'POST',
                          headers: { 'x-auth-token': token }
                        });
                        if (res.ok) {
                          toast.success('Suscripción activada');
                          if (onActualizado) onActualizado();
                        } else { toast.error('Error al activar'); }
                      } catch (err) { toast.error('Error de red al activar'); }
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 transition-colors"
                >
                  <Zap className="w-5 h-5" /> Activar Plan Gratis Indefinido
                </button>
              )}
            </div>

            {/* Módulo Seguridad y Acciones Peligrosas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-slate-400" />
                  Seguridad (Contraseña)
                </h3>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                  Puedes forzar el cambio de la contraseña si el usuario no puede acceder a su cuenta.
                </p>
                <div className="space-y-3">
                  <input 
                    type="password" 
                    id="new-password-input-screen"
                    placeholder="Nueva contraseña (min 6)"
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                  <button
                    onClick={async () => {
                      const input = document.getElementById('new-password-input-screen');
                      if (input && input.value.length >= 6) {
                        if (window.confirm(`¿Confirmar cambio de contraseña para ${user.nombre}?`)) {
                          await handleForcePassword(user.id, input.value);
                          input.value = '';
                        }
                      } else {
                        toast.error('Mínimo 6 caracteres');
                      }
                    }}
                    className="w-full px-4 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    Actualizar Contraseña
                  </button>
                </div>
              </div>

              <div className="bg-rose-50 rounded-2xl shadow-sm border border-rose-100 p-6">
                <h3 className="text-sm font-bold text-rose-900 mb-4 flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-rose-500" />
                  Zona de Peligro
                </h3>
                <div className="space-y-3 mt-auto h-full flex flex-col justify-end">
                  {user.activo ? (
                    <button
                      onClick={() => {
                        handleDeleteOwner(user, false);
                        onVolver();
                      }}
                      className="w-full px-4 py-2.5 bg-white text-orange-600 border border-orange-200 text-sm font-bold rounded-lg hover:bg-orange-50 transition-colors"
                    >
                      Desactivar Usuario
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        handleDeleteOwner(user, true);
                        onVolver();
                      }}
                      className="w-full px-4 py-2.5 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Eliminar Permanentemente
                    </button>
                  )}
                </div>
              </div>
              
            </div>

            {/* Módulo Equipo */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                <h3 className="text-lg font-bold text-slate-900">Usuarios del Equipo</h3>
                <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-3 py-1 rounded-full">{user.subUsers?.length || 0} Miembros</span>
              </div>
              
              {user.subUsers && user.subUsers.length > 0 ? (
                <div className="space-y-2">
                  {user.subUsers.map(sub => (
                    <div key={sub.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white ${getAvatarColor(sub.nombre)}`}>
                          {getInitials(sub.nombre)}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-800">{sub.nombre}</span>
                          <span className="text-xs text-slate-500 font-medium">@{sub.usuario} • {sub.rol}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => { onVolver(); handleStartEdit(sub); }}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-50 rounded-xl p-8 text-center border border-slate-200 border-dashed">
                  <p className="text-slate-500 font-medium">No hay miembros registrados en el equipo de este usuario.</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
