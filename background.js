chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "solveQuestion") {
        handleSolveQuestion(request.prompt).then(sendResponse);
        return true;
    }

    if (request.action === "startScreenshot") {
        handleStartScreenshot(request.tabId).then(sendResponse);
        return true;
    }

    if (request.action === "screenshotSelectionDone") {
        // Przekazujemy tabId z sender, żeby później odesłać wynik do tej samej karty
        handleScreenshotSelection(request.rect, request.dpr || 1, sender.tab?.id)
            .then(result => {
                sendResponse({ ok: true });
                // Odeślij wynik AI do content script w tej samej karcie
                if (sender.tab?.id) {
                    chrome.tabs.sendMessage(sender.tab.id, {
                        action: 'screenshotAiResult',
                        result
                    });
                }
            });
        return true;
    }

    if (request.action === "screenshotSelectionCancelled") {
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

async function handleScreenshotSelection(rect, dpr, tabId) {
    try {
        if (!tabId) {
            return { error: 'Nie znaleziono aktywnej karty.' };
        }

        // POPRAWKA: captureVisibleTab wymaga windowId, nie tabId
        const tab = await chrome.tabs.get(tabId);
        const windowId = tab.windowId;

        // Przechwytujemy cały widoczny obszar karty (rect NIE jest wspierany przez API)
        const dataUrl = await chrome.tabs.captureVisibleTab(windowId, {
            format: 'png',
            quality: 100
        });

        // Kadrujemy do zaznaczonego obszaru przez OffscreenCanvas
        // DPR (Device Pixel Ratio) np. 2 na ekranach Retina — fizyczne px = CSS px * DPR
        const px = (n) => Math.round(n * dpr);
        const cropX      = px(Math.max(0, rect?.x      || 0));
        const cropY      = px(Math.max(0, rect?.y      || 0));
        const cropWidth  = px(Math.max(1, rect?.width  || 1));
        const cropHeight = px(Math.max(1, rect?.height || 1));

        // Załaduj pełny screenshot jako ImageBitmap
        const fullBlob   = await fetch(dataUrl).then(r => r.blob());
        const fullBitmap = await createImageBitmap(fullBlob);

        // Przytnij do zaznaczonego obszaru
        const safeWidth  = Math.min(cropWidth,  fullBitmap.width  - cropX);
        const safeHeight = Math.min(cropHeight, fullBitmap.height - cropY);
        const canvas = new OffscreenCanvas(safeWidth, safeHeight);
        const ctx    = canvas.getContext('2d');
        ctx.drawImage(fullBitmap, cropX, cropY, safeWidth, safeHeight, 0, 0, safeWidth, safeHeight);

        const croppedBlob = await canvas.convertToBlob({ type: 'image/png' });

        // Konwertuj Blob na base64
        const arrayBuffer = await croppedBlob.arrayBuffer();
        const uint8 = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
        const base64Image = btoa(binary);

        console.log(`[Test Solver BG] Screenshot wykadrowany (${safeWidth}x${safeHeight}px), wysyłam do AI...`);
        return await solveWithImage(base64Image);

    } catch (error) {
        console.error('[Test Solver BG] Błąd tworzenia zrzutu:', error);
        return { error: error.message || 'Nie udało się wykonać zrzutu ekranu.' };
    }
}

/**
 * Wysyła base64 screenshot do wybranego providera AI i zwraca odpowiedź.
 * @param {string} base64Image - obraz PNG w base64 (bez prefiksu data:)
 */
async function solveWithImage(base64Image) {
    const data = await chrome.storage.local.get('solverConfig');
    const config = data.solverConfig;

    if (!config || !config.apiKey || !config.model) {
        return { error: 'Brak konfiguracji. Uzupełnij klucz API w ustawieniach.' };
    }

    const provider = config.provider || 'openrouter';
    const prompt = `Jesteś asystentem rozwiązującym zadania i testy. Na załączonym obrazku widoczne jest pytanie testowe z możliwymi odpowiedziami.
Zwróć TYLKO literę poprawnej odpowiedzi (np. "A", "B", "C", "D") lub krótką odpowiedź do pytania otwartego.
Jeśli widocznych jest wiele odpowiedzi do zaznaczenia, podaj litery oddzielone spacją (np. "A C").
Zero dodatkowego tekstu, zero wyjaśnień.`;

    let result;
    try {
        if (provider === 'google') {
            result = await fetchGoogleAIImage(prompt, base64Image, config.apiKey, config.model);
        } else if (provider === 'openrouter') {
            result = await fetchOpenRouterImage(prompt, base64Image, config.apiKey, config.model, 'https://openrouter.ai/api/v1/chat/completions');
        } else if (provider === 'agentrouter') {
            result = await fetchOpenRouterImage(prompt, base64Image, config.apiKey, config.model, 'https://agentrouter.org/v1/chat/completions');
        } else {
            return { error: 'Nieznany dostawca AI' };
        }

        if (!result.error) {
            const tokens = (typeof result._tokens === 'number') ? result._tokens : 0;
            await recordUsage(provider, config.model, tokens);
            delete result._tokens;
        }

        return result;
    } catch (e) {
        console.error('[Test Solver BG] Błąd solveWithImage:', e);
        return { error: e.message };
    }
}

/** Gemini multimodal – inlineData base64 */
async function fetchGoogleAIImage(prompt, base64Image, apiKey, model) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{
                parts: [
                    { text: prompt },
                    { inlineData: { mimeType: 'image/png', data: base64Image } }
                ]
            }],
            generationConfig: { maxOutputTokens: 100, temperature: 0.1 },
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT",        threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH",       threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
            ]
        })
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Google AI Image error ${response.status}: ${errText}`);
    }

    const json = await response.json();
    const totalTokens = json.usageMetadata?.totalTokenCount || 0;
    const candidate = json.candidates?.[0];
    if (candidate?.content?.parts?.[0]?.text) {
        return { answer: candidate.content.parts[0].text.trim(), _tokens: totalTokens };
    }
    return { error: `Google AI: brak odpowiedzi (${candidate?.finishReason || 'unknown'})` };
}

/** OpenRouter / AgentRouter multimodal – image_url base64 */
async function fetchOpenRouterImage(prompt, base64Image, apiKey, model, endpoint) {
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model,
            messages: [{
                role: 'user',
                content: [
                    { type: 'text',      text: prompt },
                    { type: 'image_url', image_url: { url: `data:image/png;base64,${base64Image}` } }
                ]
            }],
            max_tokens: 50,
            temperature: 0.1
        })
    });

    if (!response.ok) {
        throw new Error(`${endpoint} image error ${response.status}`);
    }

    const json = await response.json();
    const totalTokens = json.usage?.total_tokens || 0;
    return { answer: json.choices[0].message.content.trim(), _tokens: totalTokens };
}

// ─── QUOTA / USAGE TRACKING ─────────────────────────────────────────────────

/**
 * Limity dzienne dla poszczególnych modeli (tokeny/dzień dla free tier).
 * Dla OpenRouter/AgentRouter śledzimy liczbę zapytań (req/dzień).
 */
const MODEL_LIMITS = {
    // Google AI Studio – tokeny/dzień (free tier)
    'gemini-2.5-flash':  1_000_000,
    'gemini-1.5-pro':      500_000,
    'gemini-1.5-flash':  1_500_000,
    // OpenRouter / AgentRouter – zapytania/dzień (szacowany free limit)
    '__requests__':           200
};

/**
 * Pobiera i aktualizuje statystyki użycia zapisane w chrome.storage.
 * @param {string} provider  - 'google' | 'openrouter' | 'agentrouter'
 * @param {string} model     - id modelu
 * @param {number} tokens    - liczba tokenów (0 dla req-based providerów)
 */
async function recordUsage(provider, model, tokens) {
    const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
    const stored = await chrome.storage.local.get('usageStats');
    let stats = stored.usageStats || {};

    // Reset przy nowym dniu
    if (stats.date !== today) {
        stats = { date: today, tokens: 0, requests: 0, model, provider };
    }

    stats.tokens   = (stats.tokens   || 0) + tokens;
    stats.requests = (stats.requests || 0) + 1;
    stats.model    = model;
    stats.provider = provider;

    // Wyznacz limit i procent zużycia
    const isGoogleProvider = provider === 'google';
    const limit = isGoogleProvider
        ? (MODEL_LIMITS[model] || MODEL_LIMITS['gemini-2.5-flash'])
        : MODEL_LIMITS['__requests__'];
    const used  = isGoogleProvider ? stats.tokens : stats.requests;

    stats.limit   = limit;
    stats.used    = used;
    stats.percent = Math.min(100, Math.round((used / limit) * 100));

    await chrome.storage.local.set({ usageStats: stats });
    console.log(`[Test Solver BG] Użycie: ${used}/${limit} (${stats.percent}%)`);
}

// ─────────────────────────────────────────────────────────────────────────────

async function handleSolveQuestion(prompt) {
    try {
        const data = await chrome.storage.local.get('solverConfig');
        const config = data.solverConfig;

        if (!config || !config.apiKey || !config.model) {
            return { error: 'Brak konfiguracji. Uzupełnij klucz API w ustawieniach wtyczki.' };
        }

        console.log("[Test Solver BG] Wysyłam prompt:", prompt);

        const provider = config.provider || 'openrouter';
        let result;

        if (provider === 'openrouter') {
            result = await fetchOpenRouter(prompt, config.apiKey, config.model);
        } else if (provider === 'agentrouter') {
            result = await fetchAgentRouter(prompt, config.apiKey, config.model);
        } else if (provider === 'google') {
            result = await fetchGoogleAI(prompt, config.apiKey, config.model);
        } else {
            return { error: 'Nieznany dostawca AI' };
        }

        // Zapisz zużycie tylko gdy zapytanie się udało
        if (!result.error) {
            const tokens = (typeof result._tokens === 'number') ? result._tokens : 0;
            console.log(`[Test Solver BG] recordUsage: provider=${provider}, model=${config.model}, tokens=${tokens}`);
            try {
                await recordUsage(provider, config.model, tokens);
                console.log('[Test Solver BG] recordUsage: zapisano pomyślnie!');
            } catch (storageErr) {
                console.error('[Test Solver BG] recordUsage: błąd zapisu!', storageErr);
            }
            delete result._tokens;
        } else {
            console.warn('[Test Solver BG] Nie zapisuję użycia — result.error:', result.error);
        }

        return result;

    } catch (e) {
        console.error("[Test Solver Background] Błąd:", e);
        return { error: 'Błąd sieci lub API: ' + e.message };
    }
}

async function fetchOpenRouter(prompt, apiKey, model) {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 20,
            temperature: 0.1
        })
    });

    if (!response.ok) {
        throw new Error(`OpenRouter HTTP error! status: ${response.status}`);
    }

    const json = await response.json();
    // OpenRouter używa zliczania zapytań – tokeny jako 0 (liczymy req w recordUsage)
    const totalTokens = json.usage?.total_tokens || 0;
    return { answer: json.choices[0].message.content.trim(), _tokens: totalTokens };
}

async function fetchAgentRouter(prompt, apiKey, model) {
    const response = await fetch('https://agentrouter.org/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 20,
            temperature: 0.1
        })
    });

    if (!response.ok) {
        throw new Error(`AgentRouter HTTP error! status: ${response.status}`);
    }

    const json = await response.json();
    const totalTokens = json.usage?.total_tokens || 0;
    return { answer: json.choices[0].message.content.trim(), _tokens: totalTokens };
}

async function fetchGoogleAI(prompt, apiKey, model) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                maxOutputTokens: 300,
                temperature: 1,
                thinkingConfig: {
                    thinkingBudget: 0
                }
            },
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
            ]
        })
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Google AI HTTP error! status: ${response.status}, body: ${errText}`);
    }

    const json = await response.json();
    const rawDebug = JSON.stringify(json, null, 2);
    console.log("[Test Solver BG] Surowa odpowiedź Google AI:", rawDebug);

    // Odczytaj zużycie tokenów z usageMetadata
    const totalTokens = json.usageMetadata?.totalTokenCount || 0;
    console.log(`[Test Solver BG] Tokeny użyte: prompt=${json.usageMetadata?.promptTokenCount}, output=${json.usageMetadata?.candidatesTokenCount}, total=${totalTokens}`);
    
    if (json.candidates && json.candidates.length > 0) {
        const candidate = json.candidates[0];
        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
            const text = candidate.content.parts[0].text.trim();
            console.log("[Test Solver BG] Odpowiedź wyodrębniona:", text);
            return { answer: text, debug: rawDebug, _tokens: totalTokens };
        }
        return { error: `Odpowiedź zablokowana. finishReason: ${candidate.finishReason}`, debug: rawDebug };
    }
    
    return { error: `Nieoczekiwany format: ${rawDebug}`, debug: rawDebug };
}
