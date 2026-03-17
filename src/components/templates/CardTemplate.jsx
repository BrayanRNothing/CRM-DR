import React from 'react';

/**
 * PLANTILLA BASE PARA CARDS/TARJETAS
 * 
 * Copia este archivo y personaliza según necesites
 */

const CardTemplate = ({ title, description, icon, value, color = 'blue' }) => {
    const colorClasses = {
        blue: 'bg-blue-500/20 text-blue-400',
        green: 'bg-green-500/20 text-green-400',
        red: 'bg-red-500/20 text-red-400',
        yellow: 'bg-yellow-500/20 text-yellow-400',
        purple: 'bg-purple-500/20 text-purple-400',
    };

    return (
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-blue-500/50 transition-all">
            <div className="flex items-center justify-between mb-4">
                {icon && (
                    <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
                        {icon}
                    </div>
                )}
                {value && (
                    <span className="text-2xl font-bold text-white">{value}</span>
                )}
            </div>
            {title && (
                <h3 className="text-gray-400 text-sm mb-1">{title}</h3>
            )}
            {description && (
                <p className="text-gray-500 text-xs">{description}</p>
            )}
        </div>
    );
};

export default CardTemplate;
