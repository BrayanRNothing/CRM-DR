const mongoose = require('mongoose');

const tareaSchema = new mongoose.Schema({
    vendedor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario',
        required: [true, 'El vendedor es requerido']
    },
    cliente: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cliente'
    },
    titulo: {
        type: String,
        required: [true, 'El título es requerido'],
        trim: true
    },
    descripcion: {
        type: String,
        trim: true
    },
    fechaVencimiento: {
        type: Date,
        required: [true, 'La fecha de vencimiento es requerida']
    },
    prioridad: {
        type: String,
        enum: ['alta', 'media', 'baja'],
        default: 'media'
    },
    completada: {
        type: Boolean,
        default: false
    },
    fechaCreacion: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Índices para consultas
tareaSchema.index({ vendedor: 1, completada: 1, fechaVencimiento: 1 });

module.exports = mongoose.model('Tarea', tareaSchema);
