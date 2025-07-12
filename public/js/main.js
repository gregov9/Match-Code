// DOM Elements
const navLinks = document.querySelector('.nav-links');
const burger = document.querySelector('.burger');
const body = document.body;
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const loginModal = document.getElementById('login-modal');
const loginLinks = document.querySelectorAll('.btn-login');
const closeModalBtns = document.querySelectorAll('.close-modal');
const loginForm = document.getElementById('login-form');
const navbar = document.querySelector('.navbar');
const userProfile = document.querySelector('.user-profile');
const userMenu = document.querySelector('.user-menu');

// Navbar scroll effect
let lastScrollTop = 0;
window.addEventListener('scroll', function() {
    if (!navbar) return;

    let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    // Ocultar la barra de navegación solo si se ha hecho scroll más allá de su altura
    if (scrollTop > lastScrollTop && scrollTop > navbar.offsetHeight) {
        // Scroll Down
        navbar.classList.add('navbar-hidden');
    } else {
        // Scroll Up
        navbar.classList.remove('navbar-hidden');
    }
    
    lastScrollTop = scrollTop <= 0 ? 0 : scrollTop; // Para manejar el scroll en la parte superior
});

// Mobile Navigation Toggle
if (burger && navLinks) {
    burger.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        // Animar las líneas del burger menu
        burger.querySelectorAll('div').forEach((line, index) => {
            line.style.transform = navLinks.classList.contains('active')
                ? index === 0 
                    ? 'rotate(45deg) translate(5px, 5px)'
                    : index === 1
                        ? 'opacity: 0'
                        : 'rotate(-45deg) translate(7px, -6px)'
                : '';
            line.style.opacity = navLinks.classList.contains('active') && index === 1 ? '0' : '1';
        });
        
        // Animar los elementos del menú
        const navItems = navLinks.querySelectorAll('li');
        navItems.forEach((item, index) => {
            if (navLinks.classList.contains('active')) {
                item.style.animation = `navLinkFade 0.5s ease forwards ${index / 7 + 0.3}s`;
            } else {
                item.style.animation = '';
            }
        });
    });
}

// Cerrar menú móvil al hacer clic en un enlace
navLinks?.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            navLinks.classList.remove('active');
            burger.querySelectorAll('div').forEach(line => {
                line.style.transform = '';
                line.style.opacity = '1';
            });
        }
    });
});

// Cerrar menú móvil al redimensionar la ventana
window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
        navLinks?.classList.remove('active');
        burger?.querySelectorAll('div').forEach(line => {
            line.style.transform = '';
            line.style.opacity = '1';
        });
    }
});

// Tabs functionality
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab');
        
        // Remove active class from all buttons and contents
        tabBtns.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        
        // Add active class to current button and content
        btn.classList.add('active');
        document.getElementById(`${tabId}-tab`).classList.add('active');
    });
});

// Función para abrir el modal
function openModal(modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevenir scroll en el fondo
}

// Función para cerrar el modal
function closeModal(modal) {
    modal.classList.remove('active');
    document.body.style.overflow = ''; // Restaurar scroll
}

// Event Listeners para el modal de login
document.querySelectorAll('.btn-login').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        const modal = document.getElementById('login-modal');
        openModal(modal);
    });
});

document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
        const modal = btn.closest('.modal');
        closeModal(modal);
    });
});

// Cerrar modal al hacer clic fuera
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal(modal);
        }
    });
});

// Prevenir que el clic dentro del modal lo cierre
document.querySelectorAll('.modal-content').forEach(content => {
    content.addEventListener('click', (e) => {
        e.stopPropagation();
    });
});

// Cerrar modal con la tecla Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(modal => {
            closeModal(modal);
        });
    }
});

// Handle login form submission
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
        const response = await loginUser(email, password);
        
        // Mostrar mensaje de error o proceder con el login
        if (response.success) {
            // Verificar el estado de aprobación
            if (response.user.approvalStatus === 'pending') {
                showLoginMessage('Tu cuenta está pendiente de aprobación por un administrador. Te notificaremos cuando sea aprobada.', 'warning');
                return;
            }
            
            // Si está aprobado, proceder con el login
            closeModal(loginModal);
            updateAuthUI(response.user);
            window.location.href = '/index.html';
        } else {
            showLoginMessage(response.message, 'danger');
        }
    } catch (error) {
        console.error('Login error:', error);
        showLoginMessage('Error al conectar con el servidor. Por favor, intenta nuevamente.', 'danger');
    }
});

// Función para mostrar mensajes en el formulario de login
function showLoginMessage(message, type) {
    const errorDiv = document.createElement('div');
    errorDiv.className = `alert alert-${type} mt-3`;
    errorDiv.textContent = message;
    
    // Remover mensaje anterior si existe
    const oldMessage = loginForm.querySelector('.alert');
    if (oldMessage) oldMessage.remove();
    
    // Agregar nuevo mensaje
    loginForm.appendChild(errorDiv);
}

// Real API functions
async function loginUser(email, password) {
    try {
        const response = await fetch('/api/users/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                login: email,
                password 
            })
        });
        
        const data = await response.json();
        console.log('Login response:', data);
        
        if (response.ok && data.status === 'success') {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.data.user));
            localStorage.setItem('userRole', data.data.user.role);
            
            return { 
                success: true, 
                token: data.token, 
                user: data.data.user 
            };
        } else {
            return { 
                success: false, 
                message: data.message || 'Error al iniciar sesión' 
            };
        }
    } catch (error) {
        console.error('Login error:', error);
        return { 
            success: false, 
            message: 'Error de conexión al servidor' 
        };
    }
}

// Fetch challenges from API
async function fetchChallenges() {
    try {
        // Get token from localStorage
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        
        const response = await fetch('/api/challenges', { headers });
        
        if (response.ok) {
            const data = await response.json();
            console.log('API response:', data);
            // La API devuelve los desafíos en data.data según el controlador
            return data.data || [];
        } else {
            console.error('Error fetching challenges:', response.statusText);
            return [];
        }
    } catch (error) {
        console.error('Error fetching challenges:', error);
        return [];
    }
}

// Fetch leaderboard data from API
async function fetchLeaderboard(type) {
    try {
        let endpoint = '/api/users';
        
        if (type === 'helpers') {
            endpoint += '/top-mentors';
        } else {
            endpoint += '/top-solvers';
        }
        
        const response = await fetch(endpoint);
        
        if (response.ok) {
            const data = await response.json();
            return data.data || [];
        } else {
            console.error(`Error fetching ${type} leaderboard:`, response.statusText);
            
            // Fallback to simulated data if API fails
            if (type === 'helpers') {
                return [
                    { position: 1, name: 'Carlos M.', avatar: '/img/default-avatar.png', sessions: 42, rating: 4.9 },
                    { position: 2, name: 'Ana L.', avatar: '/img/default-avatar.png', sessions: 38, rating: 4.8 },
                    { position: 3, name: 'Miguel R.', avatar: '/img/default-avatar.png', sessions: 35, rating: 4.7 }
                ];
            } else {
                return [
                    { position: 1, name: 'Laura P.', avatar: '/img/default-avatar.png', challenges: 15, points: 1250 },
                    { position: 2, name: 'Daniel S.', avatar: '/img/default-avatar.png', challenges: 14, points: 1180 },
                    { position: 3, name: 'Sofía T.', avatar: '/img/default-avatar.png', challenges: 12, points: 1050 }
                ];
            }
        }
    } catch (error) {
        console.error(`Error fetching ${type} leaderboard:`, error);
        return [];
    }
}

// Initialize the application
async function initApp() {
    // Check if user is logged in
    checkAuthStatus();
    
    // Add smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            if (this.getAttribute('href') !== '#') {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    window.scrollTo({
                        top: target.offsetTop - 80,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });
    
    // Add active class to nav links based on scroll position
    window.addEventListener('scroll', () => {
        const sections = document.querySelectorAll('section');
        const navLinks = document.querySelectorAll('.nav-links a');
        
        let current = '';
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            
            if (window.pageYOffset >= sectionTop - 100) {
                current = section.getAttribute('id');
            }
        });
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });
    
    // Setup logout functionality
    document.getElementById('logout-btn').addEventListener('click', (e) => {
        e.preventDefault();
        logout();
    });
    
    // Load challenges and leaderboard data
    loadChallenges();
    loadLeaderboard('helpers');
}

// Authentication functions
function checkAuthStatus() {
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');
    
    if (user && token) {
        updateAuthUI(user);
    }
}

function updateAuthUI(user) {
    const authLinks = document.querySelectorAll('.auth-links');
    const userProfile = document.querySelector('.user-profile');
    const userNameElement = document.querySelector('.user-name');
    const userAvatarElement = document.getElementById('nav-user-avatar');

    if (user) {
        console.log('Updating UI with user:', user);
        
        // Ocultar botones de auth y mostrar perfil
        authLinks.forEach(el => el.style.display = 'none');
        if (userProfile) {
            userProfile.style.display = 'block';
            if (userNameElement) {
                userNameElement.textContent = user.name;
            }
            if (userAvatarElement) {
                // Construir la ruta completa del avatar
                let avatarPath;
                if (!user.avatar || user.avatar === 'default-avatar.png') {
                    avatarPath = '/img/default-avatar.png';
                } else if (user.avatar.startsWith('http')) {
                    avatarPath = user.avatar;
                } else if (user.avatar.startsWith('/')) {
                    avatarPath = user.avatar;
                } else {
                    avatarPath = `/uploads/avatars/${user.avatar}`;
                }
                
                console.log('Setting avatar path:', avatarPath);
                userAvatarElement.src = avatarPath;
                userAvatarElement.alt = user.name;
            }
        }
    } else {
        // Mostrar botones de auth y ocultar perfil
        authLinks.forEach(el => el.style.display = 'block');
        if (userProfile) {
            userProfile.style.display = 'none';
        }
    }
}

function logout() {
    // Clear localStorage
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    
    // Show login and signup buttons
    document.querySelectorAll('.auth-links').forEach(el => {
        el.style.display = 'block';
    });
    
    // Hide user profile
    document.querySelector('.user-profile').style.display = 'none';
    
    console.log('User logged out');
}

// Load challenges from API
async function loadChallenges() {
    try {
        const challenges = await fetchChallenges();
        console.log('Challenges loaded:', challenges.length);
        
        // Get the challenges container
        const challengesContainer = document.querySelector('.challenges-container');
        
        // If container exists, update it with challenges
        if (challengesContainer) {
            // Clear current challenges
            challengesContainer.innerHTML = '';
            
            // Get top 3 challenges or all if less than 3
            const topChallenges = challenges.slice(0, 3);
            
            if (topChallenges.length === 0) {
                challengesContainer.innerHTML = '<p class="no-challenges">No hay desafíos disponibles actualmente.</p>';
                return;
            }
            
            // Add each challenge to the container
            topChallenges.forEach(challenge => {
                // Create skills HTML
                const skillsHTML = challenge.skills && Array.isArray(challenge.skills) ?
                    challenge.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('') :
                    '';
                
                // Create team size text
                const teamSize = challenge.teamSizeMin === challenge.teamSizeMax ? 
                    `${challenge.teamSizeMin} personas` : 
                    `${challenge.teamSizeMin}-${challenge.teamSizeMax} personas`;
                
                // Create challenge card HTML
                const challengeCard = document.createElement('div');
                challengeCard.className = 'challenge-card';
                challengeCard.innerHTML = `
                    <div class="challenge-difficulty">${challenge.difficulty}</div>
                    <h3>${challenge.title}</h3>
                    <p>${challenge.description}</p>
                    <div class="challenge-skills">
                        ${skillsHTML}
                    </div>
                    <div class="challenge-meta">
                        <span><i class="fas fa-users"></i> ${teamSize}</span>
                        <span><i class="fas fa-clock"></i> ${challenge.duration}</span>
                    </div>
                    <a href="challenges.html" class="btn btn-outline">Participar</a>
                `;
                
                // Add the card to the container
                challengesContainer.appendChild(challengeCard);
            });
        }
    } catch (error) {
        console.error('Error loading challenges:', error);
    }
}

// Load leaderboard data
async function loadLeaderboard(type) {
    try {
        const data = await fetchLeaderboard(type);
        console.log(`${type} leaderboard loaded:`, data.length);
    } catch (error) {
        console.error(`Error loading ${type} leaderboard:`, error);
    }
}

// Función para cargar la configuración de pago móvil
async function loadPaymentConfig() {
    try {
        const response = await fetch('/api/config');
        const data = await response.json();
        
        if (data.success && data.data) {
            return data.data.pagoMovil;
        }
        return null;
    } catch (error) {
        console.error('Error al cargar la configuración de pago:', error);
        return null;
    }
}

// Función para mostrar los datos de pago móvil
async function showPaymentInfo(planElement) {
    const paymentInfoDiv = document.getElementById('payment-info');
    if (!paymentInfoDiv) return;

    const config = await loadPaymentConfig();
    if (!config) {
        paymentInfoDiv.innerHTML = '<p class="text-danger">Error al cargar los datos de pago</p>';
        return;
    }

    paymentInfoDiv.innerHTML = `
        <div class="payment-details mt-3">
            <h5>Datos de Pago Móvil</h5>
            <div class="payment-info-grid">
                <div class="payment-info-item">
                    <strong>Banco:</strong>
                    <span>${config.banco}</span>
                </div>
                <div class="payment-info-item">
                    <strong>Teléfono:</strong>
                    <span>${config.telefono}</span>
                </div>
                <div class="payment-info-item">
                    <strong>Cédula:</strong>
                    <span>${config.cedula}</span>
                </div>
                <div class="payment-info-item">
                    <strong>Beneficiario:</strong>
                    <span>${config.nombreBeneficiario}</span>
                </div>
            </div>
        </div>
    `;
}

// Event listener para los planes
document.querySelectorAll('.plan-selector').forEach(plan => {
    plan.addEventListener('change', function() {
        if (this.checked) {
            showPaymentInfo(this);
        }
    });
});

// Manejar el envío del formulario de registro
const registrationForm = document.getElementById('registration-form');
if (registrationForm) {
    registrationForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Validar que se haya seleccionado un rol
        const selectedRole = document.querySelector('input[name="role"]:checked');
        if (!selectedRole) {
            showRegistrationMessage('Por favor, selecciona un rol (Mentor o Solucionador)', 'danger');
            return;
        }
        
        const formData = {
            name: document.getElementById('name').value,
            username: document.getElementById('username').value,
            email: document.getElementById('email').value,
            password: document.getElementById('password').value,
            role: selectedRole.value
        };

        // Agregar datos específicos según el rol
        if (formData.role === 'mentor') {
            const selectedLanguages = document.getElementById('languages').value;
            formData.languages = selectedLanguages ? JSON.parse(selectedLanguages) : [];
            formData.experience = document.getElementById('experience').value;
            formData.description = document.getElementById('description').value;

            // Validaciones
            if (formData.languages.length === 0) {
                showRegistrationMessage('Por favor, selecciona al menos un lenguaje de programación', 'danger');
                return;
            }
            if (!formData.experience) {
                showRegistrationMessage('Por favor, ingresa tus años de experiencia', 'danger');
                return;
            }
            if (!formData.description) {
                showRegistrationMessage('Por favor, ingresa una descripción personal', 'danger');
                return;
            }
        } else if (formData.role === 'solucionador') {
            const subscription = document.querySelector('input[name="subscription"]:checked')?.value;
            if (!subscription) {
                showRegistrationMessage('Por favor, selecciona un plan de suscripción', 'danger');
                return;
            }
            
            const paymentReference = document.getElementById('payment-reference').value;
            const paymentDate = document.getElementById('payment-date').value;
            
            if (!paymentReference || !paymentDate) {
                showRegistrationMessage('Por favor, completa la información de pago', 'danger');
                return;
            }

            formData.subscriptionPlan = subscription;
            formData.solucionadorInfo = {
                paymentInfo: {
                    referenceNumber: paymentReference,
                    paymentDate: paymentDate
                }
            };
        } else if (formData.role === 'user') {
            // Para usuarios regulares no necesitamos información adicional
            formData.userInfo = {
                registrationDate: new Date().toISOString()
            };
        }

        try {
            const response = await registerUser(formData);
            
            if (response.success) {
                showRegistrationMessage('Registro exitoso. Por favor, inicia sesión.', 'success');
                setTimeout(() => {
                    closeModal(document.getElementById('register-modal'));
                    openLoginModal();
                }, 2000);
            } else {
                showRegistrationMessage(response.message, 'danger');
            }
        } catch (error) {
            console.error('Registration error:', error);
            showRegistrationMessage('Error al conectar con el servidor. Por favor, intenta nuevamente.', 'danger');
        }
    });
}

// Función para registrar usuario
async function registerUser(userData) {
    try {
        const response = await fetch('/api/users/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            return { 
                success: true, 
                token: data.token, 
                user: data.data.user,
                message: data.message
            };
        } else {
            return { 
                success: false, 
                message: data.message || 'Error en el registro'
            };
        }
    } catch (error) {
        console.error('Error en el registro:', error);
        throw error;
    }
}

// Manejo de selección de lenguajes
document.addEventListener('DOMContentLoaded', function() {
    const languageButtons = document.querySelectorAll('.language-btn');
    const languagesInput = document.querySelector('#languages');
    const selectedLanguages = new Set();

    languageButtons.forEach(button => {
        button.addEventListener('click', function() {
            const value = this.getAttribute('data-value');
            
            if (this.classList.contains('selected')) {
                this.classList.remove('selected');
                selectedLanguages.delete(value);
            } else {
                this.classList.add('selected');
                selectedLanguages.add(value);
            }

            // Actualizar el input hidden con los valores seleccionados
            languagesInput.value = Array.from(selectedLanguages).join(',');
        });
    });
});

// Función para abrir el modal de registro
function openRegisterModal() {
    const modal = document.getElementById('register-modal');
    closeModal(document.getElementById('login-modal')); // Cerrar modal de login si está abierto
    openModal(modal);
    initializeLanguageButtons(); // Inicializar los botones de lenguajes
}

// Función para abrir el modal de login
function openLoginModal() {
    const modal = document.getElementById('login-modal');
    closeModal(document.getElementById('register-modal')); // Cerrar modal de registro si está abierto
    openModal(modal);
}

// Función para inicializar los botones de lenguajes
function initializeLanguageButtons() {
    document.querySelectorAll('.language-btn').forEach(btn => {
        // Remover listeners anteriores para evitar duplicados
        btn.replaceWith(btn.cloneNode(true));
    });

    // Agregar nuevos listeners
    document.querySelectorAll('.language-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.classList.toggle('selected');
            updateSelectedLanguages();
        });
    });
}

// Función para actualizar el campo oculto de lenguajes
function updateSelectedLanguages() {
    const selectedLanguages = Array.from(document.querySelectorAll('.language-btn.selected'))
        .map(btn => btn.dataset.language);
    document.getElementById('languages').value = JSON.stringify(selectedLanguages);
}

// Event Listeners para el modal de registro
document.querySelectorAll('.btn-signup').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        openRegisterModal();
    });
});

// Manejar la selección de rol
document.querySelectorAll('input[name="role"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        const mentorSection = document.getElementById('mentorSection');
        const solucionadorSection = document.getElementById('solucionadorSection');
        
        mentorSection.style.display = e.target.value === 'mentor' ? 'block' : 'none';
        solucionadorSection.style.display = e.target.value === 'solucionador' ? 'block' : 'none';
        
        if (e.target.value === 'mentor') {
            initializeLanguageButtons(); // Reinicializar botones cuando se muestra la sección
        }
    });
});

// Función para mostrar mensajes en el formulario de registro
function showRegistrationMessage(message, type) {
    const form = document.getElementById('registration-form');
    const errorDiv = document.createElement('div');
    errorDiv.className = `alert alert-${type} mt-3`;
    errorDiv.textContent = message;
    
    // Remover mensaje anterior si existe
    const oldMessage = form.querySelector('.alert');
    if (oldMessage) oldMessage.remove();
    
    // Agregar nuevo mensaje
    form.appendChild(errorDiv);
}

// User Profile Dropdown
if (userProfile && userMenu) {
    userMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        userProfile.classList.toggle('active');
    });

    // Cerrar el menú al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (!userProfile.contains(e.target)) {
            userProfile.classList.remove('active');
        }
    });

    // Cerrar el menú al presionar la tecla Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            userProfile.classList.remove('active');
        }
    });
}

// Verificar el estado de autenticación al cargar cualquier página
document.addEventListener('DOMContentLoaded', () => {
    const userJson = localStorage.getItem('user');
    if (userJson) {
        try {
            const user = JSON.parse(userJson);
            updateAuthUI(user);
        } catch (error) {
            console.error('Error parsing user data:', error);
        }
    }
});

// Función de logout global
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userRole');
    window.location.href = '/index.html';
}

// Agregar event listener para el botón de logout en todas las páginas
document.getElementById('logout-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    logout();
});

// Run initialization when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});
