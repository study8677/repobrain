# RepoBrain vs CodeGraph Benchmark

## Latest v2 multi-repository suite

The v2 suite preserves the original VERL/Excalidraw pilot below and adds a
manifest-driven comparison over pinned releases of Flask, Vite, ripgrep,
Prometheus, and Grafana. Grafana is a stress track and must be reported
separately from the four-repository main track.

The suite pins RepoBrain and CodeGraph as well as every corpus revision. It
builds each product from an independent worktree. The default
`unrestricted_native` track models normal IDE use: both agents can read the
same pinned source tree and use their product's native integration without a
command budget. The optional `source_free` track isolates retrieval indexes.
Every run is stored below
`results/runs/<run-id>/<track>/<repository>/repeat-<n>/<product>/`.

Start with the Flask smoke test:

```bash
bash benchmarks/codegraph-comparison/scripts/bootstrap.sh --repository flask

benchmarks/codegraph-comparison/.work/v2/tools/repobrain-venv/bin/python \
  benchmarks/codegraph-comparison/scripts/prepare_corpora.py \
  --repository flask

benchmarks/codegraph-comparison/.work/v2/tools/repobrain-venv/bin/python \
  benchmarks/codegraph-comparison/scripts/run_benchmark_v2.py \
  --run-id flask-unrestricted-smoke \
  --track unrestricted_native \
  --repository flask \
  --limit 1 \
  --workers 1 \
  --restart

benchmarks/codegraph-comparison/.work/v2/tools/repobrain-venv/bin/python \
  benchmarks/codegraph-comparison/scripts/render_benchmark_v2_report.py \
  benchmarks/codegraph-comparison/results/runs/flask-unrestricted-smoke/unrestricted_native/results.json \
  benchmarks/codegraph-comparison/results/runs/flask-unrestricted-smoke/unrestricted_native/report.md
```

For a formal main-track run, prepare the four non-stress repositories and use
`--repeat 3 --workers 1`. Run Grafana under a different run id. Compare final
evidence correctness, total wall time, and Trae token usage. Monetary cost is
reported only when Trae emits it; otherwise it remains explicitly unavailable.
For `source_free`, a generated corpus manifest records that source files are
absent from the query directory; this is auditable isolation, not an
OS/container security boundary.

The v2 entrypoints are:

- `config/manifest-latest-v2.json`: tool and corpus pins
- `config/questions-v2.json`: 23 repository-specific questions
- `scripts/bootstrap.sh`: pinned tool/worktree setup
- `scripts/prepare_corpora.py`: public index builds and source-free publication
- `scripts/run_benchmark_v2.py`: repeated fair-E2E runner
- `scripts/render_benchmark_v2_report.py`: multi-repository report

## Legacy pilot

The legacy files contain the original historical comparison of:

- RepoBrain `main` at `b0ebc36b611305dcbdda7343fc8e0136fa7f2686`
- CodeGraph `1.5.0`

The primary corpora are:

- `verl-project/verl` at `8f8b122195ecf43475679fb6ee0204ee33f387c5`
- `excalidraw/excalidraw` at `4a6f4e7a32ce3d3360d4d209d14105acc144d8c7`

OpenClaw was also attempted at
`1e6844b71aa2299c082d23cf66dce38ff00b2211`. Its CodeGraph run is excluded
because a corporate endpoint policy terminated Node processes operating on an
OpenClaw checkout. The RepoBrain result is retained only as a scalability
observation, not as a paired comparison.

## Layout

- `config/manifest.json`: pinned tool, repository, and machine versions
- `config/questions.json`: shared pilot question set and answer atoms
- `PROTOCOL.md`: comparison rules and metric definitions
- `scripts/`: repeatable index and query commands
- `results/`: normalized summaries and reports
- `.work/`: ignored third-party checkouts, virtual environments, and indexes

## Run

From the repository root:

```bash
bash benchmarks/codegraph-comparison/scripts/bootstrap.sh
bash benchmarks/codegraph-comparison/scripts/run_index_benchmark.sh
bash benchmarks/codegraph-comparison/scripts/run_retrieval_benchmark.sh
```

The scripts do not install anything globally. CodeGraph telemetry and update
checks are disabled for benchmark runs.

The historical results separate behavior of their pinned RepoBrain commit from
a ceiling track. That old commit marked deterministic host-runner Git insights
`partial` and removed the unpromoted generation. Current RepoBrain fixed the
public full-refresh path; do not mix the old report with latest-v2 results.

The detailed 15-question accuracy table is in
`results/expanded-question-report.md`.

## Interpretation

RepoBrain scan-only and CodeGraph index different semantic units. Their raw
node and edge counts are therefore descriptive, not directly comparable.
Compare:

- cold build wall time and peak RSS
- index disk size
- indexed-file coverage relative to tracked source files
- retrieval answer-atom recall and citation validity
- output size and query latency
- explicit incremental update time and freshness

Do not collapse these dimensions into one score.
