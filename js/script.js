// Helper function to get CSRF token
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

document.addEventListener('DOMContentLoaded', function() {
    // --- Pharmacy Signup Form --- (pharmacy/signup.html)
    const signupForm = document.getElementById('pharmacy-signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', function(event) {
            event.preventDefault();

            const password = signupForm.querySelector('input[name="password"]').value;
            const confirmPassword = signupForm.querySelector('input[name="confirm-password"]').value;

            if (password !== confirmPassword) {
                alert('Passwords do not match.');
                return;
            }

            const formData = new FormData(signupForm);
            const data = {
                user: {
                    username: formData.get('username'),
                    email: formData.get('email'),
                    password: formData.get('password'),
                    user_type: 'PHARMACY'
                },
                name: formData.get('pharmacy-name'),
                address: formData.get('address'),
                phone_number: formData.get('phone-number'),
            };

            fetch('/api/pharmacies/create/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify(data)
            })
            .then(response => {
                if (response.ok) {
                    alert('Registration successful! Please log in.');
                    window.location.href = '/pharmacy/login.html';
                } else {
                    return response.json().then(errors => {
                        console.error('Signup failed:', errors);
                        let errorMsg = 'Signup failed:\n';
                        for (const field in errors) {
                            errorMsg += `${field}: ${errors[field].join(', ')}\n`;
                        }
                        alert(errorMsg);
                    });
                }
            })
            .catch(error => {
                console.error('Error during signup:', error);
                alert('An unexpected error occurred. Please try again later.');
            });
        });
    }

    // --- Pharmacy Login Form --- (pharmacy/login.html)
    const loginForm = document.getElementById('pharmacy-login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(event) {
            event.preventDefault();
            const formData = new FormData(loginForm);
            const data = {
                username: formData.get('username'),
                password: formData.get('password')
            };

            fetch('/api/token/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify(data)
            })
            .then(response => {
                 if (response.ok) {
                    return response.json();
                } else {
                    throw new Error('Login failed. Please check your credentials.');
                }
            })
            .then(data => {
                localStorage.setItem('accessToken', data.access);
                localStorage.setItem('refreshToken', data.refresh);
                window.location.href = '/pharmacy/dashboard.html';
            })
            .catch(error => {
                console.error('Login error:', error);
                alert(error.message);
            });
        });
    }

    // --- Map Loading Logic --- (app.html)
    const mapElement = document.getElementById('map');
    if (mapElement) {
        const map = L.map('map').setView([51.505, -0.09], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        fetch('/api/pharmacies/')
            .then(response => response.ok ? response.json() : Promise.reject('Failed to load pharmacies'))
            .then(pharmacies => {
                pharmacies.forEach(pharmacy => {
                    if (pharmacy.latitude && pharmacy.longitude) {
                        L.marker([pharmacy.latitude, pharmacy.longitude])
                            .addTo(map)
                            .bindPopup(`<b>${pharmacy.name}</b><br>${pharmacy.address}`);
                    }
                });
            })
            .catch(error => {
                console.error('Error fetching pharmacies:', error);
                const pharmacyList = document.getElementById('pharmacy-list');
                if (pharmacyList) {
                    pharmacyList.innerHTML = '<li class="error-message">Could not load pharmacies.</li>';
                }
            });
    }

    // --- Pharmacy Dashboard Logic --- (pharmacy/dashboard.html)
    const welcomeMessage = document.getElementById('welcome-message');
    if (welcomeMessage) {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            window.location.href = '/pharmacy/login.html';
        } else {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const username = payload.username;
                welcomeMessage.textContent = `Welcome, ${username}!`;
            } catch (e) {
                console.error('Error decoding token:', e);
                window.location.href = '/pharmacy/login.html';
            }
        }
    }
});