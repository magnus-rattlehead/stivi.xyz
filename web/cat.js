// ── Config ────────────────────────────────────────────────────────────────────

const WANDER_SPEED = 72;       // px/s
const FLEE_SPEED   = 270;      // px/s
const WANDER_TURN_RATE = 1.8;  // rad/s blended toward cursor
const FLEE_TURN_RATE   = 7.2;  // rad/s
const WANDER_NOISE     = 2.4;  // rad/s random jitter
const FLEE_VELOCITY_THRESH  = 800;   // px/s
const FLEE_DURATION_MS      = 2000;
const EDGE_MARGIN           = 80;
const EDGE_FORCE            = 3.0;
const SCALE                 = 3;
const SPRITE_W              = 32 * SCALE;
const SPRITE_H              = 32 * SCALE;
const DIR_HYSTERESIS_FRAMES = 3;

const DIRS = ['east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast'];

function angleToDir(angle) {
  const deg = ((angle * 180 / Math.PI) % 360 + 360) % 360;
  return DIRS[Math.round(deg / 45) % 8];
}

function normalizeAngle(a) {
  return a - 2 * Math.PI * Math.round(a / (2 * Math.PI));
}

// ── Create sprite elements ────────────────────────────────────────────────────

const sprites = {};
DIRS.forEach(dir => {
  const img = document.createElement('img');
  img.src = `/web/assets/cat/cat_walk_${dir}.gif`;
  img.style.cssText = [
    'position:fixed',
    'pointer-events:none',
    'image-rendering:pixelated',
    `width:${SPRITE_W}px`,
    `height:${SPRITE_H}px`,
    'display:none',
    'top:0',
    'left:0',
    'z-index:50',
  ].join(';');
  document.body.appendChild(img);
  sprites[dir] = img;
});

// ── Cursor tracking ───────────────────────────────────────────────────────────

const cursor = {
  x: window.innerWidth / 2,
  y: window.innerHeight / 2,
  speed: 0,
  lastTime: performance.now(),
};

window.addEventListener('mousemove', e => {
  const now = performance.now();
  const elapsed = Math.max((now - cursor.lastTime) / 1000, 0.001);
  const rawSpeed = Math.hypot(e.clientX - cursor.x, e.clientY - cursor.y) / elapsed;
  cursor.speed = 0.2 * rawSpeed + 0.8 * cursor.speed;
  cursor.x = e.clientX;
  cursor.y = e.clientY;
  cursor.lastTime = now;
});

// ── Cat ───────────────────────────────────────────────────────────────────────

const cat = {
  x: window.innerWidth  * (0.2 + Math.random() * 0.6),
  y: window.innerHeight * (0.2 + Math.random() * 0.6),
  angle: Math.random() * Math.PI * 2,
  state: 'WANDER',
  currentDir: null,
  pendingDir: null,
  pendingDirCount: 0,
  fleeStartTime: 0,
};

function setDir(dir) {
  if (dir === cat.currentDir) return;
  if (cat.currentDir) sprites[cat.currentDir].style.display = 'none';
  sprites[dir].style.display = 'block';
  cat.currentDir = dir;
}

function placeSprite() {
  // position so feet land at (cat.x, cat.y)
  sprites[cat.currentDir].style.transform =
    `translate(${cat.x - SPRITE_W / 2}px, ${cat.y - SPRITE_H}px)`;
}

function updateDir() {
  const candidate = angleToDir(cat.angle);
  if (candidate === cat.currentDir) {
    cat.pendingDir = null;
    cat.pendingDirCount = 0;
    return;
  }
  if (candidate === cat.pendingDir) {
    if (++cat.pendingDirCount >= DIR_HYSTERESIS_FRAMES) {
      cat.pendingDir = null;
      cat.pendingDirCount = 0;
      setDir(candidate);
    }
  } else {
    cat.pendingDir = candidate;
    cat.pendingDirCount = 1;
  }
}

function applyEdgeRepulsion(dt) {
  const W = window.innerWidth, H = window.innerHeight;
  let fx = 0, fy = 0;
  if (cat.x < EDGE_MARGIN)      fx += (EDGE_MARGIN - cat.x)       * EDGE_FORCE;
  if (cat.x > W - EDGE_MARGIN)  fx -= (cat.x - (W - EDGE_MARGIN)) * EDGE_FORCE;
  if (cat.y < EDGE_MARGIN)      fy += (EDGE_MARGIN - cat.y)       * EDGE_FORCE;
  if (cat.y > H - EDGE_MARGIN)  fy -= (cat.y - (H - EDGE_MARGIN)) * EDGE_FORCE;
  if (fx || fy) {
    const spd = cat.state === 'FLEE' ? FLEE_SPEED : WANDER_SPEED;
    cat.angle = Math.atan2(Math.sin(cat.angle) * spd + fy * dt,
                           Math.cos(cat.angle) * spd + fx * dt);
  }
}

// ── Tick ──────────────────────────────────────────────────────────────────────

let lastTime = performance.now();

function tick(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  try {
    if (cat.state === 'WANDER') {
      const target = Math.atan2(cursor.y - cat.y, cursor.x - cat.x);
      cat.angle += normalizeAngle(target - cat.angle) * WANDER_TURN_RATE * dt;
      cat.angle += (Math.random() - 0.5) * WANDER_NOISE * dt;
      cat.x += Math.cos(cat.angle) * WANDER_SPEED * dt;
      cat.y += Math.sin(cat.angle) * WANDER_SPEED * dt;
      updateDir();
      if (cursor.speed > FLEE_VELOCITY_THRESH) {
        cat.state = 'FLEE';
        cat.fleeStartTime = now;
        cat.angle = Math.atan2(cat.y - cursor.y, cat.x - cursor.x);
      }
    } else {
      const away = Math.atan2(cat.y - cursor.y, cat.x - cursor.x);
      cat.angle += normalizeAngle(away - cat.angle) * FLEE_TURN_RATE * dt;
      cat.x += Math.cos(cat.angle) * FLEE_SPEED * dt;
      cat.y += Math.sin(cat.angle) * FLEE_SPEED * dt;
      updateDir();
      if (now - cat.fleeStartTime > FLEE_DURATION_MS) cat.state = 'WANDER';
    }

    applyEdgeRepulsion(dt);
    cat.x = Math.max(0, Math.min(window.innerWidth,  cat.x));
    cat.y = Math.max(0, Math.min(window.innerHeight, cat.y));
    placeSprite();
  } catch (e) {
    console.error('cat tick error:', e);
  }

  requestAnimationFrame(tick);
}

// ── Boot ──────────────────────────────────────────────────────────────────────

setDir('east');
placeSprite();
requestAnimationFrame(tick);
