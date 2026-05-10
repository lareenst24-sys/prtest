const titleInputs = document.querySelectorAll(".titleInput");
const embedInputs = document.querySelectorAll(".embedInput");
const thumbnailInputs = document.querySelectorAll(".thumbnailInput");

const addVideosBtn = document.getElementById("addVideosBtn");

const videoList = document.getElementById("videoList");
const videoCountText = document.getElementById("videoCountText");
const clearAllBtn = document.getElementById("clearAllBtn");

renderVideoList();

addVideosBtn.addEventListener("click", () => {
  const videos = getVideos();
  const newVideos = [];
  const skippedVideos = [];

  for (let i = 0; i < 5; i++) {
    const manualTitle = titleInputs[i].value.trim();
    const rawEmbed = embedInputs[i].value.trim();
    let thumbnail = thumbnailInputs[i].value.trim();

    // Skip fully empty boxes
    if (!manualTitle && !rawEmbed && !thumbnail) {
      continue;
    }

    const extracted = extractVideoData(rawEmbed);
    const embed = extracted.embed;
    const title = manualTitle || extracted.title || `Untitled Video ${i + 1}`;

    if (!rawEmbed || !isValidLink(embed)) {
      skippedVideos.push(i + 1);
      continue;
    }

    if (!thumbnail && extracted.thumbnail) {
      thumbnail = extracted.thumbnail;
    }

    if (thumbnail && !isValidLink(thumbnail)) {
      skippedVideos.push(i + 1);
      continue;
    }

    newVideos.push({
      id: `video-${Date.now()}-${i}`,
      title,
      embed,
      thumbnail
    });
  }

  if (newVideos.length === 0) {
    alert("No valid videos found. Add at least one video with a valid embed link or iframe code.");
    return;
  }

  saveVideos([...newVideos, ...videos]);

  titleInputs.forEach(input => input.value = "");
  embedInputs.forEach(input => input.value = "");
  thumbnailInputs.forEach(input => input.value = "");

  renderVideoList();

  let message = `${newVideos.length} video(s) added successfully.`;

  if (skippedVideos.length > 0) {
    message += `\nSkipped video box(es): ${skippedVideos.join(", ")}`;
  }

  alert(message);
});

clearAllBtn.addEventListener("click", () => {
  const confirmDelete = confirm("Are you sure you want to delete all saved videos?");

  if (!confirmDelete) return;

  const videos = getVideos();

  videos.forEach((video) => {
    localStorage.removeItem(`views-${video.id}`);
  });

  localStorage.removeItem("videos");

  renderVideoList();

  alert("All videos deleted.");
});

function extractVideoData(input) {
  const trimmed = input.trim();

  let embed = "";
  let thumbnail = "";
  let title = "";

  // Extract iframe src
  if (trimmed.toLowerCase().includes("<iframe")) {
    const iframeSrc = trimmed.match(/<iframe[^>]*src=["']([^"']+)["']/i);

    if (iframeSrc && iframeSrc[1]) {
      embed = iframeSrc[1].trim();
    }
  } else {
    embed = trimmed;
  }

  // Extract title=""
  const titleAttr = trimmed.match(/title=["']([^"']+)["']/i);
  if (titleAttr && titleAttr[1]) {
    title = titleAttr[1].trim();
  }

  // Extract data-title=""
  const dataTitle = trimmed.match(/data-title=["']([^"']+)["']/i);
  if (!title && dataTitle && dataTitle[1]) {
    title = dataTitle[1].trim();
  }

  // Extract aria-label=""
  const ariaLabel = trimmed.match(/aria-label=["']([^"']+)["']/i);
  if (!title && ariaLabel && ariaLabel[1]) {
    title = ariaLabel[1].trim();
  }

  // Extract thumbnail from data-thumbnail=""
  const dataThumb = trimmed.match(/data-thumbnail=["']([^"']+)["']/i);
  if (dataThumb && dataThumb[1]) {
    thumbnail = dataThumb[1].trim();
  }

  // Extract thumbnail from poster=""
  const posterThumb = trimmed.match(/poster=["']([^"']+)["']/i);
  if (!thumbnail && posterThumb && posterThumb[1]) {
    thumbnail = posterThumb[1].trim();
  }

  // Extract thumbnail from img src=""
  const imgThumb = trimmed.match(/<img[^>]*src=["']([^"']+)["']/i);
  if (!thumbnail && imgThumb && imgThumb[1]) {
    thumbnail = imgThumb[1].trim();
  }

  // Extract thumbnail from thumbnail=""
  const thumbAttr = trimmed.match(/thumbnail=["']([^"']+)["']/i);
  if (!thumbnail && thumbAttr && thumbAttr[1]) {
    thumbnail = thumbAttr[1].trim();
  }

  // Extract thumbnail from image=""
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

function renderVideoList() {
  const videos = getVideos();

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
      <strong>${escapeHTML(video.title)}</strong>
      <p class="admin-help">Embed: ${escapeHTML(video.embed)}</p>
      <p class="admin-help">Thumbnail: ${video.thumbnail ? escapeHTML(video.thumbnail) : "No thumbnail added"}</p>
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
  localStorage.removeItem(`views-${id}`);

  renderVideoList();
}

function escapeHTML(text) {
  const div = document.createElement("div");
  div.textContent = text || "";
  return div.innerHTML;
}
