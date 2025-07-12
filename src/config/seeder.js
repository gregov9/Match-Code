const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/userModel');
const Challenge = require('../models/challengeModel');
const Question = require('../models/questionModel');
const Session = require('../models/sessionModel');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Sample data
const users = [
    {
        name: 'Carlos Martínez',
        email: 'carlos@example.com',
        password: '123456',
        bio: 'Desarrollador Full Stack con 5 años de experiencia en React y Node.js',
        skills: [
            { name: 'JavaScript', level: 'Experto' },
            { name: 'React', level: 'Avanzado' },
            { name: 'Node.js', level: 'Avanzado' },
            { name: 'MongoDB', level: 'Intermedio' }
        ],
        interests: ['Desarrollo Web', 'Frontend', 'Backend', 'Bases de Datos'],
        mentorRating: 4.9,
        mentorSessions: 42,
        points: 1250
    },
    {
        name: 'Ana López',
        email: 'ana@example.com',
        password: '123456',
        bio: 'Ingeniera de Software especializada en algoritmos y estructuras de datos',
        skills: [
            { name: 'Python', level: 'Experto' },
            { name: 'Algoritmos', level: 'Experto' },
            { name: 'Java', level: 'Avanzado' },
            { name: 'Machine Learning', level: 'Intermedio' }
        ],
        interests: ['Algoritmos', 'Inteligencia Artificial', 'Ciencia de Datos'],
        mentorRating: 4.8,
        mentorSessions: 38,
        points: 1180
    },
    {
        name: 'Miguel Rodríguez',
        email: 'miguel@example.com',
        password: '123456',
        bio: 'Desarrollador de aplicaciones móviles con experiencia en React Native y Flutter',
        skills: [
            { name: 'React Native', level: 'Experto' },
            { name: 'Flutter', level: 'Avanzado' },
            { name: 'JavaScript', level: 'Avanzado' },
            { name: 'Firebase', level: 'Intermedio' }
        ],
        interests: ['Desarrollo Móvil', 'UX/UI', 'Rendimiento de Apps'],
        mentorRating: 4.7,
        mentorSessions: 35,
        points: 1050
    }
];

const challenges = [
    {
        title: 'Algoritmo de Grafos',
        description: 'Implementa un algoritmo de búsqueda en grafos para encontrar el camino más corto entre dos nodos. Deberás crear una visualización interactiva que muestre cómo funciona el algoritmo paso a paso.',
        difficulty: 'Intermedio',
        skills: ['JavaScript', 'Algoritmos', 'Estructuras de Datos'],
        teamSizeMin: 3,
        teamSizeMax: 4,
        duration: '2 horas',
        points: 150,
        resources: [
            {
                title: 'Introducción a los algoritmos de grafos',
                url: 'https://example.com/graph-algorithms',
                type: 'Artículo'
            },
            {
                title: 'Visualización de algoritmos',
                url: 'https://example.com/algorithm-visualization',
                type: 'Video'
            }
        ]
    },
    {
        title: 'Optimización de Consultas SQL',
        description: 'Mejora el rendimiento de un conjunto de consultas SQL en una base de datos de ejemplo. Deberás analizar las consultas existentes, identificar problemas de rendimiento y proponer soluciones optimizadas.',
        difficulty: 'Básico',
        skills: ['SQL', 'Bases de Datos', 'Optimización'],
        teamSizeMin: 2,
        teamSizeMax: 3,
        duration: '1 hora',
        points: 100,
        resources: [
            {
                title: 'Fundamentos de optimización SQL',
                url: 'https://example.com/sql-optimization',
                type: 'Documentación'
            }
        ]
    },
    {
        title: 'Desarrollo de API RESTful',
        description: 'Diseña e implementa una API RESTful para un sistema de gestión de tareas. Deberás crear endpoints para crear, leer, actualizar y eliminar tareas, así como implementar autenticación y autorización.',
        difficulty: 'Avanzado',
        skills: ['Node.js', 'Express', 'MongoDB', 'REST API'],
        teamSizeMin: 2,
        teamSizeMax: 4,
        duration: '3 horas',
        points: 200,
        resources: [
            {
                title: 'Diseño de APIs RESTful',
                url: 'https://example.com/restful-design',
                type: 'Artículo'
            },
            {
                title: 'Autenticación con JWT',
                url: 'https://example.com/jwt-auth',
                type: 'Video'
            }
        ]
    }
];

const questions = [
    {
        title: '¿Cómo implementar autenticación con JWT en React?',
        content: 'Estoy desarrollando una aplicación en React y necesito implementar autenticación usando JWT (JSON Web Tokens). ¿Alguien podría explicarme el flujo completo desde el login hasta la protección de rutas?',
        tags: ['React', 'JWT', 'Autenticación', 'JavaScript'],
        codeSnippet: `// Este es mi componente de login actual
function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    // ¿Cómo implemento la autenticación aquí?
  }
  
  return (
    <form onSubmit={handleSubmit}>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button type="submit">Login</button>
    </form>
  );
}`
    },
    {
        title: 'Problema con algoritmo de ordenamiento en Python',
        content: 'Estoy implementando el algoritmo QuickSort en Python pero tengo problemas con el rendimiento en ciertos casos. ¿Alguien puede ayudarme a optimizarlo?',
        tags: ['Python', 'Algoritmos', 'QuickSort', 'Optimización'],
        codeSnippet: `def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)

# Este algoritmo es lento con arrays grandes
# ¿Cómo puedo mejorarlo?`
    }
];

// Import data to database
const importData = async () => {
    try {
        // Clear existing data
        await User.deleteMany();
        await Challenge.deleteMany();
        await Question.deleteMany();
        await Session.deleteMany();

        // Create users
        const createdUsers = await User.create(users);
        console.log(`${createdUsers.length} usuarios creados`);

        // Add creator to challenges
        const challengesWithCreator = challenges.map(challenge => {
            return { ...challenge, creator: createdUsers[0]._id };
        });

        // Create challenges
        const createdChallenges = await Challenge.create(challengesWithCreator);
        console.log(`${createdChallenges.length} desafíos creados`);

        // Add author to questions
        const questionsWithAuthor = questions.map((question, index) => {
            return { ...question, author: createdUsers[index % createdUsers.length]._id };
        });

        // Create questions
        const createdQuestions = await Question.create(questionsWithAuthor);
        console.log(`${createdQuestions.length} preguntas creadas`);

        // Add answers to first question
        const firstQuestion = await Question.findById(createdQuestions[0]._id);
        
        firstQuestion.answers.push({
            content: 'Para implementar autenticación con JWT en React, primero necesitas configurar tu backend para generar tokens JWT cuando un usuario se autentica correctamente. Luego, en el frontend, debes almacenar ese token (localStorage o cookies) y enviarlo en las cabeceras de tus peticiones HTTP.',
            author: createdUsers[1]._id,
            codeSnippet: `// Backend (Node.js con Express)
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  // Verificar credenciales
  const user = await User.findOne({ email });
  if (!user || !await user.matchPassword(password)) {
    return res.status(401).json({ message: 'Credenciales inválidas' });
  }
  
  // Generar token
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
  
  res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
});

// Frontend (React)
const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    const res = await axios.post('/api/login', { email, password });
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    // Redirigir al usuario
    history.push('/dashboard');
  } catch (error) {
    setError('Credenciales inválidas');
  }
}`
        });
        
        await firstQuestion.save();
        console.log('Respuestas añadidas a la primera pregunta');

        console.log('Datos importados correctamente');
        process.exit();
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

// Delete all data
const destroyData = async () => {
    try {
        await User.deleteMany();
        await Challenge.deleteMany();
        await Question.deleteMany();
        await Session.deleteMany();

        console.log('Datos eliminados correctamente');
        process.exit();
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

// Check command line arguments
if (process.argv[2] === '-d') {
    destroyData();
} else {
    importData();
}
