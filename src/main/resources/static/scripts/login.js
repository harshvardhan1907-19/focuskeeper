// ========================================
// LOGIN.JS - Login functionality with JWT
// ========================================

// const API_BASE_URL = 'http://localhost:8080/api';

document.getElementById("loginForm").addEventListener("submit", async function (e) {
    e.preventDefault()
    console.log("🔐 Login button clicked");

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    const messageDiv = document.getElementById("message");

    // clear previous message
    messageDiv.className = "message";
    messageDiv.textContent = '';

    if (!username || !password) {
        messageDiv.className = 'message error';
        messageDiv.textContent = 'Please fill in all fields';
        return;
    }

    try {
        console.log('🔐 Attempting login for user:', username);

        // Call JWT login endpoint
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
            messageDiv.className = 'message error';
            messageDiv.textContent = data.error || 'Login failed';
            return;
        }

        console.log('✅ Login successful!');
        console.log('📦 Token received:', data.token ? data.token.substring(0, 30) + '...' : 'No token');

        // ✅ Store REAL JWT token from backend
        localStorage.setItem("token", data.token);  // ← Now storing real token!
        localStorage.setItem("userId", data.id);
        localStorage.setItem('user', JSON.stringify({
            id: data.id,
            username: data.username,
            email: data.email,
            fullName: data.fullName,
            createdAt: data.createdAt
        }));

        console.log('💾 Token stored in localStorage');

        messageDiv.className = 'message success';
        messageDiv.textContent = '✅ Login successful! Redirecting...';

        setTimeout(() => {
            window.location.href = "/dashboard.html";
        }, 1000);

    } catch (error) {
        console.log("❌ Error occurred:", error);
        messageDiv.className = 'message error';
        messageDiv.textContent = 'Login failed. Please try again.';
    }
});