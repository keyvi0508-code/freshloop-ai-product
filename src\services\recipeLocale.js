// Translate presentation fields only. IDs, quantities, units, canonical names and
// source images never come back from the translation model and cannot be replaced.
export function recipeTextEntries(recipe) {
  const entries = [];
  const add = (path, text) => { if (typeof text === 'string' && text.trim()) entries.push({ path, text }); };
  for (const key of ['recipeName', 'reason', 'planLabel']) add([key], recipe[key]);
  for (const key of ['prep', 'steps', 'tips']) (recipe[key] || []).forEach((text, index) => add([key, index], text));
  (recipe.ingredients || []).forEach((item, index) => add(['ingredients', index, 'name'], item.name));
  return entries;
}

export function recipeLocaleKey(recipe, language) { return `${language}:${recipe.id}`; }
export function recipeTextSignature(recipe) { return JSON.stringify(recipeTextEntries(recipe)); }

export function needsRecipeTranslation(recipe, language) {
  const entries = recipeTextEntries(recipe);
  if (language === 'en') return entries.some(({ text }) => /[\u3400-\u9fff]/.test(text));
  return recipe.language === 'en' || !/[\u3400-\u9fff]/.test(recipe.recipeName || '');
}

export function validTranslatedTexts(source, translated, language) {
  if (!Array.isArray(translated) || translated.length !== source.length) return false;
  return translated.every((text, index) => {
    if (typeof text !== 'string' || !text.trim() || text.length > 6000) return false;
    if (language === 'en' && /[\u3400-\u9fff]/.test(text)) return false;
    if (language !== 'en' && /[\u3400-\u9fff]/.test(source[index]) && !/[\u3400-\u9fff]/.test(text)) return false;
    // Protect times, temperatures and measurements embedded in cooking prose too.
    const numbers = (value) => value.match(/\d+(?:\.\d+)?/g) || [];
    const remaining = numbers(text);
    for (const number of numbers(source[index])) {
      const at = remaining.indexOf(number);
      if (at < 0) return false;
      remaining.splice(at, 1);
    }
    // Chinese cooking prose may express percentages as 七成 (70%). Allow
    // only this explicit equivalent; arbitrary added temperatures/times fail.
    const chineseDigits = '零一二三四五六七八九十';
    const equivalents = [...source[index].matchAll(/([一二三四五六七八九十])成/g)].map((match) => String(chineseDigits.indexOf(match[1]) * 10));
    return remaining.every((number) => {
      const at = equivalents.indexOf(number);
      if (at < 0) return false;
      equivalents.splice(at, 1);
      return true;
    });
  });
}

export function cachedRecipeTranslation(recipe, language, cache = {}) {
  const entry = cache[recipeLocaleKey(recipe, language)];
  const texts = recipeTextEntries(recipe).map((item) => item.text);
  return entry?.source === recipeTextSignature(recipe) && validTranslatedTexts(texts, entry.texts, language) ? entry : null;
}

export function recipeForLanguage(recipe, language, cache = {}) {
  if (!recipe) return recipe;
  const entry = cachedRecipeTranslation(recipe, language, cache);
  if (!entry) return recipe;
  const copy = JSON.parse(JSON.stringify(recipe));
  recipeTextEntries(recipe).forEach(({ path }, index) => {
    let target = copy;
    for (const key of path.slice(0, -1)) target = target[key];
    target[path.at(-1)] = entry.texts[index];
  });
  return copy;
}
