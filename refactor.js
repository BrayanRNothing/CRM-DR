const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, 'src/pages/prospector/ProspectorSeguimiento.jsx');
let content = fs.readFileSync(srcPath, 'utf8');

// Add Edit2 import
content = content.replace(
    "import {",
    "import {\n    Edit2,"
);

// Add state for Editing
const stateToAdd = `
    const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
    const [prospectoAEditar, setProspectoAEditar] = useState({});
    const [loadingEditar, setLoadingEditar] = useState(false);

    const abrirModalEditar = (p) => {
        setProspectoAEditar({
            id: p._id || p.id,
            nombres: p.nombres || '',
            apellidoPaterno: p.apellidoPaterno || '',
            apellidoMaterno: p.apellidoMaterno || '',
            telefono: p.telefono || '',
            correo: p.correo || '',
            empresa: p.empresa || '',
            notas: p.notas || ''
        });
        setModalEditarAbierto(true);
    };

    const handleEditarProspecto = async () => {
        const { nombres, apellidoPaterno, telefono, correo } = prospectoAEditar;
        if (!nombres?.trim() || !apellidoPaterno?.trim() || !telefono?.trim() || !correo?.trim()) {
            toast.error('Nombres, apellido, teléfono y correo son requeridos');
            return;
        }
        setLoadingEditar(true);
        try {
            await axios.put(\`\${API_URL}/api/prospector/prospectos/\${prospectoAEditar.id}/editar\`, prospectoAEditar, {
                headers: getAuthHeaders()
            });
            toast.success('Prospecto actualizado');
            setModalEditarAbierto(false);
            cargarDatos();
            if (prospectoSeleccionado && (prospectoSeleccionado.id === prospectoAEditar.id || prospectoSeleccionado._id === prospectoAEditar.id)) {
                 cargarDatos(); // Refresh list, will also clear selection or we can update it locally if needed, but simple is just re-fetch
            }
        } catch (error) {
            toast.error(error.response?.data?.msg || 'Error al actualizar');
        } finally {
            setLoadingEditar(false);
        }
    };
`;

content = content.replace(
    "const [formCrear, setFormCrear] = useState({",
    stateToAdd + "\n    const [formCrear, setFormCrear] = useState({"
);

// Add the rendering of edit modal to renderModales
const editModal = `
            {/* Modal Editar Prospecto */}
            {modalEditarAbierto && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Editar prospecto</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombres *</label>
                                    <input
                                        type="text"
                                        value={prospectoAEditar.nombres}
                                        onChange={(e) => setProspectoAEditar((f) => ({ ...f, nombres: e.target.value }))}
                                        className="w-full border border-slate-200 rounded-lg px-4 py-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Apellido paterno *</label>
                                    <input
                                        type="text"
                                        value={prospectoAEditar.apellidoPaterno}
                                        onChange={(e) => setProspectoAEditar((f) => ({ ...f, apellidoPaterno: e.target.value }))}
                                        className="w-full border border-slate-200 rounded-lg px-4 py-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Apellido materno</label>
                                    <input
                                        type="text"
                                        value={prospectoAEditar.apellidoMaterno}
                                        onChange={(e) => setProspectoAEditar((f) => ({ ...f, apellidoMaterno: e.target.value }))}
                                        className="w-full border border-slate-200 rounded-lg px-4 py-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono *</label>
                                    <input
                                        type="tel"
                                        value={prospectoAEditar.telefono}
                                        onChange={(e) => setProspectoAEditar((f) => ({ ...f, telefono: e.target.value }))}
                                        className="w-full border border-slate-200 rounded-lg px-4 py-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Correo *</label>
                                    <input
                                        type="email"
                                        value={prospectoAEditar.correo}
                                        onChange={(e) => setProspectoAEditar((f) => ({ ...f, correo: e.target.value }))}
                                        className="w-full border border-slate-200 rounded-lg px-4 py-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
                                    <input
                                        type="text"
                                        value={prospectoAEditar.empresa}
                                        onChange={(e) => setProspectoAEditar((f) => ({ ...f, empresa: e.target.value }))}
                                        className="w-full border border-slate-200 rounded-lg px-4 py-2"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setModalEditarAbierto(false)}
                                    className="flex-1 px-4 py-2 border border-slate-200 text-gray-700 rounded-lg hover:bg-slate-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleEditarProspecto}
                                    disabled={loadingEditar}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {loadingEditar ? 'Guardando...' : 'Guardar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            `;

content = content.replace(
    "{/* Modal Crear Prospecto */}",
    editModal + "\n            {/* Modal Crear Prospecto */}"
);


// Replace the grid with a table
const oldGridRegex = /\{prospectosFiltrados\.length === 0 \? \([\s\S]*?\) : \([\s\S]*?<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">[\s\S]*?<\/div>\s*\)\}/;

const newTable = \`{prospectosFiltrados.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
                        <User className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-gray-500 font-medium">No se encontraron prospectos.</p>
                        <p className="text-gray-400 text-sm mt-1">Intenta con otra búsqueda o crea uno nuevo.</p>
                    </div>
                ) : (
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-slate-100/70 text-slate-600">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-semibold">Cliente</th>
                                        <th className="px-4 py-3 text-left font-semibold">Empresa</th>
                                        <th className="px-4 py-3 text-left font-semibold">Contacto</th>
                                        <th className="px-4 py-3 text-center font-semibold">Interés</th>
                                        <th className="px-4 py-3 text-left font-semibold">Última interacción</th>
                                        <th className="px-4 py-3 text-center font-semibold">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {prospectosFiltrados.map((p) => (
                                        <tr key={p._id || p.id} className="hover:bg-slate-50/70 transition-colors cursor-pointer" onClick={() => handleSeleccionarProspecto(p)}>
                                            <td className="px-4 py-3">
                                                <p className="font-medium text-gray-900">
                                                    {p.nombres} {p.apellidoPaterno}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">{p.empresa || '—'}</td>
                                            <td className="px-4 py-3">
                                                <div className="space-y-0.5">
                                                    <p className="text-gray-700">{p.telefono}</p>
                                                    <p className="text-gray-500 text-xs truncate max-w-[150px]">{p.correo}</p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-0.5 text-yellow-500">
                                                    <Star className={\`w-3.5 h-3.5 \${p.interes >= 1 ? 'fill-yellow-400' : 'fill-slate-100 text-slate-300'}\`} />
                                                    <Star className={\`w-3.5 h-3.5 \${p.interes >= 3 ? 'fill-yellow-400' : 'fill-slate-100 text-slate-300'}\`} />
                                                    <Star className={\`w-3.5 h-3.5 \${p.interes >= 5 ? 'fill-yellow-400' : 'fill-slate-100 text-slate-300'}\`} />
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-500 text-xs">
                                                {p.ultimaInteraccion
                                                    ? new Date(p.ultimaInteraccion).toLocaleString('es-MX', {
                                                        dateStyle: 'short',
                                                        timeStyle: 'short'
                                                    })
                                                    : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-3">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); abrirModalEditar(p); }}
                                                        className="text-gray-400 hover:text-blue-600 transition-colors p-2 rounded-full hover:bg-blue-50"
                                                        title="Editar Prospecto"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleSeleccionarProspecto(p); }}
                                                        className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-700 font-medium text-sm p-2 rounded-lg hover:bg-teal-50"
                                                        title="Ver Seguimiento"
                                                    >
                                                        <ChevronRight className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}\`;

content = content.replace(oldGridRegex, newTable);

// Ensure the replace actually worked, otherwise throw
if (content === fs.readFileSync(srcPath, 'utf8')) {
    console.error("No changes were made to ProspectorSeguimiento.jsx. Regex might have failed.");
    process.exit(1);
}

// Rename 'Seguimiento de Prospectos' to 'Oportunidades / Prospectos'
content = content.replace(
    '<h1 className="text-2xl font-bold text-gray-900">Seguimiento de Prospectos</h1>',
    '<h1 className="text-2xl font-bold text-gray-900">Prospectos y Seguimiento</h1>'
);

// We need to support Closer fetching too, if it's reused. 
// It fetches from /api/prospector/prospectos right now.
// I will import location to conditionally fetch.
const fetchToAdd = \`
    const isCloser = location.pathname.includes('/closer');
    const rolePath = isCloser ? 'closer' : 'prospector';
\`;

content = content.replace(
    'const navigate = useNavigate();',
    \`const navigate = useNavigate();\n    const location = typeof window !== 'undefined' ? window.location : { pathname: '' };\n\${fetchToAdd}\`
);

// Generalize API paths
content = content.replace(/\\/api\\/prospector\\/prospectos/g, \`/api/\${rolePath}/prospectos\`);
content = content.replace(/\\/api\\/prospector\\/crear-prospecto/g, \`/api/\${rolePath}/crear-prospecto\`);
content = content.replace(/\\/api\\/prospector\\/registrar-actividad/g, \`/api/\${rolePath}/registrar-actividad\`);

fs.writeFileSync(srcPath, content, 'utf8');
console.log("Refactoring of ProspectorSeguimiento.jsx completed!");
