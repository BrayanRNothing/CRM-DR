const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const usuarioSchema = new mongoose.Schema({
    usuario: {
        type: String,
        required: [true, 'El nombre de usuario es requerido'],
        unique: true,
        trim: true
    },
    contraseña: {
        type: String,
        required: [true, 'La contraseña es requerida'],
        minlength: [6, 'La contraseña debe tener al menos 6 caracteres']
    },
    rol: {
        type: String,
        enum: ['admin', 'vendedor', 'prospector', 'closer'],
        required: [true, 'El rol es requerido']
    },
    nombre: {
        type: String,
        required: [true, 'El nombre completo es requerido'],
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    telefono: {
        type: String,
        trim: true
    },
    activo: {
        type: Boolean,
        default: true
    },
    fechaCreacion: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Hash de contraseña antes de guardar
usuarioSchema.pre('save', async function (next) {
    if (!this.isModified('contraseña')) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.contraseña = await bcrypt.hash(this.contraseña, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Método para comparar contraseñas
usuarioSchema.methods.compararContraseña = async function (contraseñaIngresada) {
    return await bcrypt.compare(contraseñaIngresada, this.contraseña);
};

module.exports = mongoose.model('Usuario', usuarioSchema);
