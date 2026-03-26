console.log("script.js loaded");

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded");

  const internalBtn = document.getElementById("internal-btn");
  const externalBtn = document.getElementById("external-btn");

  console.log("internalBtn =", internalBtn);
  console.log("externalBtn =", externalBtn);

  if (internalBtn) {
    internalBtn.addEventListener("click", () => {
      console.log("internal clicked");
      window.location.href = "internal.html";
    });
  }

  if (externalBtn) {
    externalBtn.addEventListener("click", () => {
      console.log("external clicked");
    });
  }
});
