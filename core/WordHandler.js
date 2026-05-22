/**
 * fetches meta data on given word
 * @param {string} word - word for metadata request
 * @return {object|false} - false if empty respond occured, object of metadata if extraction succeeded
 * @author {banuka20431}
 */

import { config } from "../config.js";
import {
  openPopupConfirmWordSave,
  openPopupWordAlreadySaved,
  openPopupExactWordNonExist,
} from "./PopupHandler.js";

export const loadWordInfo = async (requestedWord) => {
  try {
    // 1. Check whether requested word already in user's bucket
    if (await existsInSavedWords(requestedWord)) {
      await openPopupWordAlreadySaved();
      return false;
    }

    console.log(`Fetching the metadata for the word: ${requestedWord}`);

    const reqBody = {
      word: requestedWord,
    };

    const res = await fetch(config.API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(reqBody),
    });

    if (!res.ok) {
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

    // 5. Check whether API fetched exactly requested word
    if (!isExactWord(fetchedWord, requestedWord)) {
      console.log("Exact word unavailable...");
      await cacheMetaData(meta);
      await chrome.storage.local.set({ wordUnavaiable: true }); // Note: typo 'wordUnavaiable' in your original code
      await openPopupExactWordNonExist();
      return false;
    }

    // 6. Cache word metadata before asking for save confirmation
    await cacheMetaData(meta);
    await openPopupConfirmWordSave();

    return true;
  } catch (error) {
    console.error("Fetch error in loadWordInfo:", error);
    return false;
  }
};

export async function getSavedWords() {
  const result = await chrome.storage.local.get({ savedWords: [] });
  return result.savedWords ?? [];
}

export async function cacheMetaData(metadata) {
  await clearCachedMetadata();
  console.log(`Caching metadata: ${metadata.spelling}}.`);
  await chrome.storage.local.set({ selectedWord: metadata });
}

export async function clearCachedMetadata() {
  await chrome.storage.local.remove("selectedWord");
}

export async function saveWord(metadata) {
  const result = await chrome.storage.local.get({ savedWords: [] });

  const savedWords = result.savedWords;
  const word = metadata.spelling;

  const updatedWords = [...savedWords, metadata];
  await chrome.storage.local.set({ savedWords: updatedWords });
  console.log(`Word saved: ${word}}`);
}

export const existsInSavedWords = async (word) => {
  if (!word) return false;

  const savedWords = await getSavedWords();

  console.log(savedWords);

  if (!Array.isArray(savedWords)) {
    console.log("Storage is empty or invalid. No duplicates found.");
    return false;
  }

  console.log(`Checking for duplicates of the word: ${word.toLowerCase()}`);

  return savedWords.some(
    (savedWord) => savedWord?.spelling?.toLowerCase() === word.toLowerCase(),
  );
};

export const isExactWord = (fetchedWord, requiredWord) => {
  console.log(typeof fetchedWord);
  return fetchedWord.toLowerCase() === requiredWord.toLowerCase();
};

export async function getCachedWordMetaData() {
  const res = await chrome.storage.local.get("selectedWord");
  console.log("retrived cached metadata", res);
  if (res) {
    return res.selectedWord;
  }
  return null;
}
