// // ========================================
// // AUTH.JS - Authentication logic
// // ========================================

// // Register user
// async function registerUser(event) {
//     event.preventDefault();

//     const fullName = document.getElementById('fullName').value;
//     const username = document.getElementById('username').value;
//     const email = document.getElementById('email').value;
//     const password = document.getElementById('password').value;

//     try {
//         const response = await fetch(`${API_BASE_URL}/users/register`, {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json'
//             },
//             body: JSON.stringify({
//                 username,
//                 email,
//                 password,
//                 fullName
//             })
//         });

//         const data = await response.json();

//         if (!response.ok) {
//             showMessage(data.error || 'Registration failed', 'error');
//             return;
//         }

//         showMessage('Registration successful! Please login.', 'success');
//         document.getElementById('registerForm').reset();

//         setTimeout(() => {
//             window.location.href = '/login.html';
//         }, 2000);

//     } catch (error) {
//         showMessage('Error: ' + error.message, 'error');
//     }
// }

// // Login user
// async function loginUser(event) {
//     event.preventDefault();

//     const username = document.getElementById('username').value;
//     const password = document.getElementById('password').value;

//     try {
//         const response = await fetch(`${API_BASE_URL}/users/username/${username}`);

//         if (!response.ok) {
//             showMessage('Invalid username or password', 'error');
//             return;
//         }

//         const user = await response.json();

//         // Temporary password check (will add JWT later)
//         if (password === user.password) {
//             localStorage.setItem('token', 'fake-jwt-token');
//             localStorage.setItem('user', JSON.stringify(user));

//             await fetch(`${API_BASE_URL}/users/${user.id}/login`, {
//                 method: 'PUT'
//             });

//             window.location.href = '/dashboard.html';
//         } else {
//             showMessage('Invalid username or password', 'error');
//         }

//     } catch (error) {
//         showMessage('Error: ' + error.message, 'error');
//     }
// }

// // ========================================
// // EVENT LISTENERS
// // ========================================

// document.addEventListener('DOMContentLoaded', function () {
//     const registerForm = document.getElementById('registerForm');
//     if (registerForm) {
//         registerForm.addEventListener('submit', registerUser);
//     }

//     const loginForm = document.getElementById('loginForm');
//     if (loginForm) {
//         loginForm.addEventListener('submit', loginUser);
//     }
// });