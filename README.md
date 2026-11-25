[![make.fun · best-cooking-game-20261125-0137](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/poppychan-cloud/best-cooking-game-20261125-0137/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/poppychan-cloud/best-cooking-game-20261125-0137/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)

# 深夜食堂·出餐口 — Midnight Diner: The Pass

A complete, original, static HTML5 cooking game for make.fun's
`best-cooking-game-20261125-0137` bounty: a top-down late-night diner kitchen, played
with keyboard and mouse in a desktop browser, no network request, no library.

## How to play

You are the lone cook on the night shift. Orders appear on the board above the
kitchen; each ticket lists a dish and a patience bar that drains. Walk the kitchen,
work the three stations and serve before the ticket runs out — 3 minutes a round,
orders come faster and patience gets shorter as the night goes on.

- **WASD / arrow keys** — move the chef; **click** — walk to a spot
- **Space** — interact with whatever is in reach: pick up an ingredient, start
  chopping, take from a pot, add to the plate, serve, or throw away
- **Ingredient counter** (bottom): tomato, lettuce, beef, bread — take one at a time
- **Cutting board** (left): chop tomato / lettuce / beef (1.2 s)
- **Stove** (middle): cook chopped beef (4 s); leave it and it burns — trash it
- **Plating counter** (right): assemble the dish on the plate; when it matches an
  open ticket, press Space there to serve

## Recipes

- **田园沙拉** — chopped tomato + chopped lettuce (100)
- **招牌汉堡** — bread + cooked beef + chopped lettuce (140)
- **香煎牛排** — cooked beef + chopped tomato (120)

Serving pays the dish price plus a patience bonus (up to +50); an expired ticket
costs 20. Best score is kept in the browser.

## Screenshots

`shots.json` lists the four deterministic scenes (`?shot=` + `seed=1`): the cover
frame holds the whole game at once — kitchen, order board, counter ingredients,
a dish mid-assembly, the round timer and a plate ready to serve.

## Structure (one job per file)

- `game/src/config.js` — tuning numbers, palette, recipes, floor plan
- `game/src/orders.js` — order board: spawn clock, patience, recipe matching
- `game/src/stations.js` — chopping board, stove pots, plating counter
- `game/src/chef.js` — movement, collision, carrying
- `game/src/world.js` — game state, the one `interact` verb, timer and score
- `game/src/render.js` — hand-drawn canvas art: kitchen, chef, tickets, HUD
- `game/src/input.js` — keyboard + mouse
- `game/src/audio.js` — WebAudio-synthesised sounds, no audio files
- `game/src/shots.js` — deterministic screenshot scenes staged through game state
- `game/src/main.js` — boot, fixed-step loop, screenshot mode

## Run it

```sh
node serve.ts   # then open http://localhost:8080
```

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/` to
`/output` and writes `dossier.json` with the vendored `vendor/makefun-game.ts`.
