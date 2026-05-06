#!/bin/bash
# Run ag-refresh on each target repo, then ag-ask each question.
set -u
QUESTIONS=/tmp/ag-bench/questions.json
OUT=/tmp/ag-bench/answers/antigravity
META=/tmp/ag-bench/answers/_meta
mkdir -p "$OUT" "$META"

refresh_one() {
  local repo="$1"
  local repo_dir="/tmp/ag-bench/${repo}"
  local refresh_log="$META/${repo}.refresh.log"
  local timefile="$META/${repo}.refresh.time"
  echo "[ag] refresh $repo"
  local t0=$(date +%s)
  ag-refresh --workspace "$repo_dir" --quick > "$refresh_log" 2>&1
  local rc=$?
  local t1=$(date +%s)
  echo "$((t1-t0))" > "$timefile"
  echo "[ag] refresh $repo done in $((t1-t0))s rc=$rc"
}

ask_one() {
  local repo="$1" qid="$2" qtext="$3"
  local repo_dir="/tmp/ag-bench/${repo}"
  local outfile="$OUT/${qid}.md"
  local logfile="$OUT/${qid}.log"
  local timefile="$META/${qid}.ag.time"
  echo "[ag] ask $qid -> $repo"
  local t0=$(date +%s)
  ag-ask --workspace "$repo_dir" "$qtext" > "$outfile" 2> "$logfile"
  local rc=$?
  local t1=$(date +%s)
  echo "$((t1-t0))" > "$timefile"
  echo "[ag] ask $qid done in $((t1-t0))s rc=$rc"
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

# Refresh first
for repo in fastapi requests sqlmodel; do refresh_one "$repo"; done

# Ask
for ridx in fastapi:fa-f1 fastapi:fa-f2 fastapi:fa-d1 fastapi:fa-d2 fastapi:fa-x1 \
            requests:rq-f1 requests:rq-f2 requests:rq-d1 requests:rq-d2 requests:rq-x1 \
            sqlmodel:sm-f1 sqlmodel:sm-f2 sqlmodel:sm-d1 sqlmodel:sm-d2 sqlmodel:sm-x1; do
  repo="${ridx%%:*}"
  qid="${ridx##*:}"
  q="$(extract_q "$repo" "$qid")"
  if [ -z "$q" ]; then echo "[ag] missing $qid"; continue; fi
  ask_one "$repo" "$qid" "$q"
done

echo "[ag] all done"
