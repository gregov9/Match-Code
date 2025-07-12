const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Configuración del transportador de correo
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'paulbrock060@gmail.com',
        pass: process.env.EMAIL_PASS || 'fadoefhzkogyuaee'
    }
});

// Configuración de multer para subida de imágenes
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        const uploadPath = path.join(__dirname, '../../public/uploads/avatars');
        // Crear el directorio si no existe
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function(req, file, cb) {
        // Generar nombre único para el archivo
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    // Aceptar solo imágenes
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('El archivo debe ser una imagen'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB máximo
    }
}).single('avatar');

// Función para enviar correo
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
        throw new Error('Error al enviar el correo de confirmación');
    }
};

// Generar Token JWT
const signToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'mi-secreto-super-seguro', {
        expiresIn: process.env.JWT_EXPIRES_IN || '1d'
    });
};

// Función para obtener la URL completa del avatar
const getAvatarUrl = (avatar) => {
    if (!avatar) return '/img/default-avatar.png';
    if (avatar === 'default-avatar.png') return '/img/default-avatar.png';
    return `/uploads/avatars/${avatar}`;
};

// @desc    Register user
// @route   POST /api/users/register
// @access  Public
exports.registerUser = async (req, res) => {
    try {
        const { 
            name,
            username, 
            email, 
            password, 
            role,
            subscriptionPlan,
            solucionadorInfo,
            languages,
            experience,
            description
        } = req.body;

        // Verificar si el usuario ya existe (email o username)
        const existingUser = await User.findOne({ 
            $or: [
                { email },
                { username }
            ]
        });

        if (existingUser) {
            return res.status(400).json({
                status: 'error',
                message: existingUser.email === email ? 
                    'Ya existe un usuario con ese email' : 
                    'El nombre de usuario ya está en uso'
            });
        }

        // Establecer el estado de aprobación según el rol
        const approvalStatus = (role === 'mentor' || role === 'solucionador') ? 'pending' : 'approved';

        // Preparar los datos del usuario
        const userData = {
            name,
            username,
            email,
            password,
            role,
            approvalStatus
        };

        // Agregar información de pago y suscripción si es solucionador
        if (role === 'solucionador') {
            if (!subscriptionPlan) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Se requiere seleccionar un plan de suscripción para solucionadores'
                });
            }

            userData.subscriptionPlan = subscriptionPlan;

            if (solucionadorInfo?.paymentInfo) {
                userData.paymentReference = solucionadorInfo.paymentInfo.referenceNumber;
                userData.paymentDate = new Date(solucionadorInfo.paymentInfo.paymentDate);
            }
        }

        // Agregar información si es mentor
        if (role === 'mentor') {
            if (!languages || languages.length === 0) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Se requiere seleccionar al menos un lenguaje de programación'
                });
            }

            if (!experience) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Se requiere especificar los años de experiencia'
                });
            }

            if (!description) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Se requiere una descripción personal'
                });
            }

            userData.programmingLanguages = Array.isArray(languages) ? languages : JSON.parse(languages);
            userData.yearsOfExperience = parseInt(experience);
            userData.mentorDescription = description;
            userData.bio = description;
        }

        // Crear el usuario
        const user = await User.create(userData);

        // Enviar correo de confirmación según el rol
        let emailText;
        if (approvalStatus === 'pending') {
            emailText = `Hola ${name},\n\nGracias por registrarte como ${role} en nuestra plataforma. Tu solicitud está siendo revisada por nuestro equipo administrativo. Te notificaremos cuando tu cuenta sea aprobada.\n\nSaludos cordiales`;
        } else {
            emailText = `Hola ${name},\n\nBienvenido a nuestra plataforma. Tu cuenta ha sido creada exitosamente.\n\nSaludos cordiales`;
        }

        await sendEmail(email, 'Registro en la plataforma', emailText);

        // Generar token
        const token = signToken(user._id);

        // Remover el password de la respuesta
        user.password = undefined;

        res.status(201).json({
            status: 'success',
            token,
            data: {
                user
            },
            message: approvalStatus === 'pending' ? 
                'Tu registro está pendiente de aprobación. Te notificaremos cuando sea aprobado.' :
                'Registro exitoso'
        });
    } catch (error) {
        console.error('Error en el registro:', error);
        res.status(500).json({
            status: 'error',
            message: error.message || 'Error al registrar el usuario'
        });
    }
};

// @desc    Login user
// @route   POST /api/users/login
// @access  Public
exports.loginUser = async (req, res, next) => {
    try {
        const { login, password } = req.body; // login puede ser email o username

        // Verificar si se proporcionó login y password
        if (!login || !password) {
            return res.status(400).json({
                status: 'error',
                message: 'Por favor proporcione usuario/email y contraseña'
            });
        }

        // Buscar usuario por email o username y seleccionar explícitamente el password
        const user = await User.findOne({
            $or: [
                { email: login.toLowerCase() },
                { username: login }
            ]
        }).select('+password');

        // Verificar si el usuario existe y la contraseña es correcta
        if (!user || !(await user.correctPassword(password, user.password))) {
            return res.status(401).json({
                status: 'error',
                message: 'Usuario/email o contraseña incorrectos'
            });
        }

        // Verificar el estado de aprobación
        if (user.approvalStatus === 'pending') {
            return res.status(401).json({
                status: 'error',
                message: 'Tu cuenta está pendiente de aprobación. Te notificaremos cuando sea aprobada.'
            });
        } else if (user.approvalStatus === 'rejected') {
            return res.status(401).json({
                status: 'error',
                message: 'Tu solicitud de registro ha sido rechazada.'
            });
        }

        // Generar token
        const token = signToken(user._id);

        // Remover el password de la respuesta
        user.password = undefined;

        res.status(200).json({
            status: 'success',
            token,
            data: {
                user
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get current user profile
// @route   GET /api/users/me
// @access  Private
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'Usuario no encontrado'
            });
        }

        res.status(200).json({
            status: 'success',
            data: {
                user
            }
        });
    } catch (error) {
        console.error('Error al obtener perfil:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error al obtener el perfil del usuario'
        });
    }
};

// @desc    Get user profile
// @route   GET /api/users/me
// @access  Private
exports.getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'Usuario no encontrado'
            });
        }

        // Convertir el documento a un objeto plano
        const userObject = user.toObject();

        // Agregar la URL del avatar
        userObject.avatarUrl = user.avatar === 'default-avatar.png' 
            ? '/img/default-avatar.png' 
            : `/uploads/avatars/${user.avatar}`;

        res.status(200).json({
            status: 'success',
            data: userObject
        });
    } catch (error) {
        console.error('Error al obtener perfil:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error al obtener el perfil del usuario'
        });
    }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = async (req, res) => {
    try {
        const { name, username, bio } = req.body;
        
        // Buscar el usuario por ID
        const user = await User.findById(req.user._id);
        
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'Usuario no encontrado'
            });
        }

        // Actualizar campos
        if (name) user.name = name;
        if (username) user.username = username;
        if (bio !== undefined) user.bio = bio; // Permitir bio vacío

        // Guardar cambios
        await user.save();

        // Convertir el documento a un objeto plano
        const userObject = user.toObject();

        // Agregar la URL del avatar
        userObject.avatarUrl = user.avatar === 'default-avatar.png' 
            ? '/img/default-avatar.png' 
            : `/uploads/avatars/${user.avatar}`;

        res.status(200).json({
            status: 'success',
            message: 'Perfil actualizado correctamente',
            data: userObject
        });
    } catch (error) {
        console.error('Error al actualizar perfil:', error);
        res.status(500).json({
            status: 'error',
            message: error.message || 'Error al actualizar el perfil'
        });
    }
};

// @desc    Actualizar avatar de usuario
// @route   PUT /api/users/avatar
// @access  Private
exports.updateAvatar = async (req, res) => {
    try {
        upload(req, res, async function(err) {
            if (err) {
                return res.status(400).json({
                    status: 'error',
                    message: err.message
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Por favor seleccione una imagen'
                });
            }

            const user = await User.findById(req.user.id);
            
            // Si existe un avatar anterior y no es el default, eliminarlo
            if (user.avatar && user.avatar !== 'default-avatar.png') {
                const oldAvatarPath = path.join('public/uploads/avatars', user.avatar);
                if (fs.existsSync(oldAvatarPath)) {
                    fs.unlinkSync(oldAvatarPath);
                }
            }

            // Actualizar avatar del usuario
            user.avatar = req.file.filename;
            await user.save();

            res.status(200).json({
                status: 'success',
                data: {
                    avatar: getAvatarUrl(user.avatar)
                }
            });
        });
    } catch (error) {
        console.error('Error al actualizar avatar:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error al actualizar la imagen de perfil'
        });
    }
};

// @desc    Get top mentors
// @route   GET /api/users/top-mentors
// @access  Public
exports.getTopMentors = async (req, res, next) => {
    try {
        const mentors = await User.find({
            mentorSessions: { $gt: 0 }
        })
        .sort({ mentorRating: -1, mentorSessions: -1 })
        .limit(10)
        .select('name avatar mentorRating mentorSessions');

        res.status(200).json({
            success: true,
            count: mentors.length,
            data: mentors
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get top solvers (users with most points)
// @route   GET /api/users/top-solvers
// @access  Public
exports.getTopSolvers = async (req, res, next) => {
    try {
        const solvers = await User.find({
            points: { $gt: 0 }
        })
        .sort({ points: -1, challengesCompleted: -1 })
        .limit(10)
        .select('name avatar points challengesCompleted');

        res.status(200).json({
            success: true,
            count: solvers.length,
            data: solvers
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Find users by skills
// @route   GET /api/users/find-by-skills
// @access  Public
exports.findUsersBySkills = async (req, res, next) => {
    try {
        const { skills } = req.query;
        
        if (!skills) {
            return res.status(400).json({
                success: false,
                error: 'Por favor proporcione al menos una habilidad'
            });
        }

        const skillsArray = skills.split(',');

        const users = await User.find({
            'skills.name': { $in: skillsArray }
        })
        .sort({ mentorRating: -1 })
        .limit(20)
        .select('name avatar skills mentorRating');

        res.status(200).json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Public
exports.getUserById = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id)
            .select('-email');

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Upload avatar
// @route   POST /api/users/upload-avatar
// @access  Private
exports.uploadAvatar = async (req, res) => {
    upload(req, res, async (err) => {
        try {
            if (err instanceof multer.MulterError) {
                throw new Error('Error al subir el archivo: ' + err.message);
            } else if (err) {
                throw new Error(err.message);
            }

            if (!req.file) {
                throw new Error('No se ha seleccionado ningún archivo');
            }

            const user = await User.findById(req.user._id);
            if (!user) {
                throw new Error('Usuario no encontrado');
            }

            // Si existe un avatar anterior y no es el default, eliminarlo
            if (user.avatar && user.avatar !== 'default-avatar.png') {
                const oldAvatarPath = path.join('public/uploads/avatars', user.avatar);
                if (fs.existsSync(oldAvatarPath)) {
                    fs.unlinkSync(oldAvatarPath);
                }
            }

            // Actualizar el avatar del usuario
            user.avatar = req.file.filename;
            await user.save();

            res.status(200).json({
                status: 'success',
                message: 'Avatar actualizado correctamente',
                data: {
                    avatarUrl: `/uploads/avatars/${req.file.filename}`
                }
            });
        } catch (error) {
            console.error('Error al subir avatar:', error);
            res.status(500).json({
                status: 'error',
                message: error.message
            });
        }
    });
};

// @desc    Subir nuevo avatar
// @route   POST /api/users/upload-avatar
// @access  Private
exports.uploadNewAvatar = (req, res) => {
    upload(req, res, async function(err) {
        if (err instanceof multer.MulterError) {
            console.error('Error de Multer:', err);
            return res.status(400).json({
                status: 'error',
                message: 'Error al subir el archivo: ' + err.message
            });
        } else if (err) {
            console.error('Error al subir archivo:', err);
            return res.status(400).json({
                status: 'error',
                message: err.message || 'Error al subir el archivo'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                status: 'error',
                message: 'No se ha proporcionado ningún archivo'
            });
        }

        try {
            const user = await User.findById(req.user._id);
            if (!user) {
                fs.unlink(req.file.path, (err) => {
                    if (err) console.error('Error al eliminar archivo:', err);
                });
                return res.status(404).json({
                    status: 'error',
                    message: 'Usuario no encontrado'
                });
            }

            // Solo eliminar el avatar anterior si no es el default y existe
            if (user.avatar && 
                user.avatar !== 'default-avatar.png' && 
                user.avatar !== '/img/default-avatar.png') {
                const oldAvatarPath = path.join(__dirname, '../../public/uploads/avatars', user.avatar);
                if (fs.existsSync(oldAvatarPath)) {
                    fs.unlink(oldAvatarPath, (err) => {
                        if (err) console.error('Error al eliminar avatar antiguo:', err);
                    });
                }
            }

            // Obtener solo el nombre del archivo, sin la ruta completa
            const filename = path.basename(req.file.path);
            
            // Actualizar el avatar del usuario
            user.avatar = filename;
            await user.save();

            // Construir la URL del avatar
            const avatarUrl = `/uploads/avatars/${filename}`;

            res.status(200).json({
                status: 'success',
                message: 'Avatar subido correctamente',
                data: {
                    avatarUrl,
                    avatar: filename
                }
            });
        } catch (error) {
            // Si hay error, eliminar el archivo subido
            if (req.file) {
                fs.unlink(req.file.path, (err) => {
                    if (err) console.error('Error al eliminar archivo:', err);
                });
            }
            console.error('Error al procesar avatar:', error);
            res.status(500).json({
                status: 'error',
                message: error.message || 'Error al subir el avatar'
            });
        }
    });
};
