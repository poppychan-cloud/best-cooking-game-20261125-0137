// world.js — the whole game state in one place: chef, stations, order board, timer
// and score, plus the single verb `interact` (Space): pick up, chop, cook, plate,
// serve or trash, decided by what the chef is carrying and standing next to.
import {
  FIELD, GAME_SECONDS, STATIONS, BINS, POTS, PLATE_POS, BOARD_POS,
  INTERACT_RANGE, PLATE_REACH_BONUS, chopResult, recipeById,
} from './config.js';
import { createRandom } from './random.js';
import { createChef, updateChef } from './chef.js';
import { createStations, updateStations } from './stations.js';
import { OrderBoard, createOrder } from './orders.js';
import { playChop, playDing, playServe, playError, playTick } from './audio.js';

export function createWorld(seed) {
  const rng = createRandom(seed);
  const world = {
    seed, rng,
    chef: createChef(),
    stations: createStations(),
    orders: new OrderBoard(rng),
    score: 0, served: 0, lost: 0,
    elapsed: 0, timeLeft: GAME_SECONDS,
    state: 'title', // title | play | over
    best: 0, flash: null, flashT: 0,
    lastTickSecond: -1,
    pendingInteract: false, // a clicked station: interact once on arrival
  };
  try {
    world.best = Number(localStorage.getItem('midnight-diner-pass.best') || 0) || 0;
  } catch {
    world.best = 0;
  }
  return world;
}

/** Reset a world in place (restart, or a screenshot scene staging on top of it). */
export function resetWorld(world, seed) {
  const fresh = createWorld(seed === undefined ? world.seed : seed);
  fresh.best = world.best;
  Object.assign(world, fresh);
}

/** Distance from a point to a rect (0 when the point is inside it). */
function distToRect(x, y, rect) {
  const cx = Math.max(rect.x, Math.min(x, rect.x + rect.w));
  const cy = Math.max(rect.y, Math.min(y, rect.y + rect.h));
  return Math.hypot(x - cx, y - cy);
}

/** The nearest usable thing within reach: a bin, the board, a pot, the plate or trash. */
export function nearestUsable(world) {
  const { x, y } = world.chef;
  let best = null;
  let bestD = INTERACT_RANGE;
  for (const bin of BINS) {
    const d = distToRect(x, y, bin);
    if (d < bestD) { bestD = d; best = { kind: 'bin', id: bin.id }; }
  }
  const boardD = distToRect(x, y, STATIONS.board);
  if (boardD < bestD) { bestD = boardD; best = { kind: 'board' }; }
  for (let i = 0; i < POTS.length; i += 1) {
    const d = Math.hypot(x - POTS[i].x, y - POTS[i].y) - POTS[i].r;
    if (d < bestD) { bestD = d; best = { kind: 'pot', index: i }; }
  }
  const plateD = Math.hypot(x - PLATE_POS.x, y - PLATE_POS.y) - PLATE_POS.r - PLATE_REACH_BONUS;
  if (plateD < bestD) { bestD = plateD; best = { kind: 'plate' }; }
  const trashD = distToRect(x, y, STATIONS.trash);
  if (trashD < bestD) { bestD = trashD; best = { kind: 'trash' }; }
  return best;
}

function setFlash(world, text) {
  world.flash = text;
  world.flashT = 1.6;
}

/** The station a click at `point` (playfield pixels) means, or null for empty floor. */
export function stationAtPoint(point) {
  const inRect = (rect, pad) =>
    point.x >= rect.x - pad && point.x <= rect.x + rect.w + pad &&
    point.y >= rect.y - pad && point.y <= rect.y + rect.h + pad;
  for (const bin of BINS) if (inRect(bin, 24)) return { kind: 'bin', id: bin.id };
  if (inRect(STATIONS.board, 24)) return { kind: 'board' };
  // The pots sit on the stove, entirely inside its padded rect: they must be
  // checked first, or a click on a pot always resolves to the stove (which has
  // no interaction) and the pot can never be clicked.
  for (let i = 0; i < POTS.length; i += 1) {
    if (Math.hypot(point.x - POTS[i].x, point.y - POTS[i].y) < POTS[i].r + 24) return { kind: 'pot', index: i };
  }
  if (inRect(STATIONS.stove, 24)) return { kind: 'stove' };
  if (Math.hypot(point.x - PLATE_POS.x, point.y - PLATE_POS.y) < PLATE_POS.r + 24) return { kind: 'plate' };
  if (inRect(STATIONS.trash, 24)) return { kind: 'trash' };
  return null;
}

/** Distance from the chef to a clicked station (0 at its edge). */
function stationDistance(world, station) {
  const { x, y } = world.chef;
  if (station.kind === 'bin') {
    const bin = BINS.find((b) => b.id === station.id);
    return distToRect(x, y, bin);
  }
  if (station.kind === 'board') return distToRect(x, y, STATIONS.board);
  if (station.kind === 'stove') return distToRect(x, y, STATIONS.stove);
  if (station.kind === 'pot') {
    const pot = POTS[station.index];
    return Math.hypot(x - pot.x, y - pot.y) - pot.r;
  }
  if (station.kind === 'plate') return Math.hypot(x - PLATE_POS.x, y - PLATE_POS.y) - PLATE_POS.r - PLATE_REACH_BONUS;
  if (station.kind === 'trash') return distToRect(x, y, STATIONS.trash);
  return Infinity;
}

/**
 * The one verb, aimed at the nearest usable thing: pick up, chop, cook, plate,
 * serve or trash, decided by what the chef is carrying and standing next to.
 * Returns what happened ('pickup' | 'chop' | 'take' | 'cook' | 'plate' |
 * 'serve' | 'trash' | 'none') so the caller can play the right sound.
 */
export function interact(world) {
  const target = nearestUsable(world);
  if (!target) return 'none';
  return interactStation(world, target);
}

/** The same verb aimed at one named station (a clicked bin, pot or plate). */
export function interactStation(world, target) {
  const chef = world.chef;
  const st = world.stations;

  if (target.kind === 'bin') {
    if (chef.carry) return 'none';
    chef.carry = target.id;
    return 'pickup';
  }

  if (target.kind === 'board') {
    const board = st.board;
    if (board.item && !chef.carry) {
      chef.carry = board.item;
      board.item = null;
      board.chopping = false;
      board.progress = 0;
      return 'take';
    }
    if (chef.carry && chopResult(chef.carry) && !board.item) {
      board.item = chef.carry;
      board.chopping = true;
      board.progress = 0;
      chef.carry = null;
      return 'chop';
    }
    return 'none';
  }

  if (target.kind === 'pot') {
    const pot = st.pots[target.index];
    if ((pot.state === 'done' || pot.state === 'burnt') && !chef.carry) {
      chef.carry = pot.item;
      pot.item = null;
      pot.state = 'idle';
      pot.progress = 0;
      return 'take';
    }
    if (chef.carry === 'beef_chopped' && pot.state === 'idle') {
      pot.item = 'beef_chopped';
      pot.state = 'cooking';
      pot.progress = 0;
      chef.carry = null;
      return 'cook';
    }
    return 'none';
  }

  if (target.kind === 'plate') {
    const match = world.orders.findMatch(st.plate.items);
    if (match) {
      const bonus = Math.round((match.order.patience / match.order.maxPatience) * 50);
      world.score += match.recipe.price + bonus;
      world.served += 1;
      world.orders.serve(match.order);
      st.plate.items = [];
      setFlash(world, `上菜！${match.recipe.name} +${match.recipe.price + bonus}`);
      return 'serve';
    }
    if (chef.carry && st.plate.items.length < 3) {
      st.plate.items.push(chef.carry);
      chef.carry = null;
      return 'plate';
    }
    return 'none';
  }

  if (target.kind === 'trash') {
    if (!chef.carry) return 'none';
    chef.carry = null;
    return 'trash';
  }
  return 'none';
}

/** One fixed step of the live game. `interactPressed` is the consumed Space edge. */
export function stepWorld(world, dt, input, interactPressed) {
  if (world.state !== 'play') return;
  updateChef(world.chef, dt, input);
  if (interactPressed) {
    const did = interact(world);
    if (did === 'chop') playChop();
    else if (did === 'serve') playServe();
    else if (did === 'none') playError();
  }
  // Clicked a station: one interaction the moment the station is in reach — or
  // never, if the walk there was given up (stuck, steered away): never tap the
  // wrong counter just because the chef stopped somewhere. The tap acts on the
  // station that was clicked, not whichever happens to be nearest.
  if (world.pendingInteract) {
    const station = world.pendingInteract;
    const d = stationDistance(world, station);
    if (d < INTERACT_RANGE) {
      world.pendingInteract = false;
      const did = interactStation(world, station);
      if (did === 'chop') playChop();
      else if (did === 'serve') playServe();
      else if (did === 'none') playError();
    } else if (!world.chef.target) {
      world.pendingInteract = false;
    }
  }
  updateStations(world.stations, dt, (event) => {
    if (event === 'done') playDing();
    if (event === 'burnt') { setFlash(world, '烧糊了！快扔掉'); playError(); }
  });
  const expired = world.orders.update(dt, world.elapsed);
  if (expired > 0) {
    world.score = Math.max(0, world.score - 20 * expired);
    world.lost += expired;
    setFlash(world, `超时 ${expired} 单 -${20 * expired}`);
  }
  world.elapsed += dt;
  world.timeLeft = Math.max(0, GAME_SECONDS - world.elapsed);
  if (world.flashT > 0) world.flashT -= dt;
  const second = Math.ceil(world.timeLeft);
  if (world.timeLeft <= 30 && second !== world.lastTickSecond) {
    world.lastTickSecond = second;
    playTick();
  }
  if (world.timeLeft <= 0) {
    world.state = 'over';
    if (world.score > world.best) {
      world.best = world.score;
      try { localStorage.setItem('midnight-diner-pass.best', String(world.best)); } catch { /* private mode */ }
    }
  }
}

/** Start a fresh 3-minute round from the title screen. */
export function startGame(world) {
  resetWorld(world, world.seed);
  world.state = 'play';
  world.orders.orders.push(createOrder(world.rng, 0, 'salad'));
  world.orders.orders.push(createOrder(world.rng, 0, 'burger'));
}

export { FIELD };
