import React, { useState } from 'react';

import API_URL from '../../config/api';

function CotizacionForm({ titulo, tipoServicio, onSuccess }) {
  // Estados para archivos REALES
  const [fileImages, setFileImages] = useState([]);
  const [filePdf, setFilePdf] = useState(null);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  const [formDatos, setFormDatos] = useState({
    nombreProyecto: '',
    modelo: '',
    cantidad: 1,
    direccion: '',
    descripcion: '',
    clienteFinal: '', // Nuevo campo para distribuidores
    telefono: JSON.parse(sessionStorage.getItem('user') || '{}')?.telefono || ''
  });

  const handleChange = (e) => setFormDatos({ ...formDatos, [e.target.name]: e.target.value });

  // Maneja la selección de múltiples imágenes
  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    const newImages = files.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    setFileImages([...fileImages, ...newImages]);
  };

  // Eliminar imagen
  const removeImage = (index) => {
    const newImages = fileImages.filter((_, i) => i !== index);
    setFileImages(newImages);
  };

  // Maneja el envío del formulario: prepara datos y los envía al backend
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje({ texto: 'Enviando...', tipo: 'loading' });

    const userStorage = sessionStorage.getItem('user');
    const usuario = userStorage ? JSON.parse(userStorage) : null;

    // USAMOS FORMDATA para soportar archivos
    const formData = new FormData();
    formData.append('titulo', formDatos.nombreProyecto);
    formData.append('tipo', tipoServicio);
    formData.append('descripcion', formDatos.descripcion);
    formData.append('cantidad', formDatos.cantidad);
    formData.append('direccion', formDatos.direccion);
    formData.append('telefono', formDatos.telefono);

    // Si es distribuidor, usamos el clienteFinal. Si no, el nombre del usuario logueado.
    const esDistribuidor = usuario?.rol === 'distribuidor';
    formData.append('usuario', usuario ? usuario.nombre : 'Usuario Externo');
    formData.append('cliente', esDistribuidor ? (formDatos.clienteFinal || 'Consumidor Final') : (usuario?.nombre || 'Consumidor Final'));

    formData.append('modelo', formDatos.modelo || '');

    // Adjuntar la primera imagen (por compatibilidad con el backend actual)
    if (fileImages.length > 0) {
      formData.append('foto', fileImages[0].file);
    }

    if (filePdf) formData.append('pdf', filePdf);

    try {
      const response = await fetch(`${API_URL}/api/servicios`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        setMensaje({ texto: '¡Solicitud enviada con éxito! ✅', tipo: 'success' });
        // Resetear formulario
        setFormDatos({ nombreProyecto: '', modelo: '', cantidad: 1, direccion: '', descripcion: '', clienteFinal: '', telefono: usuario?.telefono || '' });
        setFileImages([]);
        setFilePdf(null);
        setTimeout(() => {
          setMensaje({ texto: '', tipo: '' });
          if (onSuccess) onSuccess();
        }, 2000);
      } else {
        setMensaje({ texto: 'Error al enviar la solicitud ❌', tipo: 'error' });
      }
    } catch (error) {
      console.error(error);
      setMensaje({ texto: 'Error de conexión con el servidor ⚠️', tipo: 'error' });
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-6">
      {mensaje.texto && (
        <div className={`p-4 mb-4 rounded-xl font-semibold text-center ${mensaje.tipo === 'success' ? 'bg-green-100 text-green-700' :
          mensaje.tipo === 'error' ? 'bg-red-100 text-red-700' :
            'bg-blue-100 text-blue-700'
          }`}>
          {mensaje.texto}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nombre del cliente final (Solo distribuidores) */}
        {JSON.parse(sessionStorage.getItem('user'))?.rol === 'distribuidor' && (
          <div>
            <input
              required
              type="text"
              name="clienteFinal"
              value={formDatos.clienteFinal}
              onChange={handleChange}
              placeholder="Nombre del Cliente Final"
              className="w-full bg-gray-100 border-0 p-4 rounded-xl text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>
        )}

        {/* Nombre del proyecto */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <input
              required
              type="text"
              name="nombreProyecto"
              value={formDatos.nombreProyecto}
              onChange={handleChange}
              placeholder="Nombre proyecto"
              className="w-full bg-gray-100 border-0 p-4 rounded-xl text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>
          <div>
            <input
              required
              type="tel"
              name="telefono"
              value={formDatos.telefono}
              onChange={handleChange}
              placeholder="Teléfono"
              className="w-full bg-gray-100 border-0 p-4 rounded-xl text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Descripción */}
        <div>
          <textarea
            required
            name="descripcion"
            value={formDatos.descripcion}
            onChange={handleChange}
            placeholder="Descripción"
            className="w-full bg-gray-100 border-0 p-4 rounded-xl text-gray-800 placeholder-gray-400 h-24 resize-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>

        {/* Dirección y PDF */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            required
            type="text"
            name="direccion"
            value={formDatos.direccion}
            onChange={handleChange}
            placeholder="Dirección"
            className="flex-1 bg-gray-100 border-0 p-4 rounded-xl text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />

          {/* Botón Adjuntar PDF */}
          <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-blue-600 text-blue-600 rounded-xl cursor-pointer hover:bg-blue-50 transition-all">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            <span className="font-semibold text-sm truncate max-w-[150px]">
              {filePdf ? filePdf.name.substring(0, 12) + '...' : 'Adjuntar Archivo'}
            </span>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFilePdf(e.target.files[0])}
              className="hidden"
            />
          </label>
        </div>

        {/* Imágenes del Proyecto */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">Imágenes del Proyecto</h3>

          {/* Botón Añadir Imágenes */}
          <label className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2 mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Añadir Imágenes
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              className="hidden"
            />
          </label>

          {/* Preview de imágenes */}
          {fileImages.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {fileImages.map((img, index) => (
                <div key={index} className="relative group">
                  <img
                    src={img.preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-24 object-cover rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-all shadow-lg"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Botón Crear Proyecto */}
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-md hover:shadow-lg mt-6"
        >
          Crear Solicitud
        </button>
      </form>
    </div>
  );
}

export default CotizacionForm;