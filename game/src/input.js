// input.js — keyboard (WASD / arrows + Space) and mouse (click to walk).
// Space is an edge trigger: `interact` is true for exactly one frame after the press,
// and main.js consumes it. Clicks are queued as client pixels; main.js converts them
// to playfield coordinates (the canvas is scaled to the window).
export function createInput(canvas) {
  const input = {
    left: false, right: false, up: false, down: false,
    interact: false, click: null,
  };
  const keys = {};

  function refreshDirections() {
    input.left = Boolean(keys.ArrowLeft || keys.KeyA);
    input.right = Boolean(keys.ArrowRight || keys.KeyD);
    input.up = Boolean(keys.ArrowUp || keys.KeyW);
    input.down = Boolean(keys.ArrowDown || keys.KeyS);
  }

  window.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
      if (!event.repeat) input.interact = true;
      event.preventDefault();
      return;
    }
    keys[event.code] = true;
    refreshDirections();
    if (event.code.startsWith('Arrow')) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    keys[event.code] = false;
    refreshDirections();
  });
  canvas.addEventListener('pointerdown', (event) => {
    input.click = { x: event.clientX, y: event.clientY };
  });

  /** Take the queued click (client pixels) or null when there is none. */
  input.consumeClick = function consumeClick() {
    const click = input.click;
    input.click = null;
    return click;
  };
  return input;
}
