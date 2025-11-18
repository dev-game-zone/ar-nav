let currentRoute = null;
let triggeredMarkers = {};

// Load the route JSON
fetch("data/example-route.json")
  .then(res => res.json())
  .then(route => {
    currentRoute = route;
    setupMarkers(route.markers);
  })
  .catch(err => console.error("Failed to load route:", err));

function setupMarkers(markers) {
  const scene = document.querySelector("a-scene");

  markers.forEach((m, idx) => {
    triggeredMarkers[m.id] = false;

    // Create a marker entity dynamically
    const marker = document.createElement("a-marker");
    marker.setAttribute("type", "pattern");
    marker.setAttribute("url", m.patt);
    marker.setAttribute("id", m.id);
    marker.setAttribute("emitevents", "true");

    // Optional: add 3D arrow
    const arrow = document.createElement("a-box");
    arrow.setAttribute("position", "0 0.5 0");
    arrow.setAttribute("color", "red");
    arrow.setAttribute("scale", "0.3 0.3 0.3");
    marker.appendChild(arrow);

    scene.appendChild(marker);

    // Listen for marker detection
    marker.addEventListener("markerFound", () => {
      if (!triggeredMarkers[m.id]) {
        triggeredMarkers[m.id] = true;

        // Audio instructions
        const utter = new SpeechSynthesisUtterance(m.instruction);
        utter.rate = 1;
        window.speechSynthesis.speak(utter);

        // Update on-screen instruction
        document.getElementById("instruction-box").textContent = m.instruction;
      }
    });
  });
}
