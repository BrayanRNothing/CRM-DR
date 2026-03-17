import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, Circle, Phone, Mail, FileText, ShoppingCart, Handshake, ArrowLeft, TrendingUp, User, ArrowRight, Plus, Minus, XCircle, CheckCircle, Search, X, ThumbsUp, ThumbsDown } from 'lucide-react';

const VendedorTimeline = () => {
    // Definición del Pipeline y sus disparadores
    const pipelineStages = {
        prospecto: { label: 'Prospecto', color: 'bg-gray-400', next: 'calificado' },
        calificado: { label: 'Calificado', color: 'bg-teal-400', next: 'propuesta' },
        propuesta: { label: 'Propuesta', color: 'bg-cyan-500', next: 'negociacion' },
        negociacion: { label: 'Negociación', color: 'bg-indigo-500', next: 'cierre' },
        cierre: { label: 'Cierre Ganado', color: 'bg-emerald-500', next: null },
        perdida: { label: 'Perdida', color: 'bg-red-500', next: null } // New Stage
    };

    // MOCK DATA - Available Clients for Selection
    const [availableClients] = useState([
        { id: 101, nombre: 'Empresas del Norte S.A.', contacto: 'Juan Pérez' },
        { id: 102, nombre: 'Distribuidora Central', contacto: 'María Gómez' },
        { id: 103, nombre: 'Logística Avanzada', contacto: 'Pedro Ruiz' },
        { id: 104, nombre: 'Consultores Estratégicos', contacto: 'Laura Díaz' },
        { id: 105, nombre: 'Manufacturas Totales', contacto: 'Carlos Sánchez' }
    ]);

    const [clientes, setClientes] = useState([
        {
            id: 1,
            nombre: 'Carlos López',
            empresa: 'Tech Solutions SA',
            telefono: '5551111111',
            email: 'carlos@techsol.com',
            etapaActual: 'calificado',
            progreso: 40,
            ultimaActividad: 'Hace 2 días',
            // Detailed Interaction Tracking
            stats: {
                llamadas: { total: 3, contestadas: 2, fallidas: 1, intentosActuales: 0, historialIntentos: ['success', 'success', 'fail'] },
                juntas: { programadas: 2, asistidas: 1, noShow: 0, canceladas: 0 },
                cotizaciones: { enviadas: 0, aceptadas: 0, rechazadas: 0 }
            },
            hitos: [
                { id: 1, nombre: 'Primer contacto', tipo: 'llamada', completado: true, fecha: '2026-02-01', triggerStage: 'calificado' },
                { id: 2, nombre: 'Reunión inicial', tipo: 'reunion', completado: true, fecha: '2026-02-03', triggerStage: 'calificado' },
                { id: 3, nombre: 'Enviar cotización', tipo: 'cotizacion', completado: false, fecha: null, triggerStage: 'propuesta' },
                { id: 4, nombre: 'Seguimiento cotización', tipo: 'llamada', completado: false, fecha: null, triggerStage: 'propuesta' },
                { id: 5, nombre: 'Negociación términos', tipo: 'reunion', completado: false, fecha: null, triggerStage: 'negociacion' },
                { id: 6, nombre: 'Cierre de venta', tipo: 'venta', completado: false, fecha: null, triggerStage: 'cierre' }
            ],
            actividades: [
                { id: 1, tipo: 'llamada', descripcion: 'Llamada de seguimiento', fecha: '2026-02-09', completada: true },
                { id: 2, tipo: 'email', descripcion: 'Enviar información adicional', fecha: '2026-02-10', completada: false }
            ]
        },
        // ... other clients with simplified structure for brevity if needed, but keeping full for now
        {
            id: 2,
            nombre: 'Ana Rodríguez',
            empresa: 'Digital Corp',
            telefono: '5552222222',
            email: 'ana@digitalcorp.com',
            etapaActual: 'propuesta',
            progreso: 60,
            ultimaActividad: 'Hace 1 día',
            stats: {
                llamadas: { total: 5, contestadas: 4, fallidas: 1, intentosActuales: 0, historialIntentos: ['success'] },
                juntas: { programadas: 1, asistidas: 1, noShow: 0, canceladas: 0 },
                cotizaciones: { enviadas: 1, aceptadas: 0, rechazadas: 0 }
            },
            hitos: [
                { id: 1, nombre: 'Primer contacto', tipo: 'llamada', completado: true, fecha: '2026-01-28', triggerStage: 'calificado' },
                { id: 2, nombre: 'Reunión inicial', tipo: 'reunion', completado: true, fecha: '2026-01-30', triggerStage: 'calificado' },
                { id: 3, nombre: 'Enviar cotización', tipo: 'cotizacion', completado: true, fecha: '2026-02-02', triggerStage: 'propuesta' },
                { id: 4, nombre: 'Seguimiento cotización', tipo: 'llamada', completado: true, fecha: '2026-02-05', triggerStage: 'propuesta' },
                { id: 5, nombre: 'Negociación términos', tipo: 'reunion', completado: false, fecha: null, triggerStage: 'negociacion' },
                { id: 6, nombre: 'Cierre de venta', tipo: 'venta', completado: false, fecha: null, triggerStage: 'cierre' }
            ],
            actividades: []
        },
        {
            id: 3,
            nombre: 'Pedro Hernández',
            empresa: 'Innovate Inc',
            telefono: '5553333333',
            email: 'pedro@innovate.com',
            etapaActual: 'negociacion',
            progreso: 80,
            ultimaActividad: 'Hace 3 horas',
            stats: {
                llamadas: { total: 8, contestadas: 6, fallidas: 2, intentosActuales: 0, historialIntentos: [] },
                juntas: { programadas: 3, asistidas: 3, noShow: 0, canceladas: 0 },
                cotizaciones: { enviadas: 2, aceptadas: 1, rechazadas: 0 }
            },
            hitos: [
                { id: 1, nombre: 'Primer contacto', tipo: 'llamada', completado: true, fecha: '2026-01-20', triggerStage: 'calificado' },
                // ...
                { id: 6, nombre: 'Cierre de venta', tipo: 'venta', completado: false, fecha: null, triggerStage: 'cierre' }
            ],
            actividades: []
        },
        {
            id: 4,
            nombre: 'María García',
            empresa: 'StartUp XYZ',
            telefono: '5554444444',
            email: 'maria@startupxyz.com',
            etapaActual: 'contactado',
            progreso: 20,
            ultimaActividad: 'Hace 5 días',
            stats: {
                llamadas: { total: 1, contestadas: 1, fallidas: 0, intentosActuales: 0, historialIntentos: [] },
                juntas: { programadas: 0, asistidas: 0, noShow: 0, canceladas: 0 },
                cotizaciones: { enviadas: 0, aceptadas: 0, rechazadas: 0 }
            },
            hitos: [
                { id: 1, nombre: 'Primer contacto', tipo: 'llamada', completado: true, fecha: '2026-02-06', triggerStage: 'calificado' },
                // ...
            ],
            actividades: []
        }
    ]);

    const [vistaDetallada, setVistaDetallada] = useState(false);
    const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
    const [showNewTrackingModal, setShowNewTrackingModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const getIconoHito = (tipo) => {
        const iconos = {
            llamada: Phone,
            reunion: Handshake,
            cotizacion: FileText,
            email: Mail,
            venta: ShoppingCart
        };
        return iconos[tipo] || Circle;
    };

    const toggleHito = (hitoId) => {
        setClientes(clientes.map(c => {
            if (c.id === clienteSeleccionado.id) {
                const nuevosHitos = c.hitos.map(h =>
                    h.id === hitoId ? { ...h, completado: !h.completado, fecha: !h.completado ? new Date().toISOString().split('T')[0] : null } : h
                );

                const completados = nuevosHitos.filter(h => h.completado).length;
                const progreso = Math.round((completados / nuevosHitos.length) * 100);

                let nuevaEtapa = 'prospecto';
                nuevosHitos.forEach(h => {
                    if (h.completado && h.triggerStage) {
                        nuevaEtapa = h.triggerStage;
                    }
                });

                const clienteActualizado = { ...c, hitos: nuevosHitos, progreso, etapaActual: nuevaEtapa };
                setClienteSeleccionado(clienteActualizado);
                return clienteActualizado;
            }
            return c;
        }));
    };

    // New Interaction Logic
    const handleInteraction = (type, result) => {
        setClientes(clientes.map(c => {
            if (c.id === clienteSeleccionado.id) {
                let newStats = { ...c.stats };
                let newStage = c.etapaActual;

                if (type === 'llamada') {
                    newStats.llamadas.total += 1;

                    if (!newStats.llamadas.historialIntentos) {
                        newStats.llamadas.historialIntentos = [];
                    }

                    if (result === 'success') {
                        newStats.llamadas.contestadas += 1;
                        newStats.llamadas.historialIntentos.push('success');

                        // Keep history as record of attempts for this "cycle"
                    } else {
                        newStats.llamadas.fallidas += 1;
                        newStats.llamadas.historialIntentos.push('fail');

                        // 3rd Strike Rule - Count distinct failures in current sequence
                        // We check if the last 3 are all fails (or if total consecutive fails at end is >= 3)
                        const recentHistory = newStats.llamadas.historialIntentos.slice(-3);
                        if (recentHistory.length === 3 && recentHistory.every(r => r === 'fail')) {
                            newStage = 'perdida';
                        }
                    }
                } else if (type === 'cita') {
                    if (result === 'success') {
                        newStats.juntas.asistidas += 1;
                    } else {
                        newStats.juntas.noShow += 1;
                    }
                } else if (type === 'cotizacion') {
                    if (result === 'success') {
                        newStats.cotizaciones.enviadas += 1;
                    }
                }

                const clienteActualizado = { ...c, stats: newStats, etapaActual: newStage };
                setClienteSeleccionado(clienteActualizado);
                return clienteActualizado;
            }
            return c;
        }));
    };

    const InteractionAction = ({ icon: Icon, label, type, history, onLog, isLost }) => {
        const [mode, setMode] = useState('idle'); // idle, confirming

        if (isLost) {
            return (
                <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center justify-center gap-2 text-red-600 font-bold opacity-75 cursor-not-allowed">
                    <XCircle className="w-5 h-5" />
                    Oportunidad Perdida
                </div>
            );
        }

        if (mode === 'confirming') {
            return (
                <div className="bg-white border-2 border-teal-500 rounded-xl p-3 shadow-md animate-in fade-in zoom-in duration-200">
                    <p className="text-sm font-bold text-gray-800 text-center mb-3">¿{label}?</p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => { onLog(type, 'success'); setMode('idle'); }}
                            className="flex-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1 transition-colors"
                        >
                            <CheckCircle2 className="w-4 h-4" /> Sí
                        </button>
                        <button
                            onClick={() => { onLog(type, 'fail'); setMode('idle'); }}
                            className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1 transition-colors"
                        >
                            <XCircle className="w-4 h-4" /> No
                        </button>
                    </div>
                </div>
            );
        }

        // Determine slots based on history
        // We render visual slots to show history of recent attempts
        // If history is empty, 3 empty slots.

        const currentSlots = history || [];
        const displaySlots = [...currentSlots];
        while (displaySlots.length < 3) {
            displaySlots.push('empty');
        }
        // Take only the last 3 for display if overflow, OR if user wants to see all, we could scroll.
        // For UI simplicity, showing last 3 relevant events.
        const finalSlots = displaySlots.slice(-3);

        return (
            <div className="bg-gray-50 border border-gray-100 hover:border-teal-200 p-3 rounded-xl transition-all">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-white rounded-lg shadow-sm text-teal-600">
                            <Icon className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-gray-700 text-sm">{label}</span>
                    </div>
                    {/* Attempt Indicators for Calls */}
                    {history !== undefined && (
                        <div className="flex gap-1.5">
                            {finalSlots.map((status, i) => (
                                <div
                                    key={i}
                                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all ${status === 'fail'
                                        ? 'bg-red-500 border-red-500' // Fail
                                        : status === 'success'
                                            ? 'bg-emerald-500 border-emerald-500' // Success
                                            : 'bg-white border-gray-300' // Empty
                                        }`}
                                >
                                    {status === 'success' && <CheckCircle2 className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                                    {status === 'fail' && <X className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <button
                    onClick={() => setMode('confirming')}
                    className="w-full bg-white border border-gray-200 text-gray-600 hover:text-teal-600 hover:border-teal-300 py-2 rounded-lg font-semibold text-sm transition-all shadow-sm"
                >
                    Registrar
                </button>
            </div>
        );
    };


    const verDetalle = (cliente) => {
        setClienteSeleccionado(cliente);
        setVistaDetallada(true);
    };

    const volverAVista = () => {
        setVistaDetallada(false);
        setClienteSeleccionado(null);
    };

    const handleCreateTracking = (client) => {
        // Create new tracking instance for this client
        const newTracking = {
            id: Date.now(),
            nombre: client.contacto,
            empresa: client.nombre,
            telefono: '555-000-0000', // Mock
            email: 'contacto@empresa.com', // Mock
            etapaActual: 'prospecto',
            progreso: 0,
            ultimaActividad: 'Reciente',
            stats: {
                llamadas: { total: 0, contestadas: 0, fallidas: 0, intentosActuales: 0, historialIntentos: [] },
                juntas: { programadas: 0, asistidas: 0, noShow: 0, canceladas: 0 },
                cotizaciones: { enviadas: 0, aceptadas: 0, rechazadas: 0 }
            },
            hitos: [
                { id: 1, nombre: 'Primer contacto', tipo: 'llamada', completado: false, fecha: null, triggerStage: 'calificado' },
                { id: 2, nombre: 'Reunión inicial', tipo: 'reunion', completado: false, fecha: null, triggerStage: 'calificado' },
                { id: 3, nombre: 'Enviar cotización', tipo: 'cotizacion', completado: false, fecha: null, triggerStage: 'propuesta' },
                { id: 4, nombre: 'Seguimiento cotización', tipo: 'llamada', completado: false, fecha: null, triggerStage: 'propuesta' },
                { id: 5, nombre: 'Negociación términos', tipo: 'reunion', completado: false, fecha: null, triggerStage: 'negociacion' },
                { id: 6, nombre: 'Cierre de venta', tipo: 'venta', completado: false, fecha: null, triggerStage: 'cierre' }
            ],
            actividades: []
        };

        setClientes([newTracking, ...clientes]);
        setShowNewTrackingModal(false);
        setClienteSeleccionado(newTracking);
        setVistaDetallada(true);
    };

    // Filter available clients
    const filteredAvailableClients = availableClients.filter(
        c => c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.contacto.toLowerCase().includes(searchTerm.toLowerCase())
    );


    // Vista General - Grid de clientes
    if (!vistaDetallada) {
        return (
            <div className="min-h-screen bg-transparent p-6 relative">
                <div className="max-w-[1800px] mx-auto">

                    {/* Header with Add Button */}
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">Seguimientos Activos</h1>
                            <p className="text-gray-500">Gestiona tus oportunidades de venta</p>
                        </div>
                        <button
                            onClick={() => setShowNewTrackingModal(true)}
                            className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm hover:shadow-md flex items-center gap-2 transition-all"
                        >
                            <Plus className="w-5 h-5" />
                            Nuevo Seguimiento
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {clientes.map((cliente) => {
                            const hitosCompletados = cliente.hitos.filter(h => h.completado).length;
                            const siguienteHito = cliente.hitos.find(h => !h.completado);

                            return (
                                <div
                                    key={cliente.id}
                                    onClick={() => verDetalle(cliente)}
                                    className={`bg-white border rounded-xl p-5 transition-all cursor-pointer group hover:scale-[1.02] hover:shadow-lg shadow-sm relative overflow-hidden ${cliente.etapaActual === 'perdida'
                                        ? 'border-red-200 opacity-80'
                                        : 'border-gray-200 hover:border-teal-300'
                                        }`}
                                >
                                    {cliente.etapaActual === 'perdida' && (
                                        <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] uppercase font-bold px-2 py-1 rounded-bl-lg z-20">
                                            Perdida
                                        </div>
                                    )}

                                    {/* Header */}
                                    <div className="flex items-start gap-3 mb-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${cliente.etapaActual === 'perdida' ? 'bg-red-50 border-red-100 text-red-500' : 'bg-teal-50 border-teal-100 text-teal-600'
                                            }`}>
                                            <User className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-gray-800 group-hover:text-teal-600 transition-colors truncate">
                                                {cliente.nombre}
                                            </h3>
                                            <p className="text-sm text-gray-500 truncate">{cliente.empresa}</p>
                                        </div>
                                    </div>

                                    {/* Progreso */}
                                    <div className="mb-4">
                                        <div className="flex items-center justify-between text-xs mb-2">
                                            <span className="text-gray-500">Progreso pipeline</span>
                                            <span className="text-teal-600 font-bold">{cliente.progreso}%</span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full transition-all ${cliente.etapaActual === 'perdida' ? 'bg-red-400' : 'bg-teal-500'
                                                    }`}
                                                style={{ width: `${cliente.progreso}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    {/* Mini timeline */}
                                    <div className="space-y-2 mb-4 pb-4 border-b border-gray-100">
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                            <span>{hitosCompletados} de {cliente.hitos.length} hitos completados</span>
                                        </div>
                                        {siguienteHito && (
                                            <div className="flex items-center gap-2 text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded-md mb-1">
                                                <Circle className="w-3 h-3" />
                                                <span className="truncate">Siguiente: {siguienteHito.nombre}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Info rápida */}
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-xs text-gray-400">
                                            <Clock className="w-3 h-3" />
                                            <span>{cliente.ultimaActividad}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                                            <TrendingUp className="w-3 h-3 text-gray-400" />
                                            <span className={`capitalize px-2 py-0.5 rounded text-xs font-semibold ${cliente.etapaActual === 'calificado' ? 'bg-teal-100 text-teal-700' :
                                                cliente.etapaActual === 'propuesta' ? 'bg-cyan-100 text-cyan-700' :
                                                    cliente.etapaActual === 'negociacion' ? 'bg-indigo-100 text-indigo-700' :
                                                        cliente.etapaActual === 'cierre' ? 'bg-emerald-100 text-emerald-700' :
                                                            cliente.etapaActual === 'perdida' ? 'bg-red-100 text-red-700' :
                                                                'bg-gray-100 text-gray-600'
                                                }`}>
                                                {pipelineStages[cliente.etapaActual]?.label || cliente.etapaActual}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* MODAL NUEVO SEGUIMIENTO */}
                {showNewTrackingModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                <h3 className="font-bold text-gray-800">Iniciar Nuevo Seguimiento</h3>
                                <button onClick={() => setShowNewTrackingModal(false)} className="p-1 hover:bg-gray-200 rounded-full text-gray-500">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-4">
                                <div className="relative mb-4">
                                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Buscar cliente..."
                                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>

                                <div className="max-h-[300px] overflow-y-auto space-y-2">
                                    {filteredAvailableClients.map(client => (
                                        <div
                                            key={client.id}
                                            onClick={() => handleCreateTracking(client)}
                                            className="p-3 border border-gray-100 rounded-xl hover:bg-teal-50 hover:border-teal-200 cursor-pointer transition-all flex items-center justify-between group"
                                        >
                                            <div>
                                                <p className="font-bold text-gray-800 text-sm group-hover:text-teal-700">{client.nombre}</p>
                                                <p className="text-xs text-gray-500">{client.contacto}</p>
                                            </div>
                                            <Plus className="w-4 h-4 text-gray-300 group-hover:text-teal-500" />
                                        </div>
                                    ))}
                                    {filteredAvailableClients.length === 0 && (
                                        <p className="text-center text-sm text-gray-400 py-4">No se encontraron clientes</p>
                                    )}
                                </div>
                            </div>
                            <div className="p-3 bg-gray-50 border-t border-gray-100 text-xs text-center text-gray-500">
                                Selecciona un cliente para comenzar el seguimiento
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Vista Detallada - Cliente específico
    const isLost = clienteSeleccionado.etapaActual === 'perdida';

    return (
        <div className="min-h-screen bg-transparent p-6">
            <div className="max-w-7xl mx-auto">
                {/* Botón volver */}
                <button
                    onClick={volverAVista}
                    className="mb-6 flex items-center gap-2 text-gray-500 hover:text-teal-600 transition-colors font-medium bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm hover:shadow-md"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span>Volver a vista general</span>
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Info del cliente */}
                    <div className="lg:col-span-1 space-y-4">
                        {/* Card principal */}
                        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center border ${isLost ? 'bg-red-50 border-red-100' : 'bg-teal-50 border-teal-100'}`}>
                                    <User className={`w-8 h-8 ${isLost ? 'text-red-500' : 'text-teal-600'}`} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-800">{clienteSeleccionado.nombre}</h2>
                                    <p className="text-gray-500">{clienteSeleccionado.empresa}</p>
                                </div>
                            </div>

                            {/* Etapa Actual Highlight */}
                            <div className={`mb-4 p-3 border rounded-lg ${isLost ? 'bg-red-50 border-red-200' : 'bg-teal-50 border-teal-100'}`}>
                                <p className={`text-xs uppercase font-bold mb-1 ${isLost ? 'text-red-600' : 'text-teal-600'}`}>Etapa Actual</p>
                                <div className="flex items-center justify-between">
                                    <h3 className={`text-lg font-bold capitalize ${isLost ? 'text-red-800' : 'text-teal-800'}`}>
                                        {pipelineStages[clienteSeleccionado.etapaActual]?.label || clienteSeleccionado.etapaActual}
                                    </h3>
                                    <TrendingUp className={`w-5 h-5 ${isLost ? 'text-red-600' : 'text-teal-600'}`} />
                                </div>
                            </div>

                            <div className="space-y-3 pt-4 border-t border-gray-100">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Phone className="w-4 h-4 text-gray-400" />
                                    <span>{clienteSeleccionado.telefono}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Mail className="w-4 h-4 text-gray-400" />
                                    <span className="truncate">{clienteSeleccionado.email}</span>
                                </div>
                            </div>
                        </div>

                        {/* REGISTRO DE ACTIVIDAD (ACCIONES RAPIDAS) */}
                        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                            <h3 className="font-bold text-gray-800 mb-5 flex items-center gap-2 text-base uppercase tracking-wide">
                                <Clock className="w-5 h-5 text-teal-600" />
                                Acciones Rápidas
                            </h3>

                            <div className="space-y-4">
                                <InteractionAction
                                    icon={Phone}
                                    label="Realizar Llamada"
                                    type="llamada"
                                    history={clienteSeleccionado.stats?.llamadas?.historialIntentos}
                                    onLog={handleInteraction}
                                    isLost={isLost}
                                />
                                <div className="text-center">
                                    <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400 font-medium bg-gray-50 py-1 rounded-md">
                                        <span>Intentos Fallidos:</span>
                                        <span className={`${clienteSeleccionado.stats?.llamadas?.fallidas > 0 ? 'text-red-500 font-bold' : 'text-gray-600'}`}>
                                            {clienteSeleccionado.stats?.llamadas?.fallidas || 0}
                                        </span>
                                    </div>
                                </div>

                                <InteractionAction
                                    icon={Handshake}
                                    label="Registrar Reunión"
                                    type="cita"
                                    onLog={handleInteraction}
                                    isLost={isLost}
                                />
                                <InteractionAction
                                    icon={FileText}
                                    label="Enviar Cotización"
                                    type="cotizacion"
                                    onLog={handleInteraction}
                                    isLost={isLost}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Timeline completa */}
                    <div className="lg:col-span-2">
                        <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
                            <h2 className="text-2xl font-bold text-gray-800 mb-8 flex items-center gap-2">
                                <Clock className="w-6 h-6 text-teal-600" />
                                Línea del Tiempo
                            </h2>

                            <div className="space-y-6 relative pl-2">
                                {/* Vertical Line needs to be positioned absolutely */}
                                <div className="absolute left-[34px] top-4 bottom-10 w-0.5 bg-gray-100 z-0"></div>

                                {clienteSeleccionado.hitos.map((hito, index) => {
                                    const IconoHito = getIconoHito(hito.tipo);

                                    return (
                                        <div key={hito.id} className="relative z-10">
                                            <div className="flex items-start gap-6">
                                                {/* Icono clickeable */}
                                                <button
                                                    onClick={() => !isLost && toggleHito(hito.id)}
                                                    className={`relative z-10 w-14 h-14 rounded-full flex items-center justify-center border-4 transition-all shadow-sm ${hito.completado
                                                        ? 'bg-white border-emerald-500 text-emerald-500'
                                                        : isLost
                                                            ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                                                            : 'bg-white border-gray-200 text-gray-400 hover:border-teal-400 hover:text-teal-500'
                                                        }`}
                                                    disabled={isLost}
                                                >
                                                    {hito.completado ? (
                                                        <CheckCircle2 className="w-8 h-8" />
                                                    ) : (
                                                        <IconoHito className="w-6 h-6" />
                                                    )}
                                                </button>

                                                {/* Contenido */}
                                                <div className="flex-1">
                                                    <div
                                                        className={`p-5 rounded-xl border transition-all ${hito.completado
                                                            ? 'bg-emerald-50/50 border-emerald-100'
                                                            : 'bg-white border-gray-200 hover:shadow-md'
                                                            }`}
                                                    >
                                                        <div className="flex items-start justify-between mb-2">
                                                            <div className="flex flex-col">
                                                                <h3
                                                                    className={`font-bold text-lg ${hito.completado ? 'text-emerald-700' : 'text-gray-800'
                                                                        }`}
                                                                >
                                                                    {hito.nombre}
                                                                </h3>
                                                                {/* Indicador de que este hito mueve la etapa */}
                                                                {hito.triggerStage && !hito.completado && (
                                                                    <span className="text-xs text-cyan-600 font-medium mt-1 flex items-center gap-1 bg-cyan-50 px-2 py-1 rounded w-fit">
                                                                        <ArrowRight className="w-3 h-3" />
                                                                        Avanza a fase: {pipelineStages[hito.triggerStage].label}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {hito.fecha && (
                                                                <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                                                    <Clock className="w-3 h-3" />
                                                                    <span>{hito.fecha}</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center gap-3 mt-3">
                                                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md capitalize font-medium">
                                                                {hito.tipo}
                                                            </span>
                                                            {hito.completado && (
                                                                <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                                                                    <CheckCircle2 className="w-3 h-3" /> Completado
                                                                </span>
                                                            )}
                                                            {!hito.completado && index === clienteSeleccionado.hitos.findIndex(h => !h.completado) && !isLost && (
                                                                <span className="text-xs text-amber-600 font-bold flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-md animate-pulse">
                                                                    <Circle className="w-3 h-3" /> Próximo paso
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VendedorTimeline;
