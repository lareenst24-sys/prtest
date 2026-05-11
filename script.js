const videoGrid = document.getElementById("videoGrid");

let savedVideos = JSON.parse(localStorage.getItem("videos")) || [];

// Clean saved videos before rendering
savedVideos = savedVideos.map((video) => {
  return {
    ...video,
    title: cleanTitle(video.title),
    thumbnail: isValidLink(video.thumbnail) ? decodeUrl(video.thumbnail) : "",
    embed: isValidLink(video.embed) ? decodeUrl(video.embed) : ""
  };
}).filter((video) => video.embed);

localStorage.setItem("videos", JSON.stringify(savedVideos));

const isMobile = window.innerWidth <= 700;
const videosPerLoad = isMobile ? 14 : 20;

let currentIndex = 0;

if (savedVideos.length === 0) {
  videoGrid.innerHTML = `<p class="empty-message">No videos added yet.</p>`;
} else {
  loadVideos();

  if (savedVideos.length > videosPerLoad) {
    createLoadMoreButton();
  }
}

function loadVideos() {
  const nextVideos = savedVideos.slice(currentIndex, currentIndex + videosPerLoad);

  nextVideos.forEach((video) => {
    const card = document.createElement("div");
    card.className = "video-card";
    card.dataset.videoId = video.id;

    const cleanVideoTitle = cleanTitle(video.title);

    const thumbnailHTML = video.thumbnail
      ? `
        <img 
          src="${escapeAttribute(video.thumbnail)}" 
          alt="${escapeAttribute(cleanVideoTitle || "Video thumbnail")}" 
          class="thumbnail-img"
          loading="lazy"
          onerror="this.style.display='none'; this.parentElement.classList.add('thumbnail-failed');"
        >
      `
      : "";

    const titleHTML = cleanVideoTitle
      ? `
        <div class="video-meta">
          <h3 class="video-title">${escapeHTML(cleanVideoTitle)}</h3>
        </div>
      `
      : "";

    card.innerHTML = `
      <div class="video-thumb ${video.thumbnail ? "" : "thumbnail-failed"}">
        ${thumbnailHTML}
      </div>

      ${titleHTML}
    `;

    card.addEventListener("click", () => {
      window.location.href = `watch.html?id=${encodeURIComponent(video.id)}`;
    });

    videoGrid.appendChild(card);
  });

  currentIndex += videosPerLoad;
}

function createLoadMoreButton() {
  const loadMoreWrapper = document.createElement("div");
  loadMoreWrapper.className = "load-more-wrapper";

  const loadMoreBtn = document.createElement("button");
  loadMoreBtn.textContent = "Load More";
  loadMoreBtn.className = "load-more-btn";

  loadMoreBtn.addEventListener("click", () => {
    loadVideos();

    if (currentIndex >= savedVideos.length) {
      loadMoreWrapper.remove();
    }
  });

  loadMoreWrapper.appendChild(loadMoreBtn);

  const content = document.querySelector(".content");
  content.appendChild(loadMoreWrapper);
}

function cleanTitle(title) {
  if (!title) return "";

  let clean = String(title).trim();

  clean = clean
    .replace(/\s+/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

  if (!clean) return "";

  const lower = clean.toLowerCase();

  if (
    lower === "untitled video" ||
    lower.startsWith("untitled video ") ||
    /^video\s*\d+$/i.test(clean)
  ) {
    return "";
  }

  if (isValidLink(clean)) return "";

  if (
    clean.includes("<iframe") ||
    clean.includes("</iframe>") ||
    clean.includes("src=")
  ) {
    return "";
  }

  return clean;
}

function decodeUrl(url) {
  if (!url) return "";

  return String(url)
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function isValidLink(link) {
  return (
    typeof link === "string" &&
    (
      link.startsWith("http://") ||
      link.startsWith("https://") ||
      link.startsWith("//")
    )
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
