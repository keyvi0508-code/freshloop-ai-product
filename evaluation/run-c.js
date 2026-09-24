#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { executeVariantCCase, validateCanonicalFixture } from './adapters/c-adapter.js';
import { RECIPE_MODEL_CONFIG } from '../server/api/generate-recipe.js';
import { INGREDIENT_MODEL_CONFIG } from '../server/api/analyze-inventory.js';

const evaluationDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.dirname(evaluationDir);

function parseArgs(argv) {
  const options = { caseIds: [], runs: 1, output: null, formalOnly: false, list: false, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--case') {
      const value = argv[++index];
      if (value === undefined) throw new Error('--case requires one or more comma-separated case IDs');
      options.caseIds.push(...value.split(',').map((item) => item.trim()).filter(Boolean));
    }
    else if (arg === '--runs') options.runs = Number(argv[++index]);
    else if (arg === '--output') options.output = argv[++index];
    else if (arg === '--formal-only') options.formalOnly = true;
    else if (arg === '--list') options.list = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`Unknown option: ${arg}`);
  }
  if (!Number.isInteger(options.runs) || options.runs < 1 || options.runs > 100) throw new Error('--runs must be an integer from 1 to 100');
  options.caseIds = [...new Set(options.caseIds)];
  return options;
}

function helpText() {
  return `Variant C evaluation harness\n\nUsage:\n  npm run eval:c\n  npm run eval:c -- --formal-only\n  npm run eval:c -- --case T07\n  npm run eval:c -- --case T01,T02,T03,T04\n  npm run eval:c -- --case T07 --runs 3\n  npm run eval:c -- --list\n\nOptions:\n  --case <ids>      Run one case or comma-separated case IDs\n  --runs <n>        Independent repeats per case (default: 1)\n  --formal-only     Run only fixtures marked formal\n  --output <path>   Output root (default: evaluation/outputs)\n  --list            List available cases\n`;
}

async function loadEnvFile(filePath) {
  let text;
  try { text = await fs.readFile(filePath, 'utf8'); } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match || process.env[match[1]]) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[match[1]] = value;
  }
}

async function loadJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function loadFixtures() {
  const casesDir = path.join(evaluationDir, 'cases');
  const names = (await fs.readdir(casesDir)).filter((name) => name.endsWith('.json')).sort();
  const loaded = await Promise.all(names.map(async (name) => ({ file: name, value: await loadJson(path.join(casesDir, name)) })));
  return loaded.flatMap(({ file, value }) => {
    const fixtures = Array.isArray(value) ? value : Array.isArray(value?.cases) ? value.cases : [value];
    return fixtures.map((fixture) => ({ file, fixture }));
  });
}

function batchId(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function csvCell(value) {
  const text = value == null ? '' : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function csvSummary(results) {
  const columns = ['case_id', 'variant', 'run_id', 'case_type', 'model', 'prompt_version', 'final_output', 'validator_pass', 'regeneration_count', 'execution_time_ms', 'error', 'status', 'formal_result', 'fixture_status'];
  const rows = results.map((result) => ({
    case_id: result.case_id,
    variant: result.variant,
    run_id: result.run_id,
    case_type: result.case_type,
    model: result.model?.model || '',
    prompt_version: result.prompt_version,
    final_output: result.final_user_visible_output == null ? '' : JSON.stringify(result.final_user_visible_output),
    validator_pass: result.validator?.pass ?? false,
    regeneration_count: result.regeneration_count,
    execution_time_ms: result.execution_time_ms,
    error: result.error?.message || '',
    status: result.status,
    formal_result: result.formal_result,
    fixture_status: result.fixture_status
  }));
  return `${columns.map(csvCell).join(',')}\n${rows.map((row) => columns.map((column) => csvCell(row[column])).join(',')).join('\n')}\n`;
}

function secretValues() {
  return Object.entries(process.env)
    .filter(([key, value]) => /(?:API_KEY|TOKEN|SECRET|PASSWORD|SERVICE_ROLE)/i.test(key) && typeof value === 'string' && value.length >= 8)
    .map(([, value]) => value);
}

function redactSerialized(serialized) {
  return secretValues().reduce((text, secret) => text.replaceAll(secret, '[REDACTED]'), serialized);
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, redactSerialized(`${JSON.stringify(value, null, 2)}\n`), { mode: 0o600 });
}

function assertFrozenConfig(config) {
  const checks = [
    ['recipe.provider', config.models.recipe.provider, RECIPE_MODEL_CONFIG.provider],
    ['recipe.model', config.models.recipe.model, RECIPE_MODEL_CONFIG.model],
    ['recipe.temperature', config.models.recipe.temperature, RECIPE_MODEL_CONFIG.temperature],
    ['recipe.max_output_tokens', config.models.recipe.max_output_tokens, RECIPE_MODEL_CONFIG.maxOutputTokens],
    ['ingredient.provider', config.models.ingredient.provider, INGREDIENT_MODEL_CONFIG.provider],
    ['ingredient.model', config.models.ingredient.model, INGREDIENT_MODEL_CONFIG.model],
    ['ingredient.temperature', config.models.ingredient.temperature, INGREDIENT_MODEL_CONFIG.temperature],
    ['ingredient.max_output_tokens', config.models.ingredient.max_output_tokens, INGREDIENT_MODEL_CONFIG.maxOutputTokens]
  ];
  const drift = checks.filter(([, configured, production]) => configured !== production);
  if (drift.length) throw new Error(`evaluation/config.json drifted from production: ${drift.map(([name, configured, production]) => `${name}=${configured} (production ${production})`).join('; ')}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) { process.stdout.write(helpText()); return; }
  await loadEnvFile(path.join(repoRoot, '.env.local'));
  const config = await loadJson(path.join(evaluationDir, 'config.json'));
  assertFrozenConfig(config);
  const entries = await loadFixtures();
  if (options.list) {
    for (const { fixture } of entries) process.stdout.write(`${fixture.case_id}\t${fixture.case_type}\t${fixture.fixture_status || 'formal'}\t${fixture.title || ''}\n`);
    return;
  }
  let selected = options.caseIds.length ? entries.filter(({ fixture }) => options.caseIds.includes(fixture.case_id)) : entries;
  if (options.formalOnly) selected = selected.filter(({ fixture }) => fixture.fixture_status === 'formal');
  if (!selected.length) throw new Error(`No canonical case found for ${options.caseIds.join(',')}`);
  const foundIds = new Set(selected.map(({ fixture }) => fixture.case_id));
  const missingIds = options.caseIds.filter((caseId) => !foundIds.has(caseId));
  if (missingIds.length) throw new Error(`No canonical case found for ${missingIds.join(',')}`);
  for (const { file, fixture } of selected) {
    const errors = validateCanonicalFixture(fixture);
    if (errors.length) throw new Error(`${file}: ${errors.join('; ')}`);
  }
  if (!process.env.DEEPSEEK_API_KEY) throw new Error('DEEPSEEK_API_KEY is missing. Put it in .env.local before a formal run.');

  const id = batchId();
  const outputRoot = path.resolve(repoRoot, options.output || config.output_directory);
  const outputDir = path.join(outputRoot, id);
  await fs.mkdir(outputDir, { recursive: true, mode: 0o700 });
  const results = [];
  for (const { fixture } of selected) {
    for (let repeat = 1; repeat <= options.runs; repeat += 1) {
      const runId = `eval_${fixture.case_id}_run${String(repeat).padStart(2, '0')}_${id}`;
      process.stdout.write(`[C] ${fixture.case_id} run ${repeat}/${options.runs} ... `);
      const result = await executeVariantCCase({ fixture, runId, config, repoRoot });
      results.push(result);
      await writeJson(path.join(outputDir, `C_${fixture.case_id}_run${String(repeat).padStart(2, '0')}.json`), result);
      process.stdout.write(`${result.status} (${result.execution_time_ms} ms)\n`);
    }
  }
  const metadata = {
    evaluation_version: config.evaluation_version,
    variant: 'C',
    batch_id: id,
    created_at: new Date().toISOString(),
    cases: selected.map(({ fixture }) => fixture.case_id),
    runs_per_case: options.runs,
    result_count: results.length,
    success_count: results.filter((result) => result.status === 'SUCCESS').length,
    model_config: { recipe: RECIPE_MODEL_CONFIG, ingredient: INGREDIENT_MODEL_CONFIG },
    formal_ai: true
  };
  await writeJson(path.join(outputDir, 'results.json'), { metadata, results });
  await fs.writeFile(path.join(outputDir, 'summary.csv'), redactSerialized(csvSummary(results)), { mode: 0o600 });
  await writeJson(path.join(outputDir, 'metadata.json'), metadata);
  process.stdout.write(`JSON: ${path.join(outputDir, 'results.json')}\nCSV:  ${path.join(outputDir, 'summary.csv')}\n`);
  if (results.some((result) => result.status !== 'SUCCESS')) process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`Evaluation harness error: ${error.message}\n`);
  process.exitCode = 1;
});
