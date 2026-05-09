const videoCards = document.querySelectorAll(".video-card");

videoCards.forEach((card) => {
  const videoId = card.dataset.videoId;
  const viewsText = card.querySelector(".views");
  const iframe = card.querySelector("iframe");

  let savedViews = localStorage.getItem(`views-${videoId}`);

  if (!savedViews) {
    savedViews = 0;
    localStorage.setItem(`views-${videoId}`, savedViews);
  }

  viewsText.textContent = `${savedViews} views`;

  iframe.addEventListener("mouseenter", () => {
    if (card.dataset.counted === "true") return;

    let currentViews = Number(localStorage.getItem(`views-${videoId}`)) || 0;
    currentViews++;

    localStorage.setItem(`views-${videoId}`, currentViews);
    viewsText.textContent = `${currentViews} views`;

    card.dataset.counted = "true";
  });
});
