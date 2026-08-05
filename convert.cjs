const fs = require('fs');
let code = fs.readFileSync('src/components/KanbanClientes.jsx', 'utf8');

// Replace component name
code = code.replace(/KanbanClientes/g, 'KanbanProspectos');

// Replace storage keys
code = code.replace(/kanban_clientes_cols_v3/g, 'kanban_prospectos_cols_v1');
code = code.replace(/kanban_clientes_prefs_v3/g, 'kanban_prospectos_prefs_v1');

// Replace field
code = code.replace(/etapaCliente/g, 'etapaEmbudo');

// Replace API calls
code = code.replace(/\/api\/clientes\//g, '/api/prospectos/');
code = code.replace(/onUpdateCliente/g, 'onUpdateProspecto');
code = code.replace(/clientes=\{/g, 'prospectos={');
code = code.replace(/clientes\.forEach/g, 'prospectos.forEach');
code = code.replace(/clientes\.reduce/g, 'prospectos.reduce');
code = code.replace(/clientes \=/g, 'prospectos =');
code = code.replace(/ clientes\)/g, ' prospectos)');
code = code.replace(/\{ clientes/g, '{ prospectos');
code = code.replace(/clientes: PropTypes/g, 'prospectos: PropTypes');

// Fix prop default
code = code.replace(/prospectos = \[\]/g, 'prospectos = []');

// Replace DEFAULT_COLUMNS array
const oldCols = `const DEFAULT_COLUMNS = [
    { id: 'cliente_nuevo',       label: 'Cliente nuevo',       colorId: 'emerald', wipLimit: 0 },
    { id: 'en_seguimiento',      label: 'En seguimiento',      colorId: 'blue',    wipLimit: 0 },
    { id: 'oportunidad_activa',  label: 'Oportunidad activa',  colorId: 'violet',  wipLimit: 0 },
    { id: 'reunion_con_cliente', label: 'Reunión con cliente',  colorId: 'amber',   wipLimit: 0 },
    { id: 'inactivo',            label: 'Inactivo',            colorId: 'slate',   wipLimit: 0 },
];`;

const newCols = `const DEFAULT_COLUMNS = [
    { id: 'prospecto_nuevo',   label: 'Sin contacto',     colorId: 'rose', wipLimit: 0 },
    { id: 'en_contacto',       label: 'En contacto',      colorId: 'blue', wipLimit: 0 },
    { id: 'reunion_agendada',  label: 'Cita agendada',    colorId: 'indigo', wipLimit: 0 },
    { id: 'reunion_realizada', label: 'Cita realizada',   colorId: 'violet', wipLimit: 0 },
    { id: 'en_negociacion',    label: 'Negociación',      colorId: 'amber', wipLimit: 0 },
    { id: 'venta_ganada',      label: 'Venta ganada',     colorId: 'emerald', wipLimit: 0 },
    { id: 'perdido',           label: 'Perdido',          colorId: 'slate', wipLimit: 0 }
];`;

code = code.replace(oldCols, newCols);

// fallback for getClientCol
code = code.replace(/c\.etapaEmbudo \|\| 'cliente_nuevo'/g, "c.etapaEmbudo || 'prospecto_nuevo'");
code = code.replace(/clientCol === 'cliente_nuevo'/g, "clientCol === 'prospecto_nuevo'");

// Money format
code = code.replace(/const facturado = Number\(c\.totalFacturado\)/g, 'const facturado = Number(c.customMetricValue) || Number(c.totalFacturado)');

fs.writeFileSync('src/components/KanbanProspectos.jsx', code);
console.log('KanbanProspectos.jsx created successfully');
