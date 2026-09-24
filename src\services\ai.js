import { getIngredientGuidance } from '../data/ingredientKnowledge.js';
import { normalizeVisionCandidates } from './visionCandidates.js';

const activeControllers = new Set();

export function cancelAllAiRequests() {
  activeControllers.forEach((controller) => controller.abort());
  activeControllers.clear();
}

async function requestJson(url, payload, fallbackMessage, timeoutMs = 65000) {
  let response;
  const controller = new AbortController();
  activeControllers.add(controller);
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error(`${fallbackMessage}：等待超过 ${Math.round(timeoutMs / 1000)} 秒，已停止本次请求，请重试`);
    throw new Error(`${fallbackMessage}：无法连接本地 AI 接口`);
  } finally {
    window.clearTimeout(timeout);
    activeControllers.delete(controller);
  }
  let body = {};
  try { body = await response.json(); } catch { body = {}; }
  if (!response.ok) throw new Error(body.error || fallbackMessage);
  return body;
}

export async function generateRecipes({ input, inventory, profile, count = 4, history = [] }) {
  const body = await requestJson('/api/generate-recipe', { input, inventory, profile, count, history }, '真实菜谱生成服务暂时不可用');
  if (!Array.isArray(body.recipes) || !body.recipes.length) throw new Error('模型没有返回可用菜谱，请重试');
  return body.recipes;
}

export async function generateRecipe(args) {
  const recipes = await generateRecipes({ ...args, count: 3 });
  return recipes[0];
}

export async function translateRecipes(recipes, language) {
  return requestJson('/api/generate-recipe', { action: 'translate', recipes, language }, language === 'en' ? 'Recipe translation unavailable' : '菜谱翻译暂不可用');
}

export async function searchRecipeImage(recipe) {
  const proposed = String(recipe.imageSearchQuery || '').trim();
  const ingredients = (recipe.ingredients || []).map((item) => item.canonicalName).filter(Boolean);
  const canonicalFallback = ingredients.slice(0, 2).join(' ');
  const query = proposed && /^[\x00-\x7F]+$/.test(proposed) ? proposed : (canonicalFallback || recipe.recipeName);
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch('/api/recipe-image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, ingredients }), signal: controller.signal });
    if (!response.ok) return null;
    const body = await response.json();
    return body.image || null;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function enrichRecipeImages(recipes = []) {
  return Promise.all(recipes.map(async (recipe) => {
    if (recipe.image?.policyVersion === 'xiachufang-reference-v1') return recipe;
    return { ...recipe, image: await searchRecipeImage(recipe) };
  }));
}

function adjustForApplianceTemperatures(storage, temperatures = {}) {
  const fridgeC = Number(temperatures.fridgeC ?? 4);
  const freezerC = Number(temperatures.freezerC ?? -18);
  return storage.map((option) => {
    if (option.location === '冷藏' && fridgeC > 4 && option.available) {
      return { ...option, days: option.days ? Math.max(1, Math.floor(option.days * 0.5)) : option.days, note: `你的冷藏设置为 ${fridgeC}°C，高于资料基线 4°C；已保守缩短提醒期。${option.note}`, temperatureWarning: true };
    }
    if (option.location === '冷冻' && freezerC > -18 && option.available) {
      return { ...option, available: false, days: null, note: `你的冷冻设置为 ${freezerC}°C，高于长期冷冻资料基线 −18°C；不自动套用该期限，请调整温度或按包装说明。`, temperatureWarning: true };
    }
    return { ...option, temperatureBasis: option.location === '冷藏' ? `${fridgeC}°C（资料基线 ≤4°C）` : option.location === '冷冻' ? `${freezerC}°C（资料基线 ≤−18°C）` : '新加坡室温环境' };
  });
}

function candidateFromKnowledge(name, overrides = {}, temperatures = {}, packageState = 'opened') {
  const info = getIngredientGuidance(name, packageState);
  const storageOptions = adjustForApplianceTemperatures(info.storage, temperatures);
  const preferred = storageOptions.find((item) => item.available) || storageOptions[0];
  const packageStateOptions = info.packageStateRelevant ? {
    opened: adjustForApplianceTemperatures(getIngredientGuidance(name, 'opened').storage, temperatures),
    sealed: adjustForApplianceTemperatures(getIngredientGuidance(name, 'sealed').storage, temperatures)
  } : null;
  return {
    name,
    normalizedName: info.canonicalName,
    category: info.category,
    uiCategory: info.uiCategory,
    suggestedManagementMode: info.mode,
    quantity: info.quantity,
    unit: info.unit,
    storageLocation: preferred.location,
    storageOptions,
    packageState,
    packageStateRelevant: Boolean(info.packageStateRelevant),
    packageStateOptions,
    applianceTemperatures: temperatures,
    freezable: Boolean(storageOptions.find((item) => item.location === '冷冻')?.available),
    refrigeratedDays: storageOptions.find((item) => item.location === '冷藏')?.days || null,
    frozenDays: storageOptions.find((item) => item.location === '冷冻')?.days || null,
    expiryRequired: Boolean(info.requiresPackageDate),
    confidence: info.confidence,
    needsUserReview: info.needsReview,
    icon: info.icon,
    story: info.story,
    nature: info.nature,
    cooking: info.cooking,
    source: info.source,
    ...overrides
  };
}

export async function getStorageGuidance(name, temperatures = {}, packageState = 'opened') {
  if (import.meta.env?.VITE_REMOTE_STORAGE_GUIDANCE !== 'true') {
    await new Promise((resolve) => setTimeout(resolve, 180));
    return candidateFromKnowledge(name, { retrievalMode: 'curated_knowledge_base' }, temperatures, packageState);
  }
  return requestJson('/api/ingredient-guidance', { name, locale: 'Singapore', temperatures, packageState }, '食材资料检索暂时不可用');
}

export async function analyzeInventory(payload) {
  const body = await requestJson('/api/analyze-inventory', payload, '真实图片识别服务暂时不可用');
  const candidates = normalizeVisionCandidates(body.candidates, payload.interfaceLanguage);
  if (!candidates.length) throw new Error('模型没有识别出足够确定的食材，请换一张更清晰的图片');
  return { ...body, candidates };
}
