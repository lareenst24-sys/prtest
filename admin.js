const bulkEmbedInput = document.getElementById("bulkEmbedInput");

const addVideosBtn = document.getElementById("addVideosBtn");

const videoList = document.getElementById("videoList");
const videoCountText = document.getElementById("videoCountText");
const filterStatusText = document.getElementById("filterStatusText");

const clearAllBtn = document.getElementById("clearAllBtn");
const showAllBtn = document.getElementById("showAllBtn");
const showMissingBtn = document.getElementById("showMissingBtn");
const saveAllDurationsBtn = document.getElementById("saveAllDurationsBtn");
const exportVideosBtn = document.getElementById("exportVideosBtn");
const deleteSelectedBtn = document.getElementById("deleteSelectedBtn");

const MAX_UPLOAD_AT_ONCE = 100;

let currentFilter = "all";

/* Auto-format duration while typing */
document.addEventListener("input", (event) => {
  if (!event.target.classList.contains("duration-input")) return;

  event.target.value = autoFormatDuration(event.target.value);
});

renderVideoList();

if (addVideosBtn) {
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
        thumbnail: extracted.thumbnail || "",
        duration: ""
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
}

if (showAllBtn) {
  showAllBtn.addEventListener("click", () => {
    currentFilter = "all";
    renderVideoList();
  });
}

if (showMissingBtn) {
  showMissingBtn.addEventListener("click", () => {
    currentFilter = "missing";
    renderVideoList();
  });
}

if (saveAllDurationsBtn) {
  saveAllDurationsBtn.addEventListener("click", () => {
    saveAllDurations();
  });
}

if (exportVideosBtn) {
  exportVideosBtn.addEventListener("click", () => {
    exportVideosJS();
  });
}

if (deleteSelectedBtn) {
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
}

if (clearAllBtn) {
  clearAllBtn.addEventListener("click", () => {
    const confirmDelete = confirm("Are you sure you want to delete all saved videos?");

    if (!confirmDelete) return;

    localStorage.removeItem("videos");
    renderVideoList();

    alert("All videos deleted.");
  });
}

function splitEmbedBlocks(text) {
  const trimmed = text.trim();

  /*
    For large multi-line embed blocks, separate videos with:
    ---VIDEO---
  */
  const separatedBlocks = trimmed
    .split("---VIDEO---")
    .map(block => block.trim())
    .filter(block => block.length > 0);

  if (separatedBlocks.length > 1) {
    return separatedBlocks;
  }

  /*
    Best normal format:
    One FULL embed code per line.
  */
  const lines = trimmed
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (lines.length > 1) {
    return lines;
  }

  /*
    Fallback:
    If many iframes are pasted in one giant line.
  */
  const iframeMatches = trimmed.match(/<iframe[\s\S]*?<\/iframe>(?:\s*\|\|[^\n\r]+)?/gi);

  if (iframeMatches && iframeMatches.length > 1) {
    return iframeMatches.map(item => item.trim()).filter(Boolean);
  }

  return [trimmed];
}

function extractVideoData(input) {
  const trimmed = input.trim();

  let embedPart = trimmed;
  let manualThumbnail = "";

  /*
    OLD WORKING RULE:
    From embed code we only extract:
    - iframe src / video link
    - thumbnail image link
    - title

    Duration is manual from admin page.
  */

  if (trimmed.includes("||")) {
    const pieces = trimmed.split("||").map(piece => piece.trim());

    embedPart = pieces[0] || "";

    for (let i = 1; i < pieces.length; i++) {
      const piece = pieces[i];

      if (!piece) continue;

      if (isValidLink(piece)) {
        manualThumbnail = piece;
        break;
      }
    }
  }

  let embed = "";
  let thumbnail = manualThumbnail;
  let title = "";

  // Extract iframe src only
  const iframeSrc = embedPart.match(/<iframe[^>]*src=["']([^"']+)["']/i);

  if (iframeSrc && iframeSrc[1]) {
    embed = decodeText(iframeSrc[1].trim());
  } else if (isValidLink(embedPart)) {
    embed = decodeText(embedPart);
  }

  const doc = new DOMParser().parseFromString(embedPart, "text/html");

  // Extract safe title only from title-like attributes
  const titleAttr = embedPart.match(/title=["']([^"']+)["']/i);
  if (titleAttr && titleAttr[1]) {
    title = cleanTitle(titleAttr[1]);
  }

  const dataTitle = embedPart.match(/data-title=["']([^"']+)["']/i);
  if (!title && dataTitle && dataTitle[1]) {
    title = cleanTitle(dataTitle[1]);
  }

  const ariaLabel = embedPart.match(/aria-label=["']([^"']+)["']/i);
  if (!title && ariaLabel && ariaLabel[1]) {
    title = cleanTitle(ariaLabel[1]);
  }

  const altTitle = embedPart.match(/alt=["']([^"']+)["']/i);
  if (!title && altTitle && altTitle[1]) {
    title = cleanTitle(altTitle[1]);
  }

  // Extract thumbnail from common image/thumbnail attributes only
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
      thumbnail = decodeText(possibleThumb.trim());
      break;
    }
  }

  // Regex thumbnail fallback
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
        thumbnail = decodeText(match[1].trim());
        break;
      }
    }
  }

  // Last fallback: first image-looking URL only
  if (!thumbnail) {
    const imageUrl = embedPart.match(/https?:\/\/[^\s"'<>]+?\.(jpg|jpeg|png|webp|gif)(\?[^\s"'<>]*)?/i);

    if (imageUrl && imageUrl[0]) {
      thumbnail = decodeText(imageUrl[0].trim());
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

  let clean = decodeText(String(title).trim());

  clean = clean.replace(/\s+/g, " ");

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
    clean.includes("src=") ||
    clean.includes("https://") ||
    clean.includes("http://")
  ) {
    return "";
  }

  return clean;
}

function autoFormatDuration(value) {
  const digits = String(value).replace(/\D/g, "");

  if (!digits) return "";

  // 37 -> 0:37
  if (digits.length <= 2) {
    return `0:${digits.padStart(2, "0")}`;
  }

  // 2337 -> 23:37
  if (digits.length <= 4) {
    const minutes = digits.slice(0, -2);
    const seconds = digits.slice(-2);

    return `${Number(minutes)}:${seconds}`;
  }

  // 14530 -> 1:45:30
  const hours = digits.slice(0, -4);
  const minutes = digits.slice(-4, -2);
  const seconds = digits.slice(-2);

  return `${Number(hours)}:${minutes}:${seconds}`;
}

function cleanDuration(duration) {
  if (!duration) return "";

  const clean = String(duration).trim();

  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(clean)) {
    return clean;
  }

  return "";
}

function decodeText(text) {
  if (!text) return "";

  let clean = String(text)
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

  if (clean.startsWith("//")) {
    clean = "https:" + clean;
  }

  return clean;
}

function getVideos() {
  try {
    const raw = localStorage.getItem("videos");
    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveVideos(videos) {
  localStorage.setItem("videos", JSON.stringify(videos));
}

function isValidLink(link) {
  return typeof link === "string" && (
    link.startsWith("http://") ||
    link.startsWith("https://") ||
    link.startsWith("//")
  );
}

function renderVideoList() {
  let videos = getVideos();

  videos = videos.map((video) => {
    return {
      ...video,
      title: cleanTitle(video.title),
      duration: cleanDuration(video.duration),
      thumbnail: isValidLink(video.thumbnail) ? decodeText(video.thumbnail) : "",
      embed: isValidLink(video.embed) ? decodeText(video.embed) : ""
    };
  }).filter(video => video.embed);

  saveVideos(videos);

  const totalVideos = videos.length;
  const missingThumbnailVideos = videos.filter(video => !video.thumbnail).length;

  let displayVideos = videos;

  if (currentFilter === "missing") {
    displayVideos = videos.filter(video => !video.thumbnail);

    if (filterStatusText) {
      filterStatusText.textContent = `Showing videos missing thumbnails: ${displayVideos.length}`;
    }
  } else {
    if (filterStatusText) {
      filterStatusText.textContent = "Showing all videos";
    }
  }

  if (videoCountText) {
    videoCountText.textContent = `${totalVideos} videos saved • ${missingThumbnailVideos} missing thumbnails`;
  }

  if (!videoList) return;

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

    const durationValue = video.duration || "";

    item.innerHTML = `
      <div class="admin-video-main">
        <input type="checkbox" class="video-select-checkbox" value="${escapeHTML(video.id)}">

        <div class="admin-video-preview">
          <iframe 
            src="${escapeAttribute(video.embed)}" 
            title="Video preview"
            loading="lazy"
            frameborder="0"
            allowfullscreen>
          </iframe>
        </div>

        <div class="admin-video-info">
          <strong>${video.title ? escapeHTML(video.title) : "Video saved"}</strong>
          <p class="admin-help">${thumbStatus}</p>

          <div class="duration-edit-row">
            <input 
              type="text" 
              class="duration-input" 
              id="duration-${escapeHTML(video.id)}" 
              value="${escapeAttribute(durationValue)}" 
              placeholder="Enter duration e.g. 12:45"
            >
            <button class="save-duration-btn" onclick="saveDuration('${video.id}')">Save</button>
          </div>
        </div>
      </div>

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

function saveDuration(id) {
  const input = document.getElementById(`duration-${id}`);

  if (!input) return;

  const duration = cleanDuration(autoFormatDuration(input.value));

  if (!duration) {
    alert("Enter duration like 12:45 or 1:02:33");
    return;
  }

  let videos = getVideos();

  videos = videos.map((video) => {
    if (video.id === id) {
      return {
        ...video,
        duration
      };
    }

    return video;
  });

  saveVideos(videos);
  renderVideoList();

  alert("Duration saved.");
}

function saveAllDurations() {
  const durationInputs = document.querySelectorAll(".duration-input");

  if (durationInputs.length === 0) {
    alert("No duration inputs found.");
    return;
  }

  let videos = getVideos();
  let savedCount = 0;
  let skippedCount = 0;

  durationInputs.forEach((input) => {
    const id = input.id.replace("duration-", "");
    const duration = cleanDuration(autoFormatDuration(input.value));

    if (!duration) {
      skippedCount++;
      return;
    }

    let matched = false;

    videos = videos.map((video) => {
      if (video.id === id) {
        matched = true;

        return {
          ...video,
          duration
        };
      }

      return video;
    });

    if (matched) {
      savedCount++;
    } else {
      skippedCount++;
    }
  });

  saveVideos(videos);
  renderVideoList();

  alert(`${savedCount} duration(s) saved. ${skippedCount} skipped.`);
}

function exportVideosJS() {
  const videos = getVideos()
    .map((video, index) => {
      return {
        id: video.id || `video-${index + 1}`,
        title: cleanTitle(video.title),
        embed: isValidLink(video.embed) ? decodeText(video.embed) : "",
        thumbnail: isValidLink(video.thumbnail) ? decodeText(video.thumbnail) : "",
        duration: cleanDuration(video.duration)
      };
    })
    .filter(video => video.embed);

  if (videos.length === 0) {
    alert("No videos to export.");
    return;
  }

  const fileContent = `window.siteVideos = ${JSON.stringify(videos, null, 2)};\n`;

  const blob = new Blob([fileContent], {
    type: "application/javascript"
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = "videos.js";

  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  alert(`${videos.length} video(s) exported as videos.js`);
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

function escapeAttribute(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
