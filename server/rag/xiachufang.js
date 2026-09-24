const CACHE_TTL_MS = 45 * 60 * 1000;
const searchCache = new Map();

function decodeHtml(value = '') {
  const named = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' };
  return String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => named[name.toLowerCase()] ?? match)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanTitle(value = '') {
  return decodeHtml(value)
    .replace(/^【[^】]{1,18}】\s*/, '')
    .replace(/^\s*(?:\d+[.、:：\-]\s*|第[一二三四五六七八九十\d]+道\s*)/, '')
    .trim()
    .slice(0, 80);
}

function safeImageUrl(value = '') {
  try {
    const url = new URL(decodeHtml(value));
    if (url.protocol !== 'https:' || !/\.chuimg\.com$/i.test(url.hostname)) return '';
    return `${url.origin}${url.pathname}?imageView2/2/w/1200/interlace/1/q/82`;
  } catch { return ''; }
}

function parseSearchPage(html, query) {
  return String(html).split('<div class="recipe recipe-215-horizontal').slice(1, 13).flatMap((block) => {
    const path = block.match(/<a\s+href="(\/recipe\/\d+\/)"/i)?.[1];
    const imageUrl = safeImageUrl(block.match(/data-src="([^"]+)"/i)?.[1]);
    const alt = block.match(/<img[^>]+alt="([^"]+)"/i)?.[1];
    const nameHtml = block.match(/<p\s+class="name">([\s\S]*?)<\/p>/i)?.[1];
    const title = cleanTitle(alt || nameHtml);
    const ingredientsHtml = block.match(/<p\s+class="ing[^">]*">([\s\S]*?)<\/p>/i)?.[1] || '';
    const ingredients = [...ingredientsHtml.matchAll(/<a[^>]*>([\s\S]*?)<\/a>/gi)].map((match) => decodeHtml(match[1])).filter(Boolean).slice(0, 10);
    const score = Number(block.match(/class="score bold green-font">([\d.]+)/i)?.[1] || 0);
    const cooks = Number(block.match(/class="bold score">(\d+)<\/span>\s*&nbsp;做过/i)?.[1] || 0);
    if (!path || !title || !imageUrl) return [];
    return [{
      id: `xcf-${path.match(/\d+/)?.[0]}`,
      title,
      ingredients,
      score,
      cooks,
      query,
      sourceUrl: `https://www.xiachufang.com${path}`,
      imageUrl,
      source: '下厨房公开菜谱索引'
    }];
  });
}

async function searchOnce(query, timeoutMs) {
  const normalized = String(query || '').replace(/\s+/g, ' ').trim().slice(0, 48);
  if (!normalized) return [];
  const cached = searchCache.get(normalized);
  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) return cached.items;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`https://www.xiachufang.com/search/?keyword=${encodeURIComponent(normalized)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FreshLoopRecipeResearch/0.1; +http://127.0.0.1)',
        Accept: 'text/html,application/xhtml+xml'
      },
      signal: controller.signal
    });
    if (!response.ok) return [];
    const items = parseSearchPage(await response.text(), normalized);
    searchCache.set(normalized, { createdAt: Date.now(), items });
    return items;
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

export async function retrieveXiachufangCandidates(queries = [], { limit = 8, timeoutMs = 5200 } = {}) {
  const unique = [...new Set(queries.map((query) => String(query || '').trim()).filter(Boolean))].slice(0, 2);
  if (!unique.length) return [];
  const groups = await Promise.all(unique.map((query) => searchOnce(query, timeoutMs)));
  const seen = new Set();
  return groups.flat().filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  }).sort((a, b) => b.score - a.score || b.cooks - a.cooks).slice(0, limit);
}
