// Variables globales
const API_URL = window.location.origin + '/api';
let currentUserId = null;
let userDetailsModal = null;

// Función para escapar HTML y prevenir XSS
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Función para obtener el token del administrador
const getAdminToken = () => localStorage.getItem('adminToken');

// Función para verificar si hay una sesión activa
const checkAuth = () => {
    const token = getAdminToken();
    if (!token) {
        window.location.href = '/admin/login.html';
    }
    return token;
};

// Función para cerrar sesión
const logout = () => {
    localStorage.removeItem('adminToken');
    window.location.href = '/admin/login.html';
};

// Función para hacer peticiones a la API
async function fetchAPI(endpoint, options = {}) {
    const token = checkAuth();
    const defaultOptions = {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    });

    if (!response.ok) {
        let errorMessage;
        try {
            const errorData = await response.json();
            errorMessage = errorData.message || `Error: ${response.status} ${response.statusText}`;
        } catch (e) {
            const text = await response.text();
            console.error('Error response text:', text);
            errorMessage = `Error del servidor: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
    }

    return response.json();
}

// Función para cargar estadísticas
const loadStats = async () => {
    try {
        console.log('Cargando estadísticas...');
        const data = await fetchAPI('/admin/stats');
        console.log('Estadísticas recibidas:', data);
        updateStats(data.data);
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
        showAlert('error', error.message);
    }
};

// Función para actualizar las estadísticas en la UI
const updateStats = (stats) => {
    document.getElementById('pending-count').textContent = stats.pendingApprovals || 0;
    document.getElementById('mentors-count').textContent = stats.totalMentors || 0;
    document.getElementById('solvers-count').textContent = stats.totalSolvers || 0;
    document.getElementById('total-users-count').textContent = stats.totalUsers || 0;
};

// Función para cargar usuarios pendientes
const loadPendingUsers = async () => {
    try {
        console.log('Cargando usuarios pendientes...');
        const data = await fetchAPI('/admin/pending-users');
        console.log('Usuarios pendientes recibidos:', data);
        displayPendingUsers(data.data);
        
        // Actualizar estadísticas después de cargar usuarios
        loadStats();
    } catch (error) {
        console.error('Error al cargar usuarios pendientes:', error);
        showAlert('error', error.message);
    }
};

// Función para mostrar usuarios pendientes en la tabla
const displayPendingUsers = (users) => {
    const tableBody = document.getElementById('pending-users-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    if (users.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">No hay usuarios pendientes de aprobación</td>
            </tr>
        `;
        return;
    }

    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${escapeHtml(user.name)}</td>
            <td>${escapeHtml(user.email)}</td>
            <td><span class="badge bg-${user.role === 'mentor' ? 'success' : 'info'}">${user.role}</span></td>
            <td>${new Date(user.createdAt).toLocaleDateString()}</td>
            <td>
                <button class="btn btn-primary btn-sm" onclick="showUserDetails('${user._id}')">
                    <i class="fas fa-eye"></i> Ver
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
};

// Función para mostrar detalles del usuario en el modal
const showUserDetails = async (userId) => {
    try {
        currentUserId = userId;
        const token = checkAuth();
        const response = await fetch(`${API_URL}/admin/users/${userId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Error al obtener detalles del usuario');
        }

        const data = await response.json();
        const user = data.data;

        // Actualizar el contenido del modal
        document.getElementById('modal-user-name').textContent = user.name;
        document.getElementById('modal-user-email').textContent = user.email;
        document.getElementById('modal-user-role').textContent = user.role;
        document.getElementById('modal-user-date').textContent = new Date(user.createdAt).toLocaleString();

        // Mostrar u ocultar la sección de pago según el rol
        const paymentInfoSection = document.getElementById('payment-info-section');
        const mentorInfoSection = document.getElementById('mentor-info-section');

        // Ocultar ambas secciones por defecto
        paymentInfoSection.style.display = 'none';
        mentorInfoSection.style.display = 'none';

        if (user.role === 'solucionador') {
            paymentInfoSection.style.display = 'block';
            // Formatear el plan de suscripción
            let planText = 'No seleccionado';
            if (user.subscriptionPlan) {
                planText = user.subscriptionPlan === 'mensual' ? 
                    'Plan Mensual ($9.99/mes)' : 
                    'Plan Anual ($99.99/año)';
            }
            document.getElementById('modal-subscription-plan').textContent = planText;
            document.getElementById('modal-payment-reference').textContent = user.paymentReference || 'No disponible';
            document.getElementById('modal-payment-date').textContent = user.paymentDate ? 
                new Date(user.paymentDate).toLocaleString() : 'No disponible';
        } else if (user.role === 'mentor') {
            mentorInfoSection.style.display = 'block';
            // Mostrar lenguajes de programación
            document.getElementById('modal-programming-languages').textContent = 
                user.programmingLanguages ? user.programmingLanguages.join(', ') : 'No especificado';
            
            // Mostrar años de experiencia
            document.getElementById('modal-years-experience').textContent = 
                user.yearsOfExperience ? `${user.yearsOfExperience} años` : 'No especificado';
            
            // Mostrar descripción
            document.getElementById('modal-mentor-description').textContent = 
                user.mentorDescription || 'No especificado';
        }

        // Mostrar el modal
        const modal = new bootstrap.Modal(document.getElementById('userDetailsModal'));
        modal.show();

        // Configurar los botones del modal
        document.getElementById('modal-approve-btn').onclick = () => updateUserStatus(userId, 'approved');
        document.getElementById('modal-reject-btn').onclick = () => {
            const message = prompt('Por favor, ingrese el motivo del rechazo:');
            if (message !== null) {
                if (!message.trim()) {
                    showAlert('error', 'Debe proporcionar un motivo para el rechazo');
                    return;
                }
                updateUserStatus(userId, 'rejected', message);
            }
        };
    } catch (error) {
        showAlert('error', error.message);
    }
};

// Función para actualizar el estado de un usuario
const updateUserStatus = async (userId, status, message = '') => {
    try {
        const token = checkAuth();
        const response = await fetch(`${API_URL}/admin/users/${userId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status, message })
        });

        if (!response.ok) {
            throw new Error('Error al actualizar el estado del usuario');
        }

        const data = await response.json();
        showAlert('success', data.message);
        
        // Cerrar el modal
        const modalElement = document.getElementById('userDetailsModal');
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) {
            modal.hide();
        }
        
        // Recargar datos
        loadPendingUsers();
    } catch (error) {
        showAlert('error', error.message);
    }
};

// Función para mostrar alertas
const showAlert = (type, message) => {
    const alertsContainer = document.getElementById('alerts-container');
    if (!alertsContainer) return;

    const alert = document.createElement('div');
    alert.className = `alert alert-${type === 'success' ? 'success' : 'danger'} alert-dismissible fade show`;
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

    alertsContainer.appendChild(alert);

    // Remover la alerta después de 5 segundos
    setTimeout(() => {
        alert.remove();
    }, 5000);
};

// Inicializar la aplicación cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticación
    checkAuth();

    // Cargar datos iniciales
    loadStats();
    loadPendingUsers();

    // Configurar el botón de logout
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', logout);
    }

    // Configurar actualización automática cada 30 segundos
    setInterval(() => {
        loadPendingUsers();
    }, 30000);

    // Inicializar el sidebar toggle
    const sidebarCollapse = document.getElementById('sidebarCollapse');
    const sidebar = document.getElementById('sidebar');
    const content = document.getElementById('content');

    if (sidebarCollapse && sidebar && content) {
        sidebarCollapse.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            content.classList.toggle('active');
        });
    }

    // Manejo de navegación
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetSection = link.getAttribute('data-section');
            
            // Actualizar enlaces activos
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            // Mostrar sección correspondiente
            sections.forEach(section => {
                if (section.id === `${targetSection}-section`) {
                    section.classList.add('active');
                } else {
                    section.classList.remove('active');
                }
            });

            // Cargar datos según la sección
            switch(targetSection) {
                case 'dashboard':
                    loadDashboardData();
                    break;
                case 'mentores':
                    loadMentoresData();
                    break;
                case 'solucionadores':
                    loadSolucionadoresData();
                    break;
                case 'pendientes':
                    loadPendingUsers();
                    break;
                case 'registros':
                    loadRegistrosData();
                    break;
            }
        });
    });

    // Inicializar gráficos del dashboard
    function initCharts() {
        const activityCtx = document.getElementById('activityChart');
        const distributionCtx = document.getElementById('userDistributionChart');

        if (activityCtx && distributionCtx) {
            // Gráfico de actividad reciente
            new Chart(activityCtx, {
                type: 'line',
                data: {
                    labels: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio'],
                    datasets: [{
                        label: 'Mentores',
                        data: [12, 19, 3, 5, 2, 3],
                        borderColor: '#48bb78',
                        tension: 0.4
                    }, {
                        label: 'Solucionadores',
                        data: [5, 10, 15, 8, 12, 9],
                        borderColor: '#4a6bff',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });

            // Gráfico de distribución de usuarios
            new Chart(distributionCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Mentores', 'Solucionadores', 'Pendientes'],
                    datasets: [{
                        data: [30, 50, 20],
                        backgroundColor: ['#48bb78', '#4a6bff', '#ed8936']
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }
    }

    // Función para cargar datos del dashboard
    async function loadDashboardData() {
        try {
            const token = checkAuth();
            const response = await fetch(`${API_URL}/admin/stats`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Error al cargar datos del dashboard');
            }

            const data = await response.json();
            updateDashboardStats(data.data);
        } catch (error) {
            showAlert('error', error.message);
        }
    }

    // Función para actualizar estadísticas del dashboard
    function updateDashboardStats(stats) {
        updateElement('total-users-count', stats.totalUsers || 0);
        updateElement('mentors-count', stats.mentorsCount || 0);
        updateElement('solvers-count', stats.solversCount || 0);
        updateElement('pending-count', stats.pendingCount || 0);
    }

    // Función para cargar datos de mentores
    async function loadMentoresData() {
        try {
            console.log('Cargando datos de mentores...');
            const data = await fetchAPI('/admin/mentors');
            console.log('Datos de mentores recibidos:', data);
            displayMentores(data.data);
        } catch (error) {
            console.error('Error al cargar mentores:', error);
            showAlert('error', error.message);
        }
    }

    // Función para mostrar mentores en la tabla
    function displayMentores(mentores) {
        const tableBody = document.getElementById('mentors-table-body');
        if (!tableBody) return;

        tableBody.innerHTML = '';

        if (mentores.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">No hay mentores registrados</td>
                </tr>
            `;
            return;
        }

        mentores.forEach(mentor => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${escapeHtml(mentor.name)}</td>
                <td>${escapeHtml(mentor.email)}</td>
                <td>${escapeHtml(mentor.specialty)}</td>
                <td>${mentor.sessions}</td>
                <td>
                    <div class="rating">
                        ${mentor.rating.toFixed(1)} <i class="fas fa-star text-warning"></i>
                    </div>
                </td>
                <td>
                    <span class="badge bg-${mentor.status === 'Activo' ? 'success' : 'danger'}">
                        ${mentor.status}
                    </span>
                </td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-primary" onclick="viewMentorDetails('${mentor.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-warning" onclick="editMentor('${mentor.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteMentor('${mentor.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    // Función para cargar datos de solucionadores
    async function loadSolucionadoresData() {
        try {
            console.log('Cargando datos de solucionadores...');
            const data = await fetchAPI('/admin/solvers');
            console.log('Datos de solucionadores recibidos:', data);
            displaySolucionadores(data.data);
        } catch (error) {
            console.error('Error al cargar solucionadores:', error);
            showAlert('error', error.message);
        }
    }

    // Función para mostrar solucionadores en la tabla
    function displaySolucionadores(solucionadores) {
        const tableBody = document.getElementById('solvers-table-body');
        if (!tableBody) return;

        tableBody.innerHTML = '';

        if (solucionadores.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">No hay solucionadores registrados</td>
                </tr>
            `;
            return;
        }

        solucionadores.forEach(solucionador => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${escapeHtml(solucionador.name)}</td>
                <td>${escapeHtml(solucionador.email)}</td>
                <td>${solucionador.completedChallenges}</td>
                <td>${solucionador.points}</td>
                <td>Nivel ${solucionador.level}</td>
                <td>
                    <span class="badge bg-${solucionador.status === 'Activo' ? 'success' : 'danger'}">
                        ${solucionador.status}
                    </span>
                </td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-primary" onclick="viewSolverDetails('${solucionador.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-warning" onclick="editSolver('${solucionador.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteSolver('${solucionador.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    // Función para cargar datos de registros
    async function loadRegistrosData() {
        // Esta función se implementará más adelante cuando tengamos el endpoint de registros
        console.log('Cargando registros...');
    }

    // Función auxiliar para actualizar elementos del DOM
    function updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    // Funciones para manejar acciones de mentores
    function viewMentorDetails(mentorId) {
        // Por ahora solo mostraremos una alerta
        showAlert('info', 'Función de ver detalles en desarrollo');
    }

    function editMentor(mentorId) {
        // Por ahora solo mostraremos una alerta
        showAlert('info', 'Función de editar en desarrollo');
    }

    function deleteMentor(mentorId) {
        if (confirm('¿Está seguro de que desea eliminar este mentor?')) {
            // Por ahora solo mostraremos una alerta
            showAlert('info', 'Función de eliminar en desarrollo');
        }
    }

    // Funciones para manejar acciones de solucionadores
    function viewSolverDetails(solverId) {
        // Por ahora solo mostraremos una alerta
        showAlert('info', 'Función de ver detalles en desarrollo');
    }

    function editSolver(solverId) {
        // Por ahora solo mostraremos una alerta
        showAlert('info', 'Función de editar en desarrollo');
    }

    function deleteSolver(solverId) {
        if (confirm('¿Está seguro de que desea eliminar este solucionador?')) {
            // Por ahora solo mostraremos una alerta
            showAlert('info', 'Función de eliminar en desarrollo');
        }
    }

    window.approveUser = async function(id) {
        try {
            const response = await fetch(`/api/users/${id}/approve`, {
                method: 'POST'
            });
            if (!response.ok) throw new Error('Error al aprobar usuario');
            
            showAlert('Usuario aprobado exitosamente', 'success');
            loadPendingUsers();
            loadDashboardData();
        } catch (error) {
            showAlert('Error al aprobar usuario', 'danger');
        }
    };

    window.rejectUser = async function(id) {
        if (!confirm('¿Estás seguro de que deseas rechazar a este usuario?')) return;
        
        try {
            const response = await fetch(`/api/users/${id}/reject`, {
                method: 'POST'
            });
            if (!response.ok) throw new Error('Error al rechazar usuario');
            
            showAlert('Usuario rechazado', 'success');
            loadPendingUsers();
            loadDashboardData();
        } catch (error) {
            showAlert('Error al rechazar usuario', 'danger');
        }
    };

    window.viewRegistroDetails = async function(id) {
        try {
            const response = await fetch(`/api/registrations/${id}`);
            if (!response.ok) throw new Error('Error al obtener detalles del registro');
            const registro = await response.json();
            // Aquí implementarías la lógica para mostrar los detalles en un modal
            console.log('Detalles del registro:', registro);
        } catch (error) {
            showAlert('Error al cargar detalles del registro', 'danger');
        }
    };

    // Funciones para la configuración
    async function loadConfig() {
        try {
            const data = await fetchAPI('/config');
            if (data.data) {
                const config = data.data;
                document.getElementById('banco').value = config.pagoMovil?.banco || '';
                document.getElementById('telefono').value = config.pagoMovil?.telefono || '';
                document.getElementById('cedula').value = config.pagoMovil?.cedula || '';
                document.getElementById('nombreBeneficiario').value = config.pagoMovil?.nombreBeneficiario || '';
            }
        } catch (error) {
            console.error('Error al cargar la configuración:', error);
            showAlert('error', 'Error al cargar la configuración: ' + error.message);
        }
    }

    // Event listener para el formulario de pago móvil
    document.getElementById('pagoMovilForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            pagoMovil: {
                banco: document.getElementById('banco').value,
                telefono: document.getElementById('telefono').value,
                cedula: document.getElementById('cedula').value,
                nombreBeneficiario: document.getElementById('nombreBeneficiario').value
            }
        };

        try {
            const data = await fetchAPI('/config', {
                method: 'PUT',
                body: JSON.stringify(formData)
            });

            if (data.success) {
                showAlert('success', 'Configuración actualizada exitosamente');
            }
        } catch (error) {
            console.error('Error al guardar la configuración:', error);
            showAlert('error', 'Error al guardar la configuración: ' + error.message);
        }
    });

    // Cargar configuración cuando se muestra la sección
    document.querySelector('a[data-section="configuracion"]').addEventListener('click', () => {
        loadConfig();
    });
}); 