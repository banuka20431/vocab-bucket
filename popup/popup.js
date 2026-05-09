const displaySavedWords = async () => {
  const wordList = document.querySelector(".words-list");
  const wordCount = document.getElementById("word-count");
  const data = await chrome.storage.local.get({ savedWords: [] });
  const words = data.savedWords;

  if (words.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "empty-state";
    emptyItem.textContent = "No words saved yet.";
    wordList.appendChild(emptyItem);
    wordCount.textContent = "0 words saved";
    return;
  }

  wordCount.textContent = `${words.length} words saved`;

  (Array.isArray(words) ? words : []).forEach((word) => {
    const li = document.createElement("li");
    li.className = "word-list-item";

    const wordLabel = document.createElement("span");
    wordLabel.className = "word";
    wordLabel.textContent = `${word}`;

    const definition = document.createElement("p");
    definition.className = "definition";
    definition.textContent = "Definition coming soon.";

    li.appendChild(wordLabel);
    li.appendChild(definition);
    wordList.appendChild(li);
  });
};

try {
  displaySavedWords();
} catch (error) {
  console.error("Failed to render word list:", error);
}
