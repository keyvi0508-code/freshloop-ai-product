# FreshLoop product case study

## Problem

FreshLoop addresses a gap between owning ingredients and acting on them. A useful meal-planning product must understand uncertain inventory, respect non-negotiable dietary constraints, prioritize food that should be used soon, and produce a plan that fits time and serving needs. A fluent recipe alone is not enough.

The target journey is:

```text
capture food → review uncertain fields → confirm inventory
→ ask for a meal → receive constrained options
→ plan one option → confirm cooking → update stock
```

## Success criteria

The supplied 20-case suite operationalizes four product criteria:

| Criterion | Product question | Frozen cases |
|---|---|---|
| Inventory grounding and consistency | Does the output stay within known items, amounts, units, and availability? | T01–T06, T18 |
| Safety and hard constraints | Are allergies and dietary exclusions obeyed even when a request conflicts? | T07–T10, T15 |
| Freshness-aware waste reduction | Does the plan prioritize suitable use-soon food and handle expired food safely? | T11–T15 |
| Recipe quality and context compliance | Is the result feasible for taste, servings, time, and the current request? | T16–T20 |

These criteria are broader than model accuracy. They test whether the product makes a safe and actionable decision from imperfect state.

## Product decisions

### Human review before inventory writes

Image and text analysis returns a candidate draft. The UI lets the user correct name, quantity, unit, storage, package state, and date before confirmation. This keeps uncertain OCR or recognition output from silently becoming system state. The production path is implemented in [`server/api/analyze-inventory.js`](../server/api/analyze-inventory.js) and candidate normalization in [`src/services/visionCandidates.js`](../src/services/visionCandidates.js).

### Context before generation

The planner assembles state that a base prompt would not reliably infer:

- confirmed inventory and profile constraints;
- deterministic freshness and priority calculations;
- keyword-selected guidance from 12 curated recipe cards;
- structured guidance from 21 ingredient records and fallback rules;
- optional Xiachufang search candidates.

This design is described as context/retrieval design rather than vector RAG. No embedding model or vector database appears in the supplied code.

### Deterministic checks around the model

Recipe generation is followed by code-level validation. The checks cover allergies, dislikes, dietary constraints, expired items, tracked quantity, serving feasibility, short requested time with frozen protein, duplicate names, and required output conditions. Invalid sets can be regenerated with the validation errors included in the next prompt. See [`server/api/generate-recipe.js`](../server/api/generate-recipe.js) and [`src/services/domain.js`](../src/services/domain.js).

The normalization layer can also modify parsed model output before validation, including adding required chilli metadata for a spicy request. This is part of the current product pipeline and should be considered when comparing raw model behaviour with final output.

### Confirmation before stock mutation

Choosing a recipe records intent; it does not immediately deduct ingredients. The user later confirms whether the meal was cooked and reviews actual usage before inventory mutation. This separates recommendation from a consequential state change.

## My contribution and team boundary

My documented contribution is:

- Problem Definition;
- Product Success Criteria;
- Context / RAG Design;
- Frozen 20-case Evaluation Dataset.

FreshLoop is a team project. The supplied repository does not contain reliable file-level authorship evidence, so this case study does not assign implementation ownership to me or claim that I independently built the system.

## Evidence and findings

The frozen suite in [`evaluation/cases/formal-20.json`](../evaluation/cases/formal-20.json) preserves T01–T20 and evaluator-only expected behaviour. The evaluation runner records that expected behaviour was not passed into the production pipeline.

The supplied historical manual scorecard reports:

| Variant | Score / 20 | Passed cases / 20 | Successful executions / 20 |
|---|---:|---:|---:|
| A | 7.57 | 8 | 19 |
| B | 17.29 | 17 | 19 |
| C baseline | 12.86 | 13 | 19 |

Each of four metric groups was normalized to five points. Reviewers scored each applicable case PASS/FAIL against its expected behaviour. T03 was not fully comparable because A and B lacked the image while C used a later replacement.

A later supplied C batch dated 4 September 2026 contains 20 successful executions and 20 production-validator passes. Three cases, T10, T11, and T18, required one regeneration. This is evidence that the release pipeline completed and satisfied its own validators. It is not an independently reproduced manual 20/20 score. See [`evaluation/results/historical-evidence.md`](../evaluation/results/historical-evidence.md).

One important historical finding is that application validation and product success criteria are not identical. The baseline scorecard records validator-passing outputs that still failed expected behaviour, including a vegetarian case that contained chicken and an expired-yogurt case that omitted the required warning. This supports keeping the frozen product-level rubric alongside programmatic checks.

## Current limitations

- Historical manual scoring was supplied by the team and was not rerun during this cleanup.
- A/B/C were not completely controlled because of the T03 asset difference.
- Live web retrieval is a fragile dependency and can return no candidates.
- Provider aliases can change server-side even when the requested model name is recorded.
- Food-safety and allergy output still requires user verification.
- Image licensing and team permission for original Office reports need confirmation before public release.

## Next evaluation step

Run all variants on the same committed assets, record the repository commit and provider response model, preserve both raw and normalized output, apply the frozen rubric with two reviewers, and report inter-rater disagreements separately from programmatic validator results.
