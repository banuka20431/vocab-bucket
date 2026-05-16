import {
  fetchWordMetaData,
  saveWord,
  getCachedWordMetaData,
} from "../core/WordHandler.js";

// Register the context menu item used to save selected text.
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "saveWord",
    title: "Save '%s' to Vocab-Bucket",
    contexts: ["selection"],
  });
});

// Open the confirmation popup after the user saves text from the context menu.
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "saveWord" && info.selectionText) {
    try {
      await fetchWordMetaData(info.selectionText);
      await openConfirmationPopup();
    } catch (error) {
      console.error(
        `Error occured while setting up the confirmation menu: ${error}`,
      );
    }
  }
});

// Save the current text selection when the configured keyboard command runs.
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "save-to-vocab-bucket") {
    const currentTab = await fetchActiveTab(); 

    chrome.scripting.executeScript(
      {
        target: { tabId: currentTab.id },
        func: () => window.getSelection().toString(),
      },
      handleWordSaveCommand,
    );
  }
});

chrome.omnibox.onInputEntered.addListener(async (searchedTerm) => {
  console.log("Acquiring tab id...");
  const currentTab = await fetchActiveTab();
  const searchUrl = `https://www.google.com/search?q=${searchedTerm}`;

  console.log("Searching for the word:", searchedTerm);
  await chrome.tabs.update({ url: searchUrl });
  console.log("Waiting for web results..");
  await waitForTabLoad(currentTab.id);
  console.log("Checking for auto corrected word...");

  try {
    // If Google corrected the word, store the suggested word instead.
    const autoCorrectedWords = await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: grabAutoCorrectedWord,
    });

    const autoCorrectedWord = autoCorrectedWords[0].result;

    if (autoCorrectedWord) {
      console.log(`corrected word ${autoCorrectedWords[0].result}`);
      await fetchWordMetaData(autoCorrectedWord);
      openConfirmationPopup();
    } else {
      await fetchWordMetaData(searchedTerm);
      await openConfirmationPopup();
    }
  } catch (err) {
    console.error(`Failer while trying to scrap auto corrections ${err}`);
  }
});

// Extract Google’s autocorrect suggestion from the search results page.
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

const handleWordSaveCommand = async (selection) => {
  const word = selection[0].result.trim();
  if (word) {
    try {
      await fetchWordMetaData(word);
      await openConfirmationPopup();
    } catch (error) {
      console.error(
        `Error occured while setting up the confirmation menu: ${error}`,
      );
    }
  }
};

// Wait until a tab finishes loading before scraping the result page.
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

// Read the active tab so keyboard shortcuts can inspect the current page.
async function fetchActiveTab() {
  const params = {
    active: true,
    lastFocusedWindow: true,
  };
  const [tab] = await chrome.tabs.query(params);
  return tab;
}

async function openConfirmationPopup() {
  await chrome.action.setPopup({
    popup: "popup/save_conf/confirm.html",
  });
  await new Promise((resolve) => setTimeout(resolve, 100));
  await chrome.action.openPopup();
}
