import React, { useMemo, useState, useEffect } from 'react';
import { Search, Filter, Star, Plus, X, RefreshCw, ChevronRight, ArrowLeft, User, History, Trash2, AlertTriangle, Download, Upload } from 'lucide-react';
import axios from 'axios';
import { getToken, decodeRole } from '../../utils/authUtils';
import { loadProspectos, saveProspectos } from '../../utils/prospectosStore';
import { HistorialInteracciones } from '../../components/HistorialInteracciones';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';

import API_URL from '../../config/api';

// --- CSV helpers ---
const CSV_HEADERS = ['nombres', 'apellidoPaterno', 'apellidoMaterno', 'telefono', 'correo', 'empresa', 'sitioWeb', 'ubicacion', 'notas'];
const CSV_LABELS = ['Nombres', 'Apellido Paterno', 'Apellido Materno', 'Telefono', 'Correo', 'Empresa', 'Sitio Web', 'Ubicacion', 'Notas'];

function prospectosToCsv(prospectos) {
    const escape = (val) => {
        if (val == null) return '';
        const s = String(val).replace(/"/g, '""');
        return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
    };
    const rows = [CSV_LABELS.join(',')];
    for (const p of prospectos) rows.push(CSV_HEADERS.map(h => escape(p[h])).join(','));
    return rows.join('\n');
}

function parseCsvRow(row) {
    const cells = [];
    let cur = ''; let inQuote = false;
    for (let i = 0; i < row.length; i++) {
        const ch = row[i];
        if (ch === '"') { if (inQuote && row[i + 1] === '"') { cur += '"'; i++; } else inQuote = !inQuote; }
        else if (ch === ',' && !inQuote) { cells.push(cur.trim()); cur = ''; }
        else cur += ch;
    }
    cells.push(cur.trim());
    return cells;
}

function csvToProspectos(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return { data: [], errors: ['El CSV está vacío o solo tiene encabezados.'] };
    const header = parseCsvRow(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, ''));
    const colMap = {
        nombres: ['nombres', 'nombre'], apellidoPaterno: ['apellidopaterno', 'apellido'],
        apellidoMaterno: ['apellidomaterno'], telefono: ['telefono', 'tel', 'phone'],
        correo: ['correo', 'email', 'mail'], empresa: ['empresa', 'company'],
        sitioWeb: ['sitioweb', 'web', 'website'], ubicacion: ['ubicacion', 'ubicación', 'ciudad', 'direccion'],
        notas: ['notas', 'nota', 'notes', 'comentarios'],
    };
    const colIndex = {};
    for (const [field, aliases] of Object.entries(colMap)) {
        for (const alias of aliases) { const idx = header.indexOf(alias); if (idx !== -1) { colIndex[field] = idx; break; } }
    }
    const errors = []; const data = [];
    for (let i = 1; i < lines.length; i++) {
        const cells = parseCsvRow(lines[i]);
        const row = {};
        let hasData = false;
        for (const [field, idx] of Object.entries(colIndex)) {
            row[field] = cells[idx] || '';
            if (row[field]) hasData = true;
        }
        if (hasData) data.push(row);
    }
    if (data.length === 0) errors.push("No se encontraron registros válidos o las columnas no coinciden con los formatos esperados.");
    return { data, errors };
}

const Directorio = () => {
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [clienteAEliminar, setClienteAEliminar] = useState(null);
    const [eliminando, setEliminando] = useState(false);

    // Estados para CSV
    const [isImportModalAbierto, setIsImportModalAbierto] = useState(false);
    const [fileToImport, setFileToImport] = useState(null);
    const [csvErrors, setCsvErrors] = useState([]);
    const [importandoCsv, setImportandoCsv] = useState(false);

    // Estados para la vista detallada
    const [prospectoSeleccionado, setProspectoSeleccionado] = useState(null);
    const [timeline, setTimeline] = useState([]);
    const [loadingTimeline, setLoadingTimeline] = useState(false);

    const getAuthHeaders = () => ({
        'x-auth-token': getToken() || ''
    });

    const role = decodeRole();

    const cargarClientes = async () => {
        setLoading(true);
        try {
            // Unificado: Usar /api/clientes para todos, o /clientes-ganados específico si es prospector/closer
            // Dado que el admin/doctor necesita ver todos, usamos /api/clientes?estado=ganado
            let endpoint = `${API_URL}/api/clientes?estado=ganado`;
            
            if (role === 'prospector' || role === 'closer') {
                 endpoint = `${API_URL}/api/${role}/clientes-ganados`;
            }

            const res = await axios.get(endpoint, { headers: getAuthHeaders() });
            setClientes(res.data || []);
        } catch (error) {
            console.error('Error al cargar clientes:', error);
            setClientes([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarClientes();
        const interval = setInterval(cargarClientes, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const handleVerDetalles = async (cliente) => {
        setProspectoSeleccionado(cliente);
        setLoadingTimeline(true);
        try {
            const rolePath = role === 'closer' ? 'closer' : 'prospector'; // fallback endpoints
            const res = await axios.get(
                `${API_URL}/api/${rolePath}/prospecto/${cliente.id || cliente._id}/historial-completo`,
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

    const handleExportCsv = () => {
        if (clientes.length === 0) {
            toast.error('No hay clientes para exportar.');
            return;
        }
        const csvStr = prospectosToCsv(clientesFiltrados.length > 0 ? clientesFiltrados : clientes);
        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvStr], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `directorio_clientes_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success('CSV exportado correctamente.');
    };

    const resetImportModal = () => {
        setIsImportModalAbierto(false);
        setFileToImport(null);
        setCsvErrors([]);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setCsvErrors([]);
        if (!file) return;
        if (!file.name.endsWith('.csv')) {
            setCsvErrors(['El archivo debe ser un .csv']);
            return;
        }
        setFileToImport(file);
    };

    const handleImportCSV = async () => {
        setCsvErrors([]);
        if (!fileToImport) { setCsvErrors(['Selecciona un archivo primero.']); return; }
        setImportandoCsv(true);

        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target.result;
            const resData = csvToProspectos(text);
            if (resData.errors.length > 0) {
                setCsvErrors(resData.errors);
                setImportandoCsv(false);
                return;
            }
            if (resData.data.length === 0) {
                setCsvErrors(['No se detectaron clientes válidos en el archivo.']);
                setImportandoCsv(false);
                return;
            }

            try {
                // Enviar al backend
                const rolePath = role === 'closer' ? 'closer' : 'prospector';
                const response = await axios.post(`${API_URL}/api/${rolePath}/importar-csv`, {
                    prospectos: resData.data,
                    etapaEmbudo: 'venta_ganada' // Insertar directamente como ganados
                }, { headers: getAuthHeaders() });

                toast.success(`Importación exitosa. ${response.data.insertados || 0} agregados, ${response.data.duplicados || 0} duplicados ignorados.`);
                resetImportModal();
                cargarClientes();
            } catch (error) {
                console.error('Error importando:', error);
                setCsvErrors([error.response?.data?.msg || 'Error de servidor al importar']);
                toast.error('Error al importar CSV');
            } finally {
                setImportandoCsv(false);
            }
        };
        reader.onerror = () => {
            setCsvErrors(['No se pudo leer el archivo localmente.']);
            setImportandoCsv(false);
        };
        reader.readAsText(fileToImport);
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
            return matchBusqueda;
        });
    }, [clientes, busqueda]);

    // VISTA DETALLADA
    if (prospectoSeleccionado) {
        return (
            <div className="min-h-screen bg-slate-50 p-6">
                <div className="max-w-[1000px] mx-auto space-y-6">
                    <button
                        onClick={() => setProspectoSeleccionado(null)}
                        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-medium"
                    >
                        <ArrowLeft className="w-5 h-5" /> Regresar a la lista
                    </button>

                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-900">
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
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-emerald-100 text-emerald-800">
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
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <History className="w-5 h-5 text-blue-800" /> Historial de Acciones
                            </h2>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${role === 'prospector'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-purple-100 text-purple-700'
                                }`}>
                                {role === 'prospector' ? '🎯 Vista Prospector' : (role === 'closer' ? '🏁 Vista Closer' : '🏢 Vista Global')}
                            </span>
                        </div>
                        <div className="p-6">
                            {loadingTimeline ? (
                                <div className="text-center py-10">
                                    <RefreshCw className="w-8 h-8 text-blue-800 animate-spin mx-auto mb-2" />
                                    <p className="text-slate-500">Cargando historial...</p>
                                </div>
                            ) : (
                                <HistorialInteracciones
                                    timeline={timeline}
                                    esProspector={role === 'prospector' || role === 'admin'}
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
                <div className="max-w-[1400px] mx-auto">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
                            <p className="text-gray-500">Cartera de clientes ganados.</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <button onClick={handleExportCsv} className="flex items-center gap-2 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-2 rounded-lg font-medium shadow-sm transition-all" title="Exportar directorio a CSV">
                                <Download className="w-4 h-4" />
                                <span className="hidden sm:inline">Exportar CSV</span>
                            </button>
                            <button onClick={() => setIsImportModalAbierto(true)} className="flex items-center gap-2 bg-white hover:bg-amber-50 text-amber-700 border border-amber-200 px-4 py-2 rounded-lg font-medium shadow-sm transition-all" title="Importar clientes desde CSV">
                                <Upload className="w-4 h-4" />
                                <span className="hidden sm:inline">Importar CSV</span>
                            </button>
                            <button
                                onClick={cargarClientes}
                                disabled={loading}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-950 disabled:opacity-50 transition-colors"
                            >
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                Actualizar
                            </button>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm mb-6">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar clientes por nombre, empresa, teléfono..."
                                value={busqueda}
                                onChange={(event) => setBusqueda(event.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800"
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="rounded-2xl p-10 text-center">
                            <RefreshCw className="w-8 h-8 text-blue-800 animate-spin mx-auto mb-4" />
                            <p className="text-gray-500">Cargando clientes...</p>
                        </div>
                    ) : clientesFiltrados.length === 0 ? (
                        <div className="rounded-2xl p-10 text-center text-gray-500">
                            No hay clientes registrados aún.
                        </div>
                    ) : (
                        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-slate-100/70 text-slate-500 uppercase">
                                        <tr>
                                            <th className="px-4 py-3 text-left">Nombre</th>
                                            <th className="px-4 py-3 text-left">Empresa</th>
                                            <th className="px-4 py-3 text-left">Teléfono</th>
                                            <th className="px-4 py-3 text-left">Correo</th>
                                            <th className="px-4 py-3 text-left">Convertido el</th>
                                            <th className="px-4 py-3 text-center">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {clientesFiltrados.map((cliente) => (
                                            <tr key={cliente._id || cliente.id} className="hover:bg-slate-50/70 transition-colors">
                                                <td className="px-4 py-3 font-medium text-gray-900">
                                                    {cliente.nombres} {cliente.apellidoPaterno}
                                                </td>
                                                <td className="px-4 py-3 text-gray-600">{cliente.empresa || '—'}</td>
                                                <td className="px-4 py-3 text-gray-600">{cliente.telefono || '—'}</td>
                                                <td className="px-4 py-3 text-blue-900">{cliente.correo || '—'}</td>
                                                <td className="px-4 py-3 text-gray-600">
                                                    {cliente.fechaUltimaEtapa
                                                        ? new Date(cliente.fechaUltimaEtapa).toLocaleDateString('es-MX')
                                                        : '—'
                                                    }
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => handleVerDetalles(cliente)}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                                                        >
                                                            <History className="w-4 h-4" />
                                                            Ver Detalles
                                                            <ChevronRight className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setClienteAEliminar(cliente)}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium"
                                                            title="Eliminar cliente"
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

            {/* Modal Importar CSV */}
            <Modal isOpen={isImportModalAbierto} onClose={resetImportModal} title="Importar Clientes desde CSV">
                <div className="space-y-6">
                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                <h3 className="font-semibold text-amber-800 mb-2">Instrucciones de Importación</h3>
                                <p className="text-sm text-amber-900/80 mb-2">
                                    Los clientes importados aquí se agregarán directamente como <strong>clientes ganados</strong> en el directorio.
                                </p>
                                <p className="font-semibold mb-1 text-sm text-amber-900 text-sm">Formato esperado del CSV:</p>
                                <code className="text-xs bg-white px-2 py-1 rounded border border-amber-200 block overflow-x-auto whitespace-nowrap text-amber-900">
                                    {CSV_HEADERS.join(',')}
                                </code>
                                <p className="mt-2 text-amber-700 text-xs">Todos los campos son opcionales. Los datos se importarán tal como estén en el CSV.</p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Seleccionar archivo CSV</label>
                        <div className="relative">
                            <input
                                type="file"
                                accept=".csv"
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${fileToImport ? 'border-amber-300 bg-amber-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'}`}>
                                <Upload className={`w-8 h-8 mx-auto mb-3 ${fileToImport ? 'text-amber-500' : 'text-slate-400'}`} />
                                {fileToImport ? (
                                    <div>
                                        <p className="font-semibold text-amber-800">{fileToImport.name}</p>
                                        <p className="text-amber-600 text-sm mt-1">{(fileToImport.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                ) : (
                                    <div>
                                        <p className="font-semibold text-slate-600">Arrastra un CSV aquí o haz clic para seleccionar</p>
                                        <p className="text-slate-400 text-sm mt-1">Solo archivos .csv</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {csvErrors.length > 0 && (
                        <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm border border-red-100">
                            <p className="font-semibold mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Errores detectados:</p>
                            <ul className="list-disc pl-5 space-y-1">
                                {csvErrors.map((e, i) => <li key={i}>{e}</li>)}
                            </ul>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <button type="button" onClick={resetImportModal} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium">
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleImportCSV}
                            disabled={!fileToImport || importandoCsv || csvErrors.length > 0}
                            className="flex items-center gap-2 bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors font-medium shadow-sm"
                        >
                            {importandoCsv ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            {importandoCsv ? 'Importando...' : 'Importar Clientes'}
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default Directorio;
