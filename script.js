const videoGrid = document.getElementById("videoGrid");

const savedVideos = JSON.parse(localStorage.getItem("videos")) || [];

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
        <img src="${escapeAttribute(video.thumbnail)}" alt="${escapeAttribute(video.title)}" class="thumbnail-img">
        <div class="thumbnail-overlay"></div>
        <div class="play-preview">▶</div>
      `;
    } else {
      previewHTML = `
        <iframe 
          src="${escapeAttribute(video.embed)}" 
          title="${escapeAttribute(video.title)}" 
          frameborder="0" 
          loading="lazy"
          allowfullscreen>
        </iframe>
        <div class="iframe-click-layer">
          <div class="play-preview">▶</div>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="embed-box preview-box">
        ${previewHTML}
      </div>

      <h3>${escapeHTML(video.title)}</h3>
      <p>${escapeHTML(video.creator)}</p>
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
