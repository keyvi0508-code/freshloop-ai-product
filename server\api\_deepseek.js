export function parseRequestBody(request) {
  if (request.body && typeof request.body === 'object') return request.body;
  if (typeof request.body === 'string') return JSON.parse(request.body);
  return {};
}

export function parseModelJson(text = '') {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return JSON.parse(cleaned);
}

export const DEEPSEEK_PROVIDER = 'DeepSeek';
export const DEEPSEEK_STRUCTURED_OUTPUT = Object.freeze({
  thinking: { type: 'disabled' },
  responseFormat: { type: 'json_object' },
  stream: false
});

export class ModelServiceError extends Error {
  constructor(message, { code = 'MODEL_SERVICE_ERROR', status = null, transient = false, cause } = {}) {
    super(message, { cause });
    this.name = 'ModelServiceError';
    this.code = code;
    this.status = status;
    this.transient = transient;
  }
}

export async function callDeepSeek({ model = 'deepseek-v4-flash', messages, maxTokens = 5000, temperature = 0.45, timeoutMs = 55000, trace = null }) {
  if (!process.env.DEEPSEEK_API_KEY) throw new ModelServiceError('DEEPSEEK_API_KEY is not configured', { code: 'MODEL_CONFIGURATION_ERROR' });
  const settings = {
    temperature,
    maxOutputTokens: maxTokens,
    thinking: DEEPSEEK_STRUCTURED_OUTPUT.thinking,
    responseFormat: DEEPSEEK_STRUCTURED_OUTPUT.responseFormat,
    stream: DEEPSEEK_STRUCTURED_OUTPUT.stream,
    timeoutMs
  };
  if (trace) Object.assign(trace, { provider: DEEPSEEK_PROVIDER, model, settings, messages });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages,
        thinking: DEEPSEEK_STRUCTURED_OUTPUT.thinking,
        response_format: DEEPSEEK_STRUCTURED_OUTPUT.responseFormat,
        temperature,
        max_tokens: maxTokens,
        stream: DEEPSEEK_STRUCTURED_OUTPUT.stream
      })
    });
  } catch (error) {
    clearTimeout(timeout);
    if (trace) trace.error = { name: error?.name || 'Error', message: error?.message || String(error) };
    if (error?.name === 'AbortError') throw new ModelServiceError(`DeepSeek 生成超过 ${Math.round(timeoutMs / 1000)} 秒，已停止本次请求，请重试`, { code: 'MODEL_TIMEOUT', transient: true, cause: error });
    throw new ModelServiceError(`DeepSeek 网络请求失败：${error?.message || 'unknown error'}`, { code: 'MODEL_NETWORK_ERROR', transient: true, cause: error });
  }
  if (trace) trace.httpStatus = response.status;
  if (!response.ok) {
    clearTimeout(timeout);
    if (response.status === 401) throw new ModelServiceError('DeepSeek API 密钥无效或已失效，请更新 .env.local 后重启本地服务', { code: 'MODEL_AUTH_ERROR', status: 401 });
    if (response.status === 402) throw new ModelServiceError('DeepSeek 账户余额不足，请充值后重试', { code: 'MODEL_BILLING_ERROR', status: 402 });
    if (response.status === 429) throw new ModelServiceError('DeepSeek 请求过于频繁，请稍后再试', { code: 'MODEL_RATE_LIMIT', status: 429, transient: true });
    if (response.status >= 500) throw new ModelServiceError('DeepSeek 服务暂时繁忙，请稍后重试', { code: 'MODEL_UPSTREAM_ERROR', status: response.status, transient: true });
    throw new ModelServiceError(`DeepSeek 请求失败（${response.status}）`, { code: 'MODEL_HTTP_ERROR', status: response.status });
  }
  let body;
  try {
    body = await response.json();
  } catch (error) {
    if (trace) trace.error = { name: error?.name || 'Error', message: error?.message || String(error) };
    if (controller.signal.aborted || error?.name === 'AbortError') throw new ModelServiceError(`DeepSeek 生成超过 ${Math.round(timeoutMs / 1000)} 秒，已停止本次请求，请重试`, { code: 'MODEL_TIMEOUT', transient: true, cause: error });
    throw new ModelServiceError(`DeepSeek 响应读取失败：${error?.message || 'unknown error'}`, { code: 'MODEL_NETWORK_ERROR', transient: true, cause: error });
  } finally {
    clearTimeout(timeout);
  }
  const content = body.choices?.[0]?.message?.content;
  if (trace) {
    trace.rawResponse = content || '';
    trace.usage = body.usage || null;
    trace.responseModel = body.model || null;
  }
  if (!content) throw new ModelServiceError('DeepSeek returned an empty response', { code: 'MODEL_EMPTY_RESPONSE' });
  try {
    const parsed = parseModelJson(content);
    if (trace) trace.parsedResponse = parsed;
    return parsed;
  } catch (error) {
    if (trace) trace.parseError = error.message;
    throw new ModelServiceError('DeepSeek returned invalid structured JSON', { code: 'MODEL_INVALID_JSON', cause: error });
  }
}

export function sendError(response, error) {
  const status = /not configured/.test(error.message) ? 503 : 502;
  return response.status(status).json({ error: error.message });
}
