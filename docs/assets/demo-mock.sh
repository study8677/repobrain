#!/usr/bin/env bash
# Mock ag-ask output used by docs/assets/demo.tape to record the README GIF
# without requiring a live LLM endpoint. Two scripted responses keyed by the
# question text — falls back to the multi-agent answer for anything else.

set -u

QUESTION="${1:-How does this work?}"

c_cyan="\033[1;36m"
c_green="\033[1;32m"
c_dim="\033[2m"
c_under="\033[4m"
c_off="\033[0m"

echo

if [[ "$QUESTION" == *"calls"* || "$QUESTION" == *"call "* ]]; then
  printf "${c_cyan}▸ Router: selecting relevant modules → refresh_pipeline${c_off}\n"
  sleep 0.5
  printf "${c_cyan}▸ Reading agents/refresh_pipeline.md${c_off}\n"
  sleep 0.4
  echo
  printf "${c_green}✓ Answer (2 sources):${c_off}\n"
  echo
  echo "  refresh_pipeline.run() is called from:"
  echo
  printf "    1. _cli_entry.ag_refresh()             ${c_under}engine/antigravity_engine/_cli_entry.py:142${c_off}\n"
  printf "    2. mcp_server.refresh_project()        ${c_under}engine/antigravity_engine/hub/mcp_server.py:88${c_off}\n"
  echo
  printf "  ${c_dim}Confidence: high · agent doc + live source cross-check${c_off}\n"
  echo
  exit 0
fi

printf "${c_cyan}▸ Router: GRAPH=no → semantic path${c_off}\n"
sleep 0.5
printf "${c_cyan}▸ Selecting modules from map.md...${c_off}\n"
sleep 0.4
printf "${c_cyan}▸ Reading agents/hub.md (in parallel)${c_off}\n"
sleep 0.4
printf "${c_cyan}▸ Reading agents/refresh_pipeline.md${c_off}\n"
sleep 0.4
echo
printf "${c_green}✓ Answer (grounded in 3 source files):${c_off}\n"
echo
echo "  During ag-refresh, files are grouped by import graph,"
echo "  directory co-location and filename prefix. Each group"
echo "  becomes a sub-agent loaded with ~30K tokens of source"
echo "  pre-baked into context — no tool calls needed."
echo
printf "    ${c_under}engine/antigravity_engine/hub/module_grouping.py:78${c_off}\n"
printf "    ${c_under}engine/antigravity_engine/hub/refresh_pipeline.py:142${c_off}\n"
echo
echo "  Each sub-agent writes a Markdown knowledge doc to"
echo "  .antigravity/agents/{module}.md. Large modules emit"
echo "  multiple docs — no merging, no information loss."
echo
echo "  Map Agent then reads all agent docs and produces"
echo "  map.md as the routing index used by ag-ask."
echo
printf "    ${c_under}engine/antigravity_engine/hub/agents.py:215${c_off}\n"
echo
