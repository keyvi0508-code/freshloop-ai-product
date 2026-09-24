// Visual families only: sharing an icon must never share storage dates, allergy
// rules or ingredient identity. English aliases use whole words, not substrings.
const ICON_FAMILIES = [
  ['🦀', '螃蟹|大闸蟹|梭子蟹|青蟹|花蟹|蟹肉|crab|crabs'],
  ['🦞', '龙虾|小龙虾|lobster|lobsters|crayfish|crawfish'],
  ['🦐', '虾|鲜虾|明虾|虾仁|虾米|海虾|基围虾|shrimp|shrimps|prawn|prawns'],
  ['🦑', '鱿鱼|墨鱼|乌贼|squid|cuttlefish|calamari'],
  ['🐙', '章鱼|八爪鱼|octopus'],
  ['🦪', '生蚝|牡蛎|蛤蜊|花蛤|扇贝|青口|贻贝|oyster|oysters|clam|clams|scallop|scallops|mussel|mussels'],
  ['🐟', '鱼|鱼肉|鱼片|三文鱼|鲑鱼|鳕鱼|鲈鱼|金枪鱼|fish|salmon|cod|tuna|tilapia|seabass|sea bass'],
  ['🌶️', '辣椒|干辣椒|小米辣|朝天椒|泡椒|尖椒|chili|chilies|chilli|chillies|chilli pepper|chili pepper|cayenne|jalapeno|jalapeño'],
  ['🫑', '彩椒|甜椒|灯笼椒|bell pepper|bell peppers|capsicum'],
  ['🥬', '菜心|通心菜|空心菜|蕹菜|油麦菜|小白菜|大白菜|青菜|上海青|生菜|芥蓝|芥兰|羽衣甘蓝|娃娃菜|包菜|卷心菜|lettuce|cabbage|bok choy|pak choi|pak choy|choy sum|choi sum|water spinach|kangkong|kang kong|gai lan|kailan|kale|leafy greens'],
  ['🌿', '欧芹|香菜|芫荽|九层塔|罗勒|薄荷|迷迭香|小葱|青葱|韭菜|parsley|coriander|cilantro|basil|mint|rosemary|scallion|scallions|spring onion|spring onions|green onion|green onions|chives'],
  ['🍜', '米粉|米线|河粉|粉丝|通心粉|乌冬|拉面|rice noodles|rice noodle|vermicelli|udon|ramen|pasta|spaghetti|macaroni|noodles'],
  ['🫙', '蚝油|耗油|虾酱|蟹酱|鱼露|辣椒酱|番茄酱|蒜蓉酱|豆瓣酱|米醋|陈醋|白醋|香醋|黑醋|果醋|醋|oyster sauce|fish sauce|shrimp paste|chili sauce|chilli sauce|chili paste|chilli paste|tomato sauce|tomato paste|vinegar|ketchup'],
  ['🫒', '辣椒油|芝麻油|香油|葱油|椰子油|chili oil|chilli oil|sesame oil|coconut oil'],
  ['🧂', '胡椒|胡椒粉|花椒|盐|食盐|black pepper|white pepper|sichuan pepper|salt'],
  ['🍗', '鸡翅|鸡腿|鸭肉|鸭腿|禽肉|chicken wing|chicken wings|chicken thigh|chicken thighs|chicken leg|chicken legs|chicken|duck|turkey|poultry'],
  ['🥩', '猪肉|羊肉|排骨|里脊|pork|lamb|mutton|steak|ribs|meat'],
  ['🧅', '洋葱|红葱头|onion|onions|shallot|shallots'],
  ['🧄', '蒜|大蒜|蒜末|蒜蓉|garlic'],
  ['🫚', '姜|生姜|ginger'],
  ['🥒', '黄瓜|青瓜|西葫芦|cucumber|cucumbers|zucchini|courgette'],
  ['🥔', '土豆|马铃薯|potato|potatoes'],
  ['🍠', '芋头|taro|yam|yams'],
  ['🌽', '玉米|corn|sweetcorn'],
  ['🍄', '蘑菇|香菇|口蘑|菌菇|金针菇|杏鲍菇|木耳|mushroom|mushrooms|shiitake|enoki|wood ear'],
  ['🍆', '茄子|eggplant|eggplants|aubergine'],
  ['🥕', '胡萝卜|红萝卜|carrot|carrots'],
  ['🥦', '菜花|cauliflower'],
  ['🍞', '面包|吐司|bread|toast'],
  ['🫘', '红豆|绿豆|黄豆|黑豆|鹰嘴豆|芸豆|毛豆|beans|lentils|chickpeas|edamame'],
  ['🍋', '柠檬|青柠|lemon|lemons|lime|limes'],
  ['🍊', '橙子|橘子|柑橘|orange|oranges|mandarin|tangerine'],
  ['🍐', '雪梨|香梨|pear|pears'],
  ['🍑', '桃子|水蜜桃|peach|peaches'],
  ['🍓', '草莓|strawberry|strawberries'],
  ['🫐', '蓝莓|blueberry|blueberries'],
  ['🍇', '葡萄|grape|grapes'],
  ['🥭', '芒果|mango|mangoes'],
  ['🍍', '菠萝|凤梨|pineapple'],
  ['🥑', '牛油果|鳄梨|avocado|avocados'],
  ['🥝', '猕猴桃|奇异果|kiwi|kiwifruit']
];

const normalize = (value) => String(value ?? '').normalize('NFKC').toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
const plural = (value) => {
  if (/(?:tomato|potato|mango)$/.test(value)) return `${value}es`;
  if (/(?:s|x|ch|sh)$/.test(value)) return `${value}es`;
  if (/[^aeiou]y$/.test(value)) return `${value.slice(0, -1)}ies`;
  return `${value}s`;
};
const familyAliases = ICON_FAMILIES.flatMap(([icon, aliases]) => aliases.split('|').map((alias) => ({ alias: normalize(alias), icon })));
const matchesPhrase = (name, alias) => /[\u3400-\u9fff]/.test(alias)
  ? alias.length >= 2 && name.includes(alias)
  : ` ${name.replace(/[^a-z0-9\u00c0-\u024f]+/g, ' ')} `.includes(` ${alias} `);

export function matchIngredientIcon(rawName, knowledge = []) {
  const name = normalize(rawName);
  if (!name) return null;
  const aliases = [...familyAliases, ...knowledge.flatMap((item) => [...item.keys, item.canonicalName, plural(item.canonicalName)]
    .map((alias) => ({ alias: normalize(alias), icon: item.icon })))];
  const exact = aliases.find((item) => item.alias === name);
  if (exact) return exact.icon;
  // Prepared condiments retain their own identity rather than a raw ingredient's.
  if (/(?:酱|醋|汁)$/.test(name) || /\b(?:sauce|paste|vinegar)$/.test(name)) return '🫙';
  if (/油$/.test(name) || /\boil$/.test(name)) return '🫒';
  const nearest = aliases.filter((item) => matchesPhrase(name, item.alias))
    .sort((a, b) => b.alias.length - a.alias.length)[0];
  if (nearest) return nearest.icon;
  // Narrow visual families for varieties not explicitly listed above.
  if (/蟹/.test(name)) return '🦀';
  if (/虾/.test(name)) return '🦐';
  if (/鱼/.test(name)) return '🐟';
  if (/贝/.test(name)) return '🦪';
  if (/菇|菌/.test(name)) return '🍄';
  return null;
}
