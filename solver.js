// AI SOLVER - logika rozwiązywania testów
// Świat 'ISOLATED' - pełny dostęp do chrome.storage i chrome.runtime.

console.log('[Test Solver] Inicjalizacja AI Solvera (ISOLATED world)...');

// ─── ADAPTERY STRON ──────────────────────────────────────────────────────────
//
// Wcześniej `isWayground ? ... : ...` powtarzało się w pięciu miejscach wewnątrz
// solveQuestion() - przy pytaniu, przy odpowiedziach, przy polu otwartym, przy
// odczycie tekstu i przy podświetleniu. Każda nowa strona oznaczała piąte
// rozgałęzienie. Teraz różnice są w jednym obiekcie, a solveQuestion() nie wie,
// na jakiej stronie działa.

/** Zielony dla trafionej odpowiedzi - jeden, nie dwa różne jak wcześniej. */
const HIT_COLOR = '#27ae60';

const SITES = [
    {
        id: 'wayground',
        matches: (host) => host.includes('wayground.com') || host.includes('quizizz.com'),
        questionNodes: () => document.querySelectorAll('.question-text-color'),
        answerNodes:   () => document.querySelectorAll("button.option, button[role='option']"),
        openInput:     () => document.querySelector("input.fib-text-input, input[data-cy='fib-text-input']"),
        answerLabel:   (container) => container.querySelector('#optionText') || container,
        markContainer: (container, color) => {
            container.style.setProperty('border', `4px solid ${color}`, 'important');
        }
    },
    {
        id: 'testportal',
        matches: () => true, // domyślny - manifest wpuszcza nas tylko na znane hosty
        questionNodes: () => document.querySelectorAll('.question_essence'),
        answerNodes:   () => document.querySelectorAll('.question_answers .answer_container').length
            ? document.querySelectorAll('.question_answers .answer_container')
            : document.querySelectorAll('.answer_container'),
        // Pole otwarte ma priorytet: jeśli istnieje, to pytanie nie jest ABCD.
        openInput:     () => document.querySelector(".question_answers input[id^='shortAnswerBody']")
            || document.querySelector("input[id^='shortAnswerBody']"),
        answerLabel:   (container) => container.querySelector('.answer_body p')
            || container.querySelector('.answer_body')
            || container.querySelector('label')
            || container,
        markContainer: (container, color) => {
            container.style.setProperty('border-left', `4px solid ${color}`, 'important');
            container.style.setProperty('padding-left', '5px', 'important');
        }
    }
];

const site = SITES.find(s => s.matches(window.location.hostname));

// ─── STAN ────────────────────────────────────────────────────────────────────

let tryb = 'domyslny';
let isProcessing = false;
let solvedQuestionText = '';
let lastRequestTime = 0;

// Jeden próg zamiast dwóch rozjeżdżonych (było: 5s na zapytania, 3s na blokadę).
const MIN_REQUEST_INTERVAL_MS = 5000;

// ─── KOMUNIKATY ──────────────────────────────────────────────────────────────

/**
 * Nieblokujący komunikat w rogu strony.
 *
 * Wcześniej był tu alert(), który zatrzymuje całą stronę do kliknięcia OK -
 * w trybie dyskretnym to sprzeczność sama w sobie, a przy teście z licznikiem
 * czasu blokuje odpowiadanie.
 */
function toast(text, isError) {
    const id = 'test-solver-toast';
    document.getElementById(id)?.remove();

    const el = document.createElement('div');
    el.id = id;
    el.textContent = text;
    Object.assign(el.style, {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: '2147483647',
        maxWidth: '320px',
        padding: '12px 16px',
        borderRadius: '12px',
        background: 'rgba(10, 12, 20, 0.96)',
        border: `1px solid ${isError ? 'rgba(255,99,145,0.35)' : 'rgba(139,123,247,0.35)'}`,
        color: isError ? '#ff6391' : '#f3f4fa',
        font: "500 13px/1.45 'Inter', system-ui, sans-serif",
        boxShadow: '0 16px 40px rgba(0,0,0,0.55)',
        pointerEvents: 'none'
    });
    document.documentElement.appendChild(el);
    setTimeout(() => el.remove(), 6000);
}

// ─── GŁÓWNA LOGIKA ───────────────────────────────────────────────────────────

function readQuestionText() {
    const nodes = site.questionNodes();
    if (!nodes.length) return '';
    return Array.from(nodes)
        .map(el => el.innerText.trim())
        .filter(Boolean)
        .join('\n');
}

/** Wykrywa polecenia typu "wskaż dwie poprawne odpowiedzi". */
const MULTI_ANSWER_RE =
    /(wskaż|zaznacz|wybierz)\s+\w*(dwie?|trzy|cztery|kilka|dwa|wszystkie)\b|(dwie?|trzy|cztery|kilka)\s+\w*odpowiedzi/i;

function buildPrompt(questionText, answerContainers, hasOpenInput) {
    if (hasOpenInput) {
        return `Jesteś asystentem odpowiadającym na pytania otwarte.
WAŻNE ZASADY:
- Odpowiedz TYLKO merytoryczną treścią (słowem, liczbą lub krótkim zdaniem)
- ABSOLUTNIE NIE używaj liter A, B, C, D, E, F jako odpowiedzi
- NIE pisz "Odpowiedź:" ani żadnych innych wstępów
- Odpowiedz jak najkrócej

Pytanie: ${questionText}`;
    }

    const answersText = Array.from(answerContainers)
        .map((container, i) => `${String.fromCharCode(65 + i)}: ${site.answerLabel(container).innerText.trim()}`)
        .join('\n');

    const instruction = MULTI_ANSWER_RE.test(questionText)
        ? 'Odpowiedz podając TYLKO LITERY poprawnych odpowiedzi oddzielone spacją (np: "B C" lub "A D"). Zero dodatkowego tekstu.'
        : 'Odpowiedz podając TYLKO JEDNĄ LITERĘ poprawnej odpowiedzi (A, B, C lub D). Zero dodatkowego tekstu.';

    return `${instruction}\nPytanie:\n${questionText}\nOdpowiedzi:\n${answersText}`;
}

function highlightAnswer(container) {
    const target = site.answerLabel(container);

    if (tryb === 'dyskretny') {
        // Bez zmiany koloru - odpowiedź ma wyglądać jak zwykły tekst,
        // tylko nieco grubsza i ciemniejsza od sąsiednich opcji.
        target.style.setProperty('font-weight', '700', 'important');
        target.style.setProperty('color', '#111', 'important');
        target.style.setProperty('letter-spacing', '0.2px', 'important');
        return;
    }

    target.style.setProperty('color', HIT_COLOR, 'important');
    target.style.setProperty('font-weight', 'bold', 'important');
    site.markContainer(container, HIT_COLOR);
}

function applyAnswer(answer, answerContainers, openInput) {
    if (openInput) {
        openInput.placeholder = answer;
        openInput.title = answer;
        openInput.style.borderColor = HIT_COLOR;
        openInput.style.borderWidth = '2px';
        return;
    }

    // Obsługuje "B", "BC", "B C", "B, C".
    const letters = answer.toUpperCase().match(/[A-Z]/g) || [];
    letters.forEach(letter => {
        const index = letter.charCodeAt(0) - 65;
        if (index >= 0 && index < answerContainers.length) {
            highlightAnswer(answerContainers[index]);
            console.log('[Test Solver] Zaznaczono odpowiedź:', letter);
        }
    });
}

async function solveQuestion() {
    if (isProcessing) return;
    if (Date.now() - lastRequestTime < MIN_REQUEST_INTERVAL_MS) return;

    const { solverConfig: config } = await chrome.storage.local.get('solverConfig');
    if (!config || config.solverActive !== true) return;
    if (config.tryb) tryb = config.tryb;

    const questionText = readQuestionText();
    if (!questionText || questionText === solvedQuestionText) return;

    const openInput = site.openInput();
    const answerContainers = openInput ? [] : site.answerNodes();
    if (!openInput && answerContainers.length === 0) return;

    isProcessing = true;
    lastRequestTime = Date.now();

    try {
        const prompt = buildPrompt(questionText, answerContainers, Boolean(openInput));
        console.log('[Test Solver] Wysyłam prompt:\n', prompt);

        const response = await chrome.runtime.sendMessage({ action: 'solveQuestion', prompt });

        if (response?.error) {
            // solvedQuestionText celowo NIE jest ustawiane przy błędzie.
            // Wcześniej było ustawiane przed zapytaniem, więc jedna nieudana
            // próba trwale wykluczała to pytanie - obserwator widział je już
            // jako "rozwiązane" i nigdy nie ponawiał.
            console.error('[Test Solver] Błąd API:', response.error);
            toast(`Test Solver: ${response.error}`, true);
            return;
        }

        if (response?.answer) {
            console.log('[Test Solver] Odpowiedź AI:', response.answer);
            solvedQuestionText = questionText;
            applyAnswer(response.answer.trim(), answerContainers, openInput);
        }

    } catch (err) {
        console.error('[Test Solver] Błąd krytyczny:', err);
        toast(`Test Solver: ${err.message}`, true);
    } finally {
        isProcessing = false;
    }
}

// ─── OBSERWATOR ──────────────────────────────────────────────────────────────

// MutationObserver potrafi odpalić się setki razy na sekundę przy animacjach
// strony. Bez tego każda mutacja robiła await chrome.storage.local.get().
let debounceTimer = null;
const scheduleSolve = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(solveQuestion, 300);
};

const questionObserver = new MutationObserver(() => {
    if (site.questionNodes().length) scheduleSolve();
});

const startQuestionObserver = () => {
    if (!document.body) {
        setTimeout(startQuestionObserver, 50);
        return;
    }
    questionObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
    console.log('[Test Solver] Solver MutationObserver aktywny.');
    setTimeout(solveQuestion, 1500);
};

startQuestionObserver();
