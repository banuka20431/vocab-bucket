document.addEventListener("DOMContentLoaded", () => {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "close-loading-popup") {
    window.close();
  }
});
});
