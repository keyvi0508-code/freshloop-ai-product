import { parseRequestBody } from './_deepseek.js';

const IMAGE_STOP_INGREDIENTS = new Set(['soy sauce', 'cooking oil', 'oil', 'salt', 'sugar', 'water', 'garlic', 'ginger', 'scallion', 'vinegar', 'cornstarch', 'black pepper', 'white pepper']);
const SEARCH_STOP_WORDS = new Set(['food', 'dish', 'recipe', 'with', 'and', 'style', 'breast', 'sauce', 'soy', 'stir', 'fried', 'fry']);

function cleanText(value = '') {
  return String(value).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function uniqueQueries(query, ingredients = []) {
  const clean = (value) => String(value || '').replace(/[^a-zA-Z0-9' -]/g, ' ').replace(/\s+/g, ' ').trim();
  const canonical = ingredients.map(clean).filter((value) => value && !IMAGE_STOP_INGREDIENTS.has(value.toLowerCase()));
  return [...new Set([
    clean(query),
    canonical.slice(0, 3).join(' '),
    canonical.slice(0, 2).join(' ')
  ].filter(Boolean))].slice(0, 3);
}

function relevance(query, text = '') {
  const haystack = String(text).toLowerCase();
  const terms = [...new Set(String(query).toLowerCase().match(/[a-z0-9']+/g) || [])].filter((term) => term.length > 2 && !SEARCH_STOP_WORDS.has(term));
  if (!terms.length) return { matches: 0, required: 0 };
  const matches = terms.filter((term) => haystack.includes(term)).length;
  const required = terms.length <= 2 ? terms.length : Math.ceil(terms.length * 0.75);
  return { matches, required };
}

function safeHttpUrl(value = '') {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
}

async function searchOpenverse(query) {
  const params = new URLSearchParams({ q: query, page_size: '10', mature: 'false' });
  const upstream = await fetch(`https://api.openverse.org/v1/images/?${params}`, {
    headers: { 'User-Agent': 'FreshLoop/0.1 local-food-inventory-app' }
  });
  if (!upstream.ok) return null;
  const body = await upstream.json();
  const ranked = (body.results || []).map((item) => {
    const searchable = `${item.title || ''} ${(item.tags || []).map((tag) => tag.name || '').join(' ')}`;
    return { item, ...relevance(query, searchable) };
  }).filter(({ item, matches, required }) => safeHttpUrl(item.url || item.thumbnail) && matches >= required)
    .sort((a, b) => b.matches - a.matches);
  const result = ranked[0]?.item;
  if (!result) return null;
  const license = [String(result.license || '').toUpperCase(), result.license_version].filter(Boolean).join(' ');
  return {
    url: safeHttpUrl(result.url) || safeHttpUrl(result.thumbnail),
    sourceUrl: safeHttpUrl(result.foreign_landing_url) || safeHttpUrl(result.detail_url),
    title: cleanText(result.title || '开放授权菜品图片'),
    artist: cleanText(result.creator || '').slice(0, 120),
    license: license || 'Openverse 开放授权',
    provider: cleanText(result.provider || result.source || 'Openverse')
  };
}

async function searchCommons(query) {
  const params = new URLSearchParams({
    action: 'query', format: 'json', generator: 'search',
    gsrsearch: `${query} food`, gsrnamespace: '6', gsrlimit: '10',
    prop: 'imageinfo', iiprop: 'url|mime|extmetadata', iiurlwidth: '1200'
  });
  const upstream = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
    headers: { 'User-Agent': 'FreshLoop/0.1 local-food-inventory-app' }
  });
  if (!upstream.ok) {
    const detail = await upstream.text();
    throw new Error(`开放图库响应 ${upstream.status}：${cleanText(detail).slice(0, 180)}`);
  }
  const body = await upstream.json();
  const pages = Object.values(body.query?.pages || {}).map((item) => ({ item, ...relevance(query, item.title || '') }))
    .filter(({ matches, required }) => matches >= required)
    .sort((a, b) => b.matches - a.matches || (a.item.index || 99) - (b.item.index || 99));
  return pages.map(({ item }) => item).find((item) => {
    const info = item.imageinfo?.[0];
    const url = info?.thumburl || info?.url || '';
    return /^https:\/\/upload\.wikimedia\.org\//.test(url) && /^image\/(jpeg|png|webp)$/i.test(info?.mime || '');
  }) || null;
}

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' });
  try {
    const { query = '', ingredients = [] } = parseRequestBody(request);
    const queries = uniqueQueries(query, Array.isArray(ingredients) ? ingredients : []);
    if (!queries.length) return response.status(400).json({ error: '缺少菜品图片搜索词' });
    let page = null;
    let matchedQuery = '';
    for (const candidate of queries) {
      const openverseImage = await searchOpenverse(candidate);
      if (openverseImage) return response.status(200).json({ image: { ...openverseImage, matchedQuery: candidate, policyVersion: 'openverse-relevance-v1' } });
      page = await searchCommons(candidate);
      if (page) { matchedQuery = candidate; break; }
    }
    if (!page) return response.status(404).json({ image: null });
    const info = page.imageinfo[0];
    const metadata = info.extmetadata || {};
    return response.status(200).json({ image: {
      url: info.thumburl || info.url,
      sourceUrl: info.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title)}`,
      title: cleanText(page.title).replace(/^File:/, ''),
      artist: cleanText(metadata.Artist?.value).slice(0, 120),
      license: cleanText(metadata.LicenseShortName?.value) || 'Wikimedia Commons',
      matchedQuery,
      policyVersion: 'openverse-relevance-v1'
    } });
  } catch (error) {
    return response.status(502).json({ error: error.message || '图片检索失败' });
  }
}
