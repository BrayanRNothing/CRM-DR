import React, { useState } from 'react';
import toast from 'react-hot-toast';
import API_URL from '../../config/api';
import { getSafeUrl } from '../../utils/helpers';
import InfoItem from '../../components/ui/InfoItem';

function CotizacionDetalle({ cotizacion, onClose, onUpdate }) {
    const [respuesta, setRespuesta] = useState({ texto: '', precio: '' });
    const [archivo, setArchivo] = useState(null);
    const [imagenZoom, setImagenZoom] = useState(null);

    const handleEnviarCotizacion = async () => {
        if (!respuesta.texto || !respuesta.precio) {
            toast.error('Ingresa precio y respuesta');
            return;
        }
        const formData = new FormData();
        formData.append('estado', 'cotizado');
        formData.append('respuestaAdmin', respuesta.texto);
        formData.append('precio', respuesta.precio);
        if (archivo) formData.append('archivo', archivo);

        const loadingToast = toast.loading('Enviando...');

        try {
            const res = await fetch(`${API_URL}/api/servicios/${cotizacion.id}`, {
                method: 'PUT',
                body: formData
            });

            if (res.ok) {
                toast.dismiss(loadingToast);
                toast.success('Enviado correctamente');
                setRespuesta({ texto: '', precio: '' });
                setArchivo(null);
                if (onUpdate) onUpdate();
            } else {
                toast.dismiss(loadingToast);
                toast.error('Error al enviar');
            }
        } catch (error) {
            console.error(error);
            toast.dismiss(loadingToast);
            toast.error('Error de conexión');
        }
    };

    const handleRechazarCotizacionTecnico = async () => {
        if (!confirm('¿Rechazar solicitud?')) return;
        try {
            const res = await fetch(`${API_URL}/api/servicios/${cotizacion.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado: 'rechazado' })
            });
            if (res.ok) {
                toast.success('Rechazada');
                if (onUpdate) onUpdate();
            }
        } catch (error) {
            console.error(error);
            toast.error('Error al rechazar');
        }
    };

    const handleDescargarArchivo = async (rutaRelativa, nombreArchivo) => {
        if (!rutaRelativa) return;

        const urlCompleta = getSafeUrl(rutaRelativa);
        const toastId = toast.loading('Iniciando descarga...');

        try {
            const response = await fetch(urlCompleta);
            if (!response.ok) throw new Error('El archivo no está disponible en el servidor');

            const blob = await response.blob();
            const urlBlob = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = urlBlob;
            a.download = nombreArchivo || 'archivo_descarga';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(urlBlob);

            toast.dismiss(toastId);
            toast.success('Descarga completada');
        } catch (error) {
            console.error(error);
            toast.dismiss(toastId);
            toast.error('❌ Error: Archivo no encontrado');
        }
    };

    const fotoUrl = getSafeUrl(cotizacion.foto);

    return (
        <div className="h-[calc(100vh-2rem)] flex flex-col animate-fadeIn bg-gray-50/50">
            {/* Barra Superior */}
            <div className="flex items-center justify-between mb-4 shrink-0 px-1">
                <button onClick={onClose} className="group flex items-center text-gray-500 hover:text-blue-600 transition font-medium text-sm">
                    <div className=" group-hover:border-blue-200 h-8 w-8 flex items-center justify-center mr-2 transition">←</div>
                    Volver al listado
                </button>
                <div className="bg-white px-3 py-1 rounded-full border border-gray-200 text-xs font-mono text-gray-400 shadow-sm">
                    Ticket ID: <span className="text-gray-600 font-bold">#{cotizacion.id}</span>
                </div>
            </div>

            <div className="flex-1 overflow-hidden pr-2 pb-2">
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 h-full">

                    {/* --- IZQUIERDA: FICHA TÉCNICA --- */}
                    <div className="xl:col-span-8 h-full">
                        <div className="bg-gray-100 rounded-3xl overflow-hidden h-full flex flex-col">

                            {/* Encabezado */}
                            <div className="p-4 sm:p-5 bg-gray-100">
                                <div className="flex flex-col sm:flex-row justify-between items-start gap-2 bg-gray-100">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full ${cotizacion.tipo === 'garantia' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                {cotizacion.tipo}
                                            </span>
                                            <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                                                📅 {cotizacion.fecha}
                                            </span>
                                        </div>
                                        <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-tight mb-1">
                                            {cotizacion.titulo}
                                        </h1>
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            <span className="font-medium text-gray-900">{cotizacion.usuario || cotizacion.cliente}</span>
                                            <span>•</span>
                                            <span>Solicitante</span>
                                        </div>
                                    </div>
                                    <div className="bg-gray-100 p-2 rounded-xl shadow-sm border border-gray-100 text-center min-w-[100px]">
                                        <div className="text-[10px] text-gray-400 uppercase font-bold">Estado</div>
                                        <div className={`font-bold capitalize ${cotizacion.estado === 'pendiente' ? 'text-orange-500' : 'text-green-500'}`}>
                                            {cotizacion.estado}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Grid de Datos Completas */}
                            <div className="p-4 sm:p-6 flex-1 overflow-auto">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                                    <InfoItem label="Dirección" value={cotizacion.direccion} icon="📍" />
                                    <InfoItem label="Teléfono / Contacto" value={cotizacion.telefono} icon="📞" />

                                    <InfoItem label="ID Sistema" value={cotizacion.id} icon="🆔" />
                                </div>

                                <div className="bg-gray-100 rounded-xl p-4 border border-gray-100 mb-4">
                                    <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-2">Descripción del problema</h4>
                                    <p className="text-gray-700 text-xs leading-relaxed whitespace-pre-line">
                                        {cotizacion.descripcion || "Sin descripción proporcionada."}
                                    </p>
                                </div>

                                {/* Sección Archivos */}
                                <div>
                                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Archivos Adjuntos</h3>
                                    <div className="flex flex-wrap gap-3">

                                        {/* 1. FOTO PREVIEW */}
                                        {cotizacion.foto ? (
                                            <div
                                                onClick={() => setImagenZoom(fotoUrl)}
                                                className="group relative h-24 w-36 bg-gray-100 rounded-xl overflow-hidden border border-gray-200 cursor-zoom-in hover:shadow-md transition-all"
                                            >
                                                <img src={fotoUrl} alt="Evidencia" className="h-full w-full object-cover transition duration-500 group-hover:scale-110" onError={(e) => e.target.style.display = 'none'} />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                    <span className="bg-white/90 text-gray-800 text-[10px] font-bold px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transform translate-y-1 group-hover:translate-y-0 transition-all">Ver Foto</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="h-24 w-24 bg-gray-50 rounded-xl border border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 text-[10px]">
                                                Sin Foto
                                            </div>
                                        )}

                                        {/* 2. PDF DESCARGABLE */}
                                        {cotizacion.pdf ? (
                                            <div
                                                onClick={() => handleDescargarArchivo(cotizacion.pdf, `Evidencia_${cotizacion.id}.pdf`)}
                                                className="w-full sm:w-64 bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-xl p-3 flex items-center gap-3 cursor-pointer group shadow-sm hover:shadow-md transition-all"
                                            >
                                                <div className="h-10 w-10 bg-red-100 text-red-600 rounded-lg flex items-center justify-center shrink-0">
                                                    <span className="text-xl">📄</span>
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-xs font-bold text-gray-700 truncate group-hover:text-blue-700 transition-colors">
                                                        Archivo Adjunto
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 font-mono truncate">
                                                        Evidencia_{cotizacion.id}.pdf
                                                    </span>
                                                </div>
                                                <div className="ml-auto text-gray-300 group-hover:text-blue-500 transition-colors">
                                                    ⬇️
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="h-24 w-24 bg-gray-50 rounded-xl border border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 text-[10px]">
                                                Sin PDF
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* --- DERECHA: FORMULARIO DE RESPUESTA --- */}
                    <div className="xl:col-span-4 h-full">
                        <div className="bg-white rounded-2xl border-2 border-gray-400 h-full overflow-hidden flex flex-col">
                            <div className="bg-white px-8 py-5 flex items-center justify-between">
                                <div>
                                    <h3 className="text-black font-bold text-lg">Panel de Respuesta</h3>
                                    <p className="text-gray-400 text-xs mt-0.5">Enviar cotización al cliente</p>
                                </div>
                                <div className="bg-white p-2 rounded-lg text-xl">💬</div>
                            </div>

                            <div className="p-6 space-y-5 flex-1 overflow-auto">
                                {/* Fila: Precio + PDF */}
                                <div className="flex gap-4 items-end">
                                    <div className="flex-1">
                                        <label className="flex justify-between text-xs font-bold text-gray-500 uppercase mb-2">
                                            Precio Total <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <span className="text-gray-400 font-bold text-lg group-focus-within:text-blue-500 transition">$</span>
                                            </div>
                                            <input
                                                type="number"
                                                className="w-full pl-9 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition font-bold text-2xl text-gray-900 placeholder-gray-300"
                                                placeholder="0.00"
                                                value={respuesta.precio}
                                                onChange={(e) => setRespuesta({ ...respuesta, precio: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    {/* Adjuntar PDF Compacto */}
                                    <div className="w-20 shrink-0">
                                        <label className="block text-center text-[10px] font-bold text-gray-500 uppercase mb-2">PDF</label>
                                        <label className={`flex flex-col items-center justify-center w-full h-[68px] transition ${archivo ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-blue-50 hover:border-blue-300'} border-2 border-dashed rounded-xl cursor-pointer focus:outline-none group`}>
                                            <span className="text-2xl group-hover:scale-110 transition">{archivo ? '📄' : '☁️'}</span>
                                            <input type="file" className="hidden" accept="application/pdf" onChange={(e) => setArchivo(e.target.files[0])} />
                                        </label>
                                    </div>
                                </div>

                                {archivo && (
                                    <div className="bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-[10px] font-bold flex justify-between items-center border border-blue-100">
                                        <span className="truncate max-w-[150px]">{archivo.name}</span>
                                        <button onClick={() => setArchivo(null)} className="text-red-500 hover:text-red-700 ml-2 text-sm">✕</button>
                                    </div>
                                )}

                                {/* Mensaje */}
                                <div>
                                    <label className="flex justify-between text-xs font-bold text-gray-500 uppercase mb-2">
                                        Notas / Diagnóstico <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        rows="6"
                                        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-700 resize-none placeholder-gray-400"
                                        placeholder="Describe los detalles de la cotización..."
                                        value={respuesta.texto}
                                        onChange={(e) => setRespuesta({ ...respuesta, texto: e.target.value })}
                                    ></textarea>
                                </div>

                                <hr className="border-white" />

                                <div className="pt-4 flex flex-col gap-3">
                                    <button
                                        onClick={handleEnviarCotizacion}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 hover:shadow-blue-300 transition active:scale-[0.98] flex justify-center items-center gap-2"
                                    >
                                        <span>🚀</span> Enviar Respuesta
                                    </button>
                                    <button
                                        onClick={handleRechazarCotizacionTecnico}
                                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-red-200 hover:shadow-red-300 transition active:scale-[0.98] flex justify-center items-center gap-2"
                                    >
                                        <span>❌</span> Rechazar Solicitud
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {imagenZoom && (
                <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn" onClick={() => setImagenZoom(null)}>
                    <img src={imagenZoom} alt="Zoom" className="max-w-full max-h-full object-contain rounded shadow-2xl" />
                    <button className="absolute top-5 right-5 text-white text-4xl hover:text-red-500 transition" onClick={() => setImagenZoom(null)}>&times;</button>
                </div>
            )}
        </div>
    );
}



export default CotizacionDetalle;
