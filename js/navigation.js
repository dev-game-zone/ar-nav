let qrScanner = null;
let destination = null;
let userCoords = null;
let gpsListenerAdded = false;
let fallbackStream = null;
let fallbackInterval = null;
let fallbackActive = false;
let fallbackRafId = null;

document.addEventListener("DOMContentLoaded", () => {
  console.log("Starting QR scanner…");

  // Html5Qrcode will inject video into the inner area so camera is constrained
  const readerDivId = "qr-area";
  const instructionBox = document.getElementById("instruction-box");
  const startBtn = document.getElementById('start-scan');

  if (typeof Html5Qrcode === 'undefined') {
    console.error('Html5Qrcode is not loaded.');
    document.getElementById('instruction-box').innerText = 'Scanner library failed to load.';
    return;
  }

  qrScanner = new Html5Qrcode(readerDivId);

  // Manual input fallback
  const manualInput = document.getElementById('manual-input');
  const manualBtn = document.getElementById('manual-submit');
  if (manualBtn) {
    manualBtn.addEventListener('click', () => {
      const value = manualInput.value.trim();
      if (value) {
        console.log('Manual input:', value);
        handleScan(value);
      }
    });
  }

  // Start on button click (better for mobile user gesture requirements)
  startBtn.addEventListener('click', async () => {
    instructionBox.innerText = 'Requesting camera...';
    const debug = document.getElementById('scan-debug');
    // For laptop webcams: scan FULL FRAME (no qrbox restriction)
    // This dramatically improves detection on low-res cameras
    const qrbox = undefined; // Let it scan the entire video feed

    try {
      const devices = await Html5Qrcode.getCameras();
      console.log('Available cameras:', devices);
      let chosen = null;
      if (devices && devices.length) {
        // For laptops, prefer the first camera (usually built-in webcam)
        // Only look for back camera if multiple cameras exist
        if (devices.length > 1) {
          chosen = devices.find(d => /back|rear|environment/i.test(d.label));
        }
        chosen = chosen || devices[0];
        debug.innerText = `Camera: ${chosen.label || chosen.id}`;
        console.log('Selected camera:', chosen);
      }

      const startConfig = {
        fps: 20, // Increase scan attempts
        aspectRatio: 1.0,
        disableFlip: false
        // No qrbox - scan entire frame for laptop webcams
      };

      console.log('🔍 Full-frame scanning mode (optimized for laptop webcam)');
      console.log('Hold QR code anywhere in view - does not need to be centered');

      // Html5Qrcode expects either a single device id or a single facingMode constraint.
      // Pass only one key: either the camera device id string or an object with facingMode.
      const cameraIdOrConfig = chosen ? chosen.id : { facingMode: 'environment' };

      console.log('Starting html5-qrcode with config', startConfig, cameraIdOrConfig);

      // Track last error to avoid spam
      let lastErrorMsg = '';
      let errorCount = 0;

      await qrScanner.start(
        cameraIdOrConfig,
        startConfig,
        qrCodeMessage => {
          console.log('QR detected by html5-qrcode:', qrCodeMessage);
          handleScan(qrCodeMessage);
        },
        err => {
          // Suppress normal "no QR found" errors - only log real problems
          const errStr = String(err || '');

          // These are normal during scanning - suppress them completely
          if (errStr.includes('NotFoundException') ||
            errStr.includes('No MultiFormat Readers') ||
            errStr.includes('QR code parse error')) {
            // Only log first occurrence
            if (errStr !== lastErrorMsg) {
              console.log('Scanning... (no QR detected yet)');
              lastErrorMsg = errStr;
              errorCount = 1;
            } else {
              errorCount++;
              // Log progress every 50 attempts so user knows it's working
              if (errorCount % 50 === 0) {
                console.log(`Still scanning... (${errorCount} attempts)`);
              }
            }
            return;
          }

          // Real errors - log them
          console.warn('Scanner error:', err);
        }
      );

      console.log('Scanner started successfully');
      debug.innerText = debug.innerText + ' | Scanner active';

      // Capture a snapshot after 3 seconds to help debug
      setTimeout(() => {
        try {
          const videoElement = document.querySelector('#qr-area video');
          if (videoElement) {
            const canvas = document.createElement('canvas');
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(videoElement, 0, 0);
            console.log('📷 Camera snapshot (for debugging):');
            console.log('Video resolution:', videoElement.videoWidth, 'x', videoElement.videoHeight);
            console.log('Right-click this image and "Open Image in New Tab" to inspect what camera sees:');
            console.log(canvas.toDataURL('image/png'));
          }
        } catch (e) {
          console.warn('Could not capture snapshot:', e);
        }
      }, 3000);

      // If html5-qrcode doesn't find anything reasonably quickly, start jsQR fallback
      setTimeout(() => {
        const debug = document.getElementById('scan-debug');
        if (debug && debug.innerText.indexOf('Scanned:') === -1) {
          console.log('Starting fallback scanner after timeout');
          debug.innerText = (debug.innerText || '') + ' | Fallback active';
          startFallbackScanner();
        }
      }, 5000);

      instructionBox.innerText = "Point the camera at a QR code.";
      startBtn.style.display = 'none';
    } catch (err) {
      instructionBox.innerText = "Camera failed: " + err;
      console.error(err);
    }
  });
});

// Parse QR → Extract GPS target data
function handleScan(data) {
  console.log("QR Scanned:", data);
  const debug = document.getElementById('scan-debug');
  if (debug) debug.innerText = `Scanned: ${data}`;

  try {
    // Try parse as JSON with lat/lng first
    try {
      const parsed = JSON.parse(data);
      if (parsed && parsed.lat && parsed.lng) {
        destination = parsed;
      } else {
        throw 'no-latlng';
      }
    } catch (e) {
      // not JSON lat/lng — treat as a marker ID like "QR001"
      const id = data.trim();
      // Attempt to load routes.json and find matching marker
      const routeUrl = 'data/routes.json';
      fetch(routeUrl)
        .then(r => r.json())
        .then(route => {
          const marker = (route.markers || []).find(m => m.id === id);
          if (marker) {
            console.log('Found marker:', marker);
            // Display the instruction from the marker
            document.getElementById('instruction-box').innerText = marker.instruction || `Loaded marker ${id}`;

            // Hide scanner UI to show AR scene
            const qrReader = document.getElementById('qr-reader');
            if (qrReader) qrReader.style.display = 'none';
            const manualDiv = qrReader ? qrReader.nextElementSibling : null;
            if (manualDiv) manualDiv.style.display = 'none';

            // Stop scanners (only if running)
            if (qrScanner) {
              qrScanner.stop().then(() => qrScanner.clear()).catch(e => {
                // Ignore "not running" errors - this is expected on subsequent scans
                if (!e.includes('not running') && !e.includes('not paused')) {
                  console.warn('Failed to stop scanner', e);
                }
              });
            }
            stopFallbackScanner();

            // Apply marker properties to arrow and show it
            const arrow = document.getElementById('arrow');
            if (marker.arrowPos) arrow.setAttribute('position', marker.arrowPos);
            if (marker.arrowRot) arrow.setAttribute('rotation', marker.arrowRot);
            if (marker.arrowScale) arrow.setAttribute('scale', marker.arrowScale);
            arrow.setAttribute('visible', 'true');

            console.log('Arrow placed with position:', marker.arrowPos, 'rotation:', marker.arrowRot);
            console.log('✅ AR Scene should now be visible. Look for the 3D arrow.');
          } else {
            console.error('Marker id not found in routes.json');
            document.getElementById('instruction-box').innerText = 'Unknown QR ID: ' + id;
          }
        })
        .catch(err => {
          console.error('Failed to load routes.json', err);
          document.getElementById('instruction-box').innerText = 'Invalid QR and failed to lookup route';
        });

      // Stop here if not JSON lat/lng
      return;
    }

    document.getElementById("instruction-box").innerText =
      "Destination loaded! Move your phone to calibrate.";

    // Stop camera preview from the QR scanner to free the device camera for AR
    if (qrScanner) {
      qrScanner.stop().then(() => qrScanner.clear()).catch(e => console.warn('Failed to stop/clear QR scanner', e));
    }

    // stop fallback if running
    stopFallbackScanner();

    placeArrow();
  } catch (e) {
    console.error("QR parse error:", e);
  }
}

// --- jsQR fallback implementation ---
async function startFallbackScanner() {
  if (fallbackActive) return;
  fallbackActive = true;
  const video = document.getElementById('fallback-video');
  const canvas = document.getElementById('fallback-canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  try {
    // Request higher resolution for better QR detection on laptop cameras
    const constraints = {
      video: {
        width: { ideal: 1280, min: 640 },
        height: { ideal: 720, min: 480 },
        facingMode: 'user' // Use 'user' for laptop front camera
      },
      audio: false
    };
    console.log('Starting fallback with constraints:', constraints);
    fallbackStream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = fallbackStream;
    video.style.display = 'block';
    console.log('Fallback video started');

    // Start an rAF loop; crop the center square region which maps to the visible tunnel
    let rafId = null;
    function scanFrame() {
      if (video.readyState !== video.HAVE_ENOUGH_DATA) {
        rafId = requestAnimationFrame(scanFrame);
        return;
      }

      const vw = video.videoWidth;
      const vh = video.videoHeight;
      // choose smaller dimension to make a square crop in center
      const side = Math.min(vw, vh);
      const sx = Math.floor((vw - side) / 2);
      const sy = Math.floor((vh - side) / 2);

      // scale down to canvas for processing (larger = better detection but slower)
      const targetSide = 600;
      canvas.width = targetSide;
      canvas.height = targetSide;
      ctx.drawImage(video, sx, sy, side, side, 0, 0, targetSide, targetSide);
      const imageData = ctx.getImageData(0, 0, targetSide, targetSide);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth' // Try both normal and inverted
      });
      if (code && code.data) {
        console.log('QR detected by jsQR fallback:', code.data);
        handleScan(code.data);
        cancelAnimationFrame(rafId);
        return;
      }

      rafId = requestAnimationFrame(scanFrame);
      fallbackRafId = rafId;
    }

    rafId = requestAnimationFrame(scanFrame);
  } catch (e) {
    console.warn('Fallback scanner failed', e);
    fallbackActive = false;
  }
}

function stopFallbackScanner() {
  if (fallbackInterval) { clearInterval(fallbackInterval); fallbackInterval = null; }
  if (fallbackRafId) { cancelAnimationFrame(fallbackRafId); fallbackRafId = null; }
  if (fallbackStream) {
    fallbackStream.getTracks().forEach(t => t.stop());
    fallbackStream = null;
  }
  const video = document.getElementById('fallback-video');
  if (video) { video.style.display = 'none'; video.srcObject = null; }
  fallbackActive = false;
}

// Main AR arrow placement
function placeArrow() {
  const arrow = document.getElementById("arrow");
  arrow.setAttribute("visible", "true");

  // Attach GPS coordinates to arrow so A-Frame places it in the world
  if (destination && destination.lat && destination.lng) {
    arrow.setAttribute('gps-entity-place', `latitude: ${destination.lat}; longitude: ${destination.lng};`);
  }

  // Add a single GPS update listener (guard against duplicates)
  if (!gpsListenerAdded) {
    gpsListenerAdded = true;
    window.addEventListener("gps-camera-update-position", e => {
      if (!e.detail || !e.detail.position) return;
      userCoords = {
        lat: e.detail.position.latitude,
        lng: e.detail.position.longitude,
      };

      updateArrowRotation();
    });
  }
}

// Rotate arrow toward destination
function updateArrowRotation() {
  if (!userCoords || !destination) return;

  // Calculate bearing (degrees) from current position to destination
  const toRad = deg => deg * Math.PI / 180;
  const toDeg = rad => rad * 180 / Math.PI;

  const lat1 = toRad(userCoords.lat);
  const lon1 = toRad(userCoords.lng);
  const lat2 = toRad(destination.lat);
  const lon2 = toRad(destination.lng);

  const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
  let brng = toDeg(Math.atan2(y, x));
  brng = (brng + 360) % 360; // normalize

  const arrow = document.getElementById("arrow");
  // A-Frame rotation: yaw around Y axis
  arrow.setAttribute("rotation", `0 ${brng} 0`);
}

function showArrow(direction) {
  const arrow = document.getElementById("arrow");

  let rotation;
  if (direction === "forward") rotation = "0 0 0";
  if (direction === "left") rotation = "0 90 0";
  if (direction === "right") rotation = "0 -90 0";

  arrow.setAttribute("rotation", rotation);
  arrow.setAttribute("visible", "true");
}
