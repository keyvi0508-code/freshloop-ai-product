import { getIngredientGuidance } from './ingredientKnowledge.js';

export const DEMO_PROFILE = {
  interfaceLanguage: 'zh-CN',
  name: 'Alex',
  preferences: ['辣', '中餐', '米饭'],
  tasteTags: ['辣', '鲜香'],
  cuisineTags: ['中式家常', '川湘'],
  tasteNotes: '喜欢微辣但不要只有辣味，希望酱香和锅气更明显。',
  tasteProfileSummary: '偏好鲜香、微辣、有层次的中式家常口味；调味要明确但不过咸。',
  dislikes: ['香菜'],
  allergies: ['花生'],
  dietaryConstraints: [],
  defaultServings: 1,
  defaultPrepTime: 30,
  planningTime: '21:00',
  mealReviewMode: 'after_meal',
  fixedReviewTime: '22:30',
  afterMealHours: 1,
  mealsPerDay: 3,
  mealTimes: ['08:00', '12:30', '19:00'],
  fridgeTemperatureC: 4,
  freezerTemperatureC: -18,
  phone: '',
  onboardingComplete: false,
  essentialItems: [
    { name: '大米', threshold: 20 },
    { name: '面条', threshold: 20 },
    { name: '酱油', threshold: 15 },
    { name: '食用油', threshold: 20 }
  ]
};

function demoDate(daysFromToday) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + daysFromToday);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export const DEMO_INVENTORY = [
  { id: 'ing-001', name: '鸡胸肉', canonicalName: 'chicken breast', category: '肉类', uiCategory: 'protein', managementMode: 'tracked_quantity', storageLocation: '冷冻', quantity: 2, unit: '块', stockPercentage: null, expiryDate: demoDate(5), freshnessScore: 74, freshnessStatus: 'fresh', freshnessConfidence: 'high', freshnessSource: 'explicit_date', freezable: true, refrigeratedDays: 2, frozenDays: 45, imageReference: null },
  { id: 'ing-002', name: '西兰花', canonicalName: 'broccoli', category: '蔬菜', uiCategory: 'produce', managementMode: 'tracked_quantity', storageLocation: '冷藏', quantity: 1, unit: '颗', stockPercentage: null, expiryDate: demoDate(1), freshnessScore: 42, freshnessStatus: 'use_soon', freshnessConfidence: 'medium', freshnessSource: 'visual_plus_rag', freezable: true, refrigeratedDays: 5, frozenDays: 45, imageReference: null },
  { id: 'ing-003', name: '鸡蛋', canonicalName: 'egg', category: '蛋类', uiCategory: 'protein', managementMode: 'tracked_quantity', storageLocation: '冷藏', quantity: 6, unit: '个', stockPercentage: null, expiryDate: demoDate(11), freshnessScore: 80, freshnessStatus: 'fresh', freshnessConfidence: 'high', freshnessSource: 'explicit_date', freezable: false, refrigeratedDays: 21, frozenDays: null, imageReference: null },
  { id: 'ing-004', name: '菠菜', canonicalName: 'spinach', category: '蔬菜', uiCategory: 'produce', managementMode: 'tracked_quantity', storageLocation: '冷藏', quantity: 1, unit: '袋', stockPercentage: null, expiryDate: demoDate(0), freshnessScore: 31, freshnessStatus: 'use_soon', freshnessConfidence: 'medium', freshnessSource: 'visual_plus_rag', freezable: true, refrigeratedDays: 3, frozenDays: 30, imageReference: null },
  { id: 'ing-005', name: '番茄', canonicalName: 'tomato', category: '蔬菜', uiCategory: 'produce', managementMode: 'tracked_quantity', storageLocation: '冷藏', quantity: 4, unit: '个', stockPercentage: null, expiryDate: demoDate(3), freshnessScore: 56, freshnessStatus: 'fresh', freshnessConfidence: 'medium', freshnessSource: 'purchase_date', freezable: true, refrigeratedDays: 5, frozenDays: 30, imageReference: null },
  { id: 'ing-006', name: '牛奶', canonicalName: 'milk', category: '乳制品', uiCategory: 'protein', managementMode: 'freshness_only', storageLocation: '冷藏', quantity: null, unit: '盒', stockPercentage: null, expiryDate: demoDate(2), freshnessScore: 22, freshnessStatus: 'use_soon', freshnessConfidence: 'high', freshnessSource: 'explicit_date', freezable: false, refrigeratedDays: 5, frozenDays: null, imageReference: null },
  { id: 'ing-007', name: '香蕉', canonicalName: 'banana', category: '水果', uiCategory: 'produce', managementMode: 'freshness_only', storageLocation: '常温', quantity: null, unit: '把', stockPercentage: null, expiryDate: demoDate(1), freshnessScore: 38, freshnessStatus: 'use_soon', freshnessConfidence: 'low', freshnessSource: 'visual_plus_rag', freezable: false, refrigeratedDays: 4, frozenDays: null, imageReference: null },
  { id: 'ing-008', name: '大米', canonicalName: 'rice', category: '主食', uiCategory: 'staple', managementMode: 'approximate_stock', storageLocation: '常温', packageState: 'opened', quantity: null, unit: '克', stockPercentage: 62, expiryDate: demoDate(180), freshnessScore: 95, freshnessStatus: 'fresh', freshnessConfidence: 'medium', freshnessSource: 'opened_reference', freezable: false, refrigeratedDays: null, frozenDays: null, imageReference: null },
  { id: 'ing-009', name: '酱油', canonicalName: 'soy sauce', category: '调味料', uiCategory: 'condiment', managementMode: 'approximate_stock', storageLocation: '常温', packageState: 'opened', quantity: null, unit: '毫升', stockPercentage: 18, expiryDate: demoDate(30), freshnessScore: 95, freshnessStatus: 'fresh', freshnessConfidence: 'medium', freshnessSource: 'opened_reference', freezable: false, refrigeratedDays: 90, frozenDays: null, imageReference: null },
  { id: 'ing-010', name: '食用油', canonicalName: 'cooking oil', category: '调味料', uiCategory: 'condiment', managementMode: 'approximate_stock', storageLocation: '常温', packageState: 'opened', quantity: null, unit: '毫升', stockPercentage: 48, expiryDate: demoDate(120), freshnessScore: 95, freshnessStatus: 'fresh', freshnessConfidence: 'medium', freshnessSource: 'opened_reference', freezable: false, refrigeratedDays: null, frozenDays: null, imageReference: null },
  { id: 'ing-011', name: '酸奶', canonicalName: 'yogurt', category: '乳制品', uiCategory: 'protein', managementMode: 'freshness_only', storageLocation: '冷藏', quantity: null, unit: '杯', stockPercentage: null, expiryDate: demoDate(6), freshnessScore: 65, freshnessStatus: 'fresh', freshnessConfidence: 'high', freshnessSource: 'explicit_date', freezable: false, refrigeratedDays: 7, frozenDays: null, imageReference: null },
  { id: 'ing-012', name: '燕麦棒', canonicalName: 'granola bar', category: '其他食品', uiCategory: 'other', managementMode: 'freshness_only', storageLocation: '常温', quantity: null, unit: '根', stockPercentage: null, expiryDate: demoDate(40), freshnessScore: 92, freshnessStatus: 'fresh', freshnessConfidence: 'high', freshnessSource: 'explicit_date', freezable: false, refrigeratedDays: null, frozenDays: null, imageReference: null },
  { id: 'ing-013', name: '豆腐', canonicalName: 'tofu', category: '豆制品', uiCategory: 'protein', managementMode: 'tracked_quantity', storageLocation: '冷藏', quantity: 1, unit: '盒', stockPercentage: null, expiryDate: demoDate(-2), freshnessScore: 0, freshnessStatus: 'expired_or_past_recorded_date', freshnessConfidence: 'high', freshnessSource: 'explicit_date', freezable: true, refrigeratedDays: 3, frozenDays: 30, imageReference: null }
].map((item) => {
  const guidance = getIngredientGuidance(item.name);
  return {
    icon: guidance?.icon || '🛍️',
    story: guidance?.story || '',
    nature: guidance?.nature || '',
    cooking: guidance?.cooking || '',
    storageGuidance: guidance?.storage || [],
    ...item
  };
});

export const FOOD_KNOWLEDGE = [
  { id: 'fk-001', canonicalName: 'spinach', category: '蔬菜', storageLocation: '冷藏', typicalStorageMinDays: 2, typicalStorageMaxDays: 5, visualStates: ['fresh', 'wilted'], warningSigns: '叶片发黄、黏滑或异味时应停止使用', storageNotes: '用纸巾吸湿后冷藏可延长品质', sourceTitle: 'Demo curated food knowledge' },
  { id: 'fk-002', canonicalName: 'broccoli', category: '蔬菜', storageLocation: '冷藏', typicalStorageMinDays: 3, typicalStorageMaxDays: 7, visualStates: ['fresh', 'yellowing'], warningSigns: '明显发黏或异味时需人工确认', storageNotes: '冷藏并避免积水', sourceTitle: 'Demo curated food knowledge' },
  { id: 'fk-003', canonicalName: 'banana', category: '水果', storageLocation: '常温', typicalStorageMinDays: 2, typicalStorageMaxDays: 6, visualStates: ['green', 'ripe', 'overripe'], warningSigns: '严重渗液或霉变时停止使用', storageNotes: '成熟度会改变可用窗口', sourceTitle: 'Demo curated food knowledge' },
  { id: 'fk-004', canonicalName: 'milk', category: '乳制品', storageLocation: '冷藏', typicalStorageMinDays: 1, typicalStorageMaxDays: 7, visualStates: ['sealed', 'opened'], warningSigns: '以包装日期、冷藏状态和气味为准', storageNotes: '开封后应优先参考包装说明', sourceTitle: 'Demo curated food knowledge' },
  { id: 'fk-005', canonicalName: 'chicken breast', category: '肉类', storageLocation: '冷冻', typicalStorageMinDays: 14, typicalStorageMaxDays: 90, visualStates: ['frozen'], warningSigns: '日期不明或解冻状态不明时请人工确认', storageNotes: '解冻后按用户选择的储存状态处理', sourceTitle: 'Demo curated food knowledge' }
];
