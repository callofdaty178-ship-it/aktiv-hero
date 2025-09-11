// TODO (Copilot): Skelett-Overlay zeichnen (Keypoints + Verbindungen), Farben nach Konfidenz

let detector, videoEl, canvas, ctx;

// --- Persistenz-Keys (Versionierung sinnvoll) ---
const STORAGE_MAIN = "aktiv_held_progress_v2";
const STORAGE_WEEK = "aktiv_held_week_v1";
const STORAGE_CFG  = "aktiv_held_config_v1";

// --- Laufende Werte ---
let counter = 0, score = 0, moveName = "Jumping Jacks";
let lastState = "idle"; // JJ: open/closed; Squat: down/up; Armheben: raised/lowered

// --- Belohnungen ---
let nextBadgeAt = 5;
let badgesEarned = 0;

// --- Konfiguration (wird aus LocalStorage geladen/gespeichert) ---
let cfg = {
  // ✨ Bitte Copilot: "Standardwerte setzen und beim Start aus LocalStorage laden"
  confThreshold: 0.30,   // Mindestkonfidenz für Keypoints
  jjAnkleDist: 120,      // Mindestabstand Knöchel in Pixeln (JJ open)
  squatDownDeg: 120,     // <= down
  squatUpDeg: 160        // >= up
};

// Hilfszugriff UI
const toastEl = () => document.getElementById('toast');
const badgeWrap = () => document.getElementById('badges');

// -------------------- Persistenz: Hauptfortschritt --------------------
function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_MAIN);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (typeof data.counter === "number") counter = data.counter;
    if (typeof data.score === "number") score = data.score;
    if (typeof data.badgesEarned === "number") badgesEarned = data.badgesEarned;
    if (typeof data.nextBadgeAt === "number") nextBadgeAt = data.nextBadgeAt;

    document.getElementById('counter').textContent = counter;
    document.getElementById('score').textContent = score;

    badgeWrap().innerHTML = "";
    for (let i = 1; i <= badgesEarned; i++) {
      addBadgeElement(`Badge ${i} • ${moveName}`, false);
    }
  } catch (e) { console.warn("Progress laden fehlgeschlagen:", e); }
}
function saveProgress() {
  try {
    const data = { counter, score, badgesEarned, nextBadgeAt };
    localStorage.setItem(STORAGE_MAIN, JSON.stringify(data));
  } catch (e) { console.warn("Progress speichern fehlgeschlagen:", e); }
}

// -------------------- Persistenz: 7-Tage-Statistik --------------------
/*
  Struktur:
  { "2025-09-04": { reps: 12, points: 120 }, ... }
*/
function todayKey() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
function loadWeek() {
  try {
    const raw = localStorage.getItem(STORAGE_WEEK);
    return raw ? JSON.parse(raw) : {};
  } catch(e) { console.warn("Week laden fehlgeschlagen:", e); return {}; }
}
function saveWeek(weekObj) {
  try {
    localStorage.setItem(STORAGE_WEEK, JSON.stringify(weekObj));
  } catch(e) { console.warn("Week speichern fehlgeschlagen:", e); }
}
function pruneTo7Days(obj) {
  // ✨ Einfach halten: nur die letzten 7 Schlüssel nach Datum behalten
  const keys = Object.keys(obj).sort(); // aufsteigend
  while (keys.length > 7) {
    const k = keys.shift();
    delete obj[k];
  }
}
function addTodayRepAndPoints(pointsAdd = 10) {
  const week = loadWeek();
  const k = todayKey();
  if (!week[k]) week[k] = { reps: 0, points: 0 };
  week[k].reps += 1;
  week[k].points += pointsAdd;
  pruneTo7Days(week);
  saveWeek(week);
  renderWeeklyTable(week);
}
function renderWeeklyTable(existing=null) {
  const week = existing || loadWeek();
  const tbody = document.querySelector('#weeklyTable tbody');
  if (!tbody) return;

  // Sicherstellen, dass 7 Zeilen (letzte 7 Tage) angezeigt werden
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth()+1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const key = `${yyyy}-${mm}-${dd}`;
    const val = week[key] || { reps: 0, points: 0 };
    days.push({ key, ...val });
  }

  tbody.innerHTML = days.map(row => `
    <tr>
      <td>${row.key}</td>
      <td>${row.reps}</td>
      <td>${row.points}</td>
    </tr>
  `).join('');
}

// -------------------- Persistenz: Konfiguration --------------------
function loadConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_CFG);
    if (raw) Object.assign(cfg, JSON.parse(raw));
  } catch(e) { console.warn("Config laden fehlgeschlagen:", e); }
}
function saveConfig() {
  try {
    localStorage.setItem(STORAGE_CFG, JSON.stringify(cfg));
  } catch(e) { console.warn("Config speichern fehlgeschlagen:", e); }
}
function openSettings() {
  // Felder mit aktuellen Werten füllen
  document.getElementById('confThreshold').value = cfg.confThreshold;
  document.getElementById('jjAnkleDist').value = cfg.jjAnkleDist;
  document.getElementById('squatDownDeg').value = cfg.squatDownDeg;
  document.getElementById('squatUpDeg').value = cfg.squatUpDeg;
  document.getElementById('settingsModal').showModal();
}
function applySettingsFromUI() {
  // ✨ Werte validieren und übernehmen
  const c = parseFloat(document.getElementById('confThreshold').value);
  const d = parseInt(document.getElementById('jjAnkleDist').value, 10);
  const sd = parseInt(document.getElementById('squatDownDeg').value, 10);
  const su = parseInt(document.getElementById('squatUpDeg').value, 10);

  if (!Number.isNaN(c) && c >= 0 && c <= 1) cfg.confThreshold = c;
  if (!Number.isNaN(d)) cfg.jjAnkleDist = d;
  if (!Number.isNaN(sd)) cfg.squatDownDeg = sd;
  if (!Number.isNaN(su)) cfg.squatUpDeg = su;

  saveConfig();
  showToast("Einstellungen gespeichert");
}

// -------------------- Kamera/Detector --------------------
async function setupCamera() {
  videoEl = document.getElementById('video');
  const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
  videoEl.srcObject = stream;
  await videoEl.play();
  return videoEl;
}
async function createDetector() {
  const detectorConfig = { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING };
  return await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, detectorConfig);
}

// -------------------- Hilfsfunktionen Pose --------------------
function getPoint(keypoints, name) {
  const p = keypoints.find(k => k.name === name);
  return (p && p.score >= cfg.confThreshold) ? p : null;
}
function angleDeg(a, b, c) {
  if (!a || !b || !c) return null;
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = (ab.x * cb.x + ab.y * cb.y);
  const magAB = Math.hypot(ab.x, ab.y);
  const magCB = Math.hypot(cb.x, cb.y);
  if (magAB === 0 || magCB === 0) return null;
  let cos = dot / (magAB * magCB);
  cos = Math.min(1, Math.max(-1, cos));
  return Math.acos(cos) * (180 / Math.PI);
}
function drawKeypoints(keypoints) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  keypoints.forEach(kp => {
    if (kp.score >= cfg.confThreshold) {
      ctx.beginPath();
      ctx.arc(kp.x, kp.y, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
  });
}

// -------------------- Erkenner --------------------
function detectJumpingJack(keypoints) {
  const lw = getPoint(keypoints, 'left_wrist');
  const rw = getPoint(keypoints, 'right_wrist');
  const la = getPoint(keypoints, 'left_ankle');
  const ra = getPoint(keypoints, 'right_ankle');
  const ls = getPoint(keypoints, 'left_shoulder');
  const rs = getPoint(keypoints, 'right_shoulder');
  if (!lw || !rw || !la || !ra || !ls || !rs) return null;

  const handsUp = lw.y < ls.y && rw.y < rs.y;
  const anklesApart = Math.abs(la.x - ra.x) > cfg.jjAnkleDist;

  return (handsUp && anklesApart) ? "open" : "closed";
}
function detectSquat(keypoints) {
  const hip = getPoint(keypoints, 'right_hip');
  const knee = getPoint(keypoints, 'right_knee');
  const ankle = getPoint(keypoints, 'right_ankle');
  const angle = angleDeg(hip, knee, ankle);
  if (angle == null) return null;
  if (angle <= cfg.squatDownDeg) return "down";
  if (angle >= cfg.squatUpDeg) return "up";
  return null;
}
function detectArmRaise(keypoints) {
  const rw = getPoint(keypoints, 'right_wrist');
  const rs = getPoint(keypoints, 'right_shoulder');
  if (!rw || !rs) return null;
  const raised = rw.y < rs.y - 10; // kleiner Puffer
  return raised ? "raised" : "lowered";
}

// -------------------- Zähl- & Belohnungslogik --------------------
function updateCounter(state) {
  if (!state) return;

  if (moveName === "Jumping Jacks") {
    if (lastState === "closed" && state === "open") lastState = "open";
    else if (lastState === "open" && state === "closed") { onRepCompleted(); lastState = "closed"; }
    else { lastState = state; }
  } else if (moveName === "Squat") {
    if (lastState === "up" && state === "down") lastState = "down";
    else if (lastState === "down" && state === "up") { onRepCompleted(); lastState = "up"; }
    else if (lastState === "idle" && state) { lastState = state; }
    else { lastState = state || lastState; }
  } else if (moveName === "Armheben") {
    if (lastState === "lowered" && state === "raised") lastState = "raised";
    else if (lastState === "raised" && state === "lowered") { onRepCompleted(); lastState = "lowered"; }
    else if (lastState === "idle" && state) { lastState = state; }
    else { lastState = state || lastState; }
  }
}
function onRepCompleted() {
  counter += 1;
  score += 10;
  document.getElementById('counter').textContent = counter;
  document.getElementById('score').textContent = score;

  // Wöchentliche Statistik updaten
  addTodayRepAndPoints(10);

  // Badge alle 5
  if (counter >= nextBadgeAt) {
    badgesEarned += 1;
    nextBadgeAt += 5;
    addBadgeElement(`Badge ${badgesEarned} • ${moveName}`, true);
    showToast(`Super! Neues Badge freigeschaltet 🎉`);
    // optionaler Sound:
    const s = document.getElementById('badgeSound');
    if (s) { try { s.currentTime = 0; s.play().catch(()=>{}); } catch(e){} }
  }

  saveProgress();
}
function addBadgeElement(text, pop=true) {
  const b = document.createElement('div');
  b.className = 'badge' + (pop ? ' pop' : '');
  b.textContent = text;
  badgeWrap().appendChild(b);
  if (pop) setTimeout(() => b.classList.remove('pop'), 250);
}
function showToast(msg) {
  const t = toastEl();
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1500);
}

// -------------------- Loop --------------------
async function loop() {
  const poses = await detector.estimatePoses(videoEl);
  if (poses && poses[0]) {
    const kps = poses[0].keypoints.map(k => ({ x: k.x, y: k.y, score: k.score, name: k.name }));
    drawKeypoints(kps);

    let state = null;
    if (moveName === "Jumping Jacks") state = detectJumpingJack(kps);
    else if (moveName === "Squat")    state = detectSquat(kps);
    else if (moveName === "Armheben") state = detectArmRaise(kps);

    updateCounter(state);
  }
  requestAnimationFrame(loop);
}

// -------------------- Init --------------------
async function start() {
  loadConfig();
  loadProgress();
  renderWeeklyTable(); // letzte 7 Tage anzeigen

  await setupCamera();
  canvas = document.getElementById('overlay');
  canvas.width = videoEl.videoWidth;
  canvas.height = videoEl.videoHeight;
  ctx = canvas.getContext('2d');
  detector = await createDetector();

  if (moveName === "Jumping Jacks") lastState = "closed";
  else if (moveName === "Squat")    lastState = "up";
  else if (moveName === "Armheben") lastState = "lowered";

  loop();
}

// -------------------- UI Events --------------------
document.getElementById('startBtn').onclick = start;

document.getElementById('switchMoveBtn').onclick = () => {
  if (moveName === "Jumping Jacks") moveName = "Squat";
  else if (moveName === "Squat")    moveName = "Armheben";
  else                              moveName = "Jumping Jacks";

  document.getElementById('moveName').textContent = moveName;
  lastState = "idle";
  showToast(`Übung gewechselt: ${moveName}`);
};

document.getElementById('settingsBtn').onclick = openSettings;

document.getElementById('saveSettingsBtn').onclick = (e) => {
  e.preventDefault();
  applySettingsFromUI();
  document.getElementById('settingsModal').close();
};
