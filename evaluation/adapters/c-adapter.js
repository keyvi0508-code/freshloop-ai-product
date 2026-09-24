import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { runRecipePlanner, RECIPE_MODEL_CONFIG, RECIPE_PROMPT_VERSION } from '../../server/api/generate-recipe.js';
import { runInventoryIntelligence, INGREDIENT_MODEL_CONFIG, INGREDIENT_PROMPT_VERSION } from '../../server/api/analyze-inventory.js';
import { RECIPE_KNOWLEDGE_VERSION } from '../../server/rag/recipeKnowledge.js';
import { INGREDIENT_KNOWLEDGE_VERSION } from '../../src/data/ingredientKnowledge.js';
import { buildInventoryItemFromReview, seedInventoryFromFixture } from '../../src/services/inventoryPipeline.js';
import { derivePriorityResults } from '../../src/services/priority.js';

const SUPPORTED_CASE_TYPES = new Set(['meal_planning', 'inventory_ingestion', 'end_to_end']);

function clone(value) {
  return structuredClone(value);
}

function currentDate(fixture) {
  const date = new Date(`${fixture.current_date}T12:00:00`);
  if (!Number.isFinite(date.getTime())) throw new Error(`Invalid current_date: ${fixture.current_date}`);
  return date;
}

function adaptProfile(raw = {}) {
  return {
    evaluationUserId: raw.user_id || 'synthetic-evaluation-user',
    interfaceLanguage: raw.interface_language || 'zh-CN',
    name: raw.display_name || raw.name || 'Synthetic Eval User',
    preferences: clone(raw.preferences || []),
    tasteTags: clone(raw.taste_preferences || raw.taste_tags || []),
    cuisineTags: clone(raw.cuisine_preferences || raw.cuisine_tags || []),
    tasteNotes: raw.taste_notes || '',
    tasteProfileSummary: raw.taste_profile_summary || '',
    dislikes: clone(raw.dislikes || []),
    allergies: clone(raw.allergies || []),
    dietaryConstraints: clone(raw.dietary_constraints || []),
    defaultServings: Number(raw.default_servings || 1),
    defaultPrepTime: Number(raw.default_prep_time_minutes || 30),
    fridgeTemperatureC: Number(raw.fridge_temperature_c ?? 4),
    freezerTemperatureC: Number(raw.freezer_temperature_c ?? -18)
  };
}

function buildPlannerInput(fixture, profile, priorityResults, runId) {
  const planner = fixture.planner_input || {};
  const selected = Array.isArray(planner.selected_inventory_ids) && planner.selected_inventory_ids.length
    ? planner.selected_inventory_ids
    : priorityResults.slice(0, 4).map((item) => item.itemId);
  return {
    prompt: fixture.user_request || '',
    servings: Number(planner.servings || profile.defaultServings || 1),
    prepTime: Number(planner.prep_time_minutes || profile.defaultPrepTime || 30),
    carbId: planner.carb_inventory_id || '',
    selectedIngredientIds: selected,
    followUp: planner.follow_up || '',
    generationNonce: runId
  };
}

function stateHash(profile, inventory) {
  return crypto.createHash('sha256').update(JSON.stringify({ profile, inventory })).digest('hex');
}

function sanitizeIngredientPrompt(messages, assetReference) {
  return messages.map((message) => {
    if (!Array.isArray(message.content)) return message;
    return {
      ...message,
      content: message.content.map((part) => part.type === 'image_url'
        ? { ...part, image_url: { ...part.image_url, url: `[asset:${assetReference}]` } }
        : part)
    };
  });
}

function sanitizeIngredientAttempts(attempts = [], assetReference) {
  return attempts.map((attempt) => ({ ...attempt, prompt: sanitizeIngredientPrompt(attempt.prompt || [], assetReference) }));
}

function mimeTypeFor(reference, configured) {
  if (configured) return configured;
  if (/\.jpe?g$/i.test(reference)) return 'image/jpeg';
  if (/\.webp$/i.test(reference)) return 'image/webp';
  return 'image/png';
}

async function loadAssetDataUrl(asset, repoRoot) {
  const reference = asset?.path || asset?.asset_reference;
  if (!reference) throw new Error('inventory_ingestion requires asset.path');
  const resolved = path.resolve(repoRoot, reference);
  const root = `${path.resolve(repoRoot)}${path.sep}`;
  if (!resolved.startsWith(root)) throw new Error('Asset path must stay inside the repository');
  const buffer = await fs.readFile(resolved);
  return { reference, dataUrl: `data:${mimeTypeFor(reference, asset.mime_type)};base64,${buffer.toString('base64')}` };
}

function confidenceSummary(items = []) {
  return items.map((item) => ({ name: item.name, confidence: Number(item.confidence), needs_user_review: Boolean(item.needsUserReview) }));
}

function baseResult(fixture, runId, config) {
  return {
    schema_version: '1.0',
    evaluation_version: config.evaluation_version,
    variant: 'C',
    formal_result: fixture.fixture_status === 'formal',
    fixture_status: fixture.fixture_status || 'formal',
    case_id: fixture.case_id,
    run_id: runId,
    timestamp: new Date().toISOString(),
    case_type: fixture.case_type,
    status: 'SYSTEM_ERROR',
    state_isolation: {
      strategy: 'fresh_in_memory_state_per_case_run',
      remote_persistence_used: false,
      cleanup: 'drop_run_local_references'
    },
    model: fixture.case_type === 'inventory_ingestion' ? clone(INGREDIENT_MODEL_CONFIG) : clone(RECIPE_MODEL_CONFIG),
    additional_models: fixture.case_type === 'end_to_end' ? { ingredient_intelligence: clone(INGREDIENT_MODEL_CONFIG) } : {},
    prompt_version: fixture.case_type === 'inventory_ingestion' ? INGREDIENT_PROMPT_VERSION : RECIPE_PROMPT_VERSION,
    pipeline_versions: {
      recipe_prompt: RECIPE_PROMPT_VERSION,
      ingredient_prompt: INGREDIENT_PROMPT_VERSION,
      recipe_knowledge: RECIPE_KNOWLEDGE_VERSION,
      ingredient_knowledge: INGREDIENT_KNOWLEDGE_VERSION,
      freshness: 'recorded-or-retrieved-expiry-with-user-evidence-v2',
      priority: 'earliest-non-expired-v1',
      validator: 'production-domain-validator-constraints-feasibility-v3'
    },
    expected_behavior_was_not_passed_to_pipeline: true,
    seeded_profile: null,
    seeded_inventory: [],
    user_request: fixture.user_request || null,
    ingredient_knowledge_retrieval: [],
    freshness_result: [],
    priority_result: [],
    retrieved_knowledge: { recipe_cards: [], web_candidates: [] },
    final_recipe_prompt: null,
    ingredient_prompt: null,
    raw_model_output: null,
    validator: { pass: false, errors: [] },
    regeneration_count: 0,
    all_generation_attempts: [],
    final_user_visible_output: null,
    inventory_ingestion: null,
    execution_time_ms: 0,
    system_model_errors: [],
    error: null
  };
}

function classifyError(error) {
  if (error?.code === 'VALIDATION_FAILURE') return 'VALIDATION_FAILURE';
  if (['MODEL_INVALID_JSON', 'MODEL_EMPTY_RESPONSE', 'MODEL_NO_CONFIDENT_ITEMS'].includes(error?.code)) return 'MODEL_ERROR';
  if (String(error?.code || '').startsWith('MODEL_')) return 'SYSTEM_ERROR';
  return 'SYSTEM_ERROR';
}

async function executeMealPlanning(fixture, state, result, config, now) {
  const priority = derivePriorityResults(state.inventory, now, 5);
  const input = buildPlannerInput(fixture, state.profile, priority, result.run_id);
  result.priority_result = priority;
  result.user_request = input.prompt;
  result.planner_input = input;
  try {
    const planned = await runRecipePlanner({ input, inventory: state.inventory, profile: state.profile, history: clone(fixture.conversation_history || []) }, { maxAttempts: config.max_generation_attempts, now });
    const trace = planned.evaluationTrace;
    result.retrieved_knowledge = { recipe_cards: planned.retrievalContext, web_candidates: planned.webRetrieval.candidates };
    result.all_generation_attempts = trace.attempts;
    result.regeneration_count = trace.regenerationCount;
    const finalAttempt = trace.attempts.at(-1);
    result.final_recipe_prompt = finalAttempt?.prompt || null;
    result.raw_model_output = finalAttempt?.rawModelOutput || null;
    result.validator = { pass: Boolean(finalAttempt?.validatorPass), errors: finalAttempt?.validatorErrors || [] };
    result.final_user_visible_output = planned.recipes;
    result.status = 'SUCCESS';
  } catch (error) {
    if (error.context) result.retrieved_knowledge = { recipe_cards: error.context.retrievedContext || [], web_candidates: error.context.webCandidates || [] };
    if (error.attempts) {
      result.all_generation_attempts = error.attempts;
      result.regeneration_count = Math.max(0, error.attempts.length - 1);
      const finalAttempt = error.attempts.at(-1);
      result.final_recipe_prompt = finalAttempt?.prompt || null;
      result.raw_model_output = finalAttempt?.rawModelOutput || null;
      result.validator = { pass: false, errors: finalAttempt?.validatorErrors || [] };
    }
    throw error;
  }
}

async function executeIngestion(fixture, result, repoRoot) {
  const manual = fixture.capture_type === 'manual';
  let reference = null;
  let dataUrl = null;
  if (!manual) ({ reference, dataUrl } = await loadAssetDataUrl(fixture.asset, repoRoot));
  const payload = {
    source: fixture.capture_type || 'photo',
    ...(manual ? { text: fixture.manual_input || '' } : { image: dataUrl }),
    interfaceLanguage: fixture.user_profile?.interface_language || 'zh-CN',
    temperatures: {
      fridgeC: Number(fixture.user_profile?.fridge_temperature_c ?? 4),
      freezerC: Number(fixture.user_profile?.freezer_temperature_c ?? -18)
    }
  };
  try {
    const ingested = await runInventoryIntelligence(payload);
    const trace = ingested.evaluationTrace;
    result.ingredient_prompt = reference ? sanitizeIngredientPrompt(trace.prompt, reference) : trace.prompt;
    result.raw_model_output = trace.rawModelOutput;
    result.all_generation_attempts = sanitizeIngredientAttempts(trace.attempts, reference);
    result.regeneration_count = Math.max(0, (trace.attempts || []).length - 1);
    result.final_user_visible_output = ingested.candidates;
    result.inventory_ingestion = {
      capture_type: payload.source,
      asset_reference: reference,
      raw_input: manual ? fixture.manual_input || '' : null,
      raw_extraction: trace.parsedModelOutput,
      parsed_items: ingested.candidates,
      confidence: confidenceSummary(ingested.candidates),
      needs_user_review: ingested.candidates.some((item) => item.needsUserReview)
    };
    result.validator = { pass: true, errors: [] };
    result.status = 'SUCCESS';
    return ingested.candidates;
  } catch (error) {
    const trace = error.evaluationTrace;
    if (trace) {
      result.ingredient_prompt = reference ? sanitizeIngredientPrompt(trace.prompt, reference) : trace.prompt;
      result.raw_model_output = trace.rawModelOutput;
      result.all_generation_attempts = sanitizeIngredientAttempts(trace.attempts, reference);
      result.regeneration_count = Math.max(0, (trace.attempts || []).length - 1);
      result.inventory_ingestion = { capture_type: payload.source, asset_reference: reference, raw_input: manual ? fixture.manual_input || '' : null, raw_extraction: trace.parsedModelOutput, parsed_items: trace.parsedItems || [], confidence: [], needs_user_review: true };
    }
    throw error;
  }
}

function applyHumanReview(candidates, corrections, now) {
  if (!Array.isArray(corrections) || !corrections.length) throw new Error('end_to_end requires fixture-provided human_review_corrections');
  return corrections.map((correction, index) => {
    const candidate = candidates[Number(correction.candidate_index)];
    if (!candidate) throw new Error(`human_review_corrections[${index}] references a missing candidate`);
    return buildInventoryItemFromReview({ ...candidate, ...(correction.candidate_overrides || {}) }, {
      name: correction.name || candidate.name,
      storage: correction.storage_location || candidate.storageLocation,
      packageState: correction.package_state || candidate.packageState,
      quantity: correction.quantity ?? candidate.quantity,
      unit: correction.unit || candidate.unit,
      stockPercentage: correction.stock_percentage,
      expiryDate: correction.expiry_date
    }, { now, id: correction.id || `reviewed-${index + 1}` });
  });
}

export function validateCanonicalFixture(fixture) {
  const errors = [];
  if (!fixture || typeof fixture !== 'object') return ['Fixture must be a JSON object'];
  if (!/^[A-Za-z0-9_-]+$/.test(fixture.case_id || '')) errors.push('case_id is required and must be filesystem-safe');
  if (!SUPPORTED_CASE_TYPES.has(fixture.case_type)) errors.push(`Unsupported case_type: ${fixture.case_type}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fixture.current_date || '')) errors.push('current_date must use YYYY-MM-DD');
  if (!fixture.user_profile || typeof fixture.user_profile !== 'object') errors.push('user_profile is required');
  if (fixture.fixture_status && !['example', 'placeholder', 'formal'].includes(fixture.fixture_status)) errors.push('fixture_status must be example, placeholder, or formal');
  if (fixture.case_type === 'meal_planning' && !String(fixture.user_request || '').trim()) errors.push('meal_planning requires user_request');
  if (fixture.case_type === 'meal_planning' && !Array.isArray(fixture.inventory)) errors.push('meal_planning requires inventory[]');
  if (['inventory_ingestion', 'end_to_end'].includes(fixture.case_type)) {
    if (fixture.capture_type === 'manual' && !String(fixture.manual_input || '').trim()) errors.push(`${fixture.case_type} manual capture requires manual_input`);
    if (fixture.capture_type !== 'manual' && !fixture.asset?.path) errors.push(`${fixture.case_type} image capture requires asset.path`);
  }
  return errors;
}

export async function executeVariantCCase({ fixture: sourceFixture, runId, config, repoRoot }) {
  const fixture = clone(sourceFixture);
  const result = baseResult(fixture, runId, config);
  const startedAt = Date.now();
  let state = null;
  try {
    const fixtureErrors = validateCanonicalFixture(fixture);
    if (fixtureErrors.length) {
      const error = new Error(`Invalid canonical fixture: ${fixtureErrors.join('; ')}`);
      error.code = 'INVALID_FIXTURE';
      throw error;
    }
    const now = currentDate(fixture);
    const profile = adaptProfile(fixture.user_profile);
    const seeded = seedInventoryFromFixture(fixture.inventory || [], { currentDate: fixture.current_date });
    state = { profile, inventory: seeded.inventory, conversationHistory: clone(fixture.conversation_history || []) };
    result.seeded_profile = clone(profile);
    result.seeded_inventory = clone(state.inventory);
    result.ingredient_knowledge_retrieval = clone(seeded.ingredientRetrieval);
    result.freshness_result = clone(seeded.freshnessResults);
    result.state_isolation.seeded_state_hash = stateHash(profile, state.inventory);

    if (fixture.case_type === 'meal_planning') {
      await executeMealPlanning(fixture, state, result, config, now);
    } else if (fixture.case_type === 'inventory_ingestion') {
      await executeIngestion(fixture, result, repoRoot);
    } else {
      const draft = await executeIngestion(fixture, result, repoRoot);
      const reviewed = applyHumanReview(draft, fixture.human_review_corrections, now);
      result.fixture_provided_human_input = clone(fixture.human_review_corrections);
      state.inventory = [...state.inventory, ...reviewed];
      result.seeded_inventory = clone(state.inventory);
      result.freshness_result = state.inventory.map((item) => ({ itemId: item.id, expiryDate: item.expiryDate, freshnessStatus: item.freshnessStatus, freshnessScore: item.freshnessScore, freshnessConfidence: item.freshnessConfidence, freshnessSource: item.freshnessSource }));
      await executeMealPlanning(fixture, state, result, config, now);
    }
  } catch (error) {
    result.status = classifyError(error);
    result.error = { name: error.name || 'Error', code: error.code || null, message: error.message || String(error) };
    result.system_model_errors.push(result.error);
  } finally {
    state = null;
    result.state_isolation.cleanup_completed = state === null;
    result.execution_time_ms = Date.now() - startedAt;
  }
  return result;
}
