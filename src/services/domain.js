import { canonicalUnit } from './units.js';

const CONSTRAINT_ALIASES = [
  ['花生', 'peanut', 'peanuts', 'groundnut'], ['香菜', 'coriander', 'cilantro'], ['欧芹', 'parsley'],
  ['葱', '葱花', '小葱', 'scallion', 'spring onion', 'green onion'], ['虾', '虾米', '虾酱', 'shrimp', 'prawn'],
  ['牛奶', '乳制品', '奶制品', 'milk', 'dairy', 'cheese', 'butter', 'cream', 'yogurt', '乳酪', '黄油', '奶油', '酸奶'],
  ['鸡蛋', '蛋类', 'egg', 'eggs'], ['大豆', '豆制品', 'soy', 'soya', 'tofu', '豆腐', '豆浆', '酱油'],
  ['芝麻', 'sesame'], ['小麦', 'wheat'], ['鱼', 'fish', 'salmon', '三文鱼'], ['蚝', 'oyster'],
  ['辣椒', '小米辣', 'chili', 'chilli'], ['猪肉', 'pork'], ['牛肉', 'beef']
];

const MEAT_AND_SEAFOOD = [
  'chicken', 'chicken breast', 'chicken thigh', 'beef', 'ground beef', 'pork',
  'fish', 'salmon', 'shrimp', 'prawn', 'oyster', '肉', '鸡肉', '鸡胸肉', '鸡腿肉',
  '牛肉', '猪肉', '鱼', '三文鱼', '虾', '海鲜', '蚝'
];
const ANIMAL_PRODUCTS = [
  ...MEAT_AND_SEAFOOD, 'egg', 'eggs', 'milk', 'dairy', 'cheese', 'butter',
  'cream', 'yogurt', 'honey', '鸡蛋', '蛋', '牛奶', '乳制品', '奶酪', '黄油',
  '奶油', '酸奶', '蜂蜜'
];
const PORK_AND_ALCOHOL = ['pork', '猪肉', 'wine', 'cooking wine', 'alcohol', '料酒', '酒'];

function normalizedDietaryConstraints(values = []) {
  return values.map((value) => String(value || '').trim().toLowerCase()).filter(Boolean);
}

function violatesDietaryConstraint(ingredient, values = []) {
  const text = `${ingredient.canonicalName || ''} ${ingredient.name || ''}`.toLowerCase();
  return normalizedDietaryConstraints(values).some((constraint) => {
    if (/vegetarian|素食|不吃肉/.test(constraint)) return MEAT_AND_SEAFOOD.some((name) => containsFoodName(text, name));
    if (/vegan|纯素/.test(constraint)) return ANIMAL_PRODUCTS.some((name) => containsFoodName(text, name));
    if (/halal|清真/.test(constraint)) return PORK_AND_ALCOHOL.some((name) => containsFoodName(text, name));
    const namedFood = constraint
      .replace(/^(?:does not eat|do not eat|doesn't eat|no|avoid)\s+/i, '')
      .replace(/^(?:不吃|避免|不要)\s*/u, '')
      .trim();
    return namedFood.length >= 2 && containsFoodName(text, namedFood);
  });
}

function containsFoodName(text, name) {
  if (/[\u3400-\u9fff]/.test(name)) return text.includes(name);
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}(?:s)?\\b`, 'i').test(text);
}

function explicitlyExcludesFoodName(text, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (/[\u3400-\u9fff]/.test(name)) return new RegExp(`(?:无|不含|不加|不使用)\\s*${escaped}`, 'i').test(text);
  return new RegExp(`(?:\\b${escaped}[-\\s]?free\\b|\\bwithout\\s+(?:any\\s+)?${escaped}s?\\b|\\bno\\s+${escaped}s?\\b)`, 'i').test(text);
}

function violatesConstraint(ingredient, constraints, broad = false) {
  const text = `${ingredient.canonicalName || ''} ${ingredient.name || ''}`.toLowerCase();
  return constraints.some((value) => {
    const constraint = String(value).toLowerCase().trim();
    if (!constraint) return false;
    // Allergy groups are conservative; dislikes match names rather than all dairy, etc.
    const aliases = CONSTRAINT_ALIASES.find((group) => group.includes(constraint));
    const names = aliases && (broad || aliases.length < 8) ? aliases : [constraint];
    return names.some((name) => containsFoodName(text, name) && !explicitlyExcludesFoodName(text, name));
  });
}

export function isIngredientCompatibleWithProfile(ingredient, profile = {}) {
  return !violatesConstraint(ingredient, profile.allergies || [], true)
    && !violatesConstraint(ingredient, profile.dislikes || [])
    && !violatesDietaryConstraint(ingredient, profile.dietaryConstraints || []);
}

const MODE_LABELS = {
  tracked_quantity: '精细消耗',
  freshness_only: '新鲜度',
  approximate_stock: '估算库存'
};

export function modeLabel(mode) { return MODE_LABELS[mode] || mode; }

export function daysUntil(dateString, now = new Date()) {
  if (!dateString) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(`${dateString}T00:00:00`);
  return Math.ceil((target - today) / 86400000);
}

export function expiryTone(item, now = new Date()) {
  const days = daysUntil(item.expiryDate, now);
  if (days == null) return 'neutral';
  if (days < 0) return 'purple';
  if (days <= 3) return 'pink';
  if (days <= 6) return 'blue';
  return 'green';
}

export function expiryLabel(item, now = new Date()) {
  const days = daysUntil(item.expiryDate, now);
  if (days == null) return null;
  if (days < 0) return `已过期 ${Math.abs(days)} 天`;
  if (days === 0) return '今天到期';
  if (days === 1) return '明天到期';
  return `${days} 天后到期`;
}

export function sortInventoryByExpiry(items, now = new Date()) {
  return [...items].sort((a, b) => {
    const aDays = daysUntil(a.expiryDate, now);
    const bDays = daysUntil(b.expiryDate, now);
    if (aDays == null && bDays == null) return a.name.localeCompare(b.name, 'zh-CN');
    if (aDays == null) return 1;
    if (bDays == null) return -1;
    return aDays - bDays;
  });
}

export function freshnessLabel(item) {
  if (item.freshnessStatus === 'use_soon') return '建议尽快使用';
  if (item.freshnessStatus === 'expired_or_past_recorded_date') return '请检查日期';
  if (item.freshnessStatus === 'uncertain') return '信息不确定';
  return '状态良好';
}

export function freshnessClass(item) {
  if (item.freshnessStatus === 'use_soon') return 'warning';
  if (item.freshnessStatus === 'expired_or_past_recorded_date') return 'danger';
  if (item.freshnessStatus === 'uncertain') return 'muted';
  return 'success';
}

export function formatStock(item) {
  if (item.managementMode === 'freshness_only') return '用完即删';
  if (item.managementMode === 'approximate_stock') {
    if (item.stockPercentage == null) return '待确认';
    if (item.stockPercentage <= 20) return `约 ${item.stockPercentage}% · 快用完`;
    if (item.stockPercentage <= 35) return `约 ${item.stockPercentage}% · 偏少`;
    if (item.stockPercentage <= 65) return `约 ${item.stockPercentage}%`;
    return `约 ${item.stockPercentage}% · 充足`;
  }
  return `剩余约 ${item.quantity ?? '待确认'} ${item.unit || ''}`.trim();
}

export function findInventoryItem(inventory, canonicalName) {
  return inventory.find((item) => item.canonicalName === canonicalName || item.name === canonicalName);
}

export function validateRecipe(recipe, inventory, profile, { now = new Date(), maxPrepMinutes = null } = {}) {
  const errors = [];
  const inventoryByName = new Map(inventory.map((item) => [item.canonicalName, item]));
  for (const ingredient of recipe.ingredients || []) {
    const current = inventoryByName.get(ingredient.canonicalName);
    if (current?.managementMode === 'tracked_quantity' && (!ingredient.unit || canonicalUnit(ingredient.unit) === canonicalUnit(current.unit)) && Number(ingredient.requiredAmount) > Number(current.quantity)) {
      errors.push(`${ingredient.name}库存不足`);
    }
    if (violatesConstraint(ingredient, profile.allergies || [], true)) {
      errors.push(`违反过敏硬约束：${ingredient.name}`);
    }
    if (violatesConstraint(ingredient, profile.dislikes || [])) {
      errors.push(`包含用户明确不喜欢的食材：${ingredient.name}`);
    }
    if (violatesDietaryConstraint(ingredient, profile.dietaryConstraints || [])) {
      errors.push(`违反饮食硬约束：${ingredient.name}`);
    }
    if (current?.expiryDate && daysUntil(current.expiryDate, now) < 0) {
      errors.push(`使用了已超过记录日期的食材：${ingredient.name}`);
    }
    if (Number(maxPrepMinutes) <= 15 && current?.storageLocation === '冷冻' && current?.uiCategory === 'protein') {
      errors.push(`短时方案不可默认使用未解冻蛋白质：${ingredient.name}`);
    }
  }
  if (Number(maxPrepMinutes) > 0 && Number(recipe.estimatedPrepMinutes) > Number(maxPrepMinutes)) {
    errors.push(`预计总耗时 ${recipe.estimatedPrepMinutes} 分钟超过 ${maxPrepMinutes} 分钟上限`);
  }
  return errors;
}

function trackedServingCapacity(item) {
  if (!item || item.managementMode !== 'tracked_quantity') return null;
  const quantity = Number(item.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) return 0;
  const unit = canonicalUnit(item.unit);
  const canonical = String(item.canonicalName || '').toLowerCase();
  if (item.uiCategory === 'protein') {
    if (unit === '千克') return (quantity * 1000) / 80;
    if (unit === '克') return quantity / 80;
    if (canonical === 'egg' || /蛋/.test(item.name || '')) return quantity;
    if (canonical === 'tofu' || /豆腐/.test(item.name || '')) return quantity * 2;
    return quantity;
  }
  if (item.uiCategory === 'staple') {
    if (unit === '千克') return (quantity * 1000) / 60;
    if (unit === '克') return quantity / 60;
    if (canonical === 'bread' || /面包/.test(item.name || '')) return quantity / 2;
    return quantity;
  }
  return null;
}

export function assessInventoryServingFeasibility(inventory = [], requestedServings = 1, { carbId = '', profile = {}, now = new Date() } = {}) {
  const requested = Math.max(1, Number(requestedServings) || 1);
  const usable = inventory.filter((item) => !(item.expiryDate && daysUntil(item.expiryDate, now) < 0));
  const permittedProteins = usable.filter((item) => item.uiCategory === 'protein' && isIngredientCompatibleWithProfile(item, profile));
  const proteinCapacities = permittedProteins.map(trackedServingCapacity).filter((value) => value != null);
  const proteinCapacity = proteinCapacities.length ? proteinCapacities.reduce((total, value) => total + value, 0) : null;
  const selectedCarb = usable.find((item) => item.id === carbId && item.uiCategory === 'staple');
  const stapleCapacity = trackedServingCapacity(selectedCarb);
  const limiting = [proteinCapacity, stapleCapacity].filter((value) => value != null);
  const estimatedPantryServings = limiting.length ? Math.max(0, Math.floor(Math.min(...limiting))) : null;
  const shortages = [];
  if (proteinCapacity != null && proteinCapacity < requested) shortages.push({ type: 'protein', availableServings: Math.max(0, Math.floor(proteinCapacity)), requestedServings: requested });
  if (stapleCapacity != null && stapleCapacity < requested) shortages.push({ type: 'staple', itemId: selectedCarb?.id || null, name: selectedCarb?.name || null, canonicalName: selectedCarb?.canonicalName || null, availableServings: Math.max(0, Math.floor(stapleCapacity)), requestedServings: requested });
  return {
    requestedServings: requested,
    estimatedPantryServings,
    sufficient: shortages.length === 0,
    shortages
  };
}

export function buildShoppingList(recipe, inventory) {
  return (recipe.ingredients || []).flatMap((ingredient) => {
    const current = findInventoryItem(inventory, ingredient.canonicalName);
    if (!current) return [{ ...ingredient, status: 'to_buy', reason: '库存中没有该食材', available: null }];
    if (current.managementMode === 'freshness_only') return [{ ...ingredient, status: 'need_confirm', reason: '数量未追踪，请确认家中余量', available: '未知' }];
    if (current.managementMode === 'approximate_stock') {
      return current.stockPercentage > 20 ? [] : [{ ...ingredient, status: 'need_confirm', reason: '估算库存偏低，请确认是否需要补货', available: `约 ${current.stockPercentage}%` }];
    }
    if (ingredient.unit && canonicalUnit(ingredient.unit) !== canonicalUnit(current.unit)) return [{ ...ingredient, status: 'need_confirm', reason: `库存按“${current.unit}”记录，请确认是否足够`, available: `${current.quantity} ${current.unit}` }];
    if (Number(ingredient.requiredAmount) <= Number(current.quantity)) return [];
    return [{ ...ingredient, status: 'to_buy', reason: '精细库存不足', available: `${current.quantity} ${current.unit}` }];
  });
}

export function applyMealConsumption(state, recipe, actualById = {}) {
  const events = [];
  const removeIds = new Set();
  for (const ingredient of recipe.ingredients || []) {
    const item = findInventoryItem(state.inventory, ingredient.canonicalName);
    if (!item) continue;
    const review = actualById[item.id];
    const amount = Number((review && typeof review === 'object' ? review.amount : review) ?? ingredient.requiredAmount);
    if (item.managementMode === 'tracked_quantity') {
      const before = Number(item.quantity);
      item.quantity = Math.max(0, Number(item.quantity) - amount);
      events.push({ type: 'consume', inventoryItemId: item.id, amount, unit: item.unit, before, remaining: item.quantity });
    } else if (item.managementMode === 'approximate_stock' && item.stockPercentage != null) {
      const before = Number(item.stockPercentage);
      const reviewedRemaining = review && typeof review === 'object' ? Number(review.remainingPercentage) : null;
      item.stockPercentage = Number.isFinite(reviewedRemaining) ? Math.max(0, Math.min(100, reviewedRemaining)) : Math.max(0, before - Math.min(20, amount / 10));
      events.push({ type: 'reviewed_stock', inventoryItemId: item.id, before, remaining: item.stockPercentage, unit: '%' });
    } else if (item.managementMode === 'freshness_only' && review?.usedUp) {
      removeIds.add(item.id);
      events.push({ type: 'used_up', inventoryItemId: item.id, remaining: 0, unit: item.unit });
    }
  }
  if (removeIds.size) state.inventory = state.inventory.filter((item) => !removeIds.has(item.id));
  return events;
}
