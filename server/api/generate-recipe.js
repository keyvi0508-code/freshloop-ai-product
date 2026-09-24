import { callDeepSeek, DEEPSEEK_PROVIDER, DEEPSEEK_STRUCTURED_OUTPUT, parseRequestBody, sendError } from './_deepseek.js';
import { retrieveRecipeContext } from '../rag/recipeKnowledge.js';
import { retrieveXiachufangCandidates } from '../rag/xiachufang.js';
import { canonicalUnit } from '../../src/services/units.js';
import { isSpicyRequest, isNamedDishRequest, recipeSelectableInventory } from '../../src/services/recipePolicy.js';
import { assessInventoryServingFeasibility, daysUntil, isIngredientCompatibleWithProfile, validateRecipe } from '../../src/services/domain.js';
import { translateRecipeTexts } from './_recipeTranslation.js';

const CONDIMENTS = new Set(['soy sauce', 'cooking oil', 'oyster sauce', 'salt', 'sugar', 'cornstarch', 'rice vinegar', 'vinegar', 'black pepper', 'white pepper', 'garlic', 'ginger', 'scallion', 'fresh chili', "bird's eye chili", 'dried chili', 'pickled chili', 'chili oil', 'chili bean paste', 'sesame oil', 'cooking wine', 'water']);
const STAPLES = new Set(['rice', 'noodle', 'bread', 'potato', 'sweet potato', 'corn', 'dumpling']);

export const RECIPE_PROMPT_VERSION = 'recipe-v8-resilient-hard-constraints';
export const RECIPE_MODEL_CONFIG = Object.freeze({
  provider: DEEPSEEK_PROVIDER,
  model: 'deepseek-v4-flash',
  temperature: 0.72,
  maxOutputTokens: 4000,
  structuredOutput: DEEPSEEK_STRUCTURED_OUTPUT,
  timeoutMs: 55000
});

export class RecipeValidationError extends Error {
  constructor(message, { attempts = [], context = null } = {}) {
    super(message);
    this.name = 'RecipeValidationError';
    this.code = 'VALIDATION_FAILURE';
    this.attempts = attempts;
    this.context = context;
  }
}

function coreCount(recipe) {
  return (recipe.ingredients || []).filter((item) => !STAPLES.has(item.canonicalName) && !CONDIMENTS.has(item.canonicalName)).length;
}

function hasChili(recipe) {
  return (recipe.ingredients || []).some((item) => /chili/.test(item.canonicalName || '') || /辣椒|小米辣|泡椒|干辣椒/.test(item.name || ''));
}

function normalizeSteps(value, fallback = []) {
  const text = (item) => {
    if (typeof item === 'string' || typeof item === 'number') return String(item).trim();
    if (item && typeof item === 'object') return Object.values(item).filter((part) => typeof part === 'string' || typeof part === 'number').map(String).join(' · ').trim();
    return '';
  };
  if (Array.isArray(value)) return value.map(text).filter(Boolean);
  if (typeof value === 'string') return value.split(/\n+|(?=\d+[.、）)])/).map((item) => item.replace(/^\d+[.、）)]\s*/, '').trim()).filter(Boolean);
  return fallback;
}

function cleanRecipeName(value = '') {
  return String(value || '').replace(/^\s*(?:\d+[.、:：\-]\s*|第[一二三四五六七八九十\d]+道\s*)/, '').trim();
}

function xiachufangQueries(selected, cookingInventory) {
  const items = (selected.length ? selected : cookingInventory).map((item) => item.name).filter(Boolean);
  const queries = [items.slice(0, 2).join(' '), items.slice(2, 4).join(' ')].filter(Boolean);
  return queries.length ? queries : ['家常菜'];
}

const DISH_METHODS = ['炒', '汤', '炖', '焖', '煎', '烤', '蒸', '拌', '面', '饭', '粥', '饼', '烩', '炸', '沙拉'];

function bestWebReference(recipe, candidates, usedIds) {
  const recipeName = String(recipe.recipeName || '');
  const recipeIngredients = (recipe.ingredients || []).map((item) => String(item.name || '')).filter(Boolean);
  const recipeMethods = DISH_METHODS.filter((method) => recipeName.includes(method));
  const ranked = candidates.filter((candidate) => !usedIds.has(candidate.id)).map((candidate) => {
    const searchable = `${candidate.title} ${(candidate.ingredients || []).join(' ')}`;
    const candidateMethods = DISH_METHODS.filter((method) => candidate.title.includes(method));
    const methodMatch = recipeMethods.length && candidateMethods.length ? recipeMethods.some((method) => candidateMethods.includes(method)) : false;
    const methodConflict = recipeMethods.length && candidateMethods.length && !methodMatch;
    const ingredientOverlap = recipeIngredients.filter((name) => searchable.includes(name) || (candidate.ingredients || []).some((item) => name.includes(item) || item.includes(name))).length;
    const titleMatch = candidate.title.includes(recipeName) || recipeName.includes(candidate.title);
    return { candidate, score: (titleMatch ? 8 : 0) + ingredientOverlap * 2 + (methodMatch ? 3 : 0) - (methodConflict ? 5 : 0) };
  }).sort((a, b) => b.score - a.score || b.candidate.score - a.candidate.score);
  return ranked[0]?.score >= 5 ? ranked[0].candidate : null;
}

function ensureRequiredChili(recipe, index, servings, english = false) {
  if (hasChili(recipe)) {
    return { ...recipe, ingredients: (recipe.ingredients || []).map((item) => ({ ...item, userIntentRequired: /chili/.test(item.canonicalName || '') || /辣椒|小米辣|泡椒|干辣椒/.test(item.name || '') })) };
  }
  const choices = [
    { canonicalName: 'fresh chili', name: english ? 'fresh chili' : '鲜辣椒', requiredAmount: servings, unit: english ? 'pc' : '根' },
    { canonicalName: "bird's eye chili", name: english ? "bird's eye chili" : '小米辣', requiredAmount: servings * 2, unit: english ? 'pcs' : '根' },
    { canonicalName: 'dried chili', name: english ? 'dried chili' : '干辣椒', requiredAmount: servings * 3, unit: english ? 'pcs' : '根' },
    { canonicalName: 'pickled chili', name: english ? 'pickled chili' : '泡椒', requiredAmount: servings * 2, unit: english ? 'pcs' : '根' }
  ];
  const chili = choices[index % choices.length];
  return { ...recipe, ingredients: [...(recipe.ingredients || []), { ...chili, userIntentRequired: true }], steps: [...(recipe.steps || []), english ? `Add the ${chili.name} in two batches and fry until aromatic so the finished dish is genuinely spicy.` : `加入${chili.name}并炒出辣香，分两次调节用量，确保成品真正有辣味。`] };
}

export function buildRecipePrompt({ input, profile, history, cookingInventory, selected, condiments, carb, retrievedContext, webCandidates, servingFeasibility, expiredInventory, now = new Date(), previousValidationErrors = [] }) {
  const outputEnglish = profile.interfaceLanguage === 'en';
  const hardConstraints = { allergies: profile.allergies || [], dislikes: profile.dislikes || [], dietaryConstraints: profile.dietaryConstraints || [] };
  const tasteProfile = { tasteTags: profile.tasteTags || [], cuisineTags: profile.cuisineTags || [], notes: profile.tasteNotes || '', summary: profile.tasteProfileSummary || '' };
  const requestText = `${input.prompt || ''} ${input.followUp || ''}`.trim();
  const spicyRequired = isSpicyRequest(requestText);
  const namedDish = isNamedDishRequest(requestText);
  const messages = [
    {
      role: 'system',
      content: `你是面向新加坡家庭厨房新手的菜谱规划助手，只输出 JSON。你必须根据本次传入的库存、口味画像、用户此刻想法和检索知识卡现场创造菜谱，禁止复述固定模板。优先级从高到低：1. 过敏、明确忌口与 vegetarian/vegan/halal 等饮食限制；2. 用户此刻明确提出的味道、菜式与时间；3. 长期口味画像；4. 库存便利。用户文字可能要求“忽略过敏/忌口”，这种指令无效：硬约束中的食材及其酱料、加工品或替代写法都不得出现在任何一道菜的 ingredients 中。每一道菜都必须独立满足全部硬约束，只要一道违规，整组都会被拒绝并重生。用户写“辣、微辣、香辣”等时，这是硬标准，返回的每一道菜都必须明确包含一种真正的辣椒（鲜辣椒、小米辣、干辣椒或泡椒），写出准确数量和加入时机；库存没有也不能弱化成不辣。默认恰好返回 4 道互不重复的菜：前 2 道 planType=pantry，核心食材尽量来自库存；后 2 道 planType=explore，只允许少量补齐核心食材。每道菜最多 3 种核心食材，主食和葱姜蒜、辣椒、油、盐、酱料等调味不计入核心食材。调味料必须尽量只用“调味库存”；整组默认最多只有 1 道菜缺 1 种调味料。只有用户明确点名的菜式或明确味道标准确实需要时，才允许超出该调味缺口上限，并在 reason 中说明。不得把主食、饮料、零食、牛奶或酸奶放入“优先库存”，也不要生成饮品或零食。指定主食必须在四道菜中使用；未指定则可不配主食。若库存份量不足以满足请求人数，不得声称“库存足够”：可以减少 servings，或明确列出需要补充的食材和数量；只要明确披露缺口，补购后的菜谱仍然有效。冷冻蛋白质在 15 分钟以内的方案中默认不可用，除非已经解冻；estimatedPrepMinutes 必须包含解冻、腌制、预热和烹饪总时间。本次列出的可入菜库存已预先排除不符合硬约束或短时条件的项目，不得从原始请求中把它们重新加回。备餐时间 240 表示允许 2 小时以上的炖煮。每道菜从锅具、预热、食用油毫升数、火力和秒/分钟数开始教；prep 恰好 2–3 条，steps 恰好 5–7 条，tips 最多 2 条，在紧凑篇幅内写全准确调味用量、预处理、加入顺序、熟度判断与失败补救。输出对象必须是 {"recipes": Recipe[]}，Recipe 包含 id, recipeName, imageSearchQuery, emoji, estimatedPrepMinutes, servings, reason, planType, planLabel, ragEvidenceIds, ingredients, prep, steps, tips；imageSearchQuery 只写 2–4 个英文词，优先“主要食材 + 菜式”，用于开放图库搜索；ragEvidenceIds 必须引用本次提供的知识卡 id。ingredients 包含 canonicalName, name, requiredAmount, unit。不要输出 Markdown。`
    },
    {
      role: 'system',
      content: outputEnglish
        ? 'The interface language is English. Write every user-facing field in natural, concise English: recipeName, reason, planLabel, ingredient name and unit, prep, steps, and tips. Keep canonicalName and imageSearchQuery in English. Do not mix Chinese into user-facing fields.'
        : '界面语言为简体中文。所有面向用户的菜名、理由、标签、食材名、单位、准备、步骤和提示必须使用自然简洁的中文。'
    },
    {
      role: 'system',
      content: `以下是从下厨房公开搜索页提取的精简候选，仅包含菜名、主要食材、评分、来源链接，不含可复制的完整步骤：${JSON.stringify(webCandidates.map(({ id, title, ingredients, score, cooks, sourceUrl }) => ({ id, title, ingredients, score, cooks, sourceUrl })))}。候选仅用于菜式身份、用户画像筛选和配图匹配。若采用某候选，必须保持同一道菜的核心食材和烹饪形态，并在 Recipe 增加 webReferenceId=候选 id；若没有准确匹配则 webReferenceId=null。不得照抄第三方步骤。recipeName 不得带“1.”、“第一道”等任何序号。imageSearchQuery 要同时体现主要食材、烹饪形态和成品浓淡色泽。`
    },
    {
      role: 'user',
      content: `请生成恰好 4 道菜。\n本次刷新标识：${input.generationNonce || 'initial'}，需要与之前结果明显不同。\n用户此刻想法（硬标准，仅次于过敏忌口）：${input.prompt || '没有额外指定'}\n补充追问：${input.followUp || '无'}\n是否必须每道都有辣椒：${spicyRequired ? '是' : '否'}\n是否点名具体菜式：${namedDish ? '是，可在确有必要时解释调味例外' : '否'}\n人数：${input.servings || 1}\n备餐总时长上限（包含解冻/腌制）：${input.prepTime || 30} 分钟\n口味画像：${JSON.stringify(tasteProfile)}\n指定主食：${carb ? JSON.stringify({ id: carb.id, name: carb.name, canonicalName: carb.canonicalName, quantity: carb.quantity, unit: carb.unit, storageLocation: carb.storageLocation }) : '无'}\n库存份量可行性预检：${JSON.stringify(servingFeasibility)}\n已超过记录日期、不得作为普通食材使用：${JSON.stringify(expiredInventory.map(({ id, name, canonicalName, expiryDate }) => ({ id, name, canonicalName, expiryDate })))}\n本次抽取的优先核心食材：${JSON.stringify(selected.map(({ id, name, canonicalName, quantity, unit, expiryDate, freshnessStatus, storageLocation }) => ({ id, name, canonicalName, quantity, unit, expiryDate, freshnessStatus, remainingDays: daysUntil(expiryDate, now), storageLocation })))}\n可入菜核心库存（已排除主食、其他食品、调味料、牛奶、酸奶和过期项）：${JSON.stringify(cookingInventory.map(({ id, name, canonicalName, quantity, unit, expiryDate, freshnessStatus, storageLocation }) => ({ id, name, canonicalName, quantity, unit, expiryDate, freshnessStatus, remainingDays: daysUntil(expiryDate, now), storageLocation })))}\n调味库存：${JSON.stringify(condiments.map(({ name, canonicalName, stockPercentage, quantity, unit }) => ({ name, canonicalName, stockPercentage, quantity, unit })))}\n检索到的烹饪知识卡：${JSON.stringify(retrievedContext)}\n硬约束：${JSON.stringify(hardConstraints)}\n不得重复的近期方案：${JSON.stringify(history.slice(-8).map(({ recipeName, reason }) => ({ recipeName, reason })))}`
    }
  ];
  if (previousValidationErrors.length) messages.push({ role: 'system', content: `上一轮输出已被 production validator 拒绝。必须修复以下错误后重新生成完整的 4 道菜，不得复用违规内容：${previousValidationErrors.join('；')}` });
  return { messages, hardConstraints, spicyRequired, outputEnglish };
}

function freshnessNotesForRecipe(recipe, inventory, now, outputEnglish) {
  const byName = new Map(inventory.map((item) => [item.canonicalName, item]));
  return (recipe.ingredients || []).flatMap((ingredient) => {
    const current = byName.get(ingredient.canonicalName);
    const remaining = current?.expiryDate ? daysUntil(current.expiryDate, now) : null;
    if (remaining == null || remaining < 0 || remaining > 3) return [];
    return [outputEnglish
      ? `${ingredient.name} has ${remaining === 0 ? 'a recorded date today' : `${remaining} day${remaining === 1 ? '' : 's'} until its recorded date`}, so this recipe prioritizes it for use soon.`
      : `${ingredient.name}${remaining === 0 ? '的记录日期是今天' : `距记录日期还有 ${remaining} 天`}，因此本方案优先使用这项临期食材。`];
  });
}

function englishInventoryName(item) {
  const value = String(item?.canonicalName || item?.name || '').trim();
  return value ? `${value[0].toUpperCase()}${value.slice(1)}` : '';
}

function expiredAlerts(expiredInventory, outputEnglish) {
  return expiredInventory.map((item) => outputEnglish
    ? `${englishInventoryName(item)} is past its recorded date (${item.expiryDate}) and was excluded. Check the package and condition; discard it when the label or condition indicates it should not be used.`
    : `${item.name}已超过记录日期（${item.expiryDate}），本次已排除。请核对包装和实际状态；不符合标签或状态要求时应丢弃。`);
}

function feasibilityWarnings(servingFeasibility, outputEnglish) {
  if (servingFeasibility.sufficient) return [];
  return servingFeasibility.shortages.map((shortage) => {
    const available = Math.max(0, shortage.availableServings || 0);
    if (shortage.type === 'staple') return outputEnglish
      ? `${englishInventoryName(shortage) || 'The selected staple'} is estimated to cover about ${available} serving(s), below the requested ${shortage.requestedServings}; add more or reduce servings.`
      : `${shortage.name || '所选主食'}预计仅够约 ${available} 人份，少于请求的 ${shortage.requestedServings} 人份；请补充或减少人数。`;
    return outputEnglish
      ? `Tracked protein is estimated to cover about ${available} serving(s), below the requested ${shortage.requestedServings}; add another protein or reduce servings.`
      : `已记录蛋白质预计仅够约 ${available} 人份，少于请求的 ${shortage.requestedServings} 人份；请补充蛋白质或减少人数。`;
  });
}

function normalizeGeneratedRecipes({ result, retrievedContext, webCandidates, spicyRequired, outputEnglish, input, inventory, servingFeasibility, expiredInventory, now, timestamp }) {
  const retrievedIds = new Set(retrievedContext.map((item) => item.id));
  const webCandidateMap = new Map(webCandidates.map((item) => [item.id, item]));
  let recipes = (result.recipes || []).slice(0, 4);
  if (spicyRequired) recipes = recipes.map((recipe, index) => ensureRequiredChili(recipe, index, Number(input.servings || 1), outputEnglish));
  const usedWebReferenceIds = new Set();
  return recipes.map((recipe, index) => {
    const requestedReference = webCandidateMap.get(String(recipe.webReferenceId || '')) || null;
    const webReference = requestedReference && !usedWebReferenceIds.has(requestedReference.id) ? requestedReference : bestWebReference(recipe, webCandidates, usedWebReferenceIds);
    if (webReference) usedWebReferenceIds.add(webReference.id);
    const normalized = {
      ...recipe,
      ingredients: (recipe.ingredients || []).map((item) => ({ ...item, unit: canonicalUnit(item.unit) })),
      language: outputEnglish ? 'en' : 'zh-CN',
      id: recipe.id != null && recipe.id !== '' ? String(recipe.id) : `remote-${timestamp}-${index}`,
      recipeName: cleanRecipeName(recipe.recipeName) || (outputEnglish ? `${(recipe.ingredients || []).slice(0, 2).map((item) => item.name).filter(Boolean).join(' ')} home-style dish` : `${(recipe.ingredients || []).slice(0, 2).map((item) => item.name).filter(Boolean).join('')}家常菜`),
      planType: index < 2 ? 'pantry' : 'explore',
      planLabel: index < 2 ? (outputEnglish ? 'Use what you have' : '尽量用现有库存') : (outputEnglish ? 'Add only a little' : '只补少量新食材'),
      coreIngredientCount: coreCount(recipe),
      prep: normalizeSteps(recipe.prep, [outputEnglish ? 'Wash and cut the ingredients as directed.' : '清洗并按步骤切配食材。']),
      steps: normalizeSteps(recipe.steps, [outputEnglish ? 'Cook ingredients in order of required doneness, then serve immediately.' : '按食材熟成速度依次下锅，完成后立即装盘。']),
      tips: normalizeSteps(recipe.tips),
      ragEvidenceIds: (recipe.ragEvidenceIds || []).filter((id) => retrievedIds.has(id)),
      retrievalContext: retrievedContext.map(({ id, title }) => ({ id, title })),
      webReference: webReference ? { id: webReference.id, title: webReference.title, sourceUrl: webReference.sourceUrl } : null,
      image: webReference ? { url: webReference.imageUrl, sourceUrl: webReference.sourceUrl, title: webReference.title, artist: '', license: '菜谱图片参考 · 下厨房', provider: '下厨房', matchedQuery: webReference.query, policyVersion: 'xiachufang-reference-v1' } : null,
      createdAt: new Date(timestamp).toISOString(),
      model: RECIPE_MODEL_CONFIG.model,
      systemVersion: 'recipe-v8-resilient-hard-constraints',
      promptVersion: RECIPE_PROMPT_VERSION
    };
    return {
      ...normalized,
      requestedServings: Number(input.servings || 1),
      inventoryFeasibility: servingFeasibility,
      inventoryWarnings: feasibilityWarnings(servingFeasibility, outputEnglish),
      freshnessNotes: freshnessNotesForRecipe(normalized, inventory, now, outputEnglish),
      safetyAlerts: expiredAlerts(expiredInventory, outputEnglish)
    };
  });
}

export function validateGeneratedRecipes(recipes, { hardConstraints, spicyRequired, inventory = [], input = {}, servingFeasibility = { sufficient: true }, expiredInventory = [], priorityUseSoon = [], now = new Date() }) {
  const errors = recipes.flatMap((recipe, index) => validateRecipe(recipe, inventory, hardConstraints, { now, maxPrepMinutes: input.prepTime })
    .filter((error) => !(error.endsWith('库存不足') && !servingFeasibility.sufficient && (recipe.inventoryWarnings || []).length))
    .map((error) => `recipe[${index}]: ${error}`));
  if (recipes.length !== 4) errors.push('Model returned an incomplete four-recipe set');
  if (new Set(recipes.map((recipe) => recipe.recipeName)).size !== recipes.length) errors.push('Model returned duplicate recipes');
  if (recipes.some((recipe) => recipe.coreIngredientCount > 3)) errors.push('Model exceeded the three-core-ingredient limit');
  if (spicyRequired && recipes.some((recipe) => !hasChili(recipe))) errors.push('Model did not honor the chili requirement');
  if (!servingFeasibility.sufficient && recipes.some((recipe) => !(recipe.inventoryWarnings || []).length)) errors.push('Recipe set did not disclose the inventory-to-serving shortage');
  if (expiredInventory.length && recipes.some((recipe) => !(recipe.safetyAlerts || []).length)) errors.push('Recipe set did not expose the expired-item warning');
  for (const item of priorityUseSoon) {
    const used = recipes.some((recipe) => (recipe.ingredients || []).some((ingredient) => ingredient.canonicalName === item.canonicalName));
    if (!used) errors.push(`Recipe set did not use or explain the compatible use-soon item: ${item.name}`);
  }
  return errors;
}

export async function runRecipePlanner(body = {}, { callModel = callDeepSeek, retrieveWeb = retrieveXiachufangCandidates, maxAttempts = 3, now = new Date() } = {}) {
  const { input = {}, inventory = [], profile = {}, history = [] } = body;
  const cookingInventory = recipeSelectableInventory(inventory, now).filter((item) => {
    if (!isIngredientCompatibleWithProfile(item, profile)) return false;
    return !(Number(input.prepTime) <= 15 && item.storageLocation === '冷冻' && item.uiCategory === 'protein');
  });
  const selected = cookingInventory.filter((item) => (input.selectedIngredientIds || []).includes(item.id));
  const condiments = inventory.filter((item) => item.uiCategory === 'condiment');
  const carb = inventory.find((item) => item.id === input.carbId && item.uiCategory === 'staple') || null;
  const retrievedContext = retrieveRecipeContext({ input, inventory: cookingInventory, profile });
  const webCandidates = await retrieveWeb(xiachufangQueries(selected, cookingInventory));
  const expiredInventory = inventory.filter((item) => item.expiryDate && daysUntil(item.expiryDate, now) < 0);
  const priorityUseSoon = selected.filter((item) => item.expiryDate && daysUntil(item.expiryDate, now) >= 0 && daysUntil(item.expiryDate, now) <= 3);
  const servingFeasibility = assessInventoryServingFeasibility(inventory, input.servings, { carbId: input.carbId, profile, now });
  const attempts = [];
  let previousValidationErrors = [];

  for (let attemptNumber = 1; attemptNumber <= Math.max(1, maxAttempts); attemptNumber += 1) {
    const prompt = buildRecipePrompt({ input, profile, history, cookingInventory, selected, condiments, carb, retrievedContext, webCandidates, servingFeasibility, expiredInventory, now, previousValidationErrors });
    const modelTrace = {};
    const startedAt = Date.now();
    let rawResult;
    try {
      rawResult = await callModel({ model: RECIPE_MODEL_CONFIG.model, messages: prompt.messages, maxTokens: RECIPE_MODEL_CONFIG.maxOutputTokens, temperature: RECIPE_MODEL_CONFIG.temperature, timeoutMs: RECIPE_MODEL_CONFIG.timeoutMs, trace: modelTrace });
    } catch (error) {
      attempts.push({ attempt: attemptNumber, prompt: prompt.messages, model: { ...RECIPE_MODEL_CONFIG }, rawModelOutput: modelTrace.rawResponse || null, parsedModelOutput: modelTrace.parsedResponse || null, validatorPass: false, validatorErrors: [], executionTimeMs: Date.now() - startedAt, error: { name: error.name, code: error.code || null, message: error.message } });
      if (attemptNumber < Math.max(1, maxAttempts) && (error.transient || ['MODEL_INVALID_JSON', 'MODEL_EMPTY_RESPONSE'].includes(error.code))) continue;
      error.attempts = attempts;
      error.context = { retrievedContext, webCandidates };
      throw error;
    }
    const timestamp = Date.now();
    const recipes = normalizeGeneratedRecipes({ result: rawResult, retrievedContext, webCandidates, spicyRequired: prompt.spicyRequired, outputEnglish: prompt.outputEnglish, input, inventory, servingFeasibility, expiredInventory, now, timestamp });
    const validatorErrors = validateGeneratedRecipes(recipes, { ...prompt, inventory, input, servingFeasibility, expiredInventory, priorityUseSoon, now });
    attempts.push({ attempt: attemptNumber, prompt: prompt.messages, model: { ...RECIPE_MODEL_CONFIG }, rawModelOutput: modelTrace.rawResponse || JSON.stringify(rawResult), parsedModelOutput: rawResult, normalizedOutput: recipes, usage: modelTrace.usage || null, responseModel: modelTrace.responseModel || null, validatorPass: validatorErrors.length === 0, validatorErrors, executionTimeMs: Date.now() - startedAt, error: null });
    if (!validatorErrors.length) {
      return { recipes, retrievalContext: retrievedContext, webRetrieval: { source: 'xiachufang.com', candidateCount: webCandidates.length, candidates: webCandidates }, generatedAt: new Date(timestamp).toISOString(), evaluationTrace: { attempts, regenerationCount: attemptNumber - 1 } };
    }
    previousValidationErrors = validatorErrors;
  }
  throw new RecipeValidationError('生成内容未通过 production validator', { attempts, context: { retrievedContext, webCandidates } });
}

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' });
  try {
    const body = parseRequestBody(request);
    if (body.action === 'translate') return response.status(200).json({ recipes: await translateRecipeTexts(body) });
    const { evaluationTrace, webRetrieval, ...result } = await runRecipePlanner(body);
    return response.status(200).json({ ...result, webRetrieval: { source: webRetrieval.source, candidateCount: webRetrieval.candidateCount } });
  } catch (error) {
    return sendError(response, error);
  }
}
