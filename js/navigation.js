let qrScanner = null;
let destination = null;
let userCoords = null;

document.addEventListener("DOMContentLoaded", () => {
  console.log("Starting QR scanner…");

  const readerDivId = "qr-reader";
  const instructionBox = document.getElementById("instruction-box");

  qrScanner = new Html5Qrcode(readerDivId);

  // Start immediately
  qrScanner.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: 250 },
    qrCodeMessage => handleScan(qrCodeMessage),
    err => {}
  )
  .then(() => {
    instructionBox.innerText = "Point the camera at a QR code.";
  })
  .catch(err => {
    instructionBox.innerText = "Camera failed: " + err;
    console.error(err);
  });
});

// Parse QR → Extract GPS target data
function handleScan(data) {
  console.log("QR Scanned:", data);

  try {
    destination = JSON.parse(data);
    if (!destination.lat || !destination.lng) throw "Invalid QR format";

    document.getElementById("instruction-box").innerText =
      "Destination loaded! Move your phone to calibrate.";

    placeArrow();
  } catch (e) {
    console.error("QR parse error:", e);
  }
}

// Main AR arrow placement
function placeArrow() {
  const arrow = document.getElementById("arrow");
  arrow.setAttribute("visible", "true");

  // GPS Camera listener
  window.addEventListener("gps-camera-update-position", e => {
    userCoords = {
      lat: e.detail.position.latitude,
      lng: e.detail.position.longitude,
    };

    updateArrowRotation();
  });
}

// Rotate arrow toward destination
function updateArrowRotation() {
  if (!userCoords || !destination) return;

  const dx = destination.lng - userCoords.lng;
  const dy = destination.lat - userCoords.lat;

  const bearing = Math.atan2(dx, dy) * (180 / Math.PI);

  const arrow = document.getElementById("arrow");
  arrow.setAttribute("rotation", `0 ${bearing} 0`);
}
