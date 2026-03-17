import React from 'react';
import { MoreVertical, Phone, Mail } from 'lucide-react';

const DataCardTemplate = ({
    image,
    title,
    subtitle,
    status,
    secondaryText,
    onAction
}) => {
    return (
        <div className="group relative backdrop-blur-md border border-white/10 rounded-xl p-4 transition-colors duration-300 hover:border-blue-400/50 hover:bg-white/5">


            {/* Header / Avatar */}
            <div className="flex items-start justify-between mb-3 mt-2">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-linear-to-br from-gray-700 to-gray-800 border-2 border-gray-600 flex items-center justify-center text-xl font-bold text-white overflow-hidden">
                        {image ? (
                            <img src={image} alt={title} className="w-full h-full object-cover" />
                        ) : (
                            title.charAt(0)
                        )}
                    </div>
                    {/* Online Indicator */}
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-900 ${status === 'active' ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                </div>

                <button className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors">
                    <MoreVertical size={16} />
                </button>
            </div>

            {/* Content */}
            <div className="mb-3">
                <h3 className="text-white font-semibold text-lg leading-tight mb-1 truncate">{title}</h3>
                <p className="text-blue-400 text-sm font-medium mb-1">{subtitle}</p>
                <p className="text-gray-500 text-xs truncate">{secondaryText}</p>
            </div>

            {/* Actions / Footer */}
            <div className="flex items-center gap-2 mt-auto pt-3 border-t border-gray-800/50">
                <button className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs py-1.5 rounded-lg flex items-center justify-center gap-1 transition-colors">
                    <Phone size={12} /> Llamar
                </button>
                <button className="flex-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs py-1.5 rounded-lg flex items-center justify-center gap-1 transition-colors border border-blue-500/20">
                    <Mail size={12} /> Mensaje
                </button>
            </div>
        </div>
    );
};

export default DataCardTemplate;
