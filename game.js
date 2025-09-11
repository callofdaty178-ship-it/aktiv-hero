let videoEl, canvas, ctx;
let mediaStream = null;
let captureCount = 0;
let running = false;
const statusEl = () => document.getElementById('status');
const hintEl = () => document.getElementById('hint');
const fallback = () => document.getElementById('downloadFallback');

function uiRunning(on){
  document.getElementById('startBtn').disabled = on;
  document.getElementById('stopBtn').disabled  = !on;
  document.getElementById('shotBtn').disabled  = !on;
  statusEl().textContent = on ? 'Kamera aktiv' : 'Bereit';
}

async function setupCamera() {
  if (running) return;
  try{
    videoEl = document.getElementById('video');
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { width: {ideal: 1280}, height: {ideal: 720}, facingMode: 'user' },
      audio: false
    });
    videoEl.srcObject = mediaStream;
    await videoEl.play();

    canvas = document.getElementById('overlay');
    canvas.width = videoEl.videoWidth || 1280;
    canvas.height = videoEl.videoHeight || 720;
    ctx = canvas.getContext('2d');

    running = true;
    uiRunning(true);
    hintEl().style.display = 'none';
    loop();
  }catch(err){
    console.error(err);
    statusEl().textContent = 'Kamerazugriff abgelehnt';
  }
}

function stopCamera() {
  if (!running) return;
  if (mediaStream){ mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null; }
  if (videoEl){ videoEl.pause(); videoEl.srcObject = null; }
  if (ctx && canvas){ ctx.clearRect(0,0,canvas.width,canvas.height); }
  running = false;
  uiRunning(false);
  hintEl().style.display = '';
}

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

function downloadSnapshot() {
  if (!canvas) return;

  const temp = document.createElement('canvas');
  temp.width = canvas.width;
  temp.height = canvas.height;
  const tctx = temp.getContext('2d');

  // Mirror-Effekt beibehalten: wir kopieren das Canvas (bereits gespiegelt)
  tctx.drawImage(canvas, 0, 0);

  captureCount += 1;
  const stamp = new Date().toLocaleString();
  const pad = 16, h = 56, w = Math.min(temp.width * .8, 560);
  tctx.font = Math.max(18, Math.round(temp.width * 0.03)) + 'px sans-serif';
  tctx.fillStyle = 'rgba(0,0,0,.55)';
  tctx.fillRect(pad, temp.height - h - pad, w, h);
  tctx.fillStyle = '#fff';
  tctx.fillText(`Bild #${captureCount} • ${stamp}`, pad + 12, temp.height - pad - 18);

  try{
    const url = temp.toDataURL('image/png');
    const a = document.createElement('a');
    const fnameTime = stamp.replace(/[/,: ]+/g, '-');
    a.href = url;
    a.download = `wat-gesund-${captureCount}-${fnameTime}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }catch(e){
    const url = temp.toDataURL('image/png');
    fallback().innerHTML = `<a href="${url}" target="_blank">Bild öffnen (lange drücken zum Sichern)</a>`;
  }
}

function loop() {
  if (!running) return;
  const w = canvas.width, h = canvas.height;
  // Spiegeln (wie ein Selfie)
  ctx.save();
  ctx.translate(w, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(videoEl, 0, 0, w, h);
  ctx.restore();
  requestAnimationFrame(loop);
}

document.getElementById('startBtn').onclick = setupCamera;
document.getElementById('stopBtn').onclick  = stopCamera;
document.getElementById('fsBtn').onclick    = toggleFullscreen;
document.getElementById('shotBtn').onclick  = downloadSnapshot;
