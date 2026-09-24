import test from 'node:test';
import assert from 'node:assert/strict';
import { ingredientIcon, getIngredientGuidance } from '../src/data/ingredientKnowledge.js';

test('related ingredients share a visual family in both languages', () => {
  for (const name of ['辣椒', '干辣椒', '干辣椒段', '小米辣', 'dried chillies', 'fresh chili', 'chilli flakes']) assert.equal(ingredientIcon(name), '🌶️', name);
  for (const name of ['菜心', '通心菜', '空心菜', '芥蓝', '新鲜菜心', 'choy sum', 'water spinach', 'kangkong', 'baby bok choy']) assert.equal(ingredientIcon(name), '🥬', name);
});

test('seafood has specific icons instead of the broad meat fallback', () => {
  for (const name of ['螃蟹', '大闸蟹', '冷冻梭子蟹', 'crab', 'fresh crabs']) assert.equal(ingredientIcon(name), '🦀', name);
  assert.equal(ingredientIcon('小龙虾'), '🦞');
  assert.equal(ingredientIcon('鱿鱼'), '🦑');
  assert.equal(ingredientIcon('冷冻虾仁'), '🦐');
  assert.equal(ingredientIcon('fresh salmon fillet'), '🐟');
});

test('longer identities beat ingredient substrings and processed condiments keep their identity', () => {
  for (const [name, expected] of [['eggplant', '🍆'], ['sweet potato', '🍠'], ['fresh green onions', '🌿'], ['干米粉', '🍜'], ['新鲜玉米', '🌽'], ['oyster sauce', '🫙'], ['辣椒酱', '🫙'], ['辣椒油', '🫒'], ['fish sauce', '🫙'], ['black pepper', '🧂'], ['garlic mushrooms', '🍄']]) assert.equal(ingredientIcon(name), expected, name);
  assert.equal(ingredientIcon('unidentified item'), '🛍️');
  assert.equal(ingredientIcon(''), '🛍️');
});

test('visual similarity never changes storage guidance', () => {
  const before = getIngredientGuidance('通心菜');
  ingredientIcon('通心菜');
  assert.deepEqual(getIngredientGuidance('通心菜'), before);
});

test('inventory and recipe singular, plural and alternate names use the same icon', () => {
  for (const name of ['番茄', '西红柿', 'Tomato', 'Tomatoes', 'cherry tomatoes', 'fresh tomatoes']) assert.equal(ingredientIcon(name), '🍅', name);
  for (const name of ['鸡蛋', 'Egg', 'Eggs']) assert.equal(ingredientIcon(name), '🥚', name);
  for (const name of ['potato', 'potatoes', '马铃薯']) assert.equal(ingredientIcon(name), '🥔', name);
  for (const name of ["Bird's eye chili", 'dried chillies', '小米辣']) assert.equal(ingredientIcon(name), '🌶️', name);
});
