const titleInput = document.getElementById("titleInput");
const creatorInput = document.getElementById("creatorInput");
const embedInput = document.getElementById("embedInput");
const addVideoBtn = document.getElementById("addVideoBtn");

const bulkInput = document.getElementById("bulkInput");
const bulkAddBtn = document.getElementById("bulkAddBtn");

const videoList = document.getElementById("videoList");
const videoCountText = document.getElementById("videoCountText");
const clearAllBtn = document.getElementById("clearAllBtn");

renderVideoList();

addVideoBtn.addEventListener("click", () => {
  const title = titleInput.value.trim();
  const creator = creatorInput.value.trim();
  const rawEmbed = embedInput.value.trim();

  const embed = cleanEmbedInput(rawEmbed);

  if (!title || !creator || !rawEmbed) {
    alert("Please fill all fields.");
    return;
  }

  if (!isValidEmbedLink(embed)) {
    alert("Please paste a valid video embed link or full iframe embed code.");
    return;
  }

  const videos = getVideos();

  const newVideo = {
    id: `video-${Date.now()}`,
    title,
    creator,
    embed
  };

  videos.unshift(newVideo);
  saveVideos(videos);

  titleInput.value = "";
  creatorInput.value = "";
  embedInput.value = "";

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

    const title = parts[0];
    const creator = parts[1];
    const rawEmbed = parts.slice(2).join("|").trim();

    const embed = cleanEmbedInput(rawEmbed);

    if (!title || !creator || !isValidEmbedLink(embed)) {
      skippedLines.push(index + 1);
      return;
    }

    newVideos.push({
      id: `video-${Date.now()}-${index}`,
      title,
      creator,
      embed
    });
  });

  if (newVideos.length === 0) {
    alert("No valid videos found. Check the format: Title | Category | Embed Link");
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

function cleanEmbedInput(input) {
  const trimmed = input.trim();

  // If user pasted full iframe code, extract only the src link
  if (trimmed.toLowerCase().includes("<iframe")) {
    const match = trimmed.match(/src=["']([^"']+)["']/i);

    if (match && match[1]) {
      return match[1].trim();
    }

    return "";
  }

  // If user pasted only the embed link, use it directly
  return trimmed;
}

function getVideos() {
  return JSON.parse(localStorage.getItem("videos")) || [];
}

function saveVideos(videos) {
  localStorage.setItem("videos", JSON.stringify(videos));
}

function isValidEmbedLink(link) {
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
      <p class="admin-help">${escapeHTML(video.embed)}</p>
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
  div.textContent = text;
  return div.innerHTML;
}
