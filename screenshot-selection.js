(function () {
    if (window.__testSolverScreenshotInjected) {
        return;
    }
    window.__testSolverScreenshotInjected = true;

    // ─── PALETA ──────────────────────────────────────────────────────────────
    //
    // Ten skrypt jest wstrzykiwany na cudzą stronę, więc nie ma dostępu do
    // app.css ani do jego zmiennych - paleta musi tu istnieć osobno.
    // Chodzi o to, żeby istniała RAZ: wcześniej te same barwy były rozpisane
    // w ~30 miejscach, w dwóch różnych zapisach (rgba(10, 12, 20, 0.94)
    // i rgba(10,12,20,0.96)), więc zmiana akcentu wymagała przeszukania pliku.
    //
    // Odpowiedniki w app.css: --accent, --danger, --text-main, --text-faint.
    // Przy zmianie barwy trzeba ruszyć oba pliki - bez kroku budowania nie da
    // się tego uwspólnić.
    const T = {
        accent:    '139, 123, 247',   // --accent  #8b7bf7
        danger:    '255, 99, 145',    // --danger  #ff6391
        surface:   '10, 12, 20',      // tło popupu (ciemniejsze niż --surface,
                                      // bo leży na nieznanym tle strony)
        white:     '255, 255, 255',
        black:     '0, 0, 0',
        text:      '#f3f4fa',
        textMuted: '#9aa1b8',
        textFaint: '#707898',
        accentSoft:'#c9bdfb'
    };

    const rgba = (triplet, alpha) => `rgba(${triplet}, ${alpha})`;
    const accent = (a) => rgba(T.accent, a);
    const danger = (a) => rgba(T.danger, a);
    /** Kolor akcentu albo błędu - wybór powtarza się w każdym popupie. */
    const tone = (isError, a) => (isError ? danger(a) : accent(a));
    const toneSolid = (isError) => (isError ? `rgb(${T.danger})` : `rgb(${T.accent})`);

    const FONT = "'Inter', system-ui, sans-serif";
    const POPUP_ID = 'test-solver-ai-result-popup';

    // ─── STAN ZAZNACZANIA ────────────────────────────────────────────────────

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
        background: rgba(T.black, 0.25),
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
        background: rgba(T.surface, 0.94),
        border: `1px solid ${accent(0.3)}`,
        color: T.text,
        borderRadius: '999px',
        fontFamily: FONT,
        fontSize: '13.5px',
        fontWeight: '600',
        boxShadow: `0 10px 30px ${rgba(T.black, 0.45)}`,
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
        border: `2px solid rgb(${T.accent})`,
        background: accent(0.12),
        boxSizing: 'border-box',
        display: 'none',
        borderRadius: '4px'
    });

    overlay.appendChild(instructions);
    overlay.appendChild(selectionBox);

    // ─── IKONY (inline SVG, bez zewnętrznych zasobów) ────────────────────────

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
        `<span style="display:flex;color:rgb(${T.accent});">${ICONS.crop}</span>` +
        `<span>Przeciągnij, aby zaznaczyć pytanie</span>`;

    // ─── POPUPY WYNIKU ───────────────────────────────────────────────────────

    /** Wspólna skorupa obu popupów - różnią się tylko zawartością. */
    function createPopupShell(isError) {
        document.getElementById(POPUP_ID)?.remove();

        const popup = document.createElement('div');
        popup.id = POPUP_ID;
        Object.assign(popup.style, {
            position: 'fixed',
            bottom: '28px',
            right: '28px',
            zIndex: '2147483647',
            background: rgba(T.surface, 0.96),
            border: `1px solid ${tone(isError, 0.35)}`,
            borderRadius: '18px',
            boxShadow: `0 16px 40px ${rgba(T.black, 0.55)}`,
            fontFamily: FONT,
            backdropFilter: 'blur(20px)'
        });
        return popup;
    }

    function showResultPopup(answer, isError) {
        const popup = createPopupShell(isError);
        const isShortAnswer = !isError && /^[A-Za-z\s]+$/.test(answer) && answer.length <= 6;
        const icon = isError ? ICONS.alert : isShortAnswer ? ICONS.check : ICONS.bulb;
        const isBig = answer.length < 10;

        Object.assign(popup.style, {
            maxWidth: '340px',
            minWidth: '240px',
            padding: '18px 20px 16px',
            animation: 'tsPopupIn 0.28s cubic-bezier(0.22, 1, 0.36, 1) both',
            cursor: 'default'
        });

        popup.innerHTML = `
            <style>
                @keyframes tsPopupIn {
                    from { opacity: 0; transform: translateY(16px) scale(0.96); }
                    to   { opacity: 1; transform: translateY(0)    scale(1); }
                }
                #${POPUP_ID} * { box-sizing: border-box; }
                #ts-close-popup:hover {
                    background: ${rgba(T.white, 0.12)} !important;
                    color: ${T.text} !important;
                }
            </style>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
                <span style="
                    display:flex;align-items:center;justify-content:center;
                    width:30px;height:30px;border-radius:9px;flex-shrink:0;
                    color:${toneSolid(isError)};
                    background:${tone(isError, 0.14)};
                    border:1px solid ${tone(isError, 0.3)};
                ">${icon}</span>
                <span style="
                    font-size:11px;font-weight:700;letter-spacing:0.8px;
                    text-transform:uppercase;color:${toneSolid(isError)};
                ">${isError ? 'Błąd AI' : 'Odpowiedź AI'}</span>
                <button id="ts-close-popup" style="
                    margin-left:auto;background:${rgba(T.white, 0.06)};border:none;
                    color:${T.textMuted};border-radius:8px;width:26px;height:26px;
                    display:flex;align-items:center;justify-content:center;
                    cursor:pointer;line-height:1;flex-shrink:0;
                    transition:background 150ms ease, color 150ms ease;
                " title="Zamknij">${ICONS.close}</button>
            </div>
            <div style="
                background:${rgba(T.white, 0.04)};
                border:1px solid ${rgba(T.white, 0.08)};
                border-radius:12px;
                padding:14px 16px;
                font-size:${isBig ? '28px' : '15px'};
                font-weight:${isBig ? '800' : '600'};
                color:${isError ? toneSolid(true) : T.text};
                line-height:1.4;
                word-break:break-word;
                letter-spacing:${isBig ? '2px' : '0'};
                text-align:${isBig ? 'center' : 'left'};
            "></div>
            <p style="margin:8px 0 0;font-size:11px;color:${T.textFaint};line-height:1.5;">
                ${isError ? 'Sprawdź komunikat powyżej i ustawienia klucza.' : 'Naciśnij Escape lub kliknij ikonę, aby zamknąć.'}
            </p>
        `;

        // textContent zamiast wklejania do innerHTML - odpowiedź AI i treść
        // błędu providera trafiają tu jako zwykły tekst, a nie jako HTML.
        popup.querySelector('div[style*="word-break"]').textContent = answer;

        document.documentElement.appendChild(popup);

        const close = () => {
            popup.remove();
            document.removeEventListener('keydown', escHandler);
        };
        const escHandler = (e) => { if (e.key === 'Escape') close(); };

        popup.querySelector('#ts-close-popup').onclick = close;
        document.addEventListener('keydown', escHandler);
        setTimeout(close, 20000);
    }

    function showLoadingPopup() {
        const popup = createPopupShell(false);
        Object.assign(popup.style, {
            padding: '18px 22px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            animation: 'tsPopupIn 0.22s cubic-bezier(0.22, 1, 0.36, 1) both'
        });
        popup.innerHTML = `
            <style>
                @keyframes tsPopupIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
                @keyframes tsSpin { to { transform: rotate(360deg); } }
            </style>
            <div style="
                width:22px;height:22px;border-radius:50%;flex-shrink:0;
                border:3px solid ${accent(0.25)};
                border-top-color:rgb(${T.accent});
                animation:tsSpin 0.8s linear infinite;
            "></div>
            <span style="font-size:14px;font-weight:600;color:${T.accentSoft};">Analizuję obrazek...</span>
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

    // ─── ZAZNACZANIE OBSZARU ─────────────────────────────────────────────────

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
        selectionBox.style.display = 'block';
        selectionBox.style.left   = `${Math.min(startX, currentX)}px`;
        selectionBox.style.top    = `${Math.min(startY, currentY)}px`;
        selectionBox.style.width  = `${Math.max(2, Math.abs(currentX - startX))}px`;
        selectionBox.style.height = `${Math.max(2, Math.abs(currentY - startY))}px`;
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

        const rect = {
            x:      Math.min(startX, event.clientX),
            y:      Math.min(startY, event.clientY),
            width:  Math.max(2, Math.abs(event.clientX - startX)),
            height: Math.max(2, Math.abs(event.clientY - startY))
        };

        cleanup();
        showLoadingPopup();

        chrome.runtime.sendMessage({
            action: 'screenshotSelectionDone',
            rect,
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
        startX = currentX = event.clientX;
        startY = currentY = event.clientY;

        overlay.style.display = 'block';
        updateSelectionBox();

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
