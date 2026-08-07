// ========================================
// API.JS - API calls with JWT authentication
// ========================================

// Get JWT token
function getToken() {
    return localStorage.getItem('token');
}

// Get user ID
function getUserId() {
    return localStorage.getItem('userId');
}

// Check if logged in
function isLoggedIn() {
    const token = getToken();
    const userId = getUserId();
    return token && token !== 'undefined' && token !== 'null' &&
        userId && userId !== 'undefined' && userId !== 'null';
}

// Generic API call with JWT
async function fetchAPI(endpoint, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
        controller.abort();
    }, 30000);
    const token = getToken();

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    // Add Authorization header if token exists
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const url = `${API_BASE_URL}${endpoint}`;
        console.log('📡 Fetching:', url);

        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeout);

        console.log('📡 Response status:', response.status);

        // If unauthorized, redirect to login
        if (response.status === 401) {
            console.log('🔒 Unauthorized - Redirecting to login');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('userId');
            window.location.href = '/login.html';
            throw new Error('Session expired. Please login again.');
        }

        // If forbidden, show error
        if (response.status === 403) {
            console.log('🔒 Forbidden - You don\'t have permission. Clearing bad token.');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('userId');
            window.location.href = '/login.html';
            throw new Error('You don\'t have permission to access this resource.');
        }

        // Check if response has content
        const contentLength = response.headers.get('content-length');
        if (contentLength === '0') {
            console.log('⚠️ Response is empty');
            return null;
        }

        // Try to parse JSON
        try {
            const data = await response.json();
            console.log('📡 Response data:', data);

            if (!response.ok) {
                throw new Error(data.error || 'API call failed');
            }
            return data;
        } catch (jsonError) {
            console.error('❌ Failed to parse JSON:', jsonError);
            const text = await response.text();
            console.log('📡 Raw response:', text);
            throw new Error('Invalid response from server');
        }

    } catch (error) {
        clearTimeout(timeout);
        throw error;
    }
}

// ========================================
// SPECIFIC API CALLS
// ========================================

async function getUserStats(userId) {
    console.log('📊 Fetching stats for user:', userId);
    return fetchAPI(`/sessions/stats/${userId}`);
}

async function startSession(userId, durationMinutes = 25, sessionType = 'POMODORO') {
    console.log('🚀 Starting session for user:', userId);
    return fetchAPI('/sessions/start', {
        method: 'POST',
        body: JSON.stringify({
            userId: parseInt(userId),
            durationMinutes,
            sessionType
        })
    });
}

async function completeSession(sessionId) {
    console.log('✅ Completing session:', sessionId);
    return fetchAPI(`/sessions/complete/${sessionId}`, {
        method: 'PUT'
    });
}

async function getUserProfile(userId) {
    console.log('👤 Fetching profile for user:', userId);
    return fetchAPI(`/users/${userId}`);
}


async function getUserSessions(userId) {
    console.log('📋 Fetching sessions for user:', userId);
    return fetchAPI(`/sessions/user/${userId}`);
}

console.log('✅ api.js loaded');