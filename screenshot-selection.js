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
    instructions.textContent = 'Przeciągnij, aby zaznaczyć pytanie';
    Object.assign(instructions.style, {
        position: 'fixed',
        top: '16px', left: '50%',
        transform: 'translateX(-50%)',
        padding: '8px 18px',
        background: 'rgba(17, 24, 39, 0.92)',
        color: '#ffffff',
        borderRadius: '999px',
        fontFamily: "'Inter', Arial, sans-serif",
        fontSize: '14px',
        fontWeight: '600',
        boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
        zIndex: '2147483648',
        letterSpacing: '0.2px'
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
    function showResultPopup(answer, isError) {
        // Usuń ewentualny poprzedni popup
        const old = document.getElementById('test-solver-ai-result-popup');
        if (old) old.remove();

        const popup = document.createElement('div');
        popup.id = 'test-solver-ai-result-popup';

        const isMulti = !isError && answer.match(/^[A-Z](\s[A-Z])+$/);
        const icon = isError ? '❌' : (answer.match(/^[A-Za-z\s]+$/) && answer.length <= 6) ? '✅' : '💡';

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
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
                <span style="font-size:20px;line-height:1;">${icon}</span>
                <span style="font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:${isError ? '#ff6391' : '#8b7bf7'};">
                    ${isError ? 'Błąd AI' : 'Odpowiedź AI'}
                </span>
                <button id="ts-close-popup" style="
                    margin-left:auto;background:rgba(255,255,255,0.07);border:none;
                    color:#9aa1b8;border-radius:8px;width:26px;height:26px;
                    display:flex;align-items:center;justify-content:center;
                    cursor:pointer;font-size:16px;line-height:1;flex-shrink:0;
                    transition:background 0.15s;
                " title="Zamknij">×</button>
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
                ${isError ? 'Spróbuj ponownie lub sprawdź klucz API.' : 'Kliknij × lub Escape, aby zamknąć.'}
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

