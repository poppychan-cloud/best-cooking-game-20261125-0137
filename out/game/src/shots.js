// shots.js — the screenshot scenes behind ?shot=cover|chop|serve|rush (and start).
// Each scene stages a real game state through the game's own constructors and state
// fields — orders, a mid-chop board, a cooking pot, a half-assembled plate — then the
// renderer draws that live state in one frozen frame. Nothing is composited or faked:
// the frame is what the game itself draws from that state.
import { SCREEN_TITLE, SCREEN_PLAY } from './render.js';
import { createOrder } from './orders.js';
import { resetWorld } from './world.js';

/** Fresh play state at a chosen clock and score, ready to stage on top of. */
function basePlay(world, timeLeft, score) {
  resetWorld(world, world.seed);
  world.state = 'play';
  world.timeLeft = timeLeft;
  world.elapsed = 180 - timeLeft;
  world.score = score;
  return world;
}

/** One ticket with a chosen dish and patience left. */
function ticket(world, recipeId, patience) {
  const order = createOrder(world.rng, world.elapsed, recipeId);
  order.patience = patience;
  return order;
}

export function stageShot(name, world) {
  if (name === 'start') {
    resetWorld(world, world.seed);
    world.state = 'title';
    world.orders.orders.push(ticket(world, 'salad', 50));
    world.orders.orders.push(ticket(world, 'burger', 50));
    return SCREEN_TITLE;
  }

  if (name === 'chop') {
    basePlay(world, 151, 120);
    world.orders.orders.push(ticket(world, 'salad', 40));
    world.orders.orders.push(ticket(world, 'steak', 45));
    world.stations.board.item = 'lettuce';
    world.stations.board.chopping = true;
    world.stations.board.progress = 0.7;
    world.stations.pots[0].item = 'beef_chopped';
    world.stations.pots[0].state = 'cooking';
    world.stations.pots[0].progress = 0.3;
    world.chef.x = 126;
    world.chef.y = 330;
    world.chef.facing = 1;
    return SCREEN_PLAY;
  }

  if (name === 'serve') {
    basePlay(world, 107, 460);
    // The handover instant: the burger ticket already carries its green check, the
    // finished burger is still on the plate at the pass, and the score flash shows
    // the jump — dish, ticket and points in one frame.
    const served = ticket(world, 'burger', 22);
    served.served = true;
    world.orders.orders.push(served);
    world.orders.orders.push(ticket(world, 'salad', 38));
    world.stations.plate.items = ['bread', 'beef_cooked', 'lettuce_chopped'];
    world.flash = '上菜！招牌汉堡 +187';
    world.flashT = 1.6;
    world.chef.x = 1080;
    world.chef.y = 330;
    world.chef.facing = -1;
    return SCREEN_PLAY;
  }

  if (name === 'rush') {
    basePlay(world, 38, 780);
    world.orders.orders.push(ticket(world, 'burger', 6));
    world.orders.orders.push(ticket(world, 'salad', 9));
    world.orders.orders.push(ticket(world, 'steak', 30));
    world.stations.board.item = 'beef';
    world.stations.board.chopping = true;
    world.stations.board.progress = 0.4;
    // One pot already burnt, the other done and one breath from burning: serve the
    // plate first or save the pot first is a real choice in this frame.
    world.stations.pots[0].item = 'beef_burnt';
    world.stations.pots[0].state = 'burnt';
    world.stations.pots[1].item = 'beef_cooked';
    world.stations.pots[1].state = 'done';
    world.stations.pots[1].progress = 1.9;
    world.stations.plate.items = ['tomato_chopped'];
    world.chef.x = 700;
    world.chef.y = 350;
    world.chef.carry = 'beef_cooked';
    world.chef.facing = 1;
    return SCREEN_PLAY;
  }

  // Cover: two tickets only (the third is the rush shot's), the round timer top
  // right, the finished burger on the pass matching the first ticket — the gold
  // "serve now" prompt says which plate can go — and the chef at the pass with
  // the next order's tomato in hand while the pot keeps cooking behind him.
  basePlay(world, 133, 320);
  world.orders.orders.push(ticket(world, 'burger', 18));
  world.orders.orders.push(ticket(world, 'salad', 34));
  world.stations.board.item = 'tomato';
  world.stations.board.chopping = true;
  world.stations.board.progress = 0.55;
  world.stations.pots[0].item = 'beef_chopped';
  world.stations.pots[0].state = 'cooking';
  world.stations.pots[0].progress = 0.6;
  world.stations.plate.items = ['bread', 'beef_cooked', 'lettuce_chopped'];
  world.chef.x = 1060;
  world.chef.y = 340;
  world.chef.carry = 'tomato_chopped';
  world.chef.facing = -1;
  return SCREEN_PLAY;
}
