const watchContainer = document.getElementById("watchContainer");

const urlParams = new URLSearchParams(window.location.search);
const videoId = urlParams.get("id");

// Public videos from videos.js
const publicVideos = Array.isArray(window.siteVideos) ? window.siteVideos : [];

// Private/test videos from admin localStorage
const localVideos = safeGetLocalVideos();

// Combine both lists
let videos = [...localVideos, ...publicVideos];

videos = videos
  .map((video, index) => {
    return {
      ...video,
      id: video.id || `video-${index + 1}`,
      title: cleanTitle(video.title),
      thumbnail: isValidLink(video.thumbnail) ? decodeUrl(video.thumbnail) : "",
      embed: isValidLink(video.embed) ? decodeUrl(video.embed) : "",
      duration: cleanDuration(video.duration)
    };
  })
  .filter((video) => video.embed);

// Do NOT save combined videos back into localStorage.
// localStorage stays private for admin/testing only.

const currentVideo = videos.find((item) => item.id === videoId);

if (!watchContainer) {
  console.error("watchContainer not found.");
} else if (!currentVideo) {
  watchContainer.innerHTML = `
    <h2>Video not found</h2>
    <p>This video does not exist or was removed.</p>
    <a href="../index.html" class="back-link">Go back home</a>
  `;
} else {
  // Random every page load / refresh / different video open
  const suggestedVideos = getRandomVideos(currentVideo.id, 9);
  const alsoWatchVideos = getRandomVideos(currentVideo.id, 12);

  watchContainer.innerHTML = `
    <div class="watch-layout">
      <div class="watch-main">

        <div class="watch-player-wrap">
          <div class="watch-player">
            <iframe 
              src="${escapeAttribute(currentVideo.embed)}" 
              title="${escapeAttribute(currentVideo.title || "Video")}" 
              frameborder="0"
              sandbox="allow-scripts allow-same-origin allow-presentation"
              allow="fullscreen; picture-in-picture; encrypted-media"
              referrerpolicy="no-referrer"
              allowfullscreen>
            </iframe>
          </div>

          <button class="more-videos-btn" id="moreVideosBtn">More Videos</button>

          <div class="pause-style-overlay" id="videoOverlay">
            <div class="overlay-header">
              <h3>More videos</h3>
              <button id="closeOverlayBtn">×</button>
            </div>

            <div class="overlay-video-grid">
              ${renderMiniVideos(suggestedVideos)}
            </div>
          </div>
        </div>

        ${
          currentVideo.title
            ? `<div class="watch-info"><h1>${escapeHTML(currentVideo.title)}</h1></div>`
            : ""
        }

        <section class="also-watch-section">
          <h2>Also Watch</h2>
          <div class="also-watch-grid">
            ${renderAlsoWatchVideos(alsoWatchVideos)}
          </div>
        </section>

      </div>
    </div>
  `;

  const moreVideosBtn = document.getElementById("moreVideosBtn");
  const closeOverlayBtn = document.getElementById("closeOverlayBtn");
  const videoOverlay = document.getElementById("videoOverlay");

  if (moreVideosBtn && videoOverlay) {
    moreVideosBtn.addEventListener("click", () => {
      videoOverlay.classList.add("active");
    });
  }

  if (closeOverlayBtn && videoOverlay) {
    closeOverlayBtn.addEventListener("click", () => {
      videoOverlay.classList.remove("active");
    });
  }
}

function getRandomVideos(currentId, limit) {
  const availableVideos = videos.filter((video) => video.id !== currentId);

  const shuffledVideos = [...availableVideos];

  for (let i = shuffledVideos.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1));

    const temp = shuffledVideos[i];
    shuffledVideos[i] = shuffledVideos[randomIndex];
    shuffledVideos[randomIndex] = temp;
  }

  return shuffledVideos.slice(0, limit);
}

function renderMiniVideos(items) {
  if (items.length === 0) {
    return `<p class="empty-message">No suggestions yet.</p>`;
  }

  return items.map((video) => {
    const thumbnailHTML = video.thumbnail
      ? `
        <img 
          src="${escapeAttribute(video.thumbnail)}" 
          alt="Video thumbnail" 
          onerror="this.style.display='none'; this.parentElement.classList.add('thumbnail-failed');"
        >
      `
      : "";

    const durationHTML = video.duration
      ? `<span class="duration-badge">${escapeHTML(video.duration)}</span>`
      : "";

    return `
      <a class="overlay-video-card" href="?id=${encodeURIComponent(video.id)}">
        <div class="overlay-video-thumb ${video.thumbnail ? "" : "thumbnail-failed"}">
          ${thumbnailHTML}
          ${durationHTML}
        </div>
      </a>
    `;
  }).join("");
}

function renderAlsoWatchVideos(items) {
  if (items.length === 0) {
    return `<p class="empty-message">No more videos yet.</p>`;
  }

  return items.map((video) => {
    const thumbnailHTML = video.thumbnail
      ? `
        <img 
          src="${escapeAttribute(video.thumbnail)}" 
          alt="Video thumbnail" 
          onerror="this.style.display='none'; this.parentElement.classList.add('thumbnail-failed');"
        >
      `
      : "";

    const durationHTML = video.duration
      ? `<span class="duration-badge">${escapeHTML(video.duration)}</span>`
      : "";

    return `
      <a class="also-watch-card" href="?id=${encodeURIComponent(video.id)}">
        <div class="also-watch-thumb ${video.thumbnail ? "" : "thumbnail-failed"}">
          ${thumbnailHTML}
          ${durationHTML}
        </div>
        ${
          video.title
            ? `<h3>${escapeHTML(video.title)}</h3>`
            : ""
        }
      </a>
    `;
  }).join("");
}

function safeGetLocalVideos() {
  try {
    const raw = localStorage.getItem("videos");
    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Local videos could not be read. Using empty localStorage list.", error);
    return [];
  }
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

function cleanDuration(duration) {
  if (!duration) return "";

  const clean = String(duration).trim();

  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(clean)) {
    return clean;
  }

  return "";
}

function decodeUrl(url) {
  if (!url) return "";

  let clean = String(url)
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  if (clean.startsWith("//")) {
    clean = "https:" + clean;
  }

  return clean;
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
