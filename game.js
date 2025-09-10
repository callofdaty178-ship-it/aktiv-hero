// Einfaches Demo: Kamera öffnen und Video anzeigen
let videoEl, canvas, ctx;

async function setupCamera() {
  videoEl = document.getElementById('video');
  const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
  videoEl.srcObject = stream;
  await videoEl.play();

  // Canvas gleich groß machen
  canvas = document.getElementById('overlay');
  canvas.width = videoEl.videoWidth;
  canvas.height = videoEl.videoHeight;
  ctx = canvas.getContext('2d');

  loop();
}

function loop() {
  // Einfach nur das Bild spiegeln (optional)
  ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
  requestAnimationFrame(loop);
}

document.getElementById('startBtn').onclick = setupCamera;
// ---- Vollbild umschalten (mit iPad-/Safari-Fallback) ----
function toggleFullscreen() {
  const el = document.documentElement;   // ganze Seite
  // Standard Fullscreen API
  if (!document.fullscreenElement) {
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen(); // Safari alt
    // iPad-Safari-Fallback: Video-Vollbild
    else if (videoEl && videoEl.webkitEnterFullscreen) videoEl.webkitEnterFullscreen();
  } else {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
  }
}

// ---- PNG-Snapshot vom Canvas herunterladen ----
function downloadSnapshot() {
  if (!canvas) return;
  try {
    const url = canvas.toDataURL("image/png");
    const a = document.createElement('a');
    a.href = url;
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    a.download = `aktiv-hero-${ts}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (e) {
    // iOS kann Downloads manchmal blockieren: Link sichtbar machen als Fallback
    const url = canvas.toDataURL("image/png");
    let link = document.getElementById('downloadFallback');
    if (!link) {
      link = document.createElement('a');
      link.id = 'downloadFallback';
      link.style.display = 'block';
      link.style.margin = '1rem auto';
      link.style.color = '#ff9800';
      link.textContent = 'Bild öffnen (lange drücken zum Sichern)';
      document.querySelector('main').appendChild(link);
    }
    link.href = url;
    link.target = '_blank';
  }
}

// ---- Buttons verdrahten ----
document.getElementById('fsBtn').onclick   = toggleFullscreen;
document.getElementById('shotBtn').onclick = downloadSnapshot;
