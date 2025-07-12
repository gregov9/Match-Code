const express = require('express');
const router = express.Router();
const { getConfig, updateConfig } = require('../controllers/configController');
const { protectAdmin } = require('../middleware/authMiddleware');

// Rutas protegidas - solo admin
router.get('/', getConfig);
router.put('/', protectAdmin, updateConfig);

module.exports = router; 