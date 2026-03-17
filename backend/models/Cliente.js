const mongoose = require('mongoose');

const clienteSchema = new mongoose.Schema({
    nombres: {
        type: String,
        required: [true, 'Los nombres son requeridos'],
        trim: true
    },
    apellidoPaterno: {
        type: String,
        required: [true, 'El apellido paterno es requerido'],
        trim: true
    },
    apellidoMaterno: {
        type: String,
        trim: true
    },
    telefono: {
        type: String,
        required: [true, 'El teléfono es requerido'],
        trim: true
    },
    correo: {
        type: String,
        required: [true, 'El correo es requerido'],
        trim: true,
        lowercase: true
    },
    empresa: {
        type: String,
        trim: true
    },
    estado: {
        type: String,
        enum: ['ganado', 'perdido', 'proceso'],
        default: 'proceso'
    },
    etapaEmbudo: {
        type: String,
        enum: [
            'prospecto_nuevo',      // Prospector: Recién agregado
            'en_contacto',          // Prospector: Intentando contactar
            'reunion_agendada',     // Prospector → Closer: Transferencia
            'reunion_realizada',    // Closer: Reunión completada
            'en_negociacion',       // Closer: Negociando
            'venta_ganada',         // Closer: Cerrado exitosamente
            'perdido'               // Cualquiera: No avanzó
        ],
        default: 'prospecto_nuevo'
    },
    prospectorAsignado: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario',
        required: false  // Puede ser asignado después
    },
    closerAsignado: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario',
        required: false  // Se asigna cuando se agenda reunión
    },
    fechaTransferencia: {
        type: Date,
        required: false  // Fecha cuando pasa de prospector a closer
    },
    fechaUltimaEtapa: {
        type: Date,
        default: Date.now
    },
    historialEmbudo: [{
        etapa: {
            type: String,
            enum: ['prospecto_nuevo', 'en_contacto', 'reunion_agendada', 'reunion_realizada', 'en_negociacion', 'venta_ganada', 'perdido']
        },
        fecha: {
            type: Date,
            default: Date.now
        },
        vendedor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Usuario'
        }
    }],
    vendedorAsignado: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario',
        required: [true, 'El vendedor asignado es requerido']
    },
    fechaRegistro: {
        type: Date,
        default: Date.now
    },
    ultimaInteraccion: {
        type: Date,
        default: Date.now
    },
    notas: {
        type: String
    }
}, {
    timestamps: true
});

// Índices para búsqueda rápida
clienteSchema.index({ vendedorAsignado: 1, estado: 1 });
clienteSchema.index({ vendedorAsignado: 1, etapaEmbudo: 1 });
clienteSchema.index({ etapaEmbudo: 1, fechaUltimaEtapa: -1 });
clienteSchema.index({ nombres: 'text', apellidoPaterno: 'text', empresa: 'text' });

module.exports = mongoose.model('Cliente', clienteSchema);
