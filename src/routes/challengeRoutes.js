const express = require('express');
const router = express.Router();
const {
    createChallenge,
    getChallenges,
    getChallengeById,
    updateChallenge,
    deleteChallenge,
    submitSolution,
    reviewSubmission,
    participateInChallenge,
    getUserChallenges,
    getMentorChallenges
} = require('../controllers/challengeController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public routes
router.get('/', getChallenges);
router.get('/:id', getChallengeById);

// Protected routes - Solo para mentores
router.post('/', protect, authorize('mentor'), createChallenge);
router.put('/:id', protect, authorize('mentor'), updateChallenge);
router.delete('/:id', protect, authorize('mentor'), deleteChallenge);
router.get('/mentor/my-challenges', protect, authorize('mentor'), getMentorChallenges);

// Rutas específicas (deben ir antes de las rutas con parámetros)
router.get('/user/participating', protect, getUserChallenges);

// Rutas para participantes
router.post('/:id/submit', protect, submitSolution);
router.put('/:id/submissions/:submissionId', protect, authorize('mentor'), reviewSubmission);
router.post('/:id/participate', protect, participateInChallenge);

module.exports = router;
