const mongoose = require('mongoose');
const Admin = require('../models/adminModel');

const MONGODB_URI = 'mongodb+srv://matchcode:ZnVEdiiY7geZBBMP@cluster0.dxhhv6c.mongodb.net/matchcode?retryWrites=true&w=majority';

const createAdmin = async () => {
    try {
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log('Conectado a MongoDB');

        // Crear un nuevo administrador
        const adminData = {
            name: 'Administrador Principal',
            email: 'admin@matchcode.com',
            password: 'Admin123!'
        };

        const admin = await Admin.create(adminData);
        console.log('Administrador creado exitosamente:', admin.email);
        
    } catch (error) {
        console.error('Error al crear el administrador:', error);
    } finally {
        await mongoose.connection.close();
    }
};

createAdmin(); 