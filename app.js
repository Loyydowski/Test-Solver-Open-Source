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
const solverToggle = document.getElementById('solverToggle');
const statusText = document.getElementById('statusText');

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

document.getElementById('testApiBtn').addEventListener('click', async () => {
    const key = apiKeyInput.value;
    const provider = providerSelect.value;
    const msg = document.getElementById('statusMsg');
    if (!key) {
        showStatus('Wprowadź klucz API', 'danger');
        return;
    }
    
    if (!provider || !modelSelect.value) {
        showStatus('Wybierz dostawcę i model', 'danger');
        return;
    }
    
    msg.textContent = 'Łączenie...';
    
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
function showStatus(txt, type) {
    const msg = document.getElementById('statusMsg');
    msg.textContent = txt;
    msg.style.color = type === 'success' ? '#22c55e' : '#ef4444';
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
            statusText.textContent = saved.solverActive ? 'Aktywny' : 'Nieaktywny';
            statusText.className = saved.solverActive ? 'status-on' : 'status-off';
        }
        if (saved.tryb) {
            tryb = saved.tryb;
            if (tryb === "dyskretny") {
                document.getElementById('visibilityDiscreteBtn').classList.add('primary');
                document.getElementById('visibilityDefaultBtn').classList.remove('primary');
            }
        }
    }

    // — QUOTA CIRCLE —
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
    statusText.textContent = isActive ? 'Aktywny' : 'Nieaktywny';
    statusText.className = isActive ? 'status-on' : 'status-off';
    
    let result = await chrome.storage.local.get('solverConfig');
    let saved = result.solverConfig || {};
    saved.solverActive = isActive;
    await chrome.storage.local.set({ solverConfig: saved });
};

document.getElementById('visibilityDefaultBtn').addEventListener('click', async () => {
    tryb = "domyslny";
    document.getElementById('visibilityDefaultBtn').classList.add('primary');
    document.getElementById('visibilityDiscreteBtn').classList.remove('primary');
    
    let result = await chrome.storage.local.get('solverConfig');
    let saved = result.solverConfig || {};
    saved.tryb = tryb;
    await chrome.storage.local.set({ solverConfig: saved });
});

document.getElementById('visibilityDiscreteBtn').addEventListener('click', async () => {
    tryb = "dyskretny";
    document.getElementById('visibilityDiscreteBtn').classList.add('primary');
    document.getElementById('visibilityDefaultBtn').classList.remove('primary');
    
    let result = await chrome.storage.local.get('solverConfig');
    let saved = result.solverConfig || {};
    saved.tryb = tryb;
    await chrome.storage.local.set({ solverConfig: saved });
});


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
 * Aktualizuje progress circle i etykiety na podstawie danych
 * z chrome.storage (usageStats zapisywane przez background.js).
 */
async function refreshQuotaDisplay() {
    const circle    = document.getElementById('apiProgressCircle');
    const textEl    = document.getElementById('apiProgressText');
    const badgeEl   = document.getElementById('quotaCount');
    const infoEl    = document.querySelector('.quota-info');

    const stored = await chrome.storage.local.get('usageStats');
    const stats  = stored.usageStats;

    // Brak danych — nie było jeszcze żadnego zapytania
    if (!stats || !stats.date) {
        circle.style.background = `conic-gradient(rgba(255,255,255,0.07) 0deg, rgba(255,255,255,0.07) 360deg)`;
        textEl.textContent = '—';
        badgeEl.textContent = 'Brak danych';
        if (infoEl) infoEl.textContent = 'Wykonaj pierwsze zapytanie, aby zobaczyć zużycie.';
        return;
    }

    // Resetowanie przy nowym dniu (edge-case: popup otwarty przez północy)
    const today = new Date().toISOString().slice(0, 10);
    if (stats.date !== today) {
        circle.style.background = `conic-gradient(rgba(255,255,255,0.07) 0deg, rgba(255,255,255,0.07) 360deg)`;
        textEl.textContent = '0%';
        badgeEl.textContent = '0 / —';
        if (infoEl) infoEl.textContent = 'Nowy dzień — limit zresetowany.';
        return;
    }

    const used    = stats.used    || 0;
    const limit   = stats.limit   || 1;
    const percent = stats.percent || 0;
    const color   = getProgressColor(percent);
    const degrees = (percent / 100) * 360;
    const isGoogle = stats.provider === 'google';

    // Progress circle — kolor + glowa conic-gradient
    circle.style.background  = `conic-gradient(${color} ${degrees}deg, rgba(255,255,255,0.07) ${degrees}deg)`;
    circle.style.boxShadow   = `0 0 16px -4px ${color}88`;
    textEl.textContent       = `${percent}%`;
    textEl.style.color       = color;

    // Badge z dokładnymi wartościami
    if (isGoogle) {
        badgeEl.textContent = `${formatNumber(used)} / ${formatNumber(limit)} tok.`;
    } else {
        badgeEl.textContent = `${used} / ${limit} req.`;
    }

    // Tekst informacyjny pod kręgiem
    if (infoEl) {
        const label = isGoogle ? 'tokenów' : 'zapytań';
        const modelName = stats.model || '?';
        if (percent >= 90) {
            infoEl.textContent = `⚠️ Zbliżasz się do limitu dziennego! (${modelName})`;
            infoEl.style.color = '#ff6391';
        } else {
            infoEl.textContent = `Dziś zużyto ${formatNumber(used)} ${label} (${modelName})`;
            infoEl.style.color = '';
        }
    }
}