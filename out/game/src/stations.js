// stations.js — the three work stations plus the plate: chopping board (timed chop),
// stove pots (cook, then burn if left too long) and the plating counter where a dish
// is assembled. One press starts a job; the job runs itself while the chef moves on.
import { CHOP_SECONDS, COOK_SECONDS, BURN_SECONDS, chopResult, cookResult } from './config.js';

export function createStations() {
  return {
    board: { item: null, progress: 0, chopping: false },
    pots: [
      { item: null, progress: 0, state: 'idle' },
      { item: null, progress: 0, state: 'idle' },
    ],
    plate: { items: [] },
  };
}

/** Advance chop and cook timers. `onEvent` hears 'done' (pot ready) and 'burnt'. */
export function updateStations(st, dt, onEvent) {
  const board = st.board;
  if (board.chopping && board.item) {
    board.progress += dt / CHOP_SECONDS;
    if (board.progress >= 1) {
      board.item = chopResult(board.item);
      board.progress = 0;
      board.chopping = false;
    }
  }
  for (const pot of st.pots) {
    if (pot.state === 'cooking' && pot.item) {
      pot.progress += dt / COOK_SECONDS;
      if (pot.progress >= 1) {
        pot.state = 'done';
        pot.item = cookResult(pot.item);
        if (onEvent) onEvent('done');
      }
    } else if (pot.state === 'done' && pot.item) {
      // The overcook clock keeps running past done: leave it and it burns.
      pot.progress += dt / COOK_SECONDS;
      if (pot.progress >= BURN_SECONDS / COOK_SECONDS) {
        pot.state = 'burnt';
        pot.item = 'beef_burnt';
        if (onEvent) onEvent('burnt');
      }
    }
  }
}
