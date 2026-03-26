const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, 'src', 'pages', 'prospector', 'ProspectorSeguimiento.jsx');
const content = fs.readFileSync(srcPath, 'utf8');

const lines = content.split('\n');

// Find start and end of detailed view
const startDetailedIdx = lines.findIndex(l => l.includes('// VISTA DETALLADA DEL PROSPECTO'));
const endDetailedIdx = lines.findIndex(l => l.includes('// VISTA PRINCIPAL (LISTA DE PROSPECTOS)'));

console.log('Start detail:', startDetailedIdx, 'End detail:', endDetailedIdx);

if (startDetailedIdx === -1 || endDetailedIdx === -1) {
    console.error("Could not find delimiters.");
    process.exit(1);
}

const detailedCode = lines.slice(startDetailedIdx, endDetailedIdx).join('\n');

// Create the new component content
const newComponentContent = `import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
    Phone, MessageSquare, Mail, Calendar, CheckCircle2,
    XCircle, Clock, Star, ArrowLeft, RefreshCw, X, Building2, MapPin, Globe, Edit2, Bell, Send, Trash2
} from 'lucide-react';

import { getToken } from '../utils/authUtils';
import API_URL from '../config/api';
import TimeWheelPicker from './TimeWheelPicker';
import HistorialInteracciones from './HistorialInteracciones';

const ETAPAS_EMBUDO = {
    'prospecto_nuevo': { label: 'Sin contacto', color: 'bg-red-100 text-red-600' },
    'en_contacto': { label: 'En contacto', color: 'bg-(--theme-100) text-(--theme-600)' },
    'reunion_agendada': { label: 'Cita agendada', color: 'bg-(--theme-100) text-(--theme-600)' },
    'reunion_realizada': { label: 'Cita realizada', color: 'bg-(--theme-100) text-(--theme-600)' },
    'en_negociacion': { label: 'Negociación', color: 'bg-amber-100 text-amber-600' },
    'venta_ganada': { label: 'Venta ganada', color: 'bg-(--theme-100) text-(--theme-600)' },
    'perdido': { label: 'Perdido', color: 'bg-rose-100 text-rose-600' }
};

const getEtapaLabel = (etapa) => ETAPAS_EMBUDO[etapa]?.label || etapa;
const getEtapaColor = (etapa) => ETAPAS_EMBUDO[etapa]?.color || 'bg-gray-100 text-gray-600';

const getAuthHeaders = () => ({
    'x-auth-token': getToken() || ''
});

const formatHora = (date) => {
    const d = new Date(date);
    return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
};

export default function ProspectoDetalle({
    prospectoSeleccionado: prospectoInicial,
    rolePath,
    onVolver,
    onActualizado, // function that completely fetches lists
    abrirModalEditar,
    setModalPasarClienteAbierto,
    setModalDescartarAbierto
}) {
    const navigate = useNavigate();
    
    // We keep our own reactive copy of prospectoSeleccionado to update immediately
    const [prospectoSeleccionado, setProspectoSeleccionado] = useState(prospectoInicial);
    
    // When prop changes, update local state
    useEffect(() => {
        setProspectoSeleccionado(prospectoInicial);
        setNotasRapidas(prospectoInicial?.notas || '');
    }, [prospectoInicial]);

    const pid = prospectoSeleccionado?.id || prospectoSeleccionado?._id;

    // Estados internos
    const [actividadesContext, setActividadesContext] = useState([]);
    const [loadingContext, setLoadingContext] = useState(false);
    
    const [notasRapidas, setNotasRapidas] = useState(prospectoInicial?.notas || '');
    const [loadingNotas, setLoadingNotas] = useState(false);
    
    const [muralTexto, setMuralTexto] = useState('');
    const [guardandoMural, setGuardandoMural] = useState(false);
    
    const [llamadaFlow, setLlamadaFlow] = useState(null);
    const [editandoEtapa, setEditandoEtapa] = useState(false);
    const [loadingEtapa, setLoadingEtapa] = useState(false);
    
    const [modalRecordatorioAbierto, setModalRecordatorioAbierto] = useState(false);
    const [recordatorio, setRecordatorio] = useState({ fechaProxima: '', notas: '' });
    const [acordeonCierreAbierto, setAcordeonCierreAbierto] = useState(false);

    // Initial contextual loading
    useEffect(() => {
        if (!prospectoSeleccionado) return;
        handleSeleccionarProspecto(prospectoSeleccionado);
    }, [prospectoSeleccionado?.id, prospectoSeleccionado?._id]);

    const handleSeleccionarProspecto = async (p) => {
        setLoadingContext(true);
        try {
            const endpoint = \`\${API_URL}/api/\${rolePath}/prospecto/\${p.id || p._id}/historial-completo\`;
            const res = await axios.get(endpoint, { headers: getAuthHeaders() });

            if (res.data.timeline) {
                const actividades = res.data.timeline
                    .filter(item => item.tipo === 'actividad')
                    .map(act => ({
                        id: act.id,
                        tipo: act.tipoActividad,
                        fecha: act.fecha,
                        vendedor: act.vendedorId,
                        vendedorNombre: act.vendedorNombre,
                        vendedorRol: act.vendedorRol,
                        descripcion: act.descripcion,
                        resultado: act.resultado,
                        notas: act.notas
                    }));
                setActividadesContext(actividades);
            } else {
                const fallbackRes = await axios.get(\`\${API_URL}/api/\${rolePath}/prospectos/\${p.id || p._id}/actividades\`, { headers: getAuthHeaders() });
                setActividadesContext(fallbackRes.data);
            }
        } catch (error) {
            console.error(error);
            toast.error('Error al cargar historial del prospecto');
            setActividadesContext([]);
        } finally {
            setLoadingContext(false);
        }
    };

    const handleDeleteActividadContext = async (actividadId) => {
        if (!window.confirm('¿Eliminar esta actividad? Esta acción no se puede deshacer.')) return;
        try {
            await axios.delete(\`\${API_URL}/api/actividades/\${actividadId}\`, { headers: getAuthHeaders() });
            setActividadesContext(prev => prev.filter(a => a.id !== actividadId));
            toast.success('Actividad eliminada');
        } catch (error) {
            toast.error('No se pudo eliminar la actividad');
        }
    };

    const actualizarInteres = async (id, nuevoInteres) => {
        try {
            await axios.put(\`\${API_URL}/api/\${rolePath}/prospectos/\${id}\`, { interes: nuevoInteres }, { headers: getAuthHeaders() });
            toast.success('Interés actualizado');
            setProspectoSeleccionado({ ...prospectoSeleccionado, interes: nuevoInteres });
            if(onActualizado) onActualizado();
        } catch (error) {
            toast.error('Error al actualizar interés');
        }
    };

    const handleGuardarNotasRapidas = async () => {
        if (!prospectoSeleccionado) return;
        setLoadingNotas(true);
        try {
            const pid = prospectoSeleccionado.id || prospectoSeleccionado._id;
            await axios.put(\`\${API_URL}/api/\${rolePath}/prospectos/\${pid}/editar\`, {
                nombres: prospectoSeleccionado.nombres || '',
                apellidoPaterno: prospectoSeleccionado.apellidoPaterno || '',
                apellidoMaterno: prospectoSeleccionado.apellidoMaterno || '',
                telefono: prospectoSeleccionado.telefono || '',
                telefono2: prospectoSeleccionado.telefono2 || '',
                correo: prospectoSeleccionado.correo || '',
                empresa: prospectoSeleccionado.empresa || '',
                sitioWeb: prospectoSeleccionado.sitioWeb || '',
                ubicacion: prospectoSeleccionado.ubicacion || '',
                notas: notasRapidas
            }, { headers: getAuthHeaders() });

            toast.success('Notas guardadas');
            setProspectoSeleccionado(prev => ({ ...prev, notas: notasRapidas }));
            if(onActualizado) onActualizado();
        } catch (error) {
            toast.error('Error al guardar notas');
        } finally {
            setLoadingNotas(false);
        }
    };

    const recargarDatosYProspecto = async () => {
        if(onActualizado) onActualizado();
        const res = await axios.get(\`\${API_URL}/api/\${rolePath}/prospectos\`, { headers: getAuthHeaders() });
        const updated = res.data.find(p => p.id === pid || p._id === pid);
        if (updated) { setProspectoSeleccionado(updated); }
        handleSeleccionarProspecto(updated || prospectoSeleccionado);
    }
    
    // Helpers para vista detallada
    const llamadasExitosas = actividadesContext.filter(a => a.tipo === 'llamada' && a.resultado === 'exitoso').length;
    const llamadasFallidas = actividadesContext.filter(a => a.tipo === 'llamada' && a.resultado !== 'exitoso').length;
    
${detailedCode.replace('if (prospectoSeleccionado) {', '').slice(0, -1)}
}
`;

// IMPORTANT FIXES IN THE EXTRACTED CODE
// 1. the nested `if (prospectoSeleccionado) {` -> we removed it and the closing brace.
// 2. prospectos state setter `setProspectos(res.data)` inside registrarActividad etc. needs to be handled by calling `onActualizado()`. Let's just do `recargarDatosYProspecto()` where it fetches again.

// Wait, doing string replacement on the extracted code is delicate. Let's do it clean:
const safeComponentContent = newComponentContent
    .replace(/setProspectos\(res\.data\);/g, 'if(onActualizado) onActualizado();')
    // We already declared \`pid\`, so remove duplications.
    .replace(/const pid = prospectoSeleccionado\.id \|\| prospectoSeleccionado\._id;/g, '')
    // Replace \`setProspectoSeleccionado\(null\)\` inside the \`Volver\` with \`onVolver()\`
    .replace(/onClick=\{\(\) => setProspectoSeleccionado\(null\)\}/g, 'onClick={onVolver}')
    // Removing the re-declaration of proximaCita if it conflicts with detailedCode
    // DetailedCode has \`const proximaCita = ...\` so we don't declare it again above.

fs.writeFileSync(path.join(__dirname, 'src', 'components', 'ProspectoDetalle.jsx'), safeComponentContent);
console.log('Created ProspectoDetalle.jsx');

// Now refactor ProspectorSeguimiento.jsx
const originalComponentPrefix = lines.slice(0, startDetailedIdx).join('\n');
const originalComponentSuffix = lines.slice(endDetailedIdx).join('\n');

// Build the new ProspectorSeguimiento piece replacing the block
const integrationCode = \`
    if (prospectoSeleccionado) {
        return (
            <ProspectoDetalle
                prospectoSeleccionado={prospectoSeleccionado}
                rolePath={rolePath}
                onVolver={() => setProspectoSeleccionado(null)}
                onActualizado={cargarDatos}
                abrirModalEditar={abrirModalEditar}
                setModalPasarClienteAbierto={setModalPasarClienteAbierto}
                setModalDescartarAbierto={setModalDescartarAbierto}
            />
        );
    }
\`;

let newParentContent = originalComponentPrefix + '\n' + integrationCode + '\n' + originalComponentSuffix;

// Remove the states from ProspectorSeguimiento that went to the child
const statesToRemove = [
    'const [actividadesContext',
    'const [loadingContext',
    'const [llamadaFlow',
    'const [notasRapidas',
    'const [loadingNotas',
    'const [muralTexto',
    'const [guardandoMural',
    'const [modalRecordatorioAbierto',
    'const [recordatorio',
    'const [acordeonCierreAbierto',
    'const [editandoEtapa',
    'const [loadingEtapa',
    'const handleGuardarNotasRapidas',
    'const handleDeleteActividadContext',
    'const actualizarInteres',
    'const llamadasExitosas',
    'const llamadasFallidas',
    'const proximaCita ='
];

// Let's import ProspectoDetalle
newParentContent = newParentContent.replace(
    "import HistorialInteracciones from '../../components/HistorialInteracciones';",
    "import HistorialInteracciones from '../../components/HistorialInteracciones';\\nimport ProspectoDetalle from '../../components/ProspectoDetalle';"
);

// We need to clean up `handleSeleccionarProspecto` in parent, it should just set prospectoSeleccionado
const handleSeleccRx = /const handleSeleccionarProspecto = async \\(\\(p\\)\\) => \\{[\\s\\S]*?setActividadesContext\\(\\[\\]\\);\\s*\\}\\s*finally \\{\\s*setLoadingContext\\(false\\);\\s*\\}\\s*\\};/;
newParentContent = newParentContent.replace(handleSeleccRx, \`const handleSeleccionarProspecto = (p) => {
        setProspectoSeleccionado(p);
    };\`);


fs.writeFileSync(srcPath, newParentContent);
console.log('Modified ProspectorSeguimiento.jsx');
