const discardBtn = document.querySelector(".discard-btn");
const saveBtn = document.querySelector(".save-btn");
const defRecheckbtn = document.querySelector(".recheck-def-btn");
const wordElement = document.querySelector(".word");

async function setWord() {
  const res = await chrome.storage.local.get("selectedWord");
  await new Promise((resolve) => setTimeout(resolve, 100));
  wordElement.textContent = res.selectedWord;
}

async function saveWordToList(word) {
  const result = await chrome.storage.local.get({ savedWords: [] });
  const updatedWords = [...result.savedWords, word.trim()];
  await chrome.storage.local.set({ savedWords: updatedWords });
  console.log(`Word saved: ${word}`);
}

document.addEventListener('DOMContentLoaded', () => {
  setWord();
})

discardBtn.addEventListener("click", async () => {
  await chrome.action.setPopup({ popup: "popup/main.html" });
  await chrome.storage.local.remove("selectedWord");
  window.close();
});
 
saveBtn.addEventListener("click", async () => {
  const word = wordElement.textContent.trim();
  if (word.length == 0) return;
  saveWordToList(word);
  window.close();
  await chrome.action.setPopup({ popup: "popup/main.html" });
});
