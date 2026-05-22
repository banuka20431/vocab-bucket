import { loadWordInfo } from "../core/WordHandler.js";
import { openPopupConfirmWordSave } from "../core/PopupHandler.js";

// Register the context menu item used to save selected text.
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "saveWord",
    title: "Save '%s' to Vocab-Bucket",
    contexts: ["selection"],
  });
});

// Handle word save through context menu option
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "saveWord" && info.selectionText) {
    await loadWordInfo(info.selectionText);
  }
});

// Handle key binding shortcut for word saving
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
  searchedTerm = searchedTerm.trim().toLowerCase();

  console.log("Acquiring tab id...");
  const currentTab = await fetchActiveTab();
  const searchUrl = `https://www.google.com/search?q=${searchedTerm}`;

  console.log("Searching for the word:", searchedTerm);
  await chrome.tabs.update({ url: searchUrl });
  console.log("Waiting for web results..");
  await waitForTabLoad(currentTab.id);
  console.log("Checking for auto corrected word...");

  try {
    let autoCorrectedWord = undefined;
    // bypass google 'recursion' easter egg
    if (searchedTerm != "recursion") {
      // If Google corrected the word, store the suggested word instead.
      const autoCorrectedWords = await chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        func: grabAutoCorrectedWord,
      });

      autoCorrectedWord = autoCorrectedWords[0].result;

      if (autoCorrectedWord)
        console.log(`corrected word ${autoCorrectedWords[0].result}`);
    }

    if (
      await loadWordInfo(autoCorrectedWord ? autoCorrectedWord : searchedTerm)
    )
      return;

    await openPopupConfirmWordSave();
  } catch (err) {
    console.error(`Failer while trying to scrap auto corrections ${err}`);
  }
});

// Extract Google’s autocorrect suggestion from the search results page.
const grabAutoCorrectedWord = () => {
  /*
   handles 'These are results for [auto_corrected_word]' scenario 
   where Google is more confident about the spelling correction
  */
  let autoCorrectedWordContainer = document.querySelector("#fprs");

  if (autoCorrectedWordContainer === null) {
    /*
   handles 'Did you mean [auto_corrected_word]' scenario where Google is more confident about the spelling correction
  */
    autoCorrectedWordContainer = document.querySelector(".QRYxYe.NNMgCf");
  }

  if (!autoCorrectedWordContainer) return null;

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
      if ((await loadWordInfo(word)) == false) return;
      await openPopupConfirmWordSave();
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

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    const tallyUninstallUrl = "https://tally.so/r/NpRANb";
    
    chrome.runtime.setUninstallURL(tallyUninstallUrl, () => {
      if (chrome.runtime.lastError) {
        console.error("Error setting uninstall URL:", chrome.runtime.lastError);
      } else {
        console.log("Uninstall URL successfully set.");
      }
    });
  }
});