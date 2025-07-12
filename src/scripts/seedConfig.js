const mongoose = require('mongoose');
const Config = require('../models/configModel');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config();

// Conectar a la base de datos
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Conectado a MongoDB'))
    .catch(err => console.error('Error conectando a MongoDB:', err));

// Configuración inicial
const initialConfig = {
    pagoMovil: {
        banco: "Banesco",
        telefono: "0414-1234567",
        cedula: "V-12345678",
        nombreBeneficiario: "Match Code"
    }
};

async function seedConfig() {
    try {
        // Eliminar configuración existente
        await Config.deleteMany({});

        // Crear nueva configuración
        const config = await Config.create(initialConfig);

        console.log('Configuración inicial creada:', config);
        process.exit(0);
    } catch (error) {
        console.error('Error al crear la configuración inicial:', error);
        process.exit(1);
    }
}

seedConfig(); 