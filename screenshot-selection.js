(function () {
    if (window.__testSolverScreenshotInjected) {
        return;
    }
    window.__testSolverScreenshotInjected = true;

    let isSelecting = false;
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let currentY = 0;
    const overlay = document.createElement('div');
    overlay.id = 'test-solver-screenshot-overlay';
    Object.assign(overlay.style, {
        position: 'fixed',
        top: '0', left: '0',
        width: '100vw', height: '100vh',
        zIndex: '2147483647',
        background: 'rgba(0, 0, 0, 0.25)',
        cursor: 'crosshair',
        display: 'none',
        pointerEvents: 'auto'
    });

    const instructions = document.createElement('div');
    Object.assign(instructions.style, {
        position: 'fixed',
        top: '16px', left: '50%',
        transform: 'translateX(-50%)',
        padding: '9px 18px',
        background: 'rgba(10, 12, 20, 0.94)',
        border: '1px solid rgba(139, 123, 247, 0.3)',
        color: '#f3f4fa',
        borderRadius: '999px',
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSize: '13.5px',
        fontWeight: '600',
        boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
        backdropFilter: 'blur(12px)',
        zIndex: '2147483648',
        letterSpacing: '0.1px',
        display: 'flex',
        alignItems: 'center',
        gap: '9px'
    });

    const selectionBox = document.createElement('div');
    Object.assign(selectionBox.style, {
        position: 'absolute',
        border: '2px solid #8b7bf7',
        background: 'rgba(139, 123, 247, 0.12)',
        boxSizing: 'border-box',
        display: 'none',
        borderRadius: '4px'
    });

    overlay.appendChild(instructions);
    overlay.appendChild(selectionBox);

    // ─── Ikony (inline SVG - bez emotek i bez zewnętrznych zasobów) ─────────
    const svg = (paths, opts = {}) =>
        `<svg viewBox="0 0 24 24" width="${opts.size || 20}" height="${opts.size || 20}" fill="none" ` +
        `stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ` +
        `style="display:block;flex-shrink:0;">${paths}</svg>`;

    const ICONS = {
        check: svg('<circle cx="12" cy="12" r="9"/><path d="m8.5 12.3 2.4 2.4 4.6-5"/>'),
        alert: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7.5V13M12 16.5h.01"/>'),
        bulb:  svg('<path d="M9.5 18h5M10.5 21.5h3"/><path d="M15.2 14.2a5.5 5.5 0 1 0-6.4 0c.7.5 1.1 1.2 1.2 1.8h4c.1-.6.5-1.3 1.2-1.8z"/>'),
        close: svg('<path d="M17 7 7 17M7 7l10 10"/>', { size: 15 }),
        crop:  svg('<path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/>', { size: 16 })
    };

    instructions.innerHTML =
        `<span style="display:flex;color:#8b7bf7;">${ICONS.crop}</span>` +
        `<span>Przeciągnij, aby zaznaczyć pytanie</span>`;

    function showResultPopup(answer, isError) {
        // Usuń ewentualny poprzedni popup
        const old = document.getElementById('test-solver-ai-result-popup');
        if (old) old.remove();

        const popup = document.createElement('div');
        popup.id = 'test-solver-ai-result-popup';

        const isShortAnswer = !isError && answer.match(/^[A-Za-z\s]+$/) && answer.length <= 6;
        const icon = isError ? ICONS.alert : isShortAnswer ? ICONS.check : ICONS.bulb;

        Object.assign(popup.style, {
            position: 'fixed',
            bottom: '28px',
            right: '28px',
            zIndex: '2147483647',
            maxWidth: '340px',
            minWidth: '240px',
            background: 'rgba(10, 12, 20, 0.96)',
            border: `1px solid ${isError ? 'rgba(255,99,145,0.35)' : 'rgba(139,123,247,0.35)'}`,
            borderRadius: '18px',
            boxShadow: `0 16px 40px rgba(0,0,0,0.55), 0 0 0 1px ${isError ? 'rgba(255,99,145,0.08)' : 'rgba(139,123,247,0.08)'}`,
            padding: '18px 20px 16px',
            fontFamily: "'Inter', system-ui, sans-serif",
            backdropFilter: 'blur(20px)',
            animation: 'tsPopupIn 0.28s cubic-bezier(0.34,1.56,0.64,1) both',
            cursor: 'default',
        });

        popup.innerHTML = `
            <style>
                @keyframes tsPopupIn {
                    from { opacity: 0; transform: translateY(16px) scale(0.94); }
                    to   { opacity: 1; transform: translateY(0)   scale(1); }
                }
                #test-solver-ai-result-popup * { box-sizing: border-box; }
            </style>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
                <span style="
                    display:flex;align-items:center;justify-content:center;
                    width:30px;height:30px;border-radius:9px;flex-shrink:0;
                    color:${isError ? '#ff6391' : '#8b7bf7'};
                    background:${isError ? 'rgba(255,99,145,0.12)' : 'rgba(139,123,247,0.14)'};
                    border:1px solid ${isError ? 'rgba(255,99,145,0.28)' : 'rgba(139,123,247,0.3)'};
                ">${icon}</span>
                <span style="font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:${isError ? '#ff6391' : '#8b7bf7'};">
                    ${isError ? 'Błąd AI' : 'Odpowiedź AI'}
                </span>
                <button id="ts-close-popup" style="
                    margin-left:auto;background:rgba(255,255,255,0.06);border:none;
                    color:#9aa1b8;border-radius:8px;width:26px;height:26px;
                    display:flex;align-items:center;justify-content:center;
                    cursor:pointer;line-height:1;flex-shrink:0;
                    transition:background 0.15s,color 0.15s;
                " title="Zamknij">${ICONS.close}</button>
            </div>
            <div style="
                background:rgba(255,255,255,0.04);
                border:1px solid rgba(255,255,255,0.08);
                border-radius:12px;
                padding:14px 16px;
                font-size:${answer.length < 10 ? '28px' : '15px'};
                font-weight:${answer.length < 10 ? '800' : '600'};
                color:${isError ? '#ff6391' : '#f3f4fa'};
                line-height:1.4;
                word-break:break-word;
                letter-spacing:${answer.length < 10 ? '2px' : '0'};
                text-align:${answer.length < 10 ? 'center' : 'left'};
            ">${answer}</div>
            <p style="margin:8px 0 0;font-size:11px;color:#707898;line-height:1.5;">
                ${isError ? 'Spróbuj ponownie lub sprawdź klucz API.' : 'Naciśnij Escape lub kliknij ikonę, aby zamknąć.'}
            </p>
        `;

        document.documentElement.appendChild(popup);

        document.getElementById('ts-close-popup').onclick = () => popup.remove();
        const escHandler = (e) => {
            if (e.key === 'Escape') { popup.remove(); document.removeEventListener('keydown', escHandler); }
        };
        document.addEventListener('keydown', escHandler);
        setTimeout(() => popup?.remove(), 20000);
    }
    function showLoadingPopup() {
        const old = document.getElementById('test-solver-ai-result-popup');
        if (old) old.remove();

        const popup = document.createElement('div');
        popup.id = 'test-solver-ai-result-popup';
        Object.assign(popup.style, {
            position: 'fixed',
            bottom: '28px', right: '28px',
            zIndex: '2147483647',
            background: 'rgba(10,12,20,0.96)',
            border: '1px solid rgba(139,123,247,0.35)',
            borderRadius: '18px',
            boxShadow: '0 16px 40px rgba(0,0,0,0.55)',
            padding: '18px 22px',
            fontFamily: "'Inter', system-ui, sans-serif",
            display: 'flex', alignItems: 'center', gap: '14px',
            backdropFilter: 'blur(20px)',
            animation: 'tsPopupIn 0.22s ease both',
        });
        popup.innerHTML = `
            <style>
                @keyframes tsPopupIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
                @keyframes tsSpin { to { transform: rotate(360deg); } }
            </style>
            <div style="
                width:22px;height:22px;border-radius:50%;flex-shrink:0;
                border:3px solid rgba(139,123,247,0.25);
                border-top-color:#8b7bf7;
                animation:tsSpin 0.8s linear infinite;
            "></div>
            <span style="font-size:14px;font-weight:600;color:#c9bdfb;">Analizuję obrazek...</span>
        `;
        document.documentElement.appendChild(popup);
    }

    chrome.runtime.onMessage.addListener((message) => {
        if (message.action === 'screenshotAiResult') {
            const { result } = message;
            if (result?.error) {
                showResultPopup(result.error, true);
            } else if (result?.answer) {
                showResultPopup(result.answer, false);
            } else {
                showResultPopup('Nieoczekiwana odpowiedź z AI.', true);
            }
        }
    });
    const cleanup = () => {
        overlay.style.display = 'none';
        selectionBox.style.display = 'none';
        isSelecting = false;
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleUp);
        document.removeEventListener('keydown', handleKeyDown);
        overlay.remove();
    };

    const updateSelectionBox = () => {
        const x = Math.min(startX, currentX);
        const y = Math.min(startY, currentY);
        const width  = Math.max(2, Math.abs(currentX - startX));
        const height = Math.max(2, Math.abs(currentY - startY));
        selectionBox.style.display = 'block';
        selectionBox.style.left   = `${x}px`;
        selectionBox.style.top    = `${y}px`;
        selectionBox.style.width  = `${width}px`;
        selectionBox.style.height = `${height}px`;
    };

    function handleMove(event) {
        if (!isSelecting) return;
        currentX = event.clientX;
        currentY = event.clientY;
        updateSelectionBox();
    }

    function handleUp(event) {
        if (!isSelecting) return;
        event.preventDefault();
        event.stopPropagation();

        const x      = Math.min(startX, event.clientX);
        const y      = Math.min(startY, event.clientY);
        const width  = Math.max(2, Math.abs(event.clientX - startX));
        const height = Math.max(2, Math.abs(event.clientY - startY));

        cleanup();
        showLoadingPopup(); 

        chrome.runtime.sendMessage({
            action: 'screenshotSelectionDone',
            rect: { x, y, width, height },
            dpr: window.devicePixelRatio || 1   
        });
    }

    function handleKeyDown(event) {
        if (event.key === 'Escape') {
            cleanup();
            chrome.runtime.sendMessage({ action: 'screenshotSelectionCancelled' });
        }
    }

    function startSelection(event) {
        event.preventDefault();
        event.stopPropagation();
        isSelecting = true;
        startX = event.clientX;
        startY = event.clientY;
        currentX = startX;
        currentY = startY;

        overlay.style.display = 'block';
        selectionBox.style.display = 'block';
        selectionBox.style.left   = `${startX}px`;
        selectionBox.style.top    = `${startY}px`;
        selectionBox.style.width  = '0px';
        selectionBox.style.height = '0px';

        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleUp);
        document.addEventListener('keydown', handleKeyDown);
    }

    function showOverlay() {
        if (!document.documentElement) return;
        document.documentElement.appendChild(overlay);
        overlay.style.display = 'block';
        overlay.addEventListener('mousedown', startSelection);
    }

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'startScreenshotSelection') {
            showOverlay();
            sendResponse({ ok: true });
            return true;
        }
        return false;
    });
})();

