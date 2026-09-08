# RepoBrain vs CodeGraph latest-v2 full report

Date: 2026-09-09

## Conclusion

RepoBrain wins the four-repository main track. It has higher blind-judge
semantic accuracy, no query runtime failures, lower scored query wall time,
and substantially lower query token usage. CodeGraph wins cold indexing by a
very large margin and is the only product that produced usable results on the
Grafana stress repository.

These are benchmark-specific results for the pinned repositories, questions,
Trae CLI, and observed model route below. They are not a universal product
ranking.

## Locked setup

- RepoBrain: `2f8419a1f520c375ad91550395217376cd725d40`
- CodeGraph: `1.6.0` (`dfccdf62547fcd76d343344d823a0e1998d3a89f`)
- Requested model: `Seed-2.1-Turbo`
- Observed route: `Seed-2.1-Turbo -> seed-code-pro`
- Track: `unrestricted_native`; both products could use their native
  integration and inspect the same pinned source tree.
- Repetitions: 3 per question, single concurrency.
- Main track: Flask, ripgrep, Vite, and Prometheus; 20 questions, 120 product
  runs.
- Stress track: Grafana; 3 questions, 18 product run slots.

## Main-track result

| Metric | RepoBrain | CodeGraph + Trae | Winner |
|---|---:|---:|---|
| Blind-judge weighted semantic accuracy | **95.83%** | 84.17% | RepoBrain |
| Correct / partial / incorrect | **55 / 5 / 0** | 48 / 5 / 7 | RepoBrain |
| Successful query runs | **60/60** | 53/60 | RepoBrain |
| Evidence-mention recall | 297/396 (75.0%) | **316/396 (79.8%)** | CodeGraph |
| Scored query wall time | **5,106.67 s** | 20,621.14 s | RepoBrain |
| Query tokens | **22,326,315** | 86,027,974 | RepoBrain |
| Cold index wall time | 7,420.63 s | **9.58 s** | CodeGraph |
| Index + scored query wall time | **12,527.30 s** | 20,630.72 s | RepoBrain |

RepoBrain used about 74.0% fewer query tokens and its scored query runs were
about 4.04x faster. After adding the successful cold-index builds, RepoBrain's
measured total was about 1.65x faster for this 60-query workload. RepoBrain's
cold indexing alone was about 2 hours 4 minutes, while CodeGraph's was about
10 seconds.

### Semantic accuracy by repository

| Repository | RepoBrain | CodeGraph + Trae | Result |
|---|---:|---:|---|
| Flask | **100.00%** | 90.00% | RepoBrain |
| ripgrep | 93.33% | **96.67%** | CodeGraph |
| Vite | **93.33%** | 56.67% | RepoBrain |
| Prometheus | **96.67%** | 93.33% | RepoBrain |

The large Vite gap is driven partly by six CodeGraph non-success runs in the
final scored dataset. Per protocol, runtime failures and product-bypass
violations remain in the semantic-accuracy denominator as incorrect.

### Cold index time by repository

| Repository | RepoBrain | CodeGraph |
|---|---:|---:|
| Flask | 489.75 s | 0.94 s |
| ripgrep | 541.27 s | 1.04 s |
| Vite | 2,906.91 s | 2.81 s |
| Prometheus | 3,482.70 s | 4.80 s |

Vite and Prometheus required deterministic `map.md` fallback after some Map
Agent batches timed out. The resulting generations were promoted with explicit
warnings under the public RepoBrain workflow.

## Grafana stress track

RepoBrain's public full refresh did not produce an active generation. One
module group failed, and the repository's `public_app` alone expanded to 367
agent groups. The refresh was stopped after the failure made promotion
impossible; all nine RepoBrain answer slots are therefore `unavailable`.

| Metric | RepoBrain | CodeGraph + Trae |
|---|---:|---:|
| Blind-judge weighted semantic accuracy | 0.00% | **83.33%** |
| Successful query runs | 0/9 | **8/9** |
| Correct / partial / incorrect | 0 / 0 / 9 | **7 / 1 / 1** |
| Query tokens | unavailable | 24,067,713 |
| Query wall time | unavailable | 3,717.17 s |
| Cold index wall time | unavailable | 67.88 s |

The stress-track result is a clear CodeGraph win. RepoBrain's 0% is a runtime
availability penalty, not a judgment that its absent answers contained wrong
facts.

## Judge audit

The judge used a two-stage source-grounded process:

1. Extract 5-12 relationship facts and citations from a clean pinned source
   checkout.
2. Grade anonymized, deterministically shuffled answers using only that ground
   truth and no tools.

For the main track, 113 successful answers were judged and 7 runtime failures
were automatically penalized. Ground-truth extraction used 7,947,211 tokens;
grading used 880,748 tokens. These judge tokens are reported separately and
are not included in either product's query-token total.

## Limitations

- Monetary cost is unavailable because Trae JSONL did not emit a price. Token
  usage is reported instead.
- RepoBrain index-generation token usage was not exposed by the refresh
  pipeline, so query tokens are comparable but complete build-token cost is
  unavailable.
- Times above use the final scored attempt for each slot. Earlier failed
  attempts and harness-debug retries are not included in the scored totals.
- Evidence-mention recall is not semantic correctness; the blind-judge result
  is the semantic metric.
- A different model, repository revision, question set, timeout, or concurrency
  can change the outcome.
