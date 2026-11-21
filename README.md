# Vocab Bucket

**Vocab Bucket** is a Manifest V3 Chrome Extension that serves as a personal, in-browser English lexicon. Highlight any word on a webpage—or look it up directly from Chrome's address bar—to preview its definition, pronunciation, audio clip, and usage examples, then save it locally for review and export.

---

## Features

- **Three Fast Capture Flows:**
  - **Right-click Context Menu:** Highlight a word → *Save '<word>' to Vocab-Bucket*.
  - **Keyboard Shortcut:** Highlight a word and press `Alt + Shift + S` (customizable at `chrome://extensions/shortcuts`).
  - **Omnibox (`vb`):** Type `vb` + `Space`/`Tab` in Chrome's address bar to search with automatic Google spelling-correction detection.
- **Unified Live Popup UI:** Instant loading state, confirmation cards, duplicate detection, and clear error feedback inside a single popup powered by `chrome.storage.session`.
- **Rich Vocabulary Cards:** IPA pronunciation, part of speech, definitions, usage examples, audio playback, and one-click web definition recheck.
- **Export Anywhere:** Download your saved bucket as **CSV**, **JSON**, or **Markdown**.
- **Privacy-First Local Storage:** Saved words live exclusively in `chrome.storage.local`.

---

## Architecture

The extension talks over HTTPS to a dedicated Node.js/Express + Redis proxy backend (`vocab-bucket-backend-proxy-api`), keeping third-party API keys off the client and aggregating Merriam-Webster Learner's Dictionary with Wiktionary fallback metadata.

```text
vocab-bucket/
├── background/
│   └── background.js       # MV3 service worker (context menu, shortcut, omnibox)
├── core/
│   ├── StorageHandler.js   # chrome.storage.local & chrome.storage.session layer
│   └── WordHandler.js      # Input validation, Azure proxy fetch, badge/state orchestration
├── popup/
│   ├── main.html           # Unified popup (workflow banner + saved lexicon)
│   ├── main.css            # Popup & banner styles
│   ├── main.js             # Reactive UI, audio player, CSV/JSON/MD exporters
│   └── styles/
│       └── shared.css      # Theme tokens & base layout styles
├── images/
│   └── icons/              # Extension icons (16, 32, 48, 128)
├── config.js               # Backend proxy URL & timeout configuration
├── config.example.js       # Configuration template
├── manifest.json           # Manifest V3 definition
├── PRIVACY.md
└── README.md