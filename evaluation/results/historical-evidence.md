# Historical evaluation evidence

This page records what can be verified from the files supplied for portfolio cleanup. It distinguishes manual scoring from programmatic execution status.

## Source A: manual A/B/C scorecard

Supplied file: `ABC_Evaluation_Scorecard_Bilingual.xlsx`  
Generated in the source workbook: 4 September 2026  
Assessment method: manual strict review of final user-visible outputs and C logs; each applicable case was scored PASS = 1 or FAIL = 0 against expected behaviour. Each of four metric groups was normalized to five points.

| Metric | A | B | C baseline | Maximum |
|---|---:|---:|---:|---:|
| M1 Inventory Grounding & Consistency | 3.57 | 4.29 | 2.86 | 5 |
| M2 Safety & Hard-Constraint Compliance | 0.00 | 5.00 | 4.00 | 5 |
| M3 Freshness-Aware Waste Reduction | 1.00 | 3.00 | 3.00 | 5 |
| M4 Recipe Quality & Context Compliance | 3.00 | 5.00 | 3.00 | 5 |
| **Total** | **7.57** | **17.29** | **12.86** | **20** |

| Variant | Passed cases | Successful executions |
|---|---:|---:|
| A | 8/20 | 19/20 |
| B | 17/20 | 19/20 |
| C baseline | 13/20 | 19/20 |

Limitations recorded in the source:

- T03 is not fully comparable: A and B failed because the image was missing; C used a later user-supplied replacement.
- A and B used prompt-template configurations; C used the full product pipeline.
- Scoring was manual and was not independently replicated during this cleanup.
- The Office source contains private local file paths and its public-distribution permission is not established, so it is not included in this repository.

The baseline detail also shows why validator pass and expected-behaviour pass must remain separate. For example, the scorecard records a C output for T08 that included chicken despite a vegetarian profile and a T14 output that excluded expired yogurt but omitted the required past-date warning; both production validator runs were recorded as passing.

## Source B: later Variant C release batch

Supplied batch: `20260904T025840Z`  
Evaluation version: `variant-c-harness-v1.0`  
Run timestamp in supplied metadata: 4 September 2026  
Formal AI flag: `true`

The supplied batch contains 20 results. Every case has `status: SUCCESS` and a passing production validator. T10, T11, and T18 each record one regeneration; the other cases record zero. The batch metadata and a compact per-case record are in [`c-release-2026-09-04/manifest.json`](c-release-2026-09-04/manifest.json).

The manifest was derived without rescoring from the supplied private `results.json`. Its recorded source SHA-256 is:

```text
df66900a6c9e452f07431e4e8a554071d7f859d06f2fdaa51bfbc5a71d3f6d01
```

The full 2.1 MB raw result contains prompts, model responses, and execution traces. It remains in the supplied private archive rather than this public portfolio copy. The hash provides a stable provenance reference.

## Source C: failed earlier batch

The supplied archive also contains batch `20260903T154046Z`. Its metadata reports 20 results and zero successes; all cases ended in `SYSTEM_ERROR`, primarily `fetch failed`. It is retained as private diagnostic history and is not presented as a model-quality baseline because the pipeline did not complete.

## Evidence produced during portfolio cleanup

No new provider-backed evaluation was run. Local tests, build, fixture listing, secret scanning, and the live-demo availability check are reported separately in the repository README and delivery notes.
