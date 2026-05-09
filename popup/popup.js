const displaySavedWords = async () => {
  const data = await chrome.storage.local.get({ savedWords: [] });
  const wordList = document.querySelector(".word-list");
  const words = data.savedWords;

  wordList.innerHTML = "";

  if (words.length === 0) {
    wordList.innerHTML = "<li>No words saved yet!</li>";
    return;
  }

  words.array.forEach((word) => {
    const li = document.createElement("li");
    li.className = "word-list-item";
    li.innerHTML = `
    <li class="word-list-item">
        <label for="word" class="word">${word}</label>
        <p for="definition" class="definition">
            Lorem ipsum dolor sit amet consectetur adipisicing elit.
        </p>
    </li>`;

    wordList.appendChild(li);
  });
};

try {
  await displaySavedWords();
} catch (error) {
  console.error("Failed to render word list:", error);
}
