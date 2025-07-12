const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Function to check database connection
const checkDBConnection = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        console.log('La conexión a la base de datos es correcta');
        
        // Close connection after check
        await mongoose.connection.close();
        console.log('Conexión cerrada');
        
        return true;
    } catch (error) {
        console.error(`Error de conexión a MongoDB: ${error.message}`);
        return false;
    }
};

// Execute if this file is run directly
if (require.main === module) {
    checkDBConnection()
        .then(result => {
            if (result) {
                console.log('✅ Conexión exitosa a la base de datos');
            } else {
                console.log('❌ Error al conectar a la base de datos');
            }
            process.exit(result ? 0 : 1);
        });
}

module.exports = checkDBConnection;
