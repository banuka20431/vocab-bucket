import {
  saveWord,
  getCachedWordMetaData,
} from "../../../core/WordHandler.js";

const wordElement = document.querySelector(".word");
const definitionElement = document.querySelector(".definition");
const saveBtn = document.querySelector("#save-btn");
const closeBtn = document.getElementById("close-btn");

const word = await getCachedWordMetaData();

console.log("last saved word: ", word);

wordElement.textContent = word.spelling ?? "<ERROR>";
definitionElement.textContent = word.definition.short ?? "<ERROR>";

if (closeBtn) closeBtn.addEventListener("click", () => window.close());

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") window.close();
});

saveBtn.addEventListener("click", async () => {
  const word = wordElement.textContent.trim();
  if (word.length == 0) return;
  await saveWord(await getCachedWordMetaData());
  window.close();
  await chrome.storage.local.remove("selectedWord");
  await chrome.action.setPopup({ popup: "popup/main.html" });
});
