/**
 * Wspólne mapowanie błędów HTTP na komunikaty dla użytkownika.
 *
 * Ładowany w dwóch kontekstach:
 *  - popup:     <script src="api-errors.js"> w app.html (przed app.js)
 *  - service worker: importScripts('api-errors.js') w background.js
 *
 * Dzięki temu "401" znaczy to samo w oknie testu klucza i w tle.
 */

/** Błąd HTTP z zachowanym statusem i treścią odpowiedzi providera. */
class ApiError extends Error {
    constructor(status, provider, bodyText) {
        const described = describeHttpError(status, bodyText);
        super(described.message);
        this.name = 'ApiError';
        this.status = status;
        this.provider = provider;
        this.kind = described.kind;
        this.bodyText = bodyText || '';
    }
}

/**
 * Zamienia status HTTP (i opcjonalnie treść błędu) na rodzaj + komunikat PL.
 *
 * kind:
 *   auth        - klucz nieprawidłowy, cofnięty lub bez uprawnień
 *   rate-limit  - za dużo zapytań w krótkim czasie (przejściowe)
 *   quota       - wyczerpany limit/środki na koncie (nie minie samo)
 *   bad-request - zły model lub zły kształt zapytania
 *   server      - awaria po stronie providera
 *   network     - zapytanie nie doszło
 *   unknown     - reszta
 *
 * @param {number} status  kod HTTP
 * @param {string} [bodyText]  surowa treść odpowiedzi (do rozróżnienia 429)
 * @returns {{kind: string, message: string}}
 */
/** Providerzy, którzy zgłaszają zły klucz statusem innym niż 401. */
const BAD_KEY_MARKERS =
    /api[ _-]?key[ _-]?(not[ _-]?valid|invalid)|invalid[ _-]?api[ _-]?key|api_key_invalid|missing authentication|unauthorized/;

function describeHttpError(status, bodyText) {
    const body = (bodyText || '').toLowerCase();

    // Google AI Studio na zły klucz odpowiada 400 INVALID_ARGUMENT, nie 401.
    // Bez tego trafiało to do gałęzi "złe zapytanie" i użytkownik szukał
    // problemu w modelu zamiast w kluczu.
    if (BAD_KEY_MARKERS.test(body)) {
        return {
            kind: 'auth',
            message: 'Klucz API odrzucony - sprawdź, czy jest poprawny i aktywny.'
        };
    }

    if (status === 401 || status === 403) {
        return {
            kind: 'auth',
            message: 'Klucz API odrzucony - sprawdź, czy jest poprawny i aktywny.'
        };
    }

    if (status === 429) {
        // 429 ma dwa różne znaczenia i różne rozwiązania: przeczekać
        // albo doładować konto. Rozróżniamy po treści odpowiedzi.
        const isQuota = /quota|credit|balance|insufficient|exceeded your current/.test(body);
        return isQuota
            ? {
                kind: 'quota',
                message: 'Wyczerpany limit na koncie providera - to nie minie samo.'
            }
            : {
                kind: 'rate-limit',
                message: 'Za dużo zapytań naraz - odczekaj chwilę i spróbuj ponownie.'
            };
    }

    if (status === 400 || status === 404 || status === 422) {
        const badModel = /model/.test(body);
        return {
            kind: 'bad-request',
            message: badModel
                ? 'Provider nie zna tego modelu - wybierz inny z listy.'
                : `Zapytanie odrzucone przez providera (HTTP ${status}).`
        };
    }

    if (status === 402) {
        return {
            kind: 'quota',
            message: 'Brak środków na koncie providera.'
        };
    }

    if (status >= 500) {
        return {
            kind: 'server',
            message: `Awaria po stronie providera (HTTP ${status}) - spróbuj później.`
        };
    }

    return {
        kind: 'unknown',
        message: `Nieoczekiwana odpowiedź providera (HTTP ${status}).`
    };
}

/**
 * Opisuje błąd, który wywrócił samo fetch() - czyli zapytanie nie doszło.
 * Rozdzielone od describeHttpError, bo tu nie ma żadnego statusu.
 *
 * @param {Error} err
 * @returns {{kind: string, message: string}}
 */
function describeNetworkError(err) {
    const msg = (err && err.message) || '';
    return {
        kind: 'network',
        // Zachowujemy oryginalną treść - "Błąd sieci" bez przyczyny
        // nie pozwala odróżnić braku internetu od blokady CORS.
        message: `Brak połączenia z providerem (${msg || 'nieznana przyczyna'}).`
    };
}

/**
 * Sprowadza dowolny wyjątek do kształtu, którego spodziewają się odbiorcy:
 * `error` jest polem kanonicznym (sprawdzają je solver.js i
 * screenshot-selection.js), `kind` i `status` są dodatkiem do diagnostyki.
 */
function toErrorPayload(err) {
    if (err instanceof ApiError) {
        return { error: err.message, kind: err.kind, status: err.status };
    }
    const described = describeNetworkError(err);
    return { error: described.message, kind: described.kind, status: 0 };
}

// Service worker (importScripts) i popup (<script>) dzielą globalny scope,
// więc nic nie eksportujemy - klasy i funkcje są już widoczne.
