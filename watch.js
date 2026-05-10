const watchContainer = document.getElementById("watchContainer");

const urlParams = new URLSearchParams(window.location.search);
const videoId = urlParams.get("id");

const videos = JSON.parse(localStorage.getItem("videos")) || [];

const video = videos.find((item) => item.id === videoId);

if (!video) {
  watchContainer.innerHTML = `
    <h2>Video not found</h2>
    <p>This video does not exist or was removed.</p>
    <a href="index.html" class="back-link">Go back home</a>
  `;
} else {
  let currentViews = Number(localStorage.getItem(`views-${video.id}`)) || 0;
  currentViews++;

  localStorage.setItem(`views-${video.id}`, currentViews);

  watchContainer.innerHTML = `
    <div class="watch-player">
      <iframe src="${escapeAttribute(video.embed)}" title="${escapeAttribute(video.title)}" frameborder="0" allowfullscreen></iframe>
    </div>

    <div class="watch-info">
      <h1>${escapeHTML(video.title)}</h1>
      <p>${currentViews} views</p>
    </div>
  `;
}

function escapeHTML(text) {
  const div = document.createElement("div");
  div.textContent = text || "";
  return div.innerHTML;
}

function escapeAttribute(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
