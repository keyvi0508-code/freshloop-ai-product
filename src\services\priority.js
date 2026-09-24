import { daysUntil, sortInventoryByExpiry } from './domain.js';
import { recipeSelectableInventory } from './recipePolicy.js';

export function rankRecipeInventory(inventory = [], now = new Date()) {
  return sortInventoryByExpiry(recipeSelectableInventory(inventory, now), now);
}

export function derivePriorityResults(inventory = [], now = new Date(), limit = 5) {
  return rankRecipeInventory(inventory, now)
    .filter((item) => item.expiryDate && daysUntil(item.expiryDate, now) >= 0)
    .slice(0, limit)
    .map((item, index) => ({
      rank: index + 1,
      itemId: item.id,
      name: item.name,
      canonicalName: item.canonicalName,
      expiryDate: item.expiryDate,
      remainingDays: daysUntil(item.expiryDate, now),
      reason: 'earliest_non_expired_quality_reminder'
    }));
}

export function priorityInventory(inventory = [], now = new Date(), limit = 5) {
  const ids = new Set(derivePriorityResults(inventory, now, limit).map((entry) => entry.itemId));
  return rankRecipeInventory(inventory, now).filter((item) => ids.has(item.id));
}
