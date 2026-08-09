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
let currentDuration = 25;
let timerInterval = null;
let timerSeconds = 1500;
let isTimerRunning = false;

// ✅ Helper function to safely update element text
function safeSetTextContent(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    } else {
        console.warn(`⚠️ Element with id '${elementId}' not found`);
    }
}

// ✅ LOAD DATA ONCE when dashboard loads
async function loadDashboard() {
    const user = getLoggedInUser();
    if (!user || !isLoggedIn()) {
        console.log('❌ Not logged in, redirecting');
        window.location.href = '/login.html';
        return;
    }

    currentUserId = getUserId();
    console.log('👤 Loading dashboard for user:', currentUserId, user.username);

    // Update user info with safe checks
    safeSetTextContent('userFullName', user.fullName || user.username);
    safeSetTextContent('profileUsername', user.username);
    safeSetTextContent('profileEmail', user.email || 'Not set');
    safeSetTextContent('profileFullName', user.fullName || 'Not set');
    safeSetTextContent('profileJoined', formatDate(user.createdAt));

    // ✅ AJAX calls - load data ONCE on page load
    await loadStats();
    await loadSessionHistory();

    // Update session status
    const sessionStatus = document.getElementById('sessionStatus');
    if (sessionStatus) sessionStatus.textContent = 'Ready to focus!';
}

// ✅ Load stats via AJAX
async function loadStats() {
    try {
        console.log('📊 Loading stats...');
        const stats = await getUserStats(currentUserId);

        if (stats) {
            // Update stats card
            safeSetTextContent('sessionCount', stats.totalSessions || 0);
            safeSetTextContent('totalMinutes', stats.totalMinutes || 0);

            // Update summary badges (if they exist)
            safeSetTextContent('totalSessionsSummary', stats.totalSessions || 0);
            safeSetTextContent('totalMinutesSummary', stats.totalMinutes || 0);
            safeSetTextContent('todaySessionsSummary', stats.todaySessionCount || 0);
            safeSetTextContent('todayMinutesSummary', stats.todayMinutes || 0);
        }
    } catch (error) {
        console.error('❌ Error loading stats:', error);
        safeSetTextContent('sessionCount', 0);
        safeSetTextContent('totalMinutes', 0);
    }
}

// ✅ Load session history via AJAX
async function loadSessionHistory() {
    try {
        console.log('📋 Loading session history...');
        const sessions = await getUserSessions(currentUserId);
        const container = document.getElementById('sessionHistoryList');

        if (!container) {
            console.warn('⚠️ sessionHistoryList element not found');
            return;
        }

        if (!sessions || sessions.length === 0) {
            container.innerHTML = `
                <div class="no-sessions">
                    <span class="emoji">🧘</span>
                    No sessions yet.<br>
                    Start your first focus session!
                </div>
            `;
            safeSetTextContent('totalSessionsDisplay', '0');
            safeSetTextContent('totalMinutesDisplay', '0');
            return;
        }

        let totalMinutes = 0;
        let tableHTML = `
            <table class="session-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Date</th>
                        <th>Duration</th>
                        <th>Type</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
        `;

        sessions.forEach((session, index) => {
            const date = formatDate(session.sessionDate);
            const duration = session.durationMinutes + ' min';
            const type = session.sessionType || 'POMODORO';
            const isCompleted = session.isCompleted;
            const statusClass = isCompleted ? 'completed' : 'pending';
            const statusText = isCompleted ? '✅ Complete' : '⏳ Pending';

            if (isCompleted) {
                totalMinutes += session.durationMinutes || 0;
            }

            tableHTML += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${date}</td>
                    <td>${duration}</td>
                    <td><span class="session-type type-${type}">${type}</span></td>
                    <td class="${statusClass}">${statusText}</td>
                </tr>
            `;
        });

        tableHTML += `</tbody></table>`;
        container.innerHTML = tableHTML;

        safeSetTextContent('totalSessionsDisplay', sessions.length);
        safeSetTextContent('totalMinutesDisplay', totalMinutes);

        console.log('📋 Session history loaded:', sessions.length, 'sessions');

    } catch (error) {
        console.error('❌ Error loading session history:', error);
        const container = document.getElementById('sessionHistoryList');
        if (container) {
            container.innerHTML = `
                <div class="no-sessions" style="color: #e74c3c;">
                    <span class="emoji">⚠️</span>
                    Could not load session history.<br>
                    Please refresh the page.
                </div>
            `;
        }
    }
}

// ========================================
// TIMER FUNCTIONS
// ========================================

function updateTimerDisplay() {
    const timerDisplay = document.getElementById('timerDisplay');
    if (!timerDisplay) return;

    const minutes = Math.floor(timerSeconds / 60);
    const seconds = timerSeconds % 60;
    timerDisplay.textContent =
        String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
}

function setTimerDuration(minutes) {
    if (isTimerRunning) {
        alert('Please pause the timer before changing duration');
        return;
    }

    if (minutes < 1) minutes = 1;
    if (minutes > 120) minutes = 120;

    currentDuration = minutes;
    timerSeconds = minutes * 60;
    sessionStarted = false;
    currentSessionId = null;

    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    isTimerRunning = false;

    updateTimerDisplay();

    const durationInput = document.getElementById('durationInput');
    if (durationInput) durationInput.value = minutes;

    document.querySelectorAll('.btn-preset').forEach(btn => {
        btn.classList.remove('active');
        if (parseInt(btn.dataset.minutes) === minutes) {
            btn.classList.add('active');
        }
    });

    const sessionStatus = document.getElementById('sessionStatus');
    if (sessionStatus) {
        sessionStatus.textContent = `⏱️ Duration set to ${minutes} minutes`;
    }
}

async function startTimer() {
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
            const result = await startSession(currentUserId, currentDuration, 'POMODORO');
            currentSessionId = result.id;
            sessionStarted = true;
            console.log('✅ Session created with ID:', currentSessionId);
        } catch (error) {
            alert('❌ Error: ' + error.message);
            console.error('❌ Failed to start session:', error);
            // alert('Failed to start session. Please try again.');
            return;
        }
    }

    isTimerRunning = true;
    const sessionStatus = document.getElementById('sessionStatus');
    if (sessionStatus) sessionStatus.textContent = '⏱️ Focusing...';

    timerInterval = setInterval(() => {
        timerSeconds--;
        updateTimerDisplay();

        if (timerSeconds === 0) {
            clearInterval(timerInterval);
            isTimerRunning = false;

            console.log('🎯 Timer completed!');

            // ✅ COMPLETE SESSION IN DATABASE
            if (currentSessionId) {
                completeSession(currentSessionId)
                    .then(async () => {
                        console.log('✅ Session saved!');
                        sessionStarted = false;
                        currentSessionId = null;

                        // ✅ REFRESH DATA VIA AJAX (ONLY ON COMPLETION)
                        await loadStats();
                        await loadSessionHistory();

                        const sessionStatus = document.getElementById('sessionStatus');
                        if (sessionStatus) sessionStatus.textContent = '🎉 Session complete! Great job!';
                    })
                    .catch(error => {
                        console.error('❌ Failed to complete session:', error);
                    });
            }

            alert(`🎉 Focus session complete! Great job! (${currentDuration} minutes)`);
            timerSeconds = currentDuration * 60;
            updateTimerDisplay();
        }
    }, 1000);
}

function pauseTimer() {
    if (isTimerRunning) {
        clearInterval(timerInterval);
        isTimerRunning = false;
        console.log('⏸️ Timer paused');
        const sessionStatus = document.getElementById('sessionStatus');
        if (sessionStatus) sessionStatus.textContent = '⏸️ Paused';
    }
}

function resetTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    isTimerRunning = false;
    timerSeconds = currentDuration * 60;
    updateTimerDisplay();
    sessionStarted = false;
    currentSessionId = null;

    const sessionStatus = document.getElementById('sessionStatus');
    if (sessionStatus) sessionStatus.textContent = '🔄 Reset - Ready to focus!';
}

// ========================================
// EVENT LISTENERS
// ========================================

document.addEventListener('DOMContentLoaded', function () {
    console.log('📄 Dashboard page loaded');

    if (!isLoggedIn()) {
        window.location.href = '/login.html';
        return;
    }

    loadDashboard();

    // Duration controls
    const setDurationBtn = document.getElementById('setDurationBtn');
    if (setDurationBtn) {
        setDurationBtn.addEventListener('click', function () {
            const input = document.getElementById('durationInput');
            let minutes = parseInt(input.value);
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

    const durationInput = document.getElementById('durationInput');
    if (durationInput) {
        durationInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                let minutes = parseInt(this.value);
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

    document.querySelectorAll('.btn-preset').forEach(btn => {
        btn.addEventListener('click', function () {
            setTimerDuration(parseInt(this.dataset.minutes));
        });
    });

    // Timer controls
    const startBtn = document.getElementById('startTimer');
    if (startBtn) startBtn.addEventListener('click', startTimer);

    const pauseBtn = document.getElementById('pauseTimer');
    if (pauseBtn) pauseBtn.addEventListener('click', pauseTimer);

    const resetBtn = document.getElementById('resetTimer');
    if (resetBtn) resetBtn.addEventListener('click', resetTimer);

    // Logout
    const logoutLink = document.getElementById('logoutLink');
    if (logoutLink) {
        logoutLink.addEventListener('click', function (e) {
            e.preventDefault();
            logout();
        });
    }

    setTimerDuration(25);
    console.log('✅ Dashboard ready!');
});