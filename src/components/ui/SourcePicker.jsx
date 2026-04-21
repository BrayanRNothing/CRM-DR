import React, { useState } from 'react';
import { Plus, X, Check } from 'lucide-react';

const DEFAULT_SOURCES = [
    'Facebook Ads', 'Instagram Ads', 'Google Ads', 
    'TikTok', 'Referido', 'Llamada en frío', 
    'Sitio Web', 'WhatsApp Orgánico'
];

const SourcePicker = ({ selectedSource, onChange }) => {
    const [isCustom, setIsCustom] = useState(false);
    const [customValue, setCustomValue] = useState('');

    const handleSelect = (source) => {
        setIsCustom(false);
        onChange(source);
    };

    const handleCustomSubmit = (e) => {
        if (e) e.preventDefault();
        if (customValue.trim()) {
            onChange(customValue.trim());
            setCustomValue('');
            setIsCustom(false);
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
                {DEFAULT_SOURCES.map((source) => (
                    <button
                        key={source}
                        type="button"
                        onClick={() => handleSelect(source)}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border ${
                            selectedSource === source
                                ? 'bg-(--theme-500) text-white border-(--theme-500) shadow-sm scale-105'
                                : 'bg-gray-50 text-gray-400 border-gray-100 hover:border-gray-200 hover:text-gray-600'
                        }`}
                    >
                        {source}
                    </button>
                ))}
                
                {!isCustom ? (
                    <button
                        type="button"
                        onClick={() => setIsCustom(true)}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border ${
                            selectedSource && !DEFAULT_SOURCES.includes(selectedSource)
                                ? 'bg-(--theme-500) text-white border-(--theme-500)'
                                : 'bg-white text-gray-400 border-dashed border-gray-200 hover:border-gray-400 hover:text-gray-600'
                        }`}
                    >
                        {selectedSource && !DEFAULT_SOURCES.includes(selectedSource) ? selectedSource : '+ Otro'}
                    </button>
                ) : (
                    <div className="flex items-center gap-2 animate-in slide-in-from-left-2 duration-200">
                        <input
                            autoFocus
                            type="text"
                            value={customValue}
                            onChange={(e) => setCustomValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCustomSubmit()}
                            placeholder="Especificar fuente..."
                            className="text-[10px] font-bold px-3 py-1.5 bg-white border border-(--theme-500) rounded-full outline-none w-32"
                        />
                        <button 
                            type="button" 
                            onClick={handleCustomSubmit}
                            className="p-1.5 bg-(--theme-500) text-white rounded-full hover:bg-(--theme-600)"
                        >
                            <Check className="w-3 h-3" />
                        </button>
                        <button 
                            type="button" 
                            onClick={() => setIsCustom(false)}
                            className="p-1.5 bg-gray-100 text-gray-400 rounded-full hover:bg-gray-200"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                )}
            </div>
            
            {selectedSource && (
                <p className="text-[9px] text-(--theme-600) font-black uppercase tracking-widest pl-1">
                    Seleccionado: {selectedSource}
                </p>
            )}
        </div>
    );
};

export default SourcePicker;
