let tryb = "domyslny";

const models = {
    openrouter: [
        { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash (Free)' },
        { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
        { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
        { id: 'meta-llama/llama-3.1-8b-instruct:free', name: 'Llama 3.1 8B (Free)' }
    ],
    google: [
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Polecany)' },
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' }
    ],
    agentrouter: [
        { id: 'claude-opus-4-6', name: 'Claude Opus 4.6' },
        { id: 'claude-opus-4-7', name: 'Claude Opus 4.7' },
        { id: 'claude-opus-4-8', name: 'Claude Opus 4.8' },
        { id: 'glm-5.2', name: 'GLM 5.2' },
        { id: 'gpt-5.5', name: 'GPT 5.5' }
    ]
};

const pages = ['mainMenu', 'settingsPage', 'aiConfigPage', 'solverConfigPage', 'aboutPage'];
const showPage = (id) => {
    pages.forEach(p => document.getElementById(p).classList.toggle('hidden', p !== id));
};

const providerSelect = document.getElementById('providerSelect');
const modelSelect = document.getElementById('modelSelect');
const apiKeyInput = document.getElementById('apiKey');
const toggleKeyBtn = document.getElementById('toggleKeyBtn');
const solverToggle = document.getElementById('solverToggle');
const statusText = document.getElementById('statusText');
const visibilityDefaultBtn = document.getElementById('visibilityDefaultBtn');
const visibilityDiscreteBtn = document.getElementById('visibilityDiscreteBtn');

/** Ustawia etykietę statusu solvera (kropka + kolor pochodzą z CSS). */
function setSolverStatus(isActive) {
    statusText.textContent = isActive ? 'Aktywny' : 'Nieaktywny';
    statusText.className = `status-pill ${isActive ? 'status-on' : 'status-off'}`;
}

/** Podświetla wybraną opcję widoczności odpowiedzi. */
function markVisibility(mode) {
    visibilityDefaultBtn.classList.toggle('is-active', mode !== 'dyskretny');
    visibilityDiscreteBtn.classList.toggle('is-active', mode === 'dyskretny');
}

function updateModelList() {
    const selectedProvider = providerSelect.value;
    modelSelect.innerHTML = '';
    models[selectedProvider].forEach(model => {
        const opt = document.createElement('option');
        opt.value = model.id;
        opt.textContent = model.name;
        modelSelect.appendChild(opt);
    });
}

providerSelect.addEventListener('change', updateModelList);

document.getElementById('saveSettingsBtn').addEventListener('click', async () => {
    let result = await chrome.storage.local.get('solverConfig');
    let saved = result.solverConfig || {};
    saved.provider = providerSelect.value;
    saved.apiKey = apiKeyInput.value;
    saved.model = modelSelect.value;
    
    await chrome.storage.local.set({ solverConfig: saved });
    showStatus('Zapisano pomyślnie!', 'success');
});

toggleKeyBtn.addEventListener('click', () => {
    const revealed = apiKeyInput.type === 'text';
    apiKeyInput.type = revealed ? 'password' : 'text';
    toggleKeyBtn.querySelector('use').setAttribute('href', revealed ? '#i-eye' : '#i-eye-off');
    const title = revealed ? 'Pokaż klucz' : 'Ukryj klucz';
    toggleKeyBtn.title = title;
    toggleKeyBtn.setAttribute('aria-label', title);
});

document.getElementById('testApiBtn').addEventListener('click', async () => {
    const key = apiKeyInput.value;
    const provider = providerSelect.value;
    if (!key) {
        showStatus('Wprowadź klucz API', 'danger');
        return;
    }

    if (!provider || !modelSelect.value) {
        showStatus('Wybierz dostawcę i model', 'danger');
        return;
    }

    showStatus('Łączenie...', 'info');

    let url = provider === 'openrouter' 
        ? 'https://openrouter.ai/api/v1/models' 
        : provider === 'agentrouter'
        ? 'https://agentrouter.org/v1/models'
        : `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

    try {
        const headers = (provider === 'openrouter' || provider === 'agentrouter') ? { 'Authorization': `Bearer ${key}` } : {};
        const response = await fetch(url, { headers });
        
        if (response.ok) {
            showStatus('Połączenie poprawne!', 'success');
        } else {
            showStatus('Błąd klucza API', 'danger');
        }
    } catch (e) {
        showStatus('Błąd sieci', 'danger');
    }
});
const STATUS_ICONS = {
    success: 'i-check',
    error: 'i-alert',
    info: 'i-activity'
};

/**
 * Wyświetla komunikat pod formularzem wraz z pasującą ikoną.
 * @param {string} txt  treść komunikatu
 * @param {'success'|'error'|'danger'|'info'} type  rodzaj komunikatu
 */
function showStatus(txt, type) {
    const msg = document.getElementById('statusMsg');
    const kind = type === 'success' ? 'success' : type === 'info' ? 'info' : 'error';

    msg.className = kind === 'info' ? 'status-msg' : `status-msg ${kind}`;
    msg.innerHTML = `<svg class="ico ico-xs"><use href="#${STATUS_ICONS[kind]}"></use></svg><span></span>`;
    msg.querySelector('span').textContent = txt;
}

document.addEventListener('DOMContentLoaded', async () => {
    updateModelList();
    let result = await chrome.storage.local.get('solverConfig');
    const saved = result.solverConfig;
    if (saved) {
        if (saved.provider) providerSelect.value = saved.provider;
        updateModelList();
        if (saved.model) modelSelect.value = saved.model;
        if (saved.apiKey) apiKeyInput.value = saved.apiKey;
        if (saved.solverActive !== undefined) {
            solverToggle.checked = saved.solverActive;
            setSolverStatus(saved.solverActive);
        }
        if (saved.tryb) {
            tryb = saved.tryb;
            markVisibility(tryb);
        }
    }

    // - QUOTA CIRCLE -
    await refreshQuotaDisplay();

    // Reaguj natychmiast gdy background.js zapisze nowe dane do storage
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.usageStats) {
            console.log('[Test Solver] usageStats changed, refreshing quota display...');
            refreshQuotaDisplay();
        }
    });

    // Fallback: odświeżaj co 3s (na wypadek gdyby onChanged nie zadziałał)
    setInterval(refreshQuotaDisplay, 3000);
});

document.getElementById('settingsBtn').onclick = () => showPage('settingsPage');
document.getElementById('aboutBtn').onclick = () => showPage('aboutPage');
document.getElementById('backFromSettings').onclick = () => showPage('mainMenu');
document.getElementById('backFromAbout').onclick = () => showPage('mainMenu');

document.getElementById('aiConfigBtn').onclick = () => showPage('aiConfigPage');
document.getElementById('solverConfigBtn').onclick = () => showPage('solverConfigPage');
document.getElementById('backFromAiConfig').onclick = () => showPage('settingsPage');
document.getElementById('backFromSolverConfig').onclick = () => showPage('settingsPage');

document.getElementById('screenshotBtn').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
        return;
    }

    const response = await chrome.runtime.sendMessage({ action: 'startScreenshot', tabId: tab.id });
    if (response?.error) {
        console.error('[Test Solver] Screenshot error:', response.error);
    }
});

solverToggle.onchange = async (e) => {
    const isActive = e.target.checked;
    setSolverStatus(isActive);

    let result = await chrome.storage.local.get('solverConfig');
    let saved = result.solverConfig || {};
    saved.solverActive = isActive;
    await chrome.storage.local.set({ solverConfig: saved });
};

async function saveVisibility(mode) {
    tryb = mode;
    markVisibility(mode);

    let result = await chrome.storage.local.get('solverConfig');
    let saved = result.solverConfig || {};
    saved.tryb = mode;
    await chrome.storage.local.set({ solverConfig: saved });
}

visibilityDefaultBtn.addEventListener('click', () => saveVisibility('domyslny'));
visibilityDiscreteBtn.addEventListener('click', () => saveVisibility('dyskretny'));


// ─── QUOTA / USAGE TRACKING ─────────────────────────────────────────────────

/**
 * Oblicza kolor krawędzi progress circle w zależności od zużycia:
 *  0–60% → zielony (#2dd4a3)
 * 61–85% → żółty (#f59e0b)
 * 86–100% → czerwony (#ff6391)
 */
function getProgressColor(percent) {
    if (percent <= 60) return '#2dd4a3';
    if (percent <= 85) return '#f59e0b';
    return '#ff6391';
}

/**
 * Formatuje liczbę tokenów do czytelnej postaci (np. 1 234 567).
 */
function formatNumber(n) {
    return Number(n || 0).toLocaleString('pl-PL');
}

/**
 * Skrócony zapis dużych liczb dla wąskiego badge'a (np. 812 tys. / 1 mln).
 */
function formatCompact(n) {
    const value = Number(n || 0);
    if (value < 10000) return value.toLocaleString('pl-PL');
    return new Intl.NumberFormat('pl-PL', {
        notation: 'compact',
        maximumFractionDigits: 1
    }).format(value);
}

// Obwód pierścienia SVG (r = 20) - używany do sterowania stroke-dashoffset.
const RING_CIRCUMFERENCE = 2 * Math.PI * 20;

/**
 * Rysuje wypełnienie pierścienia postępu.
 * @param {SVGCircleElement} circle
 * @param {number} percent  0–100
 * @param {string|null} color  kolor obrysu (null = neutralny z CSS)
 */
function setRing(circle, percent, color) {
    const clamped = Math.max(0, Math.min(100, percent));
    circle.style.strokeDasharray  = `${RING_CIRCUMFERENCE}`;
    circle.style.strokeDashoffset = `${RING_CIRCUMFERENCE * (1 - clamped / 100)}`;
    circle.style.stroke = color || '';
}

/**
 * Aktualizuje pierścień postępu i etykiety na podstawie danych
 * z chrome.storage (usageStats zapisywane przez background.js).
 */
async function refreshQuotaDisplay() {
    const circle    = document.getElementById('apiProgressCircle');
    const textEl    = document.getElementById('apiProgressText');
    const badgeEl   = document.getElementById('quotaCount');
    const infoEl    = document.querySelector('.quota-info');
    const infoTextEl = document.getElementById('quotaInfoText');

    const setInfo = (txt, isWarning) => {
        if (infoTextEl) infoTextEl.textContent = txt;
        if (infoEl) infoEl.classList.toggle('is-warn', Boolean(isWarning));
    };

    const stored = await chrome.storage.local.get('usageStats');
    const stats  = stored.usageStats;

    // Brak danych - nie było jeszcze żadnego zapytania
    if (!stats || !stats.date) {
        setRing(circle, 0, null);
        textEl.textContent = '-';
        textEl.style.color = '';
        badgeEl.textContent = 'Brak danych';
        setInfo('Wykonaj pierwsze zapytanie, aby zobaczyć zużycie.', false);
        return;
    }

    // Resetowanie przy nowym dniu (edge-case: popup otwarty przez północy)
    const today = new Date().toISOString().slice(0, 10);
    if (stats.date !== today) {
        setRing(circle, 0, null);
        textEl.textContent = '0%';
        textEl.style.color = '';
        badgeEl.textContent = '0 / -';
        setInfo('Nowy dzień - limit zresetowany.', false);
        return;
    }

    const used     = stats.used    || 0;
    const limit    = stats.limit   || 1;
    const percent  = stats.percent || 0;
    const color    = getProgressColor(percent);
    const isGoogle = stats.provider === 'google';

    setRing(circle, percent, color);
    textEl.textContent = `${percent}%`;
    textEl.style.color = color;

    // Badge z dokładnymi wartościami
    if (isGoogle) {
        badgeEl.textContent = `${formatCompact(used)} / ${formatCompact(limit)} tok.`;
        badgeEl.title = `${formatNumber(used)} / ${formatNumber(limit)} tokenów`;
    } else {
        badgeEl.textContent = `${used} / ${limit} req.`;
        badgeEl.title = `${used} z ${limit} zapytań`;
    }

    // Tekst informacyjny obok pierścienia
    const label = isGoogle ? 'tokenów' : 'zapytań';
    const modelName = stats.model || '?';
    if (percent >= 90) {
        setInfo(`Zbliżasz się do limitu dziennego! (${modelName})`, true);
    } else {
        setInfo(`Dziś zużyto ${formatNumber(used)} ${label} (${modelName})`, false);
    }
}
