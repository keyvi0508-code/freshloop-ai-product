# FreshLoop architecture

This document describes the supplied implementation. Proposed improvements are listed separately.

## Current system

```mermaid
flowchart LR
    U[User] --> UI[Vite browser app]
    UI --> LS[(localStorage)]
    UI -. optional auth/profile .-> SB[Supabase]
    UI --> IA[/api/analyze-inventory]
    IA --> DS1[DeepSeek vision/text]
    DS1 --> N[Candidate normalization]
    N --> HR[Human review]
    HR --> LS

    UI --> RP[/api/generate-recipe]
    RP --> F[Freshness, priority, and constraint prefilter]
    F --> RK[12-card keyword retrieval]
    F --> IK[21-record ingredient lookup]
    F -. optional .-> XF[Xiachufang HTML search]
    RK --> P[Prompt assembly]
    IK --> P
    XF --> P
    P --> DS2[DeepSeek recipe generation]
    DS2 --> NM[Output normalization]
    NM --> V[Deterministic validation]
    V -->|fail, up to 3 attempts| P
    V -->|pass| R[Four recipe options]
    R --> PM[Planned meal]
    PM --> C[User confirms cooking and usage]
    C --> LS
    PM -. optional reminder .-> TW[Supabase jobs and Twilio]
```

## Module map

| Area | Implementation | Responsibility |
|---|---|---|
| Browser application | [`src/main.js`](../src/main.js), [`src/state/store.js`](../src/state/store.js) | UI, local state, review flows, planning, and user confirmation |
| Client API boundary | [`src/services/ai.js`](../src/services/ai.js) | Calls generation, ingestion, guidance, translation, and image endpoints |
| Vercel entrypoints | [`api/`](../api/) | Thin exports for server handlers |
| Inventory intelligence | [`server/api/analyze-inventory.js`](../server/api/analyze-inventory.js) | Builds multimodal/text prompt, calls DeepSeek, filters and normalizes candidates |
| Recipe planner | [`server/api/generate-recipe.js`](../server/api/generate-recipe.js) | Prefilter, context assembly, generation, normalization, validation, bounded retry |
| Model client | [`server/api/_deepseek.js`](../server/api/_deepseek.js) | Authenticated structured DeepSeek request and error handling |
| Recipe context | [`server/rag/recipeKnowledge.js`](../server/rag/recipeKnowledge.js) | Selects up to six of 12 curated cards with lowercase keyword matching and policy boosts |
| External recipe candidates | [`server/rag/xiachufang.js`](../server/rag/xiachufang.js) | Fetches and parses public search HTML, ranks candidates, caches for 45 minutes |
| Ingredient knowledge | [`src/data/ingredientKnowledge.js`](../src/data/ingredientKnowledge.js) | 21 records plus exact/substring lookup and category fallback rules |
| Domain safeguards | [`src/services/domain.js`](../src/services/domain.js) | Constraint aliases, expiry checks, recipe validation, shopping gaps, stock mutation |
| Freshness and priority | [`src/services/inventoryPipeline.js`](../src/services/inventoryPipeline.js), [`src/services/priority.js`](../src/services/priority.js) | Derives dates and use-soon ordering |
| Remote persistence | [`src/services/auth.js`](../src/services/auth.js), [`supabase/`](../supabase/) | Optional Supabase OTP/profile/meal persistence |
| SMS | [`server/api/_sms.js`](../server/api/_sms.js), [`server/api/run-reminders.js`](../server/api/run-reminders.js) | Optional Twilio delivery and reminder job processing |
| Evaluation | [`evaluation/run-c.js`](../evaluation/run-c.js) | Runs the same exported ingestion and planning functions against isolated fixtures |

## Inventory intake

`runInventoryIntelligence()` accepts a capture type and either manual text or a base64 image. It calls `deepseek-v4-flash-vision-exp`, requests structured JSON, then normalizes candidates. Items below the production confidence/grounding threshold are not returned as confident candidates. The UI still requires confirmation before writing inventory.

This path needs `DEEPSEEK_API_KEY`. Without it, the rest of the local demo remains browsable but live recognition fails with a configuration error.

## Recipe planning

`runRecipePlanner()` first removes inventory that is expired, incompatible with the profile, or infeasible under a short time limit. It then assembles retrieved context and requests four JSON recipes from `deepseek-v4-flash`.

Parsed output is normalized before validation. The validator rejects the set when it finds recipe-level domain failures or set-level failures such as a wrong count, duplicate names, too many core ingredients, a missing required chilli condition, undisclosed shortage, missing expired-item warning, or failure to use a suitable use-soon item. Validation errors are supplied to the next attempt, up to three attempts.

The exact number of checks depends on the recipe and request. The code should not be summarized as a fixed “11-check validator.”

## What “retrieval” means here

| Source | Actual mechanism | Current evidence |
|---|---|---|
| Recipe knowledge | `query.includes(keyword)` scoring over 12 curated cards | Deterministic and covered by source/tests |
| Ingredient knowledge | Structured name matching plus fallback rules over 21 records | Deterministic and local |
| Xiachufang | Live search-page fetch, HTML parsing, ranking, and cache | External, optional, and availability-dependent |

There are no embeddings, vector indexes, semantic nearest-neighbour queries, or vector-store dependencies in this snapshot.

## Storage and service boundaries

The default demo is local-first: state is persisted in browser `localStorage`. Supabase settings enable remote phone authentication and selected profile/meal persistence. Twilio and scheduled reminder jobs require server-side credentials. These optional services are represented in [`.env.example`](../.env.example).

## Evaluation isolation

The Variant C harness imports production functions rather than duplicating recipe logic. Each fixture starts from a new in-memory profile and inventory state. It logs prompts, raw responses, normalized output, validator results, regeneration count, and timing. Generated raw output is ignored by Git by default because it can be large and may contain sensitive experiment inputs.

## Future work

- add a versioned, locally cached external-retrieval fixture for reproducible evaluation;
- separate raw-model, normalized, validated, and user-edited outcomes in product analytics;
- add explicit validator coverage for every frozen product criterion;
- pin commit identifiers and returned provider model IDs in future formal batches;
- add a rights-reviewed first-party recipe-image set.
