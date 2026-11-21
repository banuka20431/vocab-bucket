export const SAVED_WORDS_KEY = "savedWords";
export const UI_STATE_KEY = "popupState";
export const UNSEEN_UPDATE_KEY = "unseenUpdateVersion";

const STALE_LOADING_MS = 15_000;
const STALE_STATE_MS = 5 * 60_000;

/**
 * Normalizes a word for consistent matching and backend requests.
 * @param {string} word
 * @returns {string}
 */
export function normalizeWord(word) {
  if (typeof word !== "string") return "";
  return word.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Case- and whitespace-insensitive comparison for two words.
 * @param {string} str1
 * @param {string} str2
 * @returns {boolean}
 */
export function isExactWord(str1, str2) {
  const a = normalizeWord(str1);
  const b = normalizeWord(str2);
  return a.length > 0 && a === b;
}

/**
 * Retrieves all user-saved words from local storage.
 * @returns {Promise<Array<object>>}
 */
export async function getSavedWords() {
  const result = await chrome.storage.local.get({ [SAVED_WORDS_KEY]: [] });
  return Array.isArray(result[SAVED_WORDS_KEY]) ? result[SAVED_WORDS_KEY] : [];
}

/**
 * Checks whether a word already exists in the user's saved lexicon.
 * @param {string} word
 * @returns {Promise<boolean>}
 */
export async function existsInSavedWords(word) {
  const normalized = normalizeWord(word);
  if (!normalized) return false;

  const savedWords = await getSavedWords();
  return savedWords.some((entry) => isExactWord(entry?.spelling, normalized));
}

/**
 * Saves a word metadata object locally while preventing duplicates.
 * @param {object} metadata
 * @returns {Promise<{ saved: boolean, reason?: string }>}
 */
export async function saveWord(metadata) {
  if (
    !metadata ||
    typeof metadata.spelling !== "string" ||
    !metadata.spelling.trim()
  ) {
    return { saved: false, reason: "invalid" };
  }

  const savedWords = await getSavedWords();
  if (savedWords.some((entry) => isExactWord(entry?.spelling, metadata.spelling))) {
    return { saved: false, reason: "duplicate" };
  }

  const nextSavedWords = [...savedWords, metadata];
  await chrome.storage.local.set({ [SAVED_WORDS_KEY]: nextSavedWords });
  return { saved: true };
}

/**
 * Removes a saved word by spelling (case-insensitive) and returns the remaining list.
 * @param {string} spelling
 * @returns {Promise<Array<object>>}
 */
export async function removeWord(spelling) {
  const savedWords = await getSavedWords();
  const nextSavedWords = savedWords.filter(
    (entry) => !isExactWord(entry?.spelling, spelling),
  );

  if (nextSavedWords.length !== savedWords.length) {
    await chrome.storage.local.set({ [SAVED_WORDS_KEY]: nextSavedWords });
  }
  return nextSavedWords;
}

/**
 * Stores transient lookup workflow state in MV3 session storage.
 * @param {object} state
 */
export async function setPopupState(state) {
  await chrome.storage.session.set({
    [UI_STATE_KEY]: {
      ...state,
      updatedAt: Date.now(),
    },
  });
}

/**
 * Reads active transient popup state, expiring stale states automatically.
 * @returns {Promise<object|null>}
 */
export async function getPopupState() {
  const result = await chrome.storage.session.get(UI_STATE_KEY);
  const state = result[UI_STATE_KEY];
  if (!state || typeof state !== "object") return null;

  const age = Date.now() - (state.updatedAt || 0);
  if (state.status === "loading" && age > STALE_LOADING_MS) {
    await clearPopupState();
    return null;
  }
  if (age > STALE_STATE_MS) {
    await clearPopupState();
    return null;
  }

  return state;
}

/**
 * Clears transient popup workflow state.
 */
export async function clearPopupState() {
  await chrome.storage.session.remove(UI_STATE_KEY);
}

/**
 * Saves an unseen major-version string to show the "What's new" banner once.
 * @param {string} version
 */
export async function setUnseenUpdateVersion(version) {
  await chrome.storage.local.set({ [UNSEEN_UPDATE_KEY]: version });
}

/**
 * Returns the unseen update version if the user has not dismissed it yet.
 * @returns {Promise<string|null>}
 */
export async function getUnseenUpdateVersion() {
  const result = await chrome.storage.local.get(UNSEEN_UPDATE_KEY);
  return typeof result[UNSEEN_UPDATE_KEY] === "string"
    ? result[UNSEEN_UPDATE_KEY]
    : null;
}

/**
 * Clears the unseen update flag once dismissed.
 */
export async function clearUnseenUpdateVersion() {
  await chrome.storage.local.remove(UNSEEN_UPDATE_KEY);
}