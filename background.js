chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const { message, data } = request;

  if (message === "youtube") {
    executeScriptOnYoutubeTab(data.tab.id);
  }
});

async function executeScriptOnYoutubeTab(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    files: ["content-scripts/pip.js"],
  });
}
