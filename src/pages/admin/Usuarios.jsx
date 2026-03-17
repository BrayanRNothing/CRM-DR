

import React, { useState, useEffect, useRef } from 'react';
import Avatar from '../../components/ui/Avatar';
import * as THREE from 'three';
import CELLS from 'vanta/dist/vanta.cells.min.js';
import toast from 'react-hot-toast';
import API_URL from '../../config/api';
import BotonMenu from '../../components/ui/BotonMenu';

function ModalUsuario({ modoEdicion, formData, setFormData, handleSubmit, cerrarModal }) {
  const vantaRef = useRef(null);
  const vantaInstanceRef = useRef(null);
  useEffect(() => {
    if (vantaRef.current && !vantaInstanceRef.current) {
      vantaInstanceRef.current = CELLS({
        el: vantaRef.current,
        THREE: THREE,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200.0,
        minWidth: 200.0,
        scale: 1.0,
        color1: 0x101025,
        color2: 0x35b1f2,
        size: 5.0,
        speed: 0.9,
      });
    }
    return () => {
      if (vantaInstanceRef.current) {
        vantaInstanceRef.current.destroy();
        vantaInstanceRef.current = null;
      }
    };
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div ref={vantaRef} className="absolute inset-0" />
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative z-10 w-full max-w-md bg-black/30 backdrop-blur-md p-8 rounded-2xl border border-white/10 shadow-2xl text-white">
        <h2 className="text-3xl font-bold mb-6 text-center tracking-wider">
          {modoEdicion ? 'Editar Usuario' : 'Crear Usuario'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Nombre Completo *</label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData((prev) => ({ ...prev, nombre: e.target.value }))}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none transition"
              placeholder="Juan Pérez"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Usuario *</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none transition"
              placeholder="usuario123"
              required
              disabled={modoEdicion}
            />
            {modoEdicion && <p className="text-xs text-gray-400 mt-1">El usuario no se puede modificar</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email (Opcional)</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none transition"
              placeholder="correo@ejemplo.com"
            />
            <p className="text-xs text-gray-400 mt-1">Solo para recibir notificaciones</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Teléfono (Opcional)</label>
            <input
              type="tel"
              value={formData.telefono}
              onChange={(e) => setFormData((prev) => ({ ...prev, telefono: e.target.value }))}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none transition"
              placeholder="+52 123 456 7890"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Contraseña {modoEdicion && '(dejar vacío para no cambiar)'}
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none transition"
              placeholder="••••••••"
              required={!modoEdicion}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Rol *</label>
            <select
              value={formData.rol}
              onChange={(e) => setFormData((prev) => ({ ...prev, rol: e.target.value }))}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
              required
            >
              <option value="admin" className="bg-gray-800">Administrador</option>
              <option value="tecnico" className="bg-gray-800">Técnico</option>
              <option value="distribuidor" className="bg-gray-800">Distribuidor</option>
              <option value="usuario" className="bg-gray-800">Usuario</option>
              <option value="closer" className="bg-gray-800">Closer</option>
              <option value="prospector" className="bg-gray-800">Prospector</option>
            </select>
          </div>
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={cerrarModal}
              className="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-500 hover:bg-blue-400 text-white font-bold py-3 rounded-lg transition shadow-[0_0_20px_rgba(59,130,246,0.5)]"
            >
              {modoEdicion ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmarEliminarModal({ visible, nombre, onConfirm, onCancel, loading }) {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-100 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" />
      <div className="relative z-10 w-full max-w-xs bg-white p-6 rounded-2xl border border-gray-200 shadow-2xl text-gray-800 flex flex-col items-center">
        <div className="text-4xl mb-2">⚠️</div>
        <h2 className="text-lg font-bold mb-2 text-center">¿Eliminar usuario?</h2>
        <p className="mb-4 text-center">Se eliminará <span className="font-semibold">{nombre}</span> y no se podrá recuperar.</p>
        <div className="flex gap-3 w-full">
          <button onClick={onCancel} disabled={loading} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 rounded-lg">Cancelar</button>
          <button
            onClick={() => {
              onConfirm();
            }}
            disabled={loading}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-lg disabled:opacity-60"
          >
            {loading ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Usuarios() {
  const API_BASE = API_URL;
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [vistaActual, setVistaActual] = useState('menu');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    nombre: '',
    email: '',
    telefono: '',
    password: '',
    rol: 'usuario'
  });

  // Estado para confirmación de borrado
  const [confirmarEliminar, setConfirmarEliminar] = useState({ visible: false, id: null, nombre: '' });
  const [eliminando, setEliminando] = useState(false);

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const cargarUsuarios = async () => {
    setCargando(true);
    try {
      const res = await fetch(`${API_BASE}/api/usuarios`);
      const data = await res.json();
      setUsuarios(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setCargando(false);
    }
  };

  const abrirModal = (rol) => {
    setFormData({ username: '', nombre: '', email: '', telefono: '', password: '', rol });
    setModoEdicion(false);
    setUsuarioEditando(null);
    setModalAbierto(true);
  };

  const abrirModalEditar = (usuario) => {
    setFormData({
      username: usuario.username || '',
      nombre: usuario.nombre,
      email: usuario.email || '',
      telefono: usuario.telefono || '',
      password: '',
      rol: usuario.rol
    });
    setModoEdicion(true);
    setUsuarioEditando(usuario);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setFormData({ username: '', nombre: '', email: '', telefono: '', password: '', rol: 'usuario' });
    setModoEdicion(false);
    setUsuarioEditando(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.username || !formData.password && !modoEdicion) {
      toast.error('Usuario y contraseña son requeridos');
      return;
    }

    try {
      if (modoEdicion) {
        const res = await fetch(`${API_BASE}/api/usuarios/${usuarioEditando.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        if (res.ok) {
          toast.success('✅ Usuario actualizado');
          cargarUsuarios();
          cerrarModal();
        } else {
          toast.error('Error al actualizar');
        }
      } else {
        const res = await fetch(`${API_BASE}/api/usuarios`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        if (res.ok) {
          toast.success('✅ Usuario creado');
          cargarUsuarios();
          cerrarModal();
        } else {
          toast.error('Error al crear');
        }
      }
    } catch (error) {
      console.error(error);
      toast.error('Error de conexión');
    }
  };


  const handleEliminar = (id, nombre) => {
    setConfirmarEliminar({ visible: true, id, nombre });
  };

  const confirmarEliminarUsuario = async () => {
    if (eliminando) return;
    setEliminando(true);
    const { id, nombre } = confirmarEliminar;
    try {
      const res = await fetch(`${API_BASE}/api/usuarios/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        toast.success(`🗑️ Usuario "${nombre}" eliminado`);
        cargarUsuarios();
      } else {
        toast.error('Error al eliminar');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error de conexión');
    } finally {
      setEliminando(false);
      setConfirmarEliminar({ visible: false, id: null, nombre: '' });
    }
  };

  const admins = usuarios.filter(u => u.rol === 'admin');
  const tecnicos = usuarios.filter(u => u.rol === 'tecnico');
  const distribuidores = usuarios.filter(u => u.rol === 'distribuidor');
  const usuariosFinales = usuarios.filter(u => u.rol === 'usuario');

  const renderTarjetaUsuario = (user, color) => (
    <div key={user.id} className={`bg-${color}-50 border-2 border-${color}-300 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all`}>
      <div className="flex items-start gap-4 mb-4">
        <Avatar name={user.nombre} size="lg" />
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg text-gray-800 truncate">{user.nombre}</h3>
          <p className="text-sm text-gray-600 truncate flex items-center gap-1">
            <span>👤</span> @{user.username}
          </p>
          {user.email && (
            <p className="text-xs text-gray-500 truncate flex items-center gap-1 mt-1">
              <span>📧</span> {user.email}
            </p>
          )}
          <div className={`bg-${color}-200 text-${color}-800 px-3 py-1 rounded-full text-xs font-bold inline-block mt-2 uppercase`}>
            {user.rol === 'admin' && '👑 '}{user.rol === 'tecnico' && '🔧 '}{user.rol === 'distribuidor' && '📦 '}{user.rol === 'usuario' && '👤 '}
            {user.rol}
          </div>
        </div>
      </div>

      <div className="bg-white/50 rounded-lg p-3 mb-4 space-y-1">
        <p className="text-xs text-gray-600 flex items-center gap-2">
          <span className="font-semibold">🆔 ID:</span>
          <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{user.id}</span>
        </p>
        {user.telefono && (
          <p className="text-xs text-gray-600 flex items-center gap-2">
            <span className="font-semibold">📱 Teléfono:</span>
            <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{user.telefono}</span>
          </p>
        )}
        <p className="text-xs text-gray-600 flex items-center gap-2">
          <span className="font-semibold">🔑 Contraseña:</span>
          <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{'•'.repeat(user.password?.length || 8)}</span>
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => abrirModalEditar(user)}
          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold py-2.5 px-3 rounded-lg transition shadow-md hover:shadow-lg"
        >
          ✏️ Editar
        </button>
        <button
          onClick={() => handleEliminar(user.id, user.nombre)}
          className={`flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-bold py-2.5 px-3 rounded-lg transition shadow-md hover:shadow-lg`}
        >
          🗑️ Eliminar
        </button>
      </div>
    </div>
  );
  {/*####################################### 4 Tarjetas ######################################################*/ }
  if (vistaActual === 'menu') {
    return (
      <div className="w-full h-full animate-fadeInUp flex flex-col min-h-0">
        <div className="mb-6 shrink-0">
          <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-500">Gestión de Usuarios</h1>
          <p className="text-gray-500 dark:text-gray-400 text-lg">Administra usuarios y permisos del sistema</p>
        </div>

        {cargando ? (
          <div className="grow flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 border-opacity-50 mb-4"></div>
            <span className="text-blue-600 font-semibold text-xl">Cargando usuarios...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full grow">
            <BotonMenu
              gradient="from-red-500/80 to-red-600/80 hover:from-red-600/90 hover:to-red-700/90"
              icon="👑"
              titulo="Administradores"
              count={admins.length}
              onClick={() => setVistaActual('admin')}
            />
            <BotonMenu
              gradient="from-blue-500/80 to-blue-600/80 hover:from-blue-600/90 hover:to-blue-700/90"
              icon="🔧"
              titulo="Técnicos"
              count={tecnicos.length}
              onClick={() => setVistaActual('tecnico')}
            />
            <BotonMenu
              gradient="from-purple-500/80 to-purple-600/80 hover:from-purple-600/90 hover:to-purple-700/90"
              icon="📦"
              titulo="Distribuidores"
              count={distribuidores.length}
              onClick={() => setVistaActual('distribuidor')}
            />
            <BotonMenu
              gradient="from-green-500/80 to-green-600/80 hover:from-green-600/90 hover:to-green-700/90"
              icon="👤"
              titulo="Usuarios"
              count={usuariosFinales.length}
              onClick={() => setVistaActual('usuario')}
            />
          </div>
        )}
      </div>
    );
  }

  {/*####################################### 4 Tarjetas ######################################################*/ }
  if (vistaActual === 'admin') {
    return (
      <>
        <div className="max-w-7xl mx-auto animate-fadeInUp pb-12 w-full h-screen overflow-auto">
          <button onClick={() => setVistaActual('menu')} className="mb-6 text-gray-600 hover:text-gray-700 font-semibold flex items-center gap-2 transition-colors">← Volver al menú</button>
          <div className="mb-0 flex justify-between items-center flex-wrap gap-4 pb-4">
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">{admins.length} usuarios con control total</p>
            </div>
            <button onClick={() => abrirModal('admin')} className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-bold shadow-md transition-all active:scale-95">+ Crear Admin</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{admins.map(user => renderTarjetaUsuario(user, 'red'))}</div>
        </div>
        {modalAbierto && (
          <ModalUsuario
            modoEdicion={modoEdicion}
            formData={formData}
            setFormData={setFormData}
            handleSubmit={handleSubmit}
            cerrarModal={cerrarModal}
          />
        )}
        <ConfirmarEliminarModal
          visible={confirmarEliminar.visible}
          nombre={confirmarEliminar.nombre}
          onConfirm={confirmarEliminarUsuario}
          onCancel={() => setConfirmarEliminar({ visible: false, id: null, nombre: '' })}
          loading={eliminando}
        />
      </>
    );
  }
  if (vistaActual === 'tecnico') {
    return (
      <>
        <div className="max-w-7xl mx-auto animate-fadeInUp pb-12 w-full h-screen overflow-auto">
          <button onClick={() => setVistaActual('menu')} className="mb-6 text-gray-600 hover:text-gray-700 font-semibold flex items-center gap-2 transition-colors">← Volver al menú</button>
          <div className="mb-0 flex justify-between items-center flex-wrap gap-4 pb-4">
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">{tecnicos.length} especialistas asignados</p>
            </div>
            <button onClick={() => abrirModal('tecnico')} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold shadow-md transition-all active:scale-95">+ Crear Técnico</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{tecnicos.map(user => renderTarjetaUsuario(user, 'blue'))}</div>
        </div>
        {modalAbierto && (
          <ModalUsuario
            modoEdicion={modoEdicion}
            formData={formData}
            setFormData={setFormData}
            handleSubmit={handleSubmit}
            cerrarModal={cerrarModal}
          />
        )}
        <ConfirmarEliminarModal
          visible={confirmarEliminar.visible}
          nombre={confirmarEliminar.nombre}
          onConfirm={confirmarEliminarUsuario}
          onCancel={() => setConfirmarEliminar({ visible: false, id: null, nombre: '' })}
          loading={eliminando}
        />
      </>
    );
  }
  if (vistaActual === 'distribuidor') {
    return (
      <>
        <div className="max-w-7xl mx-auto animate-fadeInUp pb-12 w-full h-screen overflow-auto">
          <button onClick={() => setVistaActual('menu')} className="mb-6 text-gray-600 hover:text-gray-700 font-semibold flex items-center gap-2 transition-colors">← Volver al menú</button>
          <div className="mb-0 flex justify-between items-center flex-wrap gap-4 pb-4">
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">{distribuidores.length} socios de distribución</p>
            </div>
            <button onClick={() => abrirModal('distribuidor')} className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-bold shadow-md transition-all active:scale-95">+ Crear Distribuidor</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{distribuidores.map(user => renderTarjetaUsuario(user, 'purple'))}</div>
        </div>
        {modalAbierto && (
          <ModalUsuario
            modoEdicion={modoEdicion}
            formData={formData}
            setFormData={setFormData}
            handleSubmit={handleSubmit}
            cerrarModal={cerrarModal}
          />
        )}
        <ConfirmarEliminarModal
          visible={confirmarEliminar.visible}
          nombre={confirmarEliminar.nombre}
          onConfirm={confirmarEliminarUsuario}
          onCancel={() => setConfirmarEliminar({ visible: false, id: null, nombre: '' })}
          loading={eliminando}
        />
      </>
    );
  }
  if (vistaActual === 'usuario') {
    return (
      <>
        <div className="max-w-7xl mx-auto animate-fadeInUp pb-12 w-full h-screen overflow-auto">
          <button onClick={() => setVistaActual('menu')} className="mb-6 text-gray-600 hover:text-gray-700 font-semibold flex items-center gap-2 transition-colors">← Volver al menú</button>
          <div className="mb-0 flex justify-between items-center flex-wrap gap-4 pb-4">
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">{usuariosFinales.length} usuarios registrados</p>
            </div>
            <button onClick={() => abrirModal('usuario')} className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-bold shadow-md transition-all active:scale-95">+ Crear Usuario</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{usuariosFinales.map(user => renderTarjetaUsuario(user, 'green'))}</div>
        </div>
        {modalAbierto && (
          <ModalUsuario
            modoEdicion={modoEdicion}
            formData={formData}
            setFormData={setFormData}
            handleSubmit={handleSubmit}
            cerrarModal={cerrarModal}
          />
        )}
        <ConfirmarEliminarModal
          visible={confirmarEliminar.visible}
          nombre={confirmarEliminar.nombre}
          onConfirm={confirmarEliminarUsuario}
          onCancel={() => setConfirmarEliminar({ visible: false, id: null, nombre: '' })}
          loading={eliminando}
        />
      </>
    );
  }
  return null;
}

export default Usuarios;
