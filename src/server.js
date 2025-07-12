const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const connectDB = require('./config/db');
const dotenv = require('dotenv');
const userRoutes = require('./routes/userRoutes');
const challengeRoutes = require('./routes/challengeRoutes');
const questionRoutes = require('./routes/questionRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const adminRoutes = require('./routes/adminRoutes');
const configRoutes = require('./routes/configRoutes');

// Load environment variables
dotenv.config();

// Connect to database
connectDB();

// Initialize express app
const app = express();

// Middleware básico
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Static files - Servir archivos estáticos
app.use(express.static(path.join(__dirname, '../public')));

// Middleware de logging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

// API Routes
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/config', configRoutes);

// API error handler
app.use('/api', (err, req, res, next) => {
    console.error('API Error:', err);
    res.status(err.status || 500).json({
        status: 'error',
        message: err.message || 'Error interno del servidor'
    });
});

// API 404 handler - Para rutas API no encontradas
app.use('/api/*', (req, res) => {
    res.status(404).json({
        status: 'error',
        message: 'API endpoint no encontrado'
    });
});

// HTML5 History Mode - Para rutas que no son API
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, '../public/index.html'));
    }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
