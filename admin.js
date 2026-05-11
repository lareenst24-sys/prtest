const bulkEmbedInput = document.getElementById("bulkEmbedInput");

const addVideosBtn = document.getElementById("addVideosBtn");

const videoList = document.getElementById("videoList");
const videoCountText = document.getElementById("videoCountText");
const filterStatusText = document.getElementById("filterStatusText");

const clearAllBtn = document.getElementById("clearAllBtn");
const showAllBtn = document.getElementById("showAllBtn");
const showMissingBtn = document.getElementById("showMissingBtn");
const deleteSelectedBtn = document.getElementById("deleteSelectedBtn");

const MAX_UPLOAD_AT_ONCE = 100;

let currentFilter = "all"; // all | missing

renderVideoList();

addVideosBtn.addEventListener("click", () => {
  const rawText = bulkEmbedInput.value.trim();

  if (!rawText) {
    alert("Paste at least one iframe code or embed link.");
    return;
  }

  const blocks = splitEmbedBlocks(rawText).slice(0, MAX_UPLOAD_AT_ONCE);

  const videos = getVideos();
  const newVideos = [];
  const skippedVideos = [];

  blocks.forEach((block, index) => {
    const rawInput = block.trim();

    if (!rawInput) return;

    const extracted = extractVideoData(rawInput);

    if (!isValidLink(extracted.embed)) {
      skippedVideos.push(index + 1);
      return;
    }

    newVideos.push({
      id: `video-${Date.now()}-${index}`,
      title: cleanTitle(extracted.title),
      embed: extracted.embed,
      thumbnail: extracted.thumbnail || ""
    });
  });

  if (newVideos.length === 0) {
    alert("No valid videos found. Make sure each embed has a valid iframe src or https link.");
    return;
  }

  saveVideos([...newVideos, ...videos]);

  bulkEmbedInput.value = "";

  renderVideoList();

  let message = `${newVideos.length} video(s) added successfully.`;

  if (blocks.length >= MAX_UPLOAD_AT_ONCE) {
    message += `\nOnly the first ${MAX_UPLOAD_AT_ONCE} videos were processed.`;
  }

  if (skippedVideos.length > 0) {
    message += `\nSkipped item(s): ${skippedVideos.join(", ")}`;
  }

  alert(message);
});

showAllBtn.addEventListener("click", () => {
  currentFilter = "all";
  renderVideoList();
});

showMissingBtn.addEventListener("click", () => {
  currentFilter = "missing";
  renderVideoList();
});

deleteSelectedBtn.addEventListener("click", () => {
  const selectedCheckboxes = document.querySelectorAll(".video-select-checkbox:checked");

  if (selectedCheckboxes.length === 0) {
    alert("Select at least one video to delete.");
    return;
  }

  const confirmDelete = confirm(`Delete ${selectedCheckboxes.length} selected video(s)?`);

  if (!confirmDelete) return;

  const selectedIds = Array.from(selectedCheckboxes).map((checkbox) => checkbox.value);

  let videos = getVideos();

  videos = videos.filter((video) => !selectedIds.includes(video.id));

  saveVideos(videos);
  renderVideoList();

  alert(`${selectedIds.length} selected video(s) deleted.`);
});

clearAllBtn.addEventListener("click", () => {
  const confirmDelete = confirm("Are you sure you want to delete all saved videos?");

  if (!confirmDelete) return;

  localStorage.removeItem("videos");
  renderVideoList();

  alert("All videos deleted.");
});

function splitEmbedBlocks(text) {
  const trimmed = text.trim();

  const lines = trimmed
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (lines.length > 1) {
    return lines;
  }

  const iframeMatches = trimmed.match(/<iframe[\s\S]*?<\/iframe>/gi);

  if (iframeMatches && iframeMatches.length > 1) {
    return iframeMatches;
  }

  const separatedBlocks = trimmed
    .split("---VIDEO---")
    .map(block => block.trim())
    .filter(block => block.length > 0);

  if (separatedBlocks.length > 1) {
    return separatedBlocks;
  }

  return [trimmed];
}

function extractVideoData(input) {
  const trimmed = input.trim();

  let embedPart = trimmed;
  let manualThumbnail = "";

  if (trimmed.includes("||")) {
    const pieces = trimmed.split("||");
    embedPart = pieces[0].trim();
    manualThumbnail = pieces[1].trim();
  }

  let embed = "";
  let thumbnail = manualThumbnail;
  let title = "";

  const iframeSrc = embedPart.match(/<iframe[^>]*src=["']([^"']+)["']/i);

  if (iframeSrc && iframeSrc[1]) {
    embed = iframeSrc[1].trim();
  } else if (isValidLink(embedPart)) {
    embed = embedPart;
  }

  const doc = new DOMParser().parseFromString(embedPart, "text/html");

  const titleSelectors = [
    "[title]",
    "[data-title]",
    "[aria-label]",
    "[alt]",
    "h1",
    "h2",
    "h3",
    ".title",
    ".video-title",
    "a"
  ];

  for (const selector of titleSelectors) {
    const element = doc.querySelector(selector);
    if (!element) continue;

    const possibleTitle =
      element.getAttribute("title") ||
      element.getAttribute("data-title") ||
      element.getAttribute("aria-label") ||
      element.getAttribute("alt") ||
      element.textContent;

    const cleaned = cleanTitle(possibleTitle);

    if (cleaned) {
      title = cleaned;
      break;
    }
  }

  if (!title) {
    const titlePatterns = [
      /title=["']([^"']+)["']/i,
      /data-title=["']([^"']+)["']/i,
      /aria-label=["']([^"']+)["']/i,
      /alt=["']([^"']+)["']/i
    ];

    for (const pattern of titlePatterns) {
      const match = embedPart.match(pattern);

      if (match && cleanTitle(match[1])) {
        title = cleanTitle(match[1]);
        break;
      }
    }
  }

  const imageSelectors = [
    "img[src]",
    "img[data-src]",
    "[poster]",
    "[data-poster]",
    "[data-thumbnail]",
    "[thumbnail]",
    "[image]",
    "[data-image]"
  ];

  for (const selector of imageSelectors) {
    const element = doc.querySelector(selector);
    if (!element) continue;

    const possibleThumb =
      element.getAttribute("src") ||
      element.getAttribute("data-src") ||
      element.getAttribute("poster") ||
      element.getAttribute("data-poster") ||
      element.getAttribute("data-thumbnail") ||
      element.getAttribute("thumbnail") ||
      element.getAttribute("image") ||
      element.getAttribute("data-image");

    if (possibleThumb && isValidLink(possibleThumb)) {
      thumbnail = possibleThumb.trim();
      break;
    }
  }

  if (!thumbnail) {
    const thumbPatterns = [
      /data-thumbnail=["']([^"']+)["']/i,
      /poster=["']([^"']+)["']/i,
      /data-poster=["']([^"']+)["']/i,
      /thumbnail=["']([^"']+)["']/i,
      /image=["']([^"']+)["']/i,
      /data-image=["']([^"']+)["']/i,
      /<img[^>]*src=["']([^"']+)["']/i,
      /background-image:\s*url\(["']?([^"')]+)["']?\)/i
    ];

    for (const pattern of thumbPatterns) {
      const match = embedPart.match(pattern);

      if (match && match[1] && isValidLink(match[1])) {
        thumbnail = match[1].trim();
        break;
      }
    }
  }

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

function getVideos() {
  return JSON.parse(localStorage.getItem("videos")) || [];
}

function saveVideos(videos) {
  localStorage.setItem("videos", JSON.stringify(videos));
}

function isValidLink(link) {
  return typeof link === "string" && (
    link.startsWith("http://") ||
    link.startsWith("https://")
  );
}

function renderVideoList() {
  let videos = getVideos();

  videos = videos.map((video) => {
    video.title = cleanTitle(video.title);
    return video;
  });

  saveVideos(videos);

  const totalVideos = videos.length;
  const missingThumbnailVideos = videos.filter(video => !video.thumbnail).length;

  let displayVideos = videos;

  if (currentFilter === "missing") {
    displayVideos = videos.filter(video => !video.thumbnail);
    filterStatusText.textContent = `Showing videos missing thumbnails: ${displayVideos.length}`;
  } else {
    filterStatusText.textContent = "Showing all videos";
  }

  videoCountText.textContent = `${totalVideos} videos saved • ${missingThumbnailVideos} missing thumbnails`;

  if (displayVideos.length === 0) {
    videoList.innerHTML = "<p>No videos to show.</p>";
    return;
  }

  videoList.innerHTML = "";

  displayVideos.slice(0, 100).forEach((video) => {
    const item = document.createElement("div");
    item.className = "admin-video-item selectable-video-item";

    const thumbStatus = video.thumbnail
      ? `<span class="thumb-ok">Thumbnail found</span>`
      : `<span class="thumb-missing">No thumbnail</span>`;

    item.innerHTML = `
      <label class="video-select-row">
        <input type="checkbox" class="video-select-checkbox" value="${escapeHTML(video.id)}">
        <div class="admin-video-info">
          <strong>${video.title ? escapeHTML(video.title) : "Video saved"}</strong>
          <p class="admin-help">${thumbStatus}</p>
        </div>
      </label>

      <button class="delete-btn small-delete-btn" onclick="deleteVideo('${video.id}')">Delete</button>
    `;

    videoList.appendChild(item);
  });

  if (displayVideos.length > 100) {
    const moreText = document.createElement("p");
    moreText.className = "admin-help";
    moreText.textContent = `Showing first 100 results only. Current filter has ${displayVideos.length} videos.`;
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
