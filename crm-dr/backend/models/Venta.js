const mongoose = require('mongoose');

const ventaSchema = new mongoose.Schema({
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
    monto: {
        type: Number,
        required: [true, 'El monto es requerido'],
        min: [0, 'El monto no puede ser negativo']
    },
    fecha: {
        type: Date,
        default: Date.now
    },
    producto: {
        type: String,
        trim: true
    },
    estado: {
        type: String,
        enum: ['completada', 'pendiente'],
        default: 'completada'
    },
    notas: {
        type: String
    }
}, {
    timestamps: true
});

// Índices para métricas
ventaSchema.index({ vendedor: 1, fecha: -1 });
ventaSchema.index({ fecha: -1 });

module.exports = mongoose.model('Venta', ventaSchema);
