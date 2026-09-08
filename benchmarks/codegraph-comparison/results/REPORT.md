# Pilot Results

## Scope

This pilot compares RepoBrain `b0ebc36` with CodeGraph `1.5.0` on pinned
checkouts of VERL and Excalidraw. OpenClaw was attempted but excluded from the
paired result because corporate endpoint controls killed Node processes in that
checkout.

Each reported cold-build value is one run on an Apple M5 laptop with 16 GiB of
RAM. Treat it as directional, not statistically stable.

## Cold Build

| Repository | Tool | Wall time | Max RSS | Index size | Coverage result |
|---|---|---:|---:|---:|---|
| VERL | RepoBrain scan-only | 9.24s | 82.95 MiB | 7.36 MiB | 1150 scanned; 298 semantic files |
| VERL | CodeGraph | 5.40s | 619.63 MiB | 41.21 MiB | 767/767 supported source files |
| Excalidraw | RepoBrain scan-only | 14.44s | 139.70 MiB | 5.26 MiB | 1249 scanned; 264 semantic files |
| Excalidraw | CodeGraph | 3.02s | 1079.61 MiB | 47.78 MiB | 681 indexed files; 677 matched by the benchmark extension filter |

On these two repositories, CodeGraph was 1.7x to 4.8x faster. RepoBrain used
7.5x to 7.7x less peak RSS and 5.6x to 9.1x less disk.

The resource difference buys different coverage. CodeGraph indexed every
supported VERL source file. RepoBrain scanned almost every tracked file, but its
semantic graph is capped at 300 files by `_MAX_SEMANTIC_FILES`, resulting in
about 39% semantic-source coverage on both paired repositories.

Raw node and edge totals are intentionally omitted from the comparison table:
the products model different node and edge types.

## CodeGraph-Only Retrieval

Two independent subagents were restricted to CodeGraph CLI commands:

| Repository | Questions | Expected files | Expected symbols | Commands | Cumulative CLI time |
|---|---:|---:|---:|---:|---:|
| VERL | 3 | 7/7 | 12/12 | 30 | 8.92s |
| Excalidraw | 3 | 6/6 | 8/8 | 21 | 7.18s |

CodeGraph recovered all pilot answer atoms. It did not consistently achieve the
advertised one-call workflow: the subagents used 3 to 12 CLI calls per
question. Dynamic Ray calls, TypeScript re-exports, private callbacks, and
anonymous test blocks required additional disambiguation.

The stricter one-call `codegraph explore` track produced:

| Repository | Expected-file recall | Expected-symbol recall | Query latency range |
|---|---:|---:|---:|
| VERL | 4/7 (57.1%) | 12/12 (100%) | 0.33s-0.68s |
| Excalidraw | 1/6 (16.7%) | 0/8 (0%) | 0.38s-0.59s |

The Excalidraw prompts ranked generic symbols such as `render`, `canvas`, and
`Collaborator` ahead of the requested private or re-exported symbols. Iterative
querying recovered the expected atoms, but one natural-language call did not.

## Focused Ceiling Retrieval

The four-file VERL ceiling track compares both products at full query
capability. RepoBrain's generated knowledge was copied to a source-free
workspace before querying, so its answer agent could not bypass the knowledge
store by reading source code.

| Tool | Expected files | Expected symbols | Query commands | Query time |
|---|---:|---:|---:|---:|
| RepoBrain ceiling | 7/7 | 12/12 | 3 | 73.494s-161.729s per question |
| CodeGraph | 7/7 | 12/12 | 9 | not captured in this run |

RepoBrain's ceiling build took 365.66 seconds, used 102.56 MiB peak RSS, and
produced about 300 KiB of knowledge artifacts. CodeGraph's focused index
contained 178 nodes and 331 edges in about 876 KiB.

Both tools reached full answer-atom recall. Their operating models differ:
RepoBrain pays a large up-front model cost to produce compact, answer-oriented
knowledge and then returns synthesized answers. CodeGraph builds quickly and
returns precise graph/source context, while the outer agent performs more
iterative retrieval and synthesis.

An expanded 15-question depth test retained 100% atom recall for both products:
23/23 expected files and 57/57 expected symbols. RepoBrain averaged 106.78
seconds per successful answer and had two transient host JSON parse failures.
CodeGraph's 12 newly timed questions averaged 0.73 seconds of CLI time and had
no command failures. See `expanded-question-report.md` for the complete
question-by-question table and grounded answer summaries.

## Current Main Host-Runner Defect

The public RepoBrain generic host-runner refresh still returns exit code 2 and
does not promote a generation:

1. `_write_host_runner_git_insights()` writes deterministic Git insights.
2. The same branch unconditionally records `git_insights` as `partial`.
3. Any `partial` stage makes the overall refresh `partial`.
4. The generation entry removes every candidate whose overall status is not
   `success`.

The ceiling harness changes only this final status after verifying that every
other stage and module succeeded and that the failure list is empty. This
measures the intended strongest state but must not be described as unmodified
current-main behavior.

## OpenClaw Observation

RepoBrain stopped at its default 5000-file scan limit on a 33871-file checkout:

- wall time: 410.14s
- max RSS: 2.23 GiB
- index size: 603.20 MiB
- semantic files: 165 of 28470 files matching the benchmark's supported-source
  extension filter

This result is incomplete and should not be compared against another product.
CodeGraph could not be run because the local corporate endpoint policy killed
Node processes operating on the OpenClaw checkout.

## Current Conclusions

1. CodeGraph is substantially faster and builds a much denser static graph on
   the two paired repositories.
2. RepoBrain's scan-only index is substantially smaller and lighter on memory.
3. RepoBrain's default 300-file semantic cap is a material coverage limitation
   on repositories of this size.
4. CodeGraph's graph still misses some dynamic relationships, so agents may
   need multiple graph queries and indexed source slices.
5. In the focused ceiling test, answer-atom recall is tied at 100%. CodeGraph
   wins decisively on build and retrieval speed; RepoBrain produces a much
   smaller answer-oriented knowledge store and direct synthesized answers.
6. RepoBrain should fix the generic host-runner promotion defect before this
   ceiling result can be reproduced through the unmodified public workflow.

See `PROTOCOL.md` for the full evaluation design and
`codegraph-agent-pilot.md`, `focused-query-pilot.md`, and
`expanded-question-report.md` for question-level observations.
