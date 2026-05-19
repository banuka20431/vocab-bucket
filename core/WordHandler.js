/**
 * fetches meta data on given word
 * @param {string} word - word for metadata request
 * @return {object|false} - false if empty respond occured, object of metadata if extraction succeededF
 */

import { config } from "../config.js";
import { VocabularyExtractor } from "./VocabularyExtractor.js";

export const fetchWordMetaData = async (word) => {
  const savedWords = await getSavedWords();

  if (checkForDuplicates(savedWords, word)) {
    await openPopupWordAlreadySaved();
    return false;
  }

  console.log(`fetching the metadata of the word ${word}.`);
  console.log(`URL: ${config.API_URL}/${word}?key=${config.API_KEY}`);

  await fetch(`${config.API_URL}/${word}?key=${config.API_KEY}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then(async (data) => {
      if (data?.length == 0) {
        return false;
      }

      console.log(`Response json`, data);
      const extractor = new VocabularyExtractor(data[0]);
      const wordMetaData = extractor.getMetaData();
      console.log(`extracted metadata:\n`, wordMetaData);

      console.log(
        word,
        wordMetaData.spelling,
        isExactWord(wordMetaData.spelling, word),
      );

      // check for incorrect word fetches
      if (!isExactWord(wordMetaData.spelling, word)) {
        console.log("Exact word unavailable...");
        await cacheMetaData(wordMetaData);
        await openPopupExactWordNonExist();
        await chrome.storage.local.set({ wordUnavaiable: true });
        return;
      }

      await cacheMetaData(wordMetaData);
      await openPopupConfirmWordSave();
    })
    .catch((error) => console.error("Fetch error:", error));
};

async function openPopupWordAlreadySaved() {
  console.log("Word already saved. Aborting API call...");

  await chrome.action.setPopup({
    popup: "../popup/flash/already_saved/struct.html",
  });
  await new Promise((resolve) => setTimeout(resolve, 100));
  await chrome.action.openPopup();

  await chrome.action.setPopup({
    popup: "../popup/main.html",
  });
}

async function openPopupExactWordNonExist() {
  await chrome.action.setPopup({
    popup: "../popup/flash/word_unavailable/struct.html",
  });
  await new Promise((resolve) => setTimeout(resolve, 100));
  await chrome.action.openPopup();

  await chrome.action.setPopup({
    popup: "../popup/main.html",
  });
}

async function openPopupConfirmWordSave() {
  await chrome.action.setPopup({
    popup: "../popup/save_conf/struct.html",
  });
  await new Promise((resolve) => setTimeout(resolve, 100));
  await chrome.action.openPopup();

  await chrome.action.setPopup({
    popup: "../popup/main.html",
  });
}

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
  if (checkForDuplicates(savedWords, metadata.spelling)) return;
  const updatedWords = [...result.savedWords, metadata];
  await chrome.storage.local.set({ savedWords: updatedWords });
  console.log(`Word saved: ${metadata.spelling}`);
}

export const checkForDuplicates = (wordMetadataList, word) => {
  console.log(`checking for duplicates of the word: ${word.toLowerCase()}`);
  let duclicatesFound = false;

  wordMetadataList.forEach((wordMetaData) => {
    console.log(
      `${wordMetaData.spelling.toLowerCase()}: ${wordMetaData.spelling.toLowerCase() === word.toLowerCase() ? "Yes" : "No"}`,
    );
    duclicatesFound = wordMetaData.spelling.toLowerCase() == word.toLowerCase();
  });

  return duclicatesFound;
};

export const isExactWord = (fetchedWord, requiredWord) => {
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
