const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Challenge = require('../models/challengeModel');
const User = require('../models/userModel');

// Load environment variables
dotenv.config();

// Connect to database
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
});

// Create admin user if not exists (to use as creator for challenges)
const createAdminUser = async () => {
    try {
        let admin = await User.findOne({ email: 'admin@matchcode.com' });
        
        if (!admin) {
            admin = await User.create({
                name: 'Admin',
                email: 'admin@matchcode.com',
                password: 'Admin123!',
                role: 'admin'
            });
            console.log('Admin user created');
        }
        
        return admin;
    } catch (error) {
        console.error('Error creating admin user:', error);
        process.exit(1);
    }
};

// Seed challenges
const seedChallenges = async () => {
    try {
        // Delete existing challenges
        await Challenge.deleteMany({});
        console.log('Existing challenges deleted');
        
        // Get admin user
        const admin = await createAdminUser();
        
        // Create challenges
        const challenges = [
            {
                title: 'Algoritmo de Grafos',
                description: 'Implementa un algoritmo de búsqueda en grafos para encontrar el camino más corto.',
                difficulty: 'Intermedio',
                skills: ['Algoritmos', 'Estructuras de Datos', 'JavaScript'],
                teamSizeMin: 3,
                teamSizeMax: 4,
                duration: '2 horas',
                points: 150,
                creator: admin._id,
                resources: [
                    {
                        title: 'Algoritmos de Grafos',
                        url: 'https://www.geeksforgeeks.org/graph-data-structure-and-algorithms/',
                        type: 'Artículo'
                    },
                    {
                        title: 'Algoritmo de Dijkstra',
                        url: 'https://www.youtube.com/watch?v=XB4MIexjvY0',
                        type: 'Video'
                    }
                ]
            },
            {
                title: 'Optimización de Consultas SQL',
                description: 'Mejora el rendimiento de consultas SQL en una base de datos de ejemplo.',
                difficulty: 'Básico',
                skills: ['SQL', 'Bases de Datos', 'Optimización'],
                teamSizeMin: 2,
                teamSizeMax: 3,
                duration: '1 hora',
                points: 100,
                creator: admin._id,
                resources: [
                    {
                        title: 'Optimización de Consultas SQL',
                        url: 'https://www.sqlshack.com/query-optimization-techniques-in-sql-server-tips-and-tricks/',
                        type: 'Artículo'
                    }
                ]
            },
            {
                title: 'Desarrollo de API RESTful',
                description: 'Diseña e implementa una API RESTful para un sistema de gestión de tareas.',
                difficulty: 'Avanzado',
                skills: ['Node.js', 'Express', 'MongoDB', 'API'],
                teamSizeMin: 2,
                teamSizeMax: 4,
                duration: '3 horas',
                points: 200,
                creator: admin._id,
                resources: [
                    {
                        title: 'RESTful API Design',
                        url: 'https://restfulapi.net/',
                        type: 'Documentación'
                    },
                    {
                        title: 'Building RESTful APIs with Node.js and Express',
                        url: 'https://www.youtube.com/watch?v=pKd0Rpw7O48',
                        type: 'Video'
                    }
                ]
            }
        ];
        
        // Insert challenges
        await Challenge.insertMany(challenges);
        console.log('Challenges seeded successfully');
        
        // Exit process
        process.exit(0);
    } catch (error) {
        console.error('Error seeding challenges:', error);
        process.exit(1);
    }
};

// Run seed function
seedChallenges();
