/*
Setup the context the menu 
*/

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "saveWord",
    title: "Save '%s' to Vocab-Bucket",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "saveWord" && info.selectionText) {
    saveWordToList(info.selectionText);
  }
});

/*
Save words to local storage
*/
async function saveWordToList(word) {
  const result = await chrome.storage.local.get({ savedWords: [] });
  const updatedWords = [...result.savedWords, word.trim()];

  await chrome.storage.local.set({ savedWords: updatedWords });

  console.log(`Word saved: ${word}`);
}

/*
Initialize save word with key combo
*/

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  return tab;
}

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "save-to-vocab-bucket") {
    const currentTab = await getCurrentTab();

    chrome.scripting.executeScript(
      {
        target: { tabId: currentTab.id },
        func: () => window.getSelection().toString(),
      },
      async (selection) => {
        const word = selection[0].result.trim();
        if (word) saveWordToList(word);
      },
    );
  }
});

/*
Continue the search after interception
*/

const waitForTabLoad = (tabId) => {
  return new Promise((resolve) => {
    const listener = (updatedTabId, changeInfo) => {
      if (updatedTabId === tabId && changeInfo.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
};

const grabAutoCorrectedWord = () => {
  const autoCorrectedWordContainer = document.querySelector("#fprs");

  if (!autoCorrectedWordContainer) {
    return null;
  }

  const autoCorrectedWordElement =
    autoCorrectedWordContainer.querySelector(":scope > a > b > i");

  return autoCorrectedWordElement
    ? autoCorrectedWordElement.textContent.trim()
    : flase;
};

chrome.omnibox.onInputEntered.addListener(async (text) => {
  console.log("Acquiring tab id...");
  const currentTab = await getCurrentTab();
  const searchUrl = `https://www.google.com/search?q=${text}`;

  console.log("Searching for the word:", text);
  await chrome.tabs.update({ url: searchUrl });
  console.log("Waiting for web results..");
  await waitForTabLoad(currentTab.id);
  console.log("Checking for auto corrected word...");

  try {
    const autoCorrectedWords = await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: grabAutoCorrectedWord,
    });
    
    const autoCorrectedWord = autoCorrectedWords[0].result;
    
    if (autoCorrectedWord) {
      console.log(`corrected word ${autoCorrectedWords[0].result}`);
      saveWordToList(autoCorrectedWord);
    }
  } catch (err) {
    console.error(`Failer while trying to scrap auto corrections ${err}`);
  }
});
