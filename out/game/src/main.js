// main.js — boot: canvas sizing, input wiring, the fixed-step game loop, and the
// screenshot mode (?shot=cover|chop|serve|rush&seed=N) that stages one frozen frame.
import { FIELD, STEP } from './config.js';
import { createWorld, startGame, stepWorld, stationAtPoint } from './world.js';
import { createInput } from './input.js';
import { drawWorld } from './render.js';
import { stageShot } from './shots.js';
import { unlockAudio } from './audio.js';

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed') || 1) || 1;
const shot = params.get('shot');
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const world = createWorld(seed);
const input = createInput(canvas);

let scale = 1;
let ox = 0;
let oy = 0;
function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(window.innerWidth * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);
  scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
  ox = (canvas.width - FIELD.width * scale) / 2;
  oy = (canvas.height - FIELD.height * scale) / 2;
}
window.addEventListener('resize', resize);
resize();

/** Client pixels (a mouse click) -> playfield pixels. */
function toLogical(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const devX = (clientX - rect.left) * (canvas.width / rect.width);
  const devY = (clientY - rect.top) * (canvas.height / rect.height);
  return { x: (devX - ox) / scale, y: (devY - oy) / scale };
}

if (shot) {
  // Screenshot mode: stage the scene through the game's own state and keep drawing
  // it every frame. A plain one-off draw is not enough: a resize event after load
  // re-sets canvas.width, which clears the canvas, and only a loop redraws it.
  const screen = stageShot(shot, world);
  (function drawShot() {
    drawWorld(ctx, world, screen, { scale, ox, oy });
    requestAnimationFrame(drawShot);
  }());
} else {
  // Live game: fixed 60 Hz simulation steps whatever the display's rate.
  let last = performance.now();
  let acc = 0;
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const click = input.consumeClick();
    if (click) {
      unlockAudio();
      if (world.state === 'play') {
        // Click to walk; clicking a station also queues one interaction on arrival.
        const point = toLogical(click.x, click.y);
        world.chef.target = point;
        world.pendingInteract = stationAtPoint(point);
      } else startGame(world);
    }
    // Steering by hand cancels a queued click interaction.
    if (input.left || input.right || input.up || input.down) world.pendingInteract = false;
    let interactPressed = false;
    if (input.interact) {
      input.interact = false;
      unlockAudio();
      if (world.state === 'title' || world.state === 'over') startGame(world);
      else interactPressed = true;
    }
    acc += dt;
    let first = true;
    while (acc >= STEP) {
      stepWorld(world, STEP, input, first && interactPressed);
      first = false;
      acc -= STEP;
    }
    drawWorld(ctx, world, world.state, { scale, ox, oy });
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
