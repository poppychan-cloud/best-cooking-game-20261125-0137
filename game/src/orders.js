// orders.js — the order board: tickets spawn on a quickening clock, each with a
// patience bar that drains; serve the exact recipe before it runs out.
import { RECIPES } from './config.js';

let nextOrderId = 1;

/** Make one ticket. `recipeId` pins the dish (screenshot scenes use it); otherwise random. */
export function createOrder(rng, elapsed, recipeId) {
  const recipe = recipeId
    ? RECIPES.find((r) => r.id === recipeId)
    : RECIPES[Math.floor(rng() * RECIPES.length)];
  const maxPatience = Math.max(32, 50 - elapsed / 20);
  return { id: nextOrderId, recipeId: recipe.id, patience: maxPatience, maxPatience };
}

/** The board above the kitchen: at most 3 tickets at once, pressure grows with time. */
export class OrderBoard {
  constructor(rng) {
    this.rng = rng;
    this.orders = [];
    this.spawnT = 2;
  }

  reset() {
    this.orders = [];
    this.spawnT = 2;
  }

  /** Advance spawns and patience. Returns how many tickets expired this step. */
  update(dt, elapsed) {
    const interval = Math.max(7, 11 - elapsed / 30);
    this.spawnT -= dt;
    if (this.spawnT <= 0 && this.orders.length < 3) {
      this.orders.push(createOrder(this.rng, elapsed));
      this.spawnT = interval;
    }
    let expired = 0;
    for (const order of this.orders) order.patience -= dt;
    this.orders = this.orders.filter((order) => {
      if (order.patience <= 0) { expired += 1; return false; }
      return true;
    });
    return expired;
  }

  /** The open order whose recipe matches the plate exactly, or null. */
  findMatch(plateItems) {
    const key = [...plateItems].sort().join('+');
    for (const order of this.orders) {
      const recipe = RECIPES.find((r) => r.id === order.recipeId);
      if ([...recipe.needs].sort().join('+') === key) return { order, recipe };
    }
    return null;
  }

  serve(order) {
    this.orders = this.orders.filter((o) => o !== order);
  }
}
