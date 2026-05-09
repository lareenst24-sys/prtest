const ADMIN_PASSWORD = "12345"; // Change this password

const loginBox = document.getElementById("loginBox");
const adminPanel = document.getElementById("adminPanel");
const passwordInput = document.getElementById("passwordInput");
const loginBtn = document.getElementById("loginBtn");
const loginError = document.getElementById("loginError");

const titleInput = document.getElementById("titleInput");
const creatorInput = document.getElementById("creatorInput");
const embedInput = document.getElementById("embedInput");
const addVideoBtn = document.getElementById("addVideoBtn");
const videoList = document.getElementById("videoList");

loginBtn.addEventListener("click", loginAdmin);

passwordInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    loginAdmin();
  }
});

function loginAdmin() {
  if (passwordInput.value === ADMIN_PASSWORD) {
    loginBox.classList.add("hidden");
    adminPanel.classList.remove("hidden");
    renderVideoList();
  } else {
    loginError.textContent = "Wrong password";
  }
}

addVideoBtn.addEventListener("click", () => {
  const title = titleInput.value.trim();
  const creator = creatorInput.value.trim();
  const embed = embedInput.value.trim();

  if (!title || !creator || !embed) {
    alert("Please fill all fields.");
    return;
  }

  if (!embed.startsWith("http://") && !embed.startsWith("https://")) {
    alert("Please paste a valid video embed link.");
    return;
  }

  const videos = JSON.parse(localStorage.getItem("videos")) || [];

  const newVideo = {
    id: `video-${Date.now()}`,
    title: title,
    creator: creator,
    embed: embed
  };

  videos.unshift(newVideo);

  localStorage.setItem("videos", JSON.stringify(videos));

  titleInput.value = "";
  creatorInput.value = "";
  embedInput.value = "";

  renderVideoList();

  alert("Video added successfully.");
});

function renderVideoList() {
  const videos = JSON.parse(localStorage.getItem("videos")) || [];

  if (videos.length === 0) {
    videoList.innerHTML = "<p>No videos added yet.</p>";
    return;
  }

  videoList.innerHTML = "";

  videos.forEach((video) => {
    const item = document.createElement("div");
    item.className = "admin-video-item";

    item.innerHTML = `
      <strong>${video.title}</strong>
      <p>${video.creator}</p>
      <button class="delete-btn" onclick="deleteVideo('${video.id}')">Delete</button>
    `;

    videoList.appendChild(item);
  });
}

function deleteVideo(id) {
  let videos = JSON.parse(localStorage.getItem("videos")) || [];

  videos = videos.filter((video) => video.id !== id);

  localStorage.setItem("videos", JSON.stringify(videos));
  localStorage.removeItem(`views-${id}`);

  renderVideoList();
}
