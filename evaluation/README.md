# Evaluation

This folder contains the Variant C evaluation harness and the frozen T01–T20 suite supplied with the project.

## What is included

- [`cases/formal-20.json`](cases/formal-20.json): the frozen 20-case dataset, with original IDs and expected-behaviour statements;
- [`assets/formal/`](assets/formal/): the four image inputs referenced by T01–T04, including recorded SHA-256 values in the fixtures;
- [`rubrics/ingestion-calibration-v1.json`](rubrics/ingestion-calibration-v1.json): the supplied ingestion scoring anchors;
- [`run-c.js`](run-c.js): a harness that imports production inventory, retrieval, model, and validation code;
- [`results/`](results/): public-safe provenance and compact evidence derived from supplied historical files.

The three `EXAMPLE-*` fixtures are synthetic engineering examples and are excluded from a `--formal-only` run.

## Frozen suite scope

T01–T05 evaluate inventory intake. T06–T20 evaluate meal planning across inventory grounding, hard constraints, freshness, waste reduction, time, servings, preferences, and vague requests. Expected behaviour is evaluator-only ground truth and is not passed into the Variant C pipeline.

The source metadata contains the import date, worksheet name, and cell range. A private absolute path from the original machine was replaced with a neutral source label during portfolio cleanup; case content was not changed.

## Historical evidence

Two different claims must remain separate:

1. The supplied manual A/B/C scorecard reports A 7.57/20, B 17.29/20, and baseline C 12.86/20 against expected behaviour.
2. A later supplied C batch reports 20 successful executions and 20 programmatic validator passes.

The second result does not by itself establish a manually reviewed 20/20 score. See [`results/historical-evidence.md`](results/historical-evidence.md) and the derived [`manifest.json`](results/c-release-2026-09-04/manifest.json).

## Run without calling a model

```bash
npm run eval:c -- --list
```

This validates and lists available fixtures. Unit tests use dependency-injected stubs for validator and retry behaviour; those are engineering checks, not model-quality results.

## Run the real Variant C pipeline

Add `DEEPSEEK_API_KEY` to ignored `.env.local`, then run:

```bash
npm run eval:c -- --formal-only
```

The command calls the configured DeepSeek models. It writes a timestamped folder under ignored `evaluation/outputs/` containing per-case JSON, a combined `results.json`, `summary.csv`, and `metadata.json`. Record the date, repository commit, requested and returned model IDs, configuration, and any external-retrieval failures when treating a run as formal evidence.

## Status semantics

- `SUCCESS`: the production pipeline returned an output that passed its programmatic validator.
- `VALIDATION_FAILURE`: all bounded attempts were rejected by validation.
- `MODEL_ERROR`: the model returned empty, malformed, or unusable structured output.
- `SYSTEM_ERROR`: configuration, authentication, billing, network, timeout, rate-limit, upstream, asset, or fixture failure.

`SUCCESS` does not replace rubric-based product assessment. A validator can miss a frozen success criterion.

## Reproducibility limits

- Xiachufang retrieval is live and can return different or no candidates.
- Provider aliases can change server-side.
- The historical T03 comparison used a later replacement image only for C.
- The supplied manual scoring has not been independently reproduced in this cleanup.
- Raw historical prompts and model outputs are retained in the privately supplied archive and are not republished here; the public manifest identifies the source file by SHA-256.
