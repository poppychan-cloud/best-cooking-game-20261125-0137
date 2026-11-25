// chef.js — the cook: WASD / arrow-key movement plus click-to-walk, one carried item,
// axis-separated sliding past the solid counters so the kitchen never traps you.
import { FIELD, STATIONS, BINS, CHEF_START } from './config.js';

export function createChef() {
  return {
    x: CHEF_START.x, y: CHEF_START.y, r: 18,
    carry: null, speed: 300, target: null, facing: 1, walking: false,
  };
}

/** Every solid counter rect the chef must walk around. */
function solidRects() {
  const rects = [STATIONS.board, STATIONS.stove, STATIONS.plate, STATIONS.trash];
  for (const bin of BINS) rects.push(bin);
  return rects;
}

function moveAxis(chef, mx, my) {
  const nx = chef.x + mx;
  const ny = chef.y + my;
  if (nx - chef.r < 8 || nx + chef.r > FIELD.width - 8) return;
  if (ny - chef.r < 100 || ny + chef.r > FIELD.height - 8) return;
  for (const rect of solidRects()) {
    if (nx + chef.r > rect.x && nx - chef.r < rect.x + rect.w &&
        ny + chef.r > rect.y && ny - chef.r < rect.y + rect.h) return;
  }
  chef.x = nx;
  chef.y = ny;
}

export function updateChef(chef, dt, input) {
  let dx = 0;
  let dy = 0;
  if (input.left) dx -= 1;
  if (input.right) dx += 1;
  if (input.up) dy -= 1;
  if (input.down) dy += 1;
  // Steering by hand cancels a click-to-walk target.
  if (dx !== 0 || dy !== 0) chef.target = null;
  if (chef.target) {
    // Stuck against a counter while chasing an unreachable point (a click inside
    // a solid counter): give up instead of pushing at the wall forever.
    const moved = Math.hypot(chef.x - (chef.px ?? chef.x), chef.y - (chef.py ?? chef.y));
    chef.stuckT = moved < 0.5 ? (chef.stuckT || 0) + dt : 0;
    chef.px = chef.x;
    chef.py = chef.y;
    if (chef.stuckT > 0.5) { chef.target = null; chef.stuckT = 0; }
  }
  if (dx === 0 && dy === 0 && chef.target) {
    const tx = chef.target.x - chef.x;
    const ty = chef.target.y - chef.y;
    const d = Math.hypot(tx, ty);
    if (d < 8) {
      chef.target = null;
    } else {
      dx = tx / d;
      dy = ty / d;
    }
  }
  chef.walking = dx !== 0 || dy !== 0;
  if (!chef.walking) return;
  const len = Math.hypot(dx, dy);
  dx /= len;
  dy /= len;
  if (dx !== 0) chef.facing = Math.sign(dx);
  moveAxis(chef, dx * chef.speed * dt, 0);
  moveAxis(chef, 0, dy * chef.speed * dt);
}
