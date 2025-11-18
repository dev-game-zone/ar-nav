let currentRoute = null;
let triggeredMarkers = {};

// Load route JSON
fetch("data/example-route.json")
  .then(res => res.json())
  .then(route => {
    currentRoute = route;
    currentRoute.markers.forEach(m => triggeredMarkers[m.id] = false);
    initQrScanner();
  });

function initQrScanner() {
  const qrCodeScanner = new Html5Qrcode("qr-reader");
  qrCodeScanner.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: 250 },
    qrMessage => handleQrScan(qrMessage)
  );
}

function handleQrScan(markerId) {
  if (!currentRoute) return;
  const marker = currentRoute.markers.find(m => m.id === markerId);
  if (!marker) return;

  if (!triggeredMarkers[markerId]) {
    triggeredMarkers[markerId] = true;

    // Play audio
    const utter = new SpeechSynthesisUtterance(marker.instruction);
    window.speechSynthesis.speak(utter);
    document.getElementById("instruction-box").textContent = marker.instruction;

    // Show 3D arrow
    showArrow(marker);
  }
}

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
