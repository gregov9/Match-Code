const User = require('../models/userModel');
const Admin = require('../models/adminModel');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

// Configuración del transportador de correo (igual que en userController)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'paulbrock060@gmail.com',
        pass: process.env.EMAIL_PASS || 'fadoefhzkogyuaee'
    }
});

// Función para enviar correo (igual que en userController)
const sendEmail = async (to, subject, text) => {
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER || 'paulbrock060@gmail.com',
            to,
            subject,
            text
        });
        console.log('Correo enviado exitosamente');
    } catch (error) {
        console.error('Error al enviar correo:', error);
    }
};

// Generar Token JWT
const signToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'mi-secreto-super-seguro', {
        expiresIn: process.env.JWT_EXPIRES_IN || '1d'
    });
};

// Obtener todos los mentores
exports.getMentors = async (req, res) => {
    try {
        console.log('Buscando mentores aprobados...');
        
        const query = { 
            role: 'mentor',
            approvalStatus: 'approved'
        };
        console.log('Query:', query);

        const mentors = await User.find(query).select('-password');
        console.log(`Se encontraron ${mentors.length} mentores`);

        // Agregar datos adicionales para cada mentor
        const mentorsWithStats = await Promise.all(mentors.map(async (mentor) => {
            console.log('Procesando mentor:', mentor._id);
            return {
                id: mentor._id,
                name: mentor.name || 'Sin nombre',
                email: mentor.email || 'Sin email',
                specialty: mentor.skills && mentor.skills.length > 0 
                    ? mentor.skills.map(skill => skill.name).join(', ') 
                    : 'No especificada',
                sessions: mentor.mentorSessions || 0,
                rating: mentor.mentorRating || 0,
                status: 'Activo', // Por ahora todos los aprobados son activos
                bio: mentor.bio || 'Sin biografía'
            };
        }));

        console.log('Enviando respuesta con mentores procesados');
        res.status(200).json({
            status: 'success',
            results: mentorsWithStats.length,
            data: mentorsWithStats
        });
    } catch (error) {
        console.error('Error en getMentors:', error);
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
};

// Obtener todos los solucionadores
exports.getSolvers = async (req, res) => {
    try {
        const solvers = await User.find({ 
            role: 'solucionador',
            approvalStatus: 'approved'
        }).select('-password');

        // Agregar datos adicionales para cada solucionador
        const solversWithStats = await Promise.all(solvers.map(async (solver) => {
            // Aquí podrías agregar lógica para obtener estadísticas específicas de cada solucionador
            return {
                id: solver._id,
                name: solver.name,
                email: solver.email,
                completedChallenges: 0, // Aquí deberías obtener el número real de desafíos completados
                points: 0, // Aquí deberías obtener los puntos reales
                level: 1, // Aquí deberías calcular el nivel real
                status: solver.active ? 'Activo' : 'Inactivo'
            };
        }));

        res.status(200).json({
            status: 'success',
            results: solversWithStats.length,
            data: solversWithStats
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
};

// Obtener estadísticas del dashboard
exports.getDashboardStats = async (req, res) => {
    try {
        const stats = await User.aggregate([
            {
                $group: {
                    _id: null,
                    totalUsers: { $sum: 1 },
                    mentorsCount: {
                        $sum: {
                            $cond: [
                                { $and: [
                                    { $eq: ['$role', 'mentor'] },
                                    { $eq: ['$approvalStatus', 'approved'] }
                                ]},
                                1,
                                0
                            ]
                        }
                    },
                    solversCount: {
                        $sum: {
                            $cond: [
                                { $and: [
                                    { $eq: ['$role', 'solucionador'] },
                                    { $eq: ['$approvalStatus', 'approved'] }
                                ]},
                                1,
                                0
                            ]
                        }
                    },
                    pendingCount: {
                        $sum: {
                            $cond: [{ $eq: ['$approvalStatus', 'pending'] }, 1, 0]
                        }
                    }
                }
            }
        ]);

        // Si no hay estadísticas, devolver valores por defecto
        const defaultStats = {
            totalUsers: 0,
            mentorsCount: 0,
            solversCount: 0,
            pendingCount: 0
        };

        res.status(200).json({
            status: 'success',
            data: stats[0] || defaultStats
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
};

// Crear usuario administrador
exports.createAdmin = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Verificar si ya existe un admin con ese email
        const existingAdmin = await Admin.findOne({ email });
        if (existingAdmin) {
            return res.status(400).json({
                status: 'error',
                message: 'Ya existe un administrador con ese email'
            });
        }

        const admin = await Admin.create({
            name,
            email,
            password
        });

        // Generar token
        const token = signToken(admin._id);

        // Remover el password de la respuesta
        admin.password = undefined;

        res.status(201).json({
            status: 'success',
            token,
            data: admin
        });
    } catch (error) {
        console.error('Error al crear admin:', error);
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
};

// Login de administrador
exports.loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Verificar si se proporcionó email y password
        if (!email || !password) {
            return res.status(400).json({
                status: 'error',
                message: 'Por favor proporcione email y contraseña'
            });
        }

        // Buscar admin y seleccionar explícitamente el password
        const admin = await Admin.findOne({ email }).select('+password');

        // Verificar si el admin existe y la contraseña es correcta
        if (!admin || !(await admin.correctPassword(password, admin.password))) {
            return res.status(401).json({
                status: 'error',
                message: 'Email o contraseña incorrectos'
            });
        }

        // Actualizar último login
        admin.lastLogin = Date.now();
        await admin.save({ validateBeforeSave: false });

        // Generar token
        const token = signToken(admin._id);

        // Remover el password de la respuesta
        admin.password = undefined;

        res.status(200).json({
            status: 'success',
            token,
            data: {
                admin
            }
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
};

// Obtener todos los usuarios pendientes de aprobación
exports.getPendingUsers = async (req, res) => {
    try {
        const pendingUsers = await User.find({ 
            approvalStatus: 'pending',
            role: { $in: ['mentor', 'solucionador'] }
        }).select('-password');

        res.status(200).json({
            status: 'success',
            results: pendingUsers.length,
            data: pendingUsers
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
};

// Aprobar o rechazar un usuario
exports.updateUserStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const { status, message } = req.body;

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({
                status: 'error',
                message: 'Estado no válido. Debe ser "approved" o "rejected"'
            });
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { approvalStatus: status },
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'Usuario no encontrado'
            });
        }

        // Enviar correo de notificación
        let emailSubject, emailText;
        if (status === 'approved') {
            emailSubject = '¡Tu cuenta ha sido aprobada!';
            emailText = `Hola ${user.name},\n\n¡Felicitaciones! Tu cuenta como ${user.role} ha sido aprobada. Ya puedes iniciar sesión en la plataforma y comenzar a utilizar todas las funcionalidades.\n\nSaludos cordiales`;
        } else {
            emailSubject = 'Actualización sobre tu solicitud de cuenta';
            emailText = `Hola ${user.name},\n\nLamentamos informarte que tu solicitud para ser ${user.role} ha sido rechazada.\n\n${message || 'Si tienes alguna pregunta, por favor contáctanos.'}\n\nSaludos cordiales`;
        }

        await sendEmail(user.email, emailSubject, emailText);

        res.status(200).json({
            status: 'success',
            message: `Usuario ${status === 'approved' ? 'aprobado' : 'rechazado'} exitosamente`,
            data: user
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
};

// Obtener estadísticas del sistema
exports.getSystemStats = async (req, res) => {
    try {
        const stats = await User.aggregate([
            {
                $group: {
                    _id: null,
                    totalUsers: { $sum: 1 },
                    totalMentors: {
                        $sum: {
                            $cond: [{ $eq: ['$role', 'mentor'] }, 1, 0]
                        }
                    },
                    totalSolvers: {
                        $sum: {
                            $cond: [{ $eq: ['$role', 'solver'] }, 1, 0]
                        }
                    },
                    pendingApprovals: {
                        $sum: {
                            $cond: [{ $eq: ['$approvalStatus', 'pending'] }, 1, 0]
                        }
                    }
                }
            }
        ]);

        res.status(200).json({
            status: 'success',
            data: stats[0]
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
};

// Obtener detalles de un usuario
exports.getUserDetails = async (req, res) => {
    try {
        const { userId } = req.params;
        
        const user = await User.findById(userId).select('-password');
        
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'Usuario no encontrado'
            });
        }

        res.status(200).json({
            status: 'success',
            data: user
        });
    } catch (error) {
        console.error('Error al obtener detalles del usuario:', error);
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
}; 