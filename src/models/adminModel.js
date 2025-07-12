const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Por favor ingrese su nombre'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Por favor ingrese su correo electrónico'],
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: [true, 'Por favor ingrese una contraseña'],
        minlength: [8, 'La contraseña debe tener al menos 8 caracteres'],
        select: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastLogin: {
        type: Date
    }
}, {
    collection: 'users-admin' // Esto fuerza a usar el nombre de colección específico
});

// Middleware para encriptar la contraseña antes de guardar
adminSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// Método para verificar contraseña
adminSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
    return await bcrypt.compare(candidatePassword, userPassword);
};

module.exports = mongoose.model('Admin', adminSchema); 