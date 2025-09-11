<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Aktiv Hero – Kamera</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <header class="topbar">
    <div class="brand">🏃‍♂️ Aktiv Hero</div>
    <nav class="status" id="status">Bereit</nav>
  </header>

  <main>
    <section class="stage">
      <div class="frame">
        <video id="video" autoplay playsinline></video>
        <canvas id="overlay" aria-label="Kamera-Ansicht"></canvas>

        <!-- Hinweis erscheint vor dem Start -->
        <div class="hint" id="hint">
          <h2>Los geht’s!</h2>
          <p>Tippe auf <strong>Start</strong> und erlaube den Kamerazugriff.</p>
          <p class="small">Tipp: Stelle dich gut beleuchtet vor das Gerät.</p>
        </div>
      </div>

      <div class="toolbar">
        <button id="startBtn" class="btn primary">▶ Start</button>
        <button id="stopBtn" class="btn danger" disabled>■ Stopp</button>
        <button id="fsBtn" class="btn">⛶ Vollbild</button>
        <button id="shotBtn" class="btn warn" disabled>📸 Foto speichern</button>
      </div>

      <div id="downloadFallback" class="fallback"></div>
    </section>
  </main>

  <footer class="foot">
    <span>© Aktiv Hero • läuft 100% im Browser • keine Daten werden hochgeladen</span>
  </footer>

  <script src="game.js"></script>
</body>
</html>
