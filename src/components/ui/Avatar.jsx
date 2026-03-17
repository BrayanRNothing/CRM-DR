import React from 'react';

// Generar color basado en el nombre
const getColorFromName = (name) => {
  if (!name) return '#6B7280'; // Gris por defecto
  
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-orange-500',
    'bg-teal-500',
    'bg-cyan-500',
  ];
  
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};

// Obtener iniciales (máximo 2 letras)
const getInitials = (name) => {
  if (!name) return '?';
  
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const Avatar = ({ name, size = 'md', className = '' }) => {
  const initials = getInitials(name);
  const colorClass = getColorFromName(name);
  
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
    '2xl': 'w-20 h-20 text-2xl',
  };
  
  return (
    <div 
      className={`${sizes[size]} ${colorClass} rounded-full flex items-center justify-center text-white font-bold shadow-md ${className}`}
      title={name}
    >
      {initials}
    </div>
  );
};

export default Avatar;
