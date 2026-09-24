import { DEMO_INVENTORY, DEMO_PROFILE } from '../data/demo.js';
import { getIngredientGuidance } from '../data/ingredientKnowledge.js';
import { buildPlanReviewAt } from '../services/planning.js';

const STORAGE_KEY = 'freshloop-demo-state-v4';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function reminderDateAfter(days) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + Number(days));
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function daysFromNow(dateValue) {
  if (!dateValue) return null;
  const date = new Date(`${dateValue}T12:00:00`);
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  return Number.isFinite(date.getTime()) ? Math.ceil((date - now) / 86400000) : null;
}

function migrateInventory(items = []) {
  return items.map((item) => {
    const isTofu = item.canonicalName === 'tofu' || /豆腐/.test(item.name || '');
    let next = item;
    if (isTofu && item.managementMode === 'freshness_only') {
      next = {
        ...next,
        managementMode: 'tracked_quantity',
        quantity: Number(item.quantity) > 0 ? Number(item.quantity) : 1,
        unit: item.unit || '盒',
        stockPercentage: null
      };
    }

    const guidance = getIngredientGuidance(next.name || next.canonicalName || '');
    const dateManaged = guidance?.packageStateRelevant || next.uiCategory === 'staple' || next.uiCategory === 'condiment';
    if (!dateManaged) return next;
    const packageState = next.packageState || 'opened';
    const resolved = getIngredientGuidance(next.name || next.canonicalName || '', packageState);
    const storage = resolved?.storage?.find((option) => option.location === next.storageLocation && option.available);
    let expiryDate = next.expiryDate;
    if (!expiryDate && storage?.days) expiryDate = reminderDateAfter(storage.days);

    const isOysterSauce = next.canonicalName === 'oyster sauce' || /蚝油|耗油/.test(next.name || '');
    if (isOysterSauce && packageState === 'opened' && next.storageLocation === '冷藏') {
      const remaining = daysFromNow(expiryDate);
      if (remaining == null || remaining > 30) expiryDate = reminderDateAfter(30);
    }

    return {
      ...next,
      packageState,
      expiryDate,
      freshnessConfidence: next.freshnessConfidence || 'medium',
      freshnessSource: next.freshnessSource || 'opened_reference'
    };
  });
}

function initialState() {
  return {
    auth: {
      noticeAccepted: false,
      authenticated: false,
      onboardingComplete: false,
      stage: 'phone',
      phone: '',
      session: null,
      demoMode: false
    },
    activeTab: 'inventory',
    inventory: clone(DEMO_INVENTORY),
    profile: clone(DEMO_PROFILE),
    recipes: [],
    dailyRecommendations: [],
    dailyRecommendationError: null,
    aiGenerationMode: 'remote_required',
    selectedRecipeId: null,
    recipeMode: 'feed',
    favorites: [],
    mealLogs: [],
    pendingMealReviews: [],
    plannedMeals: [],
    shoppingItems: [],
    shoppingDismissed: [],
    inventoryQuery: '',
    inventoryCategory: 'all',
    inventoryStorage: 'all',
    inventoryManageMode: false,
    expiredPromptHandled: [],
    notificationSettings: {
      enabled: false,
      expiry: true,
      expiryDaysBefore: 3,
      dailyRecipe: true,
      planningTime: DEMO_PROFILE.planningTime,
      mealReviewMode: DEMO_PROFILE.mealReviewMode,
      afterMealHours: DEMO_PROFILE.afterMealHours,
      fixedReviewTime: DEMO_PROFILE.fixedReviewTime,
      planConfirmationTime: '21:30',
      channel: 'app',
      smsConsent: false
    },
    notice: null,
    isGenerating: false,
    planningInput: {
      prompt: '',
      servings: DEMO_PROFILE.defaultServings,
      prepTime: DEMO_PROFILE.defaultPrepTime,
      selectedIngredientIds: ['ing-002', 'ing-004'],
      carbId: 'ing-008',
      followUp: ''
    }
  };
}

function load() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return initialState();
    const defaults = initialState();
    const savedState = JSON.parse(saved);
    const merged = { ...defaults, ...savedState };
    merged.auth = { ...defaults.auth, ...(savedState.auth || {}) };
    merged.profile = { ...defaults.profile, ...(savedState.profile || {}) };
    merged.notice = null;
    merged.noticeFading = false;
    merged.inventory = migrateInventory(merged.inventory);
    const isRealModelResult = (recipe) => recipe?.model && recipe.model !== 'curated-local' && !String(recipe.promptVersion || '').includes('local');
    merged.recipes = (merged.recipes || []).filter(isRealModelResult);
    merged.dailyRecommendations = (merged.dailyRecommendations || []).filter(isRealModelResult);
    merged.activeTab = 'inventory';
    merged.recipeMode = 'feed';
    merged.isGenerating = false;
    merged.inventoryQuery = '';
    merged.inventoryCategory = 'all';
    merged.inventoryStorage = 'all';
    merged.aiGenerationMode = 'remote_required';
    merged.plannedMeals = (merged.plannedMeals || []).map((plan) => ({
      ...plan,
      status: plan.status === 'made' ? 'awaiting_review' : plan.status,
      reviewAt: plan.reviewAt || buildPlanReviewAt(plan.plannedFor, plan.confirmationTime || merged.notificationSettings.planConfirmationTime, new Date(0))
    }));
    return merged;
  } catch {
    return initialState();
  }
}

let state = load();
const listeners = new Set();

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export const store = {
  get() { return state; },
  set(patch, options = {}) {
    state = { ...state, ...patch };
    persist();
    if (!options.silent) listeners.forEach((listener) => listener(state));
  },
  update(mutator) {
    const next = clone(state);
    mutator(next);
    state = next;
    persist();
    listeners.forEach((listener) => listener(state));
  },
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  reset() {
    state = initialState();
    persist();
    listeners.forEach((listener) => listener(state));
  }
};
