const embedInputs = document.querySelectorAll(".embedInput");

const addVideosBtn = document.getElementById("addVideosBtn");

const videoList = document.getElementById("videoList");
const videoCountText = document.getElementById("videoCountText");
const clearAllBtn = document.getElementById("clearAllBtn");

renderVideoList();

addVideosBtn.addEventListener("click", () => {
  const videos = getVideos();
  const newVideos = [];
  const skippedVideos = [];

  embedInputs.forEach((input, index) => {
    const rawEmbed = input.value.trim();

    if (!rawEmbed) return;

    const extracted = extractVideoData(rawEmbed);
    const embed = extracted.embed;
    const title = isFakeTitle(extracted.title) ? "" : (extracted.title || "");
    const thumbnail = extracted.thumbnail || "";

    if (!isValidLink(embed)) {
      skippedVideos.push(index + 1);
      return;
    }

    newVideos.push({
      id: `video-${Date.now()}-${index}`,
      title,
      embed,
      thumbnail
    });
  });

  if (newVideos.length === 0) {
    alert("No valid videos found. Paste at least one iframe code or embed link.");
    return;
  }

  saveVideos([...newVideos, ...videos]);

  embedInputs.forEach(input => input.value = "");

  renderVideoList();

  let message = `${newVideos.length} video(s) added successfully.`;

  if (skippedVideos.length > 0) {
    message += `\nSkipped input(s): ${skippedVideos.join(", ")}`;
  }

  alert(message);
});

clearAllBtn.addEventListener("click", () => {
  const confirmDelete = confirm("Are you sure you want to delete all saved videos?");

  if (!confirmDelete) return;

  localStorage.removeItem("videos");
  renderVideoList();

  alert("All videos deleted.");
});

function extractVideoData(input) {
  const trimmed = input.trim();

  let embed = "";
  let thumbnail = "";
  let title = "";

  if (trimmed.toLowerCase().includes("<iframe")) {
    const iframeSrc = trimmed.match(/<iframe[^>]*src=["']([^"']+)["']/i);
    if (iframeSrc && iframeSrc[1]) {
      embed = iframeSrc[1].trim();
    }
  } else {
    embed = trimmed;
  }

  const titleAttr = trimmed.match(/title=["']([^"']+)["']/i);
  if (titleAttr && titleAttr[1]) {
    title = titleAttr[1].trim();
  }

  const dataTitle = trimmed.match(/data-title=["']([^"']+)["']/i);
  if (!title && dataTitle && dataTitle[1]) {
    title = dataTitle[1].trim();
  }

  const ariaLabel = trimmed.match(/aria-label=["']([^"']+)["']/i);
  if (!title && ariaLabel && ariaLabel[1]) {
    title = ariaLabel[1].trim();
  }

  const dataThumb = trimmed.match(/data-thumbnail=["']([^"']+)["']/i);
  if (dataThumb && dataThumb[1]) {
    thumbnail = dataThumb[1].trim();
  }

  const posterThumb = trimmed.match(/poster=["']([^"']+)["']/i);
  if (!thumbnail && posterThumb && posterThumb[1]) {
    thumbnail = posterThumb[1].trim();
  }

  const imgThumb = trimmed.match(/<img[^>]*src=["']([^"']+)["']/i);
  if (!thumbnail && imgThumb && imgThumb[1]) {
    thumbnail = imgThumb[1].trim();
  }

  const thumbAttr = trimmed.match(/thumbnail=["']([^"']+)["']/i);
  if (!thumbnail && thumbAttr && thumbAttr[1]) {
    thumbnail = thumbAttr[1].trim();
  }

  const imageAttr = trimmed.match(/image=["']([^"']+)["']/i);
  if (!thumbnail && imageAttr && imageAttr[1]) {
    thumbnail = imageAttr[1].trim();
  }

  return {
    embed,
    thumbnail,
    title
  };
}

function getVideos() {
  return JSON.parse(localStorage.getItem("videos")) || [];
}

function saveVideos(videos) {
  localStorage.setItem("videos", JSON.stringify(videos));
}

function isValidLink(link) {
  return link.startsWith("http://") || link.startsWith("https://");
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

function renderVideoList() {
  let videos = getVideos();

  videos = videos.map((video) => {
    if (isFakeTitle(video.title)) {
      video.title = "";
    }
    return video;
  });

  saveVideos(videos);

  videoCountText.textContent = `${videos.length} videos saved`;

  if (videos.length === 0) {
    videoList.innerHTML = "<p>No videos added yet.</p>";
    return;
  }

  videoList.innerHTML = "";

  videos.slice(0, 50).forEach((video) => {
    const item = document.createElement("div");
    item.className = "admin-video-item";

    item.innerHTML = `
      <strong>${video.title ? escapeHTML(video.title) : "No title"}</strong>
      <p class="admin-help">Embed: ${escapeHTML(video.embed)}</p>
      <p class="admin-help">Thumbnail: ${video.thumbnail ? escapeHTML(video.thumbnail) : "No thumbnail found"}</p>
      <button class="delete-btn" onclick="deleteVideo('${video.id}')">Delete</button>
    `;

    videoList.appendChild(item);
  });

  if (videos.length > 50) {
    const moreText = document.createElement("p");
    moreText.className = "admin-help";
    moreText.textContent = `Showing latest 50 videos only. Total saved: ${videos.length}`;
    videoList.appendChild(moreText);
  }
}

function deleteVideo(id) {
  let videos = getVideos();
  videos = videos.filter((video) => video.id !== id);
  saveVideos(videos);
  renderVideoList();
}

function escapeHTML(text) {
  const div = document.createElement("div");
  div.textContent = text || "";
  return div.innerHTML;
}
