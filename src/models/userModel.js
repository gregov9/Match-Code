const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Por favor ingrese su nombre'],
        trim: true
    },
    username: {
        type: String,
        required: [true, 'Por favor ingrese un nombre de usuario'],
        unique: true,
        trim: true,
        minlength: [3, 'El nombre de usuario debe tener al menos 3 caracteres'],
        maxlength: [20, 'El nombre de usuario no puede tener más de 20 caracteres'],
        match: [/^[a-zA-Z0-9_]+$/, 'El nombre de usuario solo puede contener letras, números y guiones bajos']
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
        minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
        select: false
    },
    role: {
        type: String,
        enum: ['user', 'solver', 'mentor', 'admin', 'solucionador'],
        default: 'user'
    },
    approvalStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'approved'
    },
    // Campos específicos para mentor
    programmingLanguages: {
        type: [String],
        required: [function() {
            return this.role === 'mentor';
        }, 'Se requieren lenguajes de programación para mentores']
    },
    yearsOfExperience: {
        type: Number,
        required: [function() {
            return this.role === 'mentor';
        }, 'Se requieren los años de experiencia para mentores'],
        min: [0, 'Los años de experiencia no pueden ser negativos']
    },
    mentorDescription: {
        type: String,
        required: [function() {
            return this.role === 'mentor';
        }, 'Se requiere una descripción para mentores'],
        maxlength: [1000, 'La descripción no puede tener más de 1000 caracteres']
    },
    subscriptionPlan: {
        type: String,
        enum: {
            values: ['mensual', 'anual'],
            message: 'El plan de suscripción debe ser mensual o anual',
            // Solo validar el enum si el rol es solucionador
            validate: function(value) {
                if (this.role === 'solucionador') {
                    return ['mensual', 'anual'].includes(value);
                }
                return true; // No validar para otros roles
            }
        },
        required: [function() {
            return this.role === 'solucionador';
        }, 'Se requiere seleccionar un plan de suscripción para solucionadores']
    },
    paymentReference: {
        type: String,
        required: [function() {
            return this.role === 'solucionador';
        }, 'Se requiere número de referencia de pago para solucionadores']
    },
    paymentDate: {
        type: Date,
        required: [function() {
            return this.role === 'solucionador';
        }, 'Se requiere fecha de pago para solucionadores']
    },
    avatar: {
        type: String,
        default: 'default-avatar.png'
    },
    avatarUrl: {
        type: String,
        default: function() {
            return this.avatar.startsWith('http') ? this.avatar : `/uploads/avatars/${this.avatar}`;
        }
    },
    skills: [{
        name: String,
        level: {
            type: String,
            enum: ['Básico', 'Intermedio', 'Avanzado'],
            default: 'Básico'
        }
    }],
    bio: {
        type: String,
        maxlength: [500, 'La biografía no puede tener más de 500 caracteres']
    },
    points: {
        type: Number,
        default: 0
    },
    mentorRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    mentorSessions: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual field for user's rank based on points
userSchema.virtual('rank').get(function() {
    if (this.points >= 5000) return 'Maestro';
    if (this.points >= 2500) return 'Experto';
    if (this.points >= 1000) return 'Avanzado';
    if (this.points >= 500) return 'Intermedio';
    return 'Principiante';
});

// Middleware para encriptar la contraseña antes de guardar
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }
    
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Método para verificar contraseña
userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
    return await bcrypt.compare(candidatePassword, userPassword);
};

// Sign JWT and return
userSchema.methods.getSignedJwtToken = function() {
    return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE
    });
};

module.exports = mongoose.model('User', userSchema);
