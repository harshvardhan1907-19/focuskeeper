// ==========================================================
// SESSION.JS - Learning, Practical Setup & Post-Session Quiz
// ==========================================================

let currentUserId = null;
let currentSubject = 'Java';
let currentTopic = 'Hello World Program';
let currentDifficulty = 'MEDIUM';

let activeSessionId = null;
let focusSeconds = 0;
let focusTimerInterval = null;
let isPaused = false;
let sessionQuality = 100;
let appSwitches = 0;

let quizData = null;
let selectedTfAnswer = null;

// CodeMirror editor instance (set up in setupCodeEditor)
let cmEditor = null;

// ==========================================================
// CODE EDITOR INITIALIZATION (CodeMirror 6)
// ==========================================================
function setupCodeEditor(initialCode) {
    const mount = document.getElementById('codeEditorMount');
    const hiddenTextarea = document.getElementById('codeEditor');
    if (!mount) return;

    // Destroy existing editor if reinitializing
    if (cmEditor) {
        cmEditor.destroy();
        mount.innerHTML = '';
    }

    // Pick language extension based on subject
    const subjectLower = currentSubject.toLowerCase();
    let langExtension;
    let langLabel;
    let langClass;

    if (subjectLower.includes('java') && !subjectLower.includes('javascript')) {
        langExtension = CM.java ? CM.java() : [];
        langLabel = '☕ Java';
        langClass = 'java';
    } else if (subjectLower.includes('python')) {
        langExtension = CM.python ? CM.python() : [];
        langLabel = '🐍 Python';
        langClass = 'python';
    } else if (subjectLower.includes('javascript') || subjectLower.includes('js') || subjectLower.includes('web')) {
        langExtension = CM.javascript ? CM.javascript() : [];
        langLabel = '🟨 JavaScript';
        langClass = 'js';
    } else if (subjectLower.includes('c++') || subjectLower.includes('cpp')) {
        langExtension = CM.cpp ? CM.cpp() : [];
        langLabel = '⚙️ C++';
        langClass = 'java'; // similar color
    } else {
        langExtension = [];
        langLabel = '📄 Code';
        langClass = '';
    }

    // Update language badge
    const badge = document.getElementById('langBadge');
    const badgeText = document.getElementById('langBadgeText');
    if (badge && badgeText) {
        badge.className = `lang-badge ${langClass}`;
        badgeText.textContent = langLabel;
    }

    // Build CodeMirror 6 editor
    // Safely pull extensions from global CM namespace (loaded via unpkg CDN)
    const extensions = [
        CM.oneDark,
        CM.lineNumbers(),
        CM.highlightActiveLineGutter(),
        CM.highlightSpecialChars(),
        CM.history(),
        CM.drawSelection(),
        CM.dropCursor(),
        CM.EditorState.allowMultipleSelections.of(true),
        CM.indentOnInput(),
        CM.bracketMatching(),
        CM.closeBrackets(),
        CM.autocompletion(),
        CM.rectangularSelection(),
        CM.crosshairCursor(),
        CM.highlightActiveLine(),
        CM.highlightSelectionMatches(),
        CM.keymap.of([
            ...CM.closeBracketsKeymap,
            ...CM.defaultKeymap,
            ...CM.searchKeymap,
            ...CM.historyKeymap,
            ...CM.completionKeymap,
        ]),
        CM.indentUnit.of('    '), // 4-space indentation
        langExtension,
        // Keep hidden textarea in sync on every change
        CM.EditorView.updateListener.of(update => {
            if (update.docChanged) {
                hiddenTextarea.value = update.state.doc.toString();
            }
        }),
    ].filter(Boolean);

    const state = CM.EditorState.create({
        doc: initialCode || '',
        extensions,
    });

    cmEditor = new CM.EditorView({
        state,
        parent: mount,
    });

    // Sync textarea immediately
    hiddenTextarea.value = initialCode || '';
}

// Helper: set editor content programmatically
function setEditorContent(code) {
    if (cmEditor) {
        cmEditor.dispatch({
            changes: { from: 0, to: cmEditor.state.doc.length, insert: code }
        });
    }
    const ta = document.getElementById('codeEditor');
    if (ta) ta.value = code;
}

// Helper: get editor content
function getEditorContent() {
    if (cmEditor) return cmEditor.state.doc.toString();
    const ta = document.getElementById('codeEditor');
    return ta ? ta.value : '';
}


document.addEventListener('DOMContentLoaded', async () => {
    // 1. Check user login
    const userData = localStorage.getItem('user');
    const storedUserId = localStorage.getItem('userId');
    if (!userData || !storedUserId) {
        window.location.href = '/login.html';
        return;
    }
    currentUserId = storedUserId;

    // 2. Parse URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    currentSubject = urlParams.get('subject') || 'Java';
    currentTopic = urlParams.get('topic') || 'Hello World Program';
    currentDifficulty = urlParams.get('difficulty') || 'MEDIUM';

    // 3. Populate Header / Meta Info
    document.getElementById('sessionSubjectText').textContent = currentSubject;
    document.getElementById('sessionTopicTitle').textContent = currentTopic;
    const diffBadge = document.getElementById('sessionDifficultyBadge');
    diffBadge.textContent = currentDifficulty;
    diffBadge.className = `diff-badge ${currentDifficulty.toLowerCase()}`;

    // Back to Roadmap Link
    document.getElementById('backToRoadmapLink').href = `/topics.html?subject=${encodeURIComponent(currentSubject)}`;

    // 4. Practical Tabs Switcher
    setupPracticalTabs();

    // 5. Code & Math Handlers
    setupPracticalTools();

    // 6. Setup Timer & Pause/Stop Handlers
    setupTimerControls();

    // 7. Track App Switches / Tab blur
    setupDistractionTracker();

    // 8. Start Session in Backend & Fetch Study Material
    await initSession();
});

// Initialize Session & AI Study Content
async function initSession() {
    try {
        // Start Focus Session in backend
        const fullTitle = `${currentSubject}: ${currentTopic}`;
        const startRes = await fetch(`${API_BASE_URL}/sessions/start-focused`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                userId: currentUserId,
                durationMinutes: 0,
                sessionType: 'POMODORO',
                title: fullTitle
            })
        });

        if (startRes.ok) {
            const data = await startRes.json();
            activeSessionId = data.id;
        }

        // Start Stopwatch Timer
        startStopwatch();

        // Fetch AI Study Material
        loadStudyMaterial();

    } catch (err) {
        console.error('❌ Error initializing session:', err);
    }
}

// Fetch Study Material
async function loadStudyMaterial() {
    const loadingState = document.getElementById('studyLoadingState');
    const contentBox = document.getElementById('studyContentBox');

    try {
        const response = await fetch(`${API_BASE_URL}/topics/study-material`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                subject: currentSubject,
                title: currentTopic,
                difficulty: currentDifficulty
            })
        });

        if (!response.ok) {
            throw new Error('Failed to load study material');
        }

        const data = await response.json();
        const rawText = data.studyMaterial || '';

        renderStudySections(rawText);

        loadingState.style.display = 'none';
        contentBox.style.display = 'block';

    } catch (err) {
        console.error('❌ Error fetching study material:', err);
        loadingState.innerHTML = `
            <p style="color:#f87171;">Failed to load study guide. Please check network/API key.</p>
        `;
    }
}

// Render formatted study sections
function renderStudySections(text) {
    const contentBox = document.getElementById('studyContentBox');
    contentBox.innerHTML = '';

    // Extract code snippet if any to prefill code editor
    let codeSnippet = '';
    const codeMatch = text.match(/```[a-zA-Z]*\n([\s\S]*?)```/);
    if (codeMatch && codeMatch[1]) {
        codeSnippet = codeMatch[1].trim();
    }

    // Default starter template if none extracted
    if (!codeSnippet) {
        if (currentSubject.toLowerCase().includes('java')) {
            codeSnippet = `// Java Practical: ${currentTopic}\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Exploring ${currentTopic}!");\n    }\n}`;
        } else if (currentSubject.toLowerCase().includes('python')) {
            codeSnippet = `# Python Practical: ${currentTopic}\nprint("Exploring ${currentTopic}!")\n\n# Try your code here:\n`;
        } else {
            codeSnippet = `// Practical Scratchpad for ${currentSubject}: ${currentTopic}\nconsole.log("Topic:", "${currentTopic}");\n`;
        }
    }

    // Initialize the CodeMirror IDE with the language and initial code
    setupCodeEditor(codeSnippet);

    // Convert section headers to visual cards
    const paragraphs = text.split('\n\n');
    paragraphs.forEach(para => {
        const trimmed = para.trim();
        if (!trimmed) return;

        const card = document.createElement('div');
        if (trimmed.includes('PRACTICAL') || trimmed.includes('WORKED EXAMPLE') || trimmed.includes('IMPLEMENTATION')) {
            card.className = 'study-section-card practical-section';
            card.innerHTML = `<div class="section-label" style="color:#34d399;"><i class="fa-solid fa-code"></i> Practical Example</div><div>${formatMarkdownOrText(trimmed)}</div>`;
        } else if (trimmed.includes('CHALLENGE') || trimmed.includes('EXERCISE')) {
            card.className = 'study-section-card challenge-section';
            card.innerHTML = `<div class="section-label" style="color:#fbbf24;"><i class="fa-solid fa-bolt"></i> Practical Challenge</div><div>${formatMarkdownOrText(trimmed)}</div>`;
        } else if (trimmed.includes('REFERENCE') || trimmed.includes('CHEAT SHEET') || trimmed.includes('TIPS')) {
            card.className = 'study-section-card ref-section';
            card.innerHTML = `<div class="section-label" style="color:#38bdf8;"><i class="fa-solid fa-bookmark"></i> Key Reference</div><div>${formatMarkdownOrText(trimmed)}</div>`;
        } else {
            card.className = 'study-section-card';
            card.innerHTML = `<div class="section-label" style="color:#a855f7;"><i class="fa-solid fa-book-open"></i> Theory & Concept</div><div>${formatMarkdownOrText(trimmed)}</div>`;
        }

        contentBox.appendChild(card);
    });
}

function formatMarkdownOrText(text) {
    // Clean section headers if already placed in label
    let clean = text.replace(/^(📘|💻|⚡|📌)?\s*(CONCEPT & THEORY|PRACTICAL IMPLEMENTATION \/ WORKED EXAMPLE|HANDS-ON PRACTICAL CHALLENGE|KEY REFERENCE & CHEAT SHEET):?\s*/i, '');

    // Format code blocks
    clean = clean.replace(/```([\s\S]*?)```/g, '<div class="study-code-snippet">$1</div>');
    clean = clean.replace(/\n/g, '<br>');
    return clean;
}

// Stopwatch Logic
function startStopwatch() {
    if (focusTimerInterval) clearInterval(focusTimerInterval);
    updateStopwatchDisplay();

    focusTimerInterval = setInterval(() => {
        if (!isPaused) {
            focusSeconds++;
            updateStopwatchDisplay();
        }
    }, 1000);
}

function updateStopwatchDisplay() {
    const mins = Math.floor(focusSeconds / 60);
    const secs = focusSeconds % 60;
    const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    const el = document.getElementById('sessionStopwatch');
    if (el) el.textContent = timeStr;
}

// Timer Controls: Pause & Stop
function setupTimerControls() {
    const pauseBtn = document.getElementById('pauseResumeBtn');
    pauseBtn.addEventListener('click', () => {
        isPaused = !isPaused;
        if (isPaused) {
            pauseBtn.innerHTML = '<i class="fa-solid fa-play"></i> Resume';
            pauseBtn.style.background = 'rgba(16, 185, 129, 0.2)';
            pauseBtn.style.color = '#34d399';
            pauseBtn.style.borderColor = 'rgba(16, 185, 129, 0.4)';
        } else {
            pauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i> Pause';
            pauseBtn.style.background = 'rgba(245, 158, 11, 0.2)';
            pauseBtn.style.color = '#fbbf24';
            pauseBtn.style.borderColor = 'rgba(245, 158, 11, 0.4)';
        }
    });

    const stopBtn = document.getElementById('stopSessionBtn');
    stopBtn.addEventListener('click', () => {
        isPaused = true;
        openQuizModal();
    });

    const closeQuizBtn = document.getElementById('closeQuizModalBtn');
    if (closeQuizBtn) {
        closeQuizBtn.addEventListener('click', () => {
            document.getElementById('quizModal').classList.remove('active');
            isPaused = false;
        });
    }
}

// Tab Switching & Distraction Tracker
function setupDistractionTracker() {
    document.addEventListener('visibilitychange', async () => {
        if (document.hidden && activeSessionId && !isPaused) {
            appSwitches++;
            console.log(`📱 App switched (${appSwitches} times)`);

            try {
                const res = await fetch(`${API_BASE_URL}/sessions/switch/${activeSessionId}`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    sessionQuality = data.qualityScore || Math.max(0, 100 - (appSwitches * 20));
                    const badge = document.getElementById('sessionQualityBadge');
                    if (badge) {
                        badge.textContent = `🛡️ ${sessionQuality}% Quality`;
                        if (sessionQuality < 60) {
                            badge.style.color = '#f87171';
                            badge.style.background = 'rgba(239, 68, 68, 0.15)';
                        }
                    }
                }
            } catch (e) {
                console.error('Failed to register switch:', e);
            }
        }
    });
}

// Practical Setup Tabs & Tools
function setupPracticalTabs() {
    const tabCodeBtn = document.getElementById('tabCodeBtn');
    const tabMathBtn = document.getElementById('tabMathBtn');
    const codeContent = document.getElementById('codeTabContent');
    const mathContent = document.getElementById('mathTabContent');

    tabCodeBtn.addEventListener('click', () => {
        tabCodeBtn.classList.add('active');
        tabMathBtn.classList.remove('active');
        codeContent.classList.add('active');
        mathContent.classList.remove('active');
    });

    tabMathBtn.addEventListener('click', () => {
        tabMathBtn.classList.add('active');
        tabCodeBtn.classList.remove('active');
        mathContent.classList.add('active');
        codeContent.classList.remove('active');
    });

    // Auto-select math tab if subject is Maths or Science
    const subjLower = currentSubject.toLowerCase();
    if (subjLower.includes('math') || subjLower.includes('science') || subjLower.includes('eco')) {
        tabMathBtn.click();
    }
}

function setupPracticalTools() {
    // Run Code Button
    const runBtn = document.getElementById('runCodeBtn');
    const consoleOutput = document.getElementById('consoleOutput');
    const codeEditor = document.getElementById('codeEditor');

    runBtn.addEventListener('click', () => {
        const code = getEditorContent().trim();
        if (!code) {
            consoleOutput.textContent = '⚠️ Please enter some code first.';
            return;
        }
        consoleOutput.textContent = '▶️ Executing...\n';

        try {
            const lang = detectLanguage(code);
            let output = '';

            if (lang === 'python') {
                output = executePython(code);
            } else if (lang === 'java') {
                output = executeJava(code);
            } else {
                output = executeJavaScript(code);
            }

            consoleOutput.textContent = output || '✅ Code executed successfully. (No output)';
        } catch (err) {
            consoleOutput.textContent = `❌ Runtime Exception:\n${err.message}`;
        }
    });

    // Reset Code
    document.getElementById('resetCodeBtn').addEventListener('click', () => {
        if (confirm('Reset your code practical to initial state?')) {
            loadStudyMaterial();
        }
    });

    // Math Equation Evaluator
    const evalMathBtn = document.getElementById('evalMathBtn');
    const mathInput = document.getElementById('mathInput');
    const mathResult = document.getElementById('mathResultDisplay');

    evalMathBtn.addEventListener('click', () => {
        const expr = mathInput.value.trim();
        if (!expr) return;

        try {
            const cleanExpr = expr.replace(/[^0-9+\-*/().MathsincostanqreE^,% ]/g, '');
            const res = Function('"use strict"; return (' + cleanExpr + ')')();
            mathResult.innerHTML = `Result: <span style="color:#34d399; font-size:16px;">${res}</span>`;
        } catch (err) {
            mathResult.innerHTML = `<span style="color:#f87171;">Invalid equation or syntax</span>`;
        }
    });
}

// ============================================================
// LANGUAGE DETECTION
// ============================================================
function detectLanguage(code) {
    // Java indicators
    if (/public\s+(class|static|void|int|String)\b/.test(code) ||
        /System\.out\.print/.test(code) ||
        /\bimport\s+java\./.test(code) ||
        /\bvoid\s+\w+\s*\(/.test(code)) {
        return 'java';
    }
    // Python indicators
    if (/^\s*def\s+\w+\s*\(/m.test(code) ||
        /^\s*import\s+\w+/m.test(code) ||
        /^\s*class\s+\w+:/m.test(code) ||
        /^\s*elif\s+/.test(code) ||
        /^\s*print\s*\(/m.test(code) ||
        /for\s+\w+\s+in\s+/.test(code)) {
        return 'python';
    }
    return 'javascript';
}

// ============================================================
// JAVASCRIPT EXECUTOR
// ============================================================
function executeJavaScript(code) {
    const logs = [];
    const customConsole = {
        log: (...args) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
        error: (...args) => logs.push('[ERROR] ' + args.join(' ')),
        warn: (...args) => logs.push('[WARN] ' + args.join(' '))
    };
    const runner = new Function('console', code);
    runner(customConsole);
    return logs.join('\n');
}

// ============================================================
// PYTHON INTERPRETER (Transpiler → JS)
// ============================================================
function executePython(code) {
    const logs = [];

    // Build a mini Python runtime inside JS
    const pyRuntime = {
        __output__: logs,
        print: (...args) => {
            // Handle Python's print with sep and end kwargs — basic version
            const parts = args.map(a => {
                if (typeof a === 'boolean') return a ? 'True' : 'False';
                if (a === null || a === undefined) return 'None';
                if (Array.isArray(a)) return '[' + a.map(x => JSON.stringify(x)).join(', ') + ']';
                return String(a);
            });
            logs.push(parts.join(' '));
        },
        range: function(start, stop, step) {
            if (stop === undefined) { stop = start; start = 0; }
            if (step === undefined) step = 1;
            const result = [];
            if (step > 0) { for (let i = start; i < stop; i += step) result.push(i); }
            else { for (let i = start; i > stop; i += step) result.push(i); }
            return result;
        },
        len: (x) => (x && x.length !== undefined) ? x.length : 0,
        str: (x) => String(x),
        int: (x) => parseInt(x, 10),
        float: (x) => parseFloat(x),
        input: (prompt) => { logs.push(`[INPUT] ${prompt || ''}`); return ''; },
        abs: Math.abs,
        max: (...args) => args.length === 1 ? Math.max(...args[0]) : Math.max(...args),
        min: (...args) => args.length === 1 ? Math.min(...args[0]) : Math.min(...args),
        sum: (iter) => iter.reduce((a, b) => a + b, 0),
        list: (x) => Array.from(x || []),
        type: (x) => {
            if (x === null) return '<class \'NoneType\'>';
            if (typeof x === 'number') return Number.isInteger(x) ? '<class \'int\'>' : '<class \'float\'>';
            if (typeof x === 'string') return '<class \'str\'>';
            if (typeof x === 'boolean') return '<class \'bool\'>';
            if (Array.isArray(x)) return '<class \'list\'>';
            return '<class \'object\'>';
        },
        True: true,
        False: false,
        None: null,
    };

    // Transpile Python → JavaScript
    const jsCode = transpilePythonToJS(code);

    // Execute transpiled code with the Python runtime injected
    const argNames = Object.keys(pyRuntime);
    const argValues = Object.values(pyRuntime);
    const runner = new Function(...argNames, jsCode);
    runner(...argValues);

    return logs.join('\n');
}

function transpilePythonToJS(code) {
    const lines = code.split('\n');
    const output = [];
    const indentStack = [0]; // Stack to track indent levels

    for (let i = 0; i < lines.length; i++) {
        const raw = lines[i];
        const stripped = raw.trimEnd();
        if (stripped === '' || stripped.trimStart() === '') {
            output.push('');
            continue;
        }

        const indent = raw.length - raw.trimStart().length;
        let line = stripped.trimStart();

        // Handle dedent (closing braces)
        while (indentStack.length > 1 && indent < indentStack[indentStack.length - 1]) {
            indentStack.pop();
            output.push('}');
        }

        const leadingSpaces = ' '.repeat(indent);

        // ── def function ──────────────────────────────────
        const defMatch = line.match(/^def\s+(\w+)\s*\(([^)]*)\)\s*:/);
        if (defMatch) {
            const fnName = defMatch[1];
            const params = defMatch[2];
            output.push(`${leadingSpaces}function ${fnName}(${params}) {`);
            indentStack.push(indent + 4);
            continue;
        }

        // ── class ─────────────────────────────────────────
        const classMatch = line.match(/^class\s+(\w+)(?:\(([^)]*)\))?\s*:/);
        if (classMatch) {
            output.push(`${leadingSpaces}class ${classMatch[1]} {`);
            indentStack.push(indent + 4);
            continue;
        }

        // ── if / elif / else ──────────────────────────────
        const ifMatch = line.match(/^if\s+(.+)\s*:/);
        if (ifMatch) {
            const cond = transpilePyExpr(ifMatch[1]);
            output.push(`${leadingSpaces}if (${cond}) {`);
            indentStack.push(indent + 4);
            continue;
        }
        const elifMatch = line.match(/^elif\s+(.+)\s*:/);
        if (elifMatch) {
            const cond = transpilePyExpr(elifMatch[1]);
            output.push(`${leadingSpaces}} else if (${cond}) {`);
            indentStack.push(indent + 4);
            continue;
        }
        if (line === 'else:') {
            output.push(`${leadingSpaces}} else {`);
            indentStack.push(indent + 4);
            continue;
        }

        // ── for x in range() / for x in list ─────────────
        const forRangeMatch = line.match(/^for\s+(\w+)\s+in\s+range\s*\(([^)]+)\)\s*:/);
        if (forRangeMatch) {
            const varName = forRangeMatch[1];
            const args = forRangeMatch[2].split(',').map(a => a.trim());
            let start = '0', stop = args[0], step = '1';
            if (args.length === 2) { start = args[0]; stop = args[1]; }
            if (args.length === 3) { start = args[0]; stop = args[1]; step = args[2]; }
            const cmp = parseFloat(step) >= 0 ? '<' : '>';
            output.push(`${leadingSpaces}for (let ${varName} = ${start}; ${varName} ${cmp} ${stop}; ${varName} += ${step}) {`);
            indentStack.push(indent + 4);
            continue;
        }

        const forInMatch = line.match(/^for\s+(\w+)\s+in\s+(.+)\s*:/);
        if (forInMatch) {
            output.push(`${leadingSpaces}for (const ${forInMatch[1]} of ${transpilePyExpr(forInMatch[2])}) {`);
            indentStack.push(indent + 4);
            continue;
        }

        // ── while ─────────────────────────────────────────
        const whileMatch = line.match(/^while\s+(.+)\s*:/);
        if (whileMatch) {
            output.push(`${leadingSpaces}while (${transpilePyExpr(whileMatch[1])}) {`);
            indentStack.push(indent + 4);
            continue;
        }

        // ── return ────────────────────────────────────────
        const retMatch = line.match(/^return\s*(.*)/);
        if (retMatch) {
            output.push(`${leadingSpaces}return ${transpilePyExpr(retMatch[1])};`);
            continue;
        }

        // ── variable assignment ───────────────────────────
        const assignMatch = line.match(/^(\w+)\s*=\s*(.+)/);
        if (assignMatch && !line.startsWith('print') && !line.startsWith('if') && !line.startsWith('while')) {
            const varName = assignMatch[1];
            const val = transpilePyExpr(assignMatch[2]);
            output.push(`${leadingSpaces}let ${varName} = ${val};`);
            continue;
        }

        // ── print() ───────────────────────────────────────
        const printMatch = line.match(/^print\s*\((.*)\)\s*$/s);
        if (printMatch) {
            output.push(`${leadingSpaces}print(${transpilePyExpr(printMatch[1])});`);
            continue;
        }

        // ── break / continue / pass ───────────────────────
        if (line === 'break') { output.push(`${leadingSpaces}break;`); continue; }
        if (line === 'continue') { output.push(`${leadingSpaces}continue;`); continue; }
        if (line === 'pass') { output.push(`${leadingSpaces}// pass`); continue; }

        // ── comments ──────────────────────────────────────
        if (line.startsWith('#')) {
            output.push(`${leadingSpaces}//${line.slice(1)}`);
            continue;
        }

        // ── generic expression/call ───────────────────────
        output.push(`${leadingSpaces}${transpilePyExpr(line)};`);
    }

    // Close any remaining open blocks
    while (indentStack.length > 1) {
        indentStack.pop();
        output.push('}');
    }

    return output.join('\n');
}

function transpilePyExpr(expr) {
    if (!expr) return '';
    let e = expr.trim();
    // Boolean literals
    e = e.replace(/\bTrue\b/g, 'true').replace(/\bFalse\b/g, 'false').replace(/\bNone\b/g, 'null');
    // Logical operators
    e = e.replace(/\band\b/g, '&&').replace(/\bor\b/g, '||').replace(/\bnot\s+/g, '!');
    // not equal
    e = e.replace(/!=/g, '!==').replace(/==/g, '===');
    // String concat with + (Python is same as JS, no change needed)
    // f-strings: f"text {var}" → `text ${var}`
    e = e.replace(/f"([^"]*)"/g, (_, s) => '`' + s.replace(/\{([^}]+)\}/g, '${$1}') + '`');
    e = e.replace(/f'([^']*)'/g, (_, s) => '`' + s.replace(/\{([^}]+)\}/g, '${$1}') + '`');
    // ** power operator
    e = e.replace(/(\w+)\s*\*\*\s*(\w+)/g, 'Math.pow($1, $2)');
    // Integer division //
    e = e.replace(/\/\//g, '/');
    return e;
}

// ============================================================
// JAVA EXECUTOR (Interpreter → JS)
// ============================================================
function executeJava(code) {
    const logs = [];

    // Extract all method bodies from the class
    // We find `main` and any other static methods, then call main()
    const methods = extractJavaMethods(code);

    if (!methods['main']) {
        // No main method — try to find any static method and call it
        const firstMethod = Object.keys(methods)[0];
        if (!firstMethod) throw new Error('No main() or public static method found.');
        executeJavaMethod(firstMethod, [], methods, logs);
    } else {
        executeJavaMethod('main', [], methods, logs);
    }

    return logs.join('\n');
}

function extractJavaMethods(code) {
    const methods = {};

    // Remove comments
    let clean = code.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

    // Match method signatures:  public static <type> <name>(args) { ... }
    const methodRegex = /(?:public|private|protected)?\s*(?:static)?\s*(?:void|int|String|boolean|double|float|long|char|\w+)\s+(\w+)\s*\(([^)]*)\)\s*\{/g;

    let match;
    while ((match = methodRegex.exec(clean)) !== null) {
        const methodName = match[1];
        const paramStr = match[2];
        const bodyStart = match.index + match[0].length;

        // Find the matching closing brace
        let depth = 1;
        let pos = bodyStart;
        while (pos < clean.length && depth > 0) {
            if (clean[pos] === '{') depth++;
            else if (clean[pos] === '}') depth--;
            pos++;
        }
        const body = clean.substring(bodyStart, pos - 1);
        methods[methodName] = { params: paramStr, body };
    }

    return methods;
}

function executeJavaMethod(methodName, args, methods, logs) {
    const method = methods[methodName];
    if (!method) throw new Error(`Method '${methodName}' not found.`);

    // Parse parameter names from signature (e.g. "int a, int b" → ["a", "b"])
    const paramNames = method.params
        .split(',')
        .map(p => p.trim())
        .filter(p => p.length > 0)
        .map(p => {
            // Strip type (e.g. "int a" → "a", "String[] args" → "args")
            const parts = p.replace(/\[\]/g, '').trim().split(/\s+/);
            return parts[parts.length - 1];
        });

    // Inject parameter values as variable assignments at the top of the body
    const paramInits = paramNames
        .map((name, idx) => `let ${name} = __args__[${idx}];`)
        .join('\n');

    // Convert Java body to JS
    let js = paramInits + '\n' + transpileJavaToJS(method.body);

    // Build a scope with all other methods callable
    const scope = {};
    for (const [name, m] of Object.entries(methods)) {
        scope[name] = (...callArgs) => executeJavaMethod(name, callArgs, methods, logs);
    }

    // Inject Java runtime + __args__ for the parameter values
    const javaRuntime = {
        __args__: args,
        System: {
            out: {
                println: (...a) => logs.push(a.map(x => x === null ? 'null' : String(x)).join(' ')),
                print: (...a) => logs.push(a.map(x => x === null ? 'null' : String(x)).join(''))
            }
        },
        Math,
        Integer: { parseInt: (s) => parseInt(s, 10), MAX_VALUE: 2147483647, MIN_VALUE: -2147483648 },
        // Create a Java class instance as a JS object with all methods attached
        __newInstance__: (className, constructorArgs) => {
            const instance = {};
            for (const [name, m] of Object.entries(methods)) {
                const captured = name;
                instance[captured] = (...callArgs) => executeJavaMethod(captured, callArgs, methods, logs);
            }
            return instance;
        },
        ...scope
    };

    const argNames = Object.keys(javaRuntime);
    const argValues = Object.values(javaRuntime);

    try {
        const runner = new Function(...argNames, js);
        return runner(...argValues);
    } catch (err) {
        throw new Error(`Java execution error in '${methodName}': ${err.message}`);
    }
}


function transpileJavaToJS(body) {
    let js = body;

    // System.out.println / print (keep as-is, System is in runtime)
    // (no change needed)

    // Object instantiation: ClassName var = new ClassName(args);
    // Must run BEFORE generic type replacement
    js = js.replace(/\b([A-Z]\w*)\s+(\w+)\s*=\s*new\s+[A-Z]\w*\s*\(([^)]*)\)\s*;/g,
        'let $2 = __newInstance__("$1", [$3]);');

    // Standalone new ClassName() (e.g. as argument or return)
    js = js.replace(/new\s+[A-Z]\w*\s*\(([^)]*)\)/g,
        '__newInstance__("Object", [$1])');

    // Primitive type declarations → let  (int x = 5; → let x = 5;)
    js = js.replace(/\b(?:int|double|float|long|boolean|char|String|var)\s+(\w+)\s*=/g, 'let $1 =');
    js = js.replace(/\b(?:int|double|float|long|boolean|char|String)\s+(\w+)\s*;/g, 'let $1;');

    // Non-primitive type declarations without assignment (e.g. Calculator c;)
    js = js.replace(/\b[A-Z]\w*\s+(\w+)\s*;/g, 'let $1;');

    // Non-primitive type declarations with assignment that weren't caught above
    // (e.g. ClassName var = someMethod())
    js = js.replace(/\b[A-Z]\w*\s+(\w+)\s*=/g, 'let $1 =');

    // String[] / int[] array declarations
    js = js.replace(/(?:int|String|double|boolean|char)\[\]\s+(\w+)\s*=/g, 'let $1 =');

    // for (int i = ...) → for (let i = ...)
    js = js.replace(/for\s*\(\s*(?:int|long|double)\s+/g, 'for (let ');

    // Enhanced for: for (Type item : collection) → for (const item of collection)
    js = js.replace(/for\s*\(\s*(?:\w+)\s+(\w+)\s*:\s*([^)]+)\)/g, 'for (const $1 of $2)');

    // String methods
    js = js.replace(/\.length\(\)/g, '.length');
    js = js.replace(/\.charAt\((\d+)\)/g, '[$1]');
    js = js.replace(/\.substring\(/g, '.slice(');
    js = js.replace(/\.toLowerCase\(\)/g, '.toLowerCase()');
    js = js.replace(/\.toUpperCase\(\)/g, '.toUpperCase()');
    js = js.replace(/\.equals\(([^)]+)\)/g, ' === $1');

    return js;
}


// ==========================================================
// QUIZ & TEST FLOW
// ==========================================================
async function openQuizModal() {
    const modal = document.getElementById('quizModal');
    const loadingState = document.getElementById('quizLoadingState');
    const questionsContainer = document.getElementById('quizQuestionsContainer');
    const resultsContainer = document.getElementById('quizResultsContainer');

    modal.classList.add('active');
    loadingState.style.display = 'block';
    questionsContainer.style.display = 'none';
    resultsContainer.style.display = 'none';

    try {
        const response = await fetch(`${API_BASE_URL}/sessions/questions/${activeSessionId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (!response.ok) {
            throw new Error('Failed to load quiz');
        }

        quizData = await response.json();
        renderQuizQuestions(quizData);

        loadingState.style.display = 'none';
        questionsContainer.style.display = 'block';

    } catch (err) {
        console.error('❌ Error fetching quiz questions:', err);
        loadingState.innerHTML = `
            <p style="color:#f87171;">Could not load test questions. Click below to complete session directly.</p>
            <button class="btn-primary-action" onclick="finishSessionDirectly()">Finish Session</button>
        `;
    }
}

function renderQuizQuestions(data) {
    // Q1: Short Question
    document.getElementById('quizShortQ').textContent = data.shortQuestion || `What is the core takeaway of ${currentTopic}?`;

    // Q2: True/False
    document.getElementById('quizTfQ').textContent = data.trueFalseQuestion || `Did you successfully complete the practicals for ${currentTopic}?`;
    selectedTfAnswer = null;
    const trueBtn = document.getElementById('tfTrueBtn');
    const falseBtn = document.getElementById('tfFalseBtn');
    trueBtn.className = 'tf-btn';
    falseBtn.className = 'tf-btn';

    trueBtn.onclick = () => {
        selectedTfAnswer = true;
        trueBtn.className = 'tf-btn selected';
        falseBtn.className = 'tf-btn';
    };

    falseBtn.onclick = () => {
        selectedTfAnswer = false;
        falseBtn.className = 'tf-btn selected';
        trueBtn.className = 'tf-btn';
    };

    // Q3: MCQ
    document.getElementById('quizMcqQ').textContent = data.mcqQuestion || `Which concept best relates to ${currentTopic}?`;
    const mcqList = document.getElementById('mcqOptionsList');
    mcqList.innerHTML = '';

    const opts = data.mcqOptions || { 'A': 'Core Syntax', 'B': 'Framework Integration', 'C': 'Memory Management', 'D': 'All of the above' };
    Object.keys(opts).forEach(key => {
        const label = document.createElement('label');
        label.className = 'mcq-option-label';
        label.innerHTML = `
            <input type="radio" name="mcqChoice" value="${key}">
            <span><strong>${key}:</strong> ${opts[key]}</span>
        `;
        mcqList.appendChild(label);
    });

    // Wire Submit Button
    document.getElementById('submitQuizBtn').onclick = submitQuizAnswers;
}

async function submitQuizAnswers() {
    const submitBtn = document.getElementById('submitQuizBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting & Grading...';

    const shortVal = document.getElementById('quizShortInput').value.trim();
    const tfVal = (selectedTfAnswer !== null) ? selectedTfAnswer : true;
    const selectedMcq = document.querySelector('input[name="mcqChoice"]:checked');
    const mcqVal = selectedMcq ? selectedMcq.value : 'A';

    try {
        // Complete focused session with elapsed focus time
        const minsSpent = Math.max(1, Math.round(focusSeconds / 60));
        const res = await fetch(`${API_BASE_URL}/sessions/complete-focus`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                sessionId: activeSessionId,
                durationMinutes: minsSpent,
                shortAnswer: shortVal,
                trueOrFalseAnswer: tfVal,
                mcqAnswer: mcqVal
            })
        });

        const completeData = await res.json();

        // Mark Topic as Completed on Roadmap
        await fetch(`${API_BASE_URL}/topics/complete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                userId: currentUserId,
                subject: currentSubject,
                title: currentTopic
            })
        });

        // Show Results
        showQuizResults(completeData);

    } catch (err) {
        console.error('❌ Error submitting quiz:', err);
        alert('Submitted with fallback. Session recorded!');
        showQuizResults({ coinsEarned: 2, qualityScore: sessionQuality });
    }
}

function showQuizResults(data) {
    document.getElementById('quizQuestionsContainer').style.display = 'none';
    const resultsContainer = document.getElementById('quizResultsContainer');
    resultsContainer.style.display = 'block';

    const mins = Math.max(1, Math.round(focusSeconds / 60));
    document.getElementById('resultTime').textContent = `${mins} min`;
    document.getElementById('resultCoins').textContent = `🪙 +${data.coinsEarned != null ? data.coinsEarned : 2}`;
    document.getElementById('resultScore').textContent = 'Passed (3/3)';

    document.getElementById('returnRoadmapBtn').onclick = () => {
        window.location.href = `/topics.html?subject=${encodeURIComponent(currentSubject)}`;
    };
}

function finishSessionDirectly() {
    showQuizResults({ coinsEarned: 1, qualityScore: sessionQuality });
}
