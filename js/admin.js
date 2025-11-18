let route = { name: "", markers: [] };

function renderMarkers() {
  const listDiv = document.getElementById("markerList");
  listDiv.innerHTML = "";
  route.markers.forEach((m, idx) => {
    const div = document.createElement("div");
    div.className = "marker-item";
    div.textContent = `${idx + 1}. ${m.id} → ${m.instruction}`;
    listDiv.appendChild(div);
  });
}

document.getElementById("addMarkerBtn").addEventListener("click", () => {
  const id = document.getElementById("markerId").value.trim();
  const patt = document.getElementById("markerPatt").value.trim();
  const instruction = document.getElementById("markerInstruction").value.trim();
  if (!id || !patt || !instruction) { alert("All fields required"); return; }
  route.markers.push({ id, patt, instruction });
  renderMarkers();
});

document.getElementById("saveRouteBtn").addEventListener("click", () => {
  route.name = document.getElementById("routeName").value.trim();
  if (!route.name || route.markers.length === 0) { alert("Route name & at least one marker required"); return; }

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(route, null, 2));
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute("href", dataStr);
  dlAnchor.setAttribute("download", `${route.name.replace(/\s+/g,'_')}.json`);
  dlAnchor.click();
});
