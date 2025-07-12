const Config = require('../models/configModel');

// Obtener la configuración actual
const getConfig = async (req, res) => {
    try {
        let config = await Config.findOne();
        if (!config) {
            return res.status(404).json({
                success: false,
                message: 'No se encontró configuración'
            });
        }
        res.json({
            success: true,
            data: config
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener la configuración',
            error: error.message
        });
    }
};

// Actualizar la configuración
const updateConfig = async (req, res) => {
    try {
        const { pagoMovil } = req.body;
        
        let config = await Config.findOne();
        
        if (!config) {
            // Si no existe, crear nueva configuración
            config = new Config({
                pagoMovil
            });
        } else {
            // Si existe, actualizar
            config.pagoMovil = pagoMovil;
        }

        await config.save();

        res.json({
            success: true,
            message: 'Configuración actualizada exitosamente',
            data: config
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al actualizar la configuración',
            error: error.message
        });
    }
};

module.exports = {
    getConfig,
    updateConfig
}; 