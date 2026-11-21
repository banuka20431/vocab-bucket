import {
  SAVED_WORDS_KEY,
  UI_STATE_KEY,
  clearPopupState,
  getPopupState,
  getSavedWords,
  removeWord,
  saveWord,
} from "../core/StorageHandler.js";

const exportBtn = document.querySelector("#export-btn");
const fileTypesList = document.querySelector("#file-types");
const csvBtn = document.querySelector("#csv");
const jsonBtn = document.querySelector("#json");
const mdBtn = document.querySelector("#markdown");
const workflowBanner = document.querySelector("#workflow-banner");
const wordList = document.querySelector(".words-list");
const wordCount = document.querySelector("#word-count");

let activeAudio = null;

// --- Export Menu Toggle ---
exportBtn.addEventListener("click", (event) => {
  fileTypesList.classList.toggle("show");
  event.stopPropagation();
});

document.addEventListener("click", (event) => {
  if (!fileTypesList.contains(event.target) && !exportBtn.contains(event.target)) {
    fileTypesList.classList.remove("show");
  }
});

document.addEventListener("keydown", async (event) => {
  if (event.key === "Escape") {
    fileTypesList.classList.remove("show");
  }
});

// --- Export Handlers ---
csvBtn.addEventListener("click", async () => {
  fileTypesList.classList.remove("show");
  const words = await getSavedWords();

  const headers = [
    "spelling",
    "pronunciation",
    "category",
    "short-definition",
    "full-definition",
    "usage",
    "audioURL",
    "timestamp",
  ];

  const rows = words.map((word) => {
    const fullDef = word.definition?.full || word.definition?.long || "";
    const usage = Array.isArray(word.usage) ? word.usage.join(" | ") : word.usage || "";

    return [
      word.spelling || "",
      word.pronunciation || "",
      word.category || "",
      word.definition?.short || "",
      fullDef,
      usage,
      word.audioURL || "",
      word.timestamp || "",
    ]
      .map(escapeCsvField)
      .join(",");
  });

  const content = [headers.join(","), ...rows].join("\r\n");
  await downloadFile(content, "text/csv;charset=utf-8", "vocab-bucket-words-export.csv");
});

jsonBtn.addEventListener("click", async () => {
  fileTypesList.classList.remove("show");
  const words = await getSavedWords();
  const content = JSON.stringify(words, null, 2);
  await downloadFile(
    content,
    "application/json;charset=utf-8",
    "vocab-bucket-words-export.json",
  );
});

mdBtn.addEventListener("click", async () => {
  fileTypesList.classList.remove("show");
  const words = await getSavedWords();

  if (words.length === 0) {
    const empty = "# Vocab Bucket — Export\n\n_No words to export._\n";
    await downloadFile(
      empty,
      "text/markdown;charset=utf-8",
      "vocab-bucket-words-export.md",
    );
    return;
  }

  const sections = words.map((word, index) => {
    const lines = [`## ${index + 1}. ${word.spelling || "(unknown)"}\n`];
    const formattedPron = formatPronunciation(word.pronunciation);
    if (formattedPron !== "N/A") {
      lines.push(`- **Pronunciation:** ${formattedPron}`);
    }
    lines.push(`- **Category:** ${word.category || "N/A"}`);
    lines.push(`- **Short definition:** ${word.definition?.short || "N/A"}`);

    const fullDef = word.definition?.full || word.definition?.long;
    if (fullDef && fullDef !== word.definition?.short) {
      lines.push(`- **Full definition:** ${fullDef}`);
    }

    if (Array.isArray(word.usage) && word.usage.length > 0) {
      lines.push("- **Usage:**");
      word.usage.forEach((example) => lines.push(`  - ${example}`));
    } else {
      lines.push("- **Usage:** N/A");
    }

    if (word.audioURL) {
      lines.push(`- **Audio:** [Play pronunciation](${word.audioURL})`);
    }
    if (word.timestamp) {
      lines.push(`- **Saved:** ${new Date(word.timestamp).toLocaleString()}`);
    }

    return lines.join("\n");
  });

  const content = `# Vocab Bucket Export\n\n${sections.join("\n\n---\n\n")}\n`;
  await downloadFile(
    content,
    "text/markdown;charset=utf-8",
    "vocab-bucket-words-export.md",
  );
});

// --- Workflow Banner Renderer (Replaces legacy flash/ & save_conf/ popups) ---
async function renderWorkflowBanner(state) {
  workflowBanner.textContent = "";
  workflowBanner.className = "workflow-banner";

  if (!state || !state.status) {
    workflowBanner.classList.add("hidden");
    return;
  }

  // Clear notification badge once user views a non-loading state
  if (state.status !== "loading") {
    chrome.action.setBadgeText({ text: "" }).catch(() => {});
  }

  if (state.status === "loading") {
    const row = document.createElement("div");
    row.className = "workflow-loading-row";

    const spinner = document.createElement("span");
    spinner.className = "spinner";
    spinner.setAttribute("aria-hidden", "true");

    const text = document.createElement("p");
    text.className = "workflow-message";
    text.textContent = `Looking up "${state.requestedWord}"...`;

    row.append(spinner, text);
    workflowBanner.appendChild(row);
    return;
  }

  if (state.status === "already_saved") {
    workflowBanner.classList.add("is-warning");

    const eyebrow = createEl("p", "eyebrow", "Already saved");
    const title = createEl(
      "h2",
      "workflow-title",
      `"${state.requestedWord}" is already in your bucket.`,
    );
    const actions = createEl("div", "workflow-actions");
    const dismissBtn = createButton("Dismiss", ["control", "info"], dismissBanner);

    actions.appendChild(dismissBtn);
    workflowBanner.append(eyebrow, title, actions);
    return;
  }

  if (state.status === "error") {
    workflowBanner.classList.add("is-error");

    const eyebrow = createEl("p", "eyebrow", "Lookup notice");
    const title = createEl("h2", "workflow-title", state.title || "Lookup failed");
    const message = createEl(
      "p",
      "workflow-message",
      state.message || "Unable to fetch the requested word.",
    );
    const actions = createEl("div", "workflow-actions");

    if (state.requestedWord) {
      actions.appendChild(
        createButton("Look up on Web", ["control", "info"], () =>
          openWebDefinition(state.requestedWord),
        ),
      );
    }
    actions.appendChild(createButton("Dismiss", ["control", "warning"], dismissBanner));

    workflowBanner.append(eyebrow, title, message, actions);
    return;
  }

  if (state.status === "confirm" || state.status === "unavailable") {
    const isExact = state.status === "confirm";
    const meta = state.meta;
    if (!meta) {
      await dismissBanner();
      return;
    }

    workflowBanner.classList.add(isExact ? "is-confirm" : "is-warning");

    const eyebrow = createEl(
      "p",
      "eyebrow",
      isExact ? "Confirm save" : `Exact match for "${state.requestedWord}" unavailable`,
    );
    const wordHeading = createEl("span", "workflow-word", meta.spelling);
    const definition = createEl(
      "p",
      "workflow-message",
      meta.definition?.short || meta.definition?.full || "No definition available.",
    );

    const actions = createEl("div", "workflow-actions");

    const saveActionBtn = createButton("Save word", ["control", "info"], async () => {
      saveActionBtn.disabled = true;
      await saveWord(meta);
      await clearPopupState();
      await chrome.action.setBadgeText({ text: "" }).catch(() => {});
      await renderSavedWords();
      await renderWorkflowBanner(null);
    });

    const recheckBtn = createButton("Recheck def", ["control", "info"], () =>
      openWebDefinition(state.requestedWord || meta.spelling),
    );

    const discardBtn = createButton("Discard", ["control", "warning"], dismissBanner);

    actions.append(saveActionBtn, recheckBtn, discardBtn);
    workflowBanner.append(eyebrow, wordHeading, definition, actions);
  }
}

async function dismissBanner() {
  await clearPopupState();
  await chrome.action.setBadgeText({ text: "" }).catch(() => {});
  await renderWorkflowBanner(null);
}

// --- Saved Lexicon Renderer ---
async function renderSavedWords() {
  const saved = await getSavedWords();
  const words = [...saved].reverse();

  wordList.textContent = "";

  if (words.length === 0) {
    const emptyItem = createEl("li", "empty-state", "No words saved yet.");
    wordList.appendChild(emptyItem);
    wordCount.textContent = "0 words saved";
    return;
  }

  wordCount.textContent = `${words.length} ${words.length === 1 ? "word" : "words"} saved`;

  words.forEach((word) => {
    const li = createEl("li", "word-list-item");

    const header = createEl("div", "word-header");
    const wordLabel = createEl("span", "word", word.spelling || "(unknown)");
    const timestamp = createEl("span", "timestamp", formatSavedTimestamp(word.timestamp));
    timestamp.title = word.timestamp ? new Date(word.timestamp).toLocaleString() : "Saved time";
    header.append(wordLabel, timestamp);

    const metaRow = createEl("div", "word-meta");
    const pronunciation = createEl(
      "span",
      "meta-chip pronunciation",
      formatPronunciation(word.pronunciation),
    );
    const category = createEl("span", "meta-chip category", word.category || "N/A");
    metaRow.append(pronunciation, category);

    const definition = createEl(
      "p",
      "definition",
      word.definition?.full ||
        word.definition?.long ||
        word.definition?.short ||
        "No definition available.",
    );

    const exampleBox = createEl("div", "example-box");
    const exampleLabel = createEl("p", "example-label", "Usage example");
    const exampleText = createEl("p", "example-text", getExampleUsage(word.usage));
    exampleBox.append(exampleLabel, exampleText);

    const actions = createEl("div", "word-actions");

    const playBtn = createButton("Play audio", ["control", "info", "audio-control"], async () => {
      if (!word.audioURL) return;
      await playPronunciation(word.audioURL, playBtn);
    });
    playBtn.disabled = !word.audioURL;

    const removeBtn = createButton("Remove", ["control", "warning"], async () => {
      await removeWord(word.spelling);
      await renderSavedWords();
    });

    const recheckBtn = createButton("Recheck def", ["control", "info"], () =>
      openWebDefinition(word.spelling),
    );

    actions.append(playBtn, removeBtn, recheckBtn);
    li.append(header, metaRow, definition, exampleBox, actions);
    wordList.appendChild(li);
  });
}

// --- Helpers ---
async function playPronunciation(url, button) {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio = null;
  }

  const audio = new Audio(url);
  audio.preload = "none";
  activeAudio = audio;

  const originalLabel = button.textContent;
  button.textContent = "Playing...";

  const reset = () => {
    button.textContent = originalLabel;
    if (activeAudio === audio) activeAudio = null;
  };

  audio.addEventListener("ended", reset, { once: true });
  audio.addEventListener("error", reset, { once: true });

  try {
    await audio.play();
  } catch (err) {
    console.error("Unable to play audio clip:", err);
    reset();
  }
}

function openWebDefinition(word) {
  if (!word) return;
  const url = `https://www.google.com/search?q=${encodeURIComponent(`define ${word}`)}`;
  chrome.tabs.create({ url });
}

function formatPronunciation(value) {
  if (typeof value !== "string") return "N/A";
  const trimmed = value.trim();
  if (!trimmed || trimmed.toUpperCase() === "N/A") return "N/A";
  if (trimmed.startsWith("/") && trimmed.endsWith("/")) return trimmed;
  return `/${trimmed}/`;
}

function formatSavedTimestamp(value) {
  if (!value) return "Timestamp unavailable";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Timestamp unavailable";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getExampleUsage(usage) {
  if (!Array.isArray(usage) || usage.length === 0) {
    return "No usage example available.";
  }
  return usage[0];
}

function escapeCsvField(value) {
  let str = String(value ?? "");
  // Guard against spreadsheet formula injection
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function downloadFile(content, mimeType, filename) {
  const blob = new Blob([content], { type: mimeType });
  const downloadUrl = URL.createObjectURL(blob);

  try {
    const downloadId = await chrome.downloads.download({
      saveAs: false,
      url: downloadUrl,
      filename,
      conflictAction: "prompt",
    });

    const onChanged = (delta) => {
      if (
        delta.id === downloadId &&
        delta.state &&
        (delta.state.current === "complete" || delta.state.current === "interrupted")
      ) {
        chrome.downloads.onChanged.removeListener(onChanged);
        URL.revokeObjectURL(downloadUrl);
      }
    };

    chrome.downloads.onChanged.addListener(onChanged);
    setTimeout(() => {
      chrome.downloads.onChanged.removeListener(onChanged);
      URL.revokeObjectURL(downloadUrl);
    }, 30_000);
  } catch (err) {
    URL.revokeObjectURL(downloadUrl);
    console.error("Download failed:", err);
  }
}

function createEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

function createButton(label, classes, onClick) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = label;
  btn.classList.add(...classes);
  btn.addEventListener("click", onClick);
  return btn;
}

// --- Live Sync & Initialization ---
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "session" && changes[UI_STATE_KEY]) {
    renderWorkflowBanner(changes[UI_STATE_KEY].newValue || null);
  }
  if (areaName === "local" && changes[SAVED_WORDS_KEY]) {
    renderSavedWords();
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const [popupState] = await Promise.all([getPopupState(), renderSavedWords()]);
    await renderWorkflowBanner(popupState);
  } catch (err) {
    console.error("Failed to initialize popup:", err);
  }
});