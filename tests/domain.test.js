import test from 'node:test';
import assert from 'node:assert/strict';
import { applyMealConsumption, assessInventoryServingFeasibility, buildShoppingList, daysUntil, expiryTone, isIngredientCompatibleWithProfile, sortInventoryByExpiry, validateRecipe } from '../src/services/domain.js';
import { getIngredientGuidance, ingredientIcon } from '../src/data/ingredientKnowledge.js';
import { DEMO_INVENTORY, DEMO_PROFILE } from '../src/data/demo.js';
import { recipeSelectableInventory } from '../src/services/recipePolicy.js';
import { isPlanReviewDue, nextPlanForReview, snoozePlanReview } from '../src/services/planning.js';
import { retrieveRecipeContext } from '../server/rag/recipeKnowledge.js';
import { normalizeVisionCandidates } from '../src/services/visionCandidates.js';

const inventory = [
  { id: 'a', name: '鸡蛋', canonicalName: 'egg', managementMode: 'tracked_quantity', quantity: 2, unit: '个' },
  { id: 'b', name: '牛奶', canonicalName: 'milk', managementMode: 'freshness_only', quantity: null, unit: '盒' },
  { id: 'c', name: '酱油', canonicalName: 'soy sauce', managementMode: 'approximate_stock', stockPercentage: 10, unit: '毫升' }
];

test('precise ingredient icons beat broad rice, vegetable and fallback matches', () => {
  assert.equal(ingredientIcon('干辣椒'), '🌶️');
  assert.equal(ingredientIcon('小米辣'), '🌶️');
  assert.equal(ingredientIcon('米粉'), '🍜');
  assert.equal(ingredientIcon('鸡翅'), '🍗');
});

test('shopping list flags missing and unreliable inventory', () => {
  const list = buildShoppingList({ ingredients: [
    { canonicalName: 'egg', name: '鸡蛋', requiredAmount: 3, unit: '个' },
    { canonicalName: 'milk', name: '牛奶', requiredAmount: 1, unit: '盒' },
    { canonicalName: 'soy sauce', name: '酱油', requiredAmount: 10, unit: '毫升' },
    { canonicalName: 'tomato', name: '番茄', requiredAmount: 1, unit: '个' }
  ] }, inventory);
  assert.equal(list.length, 4);
  assert.equal(list[0].status, 'to_buy');
  assert.equal(list[1].status, 'need_confirm');
  assert.equal(list[2].status, 'need_confirm');
  assert.equal(list[3].status, 'to_buy');
});

test('validator reports tracked quantity shortage and hard constraint', () => {
  const errors = validateRecipe({ ingredients: [
    { canonicalName: 'egg', name: '鸡蛋', requiredAmount: 3 },
    { canonicalName: 'peanut', name: '花生', requiredAmount: 1 }
  ] }, inventory, { allergies: ['花生'] });
  assert.equal(errors.length, 2);
  assert.match(errors.join(' '), /鸡蛋库存不足/);
  assert.match(errors.join(' '), /过敏硬约束/);
});

test('allergy matching accepts explicitly allergen-free alternatives', () => {
  const safe = validateRecipe({ ingredients: [{ canonicalName: 'peanut-free satay seasoning', name: 'Peanut-free satay seasoning', requiredAmount: 1 }] }, [], { allergies: ['peanut'] });
  const unsafe = validateRecipe({ ingredients: [{ canonicalName: 'satay sauce with peanut', name: 'Satay sauce with peanut', requiredAmount: 1 }] }, [], { allergies: ['peanut'] });
  assert.equal(safe.length, 0);
  assert.match(unsafe.join(' '), /过敏硬约束/);
});

test('expiry tiers and sorting follow the recorded expiry date', () => {
  const now = new Date('2026-08-31T08:00:00');
  const items = [
    { name: 'later', expiryDate: '2026-09-10' },
    { name: 'soon', expiryDate: '2026-09-02' },
    { name: 'middle', expiryDate: '2026-09-05' }
  ];
  assert.equal(daysUntil(items[1].expiryDate, now), 2);
  assert.equal(expiryTone(items[1], now), 'pink');
  assert.equal(expiryTone(items[2], now), 'blue');
  assert.equal(expiryTone(items[0], now), 'green');
  assert.deepEqual(sortInventoryByExpiry(items, now).map((item) => item.name), ['soon', 'middle', 'later']);
});

test('validator rejects explicitly disliked ingredients', () => {
  const errors = validateRecipe({ ingredients: [{ canonicalName: 'cilantro', name: '香菜', requiredAmount: 1 }] }, inventory, { allergies: [], dislikes: ['香菜'] });
  assert.match(errors.join(' '), /明确不喜欢/);
});

test('validator enforces vegetarian and vegan dietary hard constraints', () => {
  assert.match(validateRecipe({ ingredients: [{ canonicalName: 'chicken breast', name: 'Chicken breast' }] }, [], { dietaryConstraints: ['vegetarian'] }).join(' '), /饮食硬约束/);
  assert.equal(validateRecipe({ ingredients: [{ canonicalName: 'tofu', name: 'Tofu' }] }, [], { dietaryConstraints: ['vegetarian'] }).length, 0);
  assert.match(validateRecipe({ ingredients: [{ canonicalName: 'egg', name: 'Egg' }] }, [], { dietaryConstraints: ['vegan'] }).join(' '), /饮食硬约束/);
});

test('profile compatibility filters named restrictions before planning', () => {
  assert.equal(isIngredientCompatibleWithProfile({ canonicalName: 'beef', name: 'Beef' }, { dislikes: ['beef'] }), false);
  assert.equal(isIngredientCompatibleWithProfile({ canonicalName: 'beef', name: 'Beef' }, { dietaryConstraints: ['does not eat beef'] }), false);
  assert.equal(isIngredientCompatibleWithProfile({ canonicalName: 'chicken breast', name: 'Chicken' }, { dietaryConstraints: ['does not eat beef'] }), true);
});

test('validator includes frozen-state and total-time checks for short plans', () => {
  const quickInventory = [{ canonicalName: 'beef', name: '牛肉', uiCategory: 'protein', storageLocation: '冷冻', managementMode: 'tracked_quantity', quantity: 250, unit: '克' }];
  const errors = validateRecipe({ estimatedPrepMinutes: 20, ingredients: [{ canonicalName: 'beef', name: 'Beef', requiredAmount: 100, unit: '克' }] }, quickInventory, {}, { maxPrepMinutes: 10 });
  assert.match(errors.join(' '), /未解冻|超过/);
});

test('inventory serving feasibility exposes protein and staple capacity limits', () => {
  const result = assessInventoryServingFeasibility([
    { id: 'chicken', canonicalName: 'chicken breast', name: '鸡胸肉', uiCategory: 'protein', managementMode: 'tracked_quantity', quantity: 200, unit: '克' },
    { id: 'rice', canonicalName: 'rice', name: '大米', uiCategory: 'staple', managementMode: 'tracked_quantity', quantity: 180, unit: '克' }
  ], 4, { carbId: 'rice', now: new Date('2026-09-03T12:00:00') });
  assert.equal(result.sufficient, false);
  assert.equal(result.estimatedPantryServings, 2);
  assert.deepEqual(result.shortages.map((item) => item.type), ['protein', 'staple']);
});

test('expired food uses the purple tier', () => {
  assert.equal(expiryTone({ expiryDate: '2026-08-30' }, new Date('2026-09-01T08:00:00')), 'purple');
});

test('manual retrieval classifies noodles and applies unit rules', () => {
  const noodles = getIngredientGuidance('面条');
  assert.equal(noodles.uiCategory, 'staple');
  assert.equal(noodles.unit, '包');
  assert.equal(noodles.quantity, 1);
  assert.equal(noodles.storage.find((item) => item.location === '冷冻').available, false);
  const spinach = getIngredientGuidance('菠菜');
  assert.equal(spinach.unit, '克');
  assert.equal(spinach.quantity, 200);
});

test('tofu is quantity tracked and supports fractional remaining packs', () => {
  const tofu = getIngredientGuidance('豆腐');
  assert.equal(tofu.mode, 'tracked_quantity');
  assert.equal(tofu.unit, '盒');
  assert.equal(tofu.quantity, 1);
  assert.equal(DEMO_INVENTORY.find((item) => item.canonicalName === 'tofu').managementMode, 'tracked_quantity');
});

test('vision candidates normalize object or JSON-string storage options before review', () => {
  const [candidate] = normalizeVisionCandidates([{
    name: '豆腐',
    normalizedName: 'tofu',
    suggestedManagementMode: 'freshness_only',
    quantity: null,
    unit: '盒',
    storageLocation: '冷藏',
    storageOptions: JSON.stringify({ 冷藏: { days: 3, available: true, note: '冷藏' }, 冷冻: { days: 30, available: true }, 常温: { available: false } })
  }]);
  assert.equal(Array.isArray(candidate.storageOptions), true);
  assert.equal(candidate.storageOptions.length, 3);
  assert.equal(candidate.storageOptions.find((item) => item.location === '冷藏').days, 3);
  assert.equal(candidate.suggestedManagementMode, 'tracked_quantity');
  assert.equal(candidate.quantity, 1);
});

test('storage retrieval distinguishes ground beef from whole beef and avoids generic freezing defaults', () => {
  const ground = getIngredientGuidance('牛肉碎');
  const whole = getIngredientGuidance('牛排');
  assert.equal(ground.canonicalName, 'ground beef');
  assert.equal(ground.storage.find((item) => item.location === '冷冻').days, 30);
  assert.match(ground.storage.find((item) => item.location === '冷冻').sourceRange, /3–4 个月/);
  assert.equal(whole.canonicalName, 'beef');
  assert.equal(whole.storage.find((item) => item.location === '冷冻').days, 45);
  const unknownMeat = getIngredientGuidance('袋鼠肉');
  assert.equal(unknownMeat.storage.find((item) => item.location === '冷冻').available, false);
});

test('opened oyster sauce uses a shorter refrigerated reminder and no room-temperature duplicate', () => {
  const opened = getIngredientGuidance('蚝油', 'opened');
  const sealed = getIngredientGuidance('蚝油', 'sealed');
  assert.equal(opened.canonicalName, 'oyster sauce');
  assert.equal(opened.storage.find((item) => item.location === '冷藏').days, 30);
  assert.equal(opened.storage.find((item) => item.location === '常温').available, false);
  assert.equal(sealed.storage.find((item) => item.location === '冷藏').available, false);
  assert.equal(sealed.storage.find((item) => item.location === '常温').days, 365);
});

test('staples and condiments always carry package-state quality reminders', () => {
  const rice = getIngredientGuidance('大米', 'opened');
  const soy = getIngredientGuidance('酱油', 'opened');
  assert.equal(rice.requiresPackageDate, true);
  assert.equal(rice.storage.find((item) => item.location === '常温').days, 180);
  assert.equal(soy.requiresPackageDate, true);
  assert.equal(soy.storage.find((item) => item.location === '冷藏').days, 90);
  assert.equal(DEMO_INVENTORY.every((item) => Boolean(item.expiryDate)), true);
});

test('recipe picker excludes staples, other foods, condiments, milk and yogurt', () => {
  const names = recipeSelectableInventory(DEMO_INVENTORY).map((item) => item.canonicalName);
  for (const excluded of ['rice', 'granola bar', 'soy sauce', 'cooking oil', 'milk', 'yogurt']) assert.equal(names.includes(excluded), false);
  assert.equal(names.includes('chicken breast'), true);
  assert.equal(names.includes('spinach'), true);
});

test('recipe RAG retrieves spicy and beginner technique evidence from the request', () => {
  const cards = retrieveRecipeContext({ input: { prompt: '想吃真正辣的云南风味菜，新手需要详细步骤' }, inventory: DEMO_INVENTORY, profile: DEMO_PROFILE });
  const text = cards.map((card) => `${card.id} ${card.title} ${card.text}`).join(' ');
  assert.match(text, /辣|辣椒/);
  assert.match(text, /新手|油温|步骤/);
});

test('planned meal becomes due, can be snoozed, and awaiting review remains reviewable', () => {
  const now = new Date('2026-09-01T21:45:00');
  const plan = { id: 'p1', status: 'planned', reviewAt: '2026-09-01T21:30:00' };
  assert.equal(isPlanReviewDue(plan, now), true);
  assert.equal(nextPlanForReview([plan], now).id, 'p1');
  snoozePlanReview(plan, now, 60);
  assert.equal(isPlanReviewDue(plan, now), false);
  plan.status = 'awaiting_review';
  assert.equal(isPlanReviewDue(plan, new Date('2026-09-01T22:46:00')), true);
});

test('inventory changes only when reviewed consumption is explicitly committed', () => {
  const state = { inventory: [{ id: 'a', name: '鸡蛋', canonicalName: 'egg', managementMode: 'tracked_quantity', quantity: 5, unit: '个' }] };
  const recipe = { ingredients: [{ name: '鸡蛋', canonicalName: 'egg', requiredAmount: 2, unit: '个' }] };
  const before = structuredClone(state.inventory);
  assert.deepEqual(state.inventory, before);
  const events = applyMealConsumption(state, recipe, { a: { amount: 1.5 } });
  assert.equal(state.inventory[0].quantity, 3.5);
  assert.equal(events[0].before, 5);
  assert.equal(events[0].remaining, 3.5);
});
