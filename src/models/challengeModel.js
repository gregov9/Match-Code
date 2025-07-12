const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Por favor ingrese un título para el desafío'],
        trim: true,
        maxlength: [100, 'El título no puede tener más de 100 caracteres']
    },
    description: {
        type: String,
        required: [true, 'Por favor ingrese una descripción para el desafío'],
        maxlength: [1000, 'La descripción no puede tener más de 1000 caracteres']
    },
    difficulty: {
        type: String,
        required: [true, 'Por favor seleccione el nivel de dificultad'],
        enum: {
            values: ['Básico', 'Intermedio', 'Avanzado'],
            message: 'Dificultad no válida. Debe ser: Básico, Intermedio o Avanzado'
        }
    },
    skills: {
        type: [String],
        required: [true, 'Por favor ingrese al menos una habilidad requerida'],
        validate: {
            validator: function(v) {
                return Array.isArray(v) && v.length > 0;
            },
            message: 'Debe especificar al menos una habilidad'
        }
    },
    teamSizeMin: {
        type: Number,
        required: [true, 'Por favor ingrese el tamaño mínimo del equipo'],
        min: [1, 'El tamaño mínimo del equipo debe ser al menos 1'],
        validate: {
            validator: function(v) {
                return v <= this.teamSizeMax;
            },
            message: 'El tamaño mínimo del equipo no puede ser mayor que el máximo'
        }
    },
    teamSizeMax: {
        type: Number,
        required: [true, 'Por favor ingrese el tamaño máximo del equipo'],
        min: [1, 'El tamaño máximo del equipo debe ser al menos 1']
    },
    duration: {
        type: String,
        required: [true, 'Por favor ingrese la duración estimada'],
        validate: {
            validator: function(v) {
                return /^\d+\s*horas?$/.test(v);
            },
            message: 'La duración debe especificarse en horas (ej: "2 horas")'
        }
    },
    points: {
        type: Number,
        required: [true, 'Por favor ingrese los puntos otorgados por completar el desafío'],
        min: [1, 'Los puntos deben ser al menos 1']
    },
    creator: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, 'Un desafío debe tener un creador']
    },
    resources: [{
        title: {
            type: String,
            required: [true, 'El recurso debe tener un título']
        },
        url: {
            type: String,
            required: [true, 'El recurso debe tener una URL'],
            validate: {
                validator: function(v) {
                    return /^(http|https):\/\/[^ "]+$/.test(v);
                },
                message: 'La URL del recurso no es válida'
            }
        },
        type: {
            type: String,
            enum: {
                values: ['Artículo', 'Video', 'Documentación', 'Repositorio', 'Otro'],
                message: 'Tipo de recurso no válido'
            },
            default: 'Otro'
        }
    }],
    submissions: [{
        team: [{
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: [true, 'Cada miembro del equipo debe ser un usuario válido']
        }],
        repositoryUrl: {
            type: String,
            required: [true, 'Por favor proporcione la URL del repositorio'],
            validate: {
                validator: function(v) {
                    return /^(http|https):\/\/[^ "]+$/.test(v);
                },
                message: 'La URL del repositorio no es válida'
            }
        },
        comments: String,
        submittedAt: {
            type: Date,
            default: Date.now
        },
        status: {
            type: String,
            enum: {
                values: ['Pendiente', 'Aprobado', 'Rechazado'],
                message: 'Estado de envío no válido'
            },
            default: 'Pendiente'
        },
        feedback: String
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    participants: [{
        type: mongoose.Schema.ObjectId,
        ref: 'User'
    }],
    maxParticipants: {
        type: Number,
        required: [true, 'Por favor ingrese el número máximo de participantes'],
        min: [1, 'El número máximo de participantes debe ser al menos 1'],
        validate: {
            validator: function(v) {
                return v >= this.teamSizeMax;
            },
            message: 'El número máximo de participantes debe ser al menos igual al tamaño máximo del equipo'
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual para mostrar el tamaño del equipo
challengeSchema.virtual('teamSize').get(function() {
    if (this.teamSizeMin === this.teamSizeMax) {
        return `${this.teamSizeMin} personas`;
    }
    return `${this.teamSizeMin}-${this.teamSizeMax} personas`;
});

// Middleware para poblar los detalles del creador al buscar desafíos
challengeSchema.pre(/^find/, function(next) {
    this.populate({
        path: 'creator',
        select: 'name avatar role'
    });
    next();
});

module.exports = mongoose.model('Challenge', challengeSchema);
