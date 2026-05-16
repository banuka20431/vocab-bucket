/**
 * fetches meta data on given word
 * @param {string} word - word for metadata request
 * @return {object|false} - false if empty respond occured, object of metadata if extraction succeededF
 */

import { config } from "../config.js";
import { VocabularyExtractor } from "./VocabularyExtractor.js";

export const fetchWordMetaData = async (word) => {
  console.log(`fetching the metadata of the word ${word}.`);
  await fetch(`${config.API_URL}"/${word}?key=${config.API_KEY}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then(async (data) => {
      if (data?.length == 0) {
        return false;
      } else {
        console.log(`Response json`, data);
        const extractor = new VocabularyExtractor(data[0]);
        const wordMetaData = extractor.getMetaData();
        console.log(`extracted metadata:\n`, wordMetaData);
        cacheMetaData(wordMetaData);
      }
    })
    .catch((error) => console.error("Fetch error:", error));
};

async function cacheMetaData(metadata) {
  console.log(`Caching metadata: ${metadata.spelling}}.`);
  await chrome.storage.local.set({ selectedWord: metadata });
}

export async function saveWord(metadata) {
  const result = await chrome.storage.local.get({ savedWords: [] });
  const savedWords = result.savedWords;
  if (checkForDuplicates(savedWords)) return;
  const updatedWords = [...result.savedWords, metadata];
  await chrome.storage.local.set({ savedWords: updatedWords });
  console.log(`Word saved: ${metadata.spelling}`);
}

const checkForDuplicates = (wordMetadataList, word) => {
  wordMetadataList.forEach((wordMetaData) => {
    if (wordMetaData.spelling == word) return true;
  });
  return false;
};

export async function getCachedWordMetaData() {
  const res = await chrome.storage.local.get("selectedWord");
  console.log("retrived metadata", res);
  if (res) {
    return res.selectedWord;
  }
  return null;
}
