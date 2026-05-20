const videoGrid = document.getElementById("videoGrid");

// PUBLIC VIDEOS
const publicVideos = Array.isArray(window.siteVideos)
  ? window.siteVideos
  : [];

// LOCAL VIDEOS
const localVideos = safeGetLocalVideos();

// COMBINE
let savedVideos = [...localVideos, ...publicVideos];

// CLEAN VIDEOS
savedVideos = savedVideos
  .map((video, index) => ({
    ...video,
    id: video.id || `video-${index + 1}`,
    title: cleanTitle(video.title),
    thumbnail: isValidLink(video.thumbnail)
      ? decodeUrl(video.thumbnail)
      : "",
    embed: isValidLink(video.embed)
      ? decodeUrl(video.embed)
      : "",
    duration: cleanDuration(video.duration)
  }))
  .filter(video => video.embed);

const isMobile = window.innerWidth <= 700;

// DESKTOP = 30
// MOBILE = 15
const videosPerLoad = isMobile ? 15 : 30;

let currentIndex = 0;

if (!videoGrid) {
  console.error("videoGrid not found");
} else if (savedVideos.length === 0) {
  videoGrid.innerHTML =
    `<p class="empty-message">No videos added yet.</p>`;
} else {
  loadVideos();

  if (savedVideos.length > videosPerLoad) {
    createLoadMoreButton();
  }
}

// LOAD VIDEOS
function loadVideos() {

  const nextVideos = savedVideos.slice(
    currentIndex,
    currentIndex + videosPerLoad
  );

  nextVideos.forEach((video, index) => {

    const absoluteIndex = currentIndex + index + 1;

    // VIDEO CARD
    const card = document.createElement("a");

    card.className = "video-card";
    card.href = `watch/?id=${encodeURIComponent(video.id)}`;

    const thumbnailHTML = video.thumbnail
      ? `
        <img
          src="${escapeAttribute(video.thumbnail)}"
          alt="${escapeAttribute(video.title || "Video")}"
          class="thumbnail-img"
          loading="lazy"
          onerror="this.style.display='none'"
        >
      `
      : "";

    const durationHTML = video.duration
      ? `
        <span class="duration-badge">
          ${escapeHTML(video.duration)}
        </span>
      `
      : "";

    const titleHTML = video.title
      ? `
        <div class="video-meta">
          <h3 class="video-title">
            ${escapeHTML(video.title)}
          </h3>
        </div>
      `
      : "";

    card.innerHTML = `
      <div class="video-thumb">
        ${thumbnailHTML}
        ${durationHTML}
      </div>

      ${titleHTML}
    `;

    videoGrid.appendChild(card);

    // INLINE AD EVERY 15 VIDEOS
    if (absoluteIndex % 15 === 0) {

      const adWrap = document.createElement("div");
      adWrap.className = "inline-banner-ad";

      // AD BOX
      const ins = document.createElement("ins");
      ins.className = "eas6a97888e35";
      ins.setAttribute("data-zoneid", "5930002");

      adWrap.appendChild(ins);

      videoGrid.appendChild(adWrap);

      // LOAD SCRIPT
      const adScript = document.createElement("script");

      adScript.async = true;
      adScript.type = "application/javascript";
      adScript.src =
        "https://a.pemsrv.com/ad-provider.js";

      document.body.appendChild(adScript);

      // START AD
      adScript.onload = () => {

        window.AdProvider =
          window.AdProvider || [];

        window.AdProvider.push({
          serve: {}
        });

      };

    }

  });

  currentIndex += videosPerLoad;
}

// LOAD MORE BUTTON
function createLoadMoreButton() {

  const existing =
    document.querySelector(".load-more-wrapper");

  if (existing) {
    existing.remove();
  }

  const loadMoreSpot =
    document.getElementById("loadMoreSpot");

  const wrapper = document.createElement("div");
  wrapper.className = "load-more-wrapper";

  const btn = document.createElement("button");

  btn.className = "load-more-btn";
  btn.textContent = "Load More";

  btn.addEventListener("click", () => {

    loadVideos();

    if (currentIndex >= savedVideos.length) {
      wrapper.remove();
    }

  });

  wrapper.appendChild(btn);

  if (loadMoreSpot) {
    loadMoreSpot.appendChild(wrapper);
  }
}

// LOCAL STORAGE
function safeGetLocalVideos() {

  try {

    const raw = localStorage.getItem("videos");

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed
      : [];

  } catch {

    return [];

  }

}

// CLEAN TITLE
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

  if (
    clean.includes("<iframe") ||
    clean.includes("</iframe>")
  ) {
    return "";
  }

  return clean;

}

// CLEAN DURATION
function cleanDuration(duration) {

  if (!duration) return "";

  const clean = String(duration).trim();

  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(clean)) {
    return clean;
  }

  return "";

}

// DECODE URL
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

// VALID LINK
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

// ESCAPE HTML
function escapeHTML(text) {

  const div = document.createElement("div");

  div.textContent = text || "";

  return div.innerHTML;

}

// ESCAPE ATTRIBUTE
function escapeAttribute(text) {

  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

}
