// Función de utilidad para debounce
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Challenges Page JavaScript

// Inicializar la UI cuando se carga la página
document.addEventListener('DOMContentLoaded', async () => {
    // Verificar si hay un usuario en localStorage
    const userJson = localStorage.getItem('user');
    if (userJson) {
        try {
            const user = JSON.parse(userJson);
            console.log('Loaded user from localStorage:', user);
            updateAuthUI(user);
        } catch (error) {
            console.error('Error parsing user data:', error);
        }
    }

    // Cargar los desafíos
    await loadChallenges();
});

// Initialize the challenges page
function initChallengePage() {
    console.log('Challenges page initialized');
    
    // Load challenges from API
    loadChallenges();
}

// Load challenges from API
async function loadChallenges(filters = {}) {
    try {
        // Get challenges from API
        const challenges = await fetchChallenges(filters);
        
        // Update UI with challenges
        updateChallengesUI(challenges);
    } catch (error) {
        console.error('Error loading challenges:', error);
        showNotification('Error al cargar los desafíos', 'error');
    }
}

// Fetch challenges from API
async function fetchChallenges(filters = {}) {
    try {
        // Build query string from filters
        const queryParams = new URLSearchParams();
        
        if (filters.search) queryParams.append('search', filters.search);
        if (filters.difficulty) queryParams.append('difficulty', filters.difficulty);
        if (filters.skill) queryParams.append('skills', filters.skill);
        if (filters.sort) queryParams.append('sort', filters.sort);
        if (filters.page) queryParams.append('page', filters.page);
        
        const queryString = queryParams.toString();
        const url = `/api/challenges${queryString ? `?${queryString}` : ''}`;
        
        // Get token from localStorage
        const token = localStorage.getItem('token');
        
        // Fetch challenges from API
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Obtener los desafíos en los que participa el usuario
            let userChallenges = [];
            if (token) {
                try {
                    const userChallengesResponse = await fetch('/api/challenges/user/participating', {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    
                    const userChallengesData = await userChallengesResponse.json();
                    
                    if (userChallengesData.success) {
                        userChallenges = userChallengesData.data.map(challenge => challenge._id);
                    }
                } catch (error) {
                    console.error('Error loading user challenges:', error);
                }
            }
            
            // Marcar los desafíos en los que participa el usuario
            const challenges = data.data.map(challenge => {
                return {
                    ...challenge,
                    isParticipating: userChallenges.includes(challenge._id)
                };
            });
            
            return challenges;
        } else {
            console.error('Error loading challenges:', data.error);
            showNotification('Error al cargar los desafíos', 'error');
            return [];
        }
    } catch (error) {
        console.error('Error fetching challenges:', error);
        return [];
    }
}

// Update UI with challenges
function updateChallengesUI(challenges) {
    const challengesContainer = document.getElementById('challenges-container');
    
    // Clear container
    challengesContainer.innerHTML = '';
    
    // Check if there are challenges
    if (!challenges || challenges.length === 0) {
        challengesContainer.innerHTML = `
            <div class="no-challenges">
                <i class="fas fa-search"></i>
                <h3>No se encontraron desafíos</h3>
                <p>Intenta con otros filtros o crea tu propio desafío</p>
            </div>
        `;
        return;
    }
    
    // Add challenges to container
    challenges.forEach(challenge => {
        const challengeCard = createChallengeCard(challenge);
        challengesContainer.appendChild(challengeCard);
    });
}

// Create challenge card
function createChallengeCard(challenge) {
    // Create card element
    const card = document.createElement('div');
    card.className = 'challenge-card';
    card.setAttribute('data-challenge-id', challenge._id || challenge.id);
    
    // Create skills HTML - verificar que skills exista y sea un array
    const skillsHTML = challenge.skills && Array.isArray(challenge.skills) ?
        challenge.skills.map(skill => `
            <span class="skill-tag">${skill}</span>
        `).join('') : '';

    // Crear texto de tamaño de equipo
    const teamSize = challenge.teamSizeMin === challenge.teamSizeMax ? 
        `${challenge.teamSizeMin} personas` : 
        `${challenge.teamSizeMin}-${challenge.teamSizeMax} personas`;
    
    // Determinar el número de participantes y máximo
    const maxParticipants = challenge.maxParticipants || 10;
    const currentParticipants = challenge.participants ? challenge.participants.length : 0;
    const isFull = currentParticipants >= maxParticipants;
    
    // Determinar si el usuario está participando
    const isParticipating = challenge.isParticipating || false;
    
    // Set card HTML
    const cardContent = document.createElement('div');
    cardContent.innerHTML = `
        <div class="challenge-header">
            <div class="challenge-difficulty">${challenge.difficulty}</div>
            <div class="challenge-points">${challenge.points} pts</div>
            <div class="participant-badge ${isFull ? 'full' : ''}">${currentParticipants}/${maxParticipants}</div>
        </div>
        <h3>${challenge.title}</h3>
        <p>${challenge.description}</p>
        <div class="challenge-skills">
            ${skillsHTML}
        </div>
        <div class="challenge-meta">
            <span><i class="fas fa-users"></i> ${teamSize}</span>
            <span><i class="fas fa-clock"></i> ${challenge.duration}</span>
        </div>
        <div class="challenge-actions">
            <button class="btn btn-primary participate-btn" ${isFull && !isParticipating ? 'disabled' : ''}>
                ${isParticipating ? 'Ver detalles' : isFull ? 'Completo' : 'Participar'}
            </button>
            <button class="btn-favorite" data-id="${challenge._id || challenge.id}">
                <i class="far fa-heart"></i>
            </button>
        </div>
    `;
    
    // Agregar el contenido al card
    while (cardContent.firstChild) {
        card.appendChild(cardContent.firstChild);
    }
    
    // Add event listener to favorite button
    card.querySelector('.btn-favorite').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Get challenge id
        const challengeId = e.currentTarget.dataset.id;
        
        // Toggle favorite
        toggleFavorite(challengeId);
    });
    
    // Add event listener to participate button
    const participateBtn = card.querySelector('.participate-btn');
    if (participateBtn) {
        participateBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (isParticipating) {
                // Si el usuario ya está participando, mostrar detalles del desafío
                showChallengeDetails(challenge);
            } else if (!isFull) {
                // Si el usuario no está participando y hay cupos, mostrar modal de confirmación
                showParticipateModal(challenge, currentParticipants, maxParticipants);
            }
        });
    }
    
    return card;
}

// Toggle favorite challenge
async function toggleFavorite(challengeId) {
    try {
        // Check if user is logged in
        const token = localStorage.getItem('token');
        if (!token) {
            showLoginModal();
            return;
        }
        
        // Toggle favorite in UI
        const favoriteBtn = document.querySelector(`.btn-favorite[data-id="${challengeId}"]`);
        const favoriteIcon = favoriteBtn.querySelector('i');
        
        favoriteIcon.classList.toggle('far');
        favoriteIcon.classList.toggle('fas');
        
        // Send request to API
        const response = await fetch(`/api/challenges/${challengeId}/favorite`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        // Check if response is ok
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error al actualizar favorito');
        }
        
        // Show notification
        showNotification('Favorito actualizado', 'success');
    } catch (error) {
        console.error('Error toggling favorite:', error);
        showNotification('Error al actualizar favorito', 'error');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('challenge-search');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            applyFilters();
        }, 500));
    }

    // Difficulty filter
    const difficultyFilter = document.getElementById('difficulty-filter');
    if (difficultyFilter) {
        difficultyFilter.addEventListener('change', () => {
            applyFilters();
        });
    }

    // Skill filter
    const skillFilter = document.getElementById('skill-filter');
    if (skillFilter) {
        skillFilter.addEventListener('change', () => {
            applyFilters();
        });
    }

    // Sort filter
    const sortFilter = document.getElementById('sort-filter');
    if (sortFilter) {
        sortFilter.addEventListener('change', () => {
            applyFilters();
        });
    }

    // Search button
    const searchBtn = document.getElementById('search-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            applyFilters();
        });
    }

    // Login button
    const loginBtn = document.querySelector('.btn-login');
    if (loginBtn) {
        loginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showLoginModal();
        });
    }

    // Signup button
    const signupBtn = document.querySelector('.btn-signup');
    if (signupBtn) {
        signupBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showSignupModal();
        });
    }

    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
}

// Apply filters
function applyFilters(page = 1) {
    // Get filter values
    const search = document.getElementById('challenge-search').value;
    const difficulty = document.getElementById('difficulty-filter').value;
    const skill = document.getElementById('skill-filter').value;
    const sort = document.getElementById('sort-filter').value;
    
    // Create filters object
    const filters = {
        search,
        difficulty,
        skill,
        sort,
        page
    };
    
    // Load challenges with filters
    loadChallenges(filters);
    
    // Update pagination UI
    updatePaginationUI(page);
}

// Update pagination UI
function updatePaginationUI(currentPage) {
    const paginationButtons = document.querySelectorAll('.btn-page');
    
    paginationButtons.forEach(button => {
        button.classList.remove('active');
        
        if (button.textContent === currentPage.toString()) {
            button.classList.add('active');
        }
    });
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <p>${message}</p>
        <button class="close-notification">&times;</button>
    `;
    
    // Add notification to body
    document.body.appendChild(notification);
    
    // Add event listener to close button
    const closeBtn = notification.querySelector('.close-notification');
    closeBtn.addEventListener('click', () => {
        notification.remove();
    });
    
    // Remove notification after 5 seconds
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Esta función ha sido eliminada ya que ahora usamos datos reales de la API

// Check authentication status
function checkAuthStatus() {
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');
    
    if (user && token) {
        updateAuthUI(user);
    }
}

// Update authentication UI
function updateAuthUI(user) {
    // Hide login and signup buttons
    document.querySelectorAll('.auth-links').forEach(el => {
        el.style.display = 'none';
    });
    
    // Show user profile
    const userProfile = document.querySelector('.user-profile');
    userProfile.style.display = 'block';
    
    // Update user name
    document.querySelector('.user-name').textContent = user.name;
    
    // Actualizar UI según el rol del usuario
    updateUIForRole();
    
    console.log('User logged in:', user.name);
}

// Show login modal
function showLoginModal() {
    openModal(document.getElementById('login-modal'));
}

// Open modal
function openModal(modal) {
    if (modal) {
        modal.style.display = 'flex';
    }
}

// Close modal
function closeModal(modal) {
    if (modal) {
        modal.style.display = 'none';
    }
}

// Add event listeners for modals
document.addEventListener('DOMContentLoaded', () => {
    // Get all modals
    const modals = document.querySelectorAll('.modal');
    
    // Add event listeners to close buttons
    document.querySelectorAll('.close-modal').forEach(closeBtn => {
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                const modal = closeBtn.closest('.modal');
                if (modal) {
                    closeModal(modal);
                }
            });
        }
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        modals.forEach(modal => {
            if (e.target === modal) {
                closeModal(modal);
            }
        });
    });
    
    // Show login modal when clicking login button
    const loginButton = document.querySelector('.btn-login');
    if (loginButton) {
        loginButton.addEventListener('click', (e) => {
            e.preventDefault();
            const loginModal = document.getElementById('login-modal');
            if (loginModal) {
                openModal(loginModal);
            }
        });
    }
    
    // Show signup modal when clicking signup button
    const signupButton = document.querySelector('.btn-signup');
    if (signupButton) {
        signupButton.addEventListener('click', (e) => {
            e.preventDefault();
            const signupModal = document.getElementById('signup-modal');
            if (signupModal) {
                openModal(signupModal);
            }
        });
    }
    
    // Show login modal when clicking show login link
    const showLoginLink = document.getElementById('show-login');
    if (showLoginLink) {
        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            const signupModal = document.getElementById('signup-modal');
            const loginModal = document.getElementById('login-modal');
            if (signupModal) closeModal(signupModal);
            if (loginModal) openModal(loginModal);
        });
    }
    
    // Show signup modal when clicking show signup link
    const showSignupLink = document.getElementById('show-signup');
    if (showSignupLink) {
        showSignupLink.addEventListener('click', (e) => {
            e.preventDefault();
            const loginModal = document.getElementById('login-modal');
            const signupModal = document.getElementById('signup-modal');
            if (loginModal) closeModal(loginModal);
            if (signupModal) openModal(signupModal);
        });
    }
    
    // Setup logout functionality
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
});

// Logout function
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

// Show participate modal
function showParticipateModal(challenge, currentParticipants, maxParticipants) {
    // Get modal elements
    const modal = document.getElementById('participate-modal');
    const currentParticipantsEl = document.getElementById('current-participants');
    const maxParticipantsEl = document.getElementById('max-participants');
    const progressBar = document.getElementById('participants-progress');
    const confirmBtn = document.getElementById('confirm-participate');
    const cancelBtn = document.getElementById('cancel-participate');
    
    // Set modal content
    currentParticipantsEl.textContent = currentParticipants;
    maxParticipantsEl.textContent = maxParticipants;
    
    // Calculate progress percentage
    const progressPercentage = (currentParticipants / maxParticipants) * 100;
    progressBar.style.width = `${progressPercentage}%`;
    
    // Store challenge ID in confirm button
    confirmBtn.setAttribute('data-challenge-id', challenge._id || challenge.id);
    
    // Open modal
    openModal(modal);
    
    // Add event listeners
    confirmBtn.onclick = () => {
        confirmParticipation(challenge, currentParticipants, maxParticipants);
        closeModal(modal);
    };
    
    cancelBtn.onclick = () => {
        closeModal(modal);
    };
}

// Confirm participation
async function confirmParticipation(challenge, currentParticipants, maxParticipants) {
    try {
        // Check if user is logged in
        const token = localStorage.getItem('token');
        if (!token) {
            showNotification('Debes iniciar sesión para participar', 'error');
            showLoginModal();
            return;
        }
        
        // Check if there are spots available
        if (currentParticipants >= maxParticipants) {
            showNotification('Lo sentimos, este desafío ya está completo', 'error');
            return;
        }
        
        // Obtener el ID del desafío
        const challengeId = challenge._id || challenge.id;
        
        // Llamar a la API para participar en el desafío
        const response = await fetch(`/api/challenges/${challengeId}/participate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Actualizar la UI para mostrar la participación
            const challengeCard = document.querySelector(`.challenge-card[data-challenge-id="${challengeId}"]`);
            if (challengeCard) {
                // Actualizar el badge de participantes con los datos de la API
                const newParticipantCount = data.data.currentParticipants;
                const participantBadge = challengeCard.querySelector('.participant-badge');
                
                if (participantBadge) {
                    participantBadge.textContent = `${newParticipantCount}/${maxParticipants}`;
                    
                    // Si está lleno, actualizar la clase
                    if (newParticipantCount >= maxParticipants) {
                        participantBadge.classList.add('full');
                    }
                }
                
                // Cambiar el botón de "Participar" a "Ver detalles"
                const participateBtn = challengeCard.querySelector('.participate-btn');
                if (participateBtn) {
                    participateBtn.textContent = 'Ver detalles';
                    participateBtn.disabled = false;
                }
            }
            
            showNotification(data.data.message || '¡Te has unido al desafío exitosamente!', 'success');
        } else {
            showNotification(data.error || 'Error al participar en el desafío', 'error');
        }
    } catch (error) {
        console.error('Error al participar en el desafío:', error);
        showNotification('Error al participar en el desafío', 'error');
    }
}

// Show challenge details
function showChallengeDetails(challenge) {
    // Redirigir a la página de detalles del desafío
    const challengeId = challenge._id || challenge.id;
    window.location.href = `/challenge-details.html?id=${challengeId}`;
}

// Función para crear un nuevo desafío
async function createNewChallenge() {
    try {
        // Get form values
        const title = document.getElementById('challenge-title').value.trim();
        const description = document.getElementById('challenge-description').value.trim();
        const difficulty = document.getElementById('challenge-difficulty').value;
        const points = parseInt(document.getElementById('challenge-points').value);
        const teamSize = document.getElementById('challenge-team-max').value;
        const duration = document.getElementById('challenge-duration').value;
        
        // Obtener habilidades seleccionadas de los checkboxes
        const selectedSkills = Array.from(document.querySelectorAll('input[name="skills"]:checked'))
            .map(checkbox => checkbox.value);
        
        // Procesar el tamaño del equipo
        let [teamSizeMin, teamSizeMax] = teamSize.split('-').map(num => parseInt(num));
        
        // Validar form
        if (!title || !description || !difficulty || !points || !teamSize || !duration || selectedSkills.length === 0) {
            showNotification('Por favor completa todos los campos requeridos', 'error');
            return;
        }
        
        // Create challenge object
        const challenge = {
            title,
            description,
            difficulty,
            points,
            teamSizeMin,
            teamSizeMax,
            duration: `${duration} horas`,
            skills: selectedSkills,
            maxParticipants: teamSizeMax * 2 // Permitir el doble del tamaño máximo del equipo como participantes totales
        };
        
        // Get token
        const token = localStorage.getItem('token');
        if (!token) {
            showNotification('Sesión expirada. Por favor inicia sesión nuevamente', 'error');
            showLoginModal();
            return;
        }
        
        // Send request to API
        const response = await fetch('/api/challenges', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(challenge)
        });
        
        const data = await response.json();
        
        // Check if response is ok
        if (!response.ok) {
            throw new Error(data.error || 'Error al crear el desafío');
        }
        
        // Close modal
        closeCreateChallengeModal();

        // Show success notification
        showNotification('Desafío creado exitosamente', 'success');
        
        // Reload challenges
        loadChallenges();
        
        // If mentor, reload mentor challenges
        if (isMentor()) {
            loadMentorChallenges();
        }
    } catch (error) {
        console.error('Error creating challenge:', error);
        showNotification(error.message || 'Error al crear el desafío', 'error');
    }
}

// Función para verificar si el usuario es mentor
function isMentor() {
    const user = JSON.parse(localStorage.getItem('user'));
    console.log('Verificando rol de usuario:', user);
    return user && user.role === 'mentor';
}

// Función para mostrar/ocultar elementos según el rol del usuario
function updateUIForRole() {
    const createChallengeSection = document.querySelector('.create-challenge');
    const mentorActionsSection = document.querySelector('.mentor-actions');
    const createChallengeButton = document.getElementById('create-challenge-btn');
    
    if (isMentor()) {
        if (createChallengeSection) {
            createChallengeSection.style.display = 'block';
        }
        if (mentorActionsSection) {
            mentorActionsSection.style.display = 'block';
        }
        if (createChallengeButton) {
            createChallengeButton.style.display = 'flex';
        }
        loadMentorChallenges();
    } else {
        if (createChallengeSection) {
            createChallengeSection.style.display = 'none';
        }
        if (mentorActionsSection) {
            mentorActionsSection.style.display = 'none';
        }
        if (createChallengeButton) {
            createChallengeButton.style.display = 'none';
        }
    }
}

// Función para cargar los desafíos del mentor
async function loadMentorChallenges() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch('/api/challenges/mentor/my-challenges', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (data.success) {
            displayMentorChallenges(data.data);
        }
    } catch (error) {
        console.error('Error al cargar los desafíos del mentor:', error);
    }
}

// Función para mostrar los desafíos del mentor
function displayMentorChallenges(challenges) {
    const mentorChallengesContainer = document.getElementById('mentor-challenges');
    if (!mentorChallengesContainer) return;

    mentorChallengesContainer.innerHTML = challenges.map(challenge => `
        <div class="challenge-card mentor-challenge">
            <div class="challenge-header">
                <div class="challenge-difficulty">${challenge.difficulty}</div>
                <div class="challenge-points">${challenge.points} pts</div>
            </div>
            <h3>${challenge.title}</h3>
            <p>${challenge.description}</p>
            <div class="challenge-skills">
                ${challenge.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
            </div>
            <div class="challenge-meta">
                <span><i class="fas fa-users"></i> ${challenge.teamSizeMin}-${challenge.teamSizeMax} personas</span>
                <span><i class="fas fa-clock"></i> ${challenge.duration}</span>
            </div>
            <div class="challenge-actions">
                <button onclick="editChallenge('${challenge._id}')" class="btn btn-secondary">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button onclick="deleteChallenge('${challenge._id}')" class="btn btn-danger">
                    <i class="fas fa-trash"></i> Eliminar
                </button>
            </div>
        </div>
    `).join('');
}

// Función para editar un desafío
async function editChallenge(challengeId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Obtener los datos actuales del desafío
        const response = await fetch(`/api/challenges/${challengeId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (data.success) {
            // Mostrar modal de edición con los datos actuales
            showEditChallengeModal(data.data);
        }
    } catch (error) {
        console.error('Error al cargar el desafío para editar:', error);
    }
}

// Función para eliminar un desafío
async function deleteChallenge(challengeId) {
    if (!confirm('¿Estás seguro de que deseas eliminar este desafío?')) return;

    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`/api/challenges/${challengeId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (data.success) {
            // Recargar los desafíos del mentor
            loadMentorChallenges();
            showNotification('Desafío eliminado exitosamente', 'success');
        }
    } catch (error) {
        console.error('Error al eliminar el desafío:', error);
        showNotification('Error al eliminar el desafío', 'error');
    }
}

// Funciones para el modal de crear desafío
function openCreateChallengeModal() {
    if (!isMentor()) {
        showNotification('Solo los mentores pueden crear desafíos', 'error');
        return;
    }
    const modal = document.getElementById('createChallengeModal');
    modal.style.display = 'flex';
}

function closeCreateChallengeModal() {
    const modal = document.getElementById('createChallengeModal');
    modal.style.display = 'none';
    // Limpiar el formulario al cerrar
    document.getElementById('createChallengeForm').reset();
}

// Cerrar modal al hacer clic fuera de él
window.onclick = function(event) {
    const modal = document.getElementById('createChallengeModal');
    if (event.target === modal) {
        closeCreateChallengeModal();
    }
}

// Configurar el evento submit del formulario
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('createChallengeForm');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            createNewChallenge();
        });
    }
});

// Función para mostrar alertas
function showAlert(type, message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;

    // Insertar la alerta al principio de la página
    const container = document.querySelector('.challenges-page');
    container.insertBefore(alertDiv, container.firstChild);

    // Remover la alerta después de 3 segundos
    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}
