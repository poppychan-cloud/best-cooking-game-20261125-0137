// 深夜食堂·出餐口 — every tuning number, colour, recipe and floor-plan rect in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the window,
// so no rule below depends on the screen size.
export const FIELD = { width: 1280, height: 720 };
export const STEP = 1 / 60;
export const GAME_SECONDS = 180;
export const FONT = 'system-ui, "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif';

/** Warm late-night diner palette: dark wood, cream counters, hot reds and golds. */
export const PALETTE = {
  floor: '#3b2a1c', floorLine: '#2e2015', wall: '#241608',
  counterTop: '#ecd9a8', counterFront: '#7a4a26', counterEdge: '#5d3418',
  board: '#b98a4e', stove: '#3d3d46', pot: '#c8ccd4',
  text: '#fff8ea', muted: '#cbb98f', dark: '#241608',
  ticket: '#fff3d6', ticketEdge: '#d9b96a',
  green: '#58b368', red: '#e74c3c', gold: '#f2c94c', blue: '#4fc3f7',
};

/** Every item the kitchen knows. chop/cook say what a station can do to it. */
export const ITEMS = {
  tomato: { name: '番茄', color: '#e74c3c', chop: true },
  lettuce: { name: '生菜', color: '#58b368', chop: true },
  beef: { name: '牛肉', color: '#c96f5a', chop: true, cook: true },
  bread: { name: '面包', color: '#e0a458', chop: false },
  tomato_chopped: { name: '番茄丁', color: '#ef6b52', chopped: true },
  lettuce_chopped: { name: '生菜丝', color: '#7ed491', chopped: true },
  beef_chopped: { name: '牛肉片', color: '#d98a76', chopped: true, cook: true },
  beef_cooked: { name: '煎牛肉', color: '#8a4b2d', cooked: true },
  beef_burnt: { name: '糊牛肉', color: '#2b2b2b', burnt: true },
};

export function itemName(id) { return ITEMS[id] ? ITEMS[id].name : id; }
export function itemColor(id) { return ITEMS[id] ? ITEMS[id].color : '#888888'; }
/** What chopping a raw item gives, or null when it cannot be chopped. */
export function chopResult(id) {
  if (id === 'tomato') return 'tomato_chopped';
  if (id === 'lettuce') return 'lettuce_chopped';
  if (id === 'beef') return 'beef_chopped';
  return null;
}
/** What cooking a chopped item gives, or null when it cannot be cooked. */
export function cookResult(id) { return id === 'beef_chopped' ? 'beef_cooked' : null; }

/** Three dishes, each a combination of 2–3 processed ingredients. */
export const RECIPES = [
  { id: 'salad', name: '田园沙拉', needs: ['tomato_chopped', 'lettuce_chopped'], price: 100 },
  { id: 'burger', name: '招牌汉堡', needs: ['bread', 'beef_cooked', 'lettuce_chopped'], price: 140 },
  { id: 'steak', name: '香煎牛排', needs: ['beef_cooked', 'tomato_chopped'], price: 120 },
];
export function recipeById(id) { return RECIPES.find((r) => r.id === id); }

// Floor plan (logical pixels). Every station rect is a solid counter the chef walks around.
export const STATIONS = {
  board: { x: 36, y: 120, w: 180, h: 180, label: '砧板 · 切菜' },
  stove: { x: 480, y: 120, w: 340, h: 160, label: '灶台 · 烹煮' },
  plate: { x: 1000, y: 120, w: 244, h: 180, label: '摆盘 · 上菜' },
  trash: { x: 996, y: 450, w: 248, h: 150, label: '垃圾桶' },
};
/** The two pots on the stove (centres, logical pixels). */
export const POTS = [
  { x: 560, y: 195, r: 44 },
  { x: 730, y: 195, r: 44 },
];
/** The four ingredient bins along the bottom counter. */
export const BINS = [
  { id: 'tomato', x: 36, y: 450, w: 240, h: 150 },
  { id: 'lettuce', x: 276, y: 450, w: 240, h: 150 },
  { id: 'beef', x: 516, y: 450, w: 240, h: 150 },
  { id: 'bread', x: 756, y: 450, w: 240, h: 150 },
];
export const PLATE_POS = { x: 1122, y: 215, r: 52 };
export const BOARD_POS = { x: 126, y: 195, r: 46 };
export const CHEF_START = { x: 640, y: 385 };
export const INTERACT_RANGE = 84;
export const CHOP_SECONDS = 1.2;
export const COOK_SECONDS = 4;
export const BURN_SECONDS = 8;
export const BEST_KEY = 'midnight-diner-pass.best';
