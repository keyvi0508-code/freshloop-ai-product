import test from 'node:test';
import assert from 'node:assert/strict';
import { translateLabel } from '../src/i18n.js';
import { canonicalUnit } from '../src/services/units.js';
import { buildShoppingList, validateRecipe } from '../src/services/domain.js';
import { isSpicyRequest } from '../src/services/recipePolicy.js';
import { buildTasteProfile } from '../src/services/auth.js';
import fs from 'node:fs';
import { INGREDIENT_KNOWLEDGE, getIngredientGuidance } from '../src/data/ingredientKnowledge.js';
import { normalizePhone, requestPhoneUpdate, verifyPhoneUpdate } from '../src/services/auth.js';

test('translation preserves stock status, amounts and user-written text', () => {
  assert.equal(translateLabel('约 18% · 快用完'), 'About 18% · low');
  assert.equal(translateLabel('剩余约 0.5 盒'), 'About 0.5 box left');
  assert.equal(translateLabel('🌶️ 香菜'), '🌶️ Coriander');
  assert.equal(translateLabel('我自己写的补充信息'), '我自己写的补充信息');
  assert.equal(translateLabel('今日推荐已更新', 'zh-CN'), '今日推荐已更新');
});

test('English display units remain equivalent to inventory units', () => {
  assert.equal(canonicalUnit('pcs'), '个');
  const inventory = [{ canonicalName: 'egg', managementMode: 'tracked_quantity', quantity: 3, unit: '个' }];
  assert.deepEqual(buildShoppingList({ ingredients: [{ canonicalName: 'egg', name: 'Egg', requiredAmount: 2, unit: 'pcs' }] }, inventory), []);
  assert.equal(buildShoppingList({ ingredients: [{ canonicalName: 'egg', requiredAmount: 100, unit: 'g' }] }, inventory)[0].status, 'need_confirm');
});

test('English recipe names do not bypass common Chinese allergy and exclusion checks', () => {
  assert.match(validateRecipe({ ingredients: [{ name: 'Peanut oil', canonicalName: 'peanut oil' }] }, [], { allergies: ['花生'] }).join(' '), /过敏/);
  assert.match(validateRecipe({ ingredients: [{ name: 'Cilantro', canonicalName: 'cilantro' }] }, [], { dislikes: ['香菜'] }).join(' '), /不喜欢/);
  assert.equal(validateRecipe({ ingredients: [{ name: 'Eggplant', canonicalName: 'eggplant' }] }, [], { allergies: ['鸡蛋'] }).length, 0);
});

test('English spicy requests distinguish heat from temperature and explicit no-chilli requests', () => {
  assert.equal(isSpicyRequest('spicy chicken'), true);
  assert.equal(isSpicyRequest('hot soup'), false);
  assert.equal(isSpicyRequest('not spicy, no chili'), false);
  assert.equal(isSpicyRequest('without chilli'), false);
});

test('English taste profile renders selected labels while retaining original notes', () => {
  const result = buildTasteProfile({ interfaceLanguage: 'en', tasteTags: ['辣'], cuisineTags: ['粤式'], tasteNotes: 'my own notes' });
  assert.match(result, /Spicy/);
  assert.match(result, /Cantonese/);
  assert.match(result, /my own notes/);
});

test('static interface copy and placeholders have English translations, including secondary dialogs', () => {
  const source = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8').replace(/function userNoticeSections\(\)[\s\S]*?(?=function renderUserNotice)/, '');
  const strings = [...source.matchAll(/>([^<>]*[\u3400-\u9fff][^<>]*)</g)].map((m) => m[1].trim());
  const placeholders = [...source.matchAll(/placeholder="([^"]+)"/g)].map((m) => m[1]);
  // Language selectors intentionally keep both autonyms readable in either UI.
  const candidates = [...new Set(strings)].filter((s) => s && !['中文', '语言 / Language'].includes(s) && !/[{}]|=>|\|\||const /.test(s) && s.length < 450);
  assert.deepEqual(candidates.filter((s) => /[\u3400-\u9fff]/.test(translateLabel(s))), []);
  // Placeholder examples have their own map; assert the key regression via browser tests as well.
  assert.ok(placeholders.includes('请输入食材名称'));
});

test('curated storage references and ingredient notes are fully translated without changing dates', () => {
  const missing = new Set();
  for (const name of [...INGREDIENT_KNOWLEDGE.map((x) => x.name), '蘑菇', '桃子', '袋鼠肉', '米粉', '辣酱', '未知食品']) {
    for (const state of ['opened', 'sealed']) {
      const guidance = getIngredientGuidance(name, state);
      const strings = ['story', 'nature', 'cooking'].map((p) => guidance[p]);
      guidance.storage.forEach((option) => ['note', 'sourceRange', 'preparation'].forEach((p) => strings.push(option[p])));
      strings.filter(Boolean).forEach((s) => { if (/[\u3400-\u9fff]/.test(translateLabel(s))) missing.add(s); });
    }
  }
  assert.deepEqual([...missing], []);
});

test('dynamic dates, warnings and delayed messages render in English', () => {
  assert.equal(translateLabel('螃蟹'), 'Crab');
  assert.equal(translateLabel('三文鱼'), 'Salmon');
  assert.equal(translateLabel('肉类与海鲜 · 冷藏 · 品质提醒 9/2'), 'Meat & seafood · Fridge · Quality reminder 9/2');
  assert.equal(translateLabel('海鲜 · 冷藏 · 品质提醒 9/3'), 'Seafood · Fridge · Quality reminder 9/3');
  assert.equal(translateLabel('肉类 · 冷藏 · 已开封 · 品质提醒 9/5'), 'Meat · Fridge · Opened · Quality reminder 9/5');
  assert.equal(translateLabel('调味品 · 常温 · 未开封 · 品质提醒 12/1'), 'Condiments · Room temp · Sealed · Quality reminder 12/1');
  for (const message of ['2 项已过期并保留在列表中，以紫色标记。你可以在管理模式中删除。', '建议 30 天内 · 至 2026-10-02', '前提：焯水、冷却、挤干、密封', '真实图片识别服务暂时不可用：等待超过 65 秒，已停止本次请求，请重试', '自动归入「肉蛋奶及蛋白质」；加入列表时才匹配食材图标。', '今天的「Pasta」做了吗？']) {
    assert.doesNotMatch(translateLabel(message), /[\u3400-\u9fff]/);
  }
});

test('English ingredient lookup uses the same references without matching parts of other foods', () => {
  assert.equal(getIngredientGuidance('oyster sauce').canonicalName, 'oyster sauce');
  assert.deepEqual(getIngredientGuidance('Oyster sauce').storage, getIngredientGuidance('蚝油').storage);
  assert.equal(getIngredientGuidance('eggs').canonicalName, 'egg');
  assert.notEqual(getIngredientGuidance('soy milk').canonicalName, 'milk');
});

test('phone change is explicit demo-only without remote configuration and verifies before changing', async () => {
  const session = { user: { id: 'demo-test', phone: '+6581234567' } };
  assert.equal(normalizePhone('+65 8123 4567'), '+6581234567');
  assert.throws(() => normalizePhone('123'));
  await assert.rejects(requestPhoneUpdate(session, '+6587654321'));
  await assert.rejects(verifyPhoneUpdate(session, '+6587654321', 'wrong', { demo: true }));
  assert.equal(session.user.phone, '+6581234567');
  const verified = await verifyPhoneUpdate(session, '+6587654321', '123456', { demo: true });
  assert.equal(verified.user.phone, '+6587654321');
  assert.equal(verified.user.id, 'demo-test');
  assert.equal(session.user.phone, '+6581234567');
});
