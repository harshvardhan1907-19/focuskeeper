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

let activeFocusSessionId = null;
let focusTimerInterval = null;
let focusSeconds = 0;
let focusSwitches = 0;
let isFocusSessionActive = false;
let isSessionCompleting = false;

async function startFocusSession() {
    const title = document.getElementById('focusTitle').value.trim();
    const duration = parseInt(document.getElementById('focusDuration').value) || 25;


    if (!title) {
        alert("Please enter what you will focus on!");
        return;
    }

    // ✅ Validate the title BEFORE starting the timer
    try {
        const check = await fetchAPI(`/sessions/validate-title?title=${encodeURIComponent(title)}`);
        if (check.warning === true) {
            alert('⚠️ ' + check.error);
            return; // Don't start the session
        }
    } catch (err) {
        console.warn('Title validation failed, continuing anyway:', err);
    }


    if (duration < 1) {
        alert("Duration must be at least 1 minute!");
        return;
    }
    if (duration > 120) {
        alert("Duration cannot exceed 120 minutes!");
        return;
    }

    try {
        const result = await startFocusedSession(
            currentUserId,
            duration,
            'POMODORO',
            title
        );

        activeFocusSessionId = result.id;
        focusSeconds = duration * 60;
        focusSwitches = 0;
        isFocusSessionActive = true;
        isSessionCompleting = false;

        // ✅ UPDATE UI USING CSS CLASSES - NO INLINE STYLES
        const focusSetup = document.getElementById('focusSetup');
        const focusStatus = document.getElementById('focusStatus');
        const activeTitle = document.getElementById('activeFocusTitle');
        const qualityDisplay = document.getElementById('qualityDisplay');
        const qualityBadge = document.getElementById('sessionQualityBadge');
        const progressBar = document.getElementById('focusProgressBar');
        const progressText = document.getElementById('focusProgressText');

        // Hide setup, show status
        if (focusSetup) focusSetup.style.display = 'none';

        // ✅ Just add the 'active' class - CSS handles everything!
        if (focusStatus) {
            focusStatus.classList.add('active');
        }

        // Update text content only (no inline styles)
        if (activeTitle) activeTitle.textContent = title;
        if (qualityDisplay) qualityDisplay.textContent = '100%';
        if (qualityBadge) qualityBadge.textContent = '100% Quality';
        if (progressBar) progressBar.style.width = '100%';
        if (progressText) progressText.textContent = '100%';

        // Clear any existing interval
        if (focusTimerInterval) {
            clearInterval(focusTimerInterval);
            focusTimerInterval = null;
        }

        updateFocusTimerDisplay();
        focusTimerInterval = setInterval(() => {
            focusSeconds--;
            updateFocusTimerDisplay();

            if (focusSeconds <= 0) {
                if (!isSessionCompleting) {
                    isSessionCompleting = true;
                    completeFocusSession();
                }
            }
        }, 1000);

        console.log('✅ Focus session started:', activeFocusSessionId);
    } catch (error) {
        console.error('❌ Failed to start focus session:', error);
        alert('Failed to start focus session. Please try again.');
    }
}

function updateFocusTimerDisplay() {
    const minutes = Math.floor(focusSeconds / 60);
    const seconds = focusSeconds % 60;
    const timeString = String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');

    // Try both possible element IDs
    const timerEl = document.getElementById('focusTimer');
    if (timerEl) {
        timerEl.textContent = timeString;
    }

    // Update progress
    const totalSeconds = parseInt(document.getElementById('focusDuration').value) * 60 || 1500;
    const progress = totalSeconds > 0 ? ((totalSeconds - focusSeconds) / totalSeconds) * 100 : 0;
    const progressBar = document.getElementById('focusProgressBar');
    const progressText = document.getElementById('focusProgressText');

    if (progressBar) {
        progressBar.style.width = Math.min(progress, 100) + '%';
    }
    if (progressText) {
        progressText.textContent = Math.round(Math.min(progress, 100)) + '%';
    }
}


async function completeFocusSession() {
    // ✅ Clear interval first
    if (focusTimerInterval) {
        clearInterval(focusTimerInterval);
        focusTimerInterval = null;
    }
    isFocusSessionActive = false;

    try {
        const questions = await getSessionQuestions(activeFocusSessionId);
        showQuestionModal(questions);
    } catch (error) {
        console.error('❌ Failed to load questions:', error);
        alert('Failed to load questions. Please try again.');
    }
}

function showQuestionModal(questions) {

    // check bckend reject the title
    if (questions.warning === true) {
        console.log("⚠️ Backend rejected the title", questions.error);

        alert('⚠️ ' + (questions.error || 'Please provide a more specific title.'));

        // Reset the focus session UI
        const focusSetup = document.getElementById("focusSetup");
        const focusStatus = document.getElementById("focusStatus");

        if (focusSetup) focusSetup.style.display = 'block';
        if (focusStatus) focusStatus.style.display = 'none';

        // Clear the title input so the user can retype
        const titleInput = document.getElementById("focusTitle");
        if (titleInput) {
            titleInput.value = '';
            titleInput.focus();
        }

        // Reset session state
        isFocusSessionActive = false;
        isSessionCompleting = false;
        activeFocusSessionId = null;

        return;

    }

    // ✅ Create modal with proper styling
    const modal = document.createElement('div');
    modal.id = 'focusQuestionModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 99999;
        padding: 20px;
        animation: fadeIn 0.3s ease;
    `;

    // Build MCQ options
    const mcqOptions = questions.mcqOptions || {};
    let mcqHTML = '';
    for (const [key, value] of Object.entries(mcqOptions)) {
        mcqHTML += `
            <label style="display:block;margin:8px 0;padding:10px 14px;border:2px solid #e9ecef;border-radius:8px;cursor:pointer;transition:border-color 0.3s, background 0.3s;" 
                   onmouseover="this.style.borderColor='#4CAF50';this.style.background='#f0f8f0'" 
                   onmouseout="this.style.borderColor='#e9ecef';this.style.background='transparent'">
                <input type="radio" name="mcq" value="${key}" style="margin-right:10px;"> 
                <strong>${key}.</strong> ${value}
            </label>
        `;
    }

    modal.innerHTML = `
        <div style="background:white;border-radius:16px;padding:32px;max-width:520px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <h3 style="margin:0;color:#2E7D32;font-size:22px;">🧠 Session Complete!</h3>
                <span style="background:#4CAF50;color:white;padding:4px 14px;border-radius:20px;font-size:13px;font-weight:600;">🎉 Earn Coins</span>
            </div>
            <p style="color:#666;margin-bottom:20px;font-size:15px;">Answer these questions to earn coins:</p>
            
            <!-- Question 1: Short Answer -->
            <div style="margin-bottom:20px;">
                <label style="font-weight:600;color:#333;display:block;margin-bottom:6px;">
                    1. ${questions.shortQuestion || 'What did you focus on?'}
                </label>
                <input type="text" id="shortAnswer" 
                       placeholder="Type your answer here..."
                       style="width:100%;padding:12px 14px;border:1px solid #d0d7de;border-radius:8px;font-size:15px;background:#fafbfc;box-sizing:border-box;">
            </div>
            
            <!-- Question 2: True/False -->
            <div style="margin-bottom:20px;">
                <label style="font-weight:600;color:#333;display:block;margin-bottom:6px;">
                    2. ${questions.trueFalseQuestion || 'Did you stay focused?'}
                </label>
                <select id="trueFalseAnswer" style="width:100%;padding:12px 14px;border:1px solid #d0d7de;border-radius:8px;font-size:15px;background:#fafbfc;">
                    <option value="true">✅ True</option>
                    <option value="false">❌ False</option>
                </select>
            </div>
            
            <!-- Question 3: MCQ -->
            <div style="margin-bottom:24px;">
                <label style="font-weight:600;color:#333;display:block;margin-bottom:8px;">
                    3. ${questions.mcqQuestion || 'What was the subject?'}
                </label>
                <div id="mcqOptionsContainer">
                    ${mcqHTML}
                </div>
            </div>
            
            <!-- Submit Button -->
            <button id="submitAnswersBtn" 
                    style="width:100%;padding:14px;border:none;border-radius:10px;background:linear-gradient(135deg,#4CAF50,#43a047);color:white;font-weight:700;font-size:17px;cursor:pointer;transition:transform 0.2s, box-shadow 0.2s;box-shadow:0 4px 16px rgba(76,175,80,0.3);">
                ✅ Submit & Earn Coins
            </button>
            
            <p style="text-align:center;color:#999;font-size:12px;margin-top:12px;">
                ⚠️ You need 2 correct answers to earn coins
            </p>
        </div>
    `;

    document.body.appendChild(modal);

    // Add keyframe animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }
        #mcqOptionsContainer label:has(input:checked) {
            border-color: #4CAF50;
            background: #e8f5e9;
        }
        #shortAnswer:focus, #trueFalseAnswer:focus {
            outline: none;
            border-color: #4CAF50;
            box-shadow: 0 0 0 3px rgba(76,175,80,0.15);
        }
    `;
    document.head.appendChild(style);

    // ✅ Event listener for submit
    document.getElementById("submitAnswersBtn").addEventListener("click", async function () {
        // ✅ Disable button to prevent double submission
        this.disabled = true;
        this.textContent = '⏳ Submitting...';

        const modalEl = document.getElementById('focusQuestionModal');

        const shortAnswerInput = modalEl.querySelector('#shortAnswer');
        const tfSelect = modalEl.querySelector('#trueFalseAnswer');
        const mcqChecked = modalEl.querySelector("input[name='mcq']:checked");

        const shortAnswer = shortAnswerInput ? shortAnswerInput.value.trim() : "";
        const tfValue = tfSelect ? tfSelect.value : 'true';
        const trueOrFalseAnswer = tfValue === 'true';
        const mcqAnswer = mcqChecked ? mcqChecked.value : '';

        console.log('📤 SUBMIT VALUES:');
        console.log('   shortAnswer:', shortAnswer);
        console.log('   tfValue (raw):', tfValue);
        console.log('   trueOrFalseAnswer (bool):', trueOrFalseAnswer);
        console.log('   mcqAnswer:', mcqAnswer);

        // const shortAnswer = document.getElementById("shortAnswer").value.trim();
        // const trueOrFalseAnswer = document.getElementById("trueFalseAnswer").value === 'true';
        // const mcqAnswer = document.querySelector("input[name='mcq']:checked")?.value || 'A';

        if (!shortAnswer) {
            alert("Please provide a short answer");
            this.disabled = false;
            this.textContent = '✅ Submit & Earn Coins';
            return;
        }

        if (!mcqAnswer) {
            alert("Please select an MCQ option");
            this.disabled = false;
            this.textContent = '✅ Submit & Earn Coins';
            return;
        }

        try {
            const result = await completeFocusedSession(
                activeFocusSessionId,
                shortAnswer,
                trueOrFalseAnswer,
                mcqAnswer
            );

            modalEl.remove();
            showFocusResults(result);
            await loadDashboard();

        } catch (error) {
            console.error('❌ Error completing session:', error);
            alert('Failed to complete session. Please try again.');
            this.disabled = false;
            this.textContent = '✅ Submit & Earn Coins';
        }
    });
}


function showFocusResults(result) {
    const quality = result.qualityScore || 0;
    const coins = result.coinsEarned || 0;
    const switches = result.appSwitches || 0;

    let qualityText = quality >= 80 ? 'Excellent! 🎉' :
        quality >= 60 ? 'Good! 👍' : 'Needs Improvement 💪';

    let switchText = switches === 0 ? '✅ No app switches!' :
        switches <= 2 ? `⚠️ ${switches} app switch${switches > 1 ? 'es' : ''}` :
            `❌ ${switches} app switches (reduced quality)`;

    alert(`🎯 Session Complete!\n\n` +
        `📊 Quality: ${quality}% (${qualityText})\n` +
        `🪙 Coins Earned: ${coins}\n` +
        `📱 ${switchText}\n\n` +
        `${coins > 0 ? '🎉 Great job! Keep focusing!' : '💪 Try to stay focused next time!'}`);
}

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
            timerSeconds = curfrentDuration * 60;
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
            requestAnimationFrlame(() => {
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

        const coinCount = document.getElementById('coinCount');
        if (coinCount) {
            coinCount.textContent = coinData.coins || 0;
        }

        const rewardsRedeemed = document.getElementById('rewardsRedeemed');
        if (rewardsRedeemed) {
            rewardsRedeemed.textContent = coinData.rewardsRedeemed || 0;
        }

        const nextRewardText = document.getElementById('nextRewardText');
        if (nextRewardText) {
            const needed = coinData.coinsNeededForReward || 0;
            nextRewardText.textContent = needed > 0 ? needed : '🎉 Ready!';
        }

        // update progress bar
        const progress = coinData.coinsPercentage || 0;
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
                redeemBtn.style.color = 'white';
            } else {
                // ✅ FIX: Use 'needed' instead of 'coinsNeeded'
                const needed = coinData.coinsNeededForReward || 50;
                redeemBtn.disabled = true;
                redeemBtn.textContent = `🪙 Need ${needed} more coins for ₹30`;
                redeemBtn.style.background = '#999';
                redeemBtn.style.color = '#666';
            }
        }
        console.log('✅ Coins loaded successfully!');
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

    const startFocusBtn = document.getElementById("startFocusBtn");
    if (startFocusBtn) {
        startFocusBtn.addEventListener('click', startFocusSession);
    }

    // focus session
    const cancelFocusBtn = document.getElementById("cancelFocusBtn");
    if (cancelFocusBtn) {
        cancelFocusBtn.addEventListener('click', function () {
            clearInterval(focusTimerInterval);
            isFocusSessionActive = false;
            document.getElementById('focusStatus').style.display = 'none';
            document.getElementById('focusSetup').style.display = 'block';
            alert('Session cancelled.');
        });
    }

    console.log('✅ Dashboard ready!');
});


// ========================================
// APP SWITCH DETECTION
// ========================================

let lastAppFocusTime = Date.now();
let isAppInBackground = false;
let lastSwitchTime = 0;
let isSwitchProcessing = false;
let lastQuality = 100;

// ✅ Detect when user switches to another app
document.addEventListener('visibilitychange', function () {
    const now = Date.now();

    if (document.hidden) {
        // App went to background (user switched apps)
        console.log('📱 App went to background - potential app switch!');
        isAppInBackground = true;

        // Only register if a focus session is active
        if (isFocusSessionActive && activeFocusSessionId) {
            // Wait 2 seconds to confirm it's a real switch
            setTimeout(() => {
                if (isAppInBackground && isFocusSessionActive && !isSwitchProcessing) {
                    // ✅ Prevent duplicate calls within 5 seconds
                    if (now - lastSwitchTime > 5000) {
                        lastSwitchTime = now;
                        registerAppSwitchDetected(activeFocusSessionId);
                    }
                }
            }, 2000);
        }
    } else {
        // App came back to foreground
        console.log('📱 App came back to foreground');
        isAppInBackground = false;
        lastAppFocusTime = Date.now();
    }
});

// ✅ Register app switch with backend
async function registerAppSwitchDetected(sessionId) {
    // ✅ Prevent multiple concurrent calls
    if (isSwitchProcessing) {
        console.log('⏳ Switch already being processed, skipping...');
        return;
    }

    isSwitchProcessing = true;

    try {
        console.log('📱 Registering app switch for session:', sessionId);
        const result = await registerAppSwitch(sessionId);
        console.log('✅ App switch registered:', result);

        // ✅ Update quality display
        const qualityDisplay = document.getElementById('qualityDisplay');
        if (qualityDisplay && result.qualityScore) {
            const newQuality = Math.round(result.qualityScore);
            qualityDisplay.textContent = newQuality + '%';

            // ✅ Log quality change
            if (newQuality !== lastQuality) {
                console.log(`📊 Quality changed: ${lastQuality}% → ${newQuality}%`);
                lastQuality = newQuality;
            }
        }

        // ✅ Update badge color
        const qualityBadge = document.getElementById('sessionQualityBadge');
        if (qualityBadge) {
            const score = result.qualityScore || 100;
            qualityBadge.textContent = Math.round(score) + '% Quality';
            if (score < 80) {
                qualityBadge.style.background = '#FF6B6B';
                qualityBadge.textContent = '⚠️ ' + Math.round(score) + '% Quality';
            } else if (score < 100) {
                qualityBadge.style.background = '#F39C12';
                qualityBadge.textContent = '⚡ ' + Math.round(score) + '% Quality';
            } else {
                qualityBadge.style.background = '#4CAF50';
                qualityBadge.textContent = '✅ ' + Math.round(score) + '% Quality';
            }
        }

    } catch (error) {
        console.error('❌ Failed to register app switch:', error);
    } finally {
        isSwitchProcessing = false;
    }
}

window.addEventListener('resize', () => {
    weeklyChart?.resize();
    typeChart?.resize();
    completionChart?.resize();
    // The fix added a requestAnimationFrame × 2 + .resize() call right after each new Chart(...). This forces Chart.js to re-measure the container and resize its internal drawing buffer after the browser has definitely finished layout — by which point the container has its real size (236×118, etc.), so the chart actually draws visible content instead of an empty default buffer.
});