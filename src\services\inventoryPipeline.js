import { getIngredientGuidance, ingredientIcon } from '../data/ingredientKnowledge.js';
import { daysUntil } from './domain.js';

const LOCATION_ALIASES = new Map([
  ['fridge', '冷藏'], ['refrigerated', '冷藏'], ['冷藏', '冷藏'],
  ['freezer', '冷冻'], ['frozen', '冷冻'], ['冷冻', '冷冻'],
  ['room_temperature', '常温'], ['room temperature', '常温'], ['ambient', '常温'], ['常温', '常温']
]);

function dateKey(value) {
  if (!value) return null;
  const text = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function dateAtNoon(value) {
  const key = dateKey(value);
  return key ? new Date(`${key}T12:00:00`) : null;
}

function addDays(value, days) {
  const date = dateAtNoon(value);
  if (!date || !Number.isFinite(date.getTime()) || !Number.isFinite(Number(days))) return null;
  date.setDate(date.getDate() + Number(days));
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function normalizeStorageLocation(value = '') {
  return LOCATION_ALIASES.get(String(value).trim().toLowerCase()) || String(value).trim();
}

export function deriveFreshness(item, now = new Date()) {
  const remainingDays = daysUntil(item.expiryDate, now);
  const freshnessStatus = remainingDays == null
    ? 'uncertain'
    : remainingDays < 0
      ? 'expired_or_past_recorded_date'
      : remainingDays <= 3
        ? 'use_soon'
        : 'fresh';
  return {
    itemId: item.id,
    expiryDate: item.expiryDate || null,
    remainingDays,
    freshnessScore: remainingDays == null ? null : Math.max(0, Math.min(95, remainingDays * 10)),
    freshnessStatus,
    freshnessConfidence: item.freshnessConfidence || (remainingDays == null ? 'low' : 'medium'),
    freshnessSource: item.freshnessSource || (remainingDays == null ? 'insufficient_facts' : 'recorded_date')
  };
}

export function buildInventoryItemFromReview(candidate, values, { now = new Date(), id } = {}) {
  const managementMode = candidate.suggestedManagementMode || candidate.mode || 'freshness_only';
  const expiryDate = dateKey(values.expiryDate);
  const base = {
    id: id || `ing-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: values.name,
    canonicalName: candidate.normalizedName || candidate.canonicalName,
    category: candidate.category,
    uiCategory: candidate.uiCategory,
    managementMode,
    storageLocation: normalizeStorageLocation(values.storage),
    packageState: values.packageState || candidate.packageState || null,
    quantity: managementMode === 'freshness_only' ? null : values.quantity,
    unit: values.unit,
    stockPercentage: managementMode === 'approximate_stock' ? Number(values.stockPercentage ?? 100) : null,
    expiryDate,
    freshnessConfidence: candidate.freshnessConfidence || (candidate.expiryRequired ? 'medium' : 'high'),
    freshnessSource: candidate.freshnessSource || (candidate.expiryRequired ? 'human_or_reference' : 'retrieval_reference'),
    freezable: Boolean(candidate.storageOptions?.find((item) => item.location === '冷冻')?.available),
    refrigeratedDays: candidate.storageOptions?.find((item) => item.location === '冷藏')?.days || null,
    frozenDays: candidate.storageOptions?.find((item) => item.location === '冷冻')?.days || null,
    icon: candidate.icon || ingredientIcon(values.name),
    story: candidate.story || '',
    nature: candidate.nature || '',
    cooking: candidate.cooking || '',
    storageGuidance: candidate.storageOptions || []
  };
  const { itemId, ...freshness } = deriveFreshness(base, now);
  return { ...base, ...freshness };
}

// Canonical fixtures contain raw product facts. This adapter resolves those
// facts through the same ingredient knowledge and freshness derivation used by
// the interactive intake flow; it never accepts expected freshness/priority.
export function seedInventoryItemFromFixture(raw, { currentDate, index = 0 } = {}) {
  const now = dateAtNoon(currentDate) || new Date();
  const packageState = raw.package_state || raw.packageState || 'opened';
  const name = raw.name || raw.canonical_name || raw.canonicalName;
  const guidance = getIngredientGuidance(name, packageState);
  if (!guidance) throw new Error(`Inventory item ${index + 1} is missing a usable name`);
  const storageLocation = normalizeStorageLocation(raw.storage_location || raw.storageLocation || guidance.storage.find((option) => option.available)?.location);
  const storageOption = guidance.storage.find((option) => option.location === storageLocation && option.available) || null;
  const explicitExpiry = dateKey(raw.expiry_date || raw.expiryDate);
  const anchorDate = dateKey(raw.production_date || raw.productionDate || raw.purchase_date || raw.purchaseDate || currentDate);
  const derivedExpiry = explicitExpiry || (storageOption?.days ? addDays(anchorDate, storageOption.days) : null);
  const managementMode = raw.management_mode || raw.managementMode || guidance.mode;
  const candidate = {
    name,
    normalizedName: raw.canonical_name || raw.canonicalName || guidance.canonicalName,
    category: raw.category || guidance.category,
    uiCategory: raw.ui_category || raw.uiCategory || guidance.uiCategory,
    suggestedManagementMode: managementMode,
    storageOptions: guidance.storage,
    packageState,
    expiryRequired: guidance.requiresPackageDate,
    freshnessConfidence: explicitExpiry ? 'high' : (guidance.confidence >= 0.9 ? 'medium' : 'low'),
    freshnessSource: explicitExpiry ? 'explicit_date' : (derivedExpiry ? 'retrieval_reference' : 'insufficient_facts'),
    icon: guidance.icon,
    story: guidance.story,
    nature: guidance.nature,
    cooking: guidance.cooking
  };
  const item = buildInventoryItemFromReview(candidate, {
    name,
    storage: storageLocation,
    packageState,
    quantity: raw.quantity ?? guidance.quantity,
    unit: raw.unit || guidance.unit,
    stockPercentage: raw.stock_percentage ?? raw.stockPercentage,
    expiryDate: derivedExpiry
  }, { now, id: raw.id || `fixture-inv-${String(index + 1).padStart(3, '0')}` });
  item.purchaseDate = dateKey(raw.purchase_date || raw.purchaseDate);
  item.productionDate = dateKey(raw.production_date || raw.productionDate);
  return {
    item,
    retrieval: {
      canonicalName: guidance.canonicalName,
      confidence: guidance.confidence,
      needsReview: guidance.needsReview,
      packageState,
      storageLocation,
      selectedStorageOption: storageOption,
      source: guidance.source,
      storageOptions: guidance.storage
    },
    freshness: deriveFreshness(item, now)
  };
}

export function seedInventoryFromFixture(items = [], options = {}) {
  const evidence = items.map((item, index) => seedInventoryItemFromFixture(item, { ...options, index }));
  return {
    inventory: evidence.map((entry) => entry.item),
    ingredientRetrieval: evidence.map(({ item, retrieval }) => ({ itemId: item.id, ...retrieval })),
    freshnessResults: evidence.map((entry) => entry.freshness)
  };
}
