import test from 'node:test';
import assert from 'node:assert/strict';
import { recipeTextEntries, recipeTextSignature, recipeLocaleKey, recipeForLanguage, needsRecipeTranslation, validTranslatedTexts } from '../src/services/recipeLocale.js';
import { MEAL_COUNTS, mealSchedule } from '../src/services/mealSchedule.js';
import { translateLabel } from '../src/i18n.js';

test('six meal times are supported without losing saved times when reducing the count', () => {
  assert.deepEqual(MEAL_COUNTS, [1, 2, 3, 4, 5, 6]);
  const initial = ['08:15', '12:15', '18:45'];
  const six = mealSchedule(6, initial);
  assert.equal(six.length, 6);
  assert.deepEqual(six.slice(0, 3), initial);
  six[5] = '22:00';
  assert.deepEqual(mealSchedule(6, mealSchedule(3, six)), six);
  assert.equal(initial.length, 3);
});

test('reported shopping labels, names and units are English', () => {
  assert.equal(translateLabel('数量未追踪，请确认家中余量'), 'Quantity is not tracked; check how much you have');
  assert.equal(translateLabel('删除「蚝油」后，它会从食材库中移除。'), 'Oyster sauce will be removed from inventory.');
  for (const text of ['必备食材当前无库存', '库存按“颗”记录，请确认是否足够', '估算库存偏低，请确认是否需要补货', '必备食材仅剩约 10%（阈值 20%）', '生抽', '蒜', '淀粉', '米醋', '鲜辣椒', '洋葱', '2 瓣']) {
    assert.doesNotMatch(translateLabel(text), /[\u3400-\u9fff]/);
  }
});

test('recipe translation changes display text only and ignores stale caches', () => {
  const recipe = { id: 'r1', recipeName: '番茄饭', reason: '清淡', steps: ['煮 5 分钟'], ingredients: [{ name: '番茄', canonicalName: 'tomato', requiredAmount: 2, unit: '个' }], image: { url: 'https://example.com/rice.jpg' } };
  const texts = ['Tomato rice', 'Light', 'Cook for 5 minutes', 'Tomato'];
  const cache = { [recipeLocaleKey(recipe, 'en')]: { source: recipeTextSignature(recipe), texts } };
  assert.equal(needsRecipeTranslation(recipe, 'en'), true);
  const translated = recipeForLanguage(recipe, 'en', cache);
  assert.equal(translated.recipeName, 'Tomato rice');
  assert.deepEqual(translated.ingredients, [{ ...recipe.ingredients[0], name: 'Tomato' }]);
  assert.deepEqual(translated.image, recipe.image);
  assert.equal(recipe.recipeName, '番茄饭');
  assert.equal(recipeForLanguage({ ...recipe, reason: '不同的说明' }, 'en', cache).recipeName, '番茄饭');
  assert.equal(recipeTextEntries(recipe).length, 4);
});

test('translation rejects wrong language, omissions and modified cooking quantities', () => {
  assert.equal(validTranslatedTexts(['煮 5 分钟'], ['Cook for 10 minutes'], 'en'), false);
  assert.equal(validTranslatedTexts(['煮 5 分钟'], ['煮 5 minutes'], 'en'), false);
  assert.equal(validTranslatedTexts(['煮 5 分钟'], [], 'en'), false);
  assert.equal(validTranslatedTexts(['煮 5 分钟'], ['Cook for 5 minutes'], 'en'), true);
  assert.equal(validTranslatedTexts(['炒 30 秒至七成熟'], ['Stir-fry for 30 seconds until 70% cooked'], 'en'), true);
  assert.equal(validTranslatedTexts(['炒 30 秒至七成熟'], ['Stir-fry for 40 seconds until 70% cooked'], 'en'), false);
});
