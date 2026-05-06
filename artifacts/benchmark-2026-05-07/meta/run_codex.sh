#!/bin/bash
# Run codex exec on each question. Prompts piped via stdin so codex doesn't choke
# on quoting in positional args.
set -u
QUESTIONS=/tmp/ag-bench/questions.json
OUT=/tmp/ag-bench/answers/codex
META=/tmp/ag-bench/answers/_meta
mkdir -p "$OUT" "$META"

run_one() {
  local repo="$1" qid="$2" qtext="$3"
  local outfile="$OUT/${qid}.md"
  local logfile="$OUT/${qid}.log"
  local timefile="$META/${qid}.codex.time"
  local prompt
  prompt="You are answering a research question about the codebase at the current working directory. Be concrete: cite specific file paths and line numbers. Use grep/find/read tools. Question:

${qtext}

Answer in 5-15 lines using this format:
Answer: ...
Citations: file_path:line, file_path:line, ...
Confidence: High/Med/Low

Quote ONLY short snippets (<15 words)."
  echo "[codex] $qid -> $repo"
  local t0=$(date +%s)
  printf "%s" "$prompt" | codex exec \
    --skip-git-repo-check \
    -C "/tmp/ag-bench/${repo}" \
    -s read-only \
    --color never \
    --output-last-message "$outfile" \
    - > "$logfile" 2>&1
  local rc=$?
  local t1=$(date +%s)
  echo "$((t1-t0))" > "$timefile"
  echo "[codex] $qid done in $((t1-t0))s rc=$rc"
}

extract_q() {
  python3 - "$1" "$2" <<'PY'
import json, sys
data = json.load(open('/tmp/ag-bench/questions.json'))
repo, qid = sys.argv[1], sys.argv[2]
for item in data.get(repo, []):
    if item['id'] == qid:
        print(item['q'])
        break
PY
}

for ridx in fastapi:fa-f1 fastapi:fa-f2 fastapi:fa-d1 fastapi:fa-d2 fastapi:fa-x1 \
            requests:rq-f1 requests:rq-f2 requests:rq-d1 requests:rq-d2 requests:rq-x1 \
            sqlmodel:sm-f1 sqlmodel:sm-f2 sqlmodel:sm-d1 sqlmodel:sm-d2 sqlmodel:sm-x1; do
  repo="${ridx%%:*}"
  qid="${ridx##*:}"
  q="$(extract_q "$repo" "$qid")"
  if [ -z "$q" ]; then echo "[codex] missing $qid"; continue; fi
  run_one "$repo" "$qid" "$q"
done

echo "[codex] all done"
