# Vocab Bucket - Technical Documentation

## 1. Introduction

### Overview

**Vocab Bucket** is a Manifest V3 Chrome Extension designed to serve as a personal, in-browser lexicon. It allows users to capture, define, and save English vocabulary seamlessly while reading web content. By integrating with the Merriam-Webster Learner's API, the extension provides accessible definitions, phonetic pronunciations, and contextual usage examples right inside the browser, saving them to a personalized "bucket" for future review.

### Who is this for?

This extension is tailored for ESL (English as a Second Language) students, avid readers, and lifelong learners who want a distraction-free way to look up and store new vocabulary without leaving their current tab.

### Tech Used

| Technology | Purpose in Project |
| --- | --- |
| **JavaScript (ES6+)** | Core logic, asynchronous DOM manipulation, and Service Worker background tasks. |
| **Manifest V3 API** | Modern Chrome Extension architecture, handling permissions, shortcuts, and message passing. |
| **HTML5 & CSS3** | Structures and styles the elegant extension Popup and Lexicon UI. |
| **Merriam-Webster API** | Primary data provider returning definitions, phonetics, and usage examples via JSON. |
| **chrome.storage API** | Persists the user's saved vocabulary bucket across browser sessions. |

### Capabilities

* **Quick Capture via Shortcut:** Users can instantly trigger a word lookup using the `Alt + Ctrl + S` keyboard shortcut.
* **Interactive Definition Dialog:** Before saving, a preview card (e.g., for the word "simplify") allows users to read the basic meaning and choose to **Save**, **Discard**, or **Recheck the Definition**.
* **Browser Lexicon Dashboard:** A beautiful, scrollable UI that displays the count of saved words and detailed vocabulary cards.
* **Rich Vocabulary Cards:** Saved words display phonetic spellings (e.g., `/ˈpəmənənt/`), parts of speech (e.g., `adjective`), comprehensive definitions, and contextual usage examples.
* **Audio Pronunciation:** Users can click "Play audio" to hear how a word is spoken.
* **Bucket Management:** Instantly remove words from the lexicon when they are mastered.

### Future Improvements & Checklist

* [x] Core extension architecture (Manifest V3) and popup UI.
* [x] Merriam-Webster API integration for rich word data and audio.
* [x] Keyboard shortcut listener (`Alt + Ctrl + S`).
* [ ] **Implement "Recheck definition":** Build a fallback scraper to search Google for "define [word]" if the primary API fails or yields unsatisfactory results.
* [ ] Implement a Node.js/Express backend proxy to completely hide the API key from the browser environment.
* [ ] Add a JavaScript-driven Flashcard or Quiz mode to test saved vocabulary.
* [ ] Support exporting saved word into multiple different formats such as .json, .csv, .md
* [ ] **Shortcut Conflict Handling:** Add a settings menu allowing users to remap the `Alt + Ctrl + S` shortcut in case it conflicts with native OS or other app shortcuts.
* [ ] **Cloud Sync:** Transition from `chrome.storage.local` to `chrome.storage.sync` so users can access their Vocab Bucket across different devices logged into Chrome.

---

## 2. Configuration Guide

To run and test **Vocab Bucket** locally in your browser, follow these steps.

### Local Setup (Load Unpacked Extension)

1. Clone the repository to your local machine: `git clone https://github.com/banuka20431/vocab-bucket.git`
2. Open Google Chrome and navigate to your extensions page by typing `chrome://extensions/` in the URL bar.
3. Toggle the **Developer mode** switch in the top right corner.
4. Click the **Load unpacked** button in the top left.
5. Select the `vocab-bucket` directory you just cloned. The extension should now appear in your browser!

> **⚠️ Note on Keyboard Shortcuts:** The default trigger for capturing a word is `Alt + Ctrl + S`. If this shortcut does not work, it may be conflicting with a system-level shortcut on your OS. You can manually adjust extension shortcuts in Chrome by navigating to `chrome://extensions/shortcuts`.

### API Key Configuration

Vocab Bucket relies on the Merriam-Webster Learner's Dictionary API to fetch word data.

1. Navigate to the [Merriam-Webster Developer Center](https://dictionaryapi.com/) and register for a free account.
2. Request a new key, ensuring you select the **"Merriam-Webster's Learner's Dictionary"**.
3. In the root directory of your cloned project, locate `config.example.js`.
4. Rename this file to `config.js`. *(Keep this file out of version control!)*
5. Paste your API key into the file:
```javascript
const API_KEY = "YOUR_COPIED_API_KEY_HERE";

```


6. Return to `chrome://extensions/` and click the refresh icon (↺) on the Vocab Bucket card to reload the extension with your new config.

---

## 3. Contribution Guidelines

We welcome contributions! Whether you are styling the Lexicon UI or optimizing Service Worker fetch requests, please adhere to the following workflow.

### How to Contribute

1. Fork this repository and clone it locally.
2. Create a new branch strictly following our naming convention (see below).
3. Develop your feature, ensuring all UI elements match the existing design system.
4. Push your changes and open a Pull Request (PR) against the main branch.

### Contributor Rules

* **Manifest V3 Compliance:** Do not introduce Manifest V2 code (e.g., standard background pages). All background scripts must operate as Service Workers.
* **Scraping Caution:** If working on the "Recheck definition" feature, ensure any Google search scraping logic respects CORS policies and is executed correctly within the extension's permission scope.
* **Documentation:** Comment complex logic blocks, especially message passing between content scripts and the popup.

### Branch Naming Convention

All branches must follow this exact pattern: `dev/[name]`

**Valid Examples:**

* `dev/feature-google-scraper`
* `dev/fix-audio-playback`
* `dev/update-manifest-permissions`
