const mongoose = require('mongoose');

const actividadSchema = new mongoose.Schema({
    tipo: {
        type: String,
        enum: ['llamada', 'mensaje', 'correo', 'whatsapp', 'cita', 'prospecto'],
        required: [true, 'El tipo de actividad es requerido']
    },
    vendedor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario',
        required: [true, 'El vendedor es requerido']
    },
    cliente: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cliente',
        required: [true, 'El cliente es requerido']
    },
    fecha: {
        type: Date,
        default: Date.now
    },
    descripcion: {
        type: String,
        trim: true
    },
    resultado: {
        type: String,
        enum: ['exitoso', 'pendiente', 'fallido'],
        default: 'pendiente'
    },
    cambioEtapa: {
        type: Boolean,
        default: false
    },
    etapaAnterior: {
        type: String,
        enum: ['contacto_inicial', 'llamadas', 'citas', 'negociacion', 'ganado', 'perdido']
    },
    etapaNueva: {
        type: String,
        enum: ['contacto_inicial', 'llamadas', 'citas', 'negociacion', 'ganado', 'perdido']
    },
    notas: {
        type: String
    }
}, {
    timestamps: true
});

// Índices para consultas rápidas
actividadSchema.index({ vendedor: 1, fecha: -1 });
actividadSchema.index({ cliente: 1, fecha: -1 });
actividadSchema.index({ tipo: 1, fecha: -1 });

module.exports = mongoose.model('Actividad', actividadSchema);
