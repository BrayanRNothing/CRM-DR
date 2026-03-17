import React from 'react';

function StatCard({ title, value, icon, color }) {
  // Mapa de colores para fondos suaves
  const colorMap = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    purple: 'bg-purple-100 text-purple-600',
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition">
      <div>
        <p className="text-gray-500 text-sm font-medium mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-gray-800">{value}</h3>
      </div>
      <div className={`p-3 rounded-lg ${colorMap[color] || 'bg-gray-100'}`}>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  );
}

export default StatCard;