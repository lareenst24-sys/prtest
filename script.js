const videoGrid = document.getElementById("videoGrid");

const savedVideos = JSON.parse(localStorage.getItem("videos")) || [];

if (savedVideos.length === 0) {
  videoGrid.innerHTML = `<p class="empty-message">No videos added yet. Add videos from the admin page.</p>`;
} else {
  savedVideos.forEach((video) => {
    const card = document.createElement("div");
    card.className = "video-card";
    card.dataset.videoId = video.id;

    const savedViews = localStorage.getItem(`views-${video.id}`) || 0;

    card.innerHTML = `
      <div class="embed-box preview-box">
        <div class="play-preview">▶</div>
      </div>

      <h3>${video.title}</h3>
      <p>${video.creator}</p>
      <p class="views">${savedViews} views</p>
    `;

    card.addEventListener("click", () => {
      window.location.href = `watch.html?id=${video.id}`;
    });

    videoGrid.appendChild(card);
  });
}
