import { matchIngredientIcon } from './ingredientIcons.js';

export const INGREDIENT_KNOWLEDGE_VERSION = 'ingredient-storage-knowledge-v1';

const SFA_STORAGE_SOURCE = {
  title: 'Singapore Food Agency · Food Safety Tips',
  url: 'https://www.sfa.gov.sg/food-safety-tips/safe-food-practices/food-safety-tips'
};

const SFA_LABEL_SOURCE = {
  title: 'Singapore Food Agency · Understanding Food Labels',
  url: 'https://www.sfa.gov.sg/food-safety-tips/food-risk-concerns/understanding-food-nutrition-labels-before-purchase'
};

const USDA_FREEZING_SOURCE = {
  title: 'USDA FSIS · Freezing and Food Safety',
  url: 'https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/freezing-and-food-safety'
};

const USDA_BEEF_SOURCE = {
  title: 'USDA FSIS · Beef from Farm to Table',
  url: 'https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/meat-catfish/beef-farm-table'
};

const USDA_GROUND_BEEF_SOURCE = {
  title: 'USDA FSIS · Ground Beef and Food Safety',
  url: 'https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/meat/ground-beef-and-food-safety'
};

const KIKKOMAN_SOY_SOURCE = {
  title: 'Kikkoman · Soy Sauce Storage After Opening',
  url: 'https://www.kikkoman.com/en/culture/soysaucemuseum/features/'
};

const KIKKOMAN_OYSTER_SOURCE = {
  title: 'Kikkoman · Oyster Sauce Storage After Opening',
  url: 'https://customer.kikkoman.co.jp/hc/ja/articles/57472936526873'
};

const LKK_OYSTER_SOURCE = {
  title: 'Lee Kum Kee · Sauce Storage FAQ',
  url: 'https://usa.lkk.com/faq'
};

const makeStorage = (location, days, available = true, note = '', meta = {}) => ({
  location,
  days,
  available,
  note,
  basis: meta.basis || (days ? 'FreshLoop 建议最佳品质期' : '按包装或实际状态判断'),
  source: meta.source || SFA_STORAGE_SOURCE,
  sourceRange: meta.sourceRange || '',
  preparation: meta.preparation || '',
  qualityOnly: Boolean(meta.qualityOnly),
  openedDays: Object.prototype.hasOwnProperty.call(meta, 'openedDays') ? meta.openedDays : days,
  openedAvailable: meta.openedAvailable ?? available,
  openedNote: meta.openedNote || note,
  sealedDays: Object.prototype.hasOwnProperty.call(meta, 'sealedDays') ? meta.sealedDays : days,
  sealedAvailable: meta.sealedAvailable ?? available,
  sealedNote: meta.sealedNote || note
});

export function applyPackageState(storage = [], packageState = 'opened') {
  const prefix = packageState === 'sealed' ? 'sealed' : 'opened';
  return storage.map((option) => ({
    ...option,
    days: option[`${prefix}Days`] ?? null,
    available: Boolean(option[`${prefix}Available`]),
    note: option[`${prefix}Note`] || option.note,
    packageState
  }));
}

export const INGREDIENT_KNOWLEDGE = [
  { keys: ['鸡蛋', '蛋'], canonicalName: 'egg', name: '鸡蛋', category: '蛋类', uiCategory: 'protein', icon: '🥚', unit: '个', quantity: 6, mode: 'tracked_quantity', requiresPackageDate: true, storage: [makeStorage('冷藏', 21, true, '以包装日期为准'), makeStorage('冷冻', null, false, '整颗带壳鸡蛋不建议冷冻'), makeStorage('常温', null, false, '新加坡气候下建议冷藏')], story: '一枚小小的圆，藏着早餐与家常菜的许多可能。', nature: '传统食养资料常记为性平', cooking: '近期可做番茄炒蛋、蒸蛋或溏心蛋。' },
  { keys: ['牛奶', '鲜奶'], canonicalName: 'milk', name: '牛奶', category: '乳制品', uiCategory: 'protein', icon: '🥛', unit: '盒', quantity: 1, mode: 'freshness_only', requiresPackageDate: true, storage: [makeStorage('冷藏', 5, true, '开封后按包装说明尽快饮用'), makeStorage('冷冻', null, false, '口感与质地可能明显变化'), makeStorage('常温', null, false, '鲜奶需冷藏；常温奶未开封例外')], story: '清晨的一杯白，是一天最轻柔的开场。', nature: '传统食养资料常记为性平', cooking: '可做奶香燕麦、炖蛋或白酱。' },
  { keys: ['酸奶', '优格'], canonicalName: 'yogurt', name: '酸奶', category: '乳制品', uiCategory: 'protein', icon: '🥣', unit: '杯', quantity: 1, mode: 'freshness_only', requiresPackageDate: true, storage: [makeStorage('冷藏', 7, true, '以包装日期与开封说明为准'), makeStorage('冷冻', null, false, '解冻后易分层'), makeStorage('常温', null, false, '需保持冷链')], story: '微酸的乳香，适合给忙碌日子留一点从容。', nature: '传统食养资料常记为性平', cooking: '可拌水果、做隔夜燕麦或酸奶酱。' },
  { keys: ['鸡胸肉', '鸡胸', '鸡肉'], canonicalName: 'chicken breast', name: '鸡胸肉', category: '肉类', uiCategory: 'protein', icon: '🍗', unit: '克', quantity: 200, mode: 'tracked_quantity', requiresPackageDate: true, storage: [makeStorage('冷藏', 2, true, '未开封包装日期优先；生鲜禽肉建议尽快烹调'), makeStorage('冷冻', 45, true, '去除多余空气、分成一餐份量密封；45 天是偏保守的风味建议，不是安全上限', { source: USDA_FREEZING_SOURCE, sourceRange: '禽肉分割件的官方冷冻品质参考可更长；本产品为家庭口感设更短建议期', qualityOnly: true, preparation: '生鲜、分装密封、−18°C 或以下' }), makeStorage('常温', null, false, '生鲜肉不可常温久放')], story: '清爽利落的肉香，最适合接住不同香料的性格。', nature: '传统食养资料常记为性温', cooking: '可做香煎鸡胸、咖喱鸡或手撕鸡。' },
  { keys: ['牛肉碎', '牛肉馅', '绞牛肉', 'minced beef', 'ground beef'], canonicalName: 'ground beef', name: '牛肉碎', category: '肉类', uiCategory: 'protein', icon: '🥩', unit: '克', quantity: 200, mode: 'tracked_quantity', requiresPackageDate: true, storage: [makeStorage('冷藏', 1, true, '肉碎表面积更大，建议优先按包装日期并在 1–2 天内使用', { source: USDA_GROUND_BEEF_SOURCE, sourceRange: '冷藏 1–2 天' }), makeStorage('冷冻', 30, true, '压薄、排气、按一餐份量密封；建议 30 天内吃完以保持较好色泽与风味', { source: USDA_GROUND_BEEF_SOURCE, sourceRange: '官方最佳品质参考约 3–4 个月；本产品默认提醒更保守', qualityOnly: true, preparation: '生鲜肉碎、密封、−18°C 或以下' }), makeStorage('常温', null, false, '生鲜肉不可常温久放')], story: '细碎的纹理更容易接住酱汁，也更需要把握新鲜。', nature: '传统食养资料常记为性平', cooking: '可做番茄牛肉碎、肉酱面或汉堡排。' },
  { keys: ['牛排', '牛肉块', '整块牛肉', '牛肉'], canonicalName: 'beef', name: '牛肉', category: '肉类', uiCategory: 'protein', icon: '🥩', unit: '克', quantity: 200, mode: 'tracked_quantity', requiresPackageDate: true, storage: [makeStorage('冷藏', 3, true, '整块牛肉与牛排建议按包装日期，并在 3–5 天内烹调', { source: USDA_BEEF_SOURCE, sourceRange: '冷藏 3–5 天' }), makeStorage('冷冻', 45, true, '吸干表面、排气密封并标记日期；45 天是 FreshLoop 偏保守的风味提醒', { source: USDA_BEEF_SOURCE, sourceRange: '牛排及整块牛肉官方最佳品质参考约 6–12 个月', qualityOnly: true, preparation: '整块生牛肉、密封、−18°C 或以下' }), makeStorage('常温', null, false, '生鲜肉不可常温久放')], story: '火候一到，肉香便有了沉稳而丰厚的底色。', nature: '传统食养资料常记为性平', cooking: '可做黑椒牛肉、番茄炖牛肉或牛肉炒饭。' },
  { keys: ['鱼', '三文鱼', '鲑鱼'], canonicalName: 'fish', name: '鱼', category: '海鲜', uiCategory: 'protein', icon: '🐟', unit: '克', quantity: 200, mode: 'tracked_quantity', requiresPackageDate: true, storage: [makeStorage('冷藏', 1, true, '海鲜建议尽快烹调'), makeStorage('冷冻', 30, true, '擦干分装并密封'), makeStorage('常温', null, false, '不可常温久放')], story: '水里的鲜味来到餐桌，总带着一点潮汐的气息。', nature: '不同鱼类传统属性不一', cooking: '可清蒸、香煎或做味噌汤。' },
  { keys: ['豆腐'], canonicalName: 'tofu', name: '豆腐', category: '豆制品', uiCategory: 'protein', icon: '◻️', unit: '盒', quantity: 1, mode: 'tracked_quantity', requiresPackageDate: true, storage: [makeStorage('冷藏', 3, true, '开封后换净水并尽快用完'), makeStorage('冷冻', 30, true, '会形成蜂窝口感'), makeStorage('常温', null, false, '鲜豆腐需冷藏')], story: '清白一方，最能把汤汁与香气慢慢收进心里。', nature: '传统食养资料常记为性凉', cooking: '可做麻婆豆腐、豆腐汤或香煎豆腐。' },
  { keys: ['菠菜'], canonicalName: 'spinach', name: '菠菜', category: '蔬菜', uiCategory: 'produce', icon: '🥬', unit: '克', quantity: 200, mode: 'tracked_quantity', storage: [makeStorage('冷藏', 3, true, '不预洗、吸湿包裹后冷藏'), makeStorage('冷冻', 30, true, '仅在焯水、冷却并挤干后启用；建议 30 天内用于熟食', { sourceRange: '处理方式会显著改变品质', qualityOnly: true, preparation: '焯水、冷却、挤干、密封' }), makeStorage('常温', 1, true, '当天食用')], story: '一把青叶，是餐桌上最轻盈的一笔春色。', nature: '传统食养资料常记为性凉', cooking: '近期可做蒜蓉菠菜、菠菜蛋汤或拌面。' },
  { keys: ['西兰花', '花椰菜'], canonicalName: 'broccoli', name: '西兰花', category: '蔬菜', uiCategory: 'produce', icon: '🥦', unit: '颗', quantity: 1, mode: 'tracked_quantity', storage: [makeStorage('冷藏', 5, true, '保持干燥并留出透气空间'), makeStorage('冷冻', 45, true, '仅在焯水、彻底冷却并沥干后启用', { sourceRange: '处理方式会显著改变品质', qualityOnly: true, preparation: '切小朵、焯水、冷却、沥干、密封' }), makeStorage('常温', 1, true, '尽量当天使用')], story: '细密的花球像一片微缩森林，脆嫩里藏着清甜。', nature: '传统食养资料常记为性平', cooking: '可清炒、焗烤或搭配鸡胸肉。' },
  { keys: ['番茄', '西红柿'], canonicalName: 'tomato', name: '番茄', category: '蔬菜', uiCategory: 'produce', icon: '🍅', unit: '个', quantity: 2, mode: 'tracked_quantity', storage: [makeStorage('冷藏', 5, true, '完全成熟后冷藏，食用前回温风味更好'), makeStorage('冷冻', 30, true, '切块或煮成酱后密封；解冻后只建议用于熟食', { sourceRange: '冷冻会破坏鲜食质地', qualityOnly: true, preparation: '切块或制酱、密封' }), makeStorage('常温', 3, true, '未熟时可常温放至转红')], story: '红得明亮，也酸甜得坦率，最会让一锅菜有生气。', nature: '传统食养资料常记为性微寒', cooking: '可做番茄炒蛋、番茄炖牛肉或意面酱。' },
  { keys: ['香蕉'], canonicalName: 'banana', name: '香蕉', category: '水果', uiCategory: 'produce', icon: '🍌', unit: '根', quantity: 4, mode: 'freshness_only', storage: [makeStorage('冷藏', 4, true, '成熟后冷藏，表皮变黑不等于果肉变坏'), makeStorage('冷冻', 30, true, '去皮切段，适合奶昔与烘焙'), makeStorage('常温', 3, true, '未熟时常温催熟')], story: '热带的甜意弯成一轮小月，熟得刚好时最温柔。', nature: '传统食养资料常记为性寒', cooking: '可做燕麦杯、奶昔或香蕉煎饼。' },
  { keys: ['苹果'], canonicalName: 'apple', name: '苹果', category: '水果', uiCategory: 'produce', icon: '🍎', unit: '个', quantity: 4, mode: 'freshness_only', storage: [makeStorage('冷藏', 21, true, '与叶菜分开放置'), makeStorage('冷冻', 90, true, '切片后更适合烘焙'), makeStorage('常温', 7, true, '避光通风')], story: '脆响的一口，像把清晨的风也咬进了果香里。', nature: '传统食养资料常记为性凉', cooking: '可鲜食、烤苹果或加入沙拉。' },
  { keys: ['面条', '挂面', '意面'], canonicalName: 'noodle', name: '面条', category: '主食', uiCategory: 'staple', icon: '🍜', unit: '包', quantity: 1, mode: 'approximate_stock', requiresPackageDate: true, packageStateRelevant: true, storage: [makeStorage('冷藏', null, false, '干面通常无需冷藏'), makeStorage('冷冻', null, false, '干面通常无需冷冻'), makeStorage('常温', 180, true, '开封后密封防潮并记录日期', { openedDays: 180, openedNote: '已开封：密封、防潮、避免虫害；包装说明优先', sealedDays: 365, sealedNote: '未开封：以包装最佳食用日期为准；一年仅作缺少包装日期时的提醒占位' })], story: '一缕一缕，最懂得把汤汁和家常的香气牵在一起。', nature: '传统食养资料常记为性平', cooking: '可做葱油拌面、汤面或番茄意面。' },
  { keys: ['大米', '米'], canonicalName: 'rice', name: '大米', category: '主食', uiCategory: 'staple', icon: '🍚', unit: '克', quantity: 1000, mode: 'approximate_stock', requiresPackageDate: true, packageStateRelevant: true, storage: [makeStorage('冷藏', null, false, '干米通常无需冷藏'), makeStorage('冷冻', null, false, '干米通常无需冷冻'), makeStorage('常温', 180, true, '开封后密封、防潮、避虫', { openedDays: 180, openedNote: '已开封：密封、防潮、避虫，并记录开封日', sealedDays: 365, sealedNote: '未开封：包装日期优先；一年仅作缺少包装日期时的提醒占位' })], story: '一粒米很小，却一直是许多家常味道的中心。', nature: '传统食养资料常记为性平', cooking: '可煮饭、煲粥或做炒饭。' },
  { keys: ['红薯', '番薯', '地瓜'], canonicalName: 'sweet potato', name: '红薯', category: '主食', uiCategory: 'staple', icon: '🍠', unit: '个', quantity: 2, mode: 'tracked_quantity', storage: [makeStorage('冷藏', null, false, '生红薯低温久放易影响品质'), makeStorage('冷冻', 60, true, '蒸熟后分装冷冻'), makeStorage('常温', 14, true, '阴凉、干燥、通风')], story: '土里的甜，经过火候后变得绵软而踏实。', nature: '传统食养资料常记为性平', cooking: '可烤、蒸或切块煮粥。' },
  { keys: ['蚝油', '耗油'], canonicalName: 'oyster sauce', name: '蚝油', category: '调味品', uiCategory: 'condiment', icon: '🫙', unit: '瓶', quantity: 1, mode: 'approximate_stock', requiresPackageDate: true, packageStateRelevant: true, storage: [makeStorage('冷藏', 30, true, '开封后冷藏；不同品牌标注差异较大，包装说明优先', { source: KIKKOMAN_OYSTER_SOURCE, sourceRange: '常见品牌开封冷藏建议约 1–6 个月；FreshLoop 默认采用保守的 30 天提醒', openedDays: 30, openedAvailable: true, openedNote: '已开封：约 4°C 冷藏并保持瓶口清洁；包装若写明更短期限，以包装为准', sealedDays: null, sealedAvailable: false, sealedNote: '未开封通常按包装要求常温储存，无需占用冷藏空间' }), makeStorage('冷冻', null, false, '不建议冷冻，质地可能改变且玻璃瓶可能破裂', { source: LKK_OYSTER_SOURCE }), makeStorage('常温', null, false, '开封后不使用常温期限', { source: LKK_OYSTER_SOURCE, openedDays: null, openedAvailable: false, openedNote: '已开封：常见品牌要求冷藏，不把常温与冷藏套成同一期限', sealedDays: 365, sealedAvailable: true, sealedNote: '未开封：可按包装条件常温保存；请优先录入瓶身最佳食用日期' })], story: '浓稠的一勺鲜香，最会把蔬菜和肉味轻轻拢在一起。', nature: '调味品不作寒热判断', cooking: '适合炒蔬菜、腌肉与调制芡汁。' },
  { keys: ['酱油', '生抽'], canonicalName: 'soy sauce', name: '酱油', category: '调味品', uiCategory: 'condiment', icon: '🫙', unit: '瓶', quantity: 1, mode: 'approximate_stock', requiresPackageDate: true, packageStateRelevant: true, storage: [makeStorage('冷藏', 90, true, '普通瓶开封后冷藏更利于保持色泽与风味', { source: KIKKOMAN_SOY_SOURCE, openedDays: 90, openedNote: '已开封普通瓶：建议冷藏并在 90 天内优先用完；包装说明优先', sealedDays: null, sealedAvailable: false, sealedNote: '未开封通常按包装要求常温储存' }), makeStorage('冷冻', null, false, '无需冷冻'), makeStorage('常温', 30, true, '普通瓶开封后仍优先冷藏；只有包装明确允许时才常温', { source: KIKKOMAN_SOY_SOURCE, openedDays: 30, openedAvailable: true, openedNote: '已开封普通瓶：常温仅作 30 天保守品质提醒；特殊密封瓶可按包装标注延长', sealedDays: 365, sealedAvailable: true, sealedNote: '未开封：按包装最佳食用日期；一年仅作缺少包装日期时的提醒占位' })], story: '一小勺酱香，常常就是家常菜的底色。', nature: '调味品不作寒热判断', cooking: '适合炒菜、腌肉与调制蘸汁。' },
  { keys: ['食用油', '橄榄油', '花生油'], canonicalName: 'cooking oil', name: '食用油', category: '调味品', uiCategory: 'condiment', icon: '🫒', unit: '瓶', quantity: 1, mode: 'approximate_stock', requiresPackageDate: true, packageStateRelevant: true, storage: [makeStorage('冷藏', null, false, '多数食用油无需冷藏'), makeStorage('冷冻', null, false, '无需冷冻'), makeStorage('常温', 120, true, '开封后密封、避光、远离炉火', { openedDays: 120, openedNote: '已开封：密封、避光、远离炉火，并留意哈喇味', sealedDays: 365, sealedNote: '未开封：包装日期优先；一年仅作缺少包装日期时的提醒占位' })], story: '看似安静的一滴油，会把香气从锅底慢慢托起来。', nature: '不同油脂传统属性不一', cooking: '按烟点选择凉拌、煎炒或烘焙。' },
  { keys: ['燕麦棒', '能量棒', '谷物棒'], canonicalName: 'granola bar', name: '燕麦棒', category: '其他食品', uiCategory: 'other', icon: '🌾', unit: '根', quantity: 4, mode: 'freshness_only', requiresPackageDate: true, storage: [makeStorage('冷藏', null, false, '通常无需冷藏'), makeStorage('冷冻', null, false, '通常无需冷冻'), makeStorage('常温', 90, true, '密封防潮，以包装日期为准')], story: '谷物压成轻巧的一块，把忙碌时刻稳稳接住。', nature: '加工食品不作寒热判断', cooking: '可直接食用，或切碎撒在酸奶上。' },
  { keys: ['小葱', '葱'], canonicalName: 'scallion', name: '小葱', category: '蔬菜', uiCategory: 'produce', icon: '🌿', unit: '把', quantity: 1, mode: 'tracked_quantity', storage: [makeStorage('冷藏', 7, true, '吸湿包裹后冷藏'), makeStorage('冷冻', 30, true, '切碎后冷冻作调味'), makeStorage('常温', 1, true, '尽量当天使用')], story: '一点翠绿落在热菜上，香气就有了醒目的句号。', nature: '传统食养资料常记为性温', cooking: '可做葱油、蛋饼或汤面点缀。' }
].map((item) => ({
  ...item,
  source: item.source || SFA_STORAGE_SOURCE,
  storage: item.storage.map((option) => ({ ...option, source: option.source || item.source || SFA_STORAGE_SOURCE }))
}));

const FALLBACKS = [
  { test: /菜|瓜|菇|椒|笋/, category: '蔬菜', uiCategory: 'produce', icon: '🥬', unit: '克', quantity: 200, mode: 'tracked_quantity', storage: [makeStorage('冷藏', 3, true, '仅作短期占位；需要具体品种才能给出更准确期限'), makeStorage('冷冻', null, false, '不同蔬菜对焯水、切分和冷冻的要求差异很大，请补充具体品种'), makeStorage('常温', 1, true, '仅作一般短期参考')] },
  { test: /果|梨|桃|莓|橙|柑|葡萄/, category: '水果', uiCategory: 'produce', icon: '🍎', unit: '个', quantity: 4, mode: 'freshness_only', storage: [makeStorage('冷藏', 5, true, '仅作成熟水果的短期占位；具体品种与成熟度优先'), makeStorage('冷冻', null, false, '需要具体品种与预处理方式，不能统一套用期限'), makeStorage('常温', 2, true, '未熟水果可短期常温，具体品种优先')] },
  { test: /肉|排|虾|蟹|贝/, category: '肉类与海鲜', uiCategory: 'protein', icon: '🥩', unit: '克', quantity: 200, mode: 'tracked_quantity', requiresPackageDate: true, storage: [makeStorage('冷藏', 1, true, '这是保守占位；请补充具体部位、是否绞碎和包装日期'), makeStorage('冷冻', null, false, '肉类与海鲜不能使用统一期限，请补充品种、形态和包装状态'), makeStorage('常温', null, false, '生鲜肉与海鲜不可常温久放')] },
  { test: /粉|面|米|麦|薯|馒头|面包/, category: '主食', uiCategory: 'staple', icon: '🌾', unit: '克', quantity: 200, mode: 'approximate_stock', requiresPackageDate: true, packageStateRelevant: true, storage: [makeStorage('冷藏', null, false, '视具体主食与包装说明'), makeStorage('冷冻', null, false, '视具体主食与包装说明'), makeStorage('常温', 60, true, '开封后密封防潮；具体品种和包装日期优先', { openedDays: 60, sealedDays: 180, sealedNote: '未开封：请优先录入包装最佳食用日期' })] },
  { test: /酱|油|盐|糖|醋|胡椒|香料/, category: '调味品', uiCategory: 'condiment', icon: '🧂', unit: '瓶', quantity: 1, mode: 'approximate_stock', requiresPackageDate: true, packageStateRelevant: true, storage: [makeStorage('冷藏', 90, true, '开封后视具体配方和包装说明', { openedDays: 90, sealedDays: null, sealedAvailable: false }), makeStorage('冷冻', null, false, '通常无需冷冻'), makeStorage('常温', 60, true, '避光密封；包装说明优先', { openedDays: 60, sealedDays: 365, sealedNote: '未开封：请优先录入包装最佳食用日期' })] }
];

function fallbackGuidance(rawName) {
  const found = FALLBACKS.find((item) => item.test.test(rawName)) || {
    category: '其他食品', uiCategory: 'other', icon: '🛍️', unit: '袋', quantity: 1, mode: 'freshness_only', requiresPackageDate: true,
    storage: [makeStorage('冷藏', null, false, '需要识别具体品类或查看包装说明'), makeStorage('冷冻', null, false, '资料不足，不自动推断可冷冻'), makeStorage('常温', null, false, '资料不足，请查看包装储存说明')]
  };
  return {
    ...found,
    name: rawName,
    canonicalName: rawName.toLowerCase(),
    story: '它从产地来到厨房，正等待你为它安排合适的一餐。',
    nature: '暂无可靠的传统食养归类',
    cooking: '可按食材状态与个人口味灵活安排。',
    source: SFA_LABEL_SOURCE,
    confidence: 0.66,
    needsReview: true
  };
}

export function getIngredientGuidance(rawName = '', packageState = 'opened') {
  const name = rawName.trim();
  if (!name) return null;
  const exact = INGREDIENT_KNOWLEDGE.flatMap((item) => [...item.keys, item.canonicalName, `${item.canonicalName}s`].map((key) => ({ item, key })))
    .filter(({ key }) => name.toLowerCase() === key.toLowerCase() || (/[\u3400-\u9fff]/.test(key) && key.length >= 2 && name.includes(key)))
    .sort((a, b) => b.key.length - a.key.length)[0]?.item;
  const matched = exact ? { ...exact, name, confidence: 0.94, needsReview: Boolean(exact.requiresPackageDate) } : fallbackGuidance(name);
  return {
    ...matched,
    packageState: matched.packageStateRelevant ? packageState : null,
    storage: applyPackageState(matched.storage, matched.packageStateRelevant ? packageState : 'opened')
  };
}

export const STORAGE_RETRIEVAL_SOURCES = [SFA_STORAGE_SOURCE, SFA_LABEL_SOURCE, USDA_FREEZING_SOURCE, USDA_BEEF_SOURCE, USDA_GROUND_BEEF_SOURCE, KIKKOMAN_SOY_SOURCE, KIKKOMAN_OYSTER_SOURCE, LKK_OYSTER_SOURCE];

export function ingredientIcon(name = '') {
  const matched = matchIngredientIcon(name, INGREDIENT_KNOWLEDGE);
  if (matched) return matched;
  return getIngredientGuidance(name)?.icon || '🛍️';
}
