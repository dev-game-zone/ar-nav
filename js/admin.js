let route = { name: "", markers: [] };

// Render current markers
function renderMarkers() {
  const listDiv = document.getElementById("markerList");
  listDiv.innerHTML = "";
  route.markers.forEach((m, idx) => {
    const div = document.createElement("div");
    div.className = "marker-item";
    div.textContent = `${idx + 1}. ${m.id} → ${m.instruction} | Arrow: ${m.arrowType} | Pos: ${m.arrowPos} | Rot: ${m.arrowRot} | Scale: ${m.arrowScale}`;
    listDiv.appendChild(div);
  });
}

// Add marker to route
document.getElementById("addMarkerBtn").addEventListener("click", () => {
  const id = document.getElementById("markerId").value.trim();
  const instruction = document.getElementById("markerInstruction").value.trim();
  const arrowType = document.getElementById("arrowType").value;
  const arrowPos = document.getElementById("arrowPos").value.trim() || "0 0 -2";
  const arrowRot = document.getElementById("arrowRot").value.trim() || "-90 0 0";
  const arrowScale = document.getElementById("arrowScale").value.trim() || "0.3 0.3 0.3";

  if (!id || !instruction) { alert("Marker ID and instruction required"); return; }

  route.markers.push({
    id,
    instruction,
    arrowType,
    arrowPos,
    arrowRot,
    arrowScale
  });

  renderMarkers();

  // Clear input fields
  document.getElementById("markerId").value = "";
  document.getElementById("markerInstruction").value = "";
  document.getElementById("arrowPos").value = "";
  document.getElementById("arrowRot").value = "";
  document.getElementById("arrowScale").value = "";
});

// Save route as JSON
document.getElementById("saveRouteBtn").addEventListener("click", () => {
  route.name = document.getElementById("routeName").value.trim();
  if (!route.name || route.markers.length === 0) { alert("Route name and at least one marker required"); return; }

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(route, null, 2));
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute("href", dataStr);
  dlAnchor.setAttribute("download", `${route.name.replace(/\s+/g,'_')}.json`);
  dlAnchor.click();
});
