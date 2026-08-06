// ========================================
// DASHBOARD.JS - Dashboard functionality
// ========================================

// ========================================
// AUTH FUNCTIONS
// ========================================

function getLoggedInUser() {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userId');
    window.location.href = '/login.html';
}

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


// ========================================
// DASHBOARD LOADING
// ========================================

let currentUserId = null;
let currentSessionId = null;
let sessionStarted = false;
let currentDuration = 25; // Default 25 minutes
let timerInterval = null;
let timerSeconds = 1500; // 25 minutes default
let isTimerRunning = false;

async function loadDashboard() {
    const user = getLoggedInUser();
    if (!user || !isLoggedIn()) {
        console.log('❌ Not logged in, redirecting');
        window.location.href = '/login.html';
        return;
    }

    currentUserId = getUserId();
    console.log('👤 Loading dashboard for user:', currentUserId, user.username);

    // Update user info
    const userFullName = document.getElementById('userFullName');
    if (userFullName) userFullName.textContent = user.fullName || user.username;

    const profileUsername = document.getElementById('profileUsername');
    if (profileUsername) profileUsername.textContent = user.username;

    const profileEmail = document.getElementById('profileEmail');
    if (profileEmail) profileEmail.textContent = user.email || 'Not set';

    const profileFullName = document.getElementById('profileFullName');
    if (profileFullName) profileFullName.textContent = user.fullName || 'Not set';

    const profileJoined = document.getElementById('profileJoined');
    if (profileJoined) profileJoined.textContent = formatDate(user.createdAt);

    // Load stats from database
    await loadStats();

    // Update session status
    const sessionStatus = document.getElementById('sessionStatus');
    if (sessionStatus) sessionStatus.textContent = 'Ready to focus!';
}

async function loadStats() {
    try {
        console.log('📊 Loading stats...');
        const stats = await getUserStats(currentUserId);

        if (stats) {
            console.log('📊 Stats received:', stats);
            document.getElementById('sessionCount').textContent = stats.totalSessions || 0;
            document.getElementById('totalMinutes').textContent = stats.totalMinutes || 0;
        } else {
            console.log('⚠️ No stats received, using defaults');
            document.getElementById('sessionCount').textContent = 0;
            document.getElementById('totalMinutes').textContent = 0;
        }

    } catch (error) {
        console.error('❌ Error loading stats:', error);
        // Fallback to localStorage if API fails
        const sessionCount = localStorage.getItem('sessionCount') || 0;
        const totalMinutes = localStorage.getItem('totalMinutes') || 0;

        const sessionCountEl = document.getElementById('sessionCount');
        if (sessionCountEl) sessionCountEl.textContent = sessionCount;

        const totalMinutesEl = document.getElementById('totalMinutes');
        if (totalMinutesEl) totalMinutesEl.textContent = totalMinutes;

        // Show user-friendly message
        const statusEl = document.getElementById('sessionStatus');
        if (statusEl) {
            statusEl.textContent = '⚠️ Could not load stats. Please refresh.';
            statusEl.style.color = '#e74c3c';
        }
    }
}

// ========================================
// TIMER FUNCTIONS
// ========================================

function updateTimerDisplay() {
    const minutes = Math.floor(timerSeconds / 60);
    const seconds = timerSeconds % 60;
    const timerDisplay = document.getElementById('timerDisplay');
    if (timerDisplay) {
        timerDisplay.textContent =
            String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
    }
}

// Set timer duration - FIXED
function setTimerDuration(minutes) {
    console.log('⏱️ setTimerDuration called with:', minutes);

    // Don't allow changing if timer is running
    if (isTimerRunning) {
        alert('Please pause the timer before changing duration');
        return;
    }

    // Validate input
    if (minutes < 1) minutes = 1;
    if (minutes > 120) minutes = 120;

    // Update current duration
    currentDuration = minutes;
    timerSeconds = minutes * 60;

    // Reset session state
    sessionStarted = false;
    currentSessionId = null;

    // Stop any running timer
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    isTimerRunning = false;

    // Update the display immediately
    updateTimerDisplay();

    // Update input field
    const durationInput = document.getElementById('durationInput');
    if (durationInput) {
        durationInput.value = minutes;
    }

    // Update preset buttons
    document.querySelectorAll('.btn-preset').forEach(btn => {
        btn.classList.remove('active');
        if (parseInt(btn.dataset.minutes) === minutes) {
            btn.classList.add('active');
        }
    });

    // Update status
    const sessionStatus = document.getElementById('sessionStatus');
    if (sessionStatus) {
        sessionStatus.textContent = `⏱️ Duration set to ${minutes} minutes`;
    }

    console.log('✅ Duration set to:', minutes, 'minutes, timerSeconds:', timerSeconds);
}

// Start timer - FIXED
async function startTimer() {
    console.log('🔘 Start button clicked!');
    console.log('Current duration:', currentDuration, 'timerSeconds:', timerSeconds);

    if (isTimerRunning) {
        console.log('⏳ Timer already running');
        return;
    }

    if (timerSeconds === 0) {
        timerSeconds = currentDuration * 60;
        updateTimerDisplay();
    }

    // Create session in database
    if (!sessionStarted) {
        try {
            console.log('🚀 Creating session in database...');
            const sessionStatus = document.getElementById('sessionStatus');
            if (sessionStatus) sessionStatus.textContent = '⏳ Starting session...';

            const result = await startSession(currentUserId, currentDuration, 'POMODORO');
            currentSessionId = result.id;
            sessionStarted = true;

            console.log('✅ Session created with ID:', currentSessionId);
            if (sessionStatus) sessionStatus.textContent = '⏱️ Focus session in progress...';

        } catch (error) {
            console.error('❌ Failed to start session:', error);
            const sessionStatus = document.getElementById('sessionStatus');
            if (sessionStatus) sessionStatus.textContent = '❌ Failed to start session';
            alert('Failed to start session. Please try again.');
            return;
        }
    }

    // Start the timer
    isTimerRunning = true;
    console.log('▶️ Timer started');
    const sessionStatus = document.getElementById('sessionStatus');
    if (sessionStatus) sessionStatus.textContent = '⏱️ Focusing...';

    timerInterval = setInterval(() => {
        timerSeconds--;
        updateTimerDisplay();

        if (timerSeconds === 0) {
            clearInterval(timerInterval);
            isTimerRunning = false;

            console.log('🎯 Timer completed!');
            const sessionStatus = document.getElementById('sessionStatus');
            if (sessionStatus) sessionStatus.textContent = '✅ Session complete! Saving...';

            // Complete the session
            if (currentSessionId) {
                completeSession(currentSessionId)
                    .then(() => {
                        console.log('✅ Session completed in database!');
                        if (sessionStatus) sessionStatus.textContent = '🎉 Focus session complete! Great job!';
                        sessionStarted = false;
                        currentSessionId = null;
                        loadStats(); // Refresh stats
                    })
                    .catch(error => {
                        console.error('❌ Failed to complete session:', error);
                        if (sessionStatus) sessionStatus.textContent = '❌ Error saving session';
                    });
            }

            alert(`🎉 Focus session complete! Great job! (${currentDuration} minutes)`);
            timerSeconds = currentDuration * 60;
            updateTimerDisplay();
        }
    }, 1000);
}

function pauseTimer() {
    console.log('⏸️ Pause button clicked');
    if (isTimerRunning) {
        clearInterval(timerInterval);
        isTimerRunning = false;
        console.log('⏸️ Timer paused');
        const sessionStatus = document.getElementById('sessionStatus');
        if (sessionStatus) sessionStatus.textContent = '⏸️ Paused';
    } else {
        console.log('⏸️ Timer already paused');
    }
}

function resetTimer() {
    console.log('🔄 Reset button clicked');

    // Stop timer
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    isTimerRunning = false;

    // Reset to current duration
    timerSeconds = currentDuration * 60;
    updateTimerDisplay();
    sessionStarted = false;
    currentSessionId = null;

    const sessionStatus = document.getElementById('sessionStatus');
    if (sessionStatus) {
        sessionStatus.textContent = '🔄 Reset - Ready to focus!';
    }
    console.log('🔄 Timer reset to:', currentDuration, 'minutes');
}

// ========================================
// EVENT LISTENERS
// ========================================

document.addEventListener('DOMContentLoaded', function () {
    console.log('📄 Dashboard page loaded');

    // Check authentication
    if (!isLoggedIn()) {
        console.log('❌ Not logged in, redirecting to login');
        window.location.href = '/login.html';
        return;
    }

    // Load dashboard
    loadDashboard();

    // ========================================
    // DURATION CONTROLS
    // ========================================

    // Set duration button
    const setDurationBtn = document.getElementById('setDurationBtn');
    if (setDurationBtn) {
        setDurationBtn.addEventListener('click', function () {
            const input = document.getElementById('durationInput');
            let minutes = parseInt(input.value);
            console.log('🔘 Set button clicked, value:', minutes);

            if (isNaN(minutes) || minutes < 1) {
                alert('Please enter a valid number (1-120)');
                return;
            }
            if (minutes > 120) {
                alert('Maximum duration is 120 minutes');
                return;
            }
            setTimerDuration(minutes);
        });
    }

    // Enter key on duration input
    const durationInput = document.getElementById('durationInput');
    if (durationInput) {
        durationInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                let minutes = parseInt(this.value);
                console.log('⌨️ Enter pressed, value:', minutes);

                if (isNaN(minutes) || minutes < 1) {
                    alert('Please enter a valid number (1-120)');
                    return;
                }
                if (minutes > 120) {
                    alert('Maximum duration is 120 minutes');
                    return;
                }
                setTimerDuration(minutes);
            }
        });
    }

    // Preset buttons
    document.querySelectorAll('.btn-preset').forEach(btn => {
        btn.addEventListener('click', function () {
            const minutes = parseInt(this.dataset.minutes);
            console.log('🔘 Preset button clicked:', minutes, 'minutes');
            setTimerDuration(minutes);
        });
    });

    // ========================================
    // TIMER CONTROLS
    // ========================================

    const startBtn = document.getElementById('startTimer');
    if (startBtn) {
        startBtn.addEventListener('click', startTimer);
        console.log('✅ Start button found');
    }

    const pauseBtn = document.getElementById('pauseTimer');
    if (pauseBtn) {
        pauseBtn.addEventListener('click', pauseTimer);
        console.log('✅ Pause button found');
    }

    const resetBtn = document.getElementById('resetTimer');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetTimer);
        console.log('✅ Reset button found');
    }

    // ========================================
    // LOGOUT
    // ========================================

    const logoutLink = document.getElementById('logoutLink');
    if (logoutLink) {
        logoutLink.addEventListener('click', function (e) {
            e.preventDefault();
            logout();
        });
        console.log('✅ Logout button found');
    }

    // Initialize timer display with default 25 minutes
    setTimerDuration(25);

    console.log('✅ Dashboard ready!');
});