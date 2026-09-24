import { callDeepSeek, DEEPSEEK_PROVIDER, DEEPSEEK_STRUCTURED_OUTPUT, parseRequestBody, sendError } from './_deepseek.js';
import { normalizeVisionCandidates } from '../../src/services/visionCandidates.js';

export const INGREDIENT_PROMPT_VERSION = 'capture-v8-uncertain-date-evidence';
export const INGREDIENT_MODEL_CONFIG = Object.freeze({
  provider: DEEPSEEK_PROVIDER,
  model: 'deepseek-v4-flash-vision-exp',
  temperature: 0.45,
  maxOutputTokens: 6500,
  structuredOutput: DEEPSEEK_STRUCTURED_OUTPUT,
  timeoutMs: 55000
});

export function buildIngredientPrompt({ source = 'photo', image, text = '', interfaceLanguage = 'zh-CN' }) {
  const manual = source === 'manual';
  return [
    {
      role: 'system',
      content: `你是严格的食材信息抽取器，只输出 JSON。所有候选必须直接由用户输入中可见或明确写出的内容支持；禁止补全“常见搭配”，禁止凭空添加。输出 {"candidates": Candidate[]}，candidates 与 storageOptions 都必须是 JSON 数组。Candidate 必须包含 name, normalizedName, category, uiCategory(protein|produce|staple|condiment|other), suggestedManagementMode(tracked_quantity|freshness_only|approximate_stock), quantity, unit, packageState(opened|sealed|unknown), observedStorageLocation, storageLocation, storageOptions, expiryRequired, confidence(0到1), identificationConfidence(0到1), dateConfidence(0到1或null), needsUserReview, visualEvidence, rawDateText, expiryDate(null或YYYY-MM-DD), alternativeNames。界面字段使用最简单通用名称，不保留品牌、产地、等级、认证或营销规格。normalizedName 使用稳定英文标准名。图片/小票中未出现的 quantity、unit、packageState、observedStorageLocation 和日期必须保持 null/unknown，不得把储存建议伪装成观察事实。storageOptions 是后续检索建议，可以输出冷藏、冷冻、常温三项，但 storageLocation 只有在输入明确给出时才填写，否则留空并 needsUserReview=true。模糊包装日期必须逐字符保存到 rawDateText：看不清的字符写 ?，不得猜成精确日期；只有完整可读且 dateConfidence>=0.8 才能填写 expiryDate。识别裸装叶菜时，若菠菜、生菜或其他叶菜无法由独特特征区分，name 使用“叶菜/Leafy greens”或给出 alternativeNames，specific-species confidence 不得超过0.75，并设置 needsUserReview=true。confidence 低于0.65的候选不要输出。不要输出 Markdown。`
    },
    {
      role: 'system',
      content: interfaceLanguage === 'en'
        ? 'The user selected English. Override the earlier Chinese-display-field rule: write name, category, unit and every user-facing note in concise plain English. Use only generic ingredient names without brands, origin, grade, certification, organic claims or pack-size marketing. Keep storageLocation as the stable Chinese enum required by the application schema, and keep normalizedName as stable English.'
        : '用户选择简体中文。所有面向用户的识别名称、分类、单位和说明必须使用最简单的中文短标签，不保留品牌与营销修饰。'
    },
    {
      role: 'user',
      content: manual
        ? `请从下面的用户文字中抽取食材确认清单。只提取明确写出的事实，缺失数量、单位、储存方式和日期必须保留未知，并要求 Human Review。\n用户文字：${text}`
        : [
          { type: 'text', text: `请识别这张${source === 'receipt' ? '购物小票' : source === 'package' ? '食品包装标签' : '食材合照'}并输出 JSON 确认清单。` },
          { type: 'image_url', image_url: { url: image, detail: 'original' } }
        ]
    }
  ];
}

export async function runInventoryIntelligence(body = {}, { callModel = callDeepSeek, maxAttempts = 3 } = {}) {
  const { source = 'photo', image, interfaceLanguage = 'zh-CN' } = body;
  const text = String(body.text || body.manualInput || body.manual_input || '').trim();
  const manual = source === 'manual';
  if ((!manual && (!image || !String(image).startsWith('data:image/'))) || (manual && !text)) {
    const error = new Error(manual ? 'Manual inventory text is required' : 'A base64 image data URL is required');
    error.code = 'INVALID_INPUT';
    throw error;
  }
  const messages = buildIngredientPrompt({ source, image, text, interfaceLanguage });
  const attempts = [];
  for (let attemptNumber = 1; attemptNumber <= Math.max(1, maxAttempts); attemptNumber += 1) {
    const modelTrace = {};
    const startedAt = Date.now();
    let result;
    try {
      result = await callModel({ model: INGREDIENT_MODEL_CONFIG.model, messages, maxTokens: INGREDIENT_MODEL_CONFIG.maxOutputTokens, temperature: INGREDIENT_MODEL_CONFIG.temperature, timeoutMs: INGREDIENT_MODEL_CONFIG.timeoutMs, trace: modelTrace });
    } catch (error) {
      attempts.push({ attempt: attemptNumber, prompt: messages, model: { ...INGREDIENT_MODEL_CONFIG }, rawModelOutput: modelTrace.rawResponse || null, parsedModelOutput: modelTrace.parsedResponse || null, parsedItems: [], executionTimeMs: Date.now() - startedAt, error: { name: error.name, code: error.code || null, message: error.message } });
      if (attemptNumber < Math.max(1, maxAttempts) && (error.transient || ['MODEL_INVALID_JSON', 'MODEL_EMPTY_RESPONSE'].includes(error.code))) continue;
      error.evaluationTrace = { prompt: messages, rawModelOutput: modelTrace.rawResponse || null, parsedModelOutput: modelTrace.parsedResponse || null, parsedItems: [], attempts };
      throw error;
    }
    const candidates = normalizeVisionCandidates(result.candidates, interfaceLanguage, { source, preserveUnknowns: manual }).filter((candidate) => {
      const confidence = Number(candidate.confidence);
      const hasGroundingEvidence = manual ? Boolean(text) : Boolean(candidate.visualEvidence);
      return candidate.name && candidate.normalizedName && hasGroundingEvidence && Number.isFinite(confidence) && confidence >= 0.65;
    });
    const attempt = { attempt: attemptNumber, prompt: messages, model: { ...INGREDIENT_MODEL_CONFIG }, rawModelOutput: modelTrace.rawResponse || JSON.stringify(result), parsedModelOutput: result, parsedItems: candidates, usage: modelTrace.usage || null, responseModel: modelTrace.responseModel || null, executionTimeMs: Date.now() - startedAt, error: candidates.length ? null : { code: 'MODEL_NO_CONFIDENT_ITEMS', message: 'No candidates met the production confidence threshold' } };
    attempts.push(attempt);
    if (candidates.length) {
      return {
        candidates,
        model: INGREDIENT_MODEL_CONFIG.model,
        promptVersion: INGREDIENT_PROMPT_VERSION,
        generatedAt: new Date().toISOString(),
        evaluationTrace: { prompt: messages, rawModelOutput: attempt.rawModelOutput, parsedModelOutput: result, parsedItems: candidates, usage: modelTrace.usage || null, responseModel: modelTrace.responseModel || null, attempts }
      };
    }
  }
  const error = new Error('视觉模型没有找到置信度足够高的食材；请上传更清晰、光线更均匀的图片');
  error.code = 'MODEL_NO_CONFIDENT_ITEMS';
  error.evaluationTrace = { prompt: messages, rawModelOutput: attempts.at(-1)?.rawModelOutput || null, parsedModelOutput: attempts.at(-1)?.parsedModelOutput || null, parsedItems: [], attempts };
  throw error;
}

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' });
  try {
    const { evaluationTrace, ...result } = await runInventoryIntelligence(parseRequestBody(request));
    return response.status(200).json(result);
  } catch (error) {
    if (error.code === 'INVALID_INPUT') return response.status(400).json({ error: error.message });
    if (error.code === 'MODEL_NO_CONFIDENT_ITEMS') return response.status(422).json({ error: error.message });
    return sendError(response, error);
  }
}
