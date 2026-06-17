# 🧠 Test Solver — Google Chrome Extension

> Inteligentna wtyczka do Chrome rozwiązująca quizy na platformie **Testportal.pl** przy użyciu AI.

---

## 📌 Spis treści

- [Opis projektu](#opis-projektu)
- [Jak działa wtyczka](#jak-działa-wtyczka)
- [Struktura DOM Testportalu](#struktura-dom-testportalu)
- [Obsługiwane typy pytań](#obsługiwane-typy-pytań)
- [Prompt AI](#prompt-ai)
- [Zabezpieczenia](#zabezpieczenia)
- [Antycheat — Testportal Warning](#antycheat--testportal-warning)
- [Plany rozwoju](#plany-rozwoju)
- [Wkład w projekt](#wkład-w-projekt)

---

## 📖 Opis projektu

**Test Solver** to otwartoźródłowa wtyczka do przeglądarki Google Chrome, która automatycznie wykrywa pytania quizowe na platformie [Testportal.pl](https://www.testportal.pl) i przy pomocy modelu AI podpowiada poprawne odpowiedzi.

Wtyczka działa **wyłącznie** na stronach Testportalu (wykrywanych przez URL za pomocą wyrażeń regularnych), dzięki czemu nie przepala tokenów API na nieistotnych stronach.

---

## ⚙️ Jak działa wtyczka

```
1. Wtyczka sprawdza URL strony (regex na "testportal")
2. Jeśli URL pasuje → analizuje DOM strony quizu
3. Wyciąga treść pytania oraz odpowiedzi
4. Wysyła zapytanie do API modelu AI
5. Otrzymaną odpowiedź wizualizuje na stronie (zielone podświetlenie)
```

### 🔗 Przykładowy URL quizu

```
https://www.testportal.pl/exam/DoTestQuestion.html
```

### 🔍 Wykrywanie strony — regex

```js
const isTestportal = /testportal\.pl/.test(window.location.href);
if (!isTestportal) return; // Nie rób nic poza testportalem
```

---

## 🏗️ Struktura DOM Testportalu

### 📝 Treść pytania

```html
<div class="question_essence">
    <p>Treść pytania...</p>
</div>
```

```js
const questionText = document.querySelector(".question_essence p").innerText;
```

---

### 🔘 Odpowiedzi (pytania zamknięte ABCD)

Każda odpowiedź znajduje się w następującej strukturze:

```html
<div class="question_answers">
    <div class="answer_container">
        <label>
            <div class="answer_body">
                <p>Treść odpowiedzi A</p>
            </div>
        </label>
    </div>
    <!-- kolejne answer_container... -->
</div>
```

```js
const answers = document.querySelectorAll(".question_answers .answer_container label");
const answerTexts = [];

answers.forEach((answer, index) => {
    const label = String.fromCharCode(65 + index); // A, B, C, D...
    answerTexts.push(`${label}: ${answer.innerText.trim()}`);
});
```

---

### ✏️ Odpowiedzi (pytania otwarte)

Pytania otwarte posiadają pole input do wpisania odpowiedzi:

```html
<div class="question_answers">
    <input id="shortAnswerBody_XXXXXXXXX_1" type="text" />
</div>
```

> ⚠️ ID inputa zawiera zmienne cyfry — selektor oparty jest o **prefiks** `shortAnswerBody`

```js
const openInput = document.querySelector("[id^='shortAnswerBody']");
```

---

## 📋 Obsługiwane typy pytań

| Typ pytania | Sposób detekcji | Sposób odpowiedzi |
|---|---|---|
| Zamknięte (ABCD) | `.answer_container` w `.question_answers` | Podświetlenie poprawnej odpowiedzi na 🟢 zielono |
| Otwarte | Input `[id^='shortAnswerBody']` | Wpisanie podpowiedzi jako `placeholder` / `hint` |

---

## 🤖 Prompt AI

### Pytanie zamknięte (ABCD)

```
Jesteś quizowym AI które rozwiązuje quizy.
Odpowiedz na pytanie, podając TYLKO literę poprawnej odpowiedzi (A/B/C/D).

Pytanie:
{{TreśćPytania}}

Odpowiedzi:
A: {{OdpowiedźA}}
B: {{OdpowiedźB}}
C: {{OdpowiedźC}}
D: {{OdpowiedźD}}

Odpowiedz wyłącznie jedną literą, np: B
```

### Pytanie otwarte

```
Jesteś quizowym AI które rozwiązuje pytania otwarte.
Odpowiedz krótko i zwięźle na pytanie:

{{TreśćPytania}}
```

---

### 🎨 Wizualizacja odpowiedzi

**Pytanie zamknięte** — podświetlenie poprawnej odpowiedzi:

```js
answers.forEach((answer, index) => {
    const label = String.fromCharCode(65 + index);
    if (label === aiResponse.trim()) {
        answer.style.backgroundColor = "#4CAF50";
        answer.style.color = "white";
        answer.style.borderRadius = "6px";
    }
});
```

**Pytanie otwarte** — hint w inpucie:

```js
openInput.placeholder = `💡 Podpowiedź AI: ${aiResponse}`;
openInput.style.borderColor = "#4CAF50";
```

---

## 🛡️ Zabezpieczenia

> ⚠️ Kluczowe — bez tego wtyczka może przepalić dziesiątki tysięcy tokenów!

| Zabezpieczenie | Opis |
|---|---|
| **Regex na URL** | Zapytania wysyłane TYLKO na stronach testportal.pl |
| **Debounce / flaga `isProcessing`** | Blokada wysyłania wielu zapytań naraz |
| **Cache odpowiedzi** | Jeśli pytanie było już zadane — odpowiedź z cache, nie z API |
| **Limit znaków pytania** | Obcinanie zbyt długich pytań przed wysłaniem do API |
| **Obserwator DOM (MutationObserver)** | Reaguje tylko na zmianę pytania, nie odpytuje co sekundę |

```js
let isProcessing = false;

async function solveQuestion() {
    if (isProcessing) return; // 🛑 Blokada
    isProcessing = true;

    try {
        // ... logika AI
    } finally {
        isProcessing = false; // ✅ Odblokowanie po zakończeniu
    }
}
```

---

## 🚨 Antycheat — Testportal Warning

Testportal wyświetla ostrzeżenie o nieuczciwym odpowiadaniu w postaci popupu:

```html
<div id="honestRespondentWarning_popup">
    <div id="honestRespondentWarning_popup_box">
        <!-- treść ostrzeżenia -->
    </div>
</div>
```

### 🔎 Plan obsługi

- [ ] Znalezienie funkcji JS wywołującej popup (analiza źródła strony)
- [ ] Przechwycenie eventu triggerującego `honestRespondentWarning_popup`
- [ ] Neutralizacja popupu lub symulacja naturalnego zachowania użytkownika

```js
// Tymczasowe ukrycie popupu (rozwiązanie robocze)
const warningPopup = document.getElementById("honestRespondentWarning_popup");
if (warningPopup) {
    warningPopup.style.display = "none";
}
```

> 🔬 **TODO:** Zbadać oryginalną funkcję Testportalu odpowiadającą za wyświetlanie popupu i znaleźć sposób na jej neutralizację bez ingerencji w pozostałe funkcje strony.

---

## 🗺️ Plany rozwoju

- [x] Podstawowe wykrywanie pytań zamkniętych
- [x] Podstawowe wykrywanie pytań otwartych
- [ ] Integracja z API (OpenAI / lokalne LLM)
- [ ] System cache'owania odpowiedzi
- [ ] Panel konfiguracyjny (popup wtyczki)
- [ ] Obsługa pytań z obrazkami
- [ ] Neutralizacja systemu antycheat Testportalu
- [ ] Wsparcie dla innych platform quizowych

---

## 🤝 Wkład w projekt

Projekt jest otwartoźródłowy — PR-y i Issues mile widziane!

```bash
git clone https://github.com/TwójNick/test-solver
cd test-solver
# Załaduj jako rozpakowane rozszerzenie w chrome://extensions/
```

---

## ⚠️ Disclaimer

> Projekt stworzony **wyłącznie w celach edukacyjnych** i badania struktury DOM aplikacji webowych.  
> Autor nie ponosi odpowiedzialności za sposób wykorzystania wtyczki.

---

<div align="center">

**Test Solver** • Open Source • Made for learning 🎓

</div>