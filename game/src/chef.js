// chef.js — the cook: WASD / arrow-key movement plus click-to-walk, one carried item,
// axis-separated sliding past the solid counters so the kitchen never traps you.
// Click-to-walk routes on a 20 px grid A* over the walkable floor (counters are
// obstacles): a click behind a wide counter walks around it instead of steering
// straight at it and pushing at the wall until the stuck detector gives up.
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

// --- Grid pathfinding -------------------------------------------------------
// The walkable floor is a 20 px grid; a cell is walkable when the chef's centre
// can stand on it under the same rule moveAxis enforces (walls plus every solid
// counter inflated by the chef's radius).

const CELL = 20;
const COLS = Math.ceil(FIELD.width / CELL);
const ROWS = Math.ceil(FIELD.height / CELL);

function cellCenter(c, r) {
  return { x: c * CELL + CELL / 2, y: r * CELL + CELL / 2 };
}

function cellOf(x, y) {
  return {
    c: Math.max(0, Math.min(COLS - 1, Math.floor(x / CELL))),
    r: Math.max(0, Math.min(ROWS - 1, Math.floor(y / CELL))),
  };
}

/** Is a chef centre walkable here — the same rule moveAxis enforces. */
function walkableAt(x, y, radius) {
  if (x - radius < 8 || x + radius > FIELD.width - 8) return false;
  if (y - radius < 100 || y + radius > FIELD.height - 8) return false;
  for (const rect of solidRects()) {
    if (x + radius > rect.x && x - radius < rect.x + rect.w &&
        y + radius > rect.y && y - radius < rect.y + rect.h) return false;
  }
  return true;
}

/**
 * The walkable cell whose centre is closest to (x, y). A ring-ordered scan would
 * return the leftmost cell at the smallest ring — for a click on the plate that is
 * the counter's bottom-left corner, 100 px from the plate, instead of the cell
 * straight below it — so this scans the whole (tiny) grid and takes the true
 * Euclidean nearest.
 */
function nearestWalkableCell(x, y, radius) {
  let bestCell = null;
  let bestD = Infinity;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = cellCenter(c, r);
      if (!walkableAt(p.x, p.y, radius)) continue;
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bestD) {
        bestD = d;
        bestCell = { c, r };
      }
    }
  }
  return bestCell;
}

/** Is the straight segment from a to b clear of every counter (sampled every 5 px)? */
function segmentWalkable(a, b, radius) {
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  const steps = Math.max(1, Math.ceil(d / 5));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    if (!walkableAt(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, radius)) return false;
  }
  return true;
}

/**
 * Line-of-sight shortcutting: from the anchor, keep the farthest waypoint the
 * straight segment can reach without entering a counter (checked with a 2 px
 * safety margin, so the chef's circle never grazes a corner). The next raw
 * waypoint is always kept — it is one grid step away and reachable by sliding.
 */
function smoothPath(from, points, radius) {
  const out = [];
  let anchor = { x: from.x, y: from.y };
  let i = 0;
  while (i < points.length) {
    let furthest = i;
    for (let j = i + 1; j < points.length; j++) {
      if (segmentWalkable(anchor, points[j], radius + 2)) furthest = j;
      else break;
    }
    out.push(points[furthest]);
    anchor = points[furthest];
    i = furthest + 1;
  }
  return out;
}

/**
 * Grid A* from the chef to the target. 8-directional, no corner cutting (a
 * diagonal step needs both orthogonal neighbours walkable). When the target cell
 * is blocked (a click inside a counter) the goal becomes the nearest walkable
 * cell; when no route exists at all (the chef is cut off behind a counter wall)
 * the path ends at the explored cell closest to the goal — the closest the chef
 * can actually get — instead of pushing at the wall. Returns waypoints ending
 * at the goal point, or null when the floor has no walkable cell at all.
 */
function findPath(chef, target) {
  const radius = chef.r;
  const start = cellOf(chef.x, chef.y);
  const startCell = nearestWalkableCell(chef.x, chef.y, radius) ?? start;
  const goalRaw = cellOf(target.x, target.y);
  const goalCell = nearestWalkableCell(target.x, target.y, radius);
  if (!goalCell) return null;

  const key = (c, r) => r * COLS + c;
  const heuristic = (c, r) => {
    const dc = Math.abs(c - goalCell.c);
    const dr = Math.abs(r - goalCell.r);
    return Math.max(dc, dr) + (Math.SQRT2 - 1) * Math.min(dc, dr);
  };
  // Best-effort fallback: the explored cell closest to the click point itself,
  // not to the adjusted goal cell — when the chef is cut off behind a counter
  // wall, that is the closest it can actually get to where the player clicked.
  const distToTarget = (c, r) => {
    const p = cellCenter(c, r);
    return Math.hypot(p.x - target.x, p.y - target.y);
  };
  const open = [{ c: startCell.c, r: startCell.r, g: 0, f: heuristic(startCell.c, startCell.r) }];
  const came = new Map();
  const gScore = new Map([[key(startCell.c, startCell.r), 0]]);
  const closed = new Set();
  let best = { c: startCell.c, r: startCell.r, d: distToTarget(startCell.c, startCell.r) };
  let found = false;
  while (open.length > 0) {
    // Cheapest f first (linear scan: the grid is 64x36, this stays fast).
    let bi = 0;
    for (let i = 1; i < open.length; i++) {
      if (open[i].f < open[bi].f) bi = i;
    }
    const cur = open.splice(bi, 1)[0];
    const curKey = key(cur.c, cur.r);
    if (closed.has(curKey)) continue;
    closed.add(curKey);
    if (cur.c === goalCell.c && cur.r === goalCell.r) {
      found = true;
      break;
    }
    const d = distToTarget(cur.c, cur.r);
    if (d < best.d) best = { c: cur.c, r: cur.r, d };
    for (let dc = -1; dc <= 1; dc++) {
      for (let dr = -1; dr <= 1; dr++) {
        if (dc === 0 && dr === 0) continue;
        const nc = cur.c + dc;
        const nr = cur.r + dr;
        if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) continue;
        const np = cellCenter(nc, nr);
        if (!walkableAt(np.x, np.y, radius)) continue;
        if (dc !== 0 && dr !== 0) {
          const sideA = cellCenter(cur.c + dc, cur.r);
          const sideB = cellCenter(cur.c, cur.r + dr);
          if (!walkableAt(sideA.x, sideA.y, radius) || !walkableAt(sideB.x, sideB.y, radius)) continue;
        }
        const step = dc !== 0 && dr !== 0 ? Math.SQRT2 : 1;
        const ng = cur.g + step;
        const nk = key(nc, nr);
        if (ng < (gScore.get(nk) ?? Infinity)) {
          gScore.set(nk, ng);
          came.set(nk, curKey);
          open.push({ c: nc, r: nr, g: ng, f: ng + heuristic(nc, nr) });
        }
      }
    }
  }

  const endCell = found ? goalCell : best;
  const chain = [endCell];
  let ck = key(endCell.c, endCell.r);
  while (came.has(ck)) {
    const pk = came.get(ck);
    chain.push({ c: pk % COLS, r: Math.floor(pk / COLS) });
    ck = pk;
  }
  chain.reverse();
  const points = chain.map((cell) => cellCenter(cell.c, cell.r));
  // A click on open floor ends exactly where the player clicked, not at the
  // cell centre — but only when the goal cell is the target's own cell.
  if (found && goalCell.c === goalRaw.c && goalCell.r === goalRaw.r) {
    points[points.length - 1] = { x: target.x, y: target.y };
  }
  return smoothPath({ x: chef.x, y: chef.y }, points, radius);
}

export function updateChef(chef, dt, input) {
  let dx = 0;
  let dy = 0;
  if (input.left) dx -= 1;
  if (input.right) dx += 1;
  if (input.up) dy -= 1;
  if (input.down) dy += 1;
  // Steering by hand cancels a click-to-walk target.
  if (dx !== 0 || dy !== 0) {
    chef.target = null;
    chef.path = null;
  }
  if (chef.target) {
    // Stuck against a counter while chasing an unreachable point (a click inside
    // a solid counter): give up instead of pushing at the wall forever. With the
    // grid route this is only a backstop — a routed walk never pushes at a wall.
    const moved = Math.hypot(chef.x - (chef.px ?? chef.x), chef.y - (chef.py ?? chef.y));
    chef.stuckT = moved < 0.5 ? (chef.stuckT || 0) + dt : 0;
    chef.px = chef.x;
    chef.py = chef.y;
    if (chef.stuckT > 0.5) {
      chef.target = null;
      chef.path = null;
      chef.stuckT = 0;
    }
  }
  if (dx === 0 && dy === 0 && chef.target) {
    // (Re)route when the target is new: A* over the walkable floor, counters as
    // obstacles, so the chef walks around a wide counter instead of pushing at it.
    if (!chef.path || !chef.pathTarget ||
        chef.pathTarget.x !== chef.target.x || chef.pathTarget.y !== chef.target.y) {
      chef.path = findPath(chef, chef.target);
      chef.pathTarget = { x: chef.target.x, y: chef.target.y };
      chef.pathIndex = 0;
    }
    const wp = chef.path && chef.path[chef.pathIndex];
    if (!wp) {
      // No route at all (no walkable cell on the floor): give up, don't stand still.
      chef.target = null;
      chef.path = null;
    } else {
      const tx = wp.x - chef.x;
      const ty = wp.y - chef.y;
      const d = Math.hypot(tx, ty);
      if (d < 10) {
        chef.pathIndex += 1;
        if (chef.pathIndex >= chef.path.length) {
          chef.target = null;
          chef.path = null;
        }
      } else {
        dx = tx / d;
        dy = ty / d;
      }
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
