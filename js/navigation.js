let currentRoute = {
  name: "Test Route",
  markers: [
    { id: "QR001", instruction: "Walk straight ahead.", arrowType: "cone", arrowPos: "0 0 -2", arrowRot: "-90 0 0", arrowScale: "0.3 0.3 0.3" },
    { id: "QR002", instruction: "Turn left at the corridor.", arrowType: "cone", arrowPos: "0 0 -2", arrowRot: "-90 0 0", arrowScale: "0.3 0.3 0.3" },
    { id: "QR003", instruction: "You have arrived at Meeting Room A.", arrowType: "cone", arrowPos: "0 0 -2", arrowRot: "-90 0 0", arrowScale: "0.3 0.3 0.3" }
  ]
};

let triggeredMarkers = {};
currentRoute.markers.forEach(m => triggeredMarkers[m.id] = false);

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("startScanBtn");
  const readerDiv = document.getElementById("qr-reader");

  btn.addEventListener("click", () => {
    btn.style.display = "none";
    readerDiv.style.visibility = "visible"; // now visible

    const qrScanner = new Html5Qrcode("qr-reader");
    qrScanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 250 },
      qrMessage => handleQrScan(qrMessage)
    ).catch(err => console.error("Unable to start QR scanner:", err));
  });
});

// Handle scanned QR
function handleQrScan(markerId) {
  const marker = currentRoute.markers.find(m => m.id === markerId);
  if (!marker || triggeredMarkers[markerId]) return;

  triggeredMarkers[markerId] = true;

  // Play audio instruction
  const utter = new SpeechSynthesisUtterance(marker.instruction);
  window.speechSynthesis.speak(utter);

  // Update on-screen instruction
  document.getElementById("instruction-box").textContent = marker.instruction;

  // Show 3D arrow
  showArrow(marker);
}

// Show 3D arrow in A-Frame
function showArrow(marker) {
  const container = document.getElementById("arrow-container");
  while (container.firstChild) container.removeChild(container.firstChild);

  let arrow;
  const pos = marker.arrowPos.split(/[ ,]+/).map(Number);
  const rot = marker.arrowRot.split(/[ ,]+/).map(Number);
  const scale = marker.arrowScale.split(/[ ,]+/).map(Number);

  if (marker.arrowType === "cone") {
    arrow = document.createElement("a-cone");
    arrow.setAttribute("height", 0.5);
    arrow.setAttribute("radius-bottom", 0.2);
    arrow.setAttribute("radius-top", 0);
    arrow.setAttribute("color", "#FF0000");
  } else if (marker.arrowType === "box") {
    arrow = document.createElement("a-box");
    arrow.setAttribute("color", "#FF0000");
  } else if (marker.arrowType === "gltf") {
    arrow = document.createElement("a-entity");
    arrow.setAttribute("gltf-model", "https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models/2.0/Arrow/glTF/Arrow.gltf");
  }

  arrow.setAttribute("position", pos.join(" "));
  arrow.setAttribute("rotation", rot.join(" "));
  arrow.setAttribute("scale", scale.join(" "));
  container.appendChild(arrow);
}
