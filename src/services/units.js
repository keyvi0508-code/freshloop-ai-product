// Persist stable units independently of the interface language. No amount conversion.
const ALIASES = new Map([
  ['clove', '瓣'], ['cloves', '瓣'],
  ['bun', '把'], ['bunch', '把'], ['bunches', '把'], ['pc', '个'], ['pcs', '个'], ['piece', '个'], ['pieces', '个'],
  ['pack', '包'], ['packs', '包'], ['package', '包'], ['bag', '袋'], ['bags', '袋'],
  ['bottle', '瓶'], ['bottles', '瓶'], ['box', '盒'], ['boxes', '盒'], ['carton', '盒'],
  ['g', '克'], ['gram', '克'], ['grams', '克'], ['kg', '千克'], ['kilogram', '千克'], ['kilograms', '千克'], ['公斤', '千克'],
  ['ml', '毫升'], ['milliliter', '毫升'], ['milliliters', '毫升'], ['l', '升'], ['liter', '升'], ['litre', '升'],
  ['stalk', '根'], ['stalks', '根'], ['serving', '份'], ['servings', '份'], ['cup', '杯'], ['cups', '杯'],
  ['tsp', '茶匙'], ['teaspoon', '茶匙'], ['teaspoons', '茶匙'], ['tbsp', '汤匙'], ['tablespoon', '汤匙'], ['tablespoons', '汤匙']
]);

export function canonicalUnit(value = '') {
  const text = String(value).trim();
  return ALIASES.get(text.toLowerCase()) || text;
}
