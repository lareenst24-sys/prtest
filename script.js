const videoGrid = document.getElementById("videoGrid");

let savedVideos = JSON.parse(localStorage.getItem("videos")) || [];

// Clean old fake titles already saved in localStorage
savedVideos = savedVideos.map((video) => {
  if (isFakeTitle(video.title)) {
    video.title = "";
  }

  return video;
});

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

    const savedViews = localStorage.getItem(`views-${video.id}`) || 0;

    let previewHTML = "";

    if (video.thumbnail) {
      previewHTML = `
        <img src="${escapeAttribute(video.thumbnail)}" alt="Video" class="thumbnail-img">
        <div class="thumbnail-overlay"></div>
        <div class="play-preview">▶</div>
      `;
    } else {
      previewHTML = `
        <iframe 
          src="${escapeAttribute(video.embed)}" 
          title="Video"
          frameborder="0" 
          loading="lazy"
          allowfullscreen>
        </iframe>
        <div class="iframe-click-layer">
          <div class="play-preview">▶</div>
        </div>
      `;
    }

    const cleanTitle = isFakeTitle(video.title) ? "" : video.title;

    const titleHTML = cleanTitle
      ? `<h3>${escapeHTML(cleanTitle)}</h3>`
      : "";

    card.innerHTML = `
      <div class="embed-box preview-box">
        ${previewHTML}
      </div>

      ${titleHTML}
      <p class="views">${savedViews} views</p>
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

  document.querySelector(".content").appendChild(loadMoreWrapper);
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
