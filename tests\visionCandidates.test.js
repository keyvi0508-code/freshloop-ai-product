import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeVisionCandidate } from '../src/services/visionCandidates.js';

function rawCandidate(name, unit) {
  return {
    name,
    normalizedName: name.toLowerCase(),
    quantity: 1,
    unit,
    confidence: 0.95,
    visualEvidence: name,
    storageLocation: '冷藏',
    storageOptions: [
      { location: '冷藏', days: 7, available: true, note: '冷藏' },
      { location: '冷冻', days: null, available: false, note: '不适用' },
      { location: '常温', days: 1, available: true, note: '短时' }
    ]
  };
}

test('识图英文商品名和单位会简化为中文标签', () => {
  const parsley = normalizeVisionCandidate(rawCandidate('Certified Organic English Parsley', 'bun'));
  const coriander = normalizeVisionCandidate(rawCandidate('Certified Organic Coriander', 'bunch'));
  assert.equal(parsley.name, '欧芹');
  assert.equal(parsley.unit, '把');
  assert.equal(coriander.name, '香菜');
  assert.equal(coriander.unit, '把');
});

test('识图中文名称会去掉常见营销前缀', () => {
  const tomato = normalizeVisionCandidate(rawCandidate('有机精选番茄', 'pcs'));
  assert.equal(tomato.name, '番茄');
  assert.equal(tomato.unit, '个');
});

test('英文界面保留简洁英文食材标签', () => {
  const parsley = normalizeVisionCandidate(rawCandidate('Certified Organic English Parsley', 'bun'), 'en');
  assert.equal(parsley.name, 'Parsley');
  assert.equal(parsley.unit, '把'); // Presentation translates this without changing stored values.
});

test('simplification preserves compound food identities and storage qualifiers', () => {
  for (const [name, expected] of [['soy milk', '豆浆'], ['fish sauce', '鱼露'], ['egg noodles', '鸡蛋面'], ['sweet potato', '红薯'], ['peanut oil', 'peanut oil'], ['豆腐（已开封）', '豆腐（已开封）']]) {
    assert.equal(normalizeVisionCandidate(rawCandidate(name, 'g')).name, expected);
  }
});

test('language choice does not change amount or storage-unit semantics', () => {
  const raw = rawCandidate('tofu', 'box');
  const chinese = normalizeVisionCandidate(raw);
  const english = normalizeVisionCandidate(raw, 'en');
  assert.equal(chinese.quantity, english.quantity);
  assert.equal(chinese.unit, english.unit);
  assert.deepEqual(chinese.storageOptions, english.storageOptions);
});

test('storage option names returned as strings remain available for Human Review', () => {
  const candidate = normalizeVisionCandidate({
    ...rawCandidate('chicken', null),
    storageOptions: ['refrigerator', 'freezer'],
    unit: null,
    quantity: null,
    textEvidence: 'I bought some chicken.'
  }, 'en', { source: 'manual', preserveUnknowns: true });
  assert.deepEqual(candidate.storageOptions.map((item) => item.location), ['冷藏', '冷冻', '常温']);
  assert.equal(candidate.quantity, null);
});

test('unpackaged leafy greens are conservatively calibrated for Human Review', () => {
  const candidate = normalizeVisionCandidate({
    ...rawCandidate('spinach', 'bunch'),
    packageState: 'unknown',
    needsUserReview: false,
    visualEvidence: 'Loose green leaves with stems'
  }, 'en', { source: 'photo' });
  assert.equal(candidate.confidence, 0.75);
  assert.equal(candidate.needsUserReview, true);
  assert.equal(candidate.identificationStatus, 'uncertain_leafy_green');
  assert.ok(candidate.alternativeNames.length >= 2);
});

test('ambiguous package dates retain raw uncertainty and never become exact dates', () => {
  const candidate = normalizeVisionCandidate({
    ...rawCandidate('milk', 'carton'),
    packageState: 'sealed',
    expiryDate: '2026-09-20',
    confidence: 0.96,
    dateConfidence: 0.8,
    rawDateText: '240?18',
    visualEvidence: 'Milk carton and blurred use-by code'
  }, 'en', { source: 'package' });
  assert.equal(candidate.expiryDate, null);
  assert.equal(candidate.confidence, 0.75);
  assert.equal(candidate.rawDateText, '240?18');
  assert.equal(candidate.needsUserReview, true);
});
