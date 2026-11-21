import { config } from "../config.js";
import { loadWordInfo, setActionBadge } from "../core/WordHandler.js";
import {
  setPopupState,
  setUnseenUpdateVersion,
} from "../core/StorageHandler.js";

const CONTEXT_MENU_ID = "saveWord";
const TAB_LOAD_TIMEOUT_MS = 12_000;

chrome.runtime.onInstalled.addListener(async (details) => {
  // Rebuild context menu idempotently to avoid duplicate-ID warnings on updates
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create(
      {
        id: CONTEXT_MENU_ID,
        title: "Save '%s' to Vocab-Bucket",
        contexts: ["selection"],
      },
      () => {
        if (chrome.runtime.lastError) {
          console.error("Context menu error:", chrome.runtime.lastError.message);
        }
      },
    );
  });

  if (
    details.reason === chrome.runtime.OnInstalledReason.INSTALL &&
    config.UNINSTALL_SURVEY_URL
  ) {
    chrome.runtime.setUninstallURL(config.UNINSTALL_SURVEY_URL, () => {
      if (chrome.runtime.lastError) {
        console.error(
          "Error setting uninstall URL:",
          chrome.runtime.lastError.message,
        );
      }
    });
  }

  if (details.reason === chrome.runtime.OnInstalledReason.UPDATE) {
    const currentVersion = chrome.runtime.getManifest().version;
    const prevMajor = Number((details.previousVersion || "0").split(".")[0]);
    const currMajor = Number(currentVersion.split(".")[0]);

    if (currMajor > prevMajor) {
      await setUnseenUpdateVersion(currentVersion);
      await setActionBadge("NEW", "#2f8fb0");
    }
  }
});

// 1. Context menu trigger
chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId === CONTEXT_MENU_ID && info.selectionText) {
    await loadWordInfo(info.selectionText);
  }
});

// 2. Keyboard shortcut trigger (Alt+Shift+S)
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "save-to-vocab-bucket") return;

  const currentTab = await fetchActiveTab();
  if (!currentTab?.id || !isInjectableUrl(currentTab.url)) {
    await setPopupState({
      status: "error",
      requestedWord: "",
      title: "Page not supported",
      message:
        "Browser shortcuts cannot read text on internal Chrome pages. Use the Omnibox (type 'vb' + Space) instead.",
    });
    await setActionBadge("!", "#b54848");
    try {
      await chrome.action.openPopup();
    } catch {
      // Badge indicates the error if popup cannot open programmatically
    }
    return;
  }

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: () => window.getSelection()?.toString() || "",
    });

    const selectedWord = results?.[0]?.result?.trim();
    if (selectedWord) {
      await loadWordInfo(selectedWord);
    }
  } catch (err) {
    console.error("Failed to read selected text from active tab:", err);
  }
});

// 3. Omnibox trigger ('vb <word>') with Google autocorrect detection
chrome.omnibox.onInputEntered.addListener(async (rawInput) => {
  const searchedTerm = rawInput.trim().toLowerCase();
  if (!searchedTerm) return;

  const currentTab = await fetchActiveTab();
  if (!currentTab?.id) {
    await loadWordInfo(searchedTerm);
    return;
  }

  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchedTerm)}`;

  try {
    await chrome.tabs.update(currentTab.id, { url: searchUrl });
    const loaded = await waitForTabLoad(currentTab.id, TAB_LOAD_TIMEOUT_MS);

    let resolvedTerm = searchedTerm;

    // Bypass Google's 'recursion' easter egg
    if (loaded && searchedTerm !== "recursion") {
      try {
        const injectionResults = await chrome.scripting.executeScript({
          target: { tabId: currentTab.id },
          func: grabAutoCorrectedWord,
        });

        const autoCorrected = injectionResults?.[0]?.result;
        if (typeof autoCorrected === "string" && autoCorrected.length > 0) {
          resolvedTerm = autoCorrected;
        }
      } catch (scrapeErr) {
        console.warn("Autocorrect check skipped:", scrapeErr.message);
      }
    }

    await loadWordInfo(resolvedTerm);
  } catch (err) {
    console.error("Omnibox lookup failed:", err);
    await loadWordInfo(searchedTerm);
  }
});

/**
 * Injected into Google Search results to extract spelling autocorrect suggestions.
 * @returns {string|null}
 */
function grabAutoCorrectedWord() {
  let container = document.querySelector("#fprs");
  if (!container) {
    container = document.querySelector(".QRYxYe.NNMgCf");
  }
  if (!container) return null;

  const correctedEl = container.querySelector(":scope > a > b > i");
  return correctedEl ? correctedEl.textContent.trim() : null;
}

/**
 * Waits for a tab to finish loading with timeout and tab-close cleanup to prevent listener leaks.
 * @param {number} tabId
 * @param {number} timeoutMs
 * @returns {Promise<boolean>}
 */
function waitForTabLoad(tabId, timeoutMs) {
  return new Promise((resolve) => {
    let settled = false;

    const cleanup = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(onUpdated);
      chrome.tabs.onRemoved.removeListener(onRemoved);
      resolve(result);
    };

    const onUpdated = (updatedTabId, changeInfo) => {
      if (updatedTabId === tabId && changeInfo.status === "complete") {
        cleanup(true);
      }
    };

    const onRemoved = (removedTabId) => {
      if (removedTabId === tabId) {
        cleanup(false);
      }
    };

    const timer = setTimeout(() => cleanup(false), timeoutMs);

    chrome.tabs.onUpdated.addListener(onUpdated);
    chrome.tabs.onRemoved.addListener(onRemoved);
  });
}

function isInjectableUrl(url) {
  return typeof url === "string" && /^https?:\/\//i.test(url);
}

async function fetchActiveTab() {
  const [tab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  return tab || null;
}