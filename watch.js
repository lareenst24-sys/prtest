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
  const cleanTitle = isFakeTitle(video.title) ? "" : video.title;

  watchContainer.innerHTML = `
    <div class="watch-player">
      <iframe 
        src="${escapeAttribute(video.embed)}" 
        title="${escapeAttribute(cleanTitle || "Video")}" 
        frameborder="0" 
        allowfullscreen>
      </iframe>
    </div>

    <div class="watch-info">
      ${cleanTitle ? `<h1>${escapeHTML(cleanTitle)}</h1>` : ""}
    </div>
  `;
}

function isFakeTitle(title) {
  if (!title) return false;

  const clean = String(title).trim().toLowerCase();

  return (
    clean === "untitled video" ||
    clean.startsWith("untitled video ") ||
    /^video\s*\d+$/i.test(clean)
  );
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
