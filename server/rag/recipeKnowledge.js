export const RECIPE_KNOWLEDGE_VERSION = 'recipe-knowledge-v1';

const RECIPE_KNOWLEDGE = [
  {
    id: 'tech-stir-fry-heat',
    title: '家用炉灶快炒时间线',
    keywords: ['炒', '快手', '锅气', '鸡胸', '蔬菜', '中式家常'],
    text: '家用炒锅先中火预热，再放油；肉类分批铺开避免出水，蔬菜按熟成速度加入。步骤应给出油量、火力、秒数和熟度判断。'
  },
  {
    id: 'tech-protein-tender',
    title: '瘦肉嫩化与安全熟度',
    keywords: ['鸡胸', '牛肉', '猪肉', '肉类', '嫩', '煎'],
    text: '瘦肉逆纹切、短时腌制并避免长时间高火；食谱需说明最大肉块中心熟度的可观察判断，不能只写“炒熟”。'
  },
  {
    id: 'tech-vegetable-texture',
    title: '绿叶菜与十字花科口感控制',
    keywords: ['菠菜', '西兰花', '青菜', '蔬菜', '清淡', '鲜'],
    text: '叶梗和叶片应分时下锅；西兰花可先短时焯水或少水焖熟，保持脆嫩并避免久煮发黄。'
  },
  {
    id: 'tech-tofu-crisp',
    title: '豆腐煎脆与挂汁',
    keywords: ['豆腐', '素食', '煎', '酱香'],
    text: '豆腐先吸干表面水分、留间距煎至自然脱锅，再加入酱汁短时收汁；写明粘锅时的补救方法。'
  },
  {
    id: 'tech-tomato-egg',
    title: '番茄与鸡蛋分段熟成',
    keywords: ['番茄', '鸡蛋', '盖饭', '家常'],
    text: '鸡蛋先炒至七成熟盛出，番茄充分出汁后再回锅，可兼顾嫩蛋和浓汁；酸甜应先靠成熟番茄而非大量加糖。'
  },
  {
    id: 'tech-noodle-emulsion',
    title: '面汤乳化与拌面收汁',
    keywords: ['面条', '面', '主食', '酱香'],
    text: '面条按包装时间少煮一分钟，保留面汤分次加入炒锅，使油和酱汁乳化并避免成品干硬。'
  },
  {
    id: 'tech-slow-braise',
    title: '长时炖煮的分阶段调味',
    keywords: ['炖', '煲', '红烧', '牛肉', '2小时', '慢炖'],
    text: '长时炖煮要分别写明煸香、加液、沸腾后转小火、检查软烂程度和最后收汁；咸味调料不要一次加满。'
  },
  {
    id: 'flavour-real-chili',
    title: '真实辣味的分层建立',
    keywords: ['辣', '微辣', '川湘', '云南', '小米辣', '辣椒'],
    text: '用户明确要求辣时，每道菜都需要真正的辣椒来源，并写出准确数量和加入时机；不能只用“香辣风味”文字代替。'
  },
  {
    id: 'flavour-yunnan-fresh',
    title: '云南风味的清鲜与酸辣层次',
    keywords: ['云南', '滇味', '傣味', '酸辣', '清鲜'],
    text: '云南风味可从鲜辣、酸香、菌菇和香草层次组织，但必须先遵守用户过敏、忌口和现有调味库存。'
  },
  {
    id: 'flavour-singapore-home',
    title: '新加坡家庭厨房的调味节奏',
    keywords: ['新加坡', '南洋', '咖喱', '叻沙', '家常'],
    text: '南洋家常风味常用辛香底味与分次调味；当库存没有专用酱料时，应给出少量、明确且可采购的关键缺口，不能堆砌调料。'
  },
  {
    id: 'policy-pantry-condiments',
    title: '库存调味优先规则',
    keywords: ['调味', '库存', '酱油', '食用油', '采购', '家常'],
    text: '普通四菜方案优先复用库存调味料，整组最多一菜缺一种调味料；只有用户点名菜式或硬性风味确实需要时才例外。'
  },
  {
    id: 'policy-three-core',
    title: '三种核心食材上限',
    keywords: ['库存', '采购', '简单', '新手', '核心食材'],
    text: '每道菜最多三种核心食材，主食和调味料不计入；两道库存优先、两道少量补齐，补齐方案也不应制造长采购单。'
  }
];

function searchableText(input = {}, inventory = [], profile = {}) {
  return [
    input.prompt,
    input.followUp,
    ...(profile.tasteTags || []),
    ...(profile.cuisineTags || []),
    profile.tasteNotes,
    profile.tasteProfileSummary,
    ...inventory.map((item) => `${item.name} ${item.category} ${item.uiCategory}`)
  ].filter(Boolean).join(' ').toLowerCase();
}

export function retrieveRecipeContext({ input = {}, inventory = [], profile = {}, limit = 6 }) {
  const query = searchableText(input, inventory, profile);
  return RECIPE_KNOWLEDGE
    .map((card, index) => ({
      ...card,
      score: card.keywords.reduce((total, keyword) => total + (query.includes(keyword.toLowerCase()) ? 3 : 0), 0) + (card.id.startsWith('policy-') ? 2 : 0) - index * 0.001
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ score, keywords, ...card }) => card);
}

export { RECIPE_KNOWLEDGE };
