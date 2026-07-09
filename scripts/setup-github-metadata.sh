#!/usr/bin/env bash
# Sets the GitHub repo's Topics, About description, and Homepage in one shot.
# Run after editing the values below if you want to tweak them.
#
# Requires: `gh` CLI authenticated (`gh auth status`) with `repo` scope.

set -euo pipefail

REPO="study8677/repobrain"

DESCRIPTION="Give Claude Code, Cursor, Codex CLI a ChatGPT for your codebase. Multi-agent knowledge engine, grounded Q&A with file paths and line numbers. Works in any AI IDE."
HOMEPAGE="https://deepwiki.com/study8677/repobrain"

# 20 topic slugs — GitHub's cap. Ordered by discovery value.
TOPICS=(
  ai-agent
  claude-code
  codex-cli
  cursor
  windsurf
  mcp
  mcp-server
  llm
  rag
  code-search
  developer-tools
  knowledge-graph
  multi-agent
  python
  openai
  agents-sdk
  ide-plugin
  copilot
  code-intelligence
  codebase-qa
)

echo "→ Setting description and homepage on $REPO"
gh repo edit "$REPO" \
  --description "$DESCRIPTION" \
  --homepage "$HOMEPAGE"

echo "→ Replacing topics with: ${TOPICS[*]}"
# Build the API payload via jq so the array survives shell quoting
payload=$(printf '%s\n' "${TOPICS[@]}" | jq -R . | jq -s '{names: .}')
gh api -X PUT "/repos/$REPO/topics" \
  -H "Accept: application/vnd.github+json" \
  --input - <<<"$payload" >/dev/null

echo "✓ Done. Verify at https://github.com/$REPO"
echo
echo "Remaining manual step (web UI only — no public API):"
echo "  Settings → Social preview → upload docs/assets/social-preview.png"
