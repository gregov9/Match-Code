const express = require('express');
const router = express.Router();
const {
    createQuestion,
    getQuestions,
    getQuestionById,
    updateQuestion,
    deleteQuestion,
    addAnswer,
    updateAnswer,
    deleteAnswer,
    acceptAnswer,
    voteQuestion,
    voteAnswer
} = require('../controllers/questionController');
const { protect } = require('../middleware/authMiddleware');

// Public routes
router.get('/', getQuestions);
router.get('/:id', getQuestionById);

// Protected routes
router.post('/', protect, createQuestion);
router.put('/:id', protect, updateQuestion);
router.delete('/:id', protect, deleteQuestion);

// Answer routes
router.post('/:id/answers', protect, addAnswer);
router.put('/:id/answers/:answerId', protect, updateAnswer);
router.delete('/:id/answers/:answerId', protect, deleteAnswer);
router.put('/:id/answers/:answerId/accept', protect, acceptAnswer);

// Voting routes
router.put('/:id/vote', protect, voteQuestion);
router.put('/:id/answers/:answerId/vote', protect, voteAnswer);

module.exports = router;
