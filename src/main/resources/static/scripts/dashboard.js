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
let weeklyChart = null;
let typeChart = null;
let completionChart = null;

function safeSetTextContent(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    } else {
        console.warn(`⚠️ Element with id '${elementId}' not found`);
    }
}

async function loadDashboard() {
    const user = getLoggedInUser();
    if (!user || !isLoggedIn()) {
        console.log('❌ Not logged in, redirecting');
        window.location.href = '/login.html';
        return;
    }

    currentUserId = getUserId();
    console.log('👤 Loading dashboard for user:', currentUserId, user.username);

    safeSetTextContent('userFullName', user.fullName || user.username);
    safeSetTextContent('profileUsername', user.username);
    safeSetTextContent('profileEmail', user.email || 'Not set');
    safeSetTextContent('profileFullName', user.fullName || 'Not set');
    safeSetTextContent('profileJoined', formatDate(user.createdAt));

    await loadStats();
    await loadSessionHistory();
    await loadAnalytics();
    await loadCoins();

    const sessionStatus = document.getElementById('sessionStatus');
    if (sessionStatus) sessionStatus.textContent = 'Ready to focus!';
}

async function loadStats() {
    try {
        console.log('📊 Loading stats...');
        const stats = await getUserStats(currentUserId);

        if (stats) {
            safeSetTextContent('totalSessionsSummary', stats.totalSessions || 0);
            safeSetTextContent('totalMinutesSummary', stats.totalMinutes || 0);
            safeSetTextContent('todaySessionsSummary', stats.todaySessionCount || 0);
            safeSetTextContent('todayMinutesSummary', stats.todayMinutes || 0);
            safeSetTextContent('sessionCount', stats.totalSessions || 0);
            safeSetTextContent('totalMinutes', stats.totalMinutes || 0);
        }
    } catch (error) {
        console.error('❌ Error loading stats:', error);
    }
}

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
            const statusClass = isCompleted ? 'status-completed' : 'status-pending';
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
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
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

    if (!sessionStarted) {
        try {
            const result = await startSession(currentUserId, currentDuration, 'POMODORO');
            currentSessionId = result.id;
            sessionStarted = true;
            console.log('✅ Session created with ID:', currentSessionId);
        } catch (error) {
            console.error('❌ Failed to start session:', error);
            alert('Failed to start session. Please try again.');
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

            if (currentSessionId) {
                completeSession(currentSessionId)
                    .then(async () => {
                        console.log('✅ Session saved!');
                        sessionStarted = false;
                        currentSessionId = null;
                        await loadStats();
                        await loadSessionHistory();
                        await loadAnalytics();

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
// ANALYTICS FUNCTIONS (FIXED)
// ========================================

async function loadAnalytics() {
    try {
        console.log('📊 Loading analytics...');
        const stats = await getUserStats(currentUserId);
        const weekly = await getWeeklyStats(currentUserId);

        console.log('📊 Stats:', stats);
        console.log('📊 Weekly data:', weekly);

        safeSetTextContent('totalSessionsAnalytics', stats.totalSessions || 0);
        safeSetTextContent('totalMinutesAnalytics', stats.totalMinutes || 0);
        safeSetTextContent('streakCount', weekly.weekSessions?.filter(s => s.isCompleted).length || 0);
        safeSetTextContent('thisWeekMinutes', weekly.weekMinutes || 0);

        drawWeeklyChart(weekly);
        drawTypeChart(weekly);
        drawCompletionChart(weekly);

        console.log('✅ Analytics loaded!');
    } catch (e) {
        console.error('❌ Analytics error:', e);
    }
}

function drawWeeklyChart(weekly) {
    console.log('📊 Drawing weekly chart...');
    const canvas = document.getElementById('weeklyChart');
    if (!canvas) {
        console.error('❌ weeklyChart canvas not found!');
        return;
    }

    if (typeof Chart === 'undefined') {
        console.error('❌ Chart.js not loaded!');
        return;
    }

    if (weeklyChart) {
        weeklyChart.destroy();
        weeklyChart = null;
    }

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const minutes = [0, 0, 0, 0, 0, 0, 0];

    (weekly.weekSessions || []).forEach(s => {
        if (s.isCompleted) {
            const d = new Date(s.sessionDate);
            const dayIndex = d.getDay() === 0 ? 6 : d.getDay() - 1;
            minutes[dayIndex] += s.durationMinutes || 0;
        }
    });

    console.log('📊 Weekly chart data:', { days, minutes });

    try {
        weeklyChart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: days,
                datasets: [{
                    label: 'Focus Minutes',
                    data: minutes,
                    backgroundColor: ['#4CAF50', '#8BC34A', '#CDDC39', '#4CAF50', '#8BC34A', '#CDDC39', '#4CAF50'],
                    borderRadius: 5,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        title: { display: true, text: 'Minutes' }
                    },
                    x: { grid: { display: false } }
                }
            }
        });

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                weeklyChart.resize();
            });
        });
        console.log('✅ Weekly chart drawn!');
    } catch (e) {
        console.error('❌ Failed to draw weekly chart:', e);
    }
}

function drawTypeChart(weekly) {
    console.log('📊 Drawing type chart...');
    const canvas = document.getElementById('typeChart');
    if (!canvas) {
        console.error('❌ typeChart canvas not found!');
        return;
    }

    if (typeof Chart === 'undefined') {
        console.error('❌ Chart.js not loaded!');
        return;
    }

    if (typeChart) {
        typeChart.destroy();
        typeChart = null;
    }

    const types = { 'POMODORO': 0, 'SHORT_BREAK': 0, 'LONG_BREAK': 0 };
    (weekly.weekSessions || []).forEach(s => {
        const t = s.sessionType || 'POMODORO';
        if (types[t] !== undefined) types[t]++;
    });

    const labels = Object.keys(types).filter(k => types[k] > 0);
    const values = labels.map(k => types[k]);
    const colors = { 'POMODORO': '#4CAF50', 'SHORT_BREAK': '#2196F3', 'LONG_BREAK': '#9C27B0' };

    console.log('📊 Type chart data:', { labels, values });

    if (!labels.length) {
        canvas.parentElement.innerHTML = '<div style="text-align:center;color:#999;padding:20px;">No sessions yet</div>';
        return;
    }

    try {
        typeChart = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: labels.map(k => colors[k] || '#999'),
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 12, padding: 10, font: { size: 11 } } }
                }
            }
        });
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                typeChart.resize();
            });
        });
        console.log('✅ Type chart drawn!');
    } catch (e) {
        console.error('❌ Failed to draw type chart:', e);
    }
}

function drawCompletionChart(weekly) {
    console.log('📊 Drawing completion chart...');
    const canvas = document.getElementById('completionChart');
    if (!canvas) {
        console.error('❌ completionChart canvas not found!');
        return;
    }

    if (typeof Chart === 'undefined') {
        console.error('❌ Chart.js not loaded!');
        return;
    }

    if (completionChart) {
        completionChart.destroy();
        completionChart = null;
    }

    const sessions = weekly.weekSessions || [];
    const completed = sessions.filter(s => s.isCompleted).length;
    const pending = sessions.length - completed;

    console.log('📊 Completion chart:', { completed, pending });

    if (!sessions.length) {
        canvas.parentElement.innerHTML = '<div style="text-align:center;color:#999;padding:20px;">No sessions yet</div>';
        return;
    }

    try {
        completionChart = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: ['✅ Completed', '⏳ Pending'],
                datasets: [{
                    data: [completed, pending],
                    backgroundColor: ['#4CAF50', '#FFC107'],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 12, padding: 10, font: { size: 11 } } }
                }
            }
        });

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                completionChart.resize();
            });
        });
        console.log('✅ Completion chart drawn!');
    } catch (e) {
        console.error('❌ Failed to draw completion chart:', e);
    }
}

// ========================================
// COIN & REWARD FUNCTIONS
// ========================================
async function loadCoins() {
    try {
        console.log("🪙 Loading coin stats...")
        const coinData = await getCoinStats(currentUserId);

        console.log('🪙 Coin data:', coinData);

        safeSetTextContent("coinCount", coinData.coins || 0);
        safeSetTextContent("rewardsRedeemed", coinData.rewardsRedeemed || 0);

        const coinsNeeded = coinData.coinsNeededForReward || 0;
        safeSetTextContent("nextRewardText", coinsNeeded > 0 ? coinsNeeded : '🎉 Ready!');

        // update progress bar
        const progress = coinData.coinsNeededForReward || 0;
        const progressBar = document.getElementById("rewardProgressBar");
        const progressText = document.getElementById("progressText");

        if (progressBar) {
            progressBar.style.width = Math.min(progress, 100) + '%';
        }
        if (progressText) {
            progressText.textContent = Math.min(progress, 100) + '%';
        }

        // enable/disable redeem button
        const redeemBtn = document.getElementById('redeemRewardBtn');
        if (redeemBtn) {
            if (coinData.canRedeem) {
                redeemBtn.disabled = false;
                redeemBtn.textContent = '🎁 Redeem ₹30 Reward!';
                redeemBtn.style.background = '#2E7D32';
            } else {
                redeemBtn.disabled = true;
                redeemBtn.textContent = `🪙 Need ${coinsNeeded} more coins for ₹30`;
                redeemBtn.style.background = '#999';
            }
        }

    } catch (error) {
        console.error('❌ Error loading coins:', error);
    }
}


// ========================================
// REDEEM REWARD
// ========================================
async function handleRedeemReward() {
    try {
        const result = await redeemReward(currentUserId);
        alert(result.message);
        await loadCoins();
        await loadStats();
    } catch (error) {
        console.error('❌ Error redeeming reward:', error);
        alert('Failed to redeem reward: ' + error.message);
    }
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

    const startBtn = document.getElementById('startTimer');
    if (startBtn) startBtn.addEventListener('click', startTimer);

    const pauseBtn = document.getElementById('pauseTimer');
    if (pauseBtn) pauseBtn.addEventListener('click', pauseTimer);

    const resetBtn = document.getElementById('resetTimer');
    if (resetBtn) resetBtn.addEventListener('click', resetTimer);

    const logoutLink = document.getElementById('logoutLink');
    if (logoutLink) {
        logoutLink.addEventListener('click', function (e) {
            e.preventDefault();
            logout();
        });
    }

    setTimerDuration(25);

    const redeemBtn = document.getElementById("redeemRewardBtn");
    if (redeemBtn) {
        redeemBtn.addEventListener('click', handleRedeemReward);
    }
    console.log('✅ Dashboard ready!');
});

window.addEventListener('resize', () => {
    weeklyChart?.resize();
    typeChart?.resize();
    completionChart?.resize();
    // The fix added a requestAnimationFrame × 2 + .resize() call right after each new Chart(...). This forces Chart.js to re-measure the container and resize its internal drawing buffer after the browser has definitely finished layout — by which point the container has its real size (236×118, etc.), so the chart actually draws visible content instead of an empty default buffer.
});