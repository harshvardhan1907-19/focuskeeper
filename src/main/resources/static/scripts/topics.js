// ==========================================================
// TOPICS.JS - Gamified Roadmap Logic
// ==========================================================

const SUBJECT_ICONS = {
    'Java': '☕',
    'Python': '🐍',
    'Maths': '📐',
    'Science': '🔬',
    'Economics': '📈'
};

let currentSubject = 'Java';
let currentUserId = null;
let currentTopics = [];
let activeSelectedTopic = null;
let selectedDifficulty = 'MEDIUM';
let customDifficulty = 'MEDIUM';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Verify user session
    const userData = localStorage.getItem('user');
    const storedUserId = localStorage.getItem('userId');
    if (!userData || !storedUserId) {
        window.location.href = '/login.html';
        return;
    }
    currentUserId = storedUserId;

    // 2. Read subject from URL or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const paramSubject = urlParams.get('subject');
    if (paramSubject) {
        currentSubject = paramSubject.trim();
        localStorage.setItem('selectedSubject', currentSubject);
    } else {
        currentSubject = localStorage.getItem('selectedSubject') || 'Maths';
    }

    // Normalize display (e.g. math -> Maths)
    if (currentSubject.toLowerCase() === 'math') currentSubject = 'Maths';

    // 3. Update Header & Switcher
    document.getElementById('subjectTitle').textContent = currentSubject;
    document.getElementById('subjectIcon').textContent = SUBJECT_ICONS[currentSubject] || '📚';
    document.getElementById('customModalSubjectName').textContent = currentSubject;

    const switcher = document.getElementById('roadmapSubjectSwitcher');
    if (switcher) {
        // If current subject is in switcher options, select it, otherwise add custom option
        let exists = false;
        for (let i = 0; i < switcher.options.length; i++) {
            if (switcher.options[i].value.toLowerCase() === currentSubject.toLowerCase()) {
                switcher.selectedIndex = i;
                exists = true;
                break;
            }
        }
        if (!exists) {
            const opt = document.createElement('option');
            opt.value = currentSubject;
            opt.textContent = `📚 ${currentSubject}`;
            opt.selected = true;
            switcher.appendChild(opt);
        }

        switcher.addEventListener('change', (e) => {
            const nextSubj = e.target.value;
            localStorage.setItem('selectedSubject', nextSubj);
            window.location.href = `/topics.html?subject=${encodeURIComponent(nextSubj)}`;
        });
    }

    // Setup Logout
    const logoutBtn = document.getElementById('logoutLink');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.href = '/login.html';
        });
    }

    // Setup Modals
    setupModals();

    // 4. Load Roadmap
    await loadRoadmap();

    // Redraw SVG on window resize
    window.addEventListener('resize', drawRoadmapConnections);
});

// Load Topics from Backend
async function loadRoadmap() {
    const container = document.getElementById('nodesContainer');
    try {
        const response = await fetch(`${API_BASE_URL}/topics/${currentUserId}/${encodeURIComponent(currentSubject)}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load roadmap topics');
        }

        currentTopics = await response.json();
        renderRoadmap(currentTopics);
    } catch (err) {
        console.error('❌ Error loading roadmap:', err);
        container.innerHTML = `
            <div style="text-align:center; padding: 40px; color:#f87171;">
                <p>⚠️ Could not load roadmap for ${currentSubject}. Please try again.</p>
                <button class="btn-primary-action" onclick="loadRoadmap()" style="margin-top:10px;">Retry</button>
            </div>
        `;
    }
}

// Render Nodes
function renderRoadmap(topics) {
    const container = document.getElementById('nodesContainer');
    container.innerHTML = '';

    if (!topics || topics.length === 0) {
        container.innerHTML = `<p style="text-align:center;color:#94a3b8;">No topics found. Add your first topic below!</p>`;
        return;
    }

    // Update Progress
    const completedCount = topics.filter(t => t.isCompleted).length;
    document.getElementById('completedCount').textContent = completedCount;
    document.getElementById('totalCount').textContent = topics.length;
    const progressPct = Math.round((completedCount / topics.length) * 100);
    document.getElementById('progressBarFill').style.width = `${progressPct}%`;

    // Render in zigzag path (Left, Right, Left, Right)
    topics.forEach((topic, idx) => {
        const isLeft = (idx % 2 === 0);
        const posClass = isLeft ? 'pos-left' : 'pos-right';

        const row = document.createElement('div');
        row.className = `topic-node-row ${posClass}`;

        const isCompleted = !!topic.isCompleted;
        const diffClass = (topic.difficulty || 'MEDIUM').toLowerCase();

        row.innerHTML = `
            <div class="node-card-wrap ${isCompleted ? 'is-completed' : ''}" data-index="${idx}">
                ${isLeft ? `
                    <div class="node-orb" id="orb-${idx}">
                        ${idx + 1}
                    </div>
                    <div class="node-info-box">
                        <div class="node-title">${escapeHtml(topic.title)}</div>
                        <div class="node-meta">
                            <span class="diff-badge ${diffClass}">${topic.difficulty || 'MEDIUM'}</span>
                            <span class="status-badge">${isCompleted ? '✓ Completed' : 'Start Focus'}</span>
                        </div>
                    </div>
                ` : `
                    <div class="node-info-box" style="text-align:right;">
                        <div class="node-title">${escapeHtml(topic.title)}</div>
                        <div class="node-meta" style="justify-content: flex-end;">
                            <span class="status-badge">${isCompleted ? '✓ Completed' : 'Start Focus'}</span>
                            <span class="diff-badge ${diffClass}">${topic.difficulty || 'MEDIUM'}</span>
                        </div>
                    </div>
                    <div class="node-orb" id="orb-${idx}">
                        ${idx + 1}
                    </div>
                `}
            </div>
        `;

        // Click to open difficulty & start modal
        row.querySelector('.node-card-wrap').addEventListener('click', () => {
            openDifficultyModal(topic);
        });

        container.appendChild(row);
    });

    // Draw SVG connections between orbs
    setTimeout(drawRoadmapConnections, 50);
}

// Draw Sinuous connecting curves using SVG
function drawRoadmapConnections() {
    const svg = document.getElementById('roadmapSvgCanvas');
    if (!svg) return;
    svg.innerHTML = '';

    const arena = document.getElementById('roadmapArena');
    const arenaRect = arena.getBoundingClientRect();

    svg.setAttribute('width', arenaRect.width);
    svg.setAttribute('height', arenaRect.height);

    for (let i = 0; i < currentTopics.length - 1; i++) {
        const orb1 = document.getElementById(`orb-${i}`);
        const orb2 = document.getElementById(`orb-${i + 1}`);

        if (!orb1 || !orb2) continue;

        const r1 = orb1.getBoundingClientRect();
        const r2 = orb2.getBoundingClientRect();

        const x1 = (r1.left + r1.right) / 2 - arenaRect.left;
        const y1 = (r1.top + r1.bottom) / 2 - arenaRect.top;
        const x2 = (r2.left + r2.right) / 2 - arenaRect.left;
        const y2 = (r2.top + r2.bottom) / 2 - arenaRect.top;

        // Cubic Bezier curve control points
        const dy = (y2 - y1) * 0.5;
        const pathData = `M ${x1} ${y1} C ${x1} ${y1 + dy}, ${x2} ${y2 - dy}, ${x2} ${y2}`;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        path.setAttribute('class', `roadmap-path-line ${currentTopics[i].isCompleted && currentTopics[i + 1].isCompleted ? 'completed-path' : ''}`);

        svg.appendChild(path);
    }
}

// Setup Modals & Handlers
function setupModals() {
    // Difficulty Modal Cards Selection
    const diffCards = document.querySelectorAll('#difficultyModal .difficulty-choice-card');
    diffCards.forEach(card => {
        card.addEventListener('click', () => {
            diffCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedDifficulty = card.getAttribute('data-diff');
        });
    });

    document.getElementById('closeDiffModalBtn').addEventListener('click', () => {
        document.getElementById('difficultyModal').classList.remove('active');
    });

    document.getElementById('confirmStartSessionBtn').addEventListener('click', () => {
        if (!activeSelectedTopic) return;
        const topicTitle = encodeURIComponent(activeSelectedTopic.title);
        const subj = encodeURIComponent(currentSubject);
        const diff = encodeURIComponent(selectedDifficulty);

        // Redirect to learning & practical session page
        window.location.href = `/session.html?subject=${subj}&topic=${topicTitle}&difficulty=${diff}`;
    });

    // Custom Topic Modal
    const customModal = document.getElementById('customTopicModal');
    document.getElementById('openCustomTopicModalBtn').addEventListener('click', () => {
        document.getElementById('customTopicInput').value = '';
        customModal.classList.add('active');
    });

    document.getElementById('closeCustomModalBtn').addEventListener('click', () => {
        customModal.classList.remove('active');
    });

    const customDiffCards = document.querySelectorAll('#customDiffGrid .difficulty-choice-card');
    customDiffCards.forEach(card => {
        card.addEventListener('click', () => {
            customDiffCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            customDifficulty = card.getAttribute('data-diff');
        });
    });

    document.getElementById('saveCustomTopicBtn').addEventListener('click', async () => {
        const input = document.getElementById('customTopicInput');
        const title = input.value.trim();

        if (!title) {
            alert('Please enter a topic title!');
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/topics/custom`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    userId: currentUserId,
                    subject: currentSubject,
                    title: title,
                    difficulty: customDifficulty
                })
            });

            if (!res.ok) {
                throw new Error('Failed to add custom topic');
            }

            customModal.classList.remove('active');
            await loadRoadmap();
        } catch (err) {
            console.error('❌ Error saving custom topic:', err);
            alert('Failed to save custom topic: ' + err.message);
        }
    });
}

function openDifficultyModal(topic) {
    activeSelectedTopic = topic;
    document.getElementById('modalTopicTitle').textContent = topic.title;

    selectedDifficulty = topic.difficulty || 'MEDIUM';
    const diffCards = document.querySelectorAll('#difficultyModal .difficulty-choice-card');
    diffCards.forEach(card => {
        if (card.getAttribute('data-diff') === selectedDifficulty) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });

    document.getElementById('difficultyModal').classList.add('active');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
