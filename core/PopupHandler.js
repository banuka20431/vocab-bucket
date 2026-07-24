export async function openPopupWordAlreadySaved() {
  console.log("Word already saved. Aborting API call...");

  openPopup("../popup/already_saved/struct.html");
}

export async function openPopupExactWordNonExist() {
  openPopup("../popup/word_unavailable/struct.html");
}

export async function openPopupConfirmWordSave() {
  openPopup("../popup/save_conf/struct.html");
}

export async function openFetchFailedPopup() {
  openPopup("../popup/fetch_failed/struct.html");
}

export async function openLoadingPopup() {
  let wasLoading = false;
  openPopup("../popup/loading/struct.html", wasLoading);
}

async function openPopup(
  uri,
  wasLoading = true,
  loadingDelay = 150,
  after = "../popup/main.html",
) {
  if (wasLoading) {
    try {
      await chrome.runtime.sendMessage({ action: "close-loading-popup" });
      await new Promise((resolve) => setTimeout(resolve, 50));
    } catch (err) {
      console.log("No active popup was open to close.");
    }
  }

  await chrome.action.setPopup({ popup: uri });

  await new Promise((resolve) => setTimeout(resolve, loadingDelay));

  await chrome.action.openPopup();

  await chrome.action.setPopup({ popup: after });
}
