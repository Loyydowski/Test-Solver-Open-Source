// Test Solver - service worker
//
// Wspólne mapowanie błędów HTTP (ApiError, describeHttpError, toErrorPayload).
importScripts('api-errors.js');

// ─── REJESTR PROVIDERÓW ──────────────────────────────────────────────────────
//
// Wcześniej było pięć funkcji fetch* - fetchOpenRouter i fetchAgentRouter były
// identyczne co do znaku poza adresem, a wersje "Image" powielały budowanie
// URL-a, safetySettings i parsowanie odpowiedzi. Teraz każdy provider to jeden
// obiekt opisujący różnice, a cała reszta jest wspólna w callProvider().

const SAFETY_SETTINGS = [
    { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
];

// Deterministycznie - wyciągamy literę odpowiedzi, nie piszemy eseju.
const TEMPERATURE = 0.1;

/**
 * Fabryka dla providerów zgodnych z API OpenAI (OpenRouter, AgentRouter).
 * Różni ich wyłącznie host.
 */
function openAiCompatible(label, host) {
    return {
        label,
        modelsUrl: () => `${host}/models`,
        headers: (apiKey) => ({
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        }),
        chatUrl: () => `${host}/chat/completions`,
        body: (prompt, { model, base64Image, maxTokens }) => ({
            model,
            messages: [{
                role: 'user',
                content: base64Image
                    ? [
                        { type: 'text', text: prompt },
                        { type: 'image_url', image_url: { url: `data:image/png;base64,${base64Image}` } }
                    ]
                    : prompt
            }],
            max_tokens: maxTokens,
            temperature: TEMPERATURE
        }),
        parse: (json) => {
            const text = json.choices?.[0]?.message?.content;
            if (typeof text !== 'string') {
                return { error: `${label}: odpowiedź bez treści.` };
            }
            return { answer: text.trim(), tokens: json.usage?.total_tokens || 0 };
        }
    };
}

const PROVIDERS = {
    openrouter: openAiCompatible('OpenRouter', 'https://openrouter.ai/api/v1'),
    agentrouter: openAiCompatible('AgentRouter', 'https://agentrouter.org/v1'),

    google: {
        label: 'Google AI Studio',
        // Klucz Google idzie w query stringu, nie w nagłówku.
        modelsUrl: (apiKey) =>
            `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
        headers: () => ({ 'Content-Type': 'application/json' }),
        chatUrl: (apiKey, model) =>
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent` +
            `?key=${encodeURIComponent(apiKey)}`,
        body: (prompt, { base64Image, maxTokens }) => ({
            contents: [{
                parts: base64Image
                    ? [{ text: prompt }, { inlineData: { mimeType: 'image/png', data: base64Image } }]
                    : [{ text: prompt }]
            }],
            generationConfig: {
                maxOutputTokens: maxTokens,
                temperature: TEMPERATURE,
                // Zero "myślenia" - pytamy o jedną literę, nie o rozumowanie.
                thinkingConfig: { thinkingBudget: 0 }
            },
            safetySettings: SAFETY_SETTINGS
        }),
        parse: (json) => {
            const tokens = json.usageMetadata?.totalTokenCount || 0;
            const candidate = json.candidates?.[0];
            const text = candidate?.content?.parts?.[0]?.text;
            if (typeof text !== 'string') {
                return { error: `Google AI: brak odpowiedzi (${candidate?.finishReason || 'nieznany powód'}).` };
            }
            return { answer: text.trim(), tokens };
        }
    }
};

/**
 * Jedno wejście do każdego providera - tekst i obraz idą tą samą ścieżką.
 *
 * @param {object} config  solverConfig z chrome.storage
 * @param {string} prompt
 * @param {{base64Image?: string, maxTokens?: number}} [opts]
 * @returns {Promise<{answer: string, tokens: number}|{error: string}>}
 * @throws {ApiError} gdy provider odpowiedział błędem HTTP
 */
async function callProvider(config, prompt, opts = {}) {
    const providerId = config.provider || 'openrouter';
    const provider = PROVIDERS[providerId];
    if (!provider) {
        return { error: `Nieznany dostawca AI: ${providerId}` };
    }

    const { base64Image = null, maxTokens = base64Image ? 50 : 300 } = opts;
    const url = provider.chatUrl(config.apiKey, config.model);

    const response = await fetch(url, {
        method: 'POST',
        headers: provider.headers(config.apiKey),
        body: JSON.stringify(provider.body(prompt, { model: config.model, base64Image, maxTokens }))
    });

    if (!response.ok) {
        // Treść odpowiedzi jest potrzebna, żeby odróżnić 429 "zwolnij"
        // od 429 "skończyły się środki".
        const bodyText = await response.text().catch(() => '');
        throw new ApiError(response.status, provider.label, bodyText);
    }

    return provider.parse(await response.json());
}

/**
 * callProvider + zapis zużycia + jednolity kształt błędu.
 * To jest funkcja, której używają oba wejścia (tekst i screenshot).
 */
async function solve(prompt, opts = {}) {
    const { solverConfig: config } = await chrome.storage.local.get('solverConfig');

    if (!config || !config.apiKey || !config.model) {
        return { error: 'Brak konfiguracji. Uzupełnij klucz API w ustawieniach wtyczki.', kind: 'config' };
    }

    try {
        const result = await callProvider(config, prompt, opts);
        if (result.error) return result;

        await recordUsage(config.provider || 'openrouter', config.model, result.tokens || 0)
            .catch(err => console.error('[Test Solver BG] Nie zapisano zużycia:', err));

        return { answer: result.answer };
    } catch (err) {
        console.error('[Test Solver BG] Błąd zapytania:', err);
        return toErrorPayload(err);
    }
}

// ─── OBSŁUGA WIADOMOŚCI ──────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'solveQuestion') {
        solve(request.prompt).then(sendResponse);
        return true;
    }

    if (request.action === 'startScreenshot') {
        handleStartScreenshot(request.tabId).then(sendResponse);
        return true;
    }

    if (request.action === 'screenshotSelectionDone') {
        const tabId = sender.tab?.id;
        handleScreenshotSelection(request.rect, request.dpr || 1, tabId)
            .then(result => {
                sendResponse({ ok: true });
                if (tabId) {
                    chrome.tabs.sendMessage(tabId, { action: 'screenshotAiResult', result })
                        .catch(() => { /* karta zamknięta w międzyczasie */ });
                }
            });
        return true;
    }

    if (request.action === 'screenshotSelectionCancelled') {
        sendResponse({ ok: true });
        return true;
    }
});

async function handleStartScreenshot(tabId) {
    try {
        if (!tabId) {
            return { error: 'Brak aktywnej karty.' };
        }

        await chrome.scripting.executeScript({
            target: { tabId },
            files: ['screenshot-selection.js']
        });

        await chrome.tabs.sendMessage(tabId, { action: 'startScreenshotSelection' });
        return { ok: true };
    } catch (error) {
        console.error('[Test Solver BG] Błąd uruchamiania zrzutu:', error);
        return { error: error.message || 'Nie udało się uruchomić zaznaczania obszaru.' };
    }
}

const SCREENSHOT_PROMPT = `Jesteś asystentem rozwiązującym zadania i testy. Na załączonym obrazku widoczne jest pytanie testowe z możliwymi odpowiedziami.
Zwróć TYLKO literę poprawnej odpowiedzi (np. "A", "B", "C", "D") lub krótką odpowiedź do pytania otwartego.
Jeśli widocznych jest wiele odpowiedzi do zaznaczenia, podaj litery oddzielone spacją (np. "A C").
Zero dodatkowego tekstu, zero wyjaśnień.`;

async function handleScreenshotSelection(rect, dpr, tabId) {
    try {
        if (!tabId) {
            return { error: 'Nie znaleziono aktywnej karty.' };
        }

        // captureVisibleTab wymaga windowId, nie tabId.
        const tab = await chrome.tabs.get(tabId);
        const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
            format: 'png',
            quality: 100
        });

        const base64Image = await cropToBase64(dataUrl, rect, dpr);
        return await solve(SCREENSHOT_PROMPT, { base64Image });

    } catch (error) {
        console.error('[Test Solver BG] Błąd tworzenia zrzutu:', error);
        return toErrorPayload(error);
    }
}

/**
 * Kadruje pełny zrzut karty do zaznaczonego prostokąta i zwraca base64 PNG.
 * DPR: na ekranach Retina fizyczne piksele = CSS px * devicePixelRatio.
 */
async function cropToBase64(dataUrl, rect, dpr) {
    const px = (n) => Math.round(n * dpr);
    const cropX = px(Math.max(0, rect?.x || 0));
    const cropY = px(Math.max(0, rect?.y || 0));

    const fullBitmap = await createImageBitmap(await fetch(dataUrl).then(r => r.blob()));

    const safeWidth  = Math.min(px(Math.max(1, rect?.width  || 1)), fullBitmap.width  - cropX);
    const safeHeight = Math.min(px(Math.max(1, rect?.height || 1)), fullBitmap.height - cropY);

    const canvas = new OffscreenCanvas(safeWidth, safeHeight);
    canvas.getContext('2d')
        .drawImage(fullBitmap, cropX, cropY, safeWidth, safeHeight, 0, 0, safeWidth, safeHeight);

    const blob = await canvas.convertToBlob({ type: 'image/png' });
    const uint8 = new Uint8Array(await blob.arrayBuffer());

    // btoa() na dużych obrazach przepełnia stos przy String.fromCharCode(...tab),
    // więc idziemy porcjami.
    let binary = '';
    const CHUNK = 0x8000;
    for (let i = 0; i < uint8.length; i += CHUNK) {
        binary += String.fromCharCode.apply(null, uint8.subarray(i, i + CHUNK));
    }

    console.log(`[Test Solver BG] Zrzut wykadrowany (${safeWidth}x${safeHeight}px).`);
    return btoa(binary);
}

// ─── ŚLEDZENIE ZUŻYCIA ───────────────────────────────────────────────────────

/**
 * Limity dzienne. Google rozlicza tokeny, routery - liczbę zapytań.
 */
const MODEL_LIMITS = {
    'gemini-2.5-flash': 1_000_000,
    'gemini-1.5-pro':     500_000,
    'gemini-1.5-flash': 1_500_000,
    '__requests__':           200
};

async function recordUsage(provider, model, tokens) {
    const today = new Date().toISOString().slice(0, 10);
    const stored = await chrome.storage.local.get('usageStats');
    let stats = stored.usageStats || {};

    if (stats.date !== today) {
        stats = { date: today, tokens: 0, requests: 0 };
    }

    stats.tokens   = (stats.tokens   || 0) + tokens;
    stats.requests = (stats.requests || 0) + 1;
    stats.model    = model;
    stats.provider = provider;

    const isGoogle = provider === 'google';
    const limit = isGoogle
        ? (MODEL_LIMITS[model] || MODEL_LIMITS['gemini-2.5-flash'])
        : MODEL_LIMITS['__requests__'];
    const used = isGoogle ? stats.tokens : stats.requests;

    stats.limit   = limit;
    stats.used    = used;
    stats.percent = Math.min(100, Math.round((used / limit) * 100));

    await chrome.storage.local.set({ usageStats: stats });
    console.log(`[Test Solver BG] Zużycie: ${used}/${limit} (${stats.percent}%)`);
}
