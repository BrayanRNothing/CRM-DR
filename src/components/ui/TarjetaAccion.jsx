import React from 'react';

const TarjetaAccion = ({ icono, titulo, onClick, color }) => (
    <button onClick={onClick} className={`bg-white p-6 rounded-2xl shadow hover:shadow-lg border-l-4 border-${color}-500 text-left w-full transition`}>
        <div className="text-4xl mb-2">{icono}</div>
        <h3 className="font-bold text-gray-800">{titulo}</h3>
    </button>
);

export default TarjetaAccion;
