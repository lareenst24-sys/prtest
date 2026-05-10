const titleInput = document.getElementById("titleInput");
const creatorInput = document.getElementById("creatorInput");
const embedInput = document.getElementById("embedInput");
const thumbnailInput = document.getElementById("thumbnailInput");
const addVideoBtn = document.getElementById("addVideoBtn");

const bulkInput = document.getElementById("bulkInput");
const bulkAddBtn = document.getElementById("bulkAddBtn");

const videoList = document.getElementById("videoList");
const videoCountText = document.getElementById("videoCountText");
const clearAllBtn = document.getElementById("clearAllBtn");

renderVideoList();

addVideoBtn.addEventListener("click", () => {
  const manualTitle = titleInput.value.trim();
  const creator = creatorInput.value.trim();
  const rawEmbed = embedInput.value.trim();

  let thumbnail = thumbnailInput.value.trim();

  const extracted = extractVideoData(rawEmbed);
  const embed = extracted.embed;

  const title = manualTitle || extracted.title || "Untitled Video";

  if (!creator || !rawEmbed) {
    alert("Please fill category/creator and embed link/code.");
    return;
  }

  if (!isValidLink(embed)) {
    alert("Please paste a valid video embed link or full iframe embed code.");
    return;
  }

  if (!thumbnail && extracted.thumbnail) {
    thumbnail = extracted.thumbnail;
  }

  if (thumbnail && !isValidLink(thumbnail)) {
    alert("Please paste a valid thumbnail image link starting with http:// or https://");
    return;
  }

  const videos = getVideos();

  const newVideo = {
    id: `video-${Date.now()}`,
    title,
    creator,
    embed,
    thumbnail
  };

  videos.unshift(newVideo);
  saveVideos(videos);

  titleInput.value = "";
  creatorInput.value = "";
  embedInput.value = "";
  thumbnailInput.value = "";

  renderVideoList();

  alert("Video added successfully.");
});

bulkAddBtn.addEventListener("click", () => {
  const bulkText = bulkInput.value.trim();

  if (!bulkText) {
    alert("Paste your bulk video list first.");
    return;
  }

  const lines = bulkText
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const videos = getVideos();
  const newVideos = [];
  const skippedLines = [];

  lines.forEach((line, index) => {
    const parts = line.split("|").map(part => part.trim());

    if (parts.length < 3) {
      skippedLines.push(index + 1);
      return;
    }

    const manualTitle = parts[0];
    const creator = parts[1];
    const rawEmbed = parts[2];

    let thumbnail = parts[3] || "";

    const extracted = extractVideoData(rawEmbed);
    const embed = extracted.embed;

    const title = manualTitle || extracted.title || "Untitled Video";

    if (!creator || !isValidLink(embed)) {
      skippedLines.push(index + 1);
      return;
    }

    if (!thumbnail && extracted.thumbnail) {
      thumbnail = extracted.thumbnail;
    }

    if (thumbnail && !isValidLink(thumbnail)) {
      skippedLines.push(index + 1);
      return;
    }

    newVideos.push({
      id: `video-${Date.now()}-${index}`,
      title,
      creator,
      embed,
      thumbnail
    });
  });

  if (newVideos.length === 0) {
    alert("No valid videos found. Use: Title | Category | Embed Link/Iframe Code | Thumbnail Link");
    return;
  }

  saveVideos([...newVideos, ...videos]);

  bulkInput.value = "";
  renderVideoList();

  let message = `${newVideos.length} videos added successfully.`;

  if (skippedLines.length > 0) {
    message += `\nSkipped lines: ${skippedLines.join(", ")}`;
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
      <p>${escapeHTML(video.creator)}</p>
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
