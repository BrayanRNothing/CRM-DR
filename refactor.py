import sys
import re

with open('src/pages/prospector/ProspectorSeguimiento.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Make a backup
with open('src/pages/prospector/ProspectorSeguimiento_backup.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

start_det = content.find('// VISTA DETALLADA DEL PROSPECTO')
end_det = content.find('// VISTA PRINCIPAL (LISTA DE PROSPECTOS)')

if start_det == -1 or end_det == -1:
    print("Could not find start or end tokens")
    sys.exit(1)

detailed_block = content[start_det:end_det]

# Strip the `if (prospectoSeleccionado) {`
detailed_block = re.sub(r'if \(prospectoSeleccionado\) \{', '', detailed_block, count=1)
# Remove the trailing brace
last_brace = detailed_block.rfind('}')
if last_brace != -1:
    detailed_block = detailed_block[:last_brace] + detailed_block[last_brace+1:]


prefix = """import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
    Phone, MessageSquare, Mail, Calendar, CheckCircle2,
    XCircle, Clock, Star, ArrowLeft, RefreshCw, X, Building2, MapPin, Globe, Edit2, Bell, Send, Trash2
} from 'lucide-react';

import { getToken } from '../../utils/authUtils';
import API_URL from '../../config/api';
import TimeWheelPicker from '../../components/TimeWheelPicker';
import HistorialInteracciones from '../../components/HistorialInteracciones';

const ETAPAS_EMBUDO = {
    'prospecto_nuevo': { label: 'Sin contacto', color: 'bg-red-100 text-red-600' },
    'en_contacto': { label: 'En contacto', color: 'bg-[var(--theme-100)] text-[var(--theme-600)]' },
    'reunion_agendada': { label: 'Cita agendada', color: 'bg-[var(--theme-100)] text-[var(--theme-600)]' },
    'reunion_realizada': { label: 'Cita realizada', color: 'bg-[var(--theme-100)] text-[var(--theme-600)]' },
    'en_negociacion': { label: 'Negociación', color: 'bg-amber-100 text-amber-600' },
    'venta_ganada': { label: 'Venta ganada', color: 'bg-[var(--theme-100)] text-[var(--theme-600)]' },
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
    prospecto: initialProspecto,
    rolePath,
    onVolver,
    onActualizado,
    abrirModalEditar,
    setModalPasarClienteAbierto,
    setModalDescartarAbierto
}) {
    const navigate = useNavigate();
    
    const [prospectoSeleccionado, setProspectoSeleccionado] = useState(initialProspecto);
    const pid = prospectoSeleccionado?.id || prospectoSeleccionado?._id;

    const [actividadesContext, setActividadesContext] = useState([]);
    const [loadingContext, setLoadingContext] = useState(false);
    
    const [notasRapidas, setNotasRapidas] = useState(initialProspecto?.notas || '');
    const [loadingNotas, setLoadingNotas] = useState(false);
    
    const [muralTexto, setMuralTexto] = useState('');
    const [guardandoMural, setGuardandoMural] = useState(false);
    
    const [llamadaFlow, setLlamadaFlow] = useState(null);
    const [editandoEtapa, setEditandoEtapa] = useState(false);
    const [loadingEtapa, setLoadingEtapa] = useState(false);
    
    const [modalRecordatorioAbierto, setModalRecordatorioAbierto] = useState(false);
    const [recordatorio, setRecordatorio] = useState({ fechaProxima: '', notas: '' });
    const [acordeonCierreAbierto, setAcordeonCierreAbierto] = useState(false);

    useEffect(() => {
        if(initialProspecto) {
            setProspectoSeleccionado(initialProspecto);
            setNotasRapidas(initialProspecto.notas || '');
            handleSeleccionarProspectoProp(initialProspecto);
        }
    }, [initialProspecto]);

    const handleSeleccionarProspectoProp = async (p) => {
        setLoadingContext(true);
        try {
            const endpoint = `${API_URL}/api/${rolePath}/prospecto/${p.id || p._id}/historial-completo`;
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
                const fallbackRes = await axios.get(`${API_URL}/api/${rolePath}/prospectos/${p.id || p._id}/actividades`, { headers: getAuthHeaders() });
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
    
    const handleSeleccionarProspecto = () => {
        handleSeleccionarProspectoProp(prospectoSeleccionado);
    };

    const handleDeleteActividadContext = async (actividadId) => {
        if (!window.confirm('¿Eliminar esta actividad? Esta acción no se puede deshacer.')) return;
        try {
            await axios.delete(`${API_URL}/api/actividades/${actividadId}`, { headers: getAuthHeaders() });
            setActividadesContext(prev => prev.filter(a => a.id !== actividadId));
            toast.success('Actividad eliminada');
        } catch (error) {
            toast.error('No se pudo eliminar la actividad');
        }
    };

    const actualizarInteres = async (id, nuevoInteres) => {
        try {
            await axios.put(`${API_URL}/api/${rolePath}/prospectos/${id}`, { interes: nuevoInteres }, { headers: getAuthHeaders() });
            toast.success('Interés actualizado');
            setProspectoSeleccionado({ ...prospectoSeleccionado, interes: nuevoInteres });
            if (onActualizado) onActualizado();
        } catch (error) {
            toast.error('Error al actualizar interés');
        }
    };

    const handleGuardarNotasRapidas = async () => {
        if (!prospectoSeleccionado) return;
        setLoadingNotas(true);
        try {
            const pidLoc = prospectoSeleccionado.id || prospectoSeleccionado._id;
            await axios.put(`${API_URL}/api/${rolePath}/prospectos/${pidLoc}/editar`, {
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
            if (onActualizado) onActualizado();
        } catch (error) {
            toast.error('Error al guardar notas');
        } finally {
            setLoadingNotas(false);
        }
    };

    const setProspectos = () => {
        if (onActualizado) onActualizado();
    };
    
    const prospectos = []; // Hack prevent map crash when updating interest
"""

# Small patches to the detailed_block
detailed_block = detailed_block.replace("onClick={() => setProspectoSeleccionado(null)}", "onClick={onVolver}")
# Remove `{renderModales()}` and internal modal calls, let parent handle it or we define it in the parent. 
# Parent will render them in it's own DOM. The detailed view contains a call to renderModales at the bottom.
detailed_block = detailed_block.replace("{renderModales()}", "")

with open('src/components/ProspectoDetalle.jsx', 'w', encoding='utf-8') as f:
    f.write(prefix + '\n' + detailed_block + '\n}\n')


# Construct completely new parent content by doing rigorous regex substitutions
new_p_content = content

# 1. State removals (We have to be careful with exact lines)
states_to_remove = [
    r'const \[actividadesContext[\s\S]*?\] = useState\(false\);\n',  # context to loaded
    r'const \[llamadaFlow[\s\S]*?\] = useState\(false\);\n',  # records to edits
    r'const \[modalRecordatorioAbierto.*?\] = useState\(false\);\n',
    r'const \[recordatorio.*?\] = useState\(\{[\s\S]*?\}\);\n',
    r'const \[acordeonCierreAbierto.*?\] = useState\(false\);\n',
    r'const \[notasRapidas.*?\] = useState\(\'\'\);\n',
    r'const \[loadingNotas.*?\] = useState\(false\);\n',
    r'const \[muralTexto.*?\] = useState\(\'\'\);\n',
    r'const \[guardandoMural.*?\] = useState\(false\);\n',
    r'const \[editandoEtapa.*?\] = useState\(false\);\n',
    r'const \[loadingEtapa.*?\] = useState\(false\);\n',
]

for pat in states_to_remove:
    # Just standardizing the state removals manually or using safer sub
    new_p_content = re.sub(pat, '', new_p_content)

# Safe function removal
func_patterns = [
    r'const handleDeleteActividadContext = async \([\s\S]*?toast\.error\(\'No se pudo eliminar la actividad\'\);\n\s*\}\n\s*\};\n',
    r'const handleGuardarNotasRapidas = async \(\) => \{[\s\S]*?setLoadingNotas\(false\);\n\s*\}\n\s*\};\n',
    r'const actualizarInteres = async \([\s\S]*?toast\.error\(\'Error al actualizar interés\'\);\n\s*\}\n\s*\};\n',
    r'const formatHora = \([\s\S]*?\}\n\s*\};\n',
    r'// Helpers para vista detallada[\s\S]*?const proximaCita =[\s\S]*?;\n'
]
for pat in func_patterns:
    new_p_content = re.sub(pat, '', new_p_content)

# Overwrite handleSeleccionarProspecto to just set state
new_p_content = re.sub(r'const handleSeleccionarProspecto = async \([\s\S]*?setLoadingContext\(false\);\n\s*\}\n\s*\};\n', '''const handleSeleccionarProspecto = (p) => {
        setProspectoSeleccionado(p);
    };\n''', new_p_content)


new_replacement = """
    if (prospectoSeleccionado) {
        return (
            <ProspectoDetalle
                prospecto={prospectoSeleccionado}
                rolePath={rolePath}
                onVolver={() => setProspectoSeleccionado(null)}
                onActualizado={cargarDatos}
                abrirModalEditar={abrirModalEditar}
                setModalPasarClienteAbierto={setModalPasarClienteAbierto}
                setModalDescartarAbierto={setModalDescartarAbierto}
            />
        );
    }
"""

# Replace the detail view with the component
start_idx = new_p_content.find('// VISTA DETALLADA DEL PROSPECTO')
end_idx = new_p_content.find('// VISTA PRINCIPAL (LISTA DE PROSPECTOS)')
new_p_content = new_p_content[:start_idx] + new_replacement + new_p_content[end_idx:]

# Add imports
new_p_content = new_p_content.replace(
    "import HistorialInteracciones from '../../components/HistorialInteracciones';",
    "import HistorialInteracciones from '../../components/HistorialInteracciones';\\nimport ProspectoDetalle from '../../components/ProspectoDetalle';"
)

with open('src/pages/prospector/ProspectorSeguimiento.jsx', 'w', encoding='utf-8') as f:
    f.write(new_p_content)

print("Python Script Complete")
