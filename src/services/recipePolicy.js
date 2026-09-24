const EXCLUDED_RECIPE_INVENTORY = new Set(['milk', 'yogurt']);

export const STAPLE_NAMES = new Set(['rice', 'noodle', 'bread', 'potato', 'sweet potato', 'corn', 'dumpling']);

export const CONDIMENT_NAMES = new Set([
  'soy sauce', 'cooking oil', 'oyster sauce', 'salt', 'sugar', 'cornstarch',
  'rice vinegar', 'vinegar', 'black pepper', 'white pepper', 'garlic', 'ginger',
  'scallion', 'fresh chili', "bird's eye chili", 'dried chili', 'pickled chili',
  'chili oil', 'chili bean paste', 'sesame oil', 'cooking wine', 'water'
]);

function isPastExpiry(expiryDate, now = new Date()) {
  if (!expiryDate) return false;
  const expiry = new Date(`${expiryDate}T23:59:59`);
  return Number.isFinite(expiry.getTime()) && expiry < now;
}

export function isRecipeSelectableInventory(item, now = new Date()) {
  if (!item || ['staple', 'other', 'condiment'].includes(item.uiCategory)) return false;
  return !EXCLUDED_RECIPE_INVENTORY.has(item.canonicalName) && !isPastExpiry(item.expiryDate, now);
}

export function recipeSelectableInventory(inventory = [], now = new Date()) {
  return inventory.filter((item) => isRecipeSelectableInventory(item, now));
}

export function condimentInventory(inventory = []) {
  return inventory.filter((item) => item.uiCategory === 'condiment');
}

export function coreRecipeIngredients(recipe) {
  return (recipe.ingredients || []).filter((item) => !STAPLE_NAMES.has(item.canonicalName) && !CONDIMENT_NAMES.has(item.canonicalName));
}

export function isSpicyRequest(text = '') {
  return /辣|\bspicy\b|\bchill?i(?:es)?\b/i.test(text) && !/不要辣|不吃辣|不能吃辣|不辣|\b(?:not|non)[ -]?spicy\b|\b(?:no|without)\s+chill?i(?:es)?\b/i.test(text);
}

export function recipeHasChili(recipe) {
  return (recipe.ingredients || []).some((item) => /chili/.test(item.canonicalName || '') || /辣椒|小米辣|泡椒|干辣椒/.test(item.name || ''));
}

export function missingCoreIngredients(recipe, inventory = [], now = new Date()) {
  const available = new Set(inventory.filter((item) => !isPastExpiry(item.expiryDate, now)).map((item) => item.canonicalName));
  return coreRecipeIngredients(recipe).filter((item) => !available.has(item.canonicalName));
}

export function missingCondiments(recipe, inventory = []) {
  const available = new Set(inventory.map((item) => item.canonicalName));
  return (recipe.ingredients || []).filter((item) => CONDIMENT_NAMES.has(item.canonicalName) && !available.has(item.canonicalName) && item.canonicalName !== 'water');
}

export function isNamedDishRequest(text = '') {
  return /宫保|鱼香|麻婆|水煮|回锅|红烧|咖喱|冬阴功|叻沙|佛跳墙|口水鸡|辣子鸡|酸菜鱼|锅包肉|炖牛肉|煲仔饭|kung pao|mapo|curry|tom yum|laksa|beef stew|claypot rice/i.test(text);
}
