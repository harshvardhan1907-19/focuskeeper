// ========================================
// APP.JS - Shared functions
// ========================================

// const API_BASE_URL = 'https://egwdm-2409-4080-9104-e7e6-15e5-9dfd-5da9-c93b.free.pinggy.net/api';
const API_BASE_URL = 'https://focuskeeper-n98l.onrender.com/api';

// Check if user is logged in
function isLoggedIn() {
    return localStorage.getItem('token') !== null && localStorage.getItem('userId') !== null;
}

// Get logged in user
function getLoggedInUser() {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
}

// Get user ID
function getUserId() {
    return localStorage.getItem('userId');
}

// Logout
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userId');
    window.location.href = '/login.html';
}

// Format date
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Show message
function showMessage(message, type = 'error') {
    const messageElement = document.getElementById('message');
    if (messageElement) {
        messageElement.textContent = message;
        messageElement.className = `message ${type}`;
    }
}

// Log when app loads
console.log('✅ App.js loaded');