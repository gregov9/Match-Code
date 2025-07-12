const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    registerUser,
    loginUser,
    getUserProfile,
    updateProfile,
    uploadNewAvatar
} = require('../controllers/userController');

// Rutas públicas
router.post('/register', registerUser);
router.post('/login', loginUser);

// Rutas protegidas
router.get('/me', protect, getUserProfile);
router.put('/profile', protect, updateProfile);
router.post('/upload-avatar', protect, uploadNewAvatar);

module.exports = router;
