const displaySavedWords = async () => {
  const wordList = document.querySelector(".words-list");
  const wordCount = document.getElementById("word-count");
  const data = await chrome.storage.local.get({ savedWords: [] });
  const words = data.savedWords;

  if (!Array.isArray(words) || words.length === 0) {
    setupInitialDisplay(wordList, wordCount);
    return;
  }

  wordCount.textContent = `${words.length} ${words.length == 1 ? "word" : "words"} saved`;

  words.forEach((word) => {
    const li = document.createElement("li");
    li.className = "word-list-item";

    const header = document.createElement("div");
    header.className = "word-header";

    const wordLabel = document.createElement("span");
    wordLabel.className = "word";
    wordLabel.textContent = `${word.spelling}`;

    const timestamp = document.createElement("span");
    timestamp.className = "timestamp";
    timestamp.textContent = formatSavedTimestamp(word.timestamp);
    timestamp.title = "Saved time";

    header.appendChild(wordLabel);
    header.appendChild(timestamp);

    const metaRow = document.createElement("div");
    metaRow.className = "word-meta";

    const pronunciation = document.createElement("span");
    pronunciation.className = "meta-chip pronunciation";
    pronunciation.textContent = `/${word.pronounciation || word.pronunciation || "N/A"}/`;

    const category = document.createElement("span");
    category.className = "meta-chip category";
    category.textContent = word.category || "N/A";

    metaRow.appendChild(pronunciation);
    metaRow.appendChild(category);

    const definition = document.createElement("p");
    definition.className = "definition";
    definition.textContent = word.definition?.full || word.definition?.short || "No definition available.";

    const exampleBox = document.createElement("div");
    exampleBox.className = "example-box";

    const exampleLabel = document.createElement("p");
    exampleLabel.className = "example-label";
    exampleLabel.textContent = "Usage example";

    const exampleText = document.createElement("p");
    exampleText.className = "example-text";
    exampleText.textContent = getExampleUsage(word.usage);

    exampleBox.appendChild(exampleLabel);
    exampleBox.appendChild(exampleText);

    const actions = document.createElement("div");
    actions.className = "word-actions";

    const playBtn = document.createElement("button");
    playBtn.type = "button";
    playBtn.textContent = "Play audio";
    playBtn.classList.add("control", "info", "audio-control");
    playBtn.disabled = !word.audioURL;

    playBtn.addEventListener("click", async () => {
      if (!word.audioURL) return;

      const audio = new Audio(word.audioURL);
      audio.preload = "none";

      try {
        await audio.play();
      } catch (error) {
        console.error("Unable to play audio clip:", error);
      }
    });

    const removeBtn = document.createElement("button");
    removeBtn.dataset.spelling = word.spelling;
    removeBtn.textContent = "Remove";
    removeBtn.classList.add("control", "warning");

    removeBtn.addEventListener("click", async (event) => {
      const target = event.currentTarget;
      const spelling = target.dataset.spelling;
      if (!spelling) return;

      const result = await chrome.storage.local.get({ savedWords: [] });
      if (result.savedWords.length == 0) return;

      const nextSavedWords = result.savedWords.filter((savedWord) => savedWord.spelling !== spelling);
      if (nextSavedWords.length === result.savedWords.length) return;

      await chrome.storage.local.set({ savedWords: nextSavedWords });
      await new Promise((resolve) => setTimeout(resolve, 100));
      console.log(`Removed word ${spelling}`);

      target.closest("li")?.remove();

      if (nextSavedWords.length == 0) {
        setupInitialDisplay(wordList, wordCount);
      } else {
        wordCount.textContent = `${nextSavedWords.length} ${nextSavedWords.length == 1 ? "word" : "words"} saved`;
      }
    });

    const recheckDefBtn = document.createElement("button");
    recheckDefBtn.textContent = "Recheck definition";
    recheckDefBtn.classList.add("control", "info");

    actions.appendChild(playBtn);
    actions.appendChild(removeBtn);
    actions.appendChild(recheckDefBtn);

    li.appendChild(header);
    li.appendChild(metaRow);
    li.appendChild(definition);
    li.appendChild(exampleBox);
    li.appendChild(actions);
    wordList.appendChild(li);
  });
};

function setupInitialDisplay(wordList, wordCount) {
  wordList.textContent = "";
  const emptyItem = document.createElement("li");
  emptyItem.className = "empty-state";
  emptyItem.textContent = "No words saved yet.";
  wordList.appendChild(emptyItem);
  wordCount.textContent = "0 words saved";
}

function formatSavedTimestamp(value) {
  if (!value) return "Timestamp unavailable";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Timestamp unavailable";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getExampleUsage(usage) {
  if (!Array.isArray(usage) || usage.length === 0) {
    return "No usage example available.";
  }

  return usage[0];
}

document.addEventListener("DOMContentLoaded", () => {
  try {
    displaySavedWords();
  } catch (error) {
    console.error("Failed to render word list:", error);
  }
});
