const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Por favor ingrese un título para la pregunta'],
        trim: true,
        maxlength: [150, 'El título no puede tener más de 150 caracteres']
    },
    content: {
        type: String,
        required: [true, 'Por favor ingrese el contenido de la pregunta'],
        maxlength: [2000, 'El contenido no puede tener más de 2000 caracteres']
    },
    author: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    tags: {
        type: [String],
        required: [true, 'Por favor ingrese al menos una etiqueta'],
        validate: {
            validator: function(v) {
                return v.length > 0 && v.length <= 5;
            },
            message: 'Debe incluir entre 1 y 5 etiquetas'
        }
    },
    codeSnippet: {
        type: String,
        maxlength: [5000, 'El fragmento de código no puede tener más de 5000 caracteres']
    },
    answers: [{
        content: {
            type: String,
            required: [true, 'Por favor ingrese el contenido de la respuesta'],
            maxlength: [2000, 'La respuesta no puede tener más de 2000 caracteres']
        },
        author: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true
        },
        codeSnippet: {
            type: String,
            maxlength: [5000, 'El fragmento de código no puede tener más de 5000 caracteres']
        },
        isAccepted: {
            type: Boolean,
            default: false
        },
        votes: {
            type: Number,
            default: 0
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    views: {
        type: Number,
        default: 0
    },
    votes: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['Abierta', 'Resuelta', 'Cerrada'],
        default: 'Abierta'
    },
    suggestedExperts: [{
        type: mongoose.Schema.ObjectId,
        ref: 'User'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for answer count
questionSchema.virtual('answerCount').get(function() {
    return this.answers.length;
});

// Middleware to populate author details when finding questions
questionSchema.pre(/^find/, function(next) {
    this.populate({
        path: 'author',
        select: 'name avatar'
    }).populate({
        path: 'answers.author',
        select: 'name avatar mentorRating'
    }).populate({
        path: 'suggestedExperts',
        select: 'name avatar skills mentorRating'
    });
    next();
});

// Method to find experts for a question based on tags
questionSchema.statics.findExperts = async function(questionId) {
    const question = await this.findById(questionId);
    
    if (!question) {
        return [];
    }
    
    const User = mongoose.model('User');
    
    // Find users with skills matching the question tags
    const experts = await User.find({
        'skills.name': { $in: question.tags },
        '_id': { $ne: question.author } // Exclude the question author
    }).sort({ mentorRating: -1, mentorSessions: -1 }).limit(5);
    
    // Update the question with suggested experts
    question.suggestedExperts = experts.map(expert => expert._id);
    await question.save();
    
    return experts;
};

// Update user points when their answer is accepted
questionSchema.methods.updatePointsForAcceptedAnswer = async function(answerId) {
    const User = mongoose.model('User');
    
    const answer = this.answers.id(answerId);
    if (answer && answer.isAccepted) {
        // Award points to the user who provided the accepted answer
        await User.findByIdAndUpdate(answer.author, {
            $inc: { points: 25 }
        });
        
        // Update question status to resolved
        this.status = 'Resuelta';
        await this.save();
    }
};

module.exports = mongoose.model('Question', questionSchema);
