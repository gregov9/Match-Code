const mongoose = require('mongoose');

const configSchema = new mongoose.Schema({
    pagoMovil: {
        banco: {
            type: String,
            required: true
        },
        telefono: {
            type: String,
            required: true
        },
        cedula: {
            type: String,
            required: true
        },
        nombreBeneficiario: {
            type: String,
            required: true
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Middleware para actualizar la fecha de modificación
configSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const Config = mongoose.model('Config', configSchema);

module.exports = Config; 