import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, RefreshCw, ChevronRight, ArrowLeft, User, History, Trash2, Download, Upload, Plus, X, Phone, MessageCircle, Calendar, Filter, Star, Mail, MessageSquare, Clock } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { getToken } from '../../utils/authUtils';
import { HistorialInteracciones } from '../../components/HistorialInteracciones';
import TimeWheelPicker from '../../components/TimeWheelPicker';

import API_URL from '../../config/api';

const CRMClientes = () => {
    const location = useLocation();
    const esMenuSeguimiento = location.pathname.endsWith('/clientes/seguimiento');
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [clienteAEliminar, setClienteAEliminar] = useState(null);
    const [eliminando, setEliminando] = useState(false);
    const [importando, setImportando] = useState(false);
    const [filtro, setFiltro] = useState('todos');
    const fileInputRef = useRef(null);
    const [mostrarModalCrear, setMostrarModalCrear] = useState(false);
    const [creandoCliente, setCreandoCliente] = useState(false);
    const [formCliente, setFormCliente] = useState({
        nombreCompleto: '',
        telefono: '',
        correo: '',
        empresa: ''
    });

    // Estados para la vista detallada
    const [prospectoSeleccionado, setProspectoSeleccionado] = useState(null);
    const [timeline, setTimeline] = useState([]);
    const [loadingTimeline, setLoadingTimeline] = useState(false);
    const [guardandoSeguimiento, setGuardandoSeguimiento] = useState(false);
    const [llamadaFlow, setLlamadaFlow] = useState(null);

    const getAuthHeaders = () => ({
        'x-auth-token': getToken() || ''
    });

    const getRole = () => {
        const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                return user.rol?.toLowerCase() || 'prospector';
            } catch (e) {
                return 'prospector';
            }
        }
        return 'prospector';
    };

    const getRolePath = () => {
        const rol = getRole();
        // No existe /api/vendedor/*, reutilizamos rutas closer para vista de clientes e historial.
        if (rol === 'vendedor') return 'closer';
        return rol;
    };

    const cargarClientes = async () => {
        setLoading(true);
        try {
            const rol = getRolePath();
            const res = await axios.get(
                `${API_URL}/api/${rol}/clientes-ganados`,
                { headers: getAuthHeaders() }
            );
            const data = res.data || [];
            setClientes(data);
            return data;
        } catch (error) {
            console.error('Error al cargar clientes:', error);
            setClientes([]);
            return [];
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarClientes();
        const interval = setInterval(cargarClientes, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const cargarTimelineCliente = async (cliente) => {
        setLoadingTimeline(true);
        try {
            const rol = getRolePath();
            const res = await axios.get(
                `${API_URL}/api/${rol}/prospecto/${cliente.id || cliente._id}/historial-completo`,
                { headers: getAuthHeaders() }
            );
            setTimeline(res.data.timeline || []);
        } catch (error) {
            console.error('Error al cargar historial:', error);
            setTimeline([]);
        } finally {
            setLoadingTimeline(false);
        }
    };

    const handleVerDetalles = async (cliente) => {
        setProspectoSeleccionado(cliente);
        setLlamadaFlow(null);
        await cargarTimelineCliente(cliente);
    };

    const registrarActividadCliente = async (payload) => {
        if (!prospectoSeleccionado) return;

        const rol = getRolePath();
        const clienteId = prospectoSeleccionado.id || prospectoSeleccionado._id;

        if (payload.tipo === 'llamada' && prospectoSeleccionado.proximaLlamada) {
            await axios.put(
                `${API_URL}/api/${rol}/prospectos/${clienteId}`,
                { proximaLlamada: null },
                { headers: getAuthHeaders() }
            );
        }

        await axios.post(
            `${API_URL}/api/${rol}/registrar-actividad`,
            { clienteId, ...payload },
            { headers: getAuthHeaders() }
        );

        await cargarTimelineCliente(prospectoSeleccionado);
        const lista = await cargarClientes();
        const actualizado = lista.find((c) => String(c.id || c._id) === String(clienteId));
        if (actualizado) setProspectoSeleccionado(actualizado);
    };

    const handleDeleteActividad = async (actividadId) => {
        try {
            await axios.delete(
                `${API_URL}/api/actividades/${actividadId}`,
                { headers: getAuthHeaders() }
            );
            setTimeline(prev => prev.filter(item => item.id !== actividadId));
        } catch (error) {
            console.error('Error al eliminar actividad:', error);
            alert('No se pudo eliminar la actividad.');
        }
    };

    const handleEliminarCliente = async () => {
        if (!clienteAEliminar) return;
        setEliminando(true);
        try {
            await axios.delete(
                `${API_URL}/api/clientes/${clienteAEliminar.id || clienteAEliminar._id}`,
                { headers: getAuthHeaders() }
            );
            setClientes(prev => prev.filter(c => (c.id || c._id) !== (clienteAEliminar.id || clienteAEliminar._id)));
            setClienteAEliminar(null);
        } catch (error) {
            console.error('Error al eliminar cliente:', error);
            alert(error.response?.data?.mensaje || 'No se pudo eliminar el cliente.');
        } finally {
            setEliminando(false);
        }
    };

    const escapeCsv = (value) => {
        const safe = String(value ?? '').replace(/"/g, '""');
        return `"${safe}"`;
    };

    const parseCsvLine = (line) => {
        const values = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i += 1) {
            const char = line[i];
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i += 1;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                values.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current);

        return values.map((item) => item.trim());
    };

    const exportarClientesCsv = () => {
        if (!clientesFiltrados.length) {
            alert('No hay clientes para exportar.');
            return;
        }

        const headers = [
            'nombres',
            'apellidoPaterno',
            'apellidoMaterno',
            'telefono',
            'correo',
            'empresa',
            'estado',
            'etapaEmbudo',
            'fechaUltimaEtapa'
        ];

        const rows = clientesFiltrados.map((cliente) => ([
            cliente.nombres,
            cliente.apellidoPaterno,
            cliente.apellidoMaterno,
            cliente.telefono,
            cliente.correo,
            cliente.empresa,
            cliente.estado,
            cliente.etapaEmbudo,
            cliente.fechaUltimaEtapa
        ].map(escapeCsv).join(',')));

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const dateStamp = new Date().toISOString().slice(0, 10);

        link.href = url;
        link.setAttribute('download', `clientes_${dateStamp}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleImportarClientes = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';

        if (!file) return;

        setImportando(true);
        try {
            const text = await file.text();
            const lines = text
                .split(/\r?\n/)
                .map((line) => line.trim())
                .filter(Boolean);

            if (lines.length < 2) {
                alert('El archivo CSV no tiene filas de datos.');
                return;
            }

            const headers = parseCsvLine(lines[0]);
            const requiredHeaders = ['nombres', 'apellidoPaterno', 'telefono', 'correo'];
            const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));
            if (missingHeaders.length) {
                alert(`Faltan columnas requeridas: ${missingHeaders.join(', ')}`);
                return;
            }

            const toPayload = (rowLine) => {
                const values = parseCsvLine(rowLine);
                const row = headers.reduce((acc, key, index) => {
                    acc[key] = values[index] ?? '';
                    return acc;
                }, {});

                return {
                    nombres: row.nombres,
                    apellidoPaterno: row.apellidoPaterno,
                    apellidoMaterno: row.apellidoMaterno || '',
                    telefono: row.telefono,
                    correo: row.correo,
                    empresa: row.empresa || '',
                    estado: row.estado || 'proceso',
                    etapaEmbudo: row.etapaEmbudo || 'prospecto_nuevo'
                };
            };

            const payloads = lines.slice(1).map(toPayload).filter((row) => (
                row.nombres && row.apellidoPaterno && row.telefono && row.correo
            ));

            if (!payloads.length) {
                alert('No se encontraron filas validas para importar.');
                return;
            }

            const results = await Promise.allSettled(
                payloads.map((payload) => axios.post(`${API_URL}/api/clientes`, payload, { headers: getAuthHeaders() }))
            );

            const creados = results.filter((r) => r.status === 'fulfilled').length;
            const fallidos = results.length - creados;

            await cargarClientes();
            alert(`Importacion finalizada. Creados: ${creados}. Fallidos: ${fallidos}.`);
        } catch (error) {
            console.error('Error al importar clientes:', error);
            alert(error.response?.data?.mensaje || 'No se pudo importar el archivo CSV.');
        } finally {
            setImportando(false);
        }
    };

    const handleCrearCliente = async () => {
        if (!formCliente.nombreCompleto || !formCliente.telefono || !formCliente.correo) {
            alert('Complete los campos requeridos: nombre completo, teléfono y correo.');
            return;
        }

        const partesNombre = formCliente.nombreCompleto.trim().split(/\s+/).filter(Boolean);
        const nombres = partesNombre[0] || '';
        const restoApellidos = partesNombre.slice(1);
        const apellidoPaterno = restoApellidos[0] || '';
        const apellidoMaterno = restoApellidos.slice(1).join(' ');

        setCreandoCliente(true);
        try {
            await axios.post(
                `${API_URL}/api/clientes`,
                {
                    nombres,
                    apellidoPaterno,
                    apellidoMaterno,
                    telefono: formCliente.telefono,
                    correo: formCliente.correo,
                    empresa: formCliente.empresa,
                    estado: 'ganado',
                    etapaEmbudo: 'venta_ganada'
                },
                { headers: getAuthHeaders() }
            );
            await cargarClientes();
            setMostrarModalCrear(false);
            setFormCliente({
                nombreCompleto: '',
                telefono: '',
                correo: '',
                empresa: ''
            });
            alert('Cliente creado exitosamente.');
        } catch (error) {
            console.error('Error al crear cliente:', error);
            alert(error.response?.data?.mensaje || 'No se pudo crear el cliente.');
        } finally {
            setCreandoCliente(false);
        }
    };

    const clientesFiltrados = useMemo(() => {
        return clientes.filter((cliente) => {
            const matchBusqueda =
                busqueda === '' ||
                (cliente.nombres || '').toLowerCase().includes(busqueda.toLowerCase()) ||
                (cliente.apellidoPaterno || '').toLowerCase().includes(busqueda.toLowerCase()) ||
                (cliente.empresa || '').toLowerCase().includes(busqueda.toLowerCase()) ||
                (cliente.correo || '').toLowerCase().includes(busqueda.toLowerCase()) ||
                (cliente.telefono || '').includes(busqueda);
            
            if (filtro === 'con_recordatorio') {
                return matchBusqueda && !!cliente.proximaLlamada;
            }
            if (filtro === 'sin_recordatorio') {
                return matchBusqueda && !cliente.proximaLlamada;
            }
            return matchBusqueda;
        });
    }, [clientes, busqueda, filtro]);

    // VISTA DETALLADA
    if (prospectoSeleccionado) {
        return (
            <div className="min-h-screen bg-slate-50 p-6">
                <div className="max-w-full mx-auto space-y-6">
                    <button
                        onClick={() => setProspectoSeleccionado(null)}
                        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-medium"
                    >
                        <ArrowLeft className="w-5 h-5" /> Regresar a la lista
                    </button>

                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-(--theme-100) rounded-full flex items-center justify-center text-(--theme-600)">
                                    <User className="w-8 h-8" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-slate-900">
                                        {prospectoSeleccionado.nombres} {prospectoSeleccionado.apellidoPaterno}
                                    </h1>
                                    <p className="text-slate-500">{prospectoSeleccionado.empresa || 'Sin empresa'}</p>
                                    <div className="flex gap-4 mt-2 text-sm text-slate-500">
                                        <span>📞 {prospectoSeleccionado.telefono || '—'}</span>
                                        <span>📧 {prospectoSeleccionado.correo || '—'}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-(--theme-100) text-(--theme-800)">
                                    ✓ Cliente Ganado
                                </span>
                                <p className="text-xs text-slate-400 mt-2">
                                    ID: {prospectoSeleccionado.id || prospectoSeleccionado._id}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-900">Seguimiento del Cliente</h2>
                            {prospectoSeleccionado.proximaLlamada && (
                                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                                    Próxima llamada: {new Date(prospectoSeleccionado.proximaLlamada).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                                </span>
                            )}
                        </div>
                        <div className="p-6">
                            {!llamadaFlow && (
                                <div className="space-y-3">
                                    <p className="text-sm text-slate-600">Registra la llamada de seguimiento con el mismo flujo de prospectos.</p>
                                    <div className="flex flex-wrap gap-3">
                                        <button
                                            onClick={() => setLlamadaFlow({
                                                paso: 'inicial',
                                                fechaProxima: prospectoSeleccionado.proximaLlamada ? String(prospectoSeleccionado.proximaLlamada).slice(0, 16) : '',
                                                notas: ''
                                            })}
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-(--theme-600) text-white rounded-lg font-semibold hover:bg-(--theme-700)"
                                        >
                                            <Phone className="w-4 h-4" />
                                            Iniciar flujo de llamada
                                        </button>
                                    </div>
                                </div>
                            )}

                            {llamadaFlow && (
                                <div className="space-y-4 border border-slate-200 rounded-xl p-4 bg-slate-50">
                                    {llamadaFlow.paso === 'inicial' && (
                                        <div className="space-y-3">
                                            <p className="font-semibold text-slate-800">¿El cliente contestó la llamada?</p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                <button
                                                    onClick={() => setLlamadaFlow((f) => ({ ...f, paso: 'contesto' }))}
                                                    className="py-2.5 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700"
                                                >
                                                    Sí, contestó
                                                </button>
                                                <button
                                                    onClick={() => setLlamadaFlow((f) => ({ ...f, paso: 'reintento' }))}
                                                    className="py-2.5 bg-rose-600 text-white rounded-lg font-bold hover:bg-rose-700"
                                                >
                                                    No contestó
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {llamadaFlow.paso === 'contesto' && (
                                        <div className="space-y-3">
                                            <p className="font-semibold text-slate-800">¿Cómo respondió el cliente?</p>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                <button
                                                    onClick={() => setLlamadaFlow((f) => ({ ...f, paso: 'llamarDespues' }))}
                                                    className="py-2.5 bg-(--theme-600) text-white rounded-lg font-bold hover:bg-(--theme-700)"
                                                >
                                                    Llamar después
                                                </button>
                                                <button
                                                    onClick={() => setLlamadaFlow((f) => ({ ...f, paso: 'whatsapp' }))}
                                                    className="py-2.5 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 inline-flex items-center justify-center gap-1"
                                                >
                                                    <MessageCircle className="w-4 h-4" /> WhatsApp/Correo
                                                </button>
                                                <button
                                                    onClick={() => setLlamadaFlow((f) => ({ ...f, paso: 'sin_interes' }))}
                                                    className="py-2.5 bg-gray-500 text-white rounded-lg font-bold hover:bg-gray-600"
                                                >
                                                    Sin interés
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {llamadaFlow.paso === 'reintento' && (
                                        <div className="space-y-3">
                                            <p className="font-semibold text-rose-700">No contestó. Programa reintento:</p>
                                            <TimeWheelPicker
                                                value={llamadaFlow.fechaProxima}
                                                onChange={(val) => setLlamadaFlow((f) => ({ ...f, fechaProxima: val }))}
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            setGuardandoSeguimiento(true);
                                                            const rol = getRolePath();
                                                            const clienteId = prospectoSeleccionado.id || prospectoSeleccionado._id;
                                                            if (llamadaFlow.fechaProxima) {
                                                                await axios.put(
                                                                    `${API_URL}/api/${rol}/prospectos/${clienteId}`,
                                                                    { proximaLlamada: llamadaFlow.fechaProxima },
                                                                    { headers: getAuthHeaders() }
                                                                );
                                                            }
                                                            const lista = await cargarClientes();
                                                            const actualizado = lista.find((c) => String(c.id || c._id) === String(clienteId));
                                                            if (actualizado) setProspectoSeleccionado(actualizado);
                                                            toast.success('Reintento programado');
                                                            setLlamadaFlow(null);
                                                        } catch {
                                                            toast.error('Error al programar reintento');
                                                        } finally {
                                                            setGuardandoSeguimiento(false);
                                                        }
                                                    }}
                                                    disabled={guardandoSeguimiento}
                                                    className="flex-1 py-2 bg-rose-600 text-white rounded-lg font-bold hover:bg-rose-700 disabled:opacity-50"
                                                >
                                                    Programar reintento
                                                </button>
                                                <button
                                                    onClick={() => setLlamadaFlow(null)}
                                                    className="px-4 py-2 border border-slate-200 text-gray-600 rounded-lg hover:bg-slate-50"
                                                >
                                                    Cancelar
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {llamadaFlow.paso === 'whatsapp' && (
                                        <div className="space-y-3">
                                            <p className="font-semibold text-green-700">Añadir nota para WhatsApp/Correo</p>
                                            <textarea
                                                rows={2}
                                                value={llamadaFlow.notas || ''}
                                                onChange={(e) => setLlamadaFlow((f) => ({ ...f, notas: e.target.value }))}
                                                placeholder="Ej: Enviar cotización por correo en la tarde"
                                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-400"
                                            />
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        setGuardandoSeguimiento(true);
                                                        const notaFinal = llamadaFlow.notas
                                                            ? `Prefiere atención por WhatsApp o correo - ${llamadaFlow.notas}`
                                                            : 'Prefiere atención por WhatsApp o correo';
                                                        await registrarActividadCliente({ tipo: 'llamada', resultado: 'exitoso', notas: notaFinal });
                                                        toast.success('Interacción guardada');
                                                        setLlamadaFlow(null);
                                                    } catch {
                                                        toast.error('No se pudo guardar la interacción');
                                                    } finally {
                                                        setGuardandoSeguimiento(false);
                                                    }
                                                }}
                                                disabled={guardandoSeguimiento}
                                                className="w-full py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 disabled:opacity-50"
                                            >
                                                Guardar interacción
                                            </button>
                                        </div>
                                    )}

                                    {llamadaFlow.paso === 'sin_interes' && (
                                        <div className="space-y-3">
                                            <p className="font-semibold text-gray-700">Motivo de falta de interés</p>
                                            <textarea
                                                rows={2}
                                                value={llamadaFlow.notas || ''}
                                                onChange={(e) => setLlamadaFlow((f) => ({ ...f, notas: e.target.value }))}
                                                placeholder="Ej: Dice que por ahora no requiere servicio"
                                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-400"
                                            />
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        setGuardandoSeguimiento(true);
                                                        const notaFinal = llamadaFlow.notas
                                                            ? `Sin interés - ${llamadaFlow.notas}`
                                                            : 'Contestó, sin interés';
                                                        await registrarActividadCliente({ tipo: 'llamada', resultado: 'fallido', notas: notaFinal });
                                                        toast.success('Seguimiento guardado');
                                                        setLlamadaFlow(null);
                                                    } catch {
                                                        toast.error('No se pudo guardar el seguimiento');
                                                    } finally {
                                                        setGuardandoSeguimiento(false);
                                                    }
                                                }}
                                                disabled={guardandoSeguimiento}
                                                className="w-full py-2 bg-gray-500 text-white rounded-lg font-bold hover:bg-gray-600 disabled:opacity-50"
                                            >
                                                Guardar y cerrar
                                            </button>
                                        </div>
                                    )}

                                    {llamadaFlow.paso === 'llamarDespues' && (
                                        <div className="space-y-3">
                                            <p className="font-semibold text-(--theme-700)">¿Cuándo le llamamos?</p>
                                            <TimeWheelPicker
                                                value={llamadaFlow.fechaProxima}
                                                onChange={(val) => setLlamadaFlow((f) => ({ ...f, fechaProxima: val }))}
                                            />
                                            <textarea
                                                rows={2}
                                                value={llamadaFlow.notas || ''}
                                                onChange={(e) => setLlamadaFlow((f) => ({ ...f, notas: e.target.value }))}
                                                placeholder="Notas de la llamada..."
                                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-(--theme-400)"
                                            />
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        setGuardandoSeguimiento(true);
                                                        const clienteId = prospectoSeleccionado.id || prospectoSeleccionado._id;
                                                        const notasFin = llamadaFlow.notas || 'Interesado, llamar después';

                                                        await registrarActividadCliente({
                                                            tipo: 'llamada',
                                                            resultado: 'exitoso',
                                                            notas: notasFin
                                                        });

                                                        if (llamadaFlow.fechaProxima) {
                                                            await axios.post(
                                                                `${API_URL}/api/tareas`,
                                                                {
                                                                    titulo: `Llamada de seguimiento: ${prospectoSeleccionado.nombres || ''}`.trim(),
                                                                    descripcion: notasFin,
                                                                    cliente: clienteId,
                                                                    fechaLimite: llamadaFlow.fechaProxima,
                                                                    prioridad: 'media'
                                                                },
                                                                { headers: getAuthHeaders() }
                                                            );

                                                            const rol = getRolePath();
                                                            await axios.put(
                                                                `${API_URL}/api/${rol}/prospectos/${clienteId}`,
                                                                { proximaLlamada: llamadaFlow.fechaProxima },
                                                                { headers: getAuthHeaders() }
                                                            );
                                                        }

                                                        const lista = await cargarClientes();
                                                        const actualizado = lista.find((c) => String(c.id || c._id) === String(clienteId));
                                                        if (actualizado) setProspectoSeleccionado(actualizado);

                                                        toast.success('Seguimiento guardado correctamente');
                                                        setLlamadaFlow(null);
                                                    } catch (error) {
                                                        console.error(error);
                                                        toast.error('Error al guardar el seguimiento');
                                                    } finally {
                                                        setGuardandoSeguimiento(false);
                                                    }
                                                }}
                                                disabled={guardandoSeguimiento}
                                                className="w-full py-2 bg-(--theme-600) text-white rounded-lg font-bold hover:bg-(--theme-700) disabled:opacity-50 inline-flex items-center justify-center gap-2"
                                            >
                                                <Calendar className="w-4 h-4" />
                                                Guardar seguimiento
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <History className="w-5 h-5 text-(--theme-500)" /> Historial de Acciones
                            </h2>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRole() === 'prospector'
                                    ? 'bg-(--theme-100) text-(--theme-700)'
                                    : 'bg-purple-100 text-purple-700'
                                }`}>
                                {getRole() === 'prospector' ? '🎯 Vista Prospector' : '🏁 Vista Closer'}
                            </span>
                        </div>
                        <div className="p-6">
                            {loadingTimeline ? (
                                <div className="text-center py-10">
                                    <RefreshCw className="w-8 h-8 text-(--theme-500) animate-spin mx-auto mb-2" />
                                    <p className="text-slate-500">Cargando historial...</p>
                                </div>
                            ) : (
                                <HistorialInteracciones
                                    timeline={timeline}
                                    esProspector={getRole() === 'prospector'}
                                    onDeleteActividad={handleDeleteActividad}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-full mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {esMenuSeguimiento ? 'Seguimiento de Clientes' : 'Clientes'}
                        </h1>
                        <p className="text-gray-500">
                            {esMenuSeguimiento
                                ? 'Gestiona y da seguimiento a tu cartera de clientes ganados.'
                                : 'Cartera de clientes ganados.'}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv,text/csv"
                            className="hidden"
                            onChange={handleImportarClientes}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={importando}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                        >
                            {importando ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            {importando ? 'Importando...' : 'Importar CSV'}
                        </button>
                        <button
                            onClick={exportarClientesCsv}
                            disabled={loading || !clientesFiltrados.length}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            Exportar CSV
                        </button>
                        <button
                            onClick={() => setMostrarModalCrear(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-(--theme-600) text-white rounded-lg hover:bg-(--theme-700) transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Crear Cliente
                        </button>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm mb-6">
                    <div className="grid grid-cols-1 lg:grid-cols-[30%_1fr] gap-4 items-center">
                        <div className="relative w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar clientes por nombre, empresa, teléfono..."
                                value={busqueda}
                                onChange={(event) => setBusqueda(event.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-(--theme-500)/20 focus:border-(--theme-500) text-sm"
                            />
                        </div>
                        <div className="flex flex-wrap gap-2 items-center w-full">
                            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                            <div className="flex flex-wrap gap-1.5">
                                {[
                                    { value: 'todos', label: 'Todos' },
                                    { value: 'con_recordatorio', label: 'Con recordatorio' },
                                    { value: 'sin_recordatorio', label: 'Sin recordatorio' },
                                ].map(btn => (
                                    <button
                                        key={btn.value}
                                        onClick={() => setFiltro(btn.value)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all whitespace-nowrap ${filtro === btn.value
                                            ? 'bg-(--theme-600) text-white border-(--theme-600) shadow-sm'
                                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-(--theme-400) hover:text-(--theme-700)'
                                            }`}
                                    >
                                        {btn.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    {/* Contador de resultados */}
                    <p className="text-xs text-slate-400 mt-2">
                        Mostrando <span className="font-semibold text-slate-600">{clientesFiltrados.length}</span> de <span className="font-semibold text-slate-600">{clientes.length}</span> clientes
                    </p>
                </div>

                {loading ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
                        <RefreshCw className="w-8 h-8 text-(--theme-500) animate-spin mx-auto mb-4" />
                        <p className="text-gray-500">Cargando clientes...</p>
                    </div>
                ) : clientesFiltrados.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-gray-500">
                        No hay clientes registrados aún.
                    </div>
                ) : (
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr>
                                        <th className="px-4 py-3 text-left font-semibold">Cliente</th>
                                        <th className="px-4 py-3 text-left font-semibold">Empresa</th>
                                        <th className="px-4 py-3 text-left font-semibold">Contacto</th>
                                        <th className="px-4 py-3 text-center font-semibold text-xs uppercase tracking-wider">Etapa</th>
                                        <th className="px-4 py-3 text-left font-semibold">Última interacción</th>
                                        <th className="px-4 py-3 text-left font-semibold">Recordatorio</th>
                                        <th className="px-4 py-3 text-center font-semibold">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {clientesFiltrados.map((cliente) => (
                                        <tr key={cliente._id || cliente.id} className="hover:bg-slate-50/70 transition-colors cursor-pointer" onClick={() => handleVerDetalles(cliente)}>
                                            <td className="px-4 py-3 text-left">
                                                <div className="flex flex-col">
                                                    <p className="font-medium text-gray-900 leading-tight">
                                                        {cliente.nombres} {cliente.apellidoPaterno}
                                                    </p>
                                                    <div className="flex items-center gap-0.5 text-yellow-500 scale-75 origin-left mt-0.5">
                                                        {[1, 2, 3, 4, 5].map((val) => (
                                                            <Star key={val} className="w-3.5 h-3.5 fill-yellow-400" />
                                                        ))}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 text-sm whitespace-nowrap">{cliente.empresa || '—'}</td>
                                            <td className="px-4 py-3">
                                                <div className="space-y-0.5">
                                                    {cliente.telefono ? (
                                                        <p className="flex items-center gap-1.5 text-gray-700 text-sm font-medium">
                                                            <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                            {cliente.telefono}
                                                        </p>
                                                    ) : null}
                                                    {cliente.correo ? (
                                                        <p className="flex items-center gap-1.5 text-gray-500 text-sm">
                                                            <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                            <span>{cliente.correo}</span>
                                                        </p>
                                                    ) : null}
                                                    {!cliente.telefono && !cliente.correo && (
                                                        <span className="text-xs text-slate-400 italic">Sin contacto</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-(--theme-100) text-(--theme-600)">
                                                    Venta Ganada
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 max-w-[200px]">
                                                {cliente.ultimaActTipo ? (
                                                    <div className="flex items-start gap-1.5">
                                                        <div className="mt-0.5 shrink-0">
                                                            {cliente.ultimaActTipo === 'llamada' && <Phone className="w-3 h-3 text-(--theme-500)" />}
                                                            {cliente.ultimaActTipo === 'whatsapp' && <MessageSquare className="w-3 h-3 text-green-500" />}
                                                            {cliente.ultimaActTipo === 'correo' && <Mail className="w-3 h-3 text-purple-500" />}
                                                            {cliente.ultimaActTipo === 'cita' && <Calendar className="w-3 h-3 text-(--theme-500)" />}
                                                            {!['llamada', 'whatsapp', 'correo', 'cita'].includes(cliente.ultimaActTipo) && <Clock className="w-3 h-3 text-slate-400" />}
                                                        </div>
                                                        <p className="text-[11px] text-slate-600 leading-snug" title={cliente.ultimaActNotas || ''}>
                                                            {cliente.ultimaActNotas
                                                                ? (cliente.ultimaActNotas.length > 50 ? cliente.ultimaActNotas.slice(0, 50) + '…' : cliente.ultimaActNotas)
                                                                : <span className="italic text-slate-400">{cliente.ultimaActTipo}</span>}
                                                        </p>
                                                    </div>
                                                ) : cliente.fechaUltimaEtapa ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <Plus className="w-3 h-3 text-emerald-500" />
                                                        <span className="text-[11px] text-slate-500">
                                                            Ganado el {new Date(cliente.fechaUltimaEtapa).toLocaleDateString('es-MX')}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-300 italic">Sin historial</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {cliente.proximaLlamada ? (() => {
                                                    const esVencido = new Date(cliente.proximaLlamada) < new Date();
                                                    return (
                                                        <div className={`flex items-center gap-1.5 ${esVencido ? 'text-red-600' : 'text-(--theme-600)'}`}>
                                                            <div className={`w-2 h-2 rounded-full animate-pulse ${esVencido ? 'bg-red-500' : 'bg-(--theme-500)'}`}></div>
                                                            <span className="text-xs font-semibold">
                                                                {new Date(cliente.proximaLlamada).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                                                                {esVencido && ' ⚠'}
                                                            </span>
                                                            <Phone className="w-3 h-3" />
                                                        </div>
                                                    );
                                                })() : (
                                                    <span className="text-xs text-slate-400 italic">Sin pendiente</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-3">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleVerDetalles(cliente); }}
                                                        className="text-gray-400 hover:text-(--theme-600) transition-colors p-2 rounded-full hover:bg-(--theme-50)"
                                                        title="Ver Detalles / Historial"
                                                    >
                                                        <History className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setClienteAEliminar(cliente); }}
                                                        className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50"
                                                        title="Eliminar Cliente"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
        {/* Modal crear cliente */}
        {mostrarModalCrear && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-2xl p-6 shadow-xl max-w-xl w-full mx-4 border border-slate-200">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">Crear Cliente</h2>
                        <button
                            onClick={() => setMostrarModalCrear(false)}
                            className="text-slate-400 hover:text-slate-600"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre completo *</label>
                            <input
                                type="text"
                                value={formCliente.nombreCompleto}
                                onChange={(e) => setFormCliente({ ...formCliente, nombreCompleto: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-(--theme-500)/20 focus:border-(--theme-500)"
                                placeholder="Juan Pérez López"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Teléfono *</label>
                            <input
                                type="tel"
                                value={formCliente.telefono}
                                onChange={(e) => setFormCliente({ ...formCliente, telefono: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-(--theme-500)/20 focus:border-(--theme-500)"
                                placeholder="555-123-4567"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Correo *</label>
                            <input
                                type="email"
                                value={formCliente.correo}
                                onChange={(e) => setFormCliente({ ...formCliente, correo: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-(--theme-500)/20 focus:border-(--theme-500)"
                                placeholder="juan@empresa.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Empresa</label>
                            <input
                                type="text"
                                value={formCliente.empresa}
                                onChange={(e) => setFormCliente({ ...formCliente, empresa: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-(--theme-500)/20 focus:border-(--theme-500)"
                                placeholder="Mi Empresa S.A."
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 justify-end">
                        <button
                            onClick={() => setMostrarModalCrear(false)}
                            disabled={creandoCliente}
                            className="px-6 py-2 rounded-lg bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleCrearCliente}
                            disabled={creandoCliente}
                            className="px-6 py-2 rounded-lg bg-(--theme-600) text-white font-semibold hover:bg-(--theme-700) transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {creandoCliente ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    Creando...
                                </>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4" />
                                    Crear Cliente
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Modal confirmación eliminar */}
        {clienteAEliminar && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-2xl p-6 shadow-xl max-w-md w-full mx-4 border border-red-100">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                            <Trash2 className="w-5 h-5 text-red-600" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900">Eliminar cliente</h2>
                    </div>
                    <p className="text-gray-600 mb-6">
                        ¿Estás seguro de eliminar a <strong>{clienteAEliminar.nombres} {clienteAEliminar.apellidoPaterno}</strong>? Esta acción no se puede deshacer.
                    </p>
                    <div className="flex gap-3 justify-end">
                        <button
                            onClick={() => setClienteAEliminar(null)}
                            disabled={eliminando}
                            className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleEliminarCliente}
                            disabled={eliminando}
                            className="px-4 py-2 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {eliminando ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            {eliminando ? 'Eliminando...' : 'Sí, eliminar'}
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
};

export default CRMClientes;
