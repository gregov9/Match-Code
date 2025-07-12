// Variables globales
const API_URL = '/api';

// Inicializar la aplicación cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', () => {
    // Verificar si ya hay una sesión activa
    const token = localStorage.getItem('adminToken');
    if (token) {
        window.location.href = '/admin/index.html';
        return;
    }

    // Manejar el formulario de login
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            try {
                const response = await fetch(`${API_URL}/admin/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (data.status === 'success') {
                    localStorage.setItem('adminToken', data.token);
                    window.location.href = '/admin/index.html';
                } else {
                    showAlert('error', data.message || 'Error al iniciar sesión');
                }
            } catch (error) {
                showAlert('error', 'Error al iniciar sesión. Por favor, intente nuevamente.');
                console.error(error);
            }
        });
    }

    // Manejar el formulario de registro
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Formulario de registro enviado'); // Debug

            const name = document.getElementById('register-name').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            const confirmPassword = document.getElementById('register-confirm-password').value;

            // Validar contraseñas
            if (password !== confirmPassword) {
                showAlert('error', 'Las contraseñas no coinciden');
                return;
            }

            try {
                console.log('Enviando solicitud al servidor...'); // Debug
                const response = await fetch(`${API_URL}/admin/create-admin`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        name,
                        email,
                        password
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Error al registrar administrador');
                }

                const data = await response.json();
                console.log('Datos recibidos:', data); // Debug

                if (data.status === 'success') {
                    showAlert('success', 'Administrador registrado exitosamente. Por favor, inicie sesión.');
                    // Cambiar a la pestaña de login
                    document.getElementById('login-tab').click();
                    // Limpiar el formulario
                    registerForm.reset();
                } else {
                    showAlert('error', data.message || 'Error al registrar administrador');
                }
            } catch (error) {
                console.error('Error detallado:', error); // Debug
                showAlert('error', error.message || 'Error al registrar administrador. Por favor, intente nuevamente.');
            }
        });
    }
});

// Función para mostrar alertas
function showAlert(type, message) {
    // Eliminar alerta anterior si existe
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) {
        existingAlert.remove();
    }

    // Crear nueva alerta
    const alert = document.createElement('div');
    alert.className = `alert alert-${type === 'success' ? 'success' : 'danger'} alert-dismissible fade show`;
    alert.role = 'alert';
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

    // Insertar alerta antes del primer formulario
    const firstForm = document.querySelector('form');
    firstForm.parentNode.insertBefore(alert, firstForm);

    // Eliminar alerta después de 5 segundos
    setTimeout(() => {
        alert.remove();
    }, 5000);
} 