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

async function getTabId() {
  const [tabData] = await chrome.tabs.query({ active: true, currentWindow: true});
  return tabData?.id;
}

chrome.commands.onCommand.addListener( async (command) => {
  if (command === "save-to-vocab-bucket") {
    const TAB_ID = await getTabId();
    console.log(TAB_ID);
    chrome.scripting.executeScript(
      {
        target: { tabId: TAB_ID },
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
Setup grabbing auto corrected word if exists
*/

chrome.omnibox.onInputEntered.addListener((text) => {
  console.log("Search query:", text);
  const searchUrl = `https://www.google.com/search?q=${text}`;

  chrome.tabs.update({ url: searchUrl });
});

/* 
function getAutoCorrection() {
  const autocorrectElement = document.querySelector("p.QRYxYe.NNMgCf.AwaEsc");
  if (autocorrectElement != undefined) {
    console.log(autocorrectElement.closest("i").innerText);
  }
}

async function getActiveTabId() {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  return tab?.id;
}

async function injectScript() {
  const targetId = await getActiveTabId();
  if (targetId) {
    chrome.scripting.executeScript({
      target: { tabId: targetId },
      func: getAutoCorrection,
    })
    .then(() => console.log("Script injected into tab:", targetId))
    .catch((err) => console.error("Injection failed:", err));
  }
}

injectScript(); */