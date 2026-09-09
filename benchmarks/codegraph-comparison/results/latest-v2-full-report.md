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

## Detailed benchmark rules

### Version and corpus locks

| Component | Locked version |
|---|---|
| RepoBrain | `2f8419a1f520c375ad91550395217376cd725d40` (`engine 0.3.2 / cli 2.0.2`) |
| CodeGraph | `1.6.0`, npm git head `dfccdf62547fcd76d343344d823a0e1998d3a89f` |
| Trae CLI | `0.201.1-alpha.9` |
| Requested answer/Judge model | `Seed-2.1-Turbo` |
| Observed served model | `seed-code-pro` |
| Flask | `3.1.3` / `22d924701a6ae2e4cd01e9a15bbaf3946094af65` |
| ripgrep | `15.2.0` / `e89fff89ac9af12e8d4ce9d5fd07beb408ca730f` |
| Vite | `8.0.16` / `f94df87ff03b40b65e29bacdc04cc18c7bccaa4a` |
| Prometheus | `3.14.0` / `d7598b7141418fa35be2b5ec5d0fefb634199610` |
| Grafana | `13.2.1` / `56cd3e9288d8255fecebe5d05b48d191f50674b5` |

Every product received an independent detached worktree at the same locked
repository SHA. Generated `.repobrain` and `.codegraph` data were kept out of
the other product's worktree.

### Unrestricted-native execution rules

1. Both answer agents could inspect the pinned source tree and use their
   product's native integration. This models normal IDE use, not pure
   source-free retrieval.
2. RepoBrain had to build a public full-refresh active generation and answer
   through `rb-ask` with the local Trae host runner.
3. The CodeGraph-side agent had to invoke the CodeGraph CLI at least once.
   There was no maximum command count, and direct source inspection for
   verification was allowed. A run with zero observed CodeGraph calls was a
   `protocol_violation`.
4. Both products ran with a read-only sandbox and were instructed not to
   modify source.
5. Each question ran three times for each product with `workers=1`.
6. The outer per-answer timeout was 600 seconds. Trae shell commands had a
   120-second tool timeout.
7. Results were isolated by run id, repository, repeat, and product. Successful
   slots were retained across resume; non-success slots received one scored
   retry. A second non-success result was final.
8. Grafana was a separate stress track and was not averaged into the main
   four-repository ranking.

### Evidence-mention recall

The automatic evidence metric was computed per answer as:

`(matched expected files + matched expected symbols) / (all expected files + all expected symbols)`

- An expected file matched only when `sources` contained its complete
  repository-relative path and that path existed at the locked SHA.
- Basenames, absolute paths, `..` traversal, and paths mentioned only in the
  answer prose did not count.
- An expected symbol matched only at an identifier boundary in the answer or
  sources. Substring matches such as `run` inside `runtime` did not count.
- This metric measures evidence mention, not whether the described execution
  order, conditions, or relationships are correct.

### Two-stage semantic blind judge

For every question:

1. A Ground Truth agent inspected a clean pinned checkout with no product
   index and produced 5-12 atomic relationship facts, citations, and common
   errors.
2. All successful product answers were anonymized and shuffled with fixed seed
   `20260908` using the repository/question identity.
3. A separate grading call received only the Ground Truth and anonymous
   answers. It was forbidden from using tools or reading files and judged each
   answer independently, without ranking candidates, guessing the product, or
   rewarding verbosity.

The grading dimensions were:

- Verdict: `correct`, `partially_correct`, or `incorrect`.
- Factuality: `accurate`, `minor_errors`, or `major_errors`.
- Completeness: `complete`, `partial`, or `incomplete`.
- Citation validity: `valid`, `partially_valid`, `invalid`, or `no_citations`.
- The Judge also recorded concrete unsupported claims and a reason.

Weighted semantic accuracy was:

`(correct * 1 + partially_correct * 0.5 + incorrect * 0) / all planned answer slots`

### Failure and availability policy

- Timeout, crash, malformed/empty output, protocol violation, and unavailable
  prerequisite remained in the denominator.
- Every non-success slot received the automatic semantic penalty
  `incorrect / major_errors / incomplete / invalid`.
- A RepoBrain run was eligible only if `.repobrain/current.json` pointed to an
  existing generation whose `head_sha` matched the locked source revision.
  An aborted staging directory was not considered a valid index.
- If the public build could not create that prerequisite, the answer was
  `unavailable`. This is an end-to-end availability penalty, not a claim that
  a nonexistent answer contained false facts.
- Evidence recall for an unavailable answer is shown as zero in aggregate
  end-to-end tables, while semantic availability explicitly records the
  automatic failure penalty.

### Time, tokens, and cost

- Query wall time is the sum of the final scored attempt for every slot;
  failed runs with measured time remain included.
- Cold-build time is reported separately. RepoBrain public full refresh builds
  model-generated repository knowledge, while CodeGraph `init` builds a static
  graph. These artifacts are not semantically equivalent, so the cold-build
  figures describe user-perceived prerequisite cost rather than pure
  like-for-like indexing speed.
- Trae usage came from `turn.completed`: input, cache-creation input, cached
  input, output, and reasoning-output tokens were retained. The report's
  `total_tokens` is input plus output; cached and reasoning fields are reported
  separately in raw results.
- Product query tokens exclude Judge tokens. RepoBrain refresh did not expose
  index-generation tokens, so complete build-token cost is unavailable.
- Monetary cost was accepted only from explicit `total_cost_usd` or `cost_usd`
  runtime fields. No amount was emitted, so monetary cost remains unavailable.

## Per-question three-repeat results

`C/P/I` means correct / partially correct / incorrect from the semantic Judge.
Evidence is the summed evidence-mention score across three repeats. Mean time
includes the final scored attempt; tokens are the available final-attempt
query tokens.

| Question | Product | C/P/I | Evidence | Success | Mean s | Tokens |
|---|---|---:|---:|---:|---:|---:|
| `flask-blueprint-registration` | RepoBrain | 3/0/0 | 12/15 | 3/3 | 58.92 | 695,581 |
| `flask-blueprint-registration` | CodeGraph | 3/0/0 | 13/15 | 3/3 | 110.25 | 1,200,067 |
| `flask-cli-app-loading` | RepoBrain | 3/0/0 | 12/15 | 3/3 | 52.39 | 476,482 |
| `flask-cli-app-loading` | CodeGraph | 2/1/0 | 14/15 | 3/3 | 139.00 | 1,649,117 |
| `flask-context-lifecycle` | RepoBrain | 3/0/0 | 12/15 | 3/3 | 54.40 | 778,637 |
| `flask-context-lifecycle` | CodeGraph | 3/0/0 | 14/15 | 3/3 | 103.30 | 958,504 |
| `flask-request-dispatch` | RepoBrain | 3/0/0 | 15/18 | 3/3 | 56.62 | 634,937 |
| `flask-request-dispatch` | CodeGraph | 2/1/0 | 15/18 | 3/3 | 112.11 | 1,185,963 |
| `flask-session-cookie` | RepoBrain | 3/0/0 | 9/12 | 3/3 | 53.42 | 769,934 |
| `flask-session-cookie` | CodeGraph | 2/1/0 | 11/12 | 3/3 | 90.73 | 986,298 |
| `ripgrep-argument-normalization` | RepoBrain | 3/0/0 | 15/24 | 3/3 | 84.79 | 1,072,105 |
| `ripgrep-argument-normalization` | CodeGraph | 3/0/0 | 21/24 | 3/3 | 350.21 | 4,886,770 |
| `ripgrep-ignore-walk` | RepoBrain | 3/0/0 | 10/18 | 3/3 | 90.71 | 1,067,669 |
| `ripgrep-ignore-walk` | CodeGraph | 3/0/0 | 13/18 | 3/3 | 363.81 | 5,816,791 |
| `ripgrep-main-dispatch` | RepoBrain | 3/0/0 | 12/15 | 3/3 | 52.72 | 547,154 |
| `ripgrep-main-dispatch` | CodeGraph | 3/0/0 | 14/15 | 3/3 | 359.33 | 5,281,050 |
| `ripgrep-match-print` | RepoBrain | 1/2/0 | 11/18 | 3/3 | 73.57 | 1,096,504 |
| `ripgrep-match-print` | CodeGraph | 2/1/0 | 16/18 | 3/3 | 414.74 | 6,681,820 |
| `ripgrep-search-worker` | RepoBrain | 3/0/0 | 18/24 | 3/3 | 73.63 | 905,739 |
| `ripgrep-search-worker` | CodeGraph | 3/0/0 | 21/24 | 3/3 | 427.73 | 7,481,953 |
| `vite-build-orchestration` | RepoBrain | 2/1/0 | 13/15 | 3/3 | 145.11 | 2,550,243 |
| `vite-build-orchestration` | CodeGraph | 2/0/1 | 10/15 | 2/3 | 471.93 | 4,494,127 |
| `vite-dev-server-creation` | RepoBrain | 3/0/0 | 12/21 | 3/3 | 95.41 | 1,281,336 |
| `vite-dev-server-creation` | CodeGraph | 2/0/1 | 11/21 | 2/3 | 482.14 | 5,007,289 |
| `vite-hmr-propagation` | RepoBrain | 3/0/0 | 18/24 | 3/3 | 95.05 | 1,121,821 |
| `vite-hmr-propagation` | CodeGraph | 1/0/2 | 8/24 | 1/3 | 564.53 | 2,659,149 |
| `vite-plugin-ordering` | RepoBrain | 2/1/0 | 12/18 | 3/3 | 76.87 | 1,003,720 |
| `vite-plugin-ordering` | CodeGraph | 1/1/1 | 10/18 | 2/3 | 401.79 | 3,333,988 |
| `vite-transform-request` | RepoBrain | 3/0/0 | 18/24 | 3/3 | 87.88 | 979,509 |
| `vite-transform-request` | CodeGraph | 2/0/1 | 16/24 | 2/3 | 362.25 | 2,101,880 |
| `prometheus-promql-execution` | RepoBrain | 3/0/0 | 15/21 | 3/3 | 154.33 | 2,467,046 |
| `prometheus-promql-execution` | CodeGraph | 2/0/1 | 14/21 | 2/3 | 557.52 | 5,279,480 |
| `prometheus-remote-write-queue` | RepoBrain | 3/0/0 | 18/21 | 3/3 | 107.74 | 1,911,790 |
| `prometheus-remote-write-queue` | CodeGraph | 3/0/0 | 19/21 | 3/3 | 318.22 | 5,205,520 |
| `prometheus-rule-evaluation` | RepoBrain | 3/0/0 | 21/27 | 3/3 | 79.49 | 900,324 |
| `prometheus-rule-evaluation` | CodeGraph | 3/0/0 | 27/27 | 3/3 | 446.36 | 7,757,351 |
| `prometheus-scrape-lifecycle` | RepoBrain | 2/1/0 | 23/27 | 3/3 | 75.32 | 797,138 |
| `prometheus-scrape-lifecycle` | CodeGraph | 3/0/0 | 25/27 | 3/3 | 338.32 | 5,492,123 |
| `prometheus-tsdb-append` | RepoBrain | 3/0/0 | 21/24 | 3/3 | 133.85 | 1,268,646 |
| `prometheus-tsdb-append` | CodeGraph | 3/0/0 | 24/24 | 3/3 | 459.45 | 8,568,734 |
| `grafana-alert-scheduler` | RepoBrain | 0/0/3 | 0/21 | 0/3 | - | 0 |
| `grafana-alert-scheduler` | CodeGraph | 2/1/0 | 18/21 | 3/3 | 404.76 | 8,003,523 |
| `grafana-dashboard-loading` | RepoBrain | 0/0/3 | 0/30 | 0/3 | - | 0 |
| `grafana-dashboard-loading` | CodeGraph | 3/0/0 | 21/30 | 3/3 | 336.10 | 7,504,834 |
| `grafana-http-server-startup` | RepoBrain | 0/0/3 | 0/21 | 0/3 | - | 0 |
| `grafana-http-server-startup` | CodeGraph | 2/0/1 | 14/21 | 2/3 | 498.20 | 8,559,356 |

## Complete question catalog

The text below is the exact prompt sent to both products. Expected files and
symbols are the evidence-mention atoms, not the semantic Ground Truth.

### `flask-request-dispatch`

- Repository/category: `flask` / `cross_file_path`
- Question: How does Flask take a WSGI request through request preprocessing, endpoint dispatch, and response finalization? Cite the defining file and symbols for each stage.
- Expected files: `src/flask/app.py`
- Expected symbols: `wsgi_app`, `full_dispatch_request`, `preprocess_request`, `dispatch_request`, `finalize_request`

### `flask-context-lifecycle`

- Repository/category: `flask` / `lifecycle`
- Question: How do Flask's application and request contexts enter and leave their lifetimes, and which context class owns each push and pop operation? Cite file paths and symbols.
- Expected files: `src/flask/ctx.py`
- Expected symbols: `AppContext`, `RequestContext`, `push`, `pop`

### `flask-session-cookie`

- Repository/category: `flask` / `state_persistence`
- Question: How does Flask load a signed cookie into a session and save the session back to the response? Cite the concrete session interface, methods, and file.
- Expected files: `src/flask/sessions.py`
- Expected symbols: `SecureCookieSessionInterface`, `open_session`, `save_session`

### `flask-blueprint-registration`

- Repository/category: `flask` / `registration_flow`
- Question: How is a Flask Blueprint registered on an application and how do its deferred routes become application URL rules? Cite file paths and symbols.
- Expected files: `src/flask/sansio/blueprints.py`
- Expected symbols: `Blueprint`, `BlueprintSetupState`, `register`, `add_url_rule`

### `flask-cli-app-loading`

- Repository/category: `flask` / `configuration_flow`
- Question: How does the Flask CLI create its command context and locate or load the target Flask application? Cite the responsible classes, methods, and file.
- Expected files: `src/flask/cli.py`
- Expected symbols: `FlaskGroup`, `make_context`, `ScriptInfo`, `load_app`

### `ripgrep-main-dispatch`

- Repository/category: `ripgrep` / `command_dispatch`
- Question: How does ripgrep's executable entry point dispatch parsed arguments into sequential or parallel search execution? Cite file paths and symbols.
- Expected files: `crates/core/main.rs`
- Expected symbols: `main`, `run`, `search`, `search_parallel`

### `ripgrep-argument-normalization`

- Repository/category: `ripgrep` / `configuration_flow`
- Question: How are raw command-line flags parsed into LowArgs and then normalized into HiArgs before execution? Cite file paths and symbols.
- Expected files: `crates/core/flags/parse.rs`, `crates/core/flags/lowargs.rs`, `crates/core/flags/hiargs.rs`
- Expected symbols: `parse`, `parse_low`, `LowArgs`, `HiArgs`, `from_low_args`

### `ripgrep-search-worker`

- Repository/category: `ripgrep` / `dependency_mapping`
- Question: How does ripgrep turn normalized arguments into a matcher, searcher, printer, and executable search worker? Cite the construction methods, types, and files.
- Expected files: `crates/core/flags/hiargs.rs`, `crates/core/search.rs`
- Expected symbols: `matcher`, `searcher`, `printer`, `search_worker`, `SearchWorkerBuilder`, `PatternMatcher`

### `ripgrep-ignore-walk`

- Repository/category: `ripgrep` / `filtering_flow`
- Question: How does ripgrep build a parallel filesystem walk and apply gitignore matching, including parent-directory rules, while traversing entries? Cite file paths and symbols.
- Expected files: `crates/ignore/src/walk.rs`, `crates/ignore/src/gitignore.rs`
- Expected symbols: `WalkBuilder`, `build_parallel`, `GitignoreBuilder`, `matched_path_or_any_parents`

### `ripgrep-match-print`

- Repository/category: `ripgrep` / `cross_crate_path`
- Question: How is a Rust-regex matcher constructed and connected to the standard printer sink that formats matched results? Cite the key builders, sink callback, and files.
- Expected files: `crates/regex/src/matcher.rs`, `crates/printer/src/standard.rs`
- Expected symbols: `RegexMatcherBuilder`, `StandardBuilder`, `sink`, `matched`

### `vite-dev-server-creation`

- Repository/category: `vite` / `startup_flow`
- Question: How does Vite create a development server from user configuration, resolve that configuration, and assemble the active plugins? Cite file paths and symbols.
- Expected files: `packages/vite/src/node/server/index.ts`, `packages/vite/src/node/config.ts`, `packages/vite/src/node/plugins/index.ts`
- Expected symbols: `createServer`, `_createServer`, `resolveConfig`, `resolvePlugins`

### `vite-transform-request`

- Repository/category: `vite` / `plugin_pipeline`
- Question: How does a Vite development-server module request progress from transformRequest through loading and plugin resolution or transformation? Cite file paths and symbols.
- Expected files: `packages/vite/src/node/server/transformRequest.ts`, `packages/vite/src/node/server/pluginContainer.ts`
- Expected symbols: `transformRequest`, `loadAndTransform`, `EnvironmentPluginContainer`, `resolveId`, `load`, `transform`

### `vite-hmr-propagation`

- Repository/category: `vite` / `state_reconciliation`
- Question: How does Vite handle a changed file, invalidate module-graph state, and propagate HMR updates to affected modules? Cite file paths and symbols.
- Expected files: `packages/vite/src/node/server/hmr.ts`, `packages/vite/src/node/server/moduleGraph.ts`
- Expected symbols: `handleHMRUpdate`, `updateModules`, `propagateUpdate`, `EnvironmentModuleGraph`, `onFileChange`, `invalidateModule`

### `vite-build-orchestration`

- Repository/category: `vite` / `build_pipeline`
- Question: How does Vite create a builder, resolve build plugins, and execute a build environment? Cite the responsible file and symbols.
- Expected files: `packages/vite/src/node/build.ts`
- Expected symbols: `build`, `createBuilder`, `resolveBuildPlugins`, `buildEnvironment`

### `vite-plugin-ordering`

- Repository/category: `vite` / `algorithm_dispatch`
- Question: How does Vite sort user plugins and expose hook-specific ordered plugin lists for execution? Cite file paths and symbols.
- Expected files: `packages/vite/src/node/config.ts`, `packages/vite/src/node/plugins/index.ts`
- Expected symbols: `sortUserPlugins`, `resolvePlugins`, `createPluginHookUtils`, `getSortedPluginsByHook`

### `prometheus-promql-execution`

- Repository/category: `prometheus` / `query_execution`
- Question: How does Prometheus parse an instant PromQL query and carry it through query creation, execution, and expression evaluation? Cite file paths and symbols.
- Expected files: `promql/parser/parse.go`, `promql/engine.go`
- Expected symbols: `ParseExpr`, `NewInstantQuery`, `Exec`, `exec`, `Eval`

### `prometheus-scrape-lifecycle`

- Repository/category: `prometheus` / `runtime_lifecycle`
- Question: How does Prometheus apply scrape configuration, reconcile target sets into scrape pools, and run each scrape loop? Cite file paths and symbols.
- Expected files: `scrape/manager.go`, `scrape/scrape.go`
- Expected symbols: `Manager`, `ApplyConfig`, `updateTsets`, `scrapePool`, `Sync`, `scrapeLoop`, `run`

### `prometheus-tsdb-append`

- Repository/category: `prometheus` / `state_persistence`
- Question: How does a Prometheus TSDB append request obtain a Head appender, add samples, write commit records, and commit or roll back? Cite file paths and symbols.
- Expected files: `tsdb/head_append.go`
- Expected symbols: `Head`, `Appender`, `headAppender`, `Append`, `log`, `Commit`, `Rollback`

### `prometheus-remote-write-queue`

- Repository/category: `prometheus` / `queue_processing`
- Question: How does Prometheus remote write enqueue samples, shard the queue, form batches, and retry sending write requests? Cite file paths and symbols.
- Expected files: `storage/remote/queue_manager.go`
- Expected symbols: `QueueManager`, `Append`, `updateShardsLoop`, `runShard`, `sendSamplesWithBackoff`, `sendWriteRequestWithBackoff`

### `prometheus-rule-evaluation`

- Repository/category: `prometheus` / `scheduler_flow`
- Question: How does Prometheus load and schedule rule groups, evaluate a group, and choose sequential or concurrent rule batches? Cite file paths and symbols.
- Expected files: `rules/manager.go`, `rules/group.go`
- Expected symbols: `Manager`, `Update`, `LoadGroups`, `Group`, `run`, `Eval`, `SplitGroupIntoBatches`

### `grafana-http-server-startup`

- Repository/category: `grafana` / `stress_startup_flow`
- Question: How does Grafana construct and run its HTTP server, attach middleware and routes, and begin serving listeners? Cite file paths and symbols.
- Expected files: `pkg/api/http_server.go`
- Expected symbols: `HTTPServer`, `ProvideHTTPServer`, `Run`, `applyRoutes`, `addMiddlewaresAndStaticRoutes`, `getListeners`

### `grafana-alert-scheduler`

- Repository/category: `grafana` / `stress_scheduler_flow`
- Question: How does Grafana's alert scheduler run periodic ticks, select rules ready to execute, and dispatch evaluation jobs? Cite file paths and symbols.
- Expected files: `pkg/services/ngalert/schedule/schedule.go`
- Expected symbols: `NewScheduler`, `Run`, `schedulePeriodic`, `processTick`, `runJobFn`, `runSequences`

### `grafana-dashboard-loading`

- Repository/category: `grafana` / `stress_frontend_flow`
- Question: How does Grafana's dashboard scene page select a state manager, load a dashboard, fetch its data, and turn it into a scene? Cite file paths and symbols.
- Expected files: `public/app/features/dashboard-scene/pages/DashboardScenePage.tsx`, `public/app/features/dashboard-scene/pages/DashboardScenePageStateManager.ts`, `public/app/features/dashboard/services/DashboardLoaderSrv.ts`
- Expected symbols: `DashboardScenePage`, `getDashboardScenePageStateManager`, `DashboardScenePageStateManager`, `loadDashboard`, `loadScene`, `fetchDashboard`, `DashboardLoaderSrv`

## Reproduction commands and artifacts

```bash
# Prepare pinned worktrees and tool versions.
bash benchmarks/codegraph-comparison/scripts/bootstrap.sh \
  --repository flask --repository ripgrep --repository vite \
  --repository prometheus --repository grafana

# Build each product's prerequisites. Run repositories sequentially when
# collecting build time.
benchmarks/codegraph-comparison/.work/v2/tools/repobrain-venv/bin/python \
  benchmarks/codegraph-comparison/scripts/prepare_corpora.py \
  --repository flask --product all

# Main-track 120 answer slots.
benchmarks/codegraph-comparison/.work/v2/tools/repobrain-venv/bin/python \
  benchmarks/codegraph-comparison/scripts/run_benchmark_v2.py \
  --run-id main-full-v2 --track unrestricted_native \
  --repository flask --repository ripgrep --repository vite \
  --repository prometheus --repeat 3 --workers 1

# Main-track semantic judge.
benchmarks/codegraph-comparison/.work/v2/tools/repobrain-venv/bin/python \
  benchmarks/codegraph-comparison/scripts/judge_benchmark_v2.py \
  benchmarks/codegraph-comparison/results/runs/main-full-v2/unrestricted_native/results.json \
  --output benchmarks/codegraph-comparison/results/runs/main-full-v2/unrestricted_native/semantic-judge-v2.json \
  --resume --ground-truth-timeout 600 --grading-timeout 300
```

Authoritative local artifacts:

- Main answer results: `results/runs/main-full-v2/unrestricted_native/results.json`
- Main semantic results: `results/runs/main-full-v2/unrestricted_native/semantic-judge-v2.json`
- Main readable runtime report: `results/runs/main-full-v2/unrestricted_native/report.md`
- Stress answer results: `results/runs/grafana-stress-v2/unrestricted_native/results.json`
- Stress semantic results: `results/runs/grafana-stress-v2/unrestricted_native/semantic-judge-v2.json`
- Per-answer events and logs: under each run's repository/repeat/product path
- Build logs and source-free provenance: `.work/v2/build-logs/` and `.work/v2/corpora/`

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
- This run used three answer repetitions, but it did not complete the protocol's
  publication-grade recommendation of three cold builds, ten deterministic
  latency repetitions, or paired bootstrap confidence intervals.
