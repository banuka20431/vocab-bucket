import { saveWord, getCachedWordMetaData } from "../../../core/WordHandler.js";

const wordElement = document.querySelector(".word");
const definitionElement = document.querySelector(".definition");
const metadata = await getCachedWordMetaData();
console.log(metadata);
wordElement.textContent = metadata.spelling;
definitionElement.textContent = metadata.definition.short;

const closeBtn = document.getElementById("close-btn");
if (closeBtn) closeBtn.addEventListener("click", () => window.close());

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") window.close();
});

const saveBtn = document.querySelector("#save-btn");

saveBtn.addEventListener("click", async () => {
  const word = wordElement.textContent.trim();
  if (word.length == 0) return;
  saveWord(await getCachedWordMetaData());
  window.close();
  await chrome.storage.local.remove("selectedWord");
  await chrome.action.setPopup({ popup: "popup/main.html" });
});
