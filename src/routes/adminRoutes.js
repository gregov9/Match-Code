const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const jwt = require('jsonwebtoken');
const Admin = require('../models/adminModel');

// Middleware para verificar token de admin
const protectAdmin = async (req, res, next) => {
    try {
        // 1) Verificar si el token existe
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({
                status: 'error',
                message: 'No ha iniciado sesión. Por favor, inicie sesión para obtener acceso.'
            });
        }

        // 2) Verificar token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mi-secreto-super-seguro');

        // 3) Verificar si el admin aún existe
        const admin = await Admin.findById(decoded.id);
        if (!admin) {
            return res.status(401).json({
                status: 'error',
                message: 'El usuario ya no existe.'
            });
        }

        // 4) Guardar admin en req para uso posterior
        req.admin = admin;
        next();
    } catch (error) {
        return res.status(401).json({
            status: 'error',
            message: 'Token inválido o expirado'
        });
    }
};

// Rutas públicas
router.post('/create-admin', adminController.createAdmin);
router.post('/login', adminController.loginAdmin);

// Aplicar protección a todas las rutas siguientes
router.use(protectAdmin);

// Rutas protegidas
router.get('/pending-users', adminController.getPendingUsers);
router.get('/users/:userId', adminController.getUserDetails);
router.patch('/users/:userId/status', adminController.updateUserStatus);
router.get('/stats', adminController.getDashboardStats);
router.get('/mentors', adminController.getMentors);
router.get('/solvers', adminController.getSolvers);

module.exports = router; 