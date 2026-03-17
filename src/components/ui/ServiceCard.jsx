import React from 'react';

const ServiceCard = ({ 
  id,
  titulo, 
  empresa, 
  direccion, 
  fecha, 
  estado = 'pendiente', 
  onDetalles,
  onFinalizar // <--- Nueva función para terminar la tarea
}) => {
  
  const statusColors = {
    pendiente: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'en-proceso': 'bg-blue-100 text-blue-800 border-blue-200',
    finalizado: 'bg-gray-100 text-gray-500 border-gray-200' // Color gris para completadas
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-4 transition-all ${estado === 'finalizado' ? 'opacity-75' : 'hover:shadow-md'}`}>
      
      {/* Encabezado */}
      <div className="flex justify-between items-start mb-3">
        <span className={`text-xs font-bold px-3 py-1 rounded-full border ${statusColors[estado]}`}>
          {estado.toUpperCase().replace('-', ' ')}
        </span>
        <span className="text-xs text-gray-400 font-medium">{fecha}</span>
      </div>

      <h3 className="text-lg font-bold text-gray-800 mb-1">{titulo}</h3>
      <p className="text-sm text-gray-600 font-medium">🏢 {empresa}</p>
      
      {direccion && (
        <div className="mt-2 flex items-start gap-2 text-gray-500 text-xs">
          <span>📍</span><p>{direccion}</p>
        </div>
      )}

      {/* Botones de Acción */}
      <div className="mt-5 pt-4 border-t border-gray-100 flex gap-3">
        
        {/* Botón Ver Detalles (Siempre visible) */}
        <button 
          onClick={onDetalles}
          className="flex-1 bg-white border border-gray-300 text-gray-700 text-sm font-semibold py-2.5 rounded-lg active:scale-95 transition"
        >
          Ver Detalles
        </button>
        
        {/* Botón FINALIZAR (Solo si está en proceso o pendiente) */}
        {estado !== 'finalizado' && (
           <button 
             onClick={() => onFinalizar(id)}
             className="flex-1 bg-green-600 text-white text-sm font-bold py-2.5 rounded-lg shadow-md hover:bg-green-700 active:scale-95 transition flex justify-center items-center gap-2"
           >
             ✅ Terminar
           </button>
        )}
      </div>
    </div>
  );
};

export default ServiceCard;