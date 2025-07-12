const express = require('express');
const router = express.Router();
const {
    createSession,
    getMySessions,
    getSessionById,
    updateSessionStatus,
    addSessionReview,
    getAvailableMentors
} = require('../controllers/sessionController');
const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// Session routes
router.post('/', createSession);
router.get('/', getMySessions);
router.get('/available-mentors', getAvailableMentors);
router.get('/:id', getSessionById);
router.put('/:id/status', updateSessionStatus);
router.put('/:id/review', addSessionReview);

module.exports = router;
