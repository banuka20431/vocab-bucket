document.addEventListener("DOMContentLoaded", () => {
  const closeBtn = document.getElementById("close-btn");
  if (closeBtn) closeBtn.addEventListener("click", () => window.close());

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") window.close();
  });

  setTimeout(window.close, 10_000);
});
