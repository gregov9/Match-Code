const Challenge = require('../models/challengeModel');
const User = require('../models/userModel');

// @desc    Create a new challenge
// @route   POST /api/challenges
// @access  Private (Mentor only)
exports.createChallenge = async (req, res, next) => {
    try {
        // Verificar que el usuario sea un mentor
        if (req.user.role !== 'mentor') {
            return res.status(403).json({
                success: false,
                error: 'Solo los mentores pueden crear desafíos'
            });
        }

        // Validar los campos requeridos
        const requiredFields = ['title', 'description', 'difficulty', 'points', 'teamSizeMin', 'teamSizeMax', 'duration', 'skills', 'maxParticipants'];
        const missingFields = requiredFields.filter(field => !req.body[field]);

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                error: `Faltan campos requeridos: ${missingFields.join(', ')}`
            });
        }

        // Validar tamaños de equipo
        if (req.body.teamSizeMin > req.body.teamSizeMax) {
            return res.status(400).json({
                success: false,
                error: 'El tamaño mínimo del equipo no puede ser mayor que el máximo'
            });
        }

        // Validar número máximo de participantes
        if (req.body.maxParticipants < req.body.teamSizeMax) {
            return res.status(400).json({
                success: false,
                error: 'El número máximo de participantes debe ser al menos igual al tamaño máximo del equipo'
            });
        }

        // Validar dificultad
        const validDifficulties = ['Básico', 'Intermedio', 'Avanzado'];
        if (!validDifficulties.includes(req.body.difficulty)) {
            return res.status(400).json({
                success: false,
                error: 'Nivel de dificultad no válido'
            });
        }

        // Validar puntos
        if (req.body.points < 1) {
            return res.status(400).json({
                success: false,
                error: 'Los puntos deben ser un número positivo'
            });
        }

        // Validar habilidades
        if (!Array.isArray(req.body.skills) || req.body.skills.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Debe especificar al menos una habilidad'
            });
        }

        // Añadir el creador al cuerpo de la solicitud
        req.body.creator = req.user.id;

        // Crear el desafío
        const challenge = await Challenge.create(req.body);

        res.status(201).json({
            success: true,
            data: challenge
        });
    } catch (error) {
        console.error('Error al crear el desafío:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                error: Object.values(error.errors).map(err => err.message).join(', ')
            });
        }
        next(error);
    }
};

// @desc    Get all challenges
// @route   GET /api/challenges
// @access  Public
exports.getChallenges = async (req, res, next) => {
    try {
        // Build query
        let query = Challenge.find({ isActive: true });

        // Filter by difficulty
        if (req.query.difficulty) {
            query = query.find({ difficulty: req.query.difficulty });
        }

        // Filter by skills
        if (req.query.skills) {
            const skills = req.query.skills.split(',');
            query = query.find({ skills: { $in: skills } });
        }

        // Pagination
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const total = await Challenge.countDocuments({ isActive: true });

        query = query.skip(startIndex).limit(limit);

        // Sort
        if (req.query.sort) {
            const sortBy = req.query.sort.split(',').join(' ');
            query = query.sort(sortBy);
        } else {
            query = query.sort('-createdAt');
        }

        // Execute query
        const challenges = await query;

        // Pagination result
        const pagination = {};

        if (endIndex < total) {
            pagination.next = {
                page: page + 1,
                limit
            };
        }

        if (startIndex > 0) {
            pagination.prev = {
                page: page - 1,
                limit
            };
        }

        res.status(200).json({
            success: true,
            count: challenges.length,
            pagination,
            data: challenges
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get challenge by ID
// @route   GET /api/challenges/:id
// @access  Public
exports.getChallengeById = async (req, res, next) => {
    try {
        const challenge = await Challenge.findById(req.params.id);

        if (!challenge) {
            return res.status(404).json({
                success: false,
                error: 'Desafío no encontrado'
            });
        }

        res.status(200).json({
            success: true,
            data: challenge
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get mentor's challenges
// @route   GET /api/challenges/mentor/my-challenges
// @access  Private (Mentor only)
exports.getMentorChallenges = async (req, res, next) => {
    try {
        const challenges = await Challenge.find({ creator: req.user.id });

        res.status(200).json({
            success: true,
            count: challenges.length,
            data: challenges
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update challenge
// @route   PUT /api/challenges/:id
// @access  Private (Mentor only)
exports.updateChallenge = async (req, res, next) => {
    try {
        let challenge = await Challenge.findById(req.params.id);

        if (!challenge) {
            return res.status(404).json({
                success: false,
                error: 'Desafío no encontrado'
            });
        }

        // Asegurar que solo el mentor creador pueda actualizar el desafío
        if (challenge.creator.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                error: 'No está autorizado para actualizar este desafío. Solo el mentor que lo creó puede modificarlo.'
            });
        }

        challenge = await Challenge.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(200).json({
            success: true,
            data: challenge
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete challenge
// @route   DELETE /api/challenges/:id
// @access  Private (Mentor only)
exports.deleteChallenge = async (req, res, next) => {
    try {
        const challenge = await Challenge.findById(req.params.id);

        if (!challenge) {
            return res.status(404).json({
                success: false,
                error: 'Desafío no encontrado'
            });
        }

        // Asegurar que solo el mentor creador pueda eliminar el desafío
        if (challenge.creator.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                error: 'No está autorizado para eliminar este desafío. Solo el mentor que lo creó puede eliminarlo.'
            });
        }

        await challenge.remove();

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Submit solution to challenge
// @route   POST /api/challenges/:id/submit
// @access  Private
exports.submitSolution = async (req, res, next) => {
    try {
        const challenge = await Challenge.findById(req.params.id);

        if (!challenge) {
            return res.status(404).json({
                success: false,
                error: 'Desafío no encontrado'
            });
        }

        // Check if user is already part of a team that submitted
        const alreadySubmitted = challenge.submissions.some(submission => 
            submission.team.some(member => member.toString() === req.user.id)
        );

        if (alreadySubmitted) {
            return res.status(400).json({
                success: false,
                error: 'Ya has enviado una solución para este desafío'
            });
        }

        // Create submission object
        const submission = {
            team: [req.user.id, ...req.body.teammates || []],
            repositoryUrl: req.body.repositoryUrl,
            comments: req.body.comments
        };

        // Add submission to challenge
        challenge.submissions.push(submission);
        await challenge.save();

        res.status(201).json({
            success: true,
            data: submission
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Review submission
// @route   PUT /api/challenges/:id/submissions/:submissionId
// @access  Private
exports.reviewSubmission = async (req, res, next) => {
    try {
        const challenge = await Challenge.findById(req.params.id);

        if (!challenge) {
            return res.status(404).json({
                success: false,
                error: 'Desafío no encontrado'
            });
        }

        // Make sure user is the challenge creator or an admin
        if (challenge.creator.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'No está autorizado para revisar esta solución'
            });
        }

        // Find submission
        const submission = challenge.submissions.id(req.params.submissionId);

        if (!submission) {
            return res.status(404).json({
                success: false,
                error: 'Solución no encontrada'
            });
        }

        // Update submission
        submission.status = req.body.status;
        submission.feedback = req.body.feedback;

        // If submission is approved, award points to team members
        if (req.body.status === 'Aprobado') {
            const pointsPerMember = Math.floor(challenge.points / submission.team.length);
            
            // Update each team member's points and challenges completed
            for (const memberId of submission.team) {
                await User.findByIdAndUpdate(memberId, {
                    $inc: { 
                        points: pointsPerMember,
                        challengesCompleted: 1
                    }
                });
            }
        }

        await challenge.save();

        res.status(200).json({
            success: true,
            data: submission
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Participate in a challenge
// @route   POST /api/challenges/:id/participate
// @access  Private
exports.participateInChallenge = async (req, res, next) => {
    try {
        const challenge = await Challenge.findById(req.params.id);

        if (!challenge) {
            return res.status(404).json({
                success: false,
                error: 'Desafío no encontrado'
            });
        }

        // Check if user is already participating
        const isParticipating = challenge.participants.some(
            participant => participant.toString() === req.user.id
        );

        if (isParticipating) {
            return res.status(400).json({
                success: false,
                error: 'Ya estás participando en este desafío'
            });
        }

        // Check if challenge is full
        if (challenge.participants.length >= challenge.maxParticipants) {
            return res.status(400).json({
                success: false,
                error: 'El desafío ya está completo'
            });
        }

        // Add user to participants
        challenge.participants.push(req.user.id);
        await challenge.save();

        res.status(200).json({
            success: true,
            data: {
                message: 'Te has unido al desafío exitosamente',
                currentParticipants: challenge.participants.length,
                maxParticipants: challenge.maxParticipants
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get user's participating challenges
// @route   GET /api/challenges/user/participating
// @access  Private
exports.getUserChallenges = async (req, res, next) => {
    try {
        const challenges = await Challenge.find({
            participants: req.user.id,
            isActive: true
        });

        res.status(200).json({
            success: true,
            count: challenges.length,
            data: challenges
        });
    } catch (error) {
        next(error);
    }
};
