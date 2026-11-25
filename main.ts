// Midnight Diner: The Pass — a hand-written Canvas 2D cooking game (Node 22, standard library
// only). The game is this directory's game/ folder: plain static files a desktop browser loads
// offline (game/index.html and its ES modules, no library and no network request), and this
// program hands it in. It copies game/ and screenshots/ from beside this file to /output and
// writes /output/dossier.json, the summary the judge reads, with the vendored make.fun library.
// Play: WASD or arrow keys move the chef, Space interacts, clicking a station walks over and
// interacts. Three stations (chopping board, stove, plating pass), three recipes sharing them,
// a 3-minute round with rising difficulty; the stove keeps cooking while the chef is away and
// can burn. Screenshots (the first by name is the cover): 1-cover shows the six-element cover
// (kitchen, order board, counter ingredients, a dish being assembled, timer, a plate ready to
// serve), 2-chop the knife work, 3-serve the serve moment, 4-rush the timeout/burn tradeoff.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
