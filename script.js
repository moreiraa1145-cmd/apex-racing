
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// CONEXIÓN CON SUPABASE
// La URL debe terminar en .co, SIN /rest/v1/
const SUPABASE_URL = "https://wuqdpxkabdepaqdkxgjh.supabase.co";
const SUPABASE_KEY = "sb_publishable_PL21CdnyHOdaHFmo16WTBQ_VDpcUUXO";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

// ELEMENTOS HTML
const startButton = document.getElementById("startButton");
const resetButton = document.getElementById("resetButton");
const timerDisplay = document.getElementById("timer");
const lapStatus = document.getElementById("lapStatus");
const raceStatus = document.getElementById("raceStatus");
const trackStatus = document.getElementById("trackStatus");
const message = document.getElementById("message");
const rankingBody = document.getElementById("rankingBody");

const TOTAL_LAPS = 3;
const TRACK_WIDTH = 92;

const track = [
  { x: 100, y: 300 },
  { x: 120, y: 240 },
  { x: 170, y: 195 },
  { x: 240, y: 170 },
  { x: 300, y: 190 },
  { x: 335, y: 235 },
  { x: 320, y: 275 },
  { x: 370, y: 300 },
  { x: 430, y: 285 },
  { x: 470, y: 235 },
  { x: 510, y: 190 },
  { x: 570, y: 165 },
  { x: 640, y: 180 },
  { x: 690, y: 220 },
  { x: 680, y: 270 },
  { x: 635, y: 300 },
  { x: 585, y: 330 },
  { x: 550, y: 380 },
  { x: 490, y: 405 },
  { x: 430, y: 420 },
  { x: 370, y: 405 },
  { x: 330, y: 435 },
  { x: 270, y: 455 },
  { x: 205, y: 440 },
  { x: 155, y: 405 },
  { x: 115, y: 360 }
];

// OBSTÁCULOS
const obstacles = [
  { x: 245, y: 170, type: "cone" },
  { x: 328, y: 265, type: "cone" },
  { x: 450, y: 270, type: "oil" },
  { x: 570, y: 165, type: "barrier" },
  { x: 635, y: 300, type: "cone" },
  { x: 490, y: 405, type: "oil" },
  { x: 330, y: 435, type: "barrier" },
  { x: 155, y: 405, type: "cone" }
];

const keys = {};

let running = false;
let finished = false;
let raceStartedAt = 0;
let lastFrame = 0;
let raceResults = [];
let cars = [];

// CREAR VEHÍCULOS
function createCar(name, color, controls, offset) {
  return {
    name,
    color,
    controls,
    x: 100 + offset,
    y: 309,
    angle: -1.25,
    speed: 0,
    lap: 0,
    lastIndex: 0,
    passedFinish: false,
    finishTime: null,
    previousX: 100 + offset,
    previousY: 309
  };
}

// REINICIAR POSICIONES
function resetCars() {
  cars = [
    createCar(
      document.getElementById("pilot1").value.trim() || "Pilot Red",
      "#ff334b",
      { up: "w", down: "s", left: "a", right: "d" },
      -15
    ),

    createCar(
      document.getElementById("pilot2").value.trim() || "Pilot Blue",
      "#29b6ff",
      {
        up: "ArrowUp",
        down: "ArrowDown",
        left: "ArrowLeft",
        right: "ArrowRight"
      },
      15
    )
  ];

  cars[0].y = 292;
  cars[1].y = 318;
}

// FORMATO DEL CRONÓMETRO
function formatTime(ms) {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const millis = Math.floor(ms % 1000);

  return String(minutes).padStart(2, "0") + ":" +
    String(seconds).padStart(2, "0") + "." +
    String(millis).padStart(3, "0");
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// BUSCAR EL PUNTO MÁS CERCANO DE LA PISTA
function nearestTrackPoint(car) {
  let nearestIndex = 0;
  let shortestDistance = Infinity;

  for (let i = 0; i < track.length; i++) {
    const d = distance(car, track[i]);

    if (d < shortestDistance) {
      shortestDistance = d;
      nearestIndex = i;
    }
  }

  return {
    index: nearestIndex,
    distance: shortestDistance
  };
}

// FONDO
function drawBackground() {
  ctx.fillStyle = "#26372c";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(255,255,255,0.035)";
  ctx.lineWidth = 1;

  for (let x = 0; x < canvas.width; x += 30) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
}

// DIBUJAR CIRCUITO
function drawTrack() {
  drawBackground();

  ctx.beginPath();
  ctx.moveTo(track[0].x, track[0].y);

  for (let i = 1; i < track.length; i++) {
    ctx.lineTo(track[i].x, track[i].y);
  }

  ctx.closePath();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = "#e5e6e8";
  ctx.lineWidth = TRACK_WIDTH + 16;
  ctx.stroke();

  ctx.strokeStyle = "#414751";
  ctx.lineWidth = TRACK_WIDTH;
  ctx.stroke();

  ctx.strokeStyle = "#bdc4ce";
  ctx.lineWidth = 2;
  ctx.setLineDash([12, 12]);
  ctx.stroke();
  ctx.setLineDash([]);

  // LÍNEA DE META
  ctx.save();
  ctx.translate(100, 300);
  ctx.rotate(-1.25);

  for (let row = -23; row < 24; row++) {
    for (let col = 0; col < 2; col++) {
      ctx.fillStyle = (row + col) % 2 === 0
        ? "#ffffff"
        : "#111111";

      ctx.fillRect(col * 10 - 10, row * 2, 10, 2);
    }
  }

  ctx.restore();

  ctx.textAlign = "center";
  ctx.fillStyle = "#bfc8d4";
  ctx.font = "bold 16px Arial";
  ctx.fillText("APEX GRAND CIRCUIT", 440, 350);

  ctx.font = "11px Arial";
  ctx.fillText("3 LAPS • RACE TO THE FINISH", 440, 368);
}

// DIBUJAR OBSTÁCULOS
function drawObstacles() {
  for (const obstacle of obstacles) {
    ctx.save();
    ctx.translate(obstacle.x, obstacle.y);

    if (obstacle.type === "cone") {
      ctx.fillStyle = "#ff9633";
      ctx.beginPath();
      ctx.moveTo(0, -11);
      ctx.lineTo(9, 8);
      ctx.lineTo(-9, 8);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-5, 2, 10, 3);
    }

    if (obstacle.type === "oil") {
      ctx.fillStyle = "#171a22";
      ctx.beginPath();
      ctx.ellipse(0, 0, 15, 8, -0.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#525b70";
      ctx.fillRect(-5, -2, 8, 2);
    }

    if (obstacle.type === "barrier") {
      ctx.fillStyle = "#f5f5f5";
      ctx.fillRect(-16, -6, 32, 12);

      for (let x = -12; x <= 12; x += 12) {
        ctx.fillStyle = "#ff334b";
        ctx.fillRect(x, -6, 6, 12);
      }
    }

    ctx.restore();
  }
}

// DIBUJAR AUTOS
function drawCar(car, index) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);

  ctx.fillStyle = "#080a0d";
  ctx.fillRect(-9, -12, 10, 7);
  ctx.fillRect(5, -12, 10, 7);
  ctx.fillRect(-9, 6, 10, 7);
  ctx.fillRect(5, 6, 10, 7);

  ctx.fillStyle = "#e6e9ef";
  ctx.fillRect(-14, -11, 5, 22);

  ctx.fillStyle = car.color;
  ctx.beginPath();
  ctx.moveTo(19, 0);
  ctx.lineTo(7, -7);
  ctx.lineTo(-10, -6);
  ctx.lineTo(-14, 0);
  ctx.lineTo(-10, 6);
  ctx.lineTo(7, 7);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#111722";
  ctx.fillRect(-3, -4, 9, 8);

  ctx.fillStyle = "#d9dde5";
  ctx.fillRect(14, -11, 4, 22);

  ctx.restore();

  ctx.fillStyle = car.color;
  ctx.font = "bold 11px Arial";
  ctx.textAlign = "center";
  ctx.fillText("P" + (index + 1), car.x, car.y - 19);
}

// INFORMACIÓN SOBRE LA PISTA
function drawHUD() {
  for (let i = 0; i < cars.length; i++) {
    const car = cars[i];
    const x = i === 0 ? 12 : canvas.width - 222;

    ctx.fillStyle = "rgba(8,11,17,0.88)";
    ctx.fillRect(x, 12, 210, 60);

    ctx.textAlign = "left";
    ctx.fillStyle = car.color;
    ctx.font = "bold 13px Arial";
    ctx.fillText(car.name.toUpperCase().slice(0, 22), x + 10, 32);

    ctx.fillStyle = "#ffffff";
    ctx.font = "12px Arial";

    ctx.fillText(
      "VUELTA " + Math.min(car.lap, TOTAL_LAPS) + "/" + TOTAL_LAPS,
      x + 10,
      51
    );

    ctx.fillText(
      Math.round(Math.abs(car.speed) * 30) + " KM/H",
      x + 10,
      66
    );
  }
}

// DIBUJAR JUEGO
function draw() {
  drawTrack();
  drawObstacles();
  cars.forEach((car, index) => drawCar(car, index));
  drawHUD();
}

// ACTUALIZAR MOVIMIENTO DE LOS AUTOS
function updateCar(car, delta) {
  const control = car.controls;

  car.previousX = car.x;
  car.previousY = car.y;

  if (keys[control.up]) {
    car.speed += 0.12 * delta;
  }

  if (keys[control.down]) {
    car.speed -= 0.17 * delta;
  }

  car.speed *= Math.pow(0.992, delta);
  car.speed = Math.max(-2, Math.min(car.speed, 5.5));

  if (Math.abs(car.speed) > 0.15) {
    const direction = car.speed >= 0 ? 1 : -1;
    const turn = 0.045 * delta * direction;

    if (keys[control.left]) car.angle -= turn;
    if (keys[control.right]) car.angle += turn;
  }

  car.x += Math.cos(car.angle) * car.speed * delta;
  car.y += Math.sin(car.angle) * car.speed * delta;

  car.x = Math.max(12, Math.min(canvas.width - 12, car.x));
  car.y = Math.max(12, Math.min(canvas.height - 12, car.y));

  const nearest = nearestTrackPoint(car);

  if (nearest.distance > TRACK_WIDTH * 0.65) {
    car.speed *= Math.pow(0.94, delta);
  }

  // COLISIONES CON OBSTÁCULOS
  for (const obstacle of obstacles) {
    if (distance(car, obstacle) < 18) {
      car.speed *= 0.65;
      car.x = car.previousX;
      car.y = car.previousY;
      break;
    }
  }

  // COLISIÓN ENTRE AUTOS
  for (const other of cars) {
    if (other === car) continue;

    if (distance(car, other) < 22) {
      car.speed *= 0.75;
      car.x = car.previousX;
      car.y = car.previousY;
      break;
    }
  }

  // DETECTAR VUELTAS
  const index = nearest.index;
  const total = track.length;

  if (
    car.lastIndex > total - 4 &&
    index < 3 &&
    car.speed > 0.5 &&
    !car.passedFinish
  ) {
    car.lap++;
    car.passedFinish = true;

    message.textContent =
      car.name + " ha completado la vuelta " +
      car.lap + " de " + TOTAL_LAPS + ".";
  }

  if (index > 4) {
    car.passedFinish = false;
  }

  car.lastIndex = index;

  // TIEMPO DE LLEGADA INDIVIDUAL
  if (car.lap >= TOTAL_LAPS && car.finishTime === null) {
    car.finishTime = performance.now() - raceStartedAt;
  }
}

// ACTUALIZAR INFORMACIÓN EN PANTALLA
function updateUI() {
  const elapsed = performance.now() - raceStartedAt;

  timerDisplay.textContent = formatTime(elapsed);

  const fastestLapCount = Math.max(...cars.map(car => car.lap));
  lapStatus.textContent = fastestLapCount + " / " + TOTAL_LAPS;

  cars.forEach((car, index) => {
    document.getElementById("speed" + (index + 1)).textContent =
      Math.round(Math.abs(car.speed) * 30);

    document.getElementById("laps" + (index + 1)).textContent =
      Math.min(car.lap, TOTAL_LAPS) + " / " + TOTAL_LAPS;

    document.getElementById("speedBar" + (index + 1)).style.width =
      Math.min(100, Math.abs(car.speed) / 5.5 * 100) + "%";

    document.getElementById("result" + (index + 1)).textContent =
      car.finishTime !== null
        ? "Llegada: " + formatTime(car.finishTime)
        : "En carrera...";
  });
}

// FINALIZAR CARRERA
function finishRace() {
  if (!running || finished) return;

  running = false;
  finished = true;

  raceStatus.textContent = "FINALIZADA";
  trackStatus.textContent = "FINISH";
  startButton.textContent = "NUEVA CARRERA";
  startButton.disabled = false;

  raceResults = cars
    .filter(car => car.finishTime !== null)
    .map(car => ({
      name: car.name,
      time: car.finishTime
    }))
    .sort((a, b) => a.time - b.time);

  if (raceResults.length > 0) {
    const winner = raceResults[0];

    message.textContent =
      "¡" + winner.name + " gana con " +
      formatTime(winner.time) + "! Guardando resultados...";

    const winnerIndex = cars.findIndex(car => car === cars.find(
      item => item.name === winner.name
    ));

    if (winnerIndex !== -1) {
      document.getElementById("result" + (winnerIndex + 1)).textContent =
        "🏆 GANADOR · " + formatTime(winner.time);
    }
  }

  saveRaceResults();
}

// GUARDAR RESULTADOS EN SUPABASE
async function saveRaceResults() {
  if (raceResults.length === 0) {
    await loadRanking();
    return;
  }

  const rows = raceResults.map(result => ({
    player_name: result.name,
    laps: TOTAL_LAPS,
    time_ms: Math.round(result.time)
  }));

  const { error } = await supabaseClient
    .from("race_results")
    .insert(rows);

  if (error) {
    console.error(
      "Error al guardar resultados:",
      error.message,
      error.details,
      error.hint
    );

    message.textContent =
      "La carrera terminó, pero no se pudieron guardar los resultados. Revisa la consola.";

    return;
  }

  message.textContent += " Resultados guardados en la nube.";
  await loadRanking();
}

// CARGAR LOS 10 MEJORES RESULTADOS
async function loadRanking() {
  const { data, error } = await supabaseClient
    .from("race_results")
    .select("player_name, laps, time_ms, created_at")
    .order("time_ms", { ascending: true })
    .limit(10);

  if (error) {
    console.error(
      "Error al cargar la clasificación:",
      error.message,
      error.details,
      error.hint
    );

    rankingBody.innerHTML =
      '<tr><td colspan="4">No se pudo cargar la clasificación.</td></tr>';

    return;
  }

  if (!data || data.length === 0) {
    rankingBody.innerHTML =
      '<tr><td colspan="4">Todavía no hay resultados.</td></tr>';

    return;
  }

  rankingBody.innerHTML = data.map((result, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHTML(result.player_name)}</td>
      <td>${formatTime(Number(result.time_ms))}</td>
      <td>${index === 0 ? "MEJOR TIEMPO" : "REGISTRADO"}</td>
    </tr>
  `).join("");
}

// PROTEGER LOS NOMBRES MOSTRADOS EN LA TABLA
function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

// INICIAR CARRERA
function startRace() {
  if (running) return;

  if (finished) {
    resetRace();
  }

  resetCars();

  running = true;
  finished = false;
  raceStartedAt = performance.now();
  lastFrame = raceStartedAt;

  raceStatus.textContent = "EN CARRERA";
  trackStatus.textContent = "RACING";

  message.textContent =
    "¡Salida! Jugador 1: WASD. Jugador 2: flechas.";

  startButton.textContent = "CARRERA EN CURSO";
  startButton.disabled = true;
}

// REINICIAR CARRERA
function resetRace() {
  running = false;
  finished = false;
  raceResults = [];

  resetCars();

  timerDisplay.textContent = "00:00.000";
  lapStatus.textContent = "0 / 3";
  raceStatus.textContent = "EN PARRILLA";
  trackStatus.textContent = "READY";

  message.textContent =
    "Introduce los nombres y pulsa START RACE.";

  startButton.textContent = "START RACE";
  startButton.disabled = false;

  document.getElementById("result1").textContent =
    "Esperando la salida...";

  document.getElementById("result2").textContent =
    "Esperando la salida...";

  // Usar la función actual, no renderRanking()
  loadRanking();
}

// CONTROLES
startButton.addEventListener("click", startRace);
resetButton.addEventListener("click", resetRace);

window.addEventListener("keydown", event => {
  if ([
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight"
  ].includes(event.key)) {
    event.preventDefault();
  }

  keys[event.key.toLowerCase()] = true;
  keys[event.key] = true;
});

window.addEventListener("keyup", event => {
  keys[event.key.toLowerCase()] = false;
  keys[event.key] = false;
});

window.addEventListener("blur", () => {
  for (const key in keys) {
    keys[key] = false;
  }
});

// BUCLE PRINCIPAL DEL JUEGO
function gameLoop(now) {
  const delta = Math.min(
    (now - (lastFrame || now)) / 16.67,
    2
  );

  lastFrame = now;

  if (running) {
    cars.forEach(car => {
      if (car.finishTime === null) {
        updateCar(car, delta);
      }
    });

    updateUI();

    // La carrera termina cuando ambos pilotos completan las vueltas.
    if (cars.every(car => car.finishTime !== null)) {
      finishRace();
    }
  }

  draw();
  requestAnimationFrame(gameLoop);
}

// INICIALIZAR JUEGO
resetCars();
loadRanking();
draw();
requestAnimationFrame(gameLoop);
