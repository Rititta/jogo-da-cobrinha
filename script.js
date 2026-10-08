// ==========================================
// CONFIGURAÇÕES E ESTADO DO JOGO
// ==========================================
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const currentScoreEl = document.getElementById('current-score');
const highScoreEl = document.getElementById('high-score');
const overlay = document.getElementById('game-overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayMsg = document.getElementById('overlay-msg');
const btnStart = document.getElementById('btn-start');
const btnPause = document.getElementById('btn-pause');
const btnRestart = document.getElementById('btn-restart');
const btnSound = document.getElementById('btn-sound');
const dPadButtons = document.querySelectorAll('.d-btn');

// Tamanho da grade (Grid)
const GRID_SIZE = 20; // 20x20 células
const TILE_COUNT = canvas.width / GRID_SIZE; // 400 / 20 = 20

// Variáveis de estado
let snake = [];
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let food = { x: 15, y: 10 };
let score = 0;
let highScore = parseInt(localStorage.getItem('snake_high_score') || '0', 10);
let isGameOver = false;
let isPaused = false;
let gameInterval = null;
let soundEnabled = true;
let gameSpeed = 120; // Milissegundos por quadro (menor = mais rápido)

// Placar inicial
highScoreEl.textContent = highScore;

// ==========================================
// EFEITOS SONOROS (WEB AUDIO API NATIVA)
// ==========================================
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playSound(type) {
  if (!soundEnabled) return;
  initAudio();
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  const now = audioCtx.currentTime;

  if (type === 'eat') {
    // Som agradável de moeda / comida
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(700, now + 0.1);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    osc.start(now);
    osc.stop(now + 0.12);
  } else if (type === 'over') {
    // Som de colisão / derrota
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.3);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    osc.start(now);
    osc.stop(now + 0.35);
  }
}

// ==========================================
// LÓGICA DO JOGO
// ==========================================

function initGame() {
  snake = [
    { x: 8, y: 10 },
    { x: 7, y: 10 },
    { x: 6, y: 10 }
  ];
  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };
  score = 0;
  gameSpeed = 120;
  isGameOver = false;
  isPaused = false;
  
  currentScoreEl.textContent = score;
  spawnFood();
  
  overlay.classList.add('hidden');
  overlay.classList.remove('game-over');
  btnPause.textContent = '⏸ Pausar';

  if (gameInterval) clearInterval(gameInterval);
  gameInterval = setInterval(gameLoop, gameSpeed);
}

function spawnFood() {
  let valid = false;
  while (!valid) {
    const rx = Math.floor(Math.random() * TILE_COUNT);
    const ry = Math.floor(Math.random() * TILE_COUNT);
    // Não spawnar em cima da cobrinha
    const collision = snake.some(segment => segment.x === rx && segment.y === ry);
    if (!collision) {
      food = { x: rx, y: ry };
      valid = true;
    }
  }
}

function gameLoop() {
  if (isPaused || isGameOver) return;

  // Atualiza direção
  direction = { ...nextDirection };

  // Calcula nova posição da cabeça
  const head = {
    x: snake[0].x + direction.x,
    y: snake[0].y + direction.y
  };

  // Colisão com paredes
  if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) {
    gameOver();
    return;
  }

  // Colisão com o próprio corpo
  for (let i = 0; i < snake.length; i++) {
    if (snake[i].x === head.x && snake[i].y === head.y) {
      gameOver();
      return;
    }
  }

  // Avança a cobra
  snake.unshift(head);

  // Comeu a comida?
  if (head.x === food.x && head.y === food.y) {
    score += 10;
    currentScoreEl.textContent = score;
    playSound('eat');

    if (score > highScore) {
      highScore = score;
      highScoreEl.textContent = highScore;
      localStorage.setItem('snake_high_score', highScore);
    }

    // Aumenta levemente a velocidade a cada 40 pontos
    if (score % 40 === 0 && gameSpeed > 60) {
      gameSpeed -= 8;
      clearInterval(gameInterval);
      gameInterval = setInterval(gameLoop, gameSpeed);
    }

    spawnFood();
  } else {
    // Remove a cauda se não comeu comida
    snake.pop();
  }

  draw();
}

function gameOver() {
  isGameOver = true;
  clearInterval(gameInterval);
  playSound('over');

  overlayTitle.textContent = 'FIM DE JOGO!';
  overlayMsg.innerHTML = `Você fez <b>${score}</b> pontos.<br>Tente superar seu recorde!`;
  btnStart.textContent = 'JOGAR NOVAMENTE';
  overlay.classList.add('game-over');
  overlay.classList.remove('hidden');
}

function togglePause() {
  if (isGameOver) return;
  isPaused = !isPaused;
  btnPause.textContent = isPaused ? '▶ Continuar' : '⏸ Pausar';
}

// ==========================================
// RENDERIZAÇÃO GRÁFICA NO CANVAS
// ==========================================

function draw() {
  // Limpar fundo
  ctx.fillStyle = '#070a10';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Grade sutil de fundo
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // Desenhar Comida (Maçã com brilho)
  const fx = food.x * GRID_SIZE + GRID_SIZE / 2;
  const fy = food.y * GRID_SIZE + GRID_SIZE / 2;
  const radius = (GRID_SIZE / 2) - 2;

  ctx.shadowColor = '#ff3366';
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#ff3366';
  ctx.beginPath();
  ctx.arc(fx, fy, radius, 0, Math.PI * 2);
  ctx.fill();

  // Brilho interior da comida
  ctx.fillStyle = '#ff99b3';
  ctx.beginPath();
  ctx.arc(fx - 2, fy - 2, radius * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0; // Resetar sombra

  // Desenhar Cobrinha
  snake.forEach((segment, index) => {
    const isHead = index === 0;
    const px = segment.x * GRID_SIZE;
    const py = segment.y * GRID_SIZE;

    if (isHead) {
      // Cabeça neon
      ctx.shadowColor = '#00ff88';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#00ff88';
      drawRoundedRect(ctx, px + 1, py + 1, GRID_SIZE - 2, GRID_SIZE - 2, 6);
      ctx.shadowBlur = 0;

      // Olhos da cobra
      ctx.fillStyle = '#070a10';
      const eyeSize = 3;
      if (direction.x === 1) { // Olhando pra direita
        ctx.fillRect(px + 13, py + 4, eyeSize, eyeSize);
        ctx.fillRect(px + 13, py + 13, eyeSize, eyeSize);
      } else if (direction.x === -1) { // Esquerda
        ctx.fillRect(px + 4, py + 4, eyeSize, eyeSize);
        ctx.fillRect(px + 4, py + 13, eyeSize, eyeSize);
      } else if (direction.y === 1) { // Baixo
        ctx.fillRect(px + 4, py + 13, eyeSize, eyeSize);
        ctx.fillRect(px + 13, py + 13, eyeSize, eyeSize);
      } else { // Cima
        ctx.fillRect(px + 4, py + 4, eyeSize, eyeSize);
        ctx.fillRect(px + 13, py + 4, eyeSize, eyeSize);
      }
    } else {
      // Corpo com degradê gradual de verde
      const alpha = Math.max(0.4, 1 - index / (snake.length * 1.5));
      ctx.fillStyle = `rgba(0, 255, 136, ${alpha})`;
      drawRoundedRect(ctx, px + 2, py + 2, GRID_SIZE - 4, GRID_SIZE - 4, 4);
    }
  });
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
  ctx.fill();
}

// ==========================================
// CONTROLES E EVENTOS
// ==========================================

function changeDirection(dir) {
  if (isPaused || isGameOver) return;

  switch (dir) {
    case 'UP':
      if (direction.y === 0) nextDirection = { x: 0, y: -1 };
      break;
    case 'DOWN':
      if (direction.y === 0) nextDirection = { x: 0, y: 1 };
      break;
    case 'LEFT':
      if (direction.x === 0) nextDirection = { x: -1, y: 0 };
      break;
    case 'RIGHT':
      if (direction.x === 0) nextDirection = { x: 1, y: 0 };
      break;
  }
}

// Teclado
window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();

  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key)) {
    e.preventDefault(); // Evita rolar a página com as setas ou espaço
  }

  if (key === 'arrowup' || key === 'w') changeDirection('UP');
  else if (key === 'arrowdown' || key === 's') changeDirection('DOWN');
  else if (key === 'arrowleft' || key === 'a') changeDirection('LEFT');
  else if (key === 'arrowright' || key === 'd') changeDirection('RIGHT');
  else if (key === ' ' || key === 'p') togglePause();
});

// Botões na tela (Mobile e Mouse)
dPadButtons.forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const dir = btn.dataset.dir;
    changeDirection(dir);
  });
});

// Botões da interface
btnStart.addEventListener('click', initGame);
btnRestart.addEventListener('click', initGame);
btnPause.addEventListener('click', togglePause);

btnSound.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  btnSound.textContent = soundEnabled ? '🔊 Som: Ligado' : '🔇 Som: Mudo';
});

// Desenha o frame estático antes do jogo começar
draw();
