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
