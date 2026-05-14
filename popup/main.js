const displaySavedWords = async () => {
  const wordList = document.querySelector(".words-list");
  const wordCount = document.getElementById("word-count");
  const data = await chrome.storage.local.get({ savedWords: [] });
  const words = data.savedWords;

  if (words.length === 0) {
    setupInitialDisplay(wordList);
    return;
  }

  wordCount.textContent = `${words.length} ${words.length == 1 ? "word" : "words"} saved`;

  if (!Array.isArray(words)) return;

  let wordId = 1;

  words.forEach((word) => {
    const li = document.createElement("li");
    li.className = "word-list-item";

    const wordLabel = document.createElement("span");
    wordLabel.className = "word";
    wordLabel.textContent = `${word}`;

    const definition = document.createElement("p");
    definition.className = "definition";
    definition.textContent = "Definition coming soon.";

    const removeBtn = document.createElement("button");
    removeBtn.id = `${wordId}`;
    removeBtn.textContent = "Remove";
    removeBtn.classList.add("control", "warning");

    removeBtn.addEventListener("click", async (event) => {
      const id = +event.target.id;
      if (id == NaN) return;
      if (id <= 0) return;
      const result = await chrome.storage.local.get({ savedWords: [] });
      if (result.savedWords.length == 0 || result.savedWords.length < id)
        return;
      const [removedWord] = result.savedWords.splice(id - 1, 1);
      await chrome.storage.local.set({ savedWords: result.savedWords });
      await new Promise((resolve) => setTimeout(resolve, 100));
      console.log(`Removed word ${removedWord}`);

      event.target.closest("li")?.remove();
      if (result.savedWords.length == 0) {
        setupInitialDisplay(wordList);
      } else {
        wordCount.textContent = `${result.savedWords.length} ${result.savedWords.length == 1 ? "word" : "words"} saved`;
      }
    });

    const recheckDefBtn = document.createElement("button");
    recheckDefBtn.id = `${wordId}`;
    recheckDefBtn.textContent = "Recheck definition";
    recheckDefBtn.classList.add("control", "info");

    li.appendChild(wordLabel);
    li.appendChild(definition);
    li.appendChild(removeBtn);
    li.appendChild(recheckDefBtn);
    wordList.appendChild(li);
  });
};

function setupInitialDisplay(wordList) {
  const emptyItem = document.createElement("li");
  emptyItem.className = "empty-state";
  emptyItem.textContent = "No words saved yet.";
  wordList.appendChild(emptyItem);
  wordCount.textContent = "0 words saved";
}

document.addEventListener("DOMContentLoaded", () => {
  try {
    displaySavedWords();
  } catch (error) {
    console.error("Failed to render word list:", error);
  }
});
