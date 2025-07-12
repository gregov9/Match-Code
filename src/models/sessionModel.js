const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    mentor: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, 'Una sesión debe tener un mentor']
    },
    mentee: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, 'Una sesión debe tener un estudiante']
    },
    title: {
        type: String,
        required: [true, 'Por favor ingrese un título para la sesión'],
        trim: true,
        maxlength: [100, 'El título no puede tener más de 100 caracteres']
    },
    description: {
        type: String,
        required: [true, 'Por favor ingrese una descripción para la sesión'],
        maxlength: [500, 'La descripción no puede tener más de 500 caracteres']
    },
    topics: {
        type: [String],
        required: [true, 'Por favor ingrese al menos un tema para la sesión']
    },
    date: {
        type: Date,
        required: [true, 'Por favor seleccione una fecha para la sesión']
    },
    duration: {
        type: Number,
        required: [true, 'Por favor ingrese la duración de la sesión en minutos'],
        enum: [15, 30, 45, 60],
        default: 30
    },
    status: {
        type: String,
        enum: ['Pendiente', 'Confirmada', 'Completada', 'Cancelada'],
        default: 'Pendiente'
    },
    meetingLink: {
        type: String,
        default: ''
    },
    mentorRating: {
        type: Number,
        min: 1,
        max: 5
    },
    mentorReview: {
        type: String,
        maxlength: [300, 'La reseña no puede tener más de 300 caracteres']
    },
    menteeRating: {
        type: Number,
        min: 1,
        max: 5
    },
    menteeReview: {
        type: String,
        maxlength: [300, 'La reseña no puede tener más de 300 caracteres']
    },
    notes: {
        type: String,
        maxlength: [1000, 'Las notas no pueden tener más de 1000 caracteres']
    },
    creditsEarned: {
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

// Middleware to populate user details when finding sessions
sessionSchema.pre(/^find/, function(next) {
    this.populate({
        path: 'mentor',
        select: 'name avatar skills mentorRating mentorSessions'
    }).populate({
        path: 'mentee',
        select: 'name avatar'
    });
    next();
});

// Method to update mentor stats after session completion
sessionSchema.methods.updateMentorStats = async function() {
    const User = mongoose.model('User');
    
    if (this.status === 'Completada' && this.mentorRating) {
        const mentor = await User.findById(this.mentor);
        
        // Update mentor sessions count
        mentor.mentorSessions += 1;
        
        // Update mentor rating (weighted average)
        const totalRatings = mentor.mentorSessions;
        const oldRatingWeight = (totalRatings - 1) / totalRatings;
        const newRatingWeight = 1 / totalRatings;
        
        mentor.mentorRating = (mentor.mentorRating * oldRatingWeight) + (this.mentorRating * newRatingWeight);
        
        // Add points for completing a session
        mentor.points += 50;
        
        await mentor.save();
    }
};

module.exports = mongoose.model('Session', sessionSchema);
