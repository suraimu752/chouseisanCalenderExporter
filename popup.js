// ポップアップのステータスを更新
document.addEventListener("DOMContentLoaded", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    const statusDiv = document.getElementById("status");

    if (currentTab.url && currentTab.url.includes("chouseisan.com/s")) {
      statusDiv.textContent =
        "イベントページでエクスポートボタンが表示されます";
      statusDiv.classList.add("active");
    } else {
      statusDiv.textContent = "調整さんのイベントページを開いてください";
      statusDiv.classList.remove("active");
    }
  });
});
