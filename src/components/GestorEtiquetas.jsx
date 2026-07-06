import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { Plus, X, Check, Trash2, Tag, Palette, Settings } from 'lucide-react';
import API_URL from '../config/api';
import { getToken } from '../utils/authUtils';
import toast from 'react-hot-toast';

export default function GestorEtiquetas({ clienteEtiquetas = '[]', onEtiquetasChange }) {
    const [globalTags, setGlobalTags] = useState([]);
    const [selectedTags, setSelectedTags] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isManageOpen, setIsManageOpen] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState('#3b82f6');
    const [loading, setLoading] = useState(false);
    const buttonRef = React.useRef(null);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

    useEffect(() => {
        if (clienteEtiquetas) {
            try {
                const parsed = JSON.parse(clienteEtiquetas);
                setSelectedTags(Array.isArray(parsed) ? parsed : []);
            } catch (e) {
                setSelectedTags([]);
            }
        }
    }, [clienteEtiquetas]);

    useEffect(() => {
        fetchGlobalTags();
    }, []);

    const fetchGlobalTags = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/vendedor/etiquetas`, {
                headers: { 'x-auth-token': getToken() }
            });
            setGlobalTags(res.data);
        } catch (error) {
            console.error('Error fetching global tags:', error);
        }
    };

    const handleCreateTag = async () => {
        if (!newTagName.trim()) return;
        setLoading(true);
        try {
            const res = await axios.post(`${API_URL}/api/vendedor/etiquetas`, {
                nombre: newTagName.trim(),
                color: newTagColor
            }, {
                headers: { 'x-auth-token': getToken() }
            });
            setGlobalTags([...globalTags, res.data]);
            setNewTagName('');
            toast.success('Etiqueta creada');
        } catch (error) {
            toast.error('Error al crear etiqueta');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTag = async (id) => {
        if (!confirm('¿Seguro que deseas eliminar esta etiqueta?')) return;
        try {
            await axios.delete(`${API_URL}/api/vendedor/etiquetas/${id}`, {
                headers: { 'x-auth-token': getToken() }
            });
            setGlobalTags(globalTags.filter(t => t.id !== id));
            
            const tagToDelete = globalTags.find(t => t.id === id);
            if (tagToDelete && selectedTags.includes(tagToDelete.nombre)) {
                handleToggleTag(tagToDelete.nombre);
            }
            toast.success('Etiqueta eliminada');
        } catch (error) {
            toast.error('Error al eliminar etiqueta');
        }
    };

    const handleToggleTag = (nombre) => {
        let newSelected;
        if (selectedTags.includes(nombre)) {
            newSelected = selectedTags.filter(t => t !== nombre);
        } else {
            newSelected = [...selectedTags, nombre];
        }
        setSelectedTags(newSelected);
        onEtiquetasChange(newSelected);
    };

    const toggleDropdown = () => {
        if (!isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setDropdownPos({
                top: rect.bottom + window.scrollY + 8,
                left: rect.left + window.scrollX
            });
        }
        setIsOpen(!isOpen);
    };

    // Cerrar click fuera
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (isOpen && !e.target.closest('.etiquetas-dropdown') && !e.target.closest('.etiquetas-button')) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    return (
        <div className="relative inline-block text-left">
            <div className="flex flex-wrap gap-2 items-center" ref={buttonRef}>
                {selectedTags.map(tagName => {
                    const gTag = globalTags.find(t => t.nombre === tagName);
                    const color = gTag ? gTag.color : '#6b7280';
                    return (
                        <span 
                            key={tagName} 
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-white shadow-sm"
                            style={{ backgroundColor: color }}
                        >
                            {tagName}
                            <button onClick={() => handleToggleTag(tagName)} className="hover:bg-white/20 rounded-full p-0.5">
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    );
                })}

                <button
                    onClick={toggleDropdown}
                    className="etiquetas-button inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200 transition-colors"
                >
                    <Plus className="w-3.5 h-3.5" />
                    Etiquetas
                </button>
            </div>

            {isOpen && createPortal(
                <div 
                    className="etiquetas-dropdown absolute z-[9999] w-64 rounded-xl bg-white shadow-xl border border-slate-200 overflow-hidden"
                    style={{ top: `${dropdownPos.top}px`, left: `${dropdownPos.left}px` }}
                >
                    <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                        <div className="flex justify-between items-center">
                            <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Etiquetas</h3>
                            <button 
                                onClick={() => {
                                    setIsManageOpen(true);
                                    setIsOpen(false);
                                }}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-md transition-colors border border-blue-100/50"
                            >
                                <Settings className="w-3 h-3" />
                                Gestionar
                            </button>
                        </div>
                    </div>
                    
                    <div className="p-2 space-y-1 max-h-56 overflow-y-auto custom-scrollbar">
                        {globalTags.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">No hay etiquetas creadas</p>
                        ) : (
                            globalTags.map(tag => {
                                const isSelected = selectedTags.includes(tag.nombre);
                                return (
                                    <div 
                                        key={tag.id}
                                        onClick={() => handleToggleTag(tag.nombre)}
                                        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}
                                    >
                                        <div className="w-3.5 h-3.5 rounded-full border border-gray-200 shadow-sm" style={{ backgroundColor: tag.color }}></div>
                                        <span className="text-sm text-gray-700 flex-1 truncate">{tag.nombre}</span>
                                        {isSelected && <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>,
                document.body
            )}

            {/* Modal de Gestión de Etiquetas */}
            {isManageOpen && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div className="flex items-center gap-2 text-gray-800">
                                <Tag className="w-5 h-5 text-blue-600" />
                                <h3 className="text-lg font-semibold">Gestor de Etiquetas</h3>
                            </div>
                            <button onClick={() => setIsManageOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar bg-white">
                            {/* Crear Etiqueta */}
                            <div className="bg-blue-50/50 rounded-lg p-4 border border-blue-100 mb-6">
                                <h4 className="text-sm font-medium text-blue-900 mb-3 flex items-center gap-2">
                                    <Plus className="w-4 h-4 text-blue-600" />
                                    Crear nueva etiqueta
                                </h4>
                                <div className="flex gap-3">
                                    <div className="relative flex-shrink-0" title="Elegir color">
                                        <input 
                                            type="color" 
                                            value={newTagColor}
                                            onChange={(e) => setNewTagColor(e.target.value)}
                                            className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0 shadow-sm"
                                        />
                                        <Palette className="w-4 h-4 absolute inset-0 m-auto pointer-events-none text-white mix-blend-difference" />
                                    </div>
                                    <input 
                                        type="text" 
                                        placeholder="Nombre de la etiqueta..." 
                                        value={newTagName}
                                        onChange={(e) => setNewTagName(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
                                        className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm"
                                    />
                                    <button 
                                        onClick={handleCreateTag}
                                        disabled={loading || !newTagName.trim()}
                                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 rounded-lg transition-colors shadow-sm disabled:opacity-50 flex-shrink-0"
                                    >
                                        Crear
                                    </button>
                                </div>
                            </div>

                            {/* Lista de Etiquetas */}
                            <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-3 px-1 border-b border-gray-100 pb-2">
                                    Etiquetas existentes ({globalTags.length})
                                </h4>
                                {globalTags.length === 0 ? (
                                    <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                        <Tag className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                        <p className="text-sm text-gray-500">No hay etiquetas creadas en el sistema.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {globalTags.map(tag => (
                                            <div key={tag.id} className="flex items-center justify-between group p-3 bg-white border border-gray-100 rounded-lg hover:border-gray-200 hover:shadow-sm transition-all">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-5 h-5 rounded border border-gray-200 shadow-sm" style={{ backgroundColor: tag.color }}></div>
                                                    <span className="text-sm font-medium text-gray-700">{tag.nombre}</span>
                                                </div>
                                                <button 
                                                    onClick={() => handleDeleteTag(tag.id)}
                                                    title="Eliminar etiqueta"
                                                    className="text-gray-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-md transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
