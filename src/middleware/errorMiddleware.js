const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    // Error de MongoDB por ID inválido
    if (err.name === 'CastError') {
        return res.status(400).json({
            status: 'error',
            message: 'Recurso no encontrado'
        });
    }

    // Error de validación de MongoDB
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map(val => val.message).join(', ');
        return res.status(400).json({
            status: 'error',
            message
        });
    }

    // Error de duplicado de MongoDB
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return res.status(400).json({
            status: 'error',
            message: `El ${field} ya está en uso`
        });
    }

    // Error de JWT
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            status: 'error',
            message: 'Token inválido'
        });
    }

    // Error de expiración de JWT
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            status: 'error',
            message: 'Token expirado'
        });
    }

    // Error por defecto
    res.status(err.statusCode || 500).json({
        status: 'error',
        message: err.message || 'Error interno del servidor'
    });
}; 