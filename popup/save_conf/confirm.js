import { saveWord, getCachedWordMetaData } from "../../core/WordHandler.js";

const discardBtn = document.querySelector(".discard-btn");
const saveBtn = document.querySelector(".save-btn");
const defRecheckbtn = document.querySelector(".recheck-def-btn");
const wordElement = document.querySelector(".word");
const definitionElement = document.querySelector(".definition");

async function updateUI() {
  const selectedWord = await getCachedWordMetaData();
  wordElement.textContent = selectedWord ? selectedWord.spelling: "<ERROR>";
  definitionElement.textContent = selectedWord ? selectedWord.definition.short : "<ERROR>";;
}

discardBtn.addEventListener("click", async () => {
  await chrome.action.setPopup({ popup: "popup/main.html" });
  await chrome.storage.local.remove("selectedWord");
  window.close();
});

saveBtn.addEventListener("click", async () => {
  const word = wordElement.textContent.trim();
  if (word.length == 0) return;
  saveWord(await getCachedWordMetaData(word));
  window.close();
  await chrome.action.setPopup({ popup: "popup/main.html" });
});

document.addEventListener("DOMContentLoaded", () => {
  updateUI();
});

