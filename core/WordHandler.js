import { config } from "../config.js";
import {
  openPopupConfirmWordSave,
  openPopupWordAlreadySaved,
  openPopupExactWordNonExist,
  openFetchFailedPopup,
  openLoadingPopup
} from "./PopupHandler.js";

/**
 * fetches meta data on given word and cache them locally
 * @param {string} word - word for metadata request
 * @return {object|false} - false if empty respond occured, object of metadata if extraction succeeded
 * @author {banuka20431}
 */
export const loadWordInfo = async (requestedWord) => {
  try {
    // check whether requested word already in user's bucket
    if (await existsInSavedWords(requestedWord)) {
      await openPopupWordAlreadySaved();
      await clearCachedMetadata();
      return false;
    }

    await openLoadingPopup();

    console.log(`Fetching the metadata for the word: ${requestedWord}`);

    // retrive word metadata
    const res = await fetch(config.API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ word: requestedWord }),
    });

    
    if (!res.ok) {
      await openFetchFailedPopup();
      console.error(`Metadata fetch failed with status: ${res.status}`);
      return false;
    }

    const data = await res.json();

    const meta = JSON.parse(data.meta);

    if (!meta) {
      console.log("No valid metadata found for this word.");
      return false;
    }

    console.log(`fetched metadata: ${meta}`);

    const fetchedWord = meta.spelling;

    // check whether API fetched exactly requested word
    if (!isExactWord(fetchedWord, requestedWord)) {
      console.log("Exact word unavailable...");
      await cacheMetaData(meta);
      await chrome.storage.local.set({ wordUnavaiable: true });
      await openPopupExactWordNonExist();
      return false;
    }

    // cache word metadata before asking for save confirmation
    await cacheMetaData(meta);
    await openPopupConfirmWordSave();

    return true;
  } catch (error) {
    console.error("Fetch error in loadWordInfo:", error);
    return false;
  }
};

// Functions that handle locally cached word before confirmation for permenet storing

/**
 * cache metadata locally
 * @param {object} metadata
 */
export async function cacheMetaData(metadata) {
  await clearCachedMetadata();
  console.log(`Caching metadata: ${metadata.spelling}}.`);
  await chrome.storage.local.set({ selectedWord: metadata });
}

/**
 * retrive metadata of locally cached word
 * @return {Object|null}
 */
export async function getCachedWordMetaData() {
  const res = await chrome.storage.local.get("selectedWord");
  console.log("retrived cached metadata", res);
  if (res) {
    return res.selectedWord;
  }
  return null;
}

/**
 * remove locally cached metadata
 */
export async function clearCachedMetadata() {
  await chrome.storage.local.remove("selectedWord");
}

// Functions that handle locally stored word metadata (words saved by the user)

/**
 * stores metadata of a word locally
 * @param {object} metadata - metadata to be stored locally
 */
export async function saveWord(metadata) {
  const result = await chrome.storage.local.get({ savedWords: [] });

  const savedWords = result.savedWords;
  const word = metadata.spelling;

  const updatedWords = [...savedWords, metadata];
  await chrome.storage.local.set({ savedWords: updatedWords });
  console.log(`Word saved: ${word}}`);
}

/**
 * get metadata of locally stored words
 */
export async function getSavedWords() {
  const result = await chrome.storage.local.get({ savedWords: [] });
  return result.savedWords ?? [];
}

/**
 * check if a word already saved by the user
 * @param {string} word - newly requested word
 * @return {bool} - true if requested word saved before false if not
 */
export const existsInSavedWords = async (word) => {
  if (!word) return false;

  const savedWords = await getSavedWords();

  console.log(savedWords);

  if (!Array.isArray(savedWords)) {
    console.log("Storage is empty or invalid. No duplicates found.");
    return false;
  }

  console.log(`Checking for duplicates of the word: ${word.toLowerCase()}`);

  return savedWords.some((savedWord) => isExactWord(savedWord?.spelling, word));
};

// Helper functions

/**
 * check if two words equal ignoring case
 * @param {string} fetchedWord
 * @param {string} requiredWord
 * @return {bool}
 */
export const isExactWord = (str1, str2) => {
  if (str1 == null) return false;
  if (str2 == null) return false;
  return str1.toLowerCase() === str2.toLowerCase();
};
