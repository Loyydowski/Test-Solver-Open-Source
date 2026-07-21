<div align="center">

# 🧠 Test Solver

### Intelligent Chrome extension for solving quizzes and tests using AI

![Version](https://img.shields.io/badge/version-0.6_Alpha-8b7bf7?style=for-the-badge)
![Manifest](https://img.shields.io/badge/Manifest-v3-27ae60?style=for-the-badge)
![License](https://img.shields.io/badge/license-Open_Source-ff6391?style=for-the-badge)
![Author](https://img.shields.io/badge/author-Bartosz_Kuba-f59e0b?style=for-the-badge)

> **Because who wants to study?** - Test Solver automatically detects questions and suggests correct answers using AI.

</div>

---

## 📌 Table of Contents

- [Project Description](#-project-description)
- [Supported Platforms](#-supported-platforms)
- [Extension Installation](#-extension-installation)
- [Step-by-Step Configuration](#-step-by-step-configuration)
- [How Test Solver Works](#-how-test-solver-works)
- [File Architecture](#-file-architecture)
- [Data Flow - Detailed Diagram](#-data-flow---detailed-diagram)
- [Answer Modes](#-answer-modes)
- [Screenshot Mode](#-screenshot-mode)
- [Anticheat System](#-anticheat-system)
- [API Quota Monitoring](#-api-quota-monitoring)
- [Supported AI Providers](#-supported-ai-providers)
- [Security Features](#-security-features)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [Disclaimer](#️-disclaimer)

---

## 📖 Project Description

**Test Solver** is an open-source extension for the Google Chrome browser that automatically:

1. **Detects** quiz questions on supported testing platforms
2. **Analyzes** the question type (multiple choice ABCD / open-ended / multiple select)
3. **Sends** a tailored prompt to the selected AI model
4. **Visualizes** the answer directly on the webpage - green highlighting or inline input hints

The extension operates **strictly** on supported domains, ensuring no API tokens are wasted on other websites.

---

## 🌐 Supported Platforms

| Platform | Status | Notes |
|---|---|---|
| [Testportal.pl](https://testportal.pl) | ✅ Full Support | Multiple choice + open-ended + anticheat bypass |
| [Testportal.net](https://testportal.net) | ✅ Full Support | Same as above |
| [Wayground.com](https://wayground.com) | ✅ Supported | Option buttons + text fields |
| [Quizizz.com](https://quizizz.com) | ✅ Supported | Same as Wayground |

---

## 🚀 Extension Installation

### Prerequisites

- Google Chrome (version 90+)
- An account with one of the AI providers (OpenRouter / Google AI Studio / AgentRouter)
- An API key from your chosen provider

---

### Step 1 - Clone or Download the Source Code

```bash
git clone [https://github.com/YourUsername/test-solver](https://github.com/YourUsername/test-solver)

```

Or download it as a ZIP archive from GitHub and extract it anywhere on your computer.

---

### Step 2 - Open Chrome Extension Manager

In your browser, navigate to:

```
chrome://extensions/

```

---

### Step 3 - Enable Developer Mode

In the top right corner of the `chrome://extensions/` page, toggle the **"Developer mode"** switch.

> 📸 **[PLACEHOLDER FOR SCREENSHOT - chrome://extensions/ view with Developer Mode enabled]**

---

### Step 4 - Load Unpacked Extension

Click the **"Load unpacked"** button and select the project folder (the one containing `manifest.json`).

> 📸 **[PLACEHOLDER FOR SCREENSHOT - folder selection window with project selected]**

---

### Step 5 - Pin the Extension to the Toolbar

Click the 🧩 (puzzle piece) icon next to the address bar and pin **Test Solver** to your Chrome toolbar.

> 🎥 **[PLACEHOLDER FOR RECORDING - short gif/video showing pinning and opening the popup]**

---

## ⚙️ Step-by-Step Configuration

After installing the extension, you must provide an API key for the AI to function.

### Step 1 - Open the Extension Popup

Click the **Test Solver** icon in the Chrome toolbar to open the main menu.

> 📸 **[PLACEHOLDER FOR SCREENSHOT - main popup menu with Screenshot / Settings / About buttons]**

---

### Step 2 - Navigate to Settings → AI Configuration

```
Main Menu → Settings → AI Configuration

```

---

### Step 3 - Select Provider and Paste API Key

1. From the **"Service Provider"** dropdown, select one of the following:
* `OpenRouter` - access to GPT, Claude, Llama, and more
* `Google AI Studio` - Gemini (recommended, generous free tiers)
* `AgentRouter` - alternative AI gateway


2. Paste your **API key** into the input field.
3. Select a **model** from the dropdown (for Google AI Studio, `Gemini 2.5 Flash` is recommended).

> 📸 **[PLACEHOLDER FOR SCREENSHOT - AI Configuration screen with filled fields]**

---

### Step 4 - Test Connection

Click the **"Test Connection"** button. The extension will send a test query to the API.

* ✅ `Connection Successful!` - everything works as expected
* ❌ `API Key Error` - verify your key and check if you have active funds/quota

> 📸 **[PLACEHOLDER FOR SCREENSHOT - success message popup]**

---

### Step 5 - Save and Enable Solver

1. Click **"Save Settings"**
2. Return to the **Main Menu** (← back arrow)
3. Toggle **"Solver Status"** to `Active`

> 🎥 **[PLACEHOLDER FOR RECORDING - enabling solver and navigating to quiz page]**

---

## 🔧 How Test Solver Works

### General Workflow (Simplified)

```
User opens a quiz
        ↓
anticheat.js blocks tracking scripts (document_start, MAIN world)
        ↓
solver.js detects question via MutationObserver
        ↓
Builds prompt & sends to background.js via chrome.runtime.sendMessage
        ↓
background.js calls selected AI provider API (OpenRouter / Google / AgentRouter)
        ↓
Response returned to solver.js
        ↓
Visualization: green highlight (ABCD) or inline hint (open-ended)
        ↓
Usage statistics saved in chrome.storage

```

---

### Detailed Phase Breakdown

#### 🔵 Phase 1 - Script Injection

When navigating to a supported domain, Chrome automatically injects **two scripts**:

| Script | Execution Time | World | Purpose |
| --- | --- | --- | --- |
| `anticheat.js` | `document_start` | `MAIN` (page context) | Block detection mechanisms BEFORE page loads |
| `solver.js` | `document_idle` | `ISOLATED` | Main solving logic after DOM load |

---

#### 🔵 Phase 2 - AntiCheat (Bypassing Anti-Cheat Systems)

`anticheat.js` executes **before any page script** and performs 5 key operations:

**1. Intercepting event listeners tracking user attention:**

```js
// Intercept addEventListener and ignore "suspicious" event types
EventTarget.prototype.addEventListener = function(type, listener, options) {
    if (type === 'blur' || type === 'visibilitychange' || type === 'mouseleave' || type === 'focusout') {
        return; // 🛑 Blocked
    }
    return originalAddEventListener.call(this, type, listener, options);
};

```

**2. Spoofing real browser window state:**

```js
// The page always perceives itself as active and focused
Object.defineProperty(document, 'hidden', { get: () => false });
Object.defineProperty(document, 'visibilityState', { get: () => 'visible' });

```

**3. Nullifying tracking event properties:**

```js
window.onblur         // → always null
document.onvisibilitychange // → always null  
window.onmouseleave   // → always null

```

**4. Mocking dialog popups (warning dialogs):**

```js
// Testportal attempts to invoke `honestRespondentWarning_popup`
// Instead of a real MDC Dialog, it receives a mock object
const fakeDialog = {
    open: function() { /* no-op */ },
    close: function() {},
};
window.honestRespondentWarning_popup  // → fakeDialog
window.honestRespondentBlockade_popup // → fakeDialog

```

**5. Fake BlurSpy + DOM popup removal via MutationObserver:**

```js
// If warning popups enter the DOM despite overrides, remove them instantly
const observer = new MutationObserver((mutations) => {
    // On every DOM mutation, check for warning dialog elements
    // and immediately hide + remove them from DOM
});
observer.observe(document.documentElement, { childList: true, subtree: true });

```

---

#### 🔵 Phase 3 - Question Detection (`solver.js`)

`solver.js` waits for the page load and initializes a `MutationObserver` listening for **DOM changes** (e.g., navigating to the next question):

```js
const questionObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        if (mutation.type === 'childList' || mutation.type === 'characterData') {
            // Trigger solveQuestion() if .question_essence or .question-text-color exists
            solveQuestion();
        }
    }
});
questionObserver.observe(document.body, { childList: true, subtree: true, characterData: true });

```

**Platform Detection:**

```js
// Wayground / Quizizz vs Testportal - different DOM selectors
const isWayground = window.location.hostname.includes("wayground.com") 
                 || window.location.hostname.includes("quizizz.com");

// Testportal selector:
document.querySelector(".question_essence")
// Wayground selector:
document.querySelectorAll(".question-text-color")

```

**Debouncing and Deduplication:**

```js
if (isProcessing) return;                      // Block concurrent requests
if (now - lastRequestTime < 5000) return;          // Rate limit - min 5s interval
if (newQuestionText === currentQuestionText) return; // Prevent duplicate requests for same question

```

---

#### 🔵 Phase 4 - Prompt Engineering

The solver detects the question type and formats the prompt accordingly:

**A) Single-choice question (ABCD):**

```
Answer by providing ONLY A SINGLE LETTER corresponding to the correct option (A, B, C, or D).
No additional text or explanation.

Question:
[Question content extracted from .question_essence]

Options:
A: [Option A content]
B: [Option B content]
C: [Option C content]
D: [Option D content]

```

**B) Multiple-choice question (Select two/three answers):**

The solver detects keywords within the question body:

```js
const multiKeywords = /select\s+\w*(two|three|four|multiple|all)\b|.../i;
isMultiAnswer = multiKeywords.test(newQuestionText);

```

```
Answer by providing ONLY THE LETTERS of the correct choices separated by space (e.g., "B C" or "A D").
No additional text.

```

**C) Open-ended question (Text Input):**

```
You are an assistant answering open-ended quiz questions.
CRITICAL RULES:
- Respond ONLY with the direct factual answer (a word, number, or short sentence)
- ABSOLUTELY DO NOT use letters A, B, C, D, E, F as answers
- DO NOT prefix with "Answer:" or any introductory text
- Keep response as concise as possible

Question: [Question content]

```

---

#### 🔵 Phase 5 - API Execution (`background.js`)

`solver.js` dispatches a message to the service worker:

```js
const response = await chrome.runtime.sendMessage({
    action: "solveQuestion",
    prompt: prompt
});

```

`background.js` reads stored configuration from `chrome.storage` and executes the API request:

```js
const provider = config.provider; // 'openrouter' | 'google' | 'agentrouter'

if (provider === 'openrouter')  result = await fetchOpenRouter(prompt, config.apiKey, config.model);
if (provider === 'google')      result = await fetchGoogleAI(prompt, config.apiKey, config.model);
if (provider === 'agentrouter') result = await fetchAgentRouter(prompt, config.apiKey, config.model);

```

**Request Parameters (Cost Optimization):**

```js
{
    max_tokens: 20,    // Limit to 20 tokens (sufficient for letter/short answers)
    temperature: 0.1   // Low temperature = deterministic, accurate answer
}

```

---

#### 🔵 Phase 6 - Visualizing Answers

**Multiple Choice - Default Mode (Green highlight):**

```js
targetElement.style.setProperty("color", "#27ae60", "important");
targetElement.style.setProperty("font-weight", "bold", "important");
container.style.setProperty("border-left", "4px solid #27ae60", "important");

```

**Multiple Choice - Stealth Mode (Camouflaged/Low-visibility):**

```js
// Subtle bolding + slight contrast - looks like standard body text
targetElement.style.setProperty("font-weight", "700", "important");
targetElement.style.setProperty("color", "#111", "important");
targetElement.style.setProperty("letter-spacing", "0.2px", "important");

```

**Open-ended Question - Input Hinting:**

```js
openInput.placeholder = `${response.answer}`; // Suggested answer as placeholder
openInput.style.borderColor = "#4CAF50";       // Green border
openInput.title = response.answer;              // Tooltip on hover

```

---

## 🏗️ File Architecture

```
Test Solver/
│
├── manifest.json          ← Extension configuration (Manifest V3)
│                            Permissions, content scripts, background worker
│
├── anticheat.js           ← Injected BEFORE page script (MAIN world)
│                            Bypasses Testportal tracking mechanisms
│
├── solver.js              ← Main execution logic (ISOLATED world)
│                            MutationObserver, prompt generation, visual renderer
│
├── background.js          ← Chrome Service Worker
│                            API calls (OpenRouter/Google/AgentRouter)
│                            Screen capture + cropping pipeline
│                            Quota and usage tracking
│
├── screenshot-selection.js ← Injected dynamically on "Screenshot" action
│                            Interactive overlay for screen region cropping
│                            Answer overlay modal
│
├── app.html               ← Extension Popup Interface
│
├── app.js                 ← Popup controller: settings management, quota meter, UI routing
│
└── app.css                ← Stylesheet (Dark mode, glassmorphism design)

```

---

## 📊 Data Flow - Detailed Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    CHROME BROWSER                               │
│                                                                 │
│  ┌──────────────┐      ┌──────────────────────────────────────┐ │
│  │   app.html   │      │      QUIZ PAGE (testportal.pl)       │ │
│  │  (Popup UI)  │      │                                      │ │
│  │              │      │  ┌─────────────┐  ┌──────────────┐   │ │
│  │   app.js     │      │  │ anticheat.js│  │  solver.js   │   │ │
│  │  - Settings  │      │  │ MAIN world  │  │ ISOLATED     │   │ │
│  │  - Toggle    │      │  │             │  │              │   │ │
│  │  - Quota     │      │  │ Blocks:     │  │ 1. Observes  │   │ │
│  │  - Screenshot│      │  │ • blur      │  │    DOM       │   │ │
│  └──────┬───────┘      │  │ • visibility│  │ 2. Extracts  │   │ │
│         │              │  │ • popups    │  │    question  │   │ │
│         │ chrome.tabs  │  │ • BlurSpy   │  │ 3. Builds    │   │ │
│         │ .sendMessage │  └─────────────┘  │    prompt    │   │ │
│         │              │                   └──────┬───────┘   │ │
│         │              └──────────────────────────┼───────────┘ │
│         │                                         │             │
│         │              chrome.runtime.sendMessage  │             │
│         │        ┌────────────────────────────────┘             │
│         ↓        ↓                                              │
│  ┌──────────────────────┐                                       │
│  │     background.js    │                                       │
│  │   (Service Worker)   │                                       │
│  │                      │    ┌──────────────────┐               │
│  │  handleSolveQuestion ├────►│  OpenRouter API  │               │
│  │  handleStartScreenshot    │  Google AI API   │               │
│  │  handleScreenshotSelection│  AgentRouter API │               │
│  │                      │◄────┤  (AI Response)   │               │
│  │  recordUsage()       │    └──────────────────┘               │
│  │  chrome.storage ◄────┘                                       │
│  └──────────────────────┘                                       │
└─────────────────────────────────────────────────────────────────┘

```

---

## 🎨 Answer Modes

### Default Mode

The correct answer option is prominently highlighted with green font and a thick accent border:

```
┌─────────────────────────────────────┐
│  A: First option                    │
│                                     │
│▌ B: Second option   ← AI ✓          │  ← Green bold font with left border
│                                     │
│  C: Third option                    │
│                                     │
│  D: Fourth option                   │
└─────────────────────────────────────┘

```

### Stealth Mode

The correct answer is styled subtly to look nearly identical to other choices. Hard to spot on screen shares or recordings:

```
┌─────────────────────────────────────┐
│  A: First option                    │
│  B: Second option   ← AI ✓          │  ← Subtle font-weight: 700 + #111 color
│  C: Third option                    │
│  D: Fourth option                   │
└─────────────────────────────────────┘

```

**Setting Location:** `Settings → Solver Configuration → Default / Stealth`

---

## 📸 Screenshot Mode

In addition to automated DOM parsing, the extension supports a **manual screenshot crop tool** - ideal for image-based questions or unsupported custom layouts.

### Workflow:

```
1. Click "📸 Screenshot" in the extension popup
        ↓
2. Dark crop overlay appears over the active tab
        ↓
3. Click & drag to select the question region
        ↓
4. background.js captures tab viewport (captureVisibleTab)
        ↓
5. OffscreenCanvas crops the image to selection coordinates
        ↓
6. Image payload (base64 PNG) sent to vision-capable AI model
        ↓
7. AI analyzes visual input and returns resolution
        ↓
8. Answer modal pops up in the bottom right corner

```

### Prompt used for vision requests:

```
You are an assistant solving test questions. In the provided image, 
a test question with answer choices is shown.
Return ONLY the letter of the correct answer (e.g. "A", "B", "C", "D") 
or a short direct answer if it's an open question.
If multiple choices are correct, list letters separated by space (e.g. "A C").
Zero extra text, zero explanation.

```

> 🎥 **[PLACEHOLDER FOR RECORDING - screenshot mode demo: area selection → "Analyzing..." loader → result modal]**

---

## 🛡️ Anticheat System

Testportal.pl utilizes browser event listeners to detect tab switching or window defocus. Test Solver overrides these controls at runtime:

| Testportal Mechanism | Test Solver Countermeasure |
| --- | --- |
| Window blur event (`blur`) | Overridden `addEventListener` blocks `blur`, `visibilitychange`, `focusout`, `mouseleave` |
| Checking `document.hidden` | Getter overridden to always return `false` |
| Checking `document.visibilityState` | Getter overridden to always return `'visible'` |
| Popup `honestRespondentWarning_popup` | Mocked dialog object - `.open()` method neutralized |
| Popup `honestRespondentBlockade_popup` | Same as above + MutationObserver purges DOM elements immediately |
| `BlurSpy` module | Mocked class - `start()` no-op, `getBlursCount()` returns `0` |

> ⚠️ All anti-cheat mitigations run in the page's `MAIN world` context at `document_start` before page scripts bind event listeners.

---

## 📈 API Quota Monitoring

Test Solver automatically tracks daily API usage and visualizes consumption with a **circular progress bar** in the popup.

### Daily Free-Tier Quotas:

| Model | Daily Limit |
| --- | --- |
| `gemini-2.5-flash` (Google) | 1,000,000 tokens |
| `gemini-1.5-pro` (Google) | 500,000 tokens |
| `gemini-1.5-flash` (Google) | 1,500,000 tokens |
| OpenRouter / AgentRouter | 200 requests |

### Gauge Color Indicators:

```
 0 – 60% → 🟢 Green  (#2dd4a3) - Safe zone
61 – 85% → 🟡 Yellow (#f59e0b) - Warning
86 – 100% → 🔴 Red    (#ff6391) - Near quota threshold

```

Usage metrics automatically reset at midnight.

---

## 🤖 Supported AI Providers

### OpenRouter

Unified API aggregator - single key provides access to multiple model families.

| Model | Tier |
| --- | --- |
| `google/gemini-2.0-flash-exp:free` | Free ✅ |
| `openai/gpt-4o-mini` | Paid |
| `anthropic/claude-3.5-sonnet` | Paid |
| `meta-llama/llama-3.1-8b-instruct:free` | Free ✅ |

🔗 Get API Key: [openrouter.ai/keys](https://openrouter.ai/keys)

---

### Google AI Studio (Gemini) - ⭐ Recommended

Direct API access to Gemini models featuring high rate limits on free tiers.

| Model | Status |
| --- | --- |
| `gemini-2.5-flash` | ⭐ Recommended |
| `gemini-1.5-pro` | Advanced Reasoning |
| `gemini-1.5-flash` | Fast Execution |

🔗 Get API Key: [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)

---

### AgentRouter

Alternative gateway offering access to leading frontier models.

| Model | ID |
| --- | --- |
| Claude Opus 4.6 | `claude-opus-4-6` |
| GPT 5.5 | `gpt-5.5` |
| GLM 5.2 | `glm-5.2` |

---

## 🔒 Security Features

| Feature | Description |
| --- | --- |
| **Domain Whitelisting** | Content scripts injected exclusively on target domains via manifest `matches` |
| **`isProcessing` Lock** | Prevents race conditions and duplicate concurrent API calls |
| **5s Rate Limiting** | Mandatory 5-second interval between automated queries (prevents HTTP 429) |
| **Deduplication Cache** | Ignores redundant requests if the active question matches the previous query |
| **MutationObserver** | Reacts to true DOM structural mutations rather than interval polling |
| **`max_tokens: 20`** | Strict token cap on completion length minimizing token overhead |
| **`temperature: 0.1`** | Highly deterministic responses with minimal output variation |
| **Local Key Storage** | API keys stored securely in `chrome.storage.local`, never embedded in source code |

---

## 🗺️ Roadmap

* [x] Automated multiple-choice solving (ABCD)
* [x] Support for open-ended text input questions
* [x] Multiple selection support
* [x] In-popup AI provider and model selector
* [x] Stealth mode styling
* [x] Screenshot vision mode
* [x] API quota monitoring widget
* [x] AntiCheat event listener interception
* [x] Wayground and Quizizz platform support
* [ ] Image parsing in automated mode
* [ ] Advanced BlurSpy deep-module neutralizing
* [ ] Support for Kahoot platform
* [ ] Solved question history log
* [ ] Offline local LLM mode (Ollama integration)
* [ ] Automated choice clicking option
* [ ] Chrome Web Store publishing

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

```bash
# 1. Clone repo
git clone [https://github.com/YourUsername/test-solver](https://github.com/YourUsername/test-solver)
cd test-solver

# 2. Load unpacked extension in Chrome
# chrome://extensions/ → Developer mode → Load unpacked

# 3. Make changes and click reload on chrome://extensions/

```

**Reporting Bugs:**

* Open Chrome DevTools (F12 → Console) - check for logs tagged `[Test Solver]`
* Open a GitHub Issue detailing the steps to reproduce, target URL, and console logs.

---

## ⚠️ Disclaimer

> This project was developed **strictly for educational and research purposes** - as a demonstration of Chrome Extension API capabilities (content scripts, service workers, MV3), cross-context script messaging via `chrome.runtime.sendMessage`, and API integrations with external AI backends (OpenRouter, Google Generative AI).
> The author assumes no responsibility or liability for how this software is utilized.

---

**Test Solver** • v0.6 Alpha • Open Source

Made with ❤️ by **Bartosz Kuba**

⭐ Star this repository on GitHub if you find it useful!
