const MAX_NUMBER_OF_FAVORITES = 3;

async function initPreview() {
  const youtubePattern = "https://www.youtube.com/watch?v=*";
  const youtubeTabs = (await chrome.tabs.query({ url: youtubePattern })) || [];
  const numberOfTabs = youtubeTabs.length;

  let currentYoutubeTabIdx = 0;

  const previewIndex = document.querySelector(".preview__index");
  const previewTotal = document.querySelector(".preview__total");
  const toggleBtn = document.querySelector(".preview__toggle");
  const prevBtn = document.querySelector(".preview__action-prev");
  const nextBtn = document.querySelector(".preview__action-next");

  if (youtubeTabs.length === 0) {
    setYoutubeIframe(null);
    toggleBtn.classList.add("btn--disabled");
    prevBtn.classList.add("btn--disabled");
    nextBtn.classList.add("btn--disabled");
    return;
  }

  const activeYoutubeTab = youtubeTabs.find((tab, idx) => {
    currentYoutubeTabIdx = idx;
    return tab.active === true;
  });

  if (activeYoutubeTab) {
    setYoutubeIframe(activeYoutubeTab);
  } else {
    currentYoutubeTabIdx = 0;
    setYoutubeIframe(youtubeTabs[currentYoutubeTabIdx]);
  }

  previewIndex.textContent = currentYoutubeTabIdx + 1;
  previewTotal.textContent = numberOfTabs;

  toggleBtn.addEventListener("click", async () => {
    await chrome.runtime.sendMessage({
      message: "youtube",
      data: { tab: youtubeTabs[currentYoutubeTabIdx] },
    });
  });

  prevBtn.addEventListener("click", () => {
    if (currentYoutubeTabIdx === 0) {
      currentYoutubeTabIdx = numberOfTabs - 1;
    } else {
      currentYoutubeTabIdx -= 1;
    }
    setYoutubeIframe(youtubeTabs[currentYoutubeTabIdx]);
    previewIndex.textContent = currentYoutubeTabIdx + 1;
  });

  nextBtn.addEventListener("click", () => {
    if (currentYoutubeTabIdx === numberOfTabs - 1) {
      currentYoutubeTabIdx = 0;
    } else {
      currentYoutubeTabIdx += 1;
    }
    setYoutubeIframe(youtubeTabs[currentYoutubeTabIdx]);
    previewIndex.textContent = currentYoutubeTabIdx + 1;
  });
}

function setYoutubeIframe(tab) {
  const titleEl = document.querySelector(".preview__youtube-title");
  const iframeEl = document.querySelector(".preview__youtube-iframe");

  if (!tab) {
    iframeEl.classList.add("hidden");
    return;
  }

  const youtubeVideoId = tab.url.split("?v=")[1];
  const resizeRatio = 20;

  titleEl.textContent = filterTitle(tab.title);
  iframeEl.src = `https://www.youtube-nocookie.com/embed/${youtubeVideoId}?autoplay=1&mute=1`;
  iframeEl.width = `${16 * resizeRatio}px`;
  iframeEl.height = `${9 * resizeRatio}px`;
}

function filterTitle(title) {
  return title.replace(/^\([0-9]+\) /, "").replace(" - YouTube", "");
}

async function initFavorites() {
  const favoriteTabsData = await chrome.storage.sync.get("favoriteTabs");
  let favoriteTabs = favoriteTabsData.favoriteTabs || [];
  let numberOfFavorites = favoriteTabs?.length || 0;
  let warningTimeout = null;

  const favoritesCount = document.querySelector(".favorites__count");
  const saveBtn = document.querySelector(".favorites__save");
  const saveWarning = document.querySelector(".favorites__save-warning");
  const favoritesTable = document.querySelector(".favorites__table tbody");
  const favoritesRowSample = document.querySelector("#sample-favorites__table-row");
  const favoritesRowTemplate = document.querySelector("#template-favorites__table-row");

  if (numberOfFavorites > 0) {
    favoriteTabs.forEach((tab) => {
      createFavoriteTab(tab);
    });
  }

  async function onSaveBtnClick() {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!activeTab.url.includes("https://www.youtube.com/watch?v=")) {
      saveWarning.classList.remove("hidden");
      if (warningTimeout) {
        clearTimeout(warningTimeout);
      }
      warningTimeout = setTimeout(() => {
        saveWarning.classList.add("hidden");
        warningTimeout = null;
      }, 3000);

      return;
    }

    numberOfFavorites += 1;
    createFavoriteTab(activeTab);
    favoriteTabs.push(activeTab);

    await chrome.storage.sync.set({ favoriteTabs });
  }

  function createFavoriteTab(tab) {
    const rowClone = favoritesRowTemplate.content.cloneNode(true);

    const inputUrl = rowClone.querySelector(".favorites__input");
    inputUrl.value = filterTitle(tab.title);

    const removeBtn = rowClone.querySelector(".favorites__remove");
    removeBtn.addEventListener("click", async (ev) => {
      if (numberOfFavorites === MAX_NUMBER_OF_FAVORITES) {
        saveBtn.classList.remove("btn--disabled");
        favoritesRowSample.classList.remove("hidden");
        saveBtn.addEventListener("click", onSaveBtnClick);
      }

      numberOfFavorites -= 1;
      favoritesCount.textContent = numberOfFavorites;
      ev.target.closest(".favorites__table-row").remove();

      const removeIdx = favoriteTabs.findIndex((favoriteTab) => favoriteTab.url === tab.url);
      favoriteTabs.splice(removeIdx, 1);
      await chrome.storage.sync.set({ favoriteTabs });
    });

    const openBtn = rowClone.querySelector(".favorites__open");
    openBtn.addEventListener("click", async () => {
      await chrome.tabs.create({ url: tab.url, active: true });
    });

    favoritesTable.prepend(rowClone);

    favoritesCount.textContent = numberOfFavorites;

    if (numberOfFavorites === MAX_NUMBER_OF_FAVORITES) {
      saveBtn.classList.add("btn--disabled");
      favoritesRowSample.classList.add("hidden");
      saveBtn.removeEventListener("click", onSaveBtnClick);
    }
  }

  saveBtn.addEventListener("click", onSaveBtnClick);
}

async function main() {
  await initPreview();
  await initFavorites();
}
main();
