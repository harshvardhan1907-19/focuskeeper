// ========================================
// REGISTER WITH JWT AUTHENTICATION
// ========================================

// const API_BASE_URL = 'http://localhost:8080/api';

document.getElementById('registerForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const fullName = document.getElementById('fullName').value.trim();
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const messageDiv = document.getElementById('message');

    // Clear previous messages
    messageDiv.className = 'message';
    messageDiv.textContent = '';

    if (!fullName || !username || !email || !password) {
        messageDiv.className = 'message error';
        messageDiv.textContent = 'Please fill in all fields';
        return;
    }

    try {
        console.log('📝 Registering user:', username);

        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password, fullName })
        });

        const data = await response.json();

        if (!response.ok) {
            messageDiv.className = 'message error';
            messageDiv.textContent = data.error || 'Registration failed';
            return;
        }

        console.log('✅ Registration successful!');

        messageDiv.className = 'message success';
        messageDiv.textContent = '✅ Registration successful! Redirecting to login...';

        setTimeout(() => {
            window.location.href = '/login.html';
        }, 2000);

    } catch (error) {
        console.error('❌ Registration error:', error);
        messageDiv.className = 'message error';
        messageDiv.textContent = '❌ Error: ' + error.message;
    }
});
