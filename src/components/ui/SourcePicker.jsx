import React, { useState, useEffect } from 'react';
import { Plus, X, Check } from 'lucide-react';

const DEFAULT_SOURCES = [
    'Facebook Ads', 'Instagram Ads', 'Google Ads', 
    'TikTok', 'Referido', 'Llamada en frío', 
    'Sitio Web', 'WhatsApp Orgánico'
];

const SourcePicker = ({ selectedSource, onChange }) => {
    const [isCustom, setIsCustom] = useState(false);
    const [customValue, setCustomValue] = useState('');
    const [customSources, setCustomSources] = useState([]);

    // Cargar opciones personalizadas desde localStorage
    useEffect(() => {
        const saved = localStorage.getItem('crm_custom_sources');
        if (saved) {
            try {
                setCustomSources(JSON.parse(saved));
            } catch (e) {
                console.error("Error parsing custom sources", e);
            }
        }
    }, []);

    const saveCustomSource = (source) => {
        if (source && !DEFAULT_SOURCES.includes(source)) {
            setCustomSources(prev => {
                if (!prev.includes(source)) {
                    const newSources = [...prev, source];
                    localStorage.setItem('crm_custom_sources', JSON.stringify(newSources));
                    return newSources;
                }
                return prev;
            });
        }
    };

    // Asegurarse de que si el prospecto tiene una fuente custom, se añada a las opciones
    useEffect(() => {
        if (selectedSource) {
            saveCustomSource(selectedSource);
        }
    }, [selectedSource]);

    const removeCustomSource = (e, sourceToRemove) => {
        e.stopPropagation();
        setCustomSources(prev => {
            const newSources = prev.filter(s => s !== sourceToRemove);
            localStorage.setItem('crm_custom_sources', JSON.stringify(newSources));
            return newSources;
        });
        if (selectedSource === sourceToRemove) {
            // Opcionalmente deseleccionar si se elimina
            onChange('');
        }
    };

    const handleSelect = (source) => {
        setIsCustom(false);
        onChange(source);
    };

    const handleCustomSubmit = (e) => {
        if (e) e.preventDefault();
        const val = customValue.trim();
        if (val) {
            saveCustomSource(val);
            onChange(val);
            setCustomValue('');
            setIsCustom(false);
        }
    };

    const allSources = [...DEFAULT_SOURCES, ...customSources];

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

                {customSources.map((source) => (
                    <div key={source} className="relative group flex items-center">
                        <button
                            type="button"
                            onClick={() => handleSelect(source)}
                            className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border pr-7 ${
                                selectedSource === source
                                    ? 'bg-(--theme-500) text-white border-(--theme-500) shadow-sm scale-105'
                                    : 'bg-gray-50 text-gray-400 border-gray-100 hover:border-gray-200 hover:text-gray-600'
                            }`}
                        >
                            {source}
                        </button>
                        <button
                            type="button"
                            onClick={(e) => removeCustomSource(e, source)}
                            className={`absolute right-1.5 p-0.5 rounded-full transition-opacity opacity-0 group-hover:opacity-100 ${
                                selectedSource === source ? 'text-white hover:bg-white/20' : 'text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                            }`}
                            title="Eliminar opción"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                ))}
                
                {!isCustom ? (
                    <button
                        type="button"
                        onClick={() => setIsCustom(true)}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border ${
                            selectedSource && !allSources.includes(selectedSource)
                                ? 'bg-(--theme-500) text-white border-(--theme-500)'
                                : 'bg-white text-gray-400 border-dashed border-gray-200 hover:border-gray-400 hover:text-gray-600'
                        }`}
                    >
                        {selectedSource && !allSources.includes(selectedSource) ? selectedSource : '+ Otro'}
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
