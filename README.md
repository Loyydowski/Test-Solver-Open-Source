<<<<<<< HEAD
<div align="center">

# 🧠 Test Solver

### Inteligentna wtyczka Chrome rozwiązująca quizy i testy przy użyciu AI

![Version](https://img.shields.io/badge/wersja-0.6_Alpha-8b7bf7?style=for-the-badge)
![Manifest](https://img.shields.io/badge/Manifest-v3-27ae60?style=for-the-badge)
![License](https://img.shields.io/badge/licencja-Open_Source-ff6391?style=for-the-badge)
![Author](https://img.shields.io/badge/autor-Bartosz_Kuba-f59e0b?style=for-the-badge)

> **Bo komu chce się uczyć?** — Test Solver automatycznie wykrywa pytania i podpowiada poprawne odpowiedzi dzięki AI.

</div>

---

## 📌 Spis treści

- [Opis projektu](#-opis-projektu)
- [Obsługiwane platformy](#-obsługiwane-platformy)
- [Instalacja wtyczki](#-instalacja-wtyczki)
- [Konfiguracja — krok po kroku](#-konfiguracja--krok-po-kroku)
- [Jak działa Test Solver](#-jak-działa-test-solver)
- [Architektura plików](#-architektura-plików)
- [Przepływ danych — szczegółowy diagram](#-przepływ-danych--szczegółowy-diagram)
- [Tryby odpowiedzi](#-tryby-odpowiedzi)
- [Tryb Screenshot](#-tryb-screenshot)
- [System Antycheat](#-system-antycheat)
- [Monitorowanie limitu API](#-monitorowanie-limitu-api)
- [Obsługiwani dostawcy AI](#-obsługiwani-dostawcy-ai)
- [Zabezpieczenia](#-zabezpieczenia)
- [Plany rozwoju](#-plany-rozwoju)
- [Wkład w projekt](#-wkład-w-projekt)
- [Disclaimer](#️-disclaimer)

---

## 📖 Opis projektu

**Test Solver** to otwartoźródłowa wtyczka do przeglądarki Google Chrome, która automatycznie:

1. **Wykrywa** pytania testowe na obsługiwanych platformach quizowych
2. **Analizuje** typ pytania (zamknięte ABCD / otwarte / wielokrotny wybór)
3. **Wysyła** spreparowany prompt do wybranego modelu AI
4. **Wizualizuje** odpowiedź bezpośrednio na stronie — zielone podświetlenie lub hint w inpucie

Wtyczka działa **wyłącznie** na obsługiwanych domenach, dzięki czemu nie marnuje tokenów API na innych stronach.

---

## 🌐 Obsługiwane platformy

| Platforma | Status | Uwagi |
|---|---|---|
| [Testportal.pl](https://testportal.pl) | ✅ Pełna obsługa | Pytania zamknięte + otwarte + antycheat |
| [Testportal.net](https://testportal.net) | ✅ Pełna obsługa | Jak wyżej |
| [Wayground.com](https://wayground.com) | ✅ Obsługiwany | Przyciski opcji + pola tekstowe |
| [Quizizz.com](https://quizizz.com) | ✅ Obsługiwany | Jak Wayground |

---

## 🚀 Instalacja wtyczki

### Wymagania wstępne

- Google Chrome (wersja 90+)
- Konto u jednego z dostawców AI (OpenRouter / Google AI Studio / AgentRouter)
- Klucz API od wybranego dostawcy

---

### Krok 1 — Pobierz kod źródłowy

```bash
git clone https://github.com/TwójNick/test-solver
```

Lub pobierz jako archiwum ZIP z GitHuba i wypakuj w dowolnym miejscu.

---

### Krok 2 — Otwórz menedżer rozszerzeń Chrome

Wejdź w przeglądarkę pod adres:

```
chrome://extensions/
```

---

### Krok 3 — Włącz Tryb deweloperski

W prawym górnym rogu strony `chrome://extensions/` przełącz przełącznik **„Tryb dewelopera"**.

> 📸 **[MIEJSCE NA SCREENSHOT — widok chrome://extensions/ z włączonym trybem dewelopera]**

---

### Krok 4 — Załaduj rozpakowane rozszerzenie

Kliknij przycisk **„Załaduj rozpakowane"** i wskaż folder z projektem (ten, w którym znajduje się `manifest.json`).

> 📸 **[MIEJSCE NA SCREENSHOT — okno wyboru folderu z zaznaczonym projektem]**

---

### Krok 5 — Przypnij wtyczkę do paska

Kliknij ikonę 🧩 (puzzle) obok paska adresu i przypnij **Test Solver** do paska narzędzi Chrome.

> 🎥 **[MIEJSCE NA NAGRANIE — krótki gif/video pokazujący przypinanie i otwieranie popupu wtyczki]**

---

## ⚙️ Konfiguracja — krok po kroku

Po zainstalowaniu wtyczki musisz podać klucz API, aby AI mogło działać.

### Krok 1 — Otwórz popup wtyczki

Kliknij ikonę **Test Solver** w pasku Chrome. Pojawi się główne menu.

> 📸 **[MIEJSCE NA SCREENSHOT — główne menu wtyczki z przyciskami Zrzut ekranu / Ustawienia / O wtyczce]**

---

### Krok 2 — Wejdź w Ustawienia → Konfiguracja AI

```
Główne menu → Ustawienia → Konfiguracja AI
```

---

### Krok 3 — Wybierz dostawcę i wklej klucz API

1. Z listy rozwijanej **„Dostawca usługi"** wybierz jedną z opcji:
   - `OpenRouter` — dostęp do GPT, Claude, Llama i innych
   - `Google AI Studio` — Gemini (rekomendowane, duże darmowe limity)
   - `AgentRouter` — alternatywny gateway AI

2. Wklej swój **klucz API** w pole tekstowe.

3. Wybierz **model** z listy (dla Google AI Studio rekomendowany jest `Gemini 2.5 Flash`).

> 📸 **[MIEJSCE NA SCREENSHOT — ekran Konfiguracja AI z wypełnionymi polami]**

---

### Krok 4 — Przetestuj połączenie

Kliknij przycisk **„Testuj połączenie"**. Wtyczka wyśle testowe zapytanie do API.

- ✅ `Połączenie poprawne!` — wszystko działa
- ❌ `Błąd klucza API` — sprawdź czy klucz jest poprawny i ma aktywne środki

> 📸 **[MIEJSCE NA SCREENSHOT — komunikat o poprawnym połączeniu]**

---

### Krok 5 — Zapisz i włącz solver

1. Kliknij **„Zapisz ustawienia"**
2. Wróć do **Głównego menu** (strzałka ←)
3. Przełącz przełącznik **„Status Solvera"** na `Aktywny`

> 🎥 **[MIEJSCE NA NAGRANIE — włączanie solvera i przechodzenie na stronę quizu]**

---

## 🔧 Jak działa Test Solver

### Ogólny przepływ (uproszczony)

```
Użytkownik otwiera quiz
        ↓
anticheat.js blokuje systemy detekcji (document_start, MAIN world)
        ↓
solver.js wykrywa pytanie przez MutationObserver
        ↓
Buduje prompt i wysyła do background.js przez chrome.runtime.sendMessage
        ↓
background.js wywołuje API wybranego dostawcy AI (OpenRouter / Google / AgentRouter)
        ↓
Odpowiedź wraca do solver.js
        ↓
Wizualizacja: zielone podświetlenie (ABCD) lub hint w inpucie (otwarte)
        ↓
Statystyki użycia zapisywane w chrome.storage
```

---

### Szczegółowy opis każdego etapu

#### 🔵 Etap 1 — Wstrzyknięcie skryptów

W momencie wejścia na obsługiwaną stronę Chrome automatycznie wstrzykuje **dwa skrypty**:

| Skrypt | Czas uruchomienia | Świat | Cel |
|---|---|---|---|
| `anticheat.js` | `document_start` | `MAIN` (kontekst strony) | Blokowanie systemów detekcji PRZED załadowaniem strony |
| `solver.js` | `document_idle` | `ISOLATED` | Główna logika rozwiązywania po załadowaniu DOM |

---

#### 🔵 Etap 2 — AntiCheat (blokowanie systemu oszukiwania)

`anticheat.js` uruchamia się **przed jakimkolwiek kodem strony** i wykonuje 5 operacji:

**1. Blokowanie event listenerów śledzących uwagę użytkownika:**
```js
// Przechwytujemy addEventListener i ignorujemy "podejrzane" eventy
EventTarget.prototype.addEventListener = function(type, listener, options) {
    if (type === 'blur' || type === 'visibilitychange' || type === 'mouseleave' || type === 'focusout') {
        return; // 🛑 Zablokowano
    }
    return originalAddEventListener.call(this, type, listener, options);
};
```

**2. Ukrycie prawdziwego stanu okna przeglądarki:**
```js
// Strona myśli, że zawsze jest aktywna i widoczna
Object.defineProperty(document, 'hidden', { get: () => false });
Object.defineProperty(document, 'visibilityState', { get: () => 'visible' });
```

**3. Zablokowanie właściwości śledzących:**
```js
window.onblur         // → zawsze null
document.onvisibilitychange // → zawsze null  
window.onmouseleave   // → zawsze null
```

**4. Fałszywy obiekt okien dialogowych (popup ostrzeżenia):**
```js
// Testportal próbuje wywołać popup `honestRespondentWarning_popup`
// Zamiast prawdziwego obiektu MDC Dialog, dostaje atrapę
const fakeDialog = {
    open: function() { /* nic nie robi */ },
    close: function() {},
};
window.honestRespondentWarning_popup  // → fakeDialog
window.honestRespondentBlockade_popup // → fakeDialog
```

**5. Fałszywy BlurSpy + usuwanie popupów z DOM przez MutationObserver:**
```js
// Jeśli popup mimo wszystko trafi do DOM — natychmiast go usuwamy
const observer = new MutationObserver((mutations) => {
    // Przy każdej zmianie DOM szukamy popupów ostrzegawczych
    // i natychmiastowo je ukrywamy + usuwamy
});
observer.observe(document.documentElement, { childList: true, subtree: true });
```

---

#### 🔵 Etap 3 — Wykrywanie pytania (`solver.js`)

`solver.js` czeka na załadowanie strony, a następnie uruchamia `MutationObserver`, który reaguje na **każdą zmianę w DOM** (np. przejście do kolejnego pytania):

```js
const questionObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        if (mutation.type === 'childList' || mutation.type === 'characterData') {
            // Jeśli na stronie jest element .question_essence lub .question-text-color
            // → wywołaj solveQuestion()
            solveQuestion();
        }
    }
});
questionObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
```

**Detekcja platformy:**
```js
// Wayground / Quizizz vs Testportal — różne selektory DOM
const isWayground = window.location.hostname.includes("wayground.com") 
                 || window.location.hostname.includes("quizizz.com");

// Testportal:
document.querySelector(".question_essence")
// Wayground:
document.querySelectorAll(".question-text-color")
```

**Zabezpieczenie przed wielokrotnym wywołaniem:**
```js
if (isProcessing) return;                          // Blokada równoległych zapytań
if (now - lastRequestTime < 5000) return;          // Rate limit — min. 5s między zapytaniami
if (newQuestionText === currentQuestionText) return; // Nie pytaj o to samo dwa razy
```

---

#### 🔵 Etap 4 — Budowanie prompta

Solver rozpoznaje typ pytania i buduje odpowiedni prompt:

**A) Pytanie zamknięte (ABCD) — pojedyncza odpowiedź:**

```
Odpowiedz podając TYLKO JEDNĄ LITERĘ poprawnej odpowiedzi (A, B, C lub D).
Zero dodatkowego tekstu.

Pytanie:
[Treść pytania wyodrębniona z .question_essence]

Odpowiedzi:
A: [Treść odpowiedzi A]
B: [Treść odpowiedzi B]
C: [Treść odpowiedzi C]
D: [Treść odpowiedzi D]
```

**B) Pytanie zamknięte — wielokrotny wybór (dwie/trzy odpowiedzi):**

Solver wykrywa słowa kluczowe w treści pytania:
```js
const multiKeywords = /wskaż\s+\w*(dwie?|trzy|cztery|kilka|dwa|wszystkie)\b|.../i;
isMultiAnswer = multiKeywords.test(newQuestionText);
```

```
Odpowiedz podając TYLKO LITERY poprawnych odpowiedzi oddzielone spacją (np: "B C" lub "A D").
Zero dodatkowego tekstu.
```

**C) Pytanie otwarte (pole tekstowe):**

```
Jesteś asystentem odpowiadającym na pytania otwarte.
WAŻNE ZASADY:
- Odpowiedz TYLKO merytoryczną treścią (słowem, liczbą lub krótkim zdaniem)
- ABSOLUTNIE NIE używaj liter A, B, C, D, E, F jako odpowiedzi
- NIE pisz "Odpowiedź:" ani żadnych innych wstępów
- Odpowiedz jak najkrócej

Pytanie: [Treść pytania]
```

---

#### 🔵 Etap 5 — Wywołanie API (`background.js`)

`solver.js` wysyła wiadomość do service workera:

```js
const response = await chrome.runtime.sendMessage({
    action: "solveQuestion",
    prompt: prompt
});
```

`background.js` odczytuje konfigurację z `chrome.storage` i wywołuje odpowiednie API:

```js
const provider = config.provider; // 'openrouter' | 'google' | 'agentrouter'

if (provider === 'openrouter')  result = await fetchOpenRouter(prompt, config.apiKey, config.model);
if (provider === 'google')      result = await fetchGoogleAI(prompt, config.apiKey, config.model);
if (provider === 'agentrouter') result = await fetchAgentRouter(prompt, config.apiKey, config.model);
```

**Parametry zapytania (optymalizacja kosztów):**
```js
{
    max_tokens: 20,    // Maksymalnie 20 tokenów odpowiedzi (wystarczy na jedną literę)
    temperature: 0.1   // Niska temperatura = deterministyczna, pewna odpowiedź
}
```

---

#### 🔵 Etap 6 — Wizualizacja odpowiedzi

**Pytanie zamknięte — Tryb domyślny (zielone podświetlenie):**
```js
targetElement.style.setProperty("color", "#27ae60", "important");
targetElement.style.setProperty("font-weight", "bold", "important");
container.style.setProperty("border-left", "4px solid #27ae60", "important");
```

**Pytanie zamknięte — Tryb dyskretny (niewidoczne dla kamer):**
```js
// Tylko pogrubienie + przyciemnienie — wygląda jak normalny tekst
targetElement.style.setProperty("font-weight", "700", "important");
targetElement.style.setProperty("color", "#111", "important");
targetElement.style.setProperty("letter-spacing", "0.2px", "important");
```

**Pytanie otwarte — podpowiedź w polu:**
```js
openInput.placeholder = `${response.answer}`; // Odpowiedź jako placeholder
openInput.style.borderColor = "#4CAF50";       // Zielona ramka
openInput.title = response.answer;              // Tooltip po najechaniu
```

---

## 🏗️ Architektura plików

```
Test Solver/
│
├── manifest.json          ← Konfiguracja rozszerzenia (MV3)
│                            Uprawnienia, content scripts, background worker
│
├── anticheat.js           ← Wstrzykiwany PRZED stroną (MAIN world)
│                            Blokuje systemy detekcji Testportalu
│
├── solver.js              ← Główna logika rozwiązywania (ISOLATED world)
│                            MutationObserver, budowanie promptów, wizualizacja
│
├── background.js          ← Service Worker Chrome
│                            Wywołania API (OpenRouter/Google/AgentRouter)
│                            Screenshot + kadrowanie obrazu
│                            Śledzenie zużycia tokenów/zapytań
│
├── screenshot-selection.js ← Wstrzykiwany dynamicznie przy kliknięciu "Zrzut ekranu"
│                             Nakładka do zaznaczania obszaru ekranu
│                             Popup z odpowiedzią AI
│
├── app.html               ← Popup wtyczki (UI)
│
├── app.js                 ← Logika popupu: ustawienia, quota display, nawigacja
│
└── app.css                ← Stylowanie popupu (dark mode, glassmorphism)
```

---

## 📊 Przepływ danych — szczegółowy diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    CHROME BROWSER                                │
│                                                                  │
│  ┌──────────────┐      ┌──────────────────────────────────────┐ │
│  │  app.html    │      │     STRONA QUIZU (testportal.pl)     │ │
│  │  (Popup UI)  │      │                                      │ │
│  │              │      │  ┌─────────────┐  ┌──────────────┐  │ │
│  │  app.js      │      │  │ anticheat.js│  │  solver.js   │  │ │
│  │  - Ustawienia│      │  │ MAIN world  │  │ ISOLATED     │  │ │
│  │  - Toggle    │      │  │             │  │              │  │ │
│  │  - Quota     │      │  │ Blokuje:    │  │ 1. Obserwuje │  │ │
│  │  - Screenshot│      │  │ • blur      │  │    DOM       │  │ │
│  └──────┬───────┘      │  │ • visibility│  │ 2. Wyciąga  │  │ │
│         │              │  │ • popupy    │  │    pytanie   │  │ │
│         │ chrome.tabs  │  │ • BlurSpy   │  │ 3. Buduje   │  │ │
│         │ .sendMessage │  └─────────────┘  │    prompt   │  │ │
│         │              │                   └──────┬───────┘  │ │
│         │              └──────────────────────────┼──────────┘ │
│         │                                         │             │
│         │              chrome.runtime.sendMessage  │             │
│         │         ┌───────────────────────────────┘             │
│         ↓         ↓                                             │
│  ┌──────────────────────┐                                       │
│  │    background.js     │                                       │
│  │   (Service Worker)   │                                       │
│  │                      │     ┌──────────────────┐             │
│  │  handleSolveQuestion ├────►│  OpenRouter API  │             │
│  │  handleStartScreenshot     │  Google AI API   │             │
│  │  handleScreenshotSelection │  AgentRouter API │             │
│  │                      │◄────┤  (AI Response)   │             │
│  │  recordUsage()       │     └──────────────────┘             │
│  │  chrome.storage ◄────┘                                       │
│  └──────────────────────┘                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎨 Tryby odpowiedzi

### Tryb Domyślny

Poprawna odpowiedź jest wyraźnie zaznaczona zielonym kolorem z lewym obramowaniem:

```
┌─────────────────────────────────────┐
│  A: Odpowiedź pierwsza              │
│                                     │
│▌ B: Odpowiedź druga  ← AI ✓        │  ← zielona, bold, border-left
│                                     │
│  C: Odpowiedź trzecia               │
│                                     │
│  D: Odpowiedź czwarta               │
└─────────────────────────────────────┘
```

### Tryb Dyskretny

Poprawna odpowiedź wygląda niemal jak pozostałe — tylko minimalnie pogrubiona i ciemniejsza. Trudna do wychwycenia na nagraniu czy kamerze:

```
┌─────────────────────────────────────┐
│  A: Odpowiedź pierwsza              │
│  B: Odpowiedź druga  ← AI ✓        │  ← tylko font-weight: 700 + #111
│  C: Odpowiedź trzecia               │
│  D: Odpowiedź czwarta               │
└─────────────────────────────────────┘
```

**Wybór trybu:** `Ustawienia → Konfiguracja solvera → Domyślnie / Dyskretny`

---

## 📸 Tryb Screenshot

Oprócz automatycznego rozwiązywania, wtyczka oferuje **ręczny tryb zrzutu ekranu** — przydatny dla pytań z obrazkami lub nieobsługiwaną strukturą DOM.

### Jak to działa:

```
1. Kliknij "📸 Zrzut ekranu" w popupie
        ↓
2. Na stronie pojawia się ciemna nakładka z celownikiem
        ↓
3. Przeciągnij myszą, aby zaznaczyć obszar pytania
        ↓
4. background.js przechwytuje widoczny obszar karty (captureVisibleTab)
        ↓
5. OffscreenCanvas przycina zrzut do zaznaczonego obszaru
        ↓
6. Obraz (base64 PNG) wysyłany do AI jako multimodal (vision)
        ↓
7. AI analizuje obrazek i zwraca odpowiedź
        ↓
8. Popup z odpowiedzią pojawia się w prawym dolnym rogu ekranu
```

### Prompt dla trybu screenshot:

```
Jesteś asystentem rozwiązującym zadania i testy. Na załączonym obrazku widoczne
jest pytanie testowe z możliwymi odpowiedziami.
Zwróć TYLKO literę poprawnej odpowiedzi (np. "A", "B", "C", "D") lub krótką
odpowiedź do pytania otwartego.
Jeśli widocznych jest wiele odpowiedzi do zaznaczenia, podaj litery oddzielone
spacją (np. "A C").
Zero dodatkowego tekstu, zero wyjaśnień.
```

> 🎥 **[MIEJSCE NA NAGRANIE — demonstracja trybu screenshot: zaznaczanie obszaru → spinner "Analizuję..." → popup z odpowiedzią]**

---

## 🛡️ System Antycheat

Testportal.pl posiada własny system wykrywania nieuczciwego zachowania. Test Solver go neutralizuje na kilku poziomach:

| Mechanizm ochrony Testportalu | Jak Test Solver to obchodzi |
|---|---|
| Wykrywanie utraty fokusu okna (`blur`) | Blokada `addEventListener` dla `blur`, `visibilitychange`, `focusout`, `mouseleave` |
| Sprawdzanie `document.hidden` | Zawsze zwraca `false` (strona "zawsze widoczna") |
| Sprawdzanie `document.visibilityState` | Zawsze zwraca `'visible'` |
| Popup `honestRespondentWarning_popup` | Fałszywy obiekt dialogu — `.open()` nic nie robi |
| Popup `honestRespondentBlockade_popup` | Jw. + MutationObserver usuwa go z DOM natychmiast |
| System `BlurSpy` | Fałszywa klasa — `start()` nic nie robi, `getBlursCount()` → 0 |

> ⚠️ Wszystkie blokady uruchamiane są w `MAIN world` przy `document_start` — zanim Testportal zdąży zarejestrować swoje eventy.

---

## 📈 Monitorowanie limitu API

Test Solver automatycznie śledzi zużycie API i wyświetla je w popupie jako **okrągły pasek postępu**.

### Limity dzienne (free tier):

| Model | Dzienny limit |
|---|---|
| `gemini-2.5-flash` (Google) | 1 000 000 tokenów |
| `gemini-1.5-pro` (Google) | 500 000 tokenów |
| `gemini-1.5-flash` (Google) | 1 500 000 tokenów |
| OpenRouter / AgentRouter | 200 zapytań |

### Kolorowanie progresu:

```
 0 – 60% → 🟢 Zielony  (#2dd4a3)  — bezpieczna strefa
61 – 85% → 🟡 Żółty   (#f59e0b)  — uważaj
86 – 100% → 🔴 Czerwony (#ff6391) — bliski limitu
```

Statystyki są resetowane każdego dnia o północy.

---

## 🤖 Obsługiwani dostawcy AI

### OpenRouter

Agregator APIs — jeden klucz daje dostęp do wielu modeli.

| Model | Typ |
|---|---|
| `google/gemini-2.0-flash-exp:free` | Darmowy ✅ |
| `openai/gpt-4o-mini` | Płatny |
| `anthropic/claude-3.5-sonnet` | Płatny |
| `meta-llama/llama-3.1-8b-instruct:free` | Darmowy ✅ |

🔗 Klucz API: [openrouter.ai/keys](https://openrouter.ai/keys)

---

### Google AI Studio (Gemini) — ⭐ Rekomendowany

Bezpośredni dostęp do modeli Gemini z bardzo hojnymi darmowymi limitami.

| Model | Rekomendacja |
|---|---|
| `gemini-2.5-flash` | ⭐ Najlepszy wybór |
| `gemini-1.5-pro` | Zaawansowany |
| `gemini-1.5-flash` | Szybki |

🔗 Klucz API: [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)

---

### AgentRouter

Alternatywny gateway z dostępem do najnowszych modeli.

| Model | ID |
|---|---|
| Claude Opus 4.6 | `claude-opus-4-6` |
| GPT 5.5 | `gpt-5.5` |
| GLM 5.2 | `glm-5.2` |

---

## 🔒 Zabezpieczenia

| Zabezpieczenie | Opis |
|---|---|
| **Whitelist domen** | Skrypty wstrzykiwane TYLKO na obsługiwanych domenach (manifest.json `matches`) |
| **Flaga `isProcessing`** | Blokada równoległych zapytań — nie wyśle dwóch promptów naraz |
| **Rate limit 5s** | Minimalna przerwa 5 sekund między zapytaniami (ochrona przed HTTP 429) |
| **Cache pytania** | Jeśli bieżące pytanie == poprzednie → nie wysyłaj ponownie |
| **MutationObserver** | Reaguje tylko na realną zmianę DOM, nie polluje co sekundę |
| **`max_tokens: 20`** | Odpowiedź AI maksymalnie 20 tokenów — eliminuje zbędne koszty |
| **`temperature: 0.1`** | Deterministyczna odpowiedź, minimalne "halucynacje" |
| **Klucz w `chrome.storage`** | API key przechowywany lokalnie, nie w kodzie źródłowym |

---

## 🗺️ Plany rozwoju

- [x] Automatyczne rozwiązywanie pytań zamkniętych (ABCD)
- [x] Obsługa pytań otwartych (pole tekstowe)
- [x] Obsługa pytań wielokrotnego wyboru
- [x] Konfiguracja dostawcy AI i modelu z poziomu popupu
- [x] Tryb dyskretny (niewidoczne podświetlenie)
- [x] Tryb Screenshot (analiza obrazu przez AI vision)
- [x] Monitorowanie limitu API (quota circle)
- [x] System AntiCheat (blokowanie popup-ów Testportalu)
- [x] Wsparcie dla Wayground i Quizizz
- [ ] Obsługa pytań z obrazkami w trybie automatycznym
- [ ] Pełna neutralizacja systemu BlurSpy (głębsza analiza źródła)
- [ ] Wsparcie dla Kahoot
- [ ] Historia rozwiązanych pytań
- [ ] Tryb offline (lokalny LLM przez Ollama)
- [ ] Automatyczne wyklikiwanie odpowiedzi (nie tylko podświetlenie)
- [ ] Publikacja w Chrome Web Store

---

## 🤝 Wkład w projekt

Projekt jest otwartoźródłowy — Pull Requesty i Issues mile widziane!

```bash
# 1. Sklonuj repozytorium
git clone https://github.com/TwójNick/test-solver
cd test-solver

# 2. Załaduj jako rozpakowane rozszerzenie w Chrome
# chrome://extensions/ → Tryb dewelopera → Załaduj rozpakowane

# 3. Wprowadź zmiany i odśwież rozszerzenie w chrome://extensions/
```

**Jak zgłosić błąd:**
- Sprawdź konsolę Chrome (F12 → Console) — szukaj logów `[Test Solver]`
- Otwórz Issue na GitHubie z opisem błędu, URL strony i logiem z konsoli

---

## ⚠️ Disclaimer

> Projekt stworzony **wyłącznie w celach edukacyjnych** i badawczych — jako demonstracja możliwości Chrome Extension API (content scripts, service workers, MV3), komunikacji między skryptami przez `chrome.runtime.sendMessage`, oraz integracji z zewnętrznymi API (OpenRouter, Google Generative AI).
>
> Autor nie ponosi odpowiedzialności za sposób wykorzystania wtyczki.

---

<div align="center">

**Test Solver** • v0.6 Alpha • Open Source

Made with ❤️ by **Bartosz Kuba**

⭐ Zostaw gwiazdkę na GitHubie — to nic nie kosztuje, a sprawia wielką radość!

</div>
=======
Soon
>>>>>>> 586e1f2845dda97351fd717fa869c29f439ae6da
