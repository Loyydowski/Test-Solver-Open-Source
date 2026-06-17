const models = {
    openrouter: [
        { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash (Free)' },
        { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
        { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
        { id: 'meta-llama/llama-3.1-8b-instruct:free', name: 'Llama 3.1 8B (Free)' }
    ],
    google: [
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' }
    ]
};

const pages = ['mainMenu', 'settingsPage', 'aboutPage'];
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

document.getElementById('saveSettingsBtn').addEventListener('click', () => {
    const config = {
        provider: providerSelect.value,
        apiKey: apiKeyInput.value,
        model: modelSelect.value
    };
    localStorage.setItem('solverConfig', JSON.stringify(config));
    showStatus('Zapisano pomyślnie!', 'success');
});

document.getElementById('testApiBtn').addEventListener('click', async () => {
    const key = apiKeyInput.value;
    const provider = providerSelect.value;
    const msg = document.getElementById('statusMsg');
    
    msg.textContent = 'Łączenie...';
    
    let url = provider === 'openrouter' 
        ? 'https://openrouter.ai/api/v1/models' 
        : `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

    try {
        const headers = provider === 'openrouter' ? { 'Authorization': `Bearer ${key}` } : {};
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

document.addEventListener('DOMContentLoaded', () => {
    updateModelList();
    const saved = JSON.parse(localStorage.getItem('solverConfig'));
    if (saved) {
        providerSelect.value = saved.provider;
        updateModelList();
        modelSelect.value = saved.model;
        apiKeyInput.value = saved.apiKey;
    }
});

document.getElementById('settingsBtn').onclick = () => showPage('settingsPage');
document.getElementById('aboutBtn').onclick = () => showPage('aboutPage');
document.getElementById('backFromSettings').onclick = () => showPage('mainMenu');
document.getElementById('backFromAbout').onclick = () => showPage('mainMenu');

solverToggle.onchange = (e) => {
    statusText.textContent = e.target.checked ? 'Aktywny' : 'Nieaktywny';
    statusText.className = e.target.checked ? 'status-on' : 'status-off';
};