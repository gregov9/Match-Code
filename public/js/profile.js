// Variables globales
let currentUser = null;

// Función para mostrar notificaciones
function showNotification(type, message) {
    // Remover notificaciones anteriores
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    // Remover después de 3 segundos
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Función para validar el nombre de usuario
function validateUsername(username) {
    const regex = /^[a-zA-Z0-9_]{3,20}$/;
    return regex.test(username);
}

// Función para abrir el modal del perfil
function openProfileModal() {
    const modal = document.getElementById('profile-modal');
    modal.style.display = 'flex';
    loadUserProfile();
}

// Función para cerrar el modal del perfil
function closeProfileModal() {
    const modal = document.getElementById('profile-modal');
    modal.style.display = 'none';
}

// Función para cargar el perfil del usuario
async function loadUserProfile() {
    console.log('Inicializando perfil...');
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showNotification('error', 'No hay sesión activa');
            return;
        }

        // Primero cargar datos del localStorage para mostrar algo inmediatamente
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const user = JSON.parse(userStr);
            console.log('Usuario encontrado en localStorage:', user);
            updateUIWithUserData(user);
        }

        // Luego hacer la petición al servidor para datos actualizados
        const response = await fetch('/api/users/me', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        console.log('Respuesta del servidor:', data);

        if (!response.ok) {
            throw new Error(data.message || 'Error al cargar el perfil');
        }

        if (data.status === 'success' && data.data) {
            // Actualizar UI y localStorage con los datos más recientes
            updateUIWithUserData(data.data);
            localStorage.setItem('user', JSON.stringify(data.data));
        } else {
            throw new Error('Formato de respuesta inválido');
        }

    } catch (error) {
        console.error('Error al cargar el perfil:', error);
        showNotification('error', error.message);
    }
}

// Actualizar la UI del perfil
function updateProfileUI(userData) {
    console.log('Actualizando UI con datos:', userData);

    try {
        // Actualizar nombre y correo
        document.getElementById('profileName').textContent = userData.name || 'N/A';
        document.getElementById('profileEmail').textContent = userData.email || 'N/A';
        document.getElementById('profileUsername').textContent = userData.username || 'N/A';

        // Actualizar biografía
        const bioElement = document.getElementById('profileBio');
        if (bioElement) {
            bioElement.textContent = userData.bio || userData.mentorDescription || 'No hay biografía disponible';
        }

        // Actualizar lenguajes de programación
        const languagesElement = document.getElementById('profileLanguages');
        if (languagesElement) {
            const languages = userData.programmingLanguages || [];
            languagesElement.textContent = languages.length > 0 ? languages.join(', ') : 'No hay lenguajes especificados';
        }

        // Actualizar rol
        const roleElement = document.getElementById('profileRole');
        if (roleElement) {
            let roleText = '';
            switch(userData.role) {
                case 'solucionador':
                    roleText = 'Solucionador';
                    break;
                case 'mentor':
                    roleText = 'Mentor';
                    break;
                default:
                    roleText = 'Usuario';
            }
            roleElement.textContent = roleText;
        }

        // Actualizar años de experiencia si es mentor
        const experienceElement = document.getElementById('profileExperience');
        if (experienceElement && userData.role === 'mentor') {
            experienceElement.textContent = userData.yearsOfExperience ? `${userData.yearsOfExperience} años` : 'No especificado';
        }

        // Actualizar avatar
        const avatarImg = document.getElementById('profile-avatar-img');
        if (avatarImg) {
            avatarImg.src = userData.avatar || '/img/default-avatar.png';
        }

        // Actualizar estadísticas
        const pointsElement = document.getElementById('profile-points');
        if (pointsElement) pointsElement.textContent = userData.points || 0;

        const challengesElement = document.getElementById('profile-challenges');
        if (challengesElement) challengesElement.textContent = userData.challengesCompleted || 0;

        const teamsElement = document.getElementById('profile-teams');
        if (teamsElement) teamsElement.textContent = userData.teamsJoined || 0;

        // Actualizar habilidades
        if (userData.skills && Array.isArray(userData.skills)) {
            updateSkillsUI(userData.skills);
        } else {
            updateSkillsUI([]);
        }

        // Actualizar configuraciones
        const emailNotifications = document.getElementById('email-notifications');
        if (emailNotifications) {
            emailNotifications.checked = userData.settings?.emailNotifications || false;
        }

        const browserNotifications = document.getElementById('browser-notifications');
        if (browserNotifications) {
            browserNotifications.checked = userData.settings?.browserNotifications || false;
        }

        console.log('UI actualizada correctamente');
    } catch (error) {
        console.error('Error al actualizar la UI:', error);
    }
}

// Actualizar la UI de habilidades
function updateSkillsUI(skills) {
    const container = document.getElementById('profile-skills');
    container.innerHTML = '';

    skills.forEach(skill => {
        const skillTag = document.createElement('div');
        skillTag.className = 'skill-tag';
        skillTag.innerHTML = `
            ${skill}
            <i class="fas fa-times" onclick="removeSkill('${skill}')"></i>
        `;
        container.appendChild(skillTag);
    });

    // Agregar botón para añadir habilidades
    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.className = 'add-skill-btn';
    addButton.innerHTML = '<i class="fas fa-plus"></i> Agregar';
    addButton.onclick = showAddSkillDialog;
    container.appendChild(addButton);
}

// Mostrar diálogo para agregar habilidad
function showAddSkillDialog() {
    const skill = prompt('Ingresa una nueva habilidad:');
    if (skill && skill.trim()) {
        addSkill(skill.trim());
    }
}

// Agregar una habilidad
async function addSkill(skill) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/users/skills', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ skill })
        });

        const data = await response.json();
        if (data.success) {
            currentUser.skills = data.data.skills;
            updateSkillsUI(currentUser.skills);
            showNotification('success', 'Habilidad agregada exitosamente');
        }
    } catch (error) {
        console.error('Error al agregar habilidad:', error);
        showNotification('error', 'Error al agregar habilidad');
    }
}

// Eliminar una habilidad
async function removeSkill(skill) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/users/skills', {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ skill })
        });

        const data = await response.json();
        if (data.success) {
            currentUser.skills = data.data.skills;
            updateSkillsUI(currentUser.skills);
            showNotification('success', 'Habilidad eliminada exitosamente');
        }
    } catch (error) {
        console.error('Error al eliminar habilidad:', error);
        showNotification('error', 'Error al eliminar habilidad');
    }
}

// Cambiar contraseña
async function changePassword() {
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (newPassword !== confirmPassword) {
        showNotification('error', 'Las contraseñas no coinciden');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/users/change-password', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        });

        const data = await response.json();
        if (data.success) {
            showNotification('success', 'Contraseña actualizada exitosamente');
            // Limpiar campos
            document.getElementById('current-password').value = '';
            document.getElementById('new-password').value = '';
            document.getElementById('confirm-password').value = '';
        } else {
            showNotification('error', data.message || 'Error al cambiar la contraseña');
        }
    } catch (error) {
        console.error('Error al cambiar contraseña:', error);
        showNotification('error', 'Error al cambiar la contraseña');
    }
}

// Manejar cambio de avatar
document.querySelector('.change-avatar-btn').addEventListener('click', function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async function(e) {
        const file = e.target.files[0];
        if (file) {
            const formData = new FormData();
            formData.append('avatar', file);

            try {
                const token = localStorage.getItem('token');
                const response = await fetch('/api/users/avatar', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                });

                const data = await response.json();
                if (data.success) {
                    document.getElementById('profile-avatar-img').src = data.data.avatarUrl;
                    showNotification('success', 'Avatar actualizado exitosamente');
                }
            } catch (error) {
                console.error('Error al actualizar avatar:', error);
                showNotification('error', 'Error al actualizar el avatar');
            }
        }
    };
    input.click();
});

// Manejar guardado del perfil
document.getElementById('profile-form').addEventListener('submit', async function(e) {
    e.preventDefault();

    const updatedProfile = {
        username: document.getElementById('profile-username').value,
        bio: document.getElementById('profile-bio').value,
        settings: {
            emailNotifications: document.getElementById('email-notifications').checked,
            browserNotifications: document.getElementById('browser-notifications').checked
        }
    };

    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/users/profile', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedProfile)
        });

        const data = await response.json();
        if (data.success) {
            currentUser = { ...currentUser, ...data.data };
            showNotification('success', 'Perfil actualizado exitosamente');
        }
    } catch (error) {
        console.error('Error al actualizar perfil:', error);
        showNotification('error', 'Error al actualizar el perfil');
    }
});

// Manejar tabs
document.querySelectorAll('.tab-btn').forEach(button => {
    button.addEventListener('click', function() {
        // Remover clase active de todos los botones
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        // Agregar clase active al botón clickeado
        this.classList.add('active');

        // Ocultar todos los contenidos
        document.querySelectorAll('.tab-content').forEach(content => {
            content.style.display = 'none';
        });

        // Mostrar el contenido correspondiente
        const tabId = this.getAttribute('data-tab');
        document.getElementById(`${tabId}-tab`).style.display = 'block';
    });
});

// Cerrar modal al hacer clic fuera
window.addEventListener('click', function(event) {
    const modal = document.getElementById('profile-modal');
    if (event.target === modal) {
        closeProfileModal();
    }
});

// Cerrar modal con el botón X
document.querySelector('#profile-modal .close-modal').addEventListener('click', closeProfileModal);

// Inicialización cuando el DOM está cargado
document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando perfil...');

    // Configurar eventos para el modal de perfil
    const profileLinks = document.querySelectorAll('.profile-link, [onclick*="openProfileModal"]');
    profileLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            openProfileModal();
        });
    });

    // Configurar cierre del modal
    const closeButtons = document.querySelectorAll('.close-modal');
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            closeProfileModal();
        });
    });

    // Cerrar modal al hacer clic fuera
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('profile-modal');
        if (event.target === modal) {
            closeProfileModal();
        }
    });

    // Configurar tabs
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    console.log('Perfil inicializado');
});

// Función para cambiar de tab
function switchTab(tabId) {
    // Desactivar todos los tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Ocultar todos los contenidos
    document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
    });
    
    // Activar el tab seleccionado
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    document.getElementById(`${tabId}-tab`).style.display = 'block';
}

// Función para actualizar la UI con los datos del usuario
function updateUIWithUserData(user) {
    console.log('Actualizando UI con datos:', user);
    try {
        // Actualizar nombre y rol
        document.getElementById('profile-name').textContent = user.name || '';
        document.getElementById('profile-role').textContent = user.role || '';
        
        // Actualizar avatar
        const avatarImg = document.getElementById('profile-avatar-img');
        if (avatarImg) {
            if (user.avatarUrl) {
                avatarImg.src = user.avatarUrl + '?t=' + new Date().getTime();
            } else if (user.avatar) {
                avatarImg.src = user.avatar.startsWith('http') ? user.avatar : `/uploads/avatars/${user.avatar}`;
            } else {
                avatarImg.src = '/img/default-avatar.png';
            }
        }

        // Actualizar campos del formulario
        document.getElementById('profile-email').value = user.email || '';
        document.getElementById('profile-username').value = user.username || '';
        document.getElementById('profile-bio').value = user.bio || '';

        // Actualizar estadísticas
        document.getElementById('profile-points').textContent = user.points || '0';
        document.getElementById('profile-challenges').textContent = user.completedChallenges || '0';
        document.getElementById('profile-teams').textContent = user.teams || '0';

        // Reinicializar el botón de avatar
        initializeAvatarUpload();

        console.log('UI actualizada correctamente');
    } catch (error) {
        console.error('Error al actualizar la UI:', error);
        throw error;
    }
}

// Función para guardar los cambios del perfil
async function saveProfileChanges(event) {
    event.preventDefault();
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showNotification('error', 'No hay sesión activa');
            return;
        }

        const formData = {
            name: document.getElementById('profile-name').textContent,
            username: document.getElementById('profile-username').value,
            bio: document.getElementById('profile-bio').value
        };

        const response = await fetch('/api/users/profile', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();
        console.log('Respuesta del servidor:', data);

        if (!response.ok) {
            throw new Error(data.message || 'Error al guardar los cambios');
        }

        if (data.status === 'success') {
            // Actualizar datos en localStorage y UI
            localStorage.setItem('user', JSON.stringify(data.data));
            updateUIWithUserData(data.data);
            showNotification('success', 'Perfil actualizado correctamente');
        } else {
            throw new Error('Formato de respuesta inválido');
        }

    } catch (error) {
        console.error('Error al guardar cambios:', error);
        showNotification('error', error.message);
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', saveProfileChanges);
    }

    // Validación en tiempo real del nombre de usuario
    const usernameInput = document.getElementById('profile-username');
    if (usernameInput) {
        usernameInput.addEventListener('input', (e) => {
            const username = e.target.value.trim();
            const isValid = validateUsername(username);
            
            // Actualizar estilo del campo
            e.target.style.borderColor = isValid ? '#28a745' : '#dc3545';
            
            // Actualizar mensaje de ayuda
            const hint = e.target.parentElement.querySelector('.hint');
            if (hint) {
                hint.textContent = isValid ? 
                    'Nombre de usuario válido' : 
                    'El nombre de usuario debe tener entre 3 y 20 caracteres y solo puede contener letras, números y guiones bajos';
                hint.style.color = isValid ? '#28a745' : '#dc3545';
            }
        });
    }

    // Manejar cambio de avatar
    const avatarInput = document.getElementById('avatar-input');
    const avatarPreview = document.getElementById('profile-avatar-img');
    
    if (avatarInput && avatarPreview) {
        avatarInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    avatarPreview.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }
});

// Exportar funciones necesarias
window.openProfileModal = openProfileModal;
window.saveProfileChanges = saveProfileChanges;

// Función para subir avatar
async function uploadAvatar(file) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showNotification('error', 'No hay sesión activa');
            return;
        }

        // Crear FormData y agregar el archivo
        const formData = new FormData();
        formData.append('avatar', file);

        // Hacer la petición al servidor
        const response = await fetch('/api/users/upload-avatar', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Error al subir el avatar');
        }

        const data = await response.json();
        
        if (data.status === 'success') {
            // Actualizar la imagen del avatar en la UI
            const avatarImg = document.getElementById('profile-avatar-img');
            if (avatarImg) {
                avatarImg.src = data.data.avatarUrl + '?t=' + new Date().getTime();
            }
            
            // Actualizar el avatar en el localStorage
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                user.avatar = data.data.avatarUrl;
                localStorage.setItem('user', JSON.stringify(user));
            }

            showNotification('success', 'Avatar actualizado correctamente');
        } else {
            throw new Error('Formato de respuesta inválido');
        }
    } catch (error) {
        console.error('Error al subir el avatar:', error);
        showNotification('error', error.message);
        throw error;
    }
}

// Función para inicializar el botón de cambio de avatar
function initializeAvatarUpload() {
    const changeAvatarBtn = document.querySelector('.change-avatar-btn');
    if (changeAvatarBtn) {
        // Remover event listeners anteriores
        const newBtn = changeAvatarBtn.cloneNode(true);
        changeAvatarBtn.parentNode.replaceChild(newBtn, changeAvatarBtn);
        
        newBtn.addEventListener('click', () => {
            // Crear un input file oculto
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'image/*';
            fileInput.style.display = 'none';
            
            // Agregar el input al DOM
            document.body.appendChild(fileInput);
            
            // Simular clic en el input
            fileInput.click();
            
            // Manejar la selección de archivo
            fileInput.addEventListener('change', async (e) => {
                if (e.target.files && e.target.files[0]) {
                    const file = e.target.files[0];
                    
                    // Mostrar vista previa inmediata
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const avatarImg = document.getElementById('profile-avatar-img');
                        if (avatarImg) {
                            avatarImg.src = e.target.result;
                        }
                    };
                    reader.readAsDataURL(file);
                    
                    // Subir el archivo
                    await uploadAvatar(file);
                }
                // Limpiar el input
                document.body.removeChild(fileInput);
            });
        });
    }
}

// Asegurarse de que el botón de cambio de avatar se inicialice cuando se carga el perfil
document.addEventListener('DOMContentLoaded', () => {
    initializeAvatarUpload();
}); 