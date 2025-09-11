let videoEl, canvas, ctx;
let mediaStream = null;
let captureCount = 0;
let running = false;

const statusEl   = () => document.getElementById('status');
const hintEl     = () => document.getElementById('hint');
const fallbackEl = () => document.getElementById('downloadFallback');

function setUI(runningOn){
  document.getElementById('startBtn').disabled = runningOn;
  document.getElementById('stopBtn').disabled  = !runningOn;
  document.getElementById('shotBtn').disabled  = !runningOn;
  statusEl().textContent = runningOn ? 'Kamera aktiv' : 'Bereit';
}

/* Kamera starten */
async function setupCamera(){
  if(running) return;
  try{
    videoEl = document.getElementById('video');
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { width: {ideal: 1280}, height: {ideal: 720}, facingMode: 'user' },
      audio: false
    });
    videoEl.srcObject = mediaStream;
    await videoEl.play();

    canvas = document.getElementById('overlay');
    canvas.width  = videoEl.videoWidth  || 1280;
    canvas.height = videoEl.videoHeight || 720;
    ctx = canvas.getContext('2d');

    running = true;
    setUI(true);
    hintEl().style.display = 'none';
    loop();
  }catch(err){
    console.error(err);
    statusEl().textContent = 'Kamerazugriff abgelehnt';
  }
}

/* Kamera stoppen */
function stopCamera(){
  if(!running) return;
  if(mediaStream){ mediaStream.getTracks().forEach(t=>t.stop()); mediaStream=null; }
  if(videoEl){ videoEl.pause(); videoEl.srcObject=null; }
  if(ctx && canvas){ ctx.clearRect(0,0,canvas.width,canvas.height); }
  running = false;
  setUI(false);
  hintEl().style.display = '';
}

/* Vollbild */
function toggleFullscreen(){
  const el = document.documentElement;
  if(!document.fullscreenElement){
    if(el.requestFullscreen) el.requestFullscreen();
    else if(el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else if(videoEl && videoEl.webkitEnterFullscreen) videoEl.webkitEnterFullscreen();
  }else{
    if(document.exitFullscreen) document.exitFullscreen();
    else if(document.webkitExitFullscreen) document.webkitExitFullscreen();
  }
}

/* Foto speichern (PNG) mit Zähler + Zeitstempel */
function downloadSnapshot(){
  if(!canvas) return;

  const tmp = document.createElement('canvas');
  tmp.width = canvas.width; tmp.height = canvas.height;
  const tctx = tmp.getContext('2d');

  // Canvas ist already gespiegelt → direkt kopieren
  tctx.drawImage(canvas, 0, 0);

  captureCount += 1;
  const stamp = new Date().toLocaleString();
  const pad = 16, h = 56, w = Math.min(tmp.width * .8, 560);
  tctx.font = Math.max(18, Math.round(tmp.width * .03)) + 'px system-ui, sans-serif';
  tctx.fillStyle = 'rgba(0,0,0,.55)';
  tctx.fillRect(pad, tmp.height - h - pad, w, h);
  tctx.fillStyle = '#fff';
  tctx.fillText(`Bild #${captureCount} • ${stamp}`, pad + 12, tmp.height - pad - 18);

  try{
    const url = tmp.toDataURL('image/png');
    const a = document.createElement('a');
    const fname = stamp.replace(/[/,: ]+/g,'-');
    a.href = url; a.download = `aktiv-hero-${captureCount}-${fname}.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }catch(e){
    // iOS Fallback: Link anzeigen
    const url = tmp.toDataURL('image/png');
    fallbackEl().innerHTML = `<a href="${url}" target="_blank">Bild öffnen (lange drücken zum Sichern)</a>`;
  }
}

/* Render-Loop – wie Spiegel (Selfie) */
function loop(){
  if(!running) return;
  const w = canvas.width, h = canvas.height;
  ctx.save();
  ctx.translate(w, 0); ctx.scale(-1, 1); // spiegeln
  ctx.drawImage(videoEl, 0, 0, w, h);
  ctx.restore();
  requestAnimationFrame(loop);
}

/* Buttons anschließen */
document.getElementById('startBtn').onclick = setupCamera;
document.getElementById('stopBtn').onclick  = stopCamera;
document.getElementById('fsBtn').onclick    = toggleFullscreen;
document.getElementById('shotBtn').onclick  = downloadSnapshot;
