import { getIngredientGuidance } from '../../src/data/ingredientKnowledge.js';
import { parseRequestBody } from './_deepseek.js';

function applyTemperatureBasis(storage, temperatures = {}) {
  const fridgeC = Number(temperatures.fridgeC ?? 4); const freezerC = Number(temperatures.freezerC ?? -18);
  return storage.map((option) => {
    if (option.location === '冷藏' && fridgeC > 4 && option.available) return { ...option, days: option.days ? Math.max(1, Math.floor(option.days * 0.5)) : option.days, note: `用户冷藏设置为 ${fridgeC}°C，高于资料基线 4°C；已保守缩短提醒期。${option.note}`, temperatureWarning: true };
    if (option.location === '冷冻' && freezerC > -18 && option.available) return { ...option, days: null, available: false, note: `用户冷冻设置为 ${freezerC}°C，高于长期冷冻资料基线 −18°C，不能套用该期限。`, temperatureWarning: true };
    return { ...option, temperatureBasis: option.location === '冷藏' ? `${fridgeC}°C（资料基线 ≤4°C）` : option.location === '冷冻' ? `${freezerC}°C（资料基线 ≤−18°C）` : '新加坡室温环境' };
  });
}

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' });
  const { name, locale = 'Singapore', temperatures = {}, packageState = 'opened' } = parseRequestBody(request);
  if (!name?.trim()) return response.status(400).json({ error: 'Ingredient name is required' });
  const info = getIngredientGuidance(name.trim(), packageState);
  const storageOptions = applyTemperatureBasis(info.storage, temperatures);
  const preferred = storageOptions.find((item) => item.available) || storageOptions[0];
  const packageStateOptions = info.packageStateRelevant ? {
    opened: applyTemperatureBasis(getIngredientGuidance(name.trim(), 'opened').storage, temperatures),
    sealed: applyTemperatureBasis(getIngredientGuidance(name.trim(), 'sealed').storage, temperatures)
  } : null;
  return response.status(200).json({
    name: name.trim(), normalizedName: info.canonicalName, category: info.category, uiCategory: info.uiCategory,
    suggestedManagementMode: info.mode, quantity: info.quantity, unit: info.unit, storageLocation: preferred.location,
    storageOptions, expiryRequired: Boolean(info.requiresPackageDate), confidence: info.confidence,
    packageState, packageStateRelevant: Boolean(info.packageStateRelevant), packageStateOptions,
    needsUserReview: info.needsReview, icon: info.icon, story: info.story, nature: info.nature, cooking: info.cooking,
    source: info.source, applianceTemperatures: temperatures,
    retrieval: { mode: 'curated-source-rag', locale, matchedKeys: info.keys || [], conservativeFallback: Boolean(info.needsReview && info.confidence < 0.8) }
  });
}
