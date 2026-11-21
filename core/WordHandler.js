import { config } from "../config.js";
import {
  existsInSavedWords,
  isExactWord,
  normalizeWord,
  setPopupState,
} from "./StorageHandler.js";

// Mirrors backend WORD_PATTERN in server.js to prevent wasted rate-limit hits
const WORD_PATTERN = /^[\p{L}][\p{L}\s'-]{0,63}$/u;

const BADGE_COLORS = {
  INFO: "#2f8fb0",
  WARN: "#d97706",
  ERROR: "#b54848",
};

/**
 * Updates the extension toolbar badge safely.
 * @param {string} text
 * @param {string} [color]
 */
export async function setActionBadge(text, color = BADGE_COLORS.INFO) {
  try {
    await chrome.action.setBadgeText({ text });
    if (text) {
      await chrome.action.setBadgeBackgroundColor({ color });
    }
  } catch (err) {
    console.warn("Unable to update action badge:", err.message);
  }
}

/**
 * Attempts to open the unified popup without throwing if Chrome rejects the gesture.
 * @returns {Promise<boolean>}
 */
async function tryOpenPopup() {
  try {
    await chrome.action.openPopup();
    return true;
  } catch {
    return false;
  }
}

/**
 * Maps Azure backend / Nginx HTTP status codes to clear user-facing errors.
 * @param {number} status
 * @param {string} word
 */
function describeHttpError(status, word) {
  switch (status) {
    case 400:
      return {
        title: "Invalid word format",
        message: "Select a single word or short phrase without symbols or numbers.",
      };
    case 403:
      return {
        title: "Access rejected",
        message: "This extension build is not authorized by the dictionary server.",
      };
    case 404:
      return {
        title: "Word not found",
        message: `No dictionary entry was found for "${word}".`,
      };
    case 429:
      return {
        title: "Slow down",
        message: "Too many lookups in a row. Wait a few seconds and try again.",
      };
    case 502:
    case 503:
    case 504:
      return {
        title: "Dictionary service unavailable",
        message: "Upstream dictionary providers did not respond. Please try again shortly.",
      };
    default:
      return {
        title: "Lookup failed",
        message: `Unexpected server response (HTTP ${status}).`,
      };
  }
}

/**
 * Validates, deduplicates, fetches metadata from the Azure proxy API, and updates popup state.
 * @param {string} rawWord
 * @returns {Promise<boolean>}
 */
export async function loadWordInfo(rawWord) {
  const requestedWord = normalizeWord(rawWord);

  // 1. Pre-validate locally before consuming Azure VM / Nginx rate-limit budget
  if (!requestedWord || !WORD_PATTERN.test(requestedWord)) {
    await setPopupState({
      status: "error",
      requestedWord: typeof rawWord === "string" ? rawWord.trim().slice(0, 40) : "",
      title: "Invalid selection",
      message: "Highlight a single word or short phrase (letters, hyphens, or apostrophes).",
    });
    await setActionBadge("!", BADGE_COLORS.ERROR);
    await tryOpenPopup();
    return false;
  }

  // 2. Abort early if the word is already saved locally
  if (await existsInSavedWords(requestedWord)) {
    await setPopupState({
      status: "already_saved",
      requestedWord,
    });
    await setActionBadge("");
    await tryOpenPopup();
    return false;
  }

  // 3. Publish loading state and open the unified popup immediately while gesture is fresh
  await setPopupState({
    status: "loading",
    requestedWord,
  });
  await setActionBadge("...", BADGE_COLORS.INFO);
  const popupOpened = await tryOpenPopup();

  try {
    const res = await fetch(config.API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ word: requestedWord }),
      signal: AbortSignal.timeout(config.REQUEST_TIMEOUT_MS),
    });

    if (!res.ok) {
      const { title, message } = describeHttpError(res.status, requestedWord);
      await setPopupState({
        status: "error",
        requestedWord,
        statusCode: res.status,
        title,
        message,
      });
      await setActionBadge("!", BADGE_COLORS.ERROR);
      if (!popupOpened) await tryOpenPopup();
      return false;
    }

    const payload = await res.json();
    const meta =
      typeof payload?.meta === "string" ? JSON.parse(payload.meta) : payload?.meta;

    if (!meta || typeof meta.spelling !== "string") {
      await setPopupState({
        status: "error",
        requestedWord,
        title: "Invalid response",
        message: "The server returned incomplete metadata for this word.",
      });
      await setActionBadge("!", BADGE_COLORS.ERROR);
      if (!popupOpened) await tryOpenPopup();
      return false;
    }

    // Check if the resolved spelling itself is already in the user's bucket
    if (await existsInSavedWords(meta.spelling)) {
      await setPopupState({
        status: "already_saved",
        requestedWord: meta.spelling,
      });
      await setActionBadge("");
      if (!popupOpened) await tryOpenPopup();
      return false;
    }

    const exactMatch = isExactWord(meta.spelling, requestedWord);

    await setPopupState({
      status: exactMatch ? "confirm" : "unavailable",
      requestedWord,
      meta,
    });
    await setActionBadge(
      exactMatch ? "1" : "?",
      exactMatch ? BADGE_COLORS.INFO : BADGE_COLORS.WARN,
    );

    if (!popupOpened) await tryOpenPopup();
    return true;
  } catch (error) {
    const isTimeout = error?.name === "TimeoutError" || error?.name === "AbortError";

    await setPopupState({
      status: "error",
      requestedWord,
      title: isTimeout ? "Request timed out" : "Connection failed",
      message: isTimeout
        ? "The dictionary server took too long to respond. Try again."
        : "Could not reach the Vocab-Bucket server. Check your internet connection.",
    });
    await setActionBadge("!", BADGE_COLORS.ERROR);
    if (!popupOpened) await tryOpenPopup();
    return false;
  }
}