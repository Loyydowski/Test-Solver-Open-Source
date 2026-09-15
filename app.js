// Test Solver - popup
// Wymaga api-errors.js (ładowany wcześniej w app.html).

let tryb = 'domyslny';

// ─── MODELE ──────────────────────────────────────────────────────────────────
//
// Lista zapasowa, używana dopóki nie uda się pobrać katalogu od providera.
// Trzyma wyłącznie identyfikatory, które dało się potwierdzić - wcześniej były
// tu wpisy zmyślone (claude-opus-4-7, claude-opus-4-8, gpt-5.5, glm-5.2),
// przez co błąd wychodził dopiero przy pierwszym zapytaniu, a nie przy wyborze.
//
// Docelowo i tak wygrywa lista pobrana z /models - katalogi providerów zmieniają
// się co kilka tygodni i każda lista wpisana na sztywno zdąży się zestarzeć.
const FALLBACK_MODELS = {
    openrouter: [
        { id: 'google/gemini-2.0-flash-exp:free',        name: 'Gemini 2.0 Flash (Free)' },
        { id: 'openai/gpt-4o-mini',                      name: 'GPT-4o Mini' },
        { id: 'anthropic/claude-3.5-sonnet',             name: 'Claude 3.5 Sonnet' },
        { id: 'meta-llama/llama-3.1-8b-instruct:free',   name: 'Llama 3.1 8B (Free)' }
    ],
    google: [
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (polecany)' },
        { id: 'gemini-1.5-pro',   name: 'Gemini 1.5 Pro' },
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' }
    ],
    // AgentRouter to usługa zgodna z API OpenAI, ale bez publicznie
    // udokumentowanego katalogu - listę da się poznać tylko z /v1/models,
    // więc nie zgadujemy.
    agentrouter: []
};

/** Skąd pobrać katalog modeli i jak go odczytać. */
const MODEL_SOURCES = {
    openrouter: {
        url: () => 'https://openrouter.ai/api/v1/models',
        headers: (key) => (key ? { Authorization: `Bearer ${key}` } : {}),
        parse: (json) => (json.data || []).map(m => ({ id: m.id, name: m.name || m.id }))
    },
    agentrouter: {
        url: () => 'https://agentrouter.org/v1/models',
        headers: (key) => ({ Authorization: `Bearer ${key}` }),
        parse: (json) => (json.data || []).map(m => ({ id: m.id, name: m.id }))
    },
    google: {
        url: (key) => `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
        headers: () => ({}),
        parse: (json) => (json.models || [])
            // Część modeli w katalogu to embeddingi - nie umieją generateContent.
            .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
            .map(m => ({ id: m.name.replace(/^models\//, ''), name: m.displayName || m.name }))
    }
};

const pages = ['mainMenu', 'settingsPage', 'aiConfigPage', 'solverConfigPage', 'aboutPage'];
const showPage = (id) => {
    pages.forEach(p => document.getElementById(p).classList.toggle('hidden', p !== id));
};

const providerSelect        = document.getElementById('providerSelect');
const modelSelect           = document.getElementById('modelSelect');
const apiKeyInput           = document.getElementById('apiKey');
const toggleKeyBtn          = document.getElementById('toggleKeyBtn');
const solverToggle          = document.getElementById('solverToggle');
const statusText            = document.getElementById('statusText');
const visibilityDefaultBtn  = document.getElementById('visibilityDefaultBtn');
const visibilityDiscreteBtn = document.getElementById('visibilityDiscreteBtn');

/** Etykieta statusu solvera (kropka i kolor pochodzą z CSS). */
function setSolverStatus(isActive) {
    statusText.textContent = isActive ? 'Aktywny' : 'Nieaktywny';
    statusText.className = `status-pill ${isActive ? 'status-on' : 'status-off'}`;
}

function markVisibility(mode) {
    visibilityDefaultBtn.classList.toggle('is-active', mode !== 'dyskretny');
    visibilityDiscreteBtn.classList.toggle('is-active', mode === 'dyskretny');
}

// ─── LISTA MODELI ────────────────────────────────────────────────────────────

function renderModels(models, selectedId) {
    modelSelect.innerHTML = '';

    if (!models.length) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'Wpisz klucz API i kliknij Testuj, aby wczytać modele';
        opt.disabled = true;
        modelSelect.appendChild(opt);
        return;
    }

    models.forEach(model => {
        const opt = document.createElement('option');
        opt.value = model.id;
        opt.textContent = model.name;
        modelSelect.appendChild(opt);
    });

    if (selectedId && models.some(m => m.id === selectedId)) {
        modelSelect.value = selectedId;
    }
}

/**
 * Pobiera katalog modeli od providera. Przy każdym niepowodzeniu wraca do
 * listy zapasowej - brak internetu nie ma prawa zostawić pustego selecta.
 *
 * @returns {Promise<{models: Array, live: boolean}>}
 */
async function loadModels(provider, apiKey) {
    const fallback = FALLBACK_MODELS[provider] || [];
    const source = MODEL_SOURCES[provider];
    if (!source) return { models: fallback, live: false };

    // Google i AgentRouter nie oddadzą katalogu bez klucza.
    if (!apiKey && provider !== 'openrouter') {
        return { models: fallback, live: false };
    }

    try {
        const response = await fetch(source.url(apiKey), { headers: source.headers(apiKey) });
        if (!response.ok) return { models: fallback, live: false };

        const models = source.parse(await response.json());
        return models.length
            ? { models: models.sort((a, b) => a.name.localeCompare(b.name)), live: true }
            : { models: fallback, live: false };
    } catch {
        return { models: fallback, live: false };
    }
}

/** Odświeża listę modeli dla aktualnie wybranego providera. */
async function refreshModels(selectedId) {
    const provider = providerSelect.value;
    renderModels(FALLBACK_MODELS[provider] || [], selectedId);

    const { models, live } = await loadModels(provider, apiKeyInput.value.trim());
    // Provider mógł się zmienić, zanim zapytanie wróciło.
    if (providerSelect.value !== provider) return;

    renderModels(models, selectedId || modelSelect.value);
    if (live) console.log(`[Test Solver] Wczytano ${models.length} modeli od ${provider}.`);
}

providerSelect.addEventListener('change', () => refreshModels());

// ─── KOMUNIKATY ──────────────────────────────────────────────────────────────

const STATUS_ICONS = {
    success: 'i-check',
    error:   'i-alert',
    info:    'i-activity'
};

/**
 * Komunikat pod formularzem.
 * @param {string} txt
 * @param {'success'|'error'|'info'} type
 */
function showStatus(txt, type) {
    const msg = document.getElementById('statusMsg');
    const kind = STATUS_ICONS[type] ? type : 'error';

    msg.className = kind === 'info' ? 'status-msg' : `status-msg ${kind}`;
    msg.innerHTML = `<svg class="ico ico-xs"><use href="#${STATUS_ICONS[kind]}"></use></svg><span></span>`;
    msg.querySelector('span').textContent = txt;
}

// ─── ZAPIS I TEST ────────────────────────────────────────────────────────────

document.getElementById('saveSettingsBtn').addEventListener('click', async () => {
    if (!modelSelect.value) {
        showStatus('Najpierw wybierz model.', 'error');
        return;
    }

    const { solverConfig } = await chrome.storage.local.get('solverConfig');
    const saved = solverConfig || {};
    saved.provider = providerSelect.value;
    saved.apiKey   = apiKeyInput.value.trim();
    saved.model    = modelSelect.value;

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
    const key = apiKeyInput.value.trim();
    const provider = providerSelect.value;

    if (!key) {
        showStatus('Wprowadź klucz API.', 'error');
        return;
    }

    showStatus('Łączenie...', 'info');

    const source = MODEL_SOURCES[provider];
    try {
        const response = await fetch(source.url(key), { headers: source.headers(key) });

        if (!response.ok) {
            // Wcześniej każdy nie-OK dawał ten sam "Błąd klucza API", więc
            // limit zapytań wyglądał identycznie jak zły klucz - a pierwszy
            // mija sam, drugi trzeba naprawić.
            const bodyText = await response.text().catch(() => '');
            const { message } = describeHttpError(response.status, bodyText);
            showStatus(message, 'error');
            console.warn(`[Test Solver] Test klucza: HTTP ${response.status}`, bodyText.slice(0, 500));
            return;
        }

        // Klucz działa - przy okazji zaciągamy aktualny katalog modeli.
        const models = source.parse(await response.json());
        if (models.length) {
            renderModels(models.sort((a, b) => a.name.localeCompare(b.name)), modelSelect.value);
            showStatus(`Połączenie poprawne - wczytano ${models.length} modeli.`, 'success');
        } else {
            showStatus('Połączenie poprawne, ale provider nie zwrócił modeli.', 'info');
        }

    } catch (err) {
        // Zachowujemy przyczynę - samo "Błąd sieci" nie odróżnia braku
        // internetu od zablokowanego hosta.
        const { message } = describeNetworkError(err);
        showStatus(message, 'error');
        console.error('[Test Solver] Test klucza - zapytanie nie doszło:', err);
    }
});

// ─── NAWIGACJA ───────────────────────────────────────────────────────────────

document.getElementById('settingsBtn').onclick          = () => showPage('settingsPage');
document.getElementById('aboutBtn').onclick             = () => showPage('aboutPage');
document.getElementById('backFromSettings').onclick     = () => showPage('mainMenu');
document.getElementById('backFromAbout').onclick        = () => showPage('mainMenu');
document.getElementById('aiConfigBtn').onclick          = () => showPage('aiConfigPage');
document.getElementById('solverConfigBtn').onclick      = () => showPage('solverConfigPage');
document.getElementById('backFromAiConfig').onclick     = () => showPage('settingsPage');
document.getElementById('backFromSolverConfig').onclick = () => showPage('settingsPage');

document.getElementById('screenshotBtn').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    const response = await chrome.runtime.sendMessage({ action: 'startScreenshot', tabId: tab.id });
    if (response?.error) {
        console.error('[Test Solver] Błąd zrzutu:', response.error);
    }
});

solverToggle.onchange = async (e) => {
    const isActive = e.target.checked;
    setSolverStatus(isActive);

    const { solverConfig } = await chrome.storage.local.get('solverConfig');
    const saved = solverConfig || {};
    saved.solverActive = isActive;
    await chrome.storage.local.set({ solverConfig: saved });
};

async function saveVisibility(mode) {
    tryb = mode;
    markVisibility(mode);

    const { solverConfig } = await chrome.storage.local.get('solverConfig');
    const saved = solverConfig || {};
    saved.tryb = mode;
    await chrome.storage.local.set({ solverConfig: saved });
}

visibilityDefaultBtn.addEventListener('click',  () => saveVisibility('domyslny'));
visibilityDiscreteBtn.addEventListener('click', () => saveVisibility('dyskretny'));

// ─── START ───────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    // Odczyt ustawień nie może zablokować reszty startu - gdy poleci,
    // użytkownik i tak ma dostać wypełnioną listę modeli, a nie pusty select.
    let saved = null;
    try {
        ({ solverConfig: saved } = await chrome.storage.local.get('solverConfig'));
    } catch (err) {
        console.error('[Test Solver] Nie udało się odczytać ustawień:', err);
    }

    if (saved) {
        if (saved.provider) providerSelect.value = saved.provider;
        if (saved.apiKey)   apiKeyInput.value = saved.apiKey;
        if (saved.solverActive !== undefined) {
            solverToggle.checked = saved.solverActive;
            setSolverStatus(saved.solverActive);
        }
        if (saved.tryb) {
            tryb = saved.tryb;
            markVisibility(tryb);
        }
    }

    await refreshModels(saved?.model);
    await refreshQuotaDisplay().catch(err =>
        console.error('[Test Solver] Nie udało się odczytać zużycia:', err));

    chrome.storage.onChanged?.addListener((changes, area) => {
        if (area === 'local' && changes.usageStats) refreshQuotaDisplay();
    });

    // Zapasowe odświeżanie, gdyby onChanged nie zadziałał.
    setInterval(refreshQuotaDisplay, 3000);
});

// ─── ZUŻYCIE LIMITU ──────────────────────────────────────────────────────────

/** Kolor pierścienia wg zużycia. Lustrzane wobec --success/--warn/--danger w app.css. */
function getProgressColor(percent) {
    if (percent <= 60) return '#2dd4a3';
    if (percent <= 85) return '#f59e0b';
    return '#ff6391';
}

const formatNumber = (n) => Number(n || 0).toLocaleString('pl-PL');

/** Skrócony zapis dla wąskiego badge'a (812 tys. / 1 mln). */
function formatCompact(n) {
    const value = Number(n || 0);
    if (value < 10000) return value.toLocaleString('pl-PL');
    return new Intl.NumberFormat('pl-PL', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

const RING_CIRCUMFERENCE = 2 * Math.PI * 20;

function setRing(circle, percent, color) {
    const clamped = Math.max(0, Math.min(100, percent));
    circle.style.strokeDasharray  = `${RING_CIRCUMFERENCE}`;
    circle.style.strokeDashoffset = `${RING_CIRCUMFERENCE * (1 - clamped / 100)}`;
    circle.style.stroke = color || '';
}

async function refreshQuotaDisplay() {
    const circle     = document.getElementById('apiProgressCircle');
    const textEl     = document.getElementById('apiProgressText');
    const badgeEl    = document.getElementById('quotaCount');
    const infoEl     = document.querySelector('.quota-info');
    const infoTextEl = document.getElementById('quotaInfoText');

    const setInfo = (txt, isWarning) => {
        if (infoTextEl) infoTextEl.textContent = txt;
        if (infoEl) infoEl.classList.toggle('is-warn', Boolean(isWarning));
    };

    const { usageStats: stats } = await chrome.storage.local.get('usageStats');

    if (!stats || !stats.date) {
        setRing(circle, 0, null);
        textEl.textContent = '-';
        textEl.style.color = '';
        badgeEl.textContent = 'Brak danych';
        setInfo('Wykonaj pierwsze zapytanie, aby zobaczyć zużycie.', false);
        return;
    }

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

    if (isGoogle) {
        badgeEl.textContent = `${formatCompact(used)} / ${formatCompact(limit)} tok.`;
        badgeEl.title = `${formatNumber(used)} / ${formatNumber(limit)} tokenów`;
    } else {
        badgeEl.textContent = `${used} / ${limit} req.`;
        badgeEl.title = `${used} z ${limit} zapytań`;
    }

    const label = isGoogle ? 'tokenów' : 'zapytań';
    const modelName = stats.model || '?';
    if (percent >= 90) {
        setInfo(`Zbliżasz się do limitu dziennego! (${modelName})`, true);
    } else {
        setInfo(`Dziś zużyto ${formatNumber(used)} ${label} (${modelName})`, false);
    }
}
