# FreshLoop

FreshLoop is a team-built food-inventory and meal-planning prototype that turns a confirmed pantry state into constrained recipe suggestions, shopping gaps, reminders, and post-meal stock updates.

[Live demo](https://fresh-loop-liard.vercel.app/) · [Product case study](docs/product-case-study.md) · [Architecture](docs/architecture.md) · [Evaluation evidence](evaluation/README.md)

> **Current status:** the web demo was reachable on 24 September 2026. The repository contains the application, deterministic safeguards, a DeepSeek-backed generation pipeline, and a frozen 20-case evaluation suite. A live AI run still depends on external credentials and services.

![FreshLoop product loop](assets/product-flow.png)

## My contribution and team context

FreshLoop is a team project. My documented contribution covers:

- problem definition;
- product success criteria;
- context and retrieval design;
- the frozen 20-case evaluation dataset.

The repository does not establish authorship for individual code files, so implementation is described as team work. See the [case study](docs/product-case-study.md) for the product decisions and the boundary between documented contribution and team output.

## User problem

People often know what food they own but still struggle to decide what to cook before it expires. Inventory is incomplete, dates are uncertain, preferences conflict, and a recipe can be unusable when it ignores quantity, time, allergies, or what is actually available.

FreshLoop keeps the user in the loop: image, receipt, package-label, or text intake first becomes an editable draft; confirmed inventory and profile constraints then guide meal suggestions; stock changes only after the user confirms that a planned meal was cooked.

## How it works

1. **Capture and review.** `/api/analyze-inventory` sends text or an image to DeepSeek and normalizes candidates. Low-confidence or weakly grounded fields stay reviewable rather than being silently saved.
2. **Build context.** The planner combines confirmed inventory, profile constraints, freshness and priority calculations, deterministic keyword selection over 12 curated recipe cards, 21 structured ingredient records, and optional live Xiachufang search results.
3. **Generate and validate.** DeepSeek returns four structured recipes. Application code checks inventory feasibility, allergies, dislikes, dietary rules, expired items, requested time, duplicates, and required output conditions. A failed set can be regenerated up to three attempts.
4. **Plan and reconcile.** Selecting “Cook today” creates a plan. Inventory changes only after the user confirms cooking and reviews actual usage.

This is retrieval-augmented context assembly, but it is **not an embedding or vector-database RAG system**. The curated recipe-card retrieval is deterministic keyword matching; ingredient guidance is structured lookup with fallback rules; Xiachufang retrieval is live HTML search and may return no candidates.

See [architecture.md](docs/architecture.md) for the data flow and links to the implementation.

## Evaluation and findings

The supplied materials include the original frozen cases T01–T20: five inventory-intake cases and fifteen meal-planning cases. Their IDs, inputs, and expected-behaviour statements remain in [`evaluation/cases/formal-20.json`](evaluation/cases/formal-20.json).

| Evidence | What it supports | What it does not prove |
|---|---|---|
| Historical manual A/B/C scorecard | A: 7.57/20 (8 cases); B: 17.29/20 (17 cases); baseline C: 12.86/20 (13 cases) | The variants were not fully comparable: T03 used a replacement image only for C. Manual review was not independently replicated here. |
| Supplied C release batch, 4 Sep 2026 | 20/20 executions reached `SUCCESS` and the production validator passed; T10, T11, and T18 regenerated once | Validator pass is not the same as a manual 20/20 against every expected behaviour. |
| This repository check | 60 unit tests, fixture loading, production build, and local HTTP startup passed; see [verification notes](docs/verification.md) | No new paid/provider-backed model evaluation was run during portfolio cleanup. |

The public-safe evidence manifest preserves the supplied batch metadata, per-case status, validator result, regeneration count, timing, and a SHA-256 reference to the private raw result file. See [historical evidence](evaluation/results/historical-evidence.md).

## Run locally

Requirements: Node.js 20.19+ or 22.12+ and npm (Vite 7 requirement).

```bash
npm ci
npm test
npm run dev
```

Open the URL printed by Vite. Without Supabase configuration, use **“Enter demo”** or the local OTP `123456`; state is stored in the browser. The interface can be explored without remote auth, but live ingredient analysis and recipe generation require `DEEPSEEK_API_KEY` in an ignored `.env.local` file.

```bash
cp .env.example .env.local
# Add only the services you intend to exercise.
npm run dev
```

Optional integrations are documented in [`.env.example`](.env.example): Supabase for auth/profile persistence, Twilio for SMS reminders, and a cron secret for reminder jobs. Never commit `.env.local`.

Useful verification commands:

```bash
npm test
npm run build
npm run eval:c -- --list
```

A real Variant C run calls the configured model provider and writes ignored raw evidence under `evaluation/outputs/`:

```bash
npm run eval:c -- --formal-only
```

## Limitations and next steps

- The live demo and full evaluation depend on external services, provider model aliases, credentials, rate limits, and Xiachufang availability.
- The historical A/B/C scoring is a supplied manual assessment, not a blinded or independently reproduced study.
- The validator is useful but incomplete: the baseline scorecard records cases where a validator-passing output still missed an expected behaviour.
- The pipeline normalizes model output before validation; for example, it can add requested chilli metadata. Evaluation should distinguish raw model output from normalized user-visible output.
- Recipe images can come from third-party sources. Their licences need an asset-by-asset review before broader public or commercial reuse.
- Food-safety and allergy checks reduce obvious failures but do not replace label checks or professional advice.
- A future evaluation should rerun A, B, and C on identical assets, pin provider versions where possible, publish a scoring protocol, and use a second reviewer.

No licence was added during this cleanup because the supplied materials did not establish the team's chosen open-source terms.
