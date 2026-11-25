// audio.js — every sound is synthesised live with WebAudio oscillators: no audio
// files, no network. The context is created lazily on the first user gesture, so a
// headless screenshot run stays silent and never throws.
let ctx = null;

function ac() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  } catch {
    return null;
  }
  return ctx;
}

/** One short blip: frequency, seconds, wave shape, volume. */
function blip(freq, seconds, type, volume) {
  const c = ac();
  if (!c) return;
  try {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume || 0.12, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + seconds);
    osc.connect(gain).connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + seconds);
  } catch {
    // Sound is garnish: never let it break the game.
  }
}

/** Unlock audio from a user gesture (called on first key / pointer input). */
export function unlockAudio() { ac(); }
/** Knife hit while chopping. */
export function playChop() { blip(220, 0.07, 'square', 0.08); }
/** Pot finished cooking. */
export function playDing() { blip(880, 0.18, 'sine', 0.14); blip(1320, 0.22, 'sine', 0.08); }
/** Dish served. */
export function playServe() { blip(523, 0.12, 'triangle', 0.14); blip(784, 0.2, 'triangle', 0.14); }
/** Wrong move / burnt food. */
export function playError() { blip(140, 0.2, 'sawtooth', 0.1); }
/** Last-30-seconds heartbeat tick. */
export function playTick() { blip(1000, 0.05, 'sine', 0.06); }
