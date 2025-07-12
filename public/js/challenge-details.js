// Variables globales
let challengeData = null;
let isParticipating = false;

// Inicializar la página

// Inicializar la página
document.addEventListener('DOMContentLoaded', async () => {
    // Verificar autenticación
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    
    // Actualizar UI según estado de autenticación
    updateAuthUI();
    
    // Obtener ID del desafío de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const challengeId = urlParams.get('id');
    
    if (!challengeId) {
        showNotification('Error: No se especificó un ID de desafío', 'error');
        setTimeout(() => {
            window.location.href = 'challenges.html';
        }, 2000);
        return;
    }
    
    // Cargar detalles del desafío
    loadChallengeDetails(challengeId);
    
    // Event listeners para botones principales
    document.getElementById('participateBtn').addEventListener('click', function() {
        if (!token) {
            showLoginModal();
            return;
        }
        participateInChallenge(challengeId);
    });
    
    document.getElementById('submitSolutionBtn').addEventListener('click', function() {
        if (!token) {
            showLoginModal();
            return;
        }
        showSubmitSolutionModal(challengeId);
    });
    
    // Event listener para ver todos los participantes
    document.getElementById('viewAllParticipantsBtn').addEventListener('click', function() {
        showParticipantsModal();
    });
    
    // Event listeners para cerrar modales
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            modal.style.display = 'none';
        });
    });
    
    // Cerrar modal al hacer clic fuera del contenido
    window.addEventListener('click', function(event) {
        document.querySelectorAll('.modal').forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
});

// Verificar autenticación
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        // Si no hay token, mostrar botones de login/register
        document.getElementById('userMenuBtn').style.display = 'none';
        document.getElementById('loginBtn').style.display = 'block';
        document.getElementById('registerBtn').style.display = 'block';
    } else {
        // Si hay token, mostrar menú de usuario
        document.getElementById('userMenuBtn').style.display = 'flex';
        
        // Obtener datos del usuario
        const user = JSON.parse(localStorage.getItem('user'));
        if (user) {
            document.getElementById('userName').textContent = user.name;
            if (user.avatar) {
                document.getElementById('userAvatar').src = user.avatar;
            }
        }
    }
}

// Cargar detalles del desafío
async function loadChallengeDetails(challengeId) {
    try {
        // Obtener referencias a elementos DOM
        const loadingSpinner = document.getElementById('loadingSpinner');
        const challengeDetails = document.getElementById('challengeDetails');
        
        if (!loadingSpinner || !challengeDetails) {
            console.error('No se encontraron elementos DOM necesarios');
            return;
        }
        
        // Mostrar spinner de carga
        loadingSpinner.style.display = 'flex';
        challengeDetails.style.display = 'none';
        
        console.log('Cargando detalles del desafío:', challengeId);
        
        // Obtener datos del desafío
        const response = await fetch(`/api/challenges/${challengeId}`);
        const result = await response.json();
        
        console.log('Respuesta API:', response.status, result);
        
        if (!response.ok) {
            throw new Error(result.message || 'Error al cargar el desafío');
        }
        
        challengeData = result.data;
        console.log('Datos del desafío cargados:', challengeData);
        
        if (!challengeData) {
            throw new Error('No se recibieron datos del desafío');
        }
        
        // Verificar si el usuario está participando
        await checkParticipation();
        
        // Renderizar detalles del desafío
        renderChallengeDetails();
        
        // Cargar participantes destacados
        await loadFeaturedParticipants();
        
    } catch (error) {
        console.error('Error al cargar detalles del desafío:', error);
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.innerHTML = `<p><i class="fas fa-exclamation-triangle"></i> Error al cargar detalles del desafío: ${error.message}</p>`;
        
        const container = document.querySelector('.challenge-details-container');
        if (container) {
            container.appendChild(errorMessage);
        }
    } finally {
        // Ocultar spinner de carga
        const loadingSpinner = document.getElementById('loadingSpinner');
        const challengeDetails = document.getElementById('challengeDetails');
        
        if (loadingSpinner) loadingSpinner.style.display = 'none';
        if (challengeDetails) challengeDetails.style.display = 'block';
    }
}

// Verificar si el usuario está participando en el desafío
async function checkParticipation() {
    const token = localStorage.getItem('token');
    if (!token) {
        isParticipating = false;
        return;
    }
    
    try {
        const response = await fetch('/api/challenges/user/participating', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok && result.data) {
            // Verificar si el ID del desafío actual está en la lista de desafíos del usuario
            isParticipating = result.data.some(challenge => 
                challenge._id === challengeData._id
            );
        } else {
            isParticipating = false;
        }
    } catch (error) {
        console.error('Error al verificar participación:', error);
        isParticipating = false;
    }
}

// Renderizar detalles del desafío
function renderChallengeDetails() {
    if (!challengeData) return;
    
    // Información básica
    document.getElementById('challengeTitle').textContent = challengeData.title;
    document.getElementById('challengeDifficulty').textContent = challengeData.difficulty;
    document.getElementById('challengeDifficulty').className = `badge badge-${challengeData.difficulty.toLowerCase()}`;
    document.getElementById('challengePoints').textContent = `${challengeData.points} pts`;
    document.getElementById('challengeDescription').textContent = challengeData.description || 'Sin descripción disponible';
    
    // Breadcrumb
    document.getElementById('challengeBreadcrumb').textContent = challengeData.title;
    
    // Participantes
    const maxParticipants = challengeData.maxParticipants || 10;
    const currentParticipants = challengeData.participants ? challengeData.participants.length : 0;
    const isFull = currentParticipants >= maxParticipants;
    
    // Actualizar barra de progreso
    const progressFill = document.getElementById('participantsProgressFill');
    const progressPercent = (currentParticipants / maxParticipants) * 100;
    progressFill.style.width = `${progressPercent}%`;
    
    // Actualizar etiquetas de participantes
    document.getElementById('currentParticipants').textContent = currentParticipants;
    document.getElementById('maxParticipants').textContent = maxParticipants;
    
    // Habilidades
    const skillsContainer = document.getElementById('challengeSkills');
    skillsContainer.innerHTML = '';
    
    if (challengeData.skills && challengeData.skills.length > 0) {
        challengeData.skills.forEach(skill => {
            const skillTag = document.createElement('span');
            skillTag.className = 'skill-tag';
            skillTag.textContent = skill;
            skillsContainer.appendChild(skillTag);
        });
    } else {
        const noSkills = document.createElement('p');
        noSkills.textContent = 'No se han especificado habilidades para este desafío';
        noSkills.className = 'text-muted';
        skillsContainer.appendChild(noSkills);
    }
    
    // Recursos
    const resourcesContainer = document.getElementById('challengeResources');
    resourcesContainer.innerHTML = '';
    
    if (challengeData.resources && challengeData.resources.length > 0) {
        const resourcesList = document.createElement('ul');
        resourcesList.className = 'resources-list';
        
        challengeData.resources.forEach(resource => {
            const resourceItem = document.createElement('li');
            
            if (resource.url) {
                const resourceLink = document.createElement('a');
                resourceLink.href = resource.url;
                resourceLink.target = '_blank';
                resourceLink.textContent = resource.name || resource.url;
                resourceItem.appendChild(resourceLink);
            } else {
                resourceItem.textContent = resource.name || 'Recurso sin nombre';
            }
            
            resourcesList.appendChild(resourceItem);
        });
        
        resourcesContainer.appendChild(resourcesList);
    } else {
        const noResources = document.createElement('p');
        noResources.textContent = 'No hay recursos disponibles para este desafío';
        noResources.className = 'text-muted';
        resourcesContainer.appendChild(noResources);
    }
    
    // Información adicional
    document.getElementById('challengeTeamSize').textContent = challengeData.teamSize || 'Individual';
    document.getElementById('challengeDuration').textContent = `${challengeData.duration || 'No especificada'}`;
    document.getElementById('challengeDeadline').textContent = challengeData.deadline ? new Date(challengeData.deadline).toLocaleDateString() : 'Sin fecha límite';
    
    // Actualizar botones según participación
    const participateBtn = document.getElementById('participateBtn');
    const submitSolutionBtn = document.getElementById('submitSolutionBtn');
    
    if (isParticipating) {
        participateBtn.textContent = 'Ya estás participando';
        participateBtn.disabled = true;
        submitSolutionBtn.style.display = 'block';
    } else {
        participateBtn.textContent = 'Participar en este desafío';
        participateBtn.disabled = isFull;
        submitSolutionBtn.style.display = 'none';
        
        if (isFull) {
            participateBtn.textContent = 'Desafío completo';
        }
    }
    
    // Información adicional
    const teamSize = challengeData.teamSizeMin === challengeData.teamSizeMax ? 
        `${challengeData.teamSizeMin} personas` : 
        `${challengeData.teamSizeMin}-${challengeData.teamSizeMax} personas`;
    
    document.getElementById('teamSize').textContent = teamSize;
    document.getElementById('duration').textContent = challengeData.duration;
    
    // Recursos
    const resourcesList = document.getElementById('resourcesList');
    resourcesList.innerHTML = '';
    
    if (challengeData.resources && challengeData.resources.length > 0) {
        const resourcesUl = document.createElement('ul');
        
        challengeData.resources.forEach(resource => {
            const li = document.createElement('li');
            li.innerHTML = `
                <i class="fas fa-link"></i>
                <a href="${resource.url}" target="_blank">${resource.title}</a>
            `;
            resourcesUl.appendChild(li);
        });
        
        resourcesList.appendChild(resourcesUl);
    } else {
        const noResources = document.createElement('p');
        noResources.className = 'no-resources';
        noResources.textContent = 'No hay recursos disponibles para este desafío.';
        resourcesList.appendChild(noResources);
    }
    
    // Creador
    if (challengeData.creator) {
        if (typeof challengeData.creator === 'object') {
            document.getElementById('creatorName').textContent = challengeData.creator.name || 'Usuario';
            document.getElementById('creatorName').href = `/profile.html?id=${challengeData.creator._id}`;
        } else {
            document.getElementById('creatorName').textContent = 'Usuario';
        }
    }
    
    // Botones de acción
    updateActionButtons();
}

// Cargar participantes destacados
async function loadFeaturedParticipants() {
    const featuredParticipantsList = document.getElementById('featuredParticipantsList');
    
    if (!challengeData || !challengeData.participants || challengeData.participants.length === 0) {
        featuredParticipantsList.innerHTML = '<p class="no-participants">No hay participantes registrados en este desafío.</p>';
        return;
    }
    
    try {
        featuredParticipantsList.innerHTML = '';
        
        // Mostrar solo los primeros 3 participantes
        const displayParticipants = challengeData.participants.slice(0, 3);
        
        for (const participantId of displayParticipants) {
            try {
                const response = await fetch(`/api/users/${participantId}`);
                const result = await response.json();
                
                if (response.ok && result.data) {
                    const participant = result.data;
                    
                    const participantItem = document.createElement('div');
                    participantItem.className = 'participant-item';
                    
                    const avatarDiv = document.createElement('div');
                    avatarDiv.className = 'participant-avatar';
                    
                    if (participant.avatar) {
                        const avatarImg = document.createElement('img');
                        avatarImg.src = participant.avatar;
                        avatarImg.alt = participant.name;
                        avatarDiv.appendChild(avatarImg);
                    } else {
                        avatarDiv.innerHTML = '<i class="fas fa-user"></i>';
                    }
                    
                    const infoDiv = document.createElement('div');
                    infoDiv.className = 'participant-info';
                    
                    const nameH4 = document.createElement('h4');
                    nameH4.textContent = participant.name || 'Usuario';
                    
                    const roleP = document.createElement('p');
                    roleP.textContent = participant.role || 'Participante';
                    
                    infoDiv.appendChild(nameH4);
                    infoDiv.appendChild(roleP);
                    
                    participantItem.appendChild(avatarDiv);
                    participantItem.appendChild(infoDiv);
                    
                    featuredParticipantsList.appendChild(participantItem);
                }
            } catch (err) {
                console.error('Error al cargar participante:', err);
            }
        }
        
        // Si no se pudo cargar ningún participante
        if (featuredParticipantsList.children.length === 0) {
            featuredParticipantsList.innerHTML = '<p class="no-participants">Error al cargar participantes.</p>';
        }
        
    } catch (error) {
        console.error('Error al cargar participantes destacados:', error);
        featuredParticipantsList.innerHTML = '<p class="no-participants">Error al cargar participantes.</p>';
    }
}

// Actualizar botones de acción según el estado de participación
function updateActionButtons() {
    if (!challengeData) return;
    
    const maxParticipants = challengeData.maxParticipants || 10;
    const currentParticipants = challengeData.participants ? challengeData.participants.length : 0;
    const isFull = currentParticipants >= maxParticipants;
    
    // Botón de participar
    if (isParticipating) {
        participateBtn.textContent = 'Ya estás participando';
        participateBtn.disabled = true;
        submitSolutionBtn.style.display = 'block';
    } else if (isFull) {
        participateBtn.textContent = 'Desafío completo';
        participateBtn.disabled = true;
        submitSolutionBtn.style.display = 'none';
    } else {
        participateBtn.textContent = 'Participar';
        participateBtn.disabled = false;
        submitSolutionBtn.style.display = 'none';
    }
}

// Cargar participantes del desafío
async function loadParticipants() {
    if (!challengeData || !challengeData.participants || challengeData.participants.length === 0) {
        participantsSection.style.display = 'none';
        return;
    }
    
    try {
        const participantsList = document.getElementById('participantsList');
        participantsList.innerHTML = '';
        
        // En una implementación real, aquí se haría una llamada a la API para obtener los detalles de los participantes
        // Por ahora, mostraremos información básica
        
        challengeData.participants.forEach(participant => {
            const participantCard = document.createElement('div');
            participantCard.className = 'participant-card';
            
            // En una implementación real, aquí se mostrarían los datos reales del participante
            participantCard.innerHTML = `
                <img src="/img/default-avatar.png" alt="Avatar" class="participant-avatar">
                <div class="participant-info">
                    <h4>Participante</h4>
                    <p>Miembro desde 2025</p>
                </div>
            `;
            
            participantsList.appendChild(participantCard);
        });
        
        participantsSection.style.display = 'block';
    } catch (error) {
        console.error('Error al cargar participantes:', error);
        participantsSection.style.display = 'none';
    }
}

// Cargar envíos del usuario
async function loadUserSubmissions() {
    // En una implementación real, aquí se haría una llamada a la API para obtener los envíos del usuario
    // Por ahora, ocultaremos esta sección
    submissionsSection.style.display = 'none';
}

// Participar en el desafío
async function participateInChallenge() {
    const token = localStorage.getItem('token');
    if (!token) {
        showLoginModal();
        return;
    }
    
    try {
        const response = await fetch(`/api/challenges/${challengeData._id}/participate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Actualizar datos del desafío
            challengeData.participants = challengeData.participants || [];
            challengeData.participants.push(result.data.userId);
            
            // Actualizar estado de participación
            isParticipating = true;
            
            // Actualizar UI
            updateActionButtons();
            
            // Recargar participantes
            await loadParticipants();
            
            // Mostrar notificación
            showNotification(result.data.message || '¡Te has unido al desafío exitosamente!', 'success');
        } else {
            showNotification(result.error || 'Error al participar en el desafío', 'error');
        }
    } catch (error) {
        console.error('Error al participar en el desafío:', error);
        showNotification('Error al participar en el desafío', 'error');
    }
}

// Mostrar modal de envío de solución
function showSubmitSolutionModal() {
    const modal = document.getElementById('submitSolutionModal');
    modal.style.display = 'flex';
}

// Configurar event listeners
function setupEventListeners() {
    // Botón de participar
    participateBtn.addEventListener('click', () => {
        if (!isParticipating) {
            participateInChallenge();
        }
    });
    
    // Botón de enviar solución
    submitSolutionBtn.addEventListener('click', () => {
        showSubmitSolutionModal();
    });
    
    // Botón de volver
    backBtn.addEventListener('click', () => {
        window.location.href = '/challenges.html';
    });
    
    // Modal de envío de solución
    const submitSolutionForm = document.getElementById('submitSolutionForm');
    submitSolutionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // En una implementación real, aquí se enviaría la solución a la API
        // Por ahora, solo mostraremos una notificación
        
        showNotification('Funcionalidad de envío de solución en desarrollo', 'info');
        document.getElementById('submitSolutionModal').style.display = 'none';
    });
    
    // Cerrar modales
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
        });
    });
    
    // Cerrar modales al hacer clic fuera
    window.addEventListener('click', (e) => {
        document.querySelectorAll('.modal').forEach(modal => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
}

// Mostrar notificación
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';
    
    setTimeout(() => {
        notification.style.display = 'none';
    }, 5000);
}

// Mostrar modal de login
function showLoginModal() {
    document.getElementById('loginModal').style.display = 'flex';
}
