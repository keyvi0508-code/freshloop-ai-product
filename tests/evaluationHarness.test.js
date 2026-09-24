import test from 'node:test';
import assert from 'node:assert/strict';
import { seedInventoryFromFixture } from '../src/services/inventoryPipeline.js';
import { derivePriorityResults } from '../src/services/priority.js';
import { runRecipePlanner } from '../server/api/generate-recipe.js';
import { runInventoryIntelligence } from '../server/api/analyze-inventory.js';
import { validateCanonicalFixture } from '../evaluation/adapters/c-adapter.js';

function recipe(id, name, ingredient) {
  return {
    id,
    recipeName: name,
    imageSearchQuery: 'simple home dish',
    emoji: '🍲',
    estimatedPrepMinutes: 20,
    servings: 1,
    reason: 'test output',
    planType: 'pantry',
    planLabel: 'test',
    ragEvidenceIds: [],
    ingredients: [ingredient],
    prep: ['准备食材', '准备锅具'],
    steps: ['预热锅具', '加入食用油', '放入食材', '翻炒至熟', '装盘'],
    tips: []
  };
}

function batch(unsafe = false) {
  const ingredients = [
    unsafe ? { canonicalName: 'peanut', name: '花生', requiredAmount: 10, unit: '克' } : { canonicalName: 'spinach', name: '菠菜', requiredAmount: 100, unit: '克' },
    { canonicalName: 'egg', name: '鸡蛋', requiredAmount: 1, unit: '个' },
    { canonicalName: 'broccoli', name: '西兰花', requiredAmount: 100, unit: '克' },
    { canonicalName: 'tomato', name: '番茄', requiredAmount: 1, unit: '个' }
  ];
  return { recipes: ingredients.map((ingredient, index) => recipe(`r${index + 1}`, `测试菜${index + 1}`, ingredient)) };
}

test('canonical raw inventory is deterministically enriched by production knowledge, freshness and priority', () => {
  const seeded = seedInventoryFromFixture([
    { id: 'spinach', name: '菠菜', quantity: 200, unit: '克', storage_location: 'fridge', purchase_date: '2026-09-01' },
    { id: 'chicken', name: '鸡胸肉', quantity: 300, unit: '克', storage_location: 'freezer', expiry_date: '2026-09-20' }
  ], { currentDate: '2026-09-01' });
  assert.equal(seeded.inventory[0].expiryDate, '2026-09-04');
  assert.equal(seeded.freshnessResults[0].freshnessStatus, 'use_soon');
  assert.equal(seeded.ingredientRetrieval[0].canonicalName, 'spinach');
  assert.equal(derivePriorityResults(seeded.inventory, new Date('2026-09-01T12:00:00'))[0].itemId, 'spinach');
});

test('production recipe pipeline records validator failure and regenerates a safe result', async () => {
  let calls = 0;
  const callModel = async ({ trace }) => {
    calls += 1;
    const output = batch(calls === 1);
    trace.rawResponse = JSON.stringify(output);
    trace.parsedResponse = output;
    return output;
  };
  const planned = await runRecipePlanner({
    input: { prompt: '家常菜', servings: 1, prepTime: 30, selectedIngredientIds: ['spinach'] },
    inventory: [{ id: 'spinach', name: '菠菜', canonicalName: 'spinach', uiCategory: 'produce', managementMode: 'tracked_quantity', quantity: 200, unit: '克', expiryDate: '2026-09-04' }],
    profile: { allergies: ['花生'], dislikes: [], dietaryConstraints: [], interfaceLanguage: 'zh-CN' },
    history: []
  }, { callModel, retrieveWeb: async () => [], maxAttempts: 2, now: new Date('2026-09-01T12:00:00') });
  assert.equal(calls, 2);
  assert.equal(planned.evaluationTrace.regenerationCount, 1);
  assert.equal(planned.evaluationTrace.attempts[0].validatorPass, false);
  assert.match(planned.evaluationTrace.attempts[0].validatorErrors.join(' '), /花生|过敏/);
  assert.equal(planned.evaluationTrace.attempts[1].validatorPass, true);
  assert.equal(planned.recipes.some((item) => item.ingredients.some((ingredient) => ingredient.canonicalName === 'peanut')), false);
});

test('production recipe pipeline regenerates the full set after a vegetarian violation', async () => {
  let calls = 0;
  const callModel = async ({ trace }) => {
    calls += 1;
    const output = batch(false);
    if (calls === 1) output.recipes[0].ingredients = [{ canonicalName: 'chicken breast', name: 'Chicken breast', requiredAmount: 100, unit: '克' }];
    trace.rawResponse = JSON.stringify(output);
    trace.parsedResponse = output;
    return output;
  };
  const planned = await runRecipePlanner({
    input: { prompt: 'High-protein dinner', servings: 1, prepTime: 30, selectedIngredientIds: [] },
    inventory: [{ id: 'tofu', name: 'Tofu', canonicalName: 'tofu', uiCategory: 'protein', managementMode: 'tracked_quantity', quantity: 1, unit: '盒' }],
    profile: { allergies: [], dislikes: [], dietaryConstraints: ['vegetarian'], interfaceLanguage: 'en' },
    history: []
  }, { callModel, retrieveWeb: async () => [], maxAttempts: 2 });
  assert.equal(calls, 2);
  assert.match(planned.evaluationTrace.attempts[0].validatorErrors.join(' '), /饮食硬约束/);
  assert.equal(planned.evaluationTrace.attempts[1].validatorPass, true);
});

test('production planner exposes serving shortages, freshness reasons and expired-item warnings', async () => {
  const output = batch(false);
  const callModel = async ({ trace }) => { trace.rawResponse = JSON.stringify(output); trace.parsedResponse = output; return output; };
  const now = new Date('2026-09-03T12:00:00');
  const planned = await runRecipePlanner({
    input: { prompt: 'Dinner for four', servings: 4, prepTime: 30, carbId: 'rice', selectedIngredientIds: ['spinach'] },
    inventory: [
      { id: 'chicken', name: 'Chicken', canonicalName: 'chicken breast', uiCategory: 'protein', managementMode: 'tracked_quantity', quantity: 200, unit: '克', expiryDate: '2026-09-10', storageLocation: '冷藏' },
      { id: 'rice', name: 'Rice', canonicalName: 'rice', uiCategory: 'staple', managementMode: 'tracked_quantity', quantity: 180, unit: '克', expiryDate: '2027-01-01', storageLocation: '常温' },
      { id: 'spinach', name: 'Spinach', canonicalName: 'spinach', uiCategory: 'produce', managementMode: 'tracked_quantity', quantity: 200, unit: '克', expiryDate: '2026-09-05', storageLocation: '冷藏' },
      { id: 'yogurt', name: 'Yogurt', canonicalName: 'yogurt', uiCategory: 'protein', managementMode: 'freshness_only', quantity: null, unit: '杯', expiryDate: '2026-09-02', storageLocation: '冷藏' }
    ],
    profile: { allergies: [], dislikes: [], dietaryConstraints: [], interfaceLanguage: 'en' },
    history: []
  }, { callModel, retrieveWeb: async () => [], maxAttempts: 1, now });
  assert.equal(planned.recipes.every((item) => item.inventoryWarnings.length >= 1), true);
  assert.equal(planned.recipes.every((item) => item.safetyAlerts.some((message) => /Yogurt/.test(message))), true);
  assert.equal(planned.recipes.some((item) => item.freshnessNotes.some((message) => /Spinach|菠菜/.test(message))), true);
});

test('ten-minute planner rejects frozen protein and regenerates with a feasible ingredient', async () => {
  let calls = 0;
  const callModel = async ({ trace }) => {
    calls += 1;
    const output = batch(false);
    output.recipes.forEach((item) => { item.estimatedPrepMinutes = 10; item.servings = 1; });
    output.recipes[0].ingredients = calls === 1
      ? [{ canonicalName: 'beef', name: 'Beef', requiredAmount: 100, unit: '克' }]
      : [{ canonicalName: 'egg', name: 'Egg', requiredAmount: 1, unit: '个' }];
    trace.rawResponse = JSON.stringify(output);
    trace.parsedResponse = output;
    return output;
  };
  const planned = await runRecipePlanner({
    input: { prompt: 'I only have ten minutes', servings: 1, prepTime: 10, selectedIngredientIds: [] },
    inventory: [
      { id: 'beef', name: 'Beef', canonicalName: 'beef', uiCategory: 'protein', managementMode: 'tracked_quantity', quantity: 250, unit: '克', storageLocation: '冷冻' },
      { id: 'egg', name: 'Egg', canonicalName: 'egg', uiCategory: 'protein', managementMode: 'tracked_quantity', quantity: 6, unit: '个', storageLocation: '冷藏' }
    ],
    profile: { allergies: [], dislikes: [], dietaryConstraints: [], interfaceLanguage: 'en' },
    history: []
  }, { callModel, retrieveWeb: async () => [], maxAttempts: 2 });
  assert.equal(calls, 2);
  assert.match(planned.evaluationTrace.attempts[0].validatorErrors.join(' '), /未解冻/);
  assert.equal(planned.evaluationTrace.attempts[1].validatorPass, true);
});

test('production ingredient intelligence exposes the pre-human-review draft trace', async () => {
  const raw = { candidates: [{
    name: 'tofu', normalizedName: 'tofu', category: 'protein', uiCategory: 'protein', suggestedManagementMode: 'tracked_quantity',
    quantity: 1, unit: 'box', packageState: 'unknown', storageLocation: '冷藏', confidence: 0.91, needsUserReview: true,
    visualEvidence: 'visible tofu pieces', storageOptions: [{ location: '冷藏', days: 3, available: true }, { location: '冷冻', days: 30, available: true }, { location: '常温', days: null, available: false }]
  }] };
  const callModel = async ({ trace }) => { trace.rawResponse = JSON.stringify(raw); trace.parsedResponse = raw; return raw; };
  const output = await runInventoryIntelligence({ source: 'photo', image: 'data:image/png;base64,AA==', interfaceLanguage: 'zh-CN' }, { callModel });
  assert.equal(output.candidates.length, 1);
  assert.equal(output.candidates[0].name, '豆腐');
  assert.equal(output.candidates[0].needsUserReview, true);
  assert.deepEqual(output.evaluationTrace.parsedModelOutput, raw);
});

test('fixture validator rejects unsupported or incomplete cases without running services', () => {
  assert.ok(validateCanonicalFixture({ case_id: 'bad', case_type: 'unknown', current_date: 'not-a-date', user_profile: {} }).length >= 2);
});

test('manual inventory text creates a review draft without inventing missing fields', async () => {
  const raw = { candidates: [{
    name: 'chicken', normalizedName: 'chicken', category: 'protein', uiCategory: 'protein',
    suggestedManagementMode: 'tracked_quantity', quantity: null, unit: null, packageState: 'unknown',
    observedStorageLocation: null, storageLocation: null, storageOptions: [], expiryDate: null,
    confidence: 0.92, identificationConfidence: 0.92, needsUserReview: true
  }] };
  const callModel = async ({ trace }) => { trace.rawResponse = JSON.stringify(raw); trace.parsedResponse = raw; return raw; };
  const result = await runInventoryIntelligence({ source: 'manual', text: 'I bought some chicken.', interfaceLanguage: 'en' }, { callModel });
  assert.equal(result.candidates[0].normalizedName, 'chicken');
  assert.equal(result.candidates[0].quantity, null);
  assert.equal(result.candidates[0].storageLocation, '');
  assert.equal(result.candidates[0].expiryDate, null);
  assert.equal(result.candidates[0].needsUserReview, true);
});
