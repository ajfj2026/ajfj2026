const STORAGE_KEY = "ajfj2026_kanji_progress";

document.getElementById("reset-btn").addEventListener("click", e => {
  e.preventDefault();
  localStorage.removeItem(STORAGE_KEY);
  window.location.href = "index.html";
});
