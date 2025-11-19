// Example route data
const routes = {
  "QR001": {
    instruction: "Proceed forward to the main hallway.",
    arrowDir: "forward"
  },
  "QR002": {
    instruction: "Turn left at the bottom of the stairs.",
    arrowDir: "left"
  },
  "QR003": {
    instruction: "Head up the stairs to the right.",
    arrowDir: "right"
  },
  "QR004": {
    instruction: "You arrived at the room!",
    arrowDir: "none"
  }
};

let qrScanner;

// Create AR arrow
function showARArrow(direction) {
  const container = document.getElementById("arrow-container");
  container.innerHTML = ""; // clear old arrow

  if (direction === "none") return;

  let rotation;
  if (direction === "forward") rotation = "0 0 0";
  if (direction === "left")    rotation = "0 90 0";
  if (direction === "right")   rotation = "0 -90 0";

  const arrow = document.createElement("a-entity");
  arrow.setAttribute("gltf-model", "#arrowModel");
  arrow.setAttribute("position", "0 0 -2");
  arrow.setAttribute("rotation", rotation);
  arrow.setAttribute("scale", "1 1 1");

  container.appendChild(arrow);
}

// Handle scanned QR code
function handleScan(code) {
  const info = routes[code];
  if (!info) return;

  document.getElementById("instruction-box").innerText = info.instruction;
  showARArrow(info.arrowDir);
}

// Initialize after DOM load
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("startScanBtn");

  btn.addEventListener("click", () => {
    btn.style.display = "none"; // hide button

    const readerDivId = "qr-reader";

    qrScanner = new Html5Qrcode(readerDivId);

    qrScanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 250 },
      qrCodeMessage => handleScan(qrCodeMessage),
      errorMessage => {}
    )
    .catch(err => console.error("Camera error:", err));
  });
});
