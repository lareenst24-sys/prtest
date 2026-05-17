const bulkEmbedInput = document.getElementById("bulkEmbedInput");

const addVideosBtn = document.getElementById("addVideosBtn");

const videoList = document.getElementById("videoList");
const videoCountText = document.getElementById("videoCountText");
const filterStatusText = document.getElementById("filterStatusText");

const clearAllBtn = document.getElementById("clearAllBtn");
const showAllBtn = document.getElementById("showAllBtn");
const showMissingBtn = document.getElementById("showMissingBtn");
const importPublicVideosBtn = document.getElementById("importPublicVideosBtn");
const saveAllDurationsBtn = document.getElementById("saveAllDurationsBtn");
const exportVideosBtn = document.getElementById("exportVideosBtn");
const deleteSelectedBtn = document.getElementById("deleteSelectedBtn");

const MAX_UPLOAD_AT_ONCE = 300;

let currentFilter = "all";

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
        duration: cleanDuration(extracted.duration)
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

    const durationFoundCount = newVideos.filter(video => video.duration).length;

    if (durationFoundCount > 0) {
      message += `\n${durationFoundCount} duration(s) detected automatically.`;
    }

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

if (importPublicVideosBtn) {
  importPublicVideosBtn.addEventListener("click", () => {
    importPublicVideos();
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

/* =========================
   SPLIT BULK INPUT
========================= */

function splitEmbedBlocks(text) {
  const trimmed = text.trim();

  const separatedBlocks = trimmed
    .split("---VIDEO---")
    .map(block => block.trim())
    .filter(block => block.length > 0);

  if (separatedBlocks.length > 1) {
    return separatedBlocks;
  }

  const iframeMatches = trimmed.match(/<iframe[\s\S]*?<\/iframe>(?:\s*\|\|[^\n\r]+)?/gi);

  if (iframeMatches && iframeMatches.length > 1) {
    return iframeMatches.map(item => item.trim()).filter(Boolean);
  }

  const lines = trimmed
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (lines.length > 1) {
    return lines;
  }

  return [trimmed];
}

/* =========================
   STRICT VIDEO EXTRACTOR

   Saves only:
   - embed/video link
   - thumbnail link
   - title
   - duration if found
========================= */

function extractVideoData(input) {
  const originalInput = String(input || "").trim();

  let embedPart = originalInput;
  let manualThumbnail = "";
  let manualTitle = "";
  let manualDuration = "";

  /*
    Optional manual format:
    iframe/link || thumbnail || title || duration

    Example:
    <iframe src="..."></iframe> || https://thumb.jpg || My Title || 12:45
  */
  if (originalInput.includes("||")) {
    const pieces = originalInput.split("||").map(piece => piece.trim());

    embedPart = pieces[0] || "";

    for (let i = 1; i < pieces.length; i++) {
      const piece = pieces[i];

      if (!piece) continue;

      if (!manualThumbnail && isValidLink(piece) && isSafeThumbnailUrl(piece)) {
        manualThumbnail = decodeText(piece);
        continue;
      }

      if (!manualDuration && cleanDuration(piece)) {
        manualDuration = cleanDuration(piece);
        continue;
      }

      if (!manualTitle && !isValidLink(piece)) {
        manualTitle = cleanTitle(piece);
      }
    }
  }

  const cleanedHTML = removeDangerousAndExtraCode(embedPart);
  const doc = new DOMParser().parseFromString(cleanedHTML, "text/html");

  let embed = extractEmbedLink(doc, cleanedHTML);
  let thumbnail = manualThumbnail || extractThumbnailLink(doc, cleanedHTML);
  let title = manualTitle || extractTitle(doc, cleanedHTML);
  let duration = manualDuration || extractDuration(doc, cleanedHTML);

  return {
    embed: isValidLink(embed) ? decodeText(embed) : "",
    thumbnail: isValidLink(thumbnail) && isSafeThumbnailUrl(thumbnail) ? decodeText(thumbnail) : "",
    title: cleanTitle(title),
    duration: cleanDuration(duration)
  };
}

function removeDangerousAndExtraCode(html) {
  const clean = String(html || "");

  return clean
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<button[\s\S]*?<\/button>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/<form[\s\S]*?<\/form>/gi, "");
}

function extractEmbedLink(doc, rawHTML) {
  const iframe = doc.querySelector("iframe[src]");
  const embed = doc.querySelector("embed[src]");
  const video = doc.querySelector("video[src]");
  const source = doc.querySelector("source[src]");

  if (iframe && iframe.getAttribute("src")) {
    return decodeText(iframe.getAttribute("src").trim());
  }

  if (embed && embed.getAttribute("src")) {
    return decodeText(embed.getAttribute("src").trim());
  }

  if (video && video.getAttribute("src")) {
    return decodeText(video.getAttribute("src").trim());
  }

  if (source && source.getAttribute("src")) {
    return decodeText(source.getAttribute("src").trim());
  }

  if (isValidLink(rawHTML.trim())) {
    return decodeText(rawHTML.trim());
  }

  const iframeSrcMatch = rawHTML.match(/<iframe[^>]*src=["']([^"']+)["']/i);

  if (iframeSrcMatch && iframeSrcMatch[1]) {
    return decodeText(iframeSrcMatch[1].trim());
  }

  return "";
}

function extractThumbnailLink(doc, rawHTML) {
  const candidates = [];

  const imageElements = Array.from(doc.querySelectorAll("img, video, [poster], [data-poster], [data-thumbnail], [thumbnail], [data-thumb], [thumb], [image], [data-image]"));

  imageElements.forEach((element) => {
    const attrsToCheck = [
      "src",
      "data-src",
      "data-original",
      "data-lazy-src",
      "poster",
      "data-poster",
      "data-thumbnail",
      "thumbnail",
      "data-thumb",
      "thumb",
      "image",
      "data-image"
    ];

    attrsToCheck.forEach((attr) => {
      const value = element.getAttribute(attr);

      if (!value) return;

      candidates.push({
        url: decodeText(value.trim()),
        context: getElementContext(element)
      });
    });
  });

  const regexPatterns = [
    /poster=["']([^"']+)["']/i,
    /data-poster=["']([^"']+)["']/i,
    /data-thumbnail=["']([^"']+)["']/i,
    /thumbnail=["']([^"']+)["']/i,
    /data-thumb=["']([^"']+)["']/i,
    /thumb=["']([^"']+)["']/i,
    /image=["']([^"']+)["']/i,
    /data-image=["']([^"']+)["']/i,
    /<img[^>]*src=["']([^"']+)["']/i,
    /background-image:\s*url\(["']?([^"')]+)["']?\)/i
  ];

  regexPatterns.forEach((pattern) => {
    const match = rawHTML.match(pattern);

    if (match && match[1]) {
      candidates.push({
        url: decodeText(match[1].trim()),
        context: rawHTML
      });
    }
  });

  const imageUrlMatches = rawHTML.match(/https?:\/\/[^\s"'<>]+?\.(jpg|jpeg|png|webp|gif)(\?[^\s"'<>]*)?/gi);

  if (imageUrlMatches) {
    imageUrlMatches.forEach((url) => {
      candidates.push({
        url: decodeText(url.trim()),
        context: rawHTML
      });
    });
  }

  const safeCandidates = candidates.filter((candidate) => {
    return (
      isValidLink(candidate.url) &&
      isSafeThumbnailUrl(candidate.url) &&
      !looksLikeWatermark(candidate.url) &&
      !looksLikeWatermark(candidate.context)
    );
  });

  if (safeCandidates.length > 0) {
    return safeCandidates[0].url;
  }

  return "";
}

function extractTitle(doc, rawHTML) {
  const titleSources = [
    doc.querySelector("iframe[title]")?.getAttribute("title"),
    doc.querySelector("[data-title]")?.getAttribute("data-title"),
    doc.querySelector("[aria-label]")?.getAttribute("aria-label"),
    doc.querySelector("img[alt]")?.getAttribute("alt"),
    doc.querySelector("[title]")?.getAttribute("title")
  ];

  for (const source of titleSources) {
    const cleaned = cleanTitle(source);

    if (cleaned && !looksLikeWatermark(cleaned)) {
      return cleaned;
    }
  }

  const titleMatch = rawHTML.match(/title=["']([^"']+)["']/i);

  if (titleMatch && titleMatch[1]) {
    const cleaned = cleanTitle(titleMatch[1]);

    if (cleaned && !looksLikeWatermark(cleaned)) {
      return cleaned;
    }
  }

  return "";
}

/* =========================
   AUTO DURATION EXTRACTOR
========================= */

function extractDuration(doc, rawHTML) {
  const candidates = [];

  /*
    Read duration-like attributes first.
    These are the cleanest sources.
  */
  const durationSelectors = [
    "[duration]",
    "[data-duration]",
    "[data-time]",
    "[data-length]",
    "[length]",
    "[aria-label]",
    "[title]"
  ];

  durationSelectors.forEach((selector) => {
    const elements = Array.from(doc.querySelectorAll(selector));

    elements.forEach((element) => {
      const attrsToCheck = [
        "duration",
        "data-duration",
        "data-time",
        "data-length",
        "length",
        "aria-label",
        "title"
      ];

      attrsToCheck.forEach((attr) => {
        const value = element.getAttribute(attr);

        if (value) {
          candidates.push(value);
        }
      });
    });
  });

  /*
    Read visible text from duration-like elements.
  */
  const classDurationElements = Array.from(doc.querySelectorAll(
    ".duration, .time, .length, .video-duration, .video-time, [class*='duration'], [class*='time'], [class*='length']"
  ));

  classDurationElements.forEach((element) => {
    if (element.textContent) {
      candidates.push(element.textContent);
    }
  });

  /*
    Regex fallback:
    Finds 1:23, 12:45, 1:02:33
  */
  const durationMatches = rawHTML.match(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g);

  if (durationMatches) {
    durationMatches.forEach(match => candidates.push(match));
  }

  /*
    Also support text like:
    duration="12:45"
    data-duration="1:02:33"
  */
  const durationAttributePatterns = [
    /duration=["']([^"']+)["']/i,
    /data-duration=["']([^"']+)["']/i,
    /data-time=["']([^"']+)["']/i,
    /data-length=["']([^"']+)["']/i,
    /length=["']([^"']+)["']/i
  ];

  durationAttributePatterns.forEach((pattern) => {
    const match = rawHTML.match(pattern);

    if (match && match[1]) {
      candidates.push(match[1]);
    }
  });

  for (const candidate of candidates) {
    const clean = cleanDuration(candidate);

    if (clean) {
      return clean;
    }
  }

  return "";
}

function getElementContext(element) {
  if (!element) return "";

  const parts = [
    element.outerHTML || "",
    element.className || "",
    element.id || "",
    element.getAttribute("alt") || "",
    element.getAttribute("title") || "",
    element.parentElement?.className || "",
    element.parentElement?.id || ""
  ];

  return parts.join(" ").toLowerCase();
}

function looksLikeWatermark(value) {
  if (!value) return false;

  const text = String(value).toLowerCase();

  const badWords = [
    "watermark",
    "water-mark",
    "wm",
    "logo",
    "brand",
    "branding",
    "badge",
    "overlay",
    "corner",
    "powered",
    "promo",
    "promotion",
    "adchoices",
    "adsby",
    "sponsor",
    "banner",
    "icon",
    "favicon",
    "avatar",
    "profile",
    "button",
    "play-button",
    "close",
    "share",
    "download"
  ];

  return badWords.some(word => text.includes(word));
}

function isSafeThumbnailUrl(url) {
  if (!isValidLink(url)) return false;

  const clean = String(url).toLowerCase();

  if (looksLikeWatermark(clean)) return false;

  const imageLike =
    clean.includes(".jpg") ||
    clean.includes(".jpeg") ||
    clean.includes(".png") ||
    clean.includes(".webp") ||
    clean.includes(".gif") ||
    clean.includes("thumbnail") ||
    clean.includes("thumb") ||
    clean.includes("poster") ||
    clean.includes("image");

  return imageLike;
}

/* =========================
   IMPORT PUBLIC videos.js
========================= */

function importPublicVideos() {
  const publicVideos = Array.isArray(window.siteVideos) ? window.siteVideos : [];

  if (publicVideos.length === 0) {
    alert("No videos found in videos.js. Make sure adminprtest.html loads videos.js before admin.js.");
    return;
  }

  const currentVideos = getVideos();

  const cleanedPublicVideos = publicVideos
    .map((video, index) => {
      return {
        id: video.id || `video-public-${index + 1}`,
        title: cleanTitle(video.title),
        embed: isValidLink(video.embed) ? decodeText(video.embed) : "",
        thumbnail: isValidLink(video.thumbnail) && isSafeThumbnailUrl(video.thumbnail) ? decodeText(video.thumbnail) : "",
        duration: cleanDuration(video.duration)
      };
    })
    .filter(video => video.embed);

  if (cleanedPublicVideos.length === 0) {
    alert("videos.js was found, but no valid videos were imported.");
    return;
  }

  const mergedVideos = mergeVideos(cleanedPublicVideos, currentVideos);

  saveVideos(mergedVideos);
  renderVideoList();

  alert(`${cleanedPublicVideos.length} video(s) imported from videos.js.`);
}

function mergeVideos(importedVideos, existingVideos) {
  const map = new Map();

  existingVideos.forEach((video) => {
    if (!video.embed) return;

    const key = video.id || video.embed;

    map.set(key, video);
  });

  importedVideos.forEach((video) => {
    if (!video.embed) return;

    const key = video.id || video.embed;

    if (!map.has(key)) {
      map.set(key, video);
    }
  });

  return Array.from(map.values());
}

/* =========================
   CLEANERS
========================= */

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
    clean.includes("http://") ||
    clean.includes("<script") ||
    clean.includes("</script>") ||
    looksLikeWatermark(clean)
  ) {
    return "";
  }

  return clean;
}

function autoFormatDuration(value) {
  const digits = String(value).replace(/\D/g, "");

  if (!digits) return "";

  if (digits.length <= 2) {
    return `0:${digits.padStart(2, "0")}`;
  }

  if (digits.length <= 4) {
    const minutes = digits.slice(0, -2);
    const seconds = digits.slice(-2);

    return `${Number(minutes)}:${seconds}`;
  }

  const hours = digits.slice(0, -4);
  const minutes = digits.slice(-4, -2);
  const seconds = digits.slice(-2);

  return `${Number(hours)}:${minutes}:${seconds}`;
}

function cleanDuration(duration) {
  if (!duration) return "";

  let clean = String(duration).trim();

  /*
    If user types only numbers:
    37 -> 0:37
    2337 -> 23:37
    14530 -> 1:45:30
  */
  if (/^\d+$/.test(clean)) {
    clean = autoFormatDuration(clean);
  }

  /*
    Accepts:
    0:37
    1:23
    12:45
    1:02:33
  */
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(clean)) {
    return clean;
  }

  /*
    Extract duration from longer text:
    "Duration: 12:45"
    "watch time 1:02:33"
  */
  const match = clean.match(/\b\d{1,2}:\d{2}(?::\d{2})?\b/);

  if (match && match[0]) {
    return match[0];
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
    console.warn("Could not read videos from localStorage.", error);
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

/* =========================
   RENDER ADMIN VIDEO LIST
========================= */

function renderVideoList() {
  let videos = getVideos();

  videos = videos.map((video, index) => {
    return {
      id: video.id || `video-${index + 1}`,
      title: cleanTitle(video.title),
      duration: cleanDuration(video.duration),
      thumbnail: isValidLink(video.thumbnail) && isSafeThumbnailUrl(video.thumbnail) ? decodeText(video.thumbnail) : "",
      embed: isValidLink(video.embed) ? decodeText(video.embed) : ""
    };
  }).filter(video => video.embed);

  saveVideos(videos);

  const totalVideos = videos.length;
  const missingThumbnailVideos = videos.filter(video => !video.thumbnail).length;
  const missingDurationVideos = videos.filter(video => !video.duration).length;

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
    videoCountText.textContent = `${totalVideos} videos saved • ${missingThumbnailVideos} missing thumbnails • ${missingDurationVideos} missing durations`;
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

    const durationStatus = video.duration
      ? `<span class="thumb-ok">Duration found: ${escapeHTML(video.duration)}</span>`
      : `<span class="thumb-missing">No duration</span>`;

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
            sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"
            allow="fullscreen; picture-in-picture; encrypted-media"
            referrerpolicy="no-referrer"
            allowfullscreen>
          </iframe>
        </div>

        <div class="admin-video-info">
          <strong>${video.title ? escapeHTML(video.title) : "Video saved"}</strong>
          <p class="admin-help">${thumbStatus}</p>
          <p class="admin-help">${durationStatus}</p>

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

/* =========================
   DURATION
========================= */

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

/* =========================
   EXPORT
========================= */

function exportVideosJS() {
  const videos = getVideos()
    .map((video, index) => {
      return {
        id: video.id || `video-${index + 1}`,
        title: cleanTitle(video.title),
        embed: isValidLink(video.embed) ? decodeText(video.embed) : "",
        thumbnail: isValidLink(video.thumbnail) && isSafeThumbnailUrl(video.thumbnail) ? decodeText(video.thumbnail) : "",
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

/* =========================
   DELETE
========================= */

function deleteVideo(id) {
  let videos = getVideos();

  videos = videos.filter((video) => video.id !== id);

  saveVideos(videos);

  renderVideoList();
}

/* =========================
   ESCAPE
========================= */

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
