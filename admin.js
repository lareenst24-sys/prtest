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
    const rawInput = input.value.trim();

    if (!rawInput) return;

    const extracted = extractVideoData(rawInput);

    const embed = extracted.embed;
    const title = cleanTitle(extracted.title);
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
    alert("No valid videos found. Paste at least one full embed code or embed link.");
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

  let embedPart = trimmed;
  let manualThumbnail = "";

  // Optional format:
  // FULL EMBED CODE || THUMBNAIL LINK
  if (trimmed.includes("||")) {
    const pieces = trimmed.split("||");
    embedPart = pieces[0].trim();
    manualThumbnail = pieces[1].trim();
  }

  let embed = "";
  let thumbnail = manualThumbnail;
  let title = "";

  // Extract iframe src from full code
  const iframeSrc = embedPart.match(/<iframe[^>]*src=["']([^"']+)["']/i);

  if (iframeSrc && iframeSrc[1]) {
    embed = iframeSrc[1].trim();
  } else if (isValidLink(embedPart)) {
    embed = embedPart;
  }

  // Extract title=""
  const titleAttr = embedPart.match(/title=["']([^"']+)["']/i);
  if (titleAttr && titleAttr[1]) {
    title = titleAttr[1].trim();
  }

  // Extract data-title=""
  const dataTitle = embedPart.match(/data-title=["']([^"']+)["']/i);
  if (!title && dataTitle && dataTitle[1]) {
    title = dataTitle[1].trim();
  }

  // Extract aria-label=""
  const ariaLabel = embedPart.match(/aria-label=["']([^"']+)["']/i);
  if (!title && ariaLabel && ariaLabel[1]) {
    title = ariaLabel[1].trim();
  }

  // Extract thumbnail from data-thumbnail=""
  const dataThumb = embedPart.match(/data-thumbnail=["']([^"']+)["']/i);
  if (!thumbnail && dataThumb && dataThumb[1]) {
    thumbnail = dataThumb[1].trim();
  }

  // Extract thumbnail from poster=""
  const posterThumb = embedPart.match(/poster=["']([^"']+)["']/i);
  if (!thumbnail && posterThumb && posterThumb[1]) {
    thumbnail = posterThumb[1].trim();
  }

  // Extract thumbnail from thumbnail=""
  const thumbAttr = embedPart.match(/thumbnail=["']([^"']+)["']/i);
  if (!thumbnail && thumbAttr && thumbAttr[1]) {
    thumbnail = thumbAttr[1].trim();
  }

  // Extract thumbnail from image=""
  const imageAttr = embedPart.match(/image=["']([^"']+)["']/i);
  if (!thumbnail && imageAttr && imageAttr[1]) {
    thumbnail = imageAttr[1].trim();
  }

  // Extract thumbnail from data-src=""
  const dataSrc = embedPart.match(/data-src=["']([^"']+)["']/i);
  if (!thumbnail && dataSrc && dataSrc[1] && isImageLink(dataSrc[1])) {
    thumbnail = dataSrc[1].trim();
  }

  // Extract thumbnail from img src=""
  const imgThumb = embedPart.match(/<img[^>]*src=["']([^"']+)["']/i);
  if (!thumbnail && imgThumb && imgThumb[1]) {
    thumbnail = imgThumb[1].trim();
  }

  // Extract thumbnail from style background-image: url(...)
  const backgroundThumb = embedPart.match(/background-image:\s*url\(["']?([^"')]+)["']?\)/i);
  if (!thumbnail && backgroundThumb && backgroundThumb[1]) {
    thumbnail = backgroundThumb[1].trim();
  }

  // Last fallback: find first image-looking URL in the full code
  if (!thumbnail) {
    const imageUrl = embedPart.match(/https?:\/\/[^\s"'<>]+?\.(jpg|jpeg|png|webp|gif)(\?[^\s"'<>]*)?/i);

    if (imageUrl && imageUrl[0]) {
      thumbnail = imageUrl[0].trim();
    }
  }

  return {
    embed,
    thumbnail,
    title
  };
}

function cleanTitle(title) {
  if (!title) return "";

  const clean = String(title).trim();

  if (!clean) return "";

  const lower = clean.toLowerCase();

  // Remove fake/default titles
  if (
    lower === "untitled video" ||
    lower.startsWith("untitled video ") ||
    /^video\s*\d+$/i.test(clean)
  ) {
    return "";
  }

  // Do not use links as titles
  if (isValidLink(clean)) {
    return "";
  }

  // Do not use iframe/code pieces as titles
  if (clean.includes("<iframe") || clean.includes("</iframe>")) {
    return "";
  }

  return clean;
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

function isImageLink(link) {
  return /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(link);
}

function renderVideoList() {
  let videos = getVideos();

  videos = videos.map((video) => {
    video.title = cleanTitle(video.title);
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
      <strong>${video.title ? escapeHTML(video.title) : "Video saved"}</strong>
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
