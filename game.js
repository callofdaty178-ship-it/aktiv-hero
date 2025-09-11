let videoEl, canvas, ctx;
let mediaStream = null;
let captureCount = 0;

// ---- Kamera starten ----
async function setupCamera() {
  videoEl = document.getElementById('video');
  mediaStream = await navigator.mediaDevices.getUserMedia({
    video: { width: 640, height: 480 }
  });
  videoEl.srcObject = mediaStream;
  await videoEl.play();

  canvas = document.getElementById('overlay');
  canvas.width = videoEl.videoWidth;
  canvas.height = videoEl.videoHeight;
  ctx = canvas.getContext('2d');

  loop();
}

// ---- Kamera stoppen ----
function stopCamera() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(t => t.stop());
    mediaStream = null;
  }
  if (videoEl) {
    videoEl.pause();
    videoEl.srcObject = null;
  }
  if (ctx && canvas) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

// ---- Vollbild umschalten ----
function toggleFullscreen() {
  const el = document.documentElement;
  if (!document.fullscreenElement) {
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else if (videoEl && videoEl.webkitEnterFullscreen) videoEl.webkitEnterFullscreen();
  } else {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
  }
}

// ---- Foto speichern (PNG mit Zähler + Zeitstempel) ----
function downloadSnapshot() {
  if (!canvas) return;

  const temp = document.createElement('canvas');
  temp.width = canvas.width;
  temp.height = canvas.height;
  const tctx = temp.getContext('2d');

  // aktuelles Bild kopieren
  tctx.drawImage(canvas, 0, 0);

  // Text hinzufügen
  captureCount += 1;
  const stamp = new Date().toLocaleString();
  tctx.font = Math.max(16, Math.round(canvas.width * 0.035)) + 'px sans-serif';
  tctx.fillStyle = 'rgba(0,0,0,0.55)';
  tctx.fillRect(10, temp.height - 50, 480, 42);
  tctx.fillStyle = '#fff';
  tctx.fillText(`Bild #${captureCount} • ${stamp}`, 20, temp.height - 20);

  // speichern
  try {
    const url = temp.toDataURL("image/png");
    const a = document.createElement('a');
    const fnameTime = stamp.replace(/[/,: ]+/g, '-');
    a.href = url;
    a.download = `aktiv-hero-${captureCount}-${fnameTime}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (e) {
    // Fallback für iOS
    const url = temp.toDataURL("image/png");
    let link = document.getElementById('downloadFallback');
    link.innerHTML = `<a href="${url}" target="_blank">Bild öffnen (lange drücken zum Sichern)</a>`;
  }
}

// ---- Loop: Video auf Canvas zeichnen ----
function loop() {
  if (videoEl && ctx) {
    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
  }
  requestAnimationFrame(loop);
}

// ---- Buttons verbinden ----
document.getElementById('startBtn').onclick = setupCamera;
document.getElementById('stopBtn').onclick  = stopCamera;
document.getElementById('fsBtn').onclick    = toggleFullscreen;
document.getElementById('shotBtn').onclick  = downloadSnapshot;
