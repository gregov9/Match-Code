const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const Admin = require('../models/adminModel');

// Protect routes
const protect = async (req, res, next) => {
    let token;

    // Check if token exists in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        // Get token from header
        token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
        return res.status(401).json({
            status: 'error',
            message: 'No está autorizado para acceder a esta ruta'
        });
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mi-secreto-super-seguro');

        // Get user from the token and select necessary fields
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
            return res.status(401).json({
                status: 'error',
                message: 'Usuario no encontrado'
            });
        }

        // Add user to request object
        req.user = {
            _id: user._id,
            id: user._id, // Agregar ambos para compatibilidad
            name: user.name,
            email: user.email,
            role: user.role
        };
        
        next();
    } catch (error) {
        console.error('Error en autenticación:', error);
        return res.status(401).json({
            status: 'error',
            message: 'No está autorizado para acceder a esta ruta'
        });
    }
};

// Protect admin routes
const protectAdmin = async (req, res, next) => {
    let token;

    // Check if token exists in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        // Get token from header
        token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'No está autorizado para acceder a esta ruta'
        });
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get admin from the token
        const admin = await Admin.findById(decoded.id);
        
        if (!admin) {
            return res.status(401).json({
                success: false,
                error: 'No está autorizado para acceder a esta ruta de administrador'
            });
        }

        req.admin = admin;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            error: 'No está autorizado para acceder a esta ruta'
        });
    }
};

// Grant access to specific roles
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'No está autorizado para acceder a esta ruta'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: 'No tiene permiso para realizar esta acción'
            });
        }

        next();
    };
};

module.exports = {
    protect,
    protectAdmin,
    authorize
};
