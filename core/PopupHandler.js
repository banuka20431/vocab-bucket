
export async function openPopupWordAlreadySaved() {
  console.log("Word already saved. Aborting API call...");

  await chrome.action.setPopup({
    popup: "../popup/flash/already_saved/struct.html",
  });
  await new Promise((resolve) => setTimeout(resolve, 100));
  await chrome.action.openPopup();

  await chrome.action.setPopup({
    popup: "../popup/main.html",
  });
}

export async function openPopupExactWordNonExist() {
  await chrome.action.setPopup({
    popup: "../popup/flash/word_unavailable/struct.html",
  });
  await new Promise((resolve) => setTimeout(resolve, 100));
  await chrome.action.openPopup();

  await chrome.action.setPopup({
    popup: "../popup/main.html",
  });
}

export async function openPopupConfirmWordSave() {
  await chrome.action.setPopup({
    popup: "../popup/save_conf/struct.html",
  });
  await new Promise((resolve) => setTimeout(resolve, 100));
  await chrome.action.openPopup();

  await chrome.action.setPopup({
    popup: "../popup/main.html",
  });
}