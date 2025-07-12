const Session = require('../models/sessionModel');
const User = require('../models/userModel');

// @desc    Create a new mentoring session
// @route   POST /api/sessions
// @access  Private
exports.createSession = async (req, res, next) => {
    try {
        // Add mentee (current user) to request body
        req.body.mentee = req.user.id;

        // Check if mentor exists
        const mentor = await User.findById(req.body.mentor);
        if (!mentor) {
            return res.status(404).json({
                success: false,
                error: 'Mentor no encontrado'
            });
        }

        // Check if mentor and mentee are the same user
        if (req.body.mentor === req.user.id) {
            return res.status(400).json({
                success: false,
                error: 'No puedes agendar una sesión contigo mismo'
            });
        }

        const session = await Session.create(req.body);

        res.status(201).json({
            success: true,
            data: session
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all sessions for current user (as mentor or mentee)
// @route   GET /api/sessions
// @access  Private
exports.getMySessions = async (req, res, next) => {
    try {
        const { role, status } = req.query;
        let query = {};

        // Filter by role (mentor or mentee)
        if (role === 'mentor') {
            query.mentor = req.user.id;
        } else if (role === 'mentee') {
            query.mentee = req.user.id;
        } else {
            // If no role specified, get all sessions where user is either mentor or mentee
            query = {
                $or: [
                    { mentor: req.user.id },
                    { mentee: req.user.id }
                ]
            };
        }

        // Filter by status
        if (status) {
            query.status = status;
        }

        // Execute query with pagination
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const startIndex = (page - 1) * limit;
        const total = await Session.countDocuments(query);

        const sessions = await Session.find(query)
            .sort({ date: 1 })
            .skip(startIndex)
            .limit(limit);

        // Pagination result
        const pagination = {};

        if (startIndex + limit < total) {
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
            count: sessions.length,
            pagination,
            data: sessions
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get session by ID
// @route   GET /api/sessions/:id
// @access  Private
exports.getSessionById = async (req, res, next) => {
    try {
        const session = await Session.findById(req.params.id);

        if (!session) {
            return res.status(404).json({
                success: false,
                error: 'Sesión no encontrada'
            });
        }

        // Make sure user is part of the session
        if (session.mentor.toString() !== req.user.id && session.mentee.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                error: 'No está autorizado para ver esta sesión'
            });
        }

        res.status(200).json({
            success: true,
            data: session
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update session status
// @route   PUT /api/sessions/:id/status
// @access  Private
exports.updateSessionStatus = async (req, res, next) => {
    try {
        const session = await Session.findById(req.params.id);

        if (!session) {
            return res.status(404).json({
                success: false,
                error: 'Sesión no encontrada'
            });
        }

        // Make sure user is part of the session
        if (session.mentor.toString() !== req.user.id && session.mentee.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                error: 'No está autorizado para actualizar esta sesión'
            });
        }

        // Only mentor can confirm or cancel a pending session
        if ((req.body.status === 'Confirmada' || req.body.status === 'Cancelada') && 
            session.status === 'Pendiente' && 
            req.user.id !== session.mentor.toString()) {
            return res.status(403).json({
                success: false,
                error: 'Solo el mentor puede confirmar o cancelar una sesión pendiente'
            });
        }

        // Update session status
        session.status = req.body.status;

        // If adding a meeting link
        if (req.body.meetingLink) {
            session.meetingLink = req.body.meetingLink;
        }

        await session.save();

        res.status(200).json({
            success: true,
            data: session
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Add review to session
// @route   PUT /api/sessions/:id/review
// @access  Private
exports.addSessionReview = async (req, res, next) => {
    try {
        const session = await Session.findById(req.params.id);

        if (!session) {
            return res.status(404).json({
                success: false,
                error: 'Sesión no encontrada'
            });
        }

        // Check if session is completed
        if (session.status !== 'Completada') {
            return res.status(400).json({
                success: false,
                error: 'Solo se pueden añadir reseñas a sesiones completadas'
            });
        }

        // Check if user is part of the session
        const isMentor = session.mentor.toString() === req.user.id;
        const isMentee = session.mentee.toString() === req.user.id;

        if (!isMentor && !isMentee) {
            return res.status(403).json({
                success: false,
                error: 'No está autorizado para añadir una reseña a esta sesión'
            });
        }

        // Add review based on user role
        if (isMentor) {
            session.menteeRating = req.body.rating;
            session.menteeReview = req.body.review;
        } else {
            session.mentorRating = req.body.rating;
            session.mentorReview = req.body.review;

            // Update mentor stats
            await session.updateMentorStats();
        }

        await session.save();

        res.status(200).json({
            success: true,
            data: session
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get available mentors
// @route   GET /api/sessions/available-mentors
// @access  Private
exports.getAvailableMentors = async (req, res, next) => {
    try {
        // Find users with mentoring experience or skills matching the query
        let query = {
            _id: { $ne: req.user.id } // Exclude current user
        };

        // Filter by skills if provided
        if (req.query.skills) {
            const skills = req.query.skills.split(',');
            query['skills.name'] = { $in: skills };
        }

        const mentors = await User.find(query)
            .sort({ mentorRating: -1, mentorSessions: -1 })
            .limit(20)
            .select('name avatar bio skills mentorRating mentorSessions');

        res.status(200).json({
            success: true,
            count: mentors.length,
            data: mentors
        });
    } catch (error) {
        next(error);
    }
};
