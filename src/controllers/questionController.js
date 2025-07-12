const Question = require('../models/questionModel');
const User = require('../models/userModel');

// @desc    Create a new question
// @route   POST /api/questions
// @access  Private
exports.createQuestion = async (req, res, next) => {
    try {
        // Add author (current user) to request body
        req.body.author = req.user.id;

        const question = await Question.create(req.body);

        // Find experts for this question based on tags
        await Question.findExperts(question._id);

        // Reload question with populated fields
        const populatedQuestion = await Question.findById(question._id);

        res.status(201).json({
            success: true,
            data: populatedQuestion
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all questions
// @route   GET /api/questions
// @access  Public
exports.getQuestions = async (req, res, next) => {
    try {
        // Build query
        let query = Question.find();

        // Filter by tags
        if (req.query.tags) {
            const tags = req.query.tags.split(',');
            query = query.find({ tags: { $in: tags } });
        }

        // Filter by status
        if (req.query.status) {
            query = query.find({ status: req.query.status });
        }

        // Filter by author
        if (req.query.author) {
            query = query.find({ author: req.query.author });
        }

        // Search by title or content
        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, 'i');
            query = query.find({
                $or: [
                    { title: searchRegex },
                    { content: searchRegex }
                ]
            });
        }

        // Pagination
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const total = await Question.countDocuments(query);

        query = query.skip(startIndex).limit(limit);

        // Sort
        if (req.query.sort) {
            const sortBy = req.query.sort.split(',').join(' ');
            query = query.sort(sortBy);
        } else {
            query = query.sort('-createdAt');
        }

        // Execute query
        const questions = await query;

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
            count: questions.length,
            pagination,
            data: questions
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get question by ID
// @route   GET /api/questions/:id
// @access  Public
exports.getQuestionById = async (req, res, next) => {
    try {
        const question = await Question.findById(req.params.id);

        if (!question) {
            return res.status(404).json({
                success: false,
                error: 'Pregunta no encontrada'
            });
        }

        // Increment view count
        question.views += 1;
        await question.save();

        res.status(200).json({
            success: true,
            data: question
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update question
// @route   PUT /api/questions/:id
// @access  Private
exports.updateQuestion = async (req, res, next) => {
    try {
        let question = await Question.findById(req.params.id);

        if (!question) {
            return res.status(404).json({
                success: false,
                error: 'Pregunta no encontrada'
            });
        }

        // Make sure user is the question author
        if (question.author.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                error: 'No está autorizado para actualizar esta pregunta'
            });
        }

        // Update allowed fields only
        const allowedUpdates = ['title', 'content', 'tags', 'codeSnippet'];
        const updates = {};

        Object.keys(req.body).forEach(key => {
            if (allowedUpdates.includes(key)) {
                updates[key] = req.body[key];
            }
        });

        question = await Question.findByIdAndUpdate(req.params.id, updates, {
            new: true,
            runValidators: true
        });

        // If tags were updated, find new experts
        if (req.body.tags) {
            await Question.findExperts(question._id);
            question = await Question.findById(question._id);
        }

        res.status(200).json({
            success: true,
            data: question
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete question
// @route   DELETE /api/questions/:id
// @access  Private
exports.deleteQuestion = async (req, res, next) => {
    try {
        const question = await Question.findById(req.params.id);

        if (!question) {
            return res.status(404).json({
                success: false,
                error: 'Pregunta no encontrada'
            });
        }

        // Make sure user is the question author or an admin
        if (question.author.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'No está autorizado para eliminar esta pregunta'
            });
        }

        await question.remove();

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Add answer to question
// @route   POST /api/questions/:id/answers
// @access  Private
exports.addAnswer = async (req, res, next) => {
    try {
        const question = await Question.findById(req.params.id);

        if (!question) {
            return res.status(404).json({
                success: false,
                error: 'Pregunta no encontrada'
            });
        }

        // Create answer object
        const answer = {
            content: req.body.content,
            author: req.user.id,
            codeSnippet: req.body.codeSnippet
        };

        // Add answer to question
        question.answers.push(answer);
        await question.save();

        // Reload question to get populated fields
        const updatedQuestion = await Question.findById(question._id);

        res.status(201).json({
            success: true,
            data: updatedQuestion.answers[updatedQuestion.answers.length - 1]
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update answer
// @route   PUT /api/questions/:id/answers/:answerId
// @access  Private
exports.updateAnswer = async (req, res, next) => {
    try {
        const question = await Question.findById(req.params.id);

        if (!question) {
            return res.status(404).json({
                success: false,
                error: 'Pregunta no encontrada'
            });
        }

        // Find answer
        const answer = question.answers.id(req.params.answerId);

        if (!answer) {
            return res.status(404).json({
                success: false,
                error: 'Respuesta no encontrada'
            });
        }

        // Make sure user is the answer author
        if (answer.author.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                error: 'No está autorizado para actualizar esta respuesta'
            });
        }

        // Update answer
        answer.content = req.body.content || answer.content;
        if (req.body.codeSnippet !== undefined) {
            answer.codeSnippet = req.body.codeSnippet;
        }

        await question.save();

        res.status(200).json({
            success: true,
            data: answer
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete answer
// @route   DELETE /api/questions/:id/answers/:answerId
// @access  Private
exports.deleteAnswer = async (req, res, next) => {
    try {
        const question = await Question.findById(req.params.id);

        if (!question) {
            return res.status(404).json({
                success: false,
                error: 'Pregunta no encontrada'
            });
        }

        // Find answer
        const answer = question.answers.id(req.params.answerId);

        if (!answer) {
            return res.status(404).json({
                success: false,
                error: 'Respuesta no encontrada'
            });
        }

        // Make sure user is the answer author or an admin
        if (answer.author.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'No está autorizado para eliminar esta respuesta'
            });
        }

        // Remove answer
        answer.remove();
        await question.save();

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Accept answer
// @route   PUT /api/questions/:id/answers/:answerId/accept
// @access  Private
exports.acceptAnswer = async (req, res, next) => {
    try {
        const question = await Question.findById(req.params.id);

        if (!question) {
            return res.status(404).json({
                success: false,
                error: 'Pregunta no encontrada'
            });
        }

        // Make sure user is the question author
        if (question.author.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                error: 'Solo el autor de la pregunta puede aceptar una respuesta'
            });
        }

        // Find answer
        const answer = question.answers.id(req.params.answerId);

        if (!answer) {
            return res.status(404).json({
                success: false,
                error: 'Respuesta no encontrada'
            });
        }

        // Reset any previously accepted answers
        question.answers.forEach(a => {
            a.isAccepted = false;
        });

        // Mark this answer as accepted
        answer.isAccepted = true;

        // Update question status
        question.status = 'Resuelta';

        await question.save();

        // Update points for accepted answer
        await question.updatePointsForAcceptedAnswer(answer._id);

        res.status(200).json({
            success: true,
            data: answer
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Vote on question
// @route   PUT /api/questions/:id/vote
// @access  Private
exports.voteQuestion = async (req, res, next) => {
    try {
        const question = await Question.findById(req.params.id);

        if (!question) {
            return res.status(404).json({
                success: false,
                error: 'Pregunta no encontrada'
            });
        }

        // Update vote count
        question.votes += req.body.value;

        await question.save();

        res.status(200).json({
            success: true,
            data: {
                votes: question.votes
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Vote on answer
// @route   PUT /api/questions/:id/answers/:answerId/vote
// @access  Private
exports.voteAnswer = async (req, res, next) => {
    try {
        const question = await Question.findById(req.params.id);

        if (!question) {
            return res.status(404).json({
                success: false,
                error: 'Pregunta no encontrada'
            });
        }

        // Find answer
        const answer = question.answers.id(req.params.answerId);

        if (!answer) {
            return res.status(404).json({
                success: false,
                error: 'Respuesta no encontrada'
            });
        }

        // Update vote count
        answer.votes += req.body.value;

        await question.save();

        res.status(200).json({
            success: true,
            data: {
                votes: answer.votes
            }
        });
    } catch (error) {
        next(error);
    }
};
