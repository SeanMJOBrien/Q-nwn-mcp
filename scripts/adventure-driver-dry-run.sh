#!/usr/bin/env bash
#
# Show what the adventure driver would do, without calling the model or changing anything
# (docs/local-model-manual.md). Also lists setup problems (a missing nwn_* tool, a game folder not set).
#
#   scripts/adventure-driver-dry-run.sh                              the example plot
#   scripts/adventure-driver-dry-run.sh my-plot.json                 a plot file
#   scripts/adventure-driver-dry-run.sh adventures/The-Old-Mill      an existing module project
#   scripts/adventure-driver-dry-run.sh my-plot.json areas,environment   only these phases
#
# The model and endpoint are not called in a dry run; set DRIVE_ENDPOINT / DRIVE_MODEL for the real run
# (defaults: http://localhost:11434/v1, nwn-qwen). Game paths come from nwn-mcp.env or the environment.

set -euo pipefail
cd "$(dirname "$0")/.."

TARGET="${1:-docs/specs/plot.example.json}"
PHASES="${2:-}"
ENDPOINT="${DRIVE_ENDPOINT:-http://localhost:11434/v1}"
MODEL="${DRIVE_MODEL:-nwn-qwen}"

[ -f dist/cli/drive.js ] || npm run build

if [ -d "$TARGET" ] || [[ "$TARGET" == *.mod ]]; then
  SOURCE=(--module "$TARGET")
elif [ -f "$TARGET" ]; then
  SOURCE=(--plot "$TARGET")
else
  echo "error: $TARGET is neither a plot file, a module project folder nor a .mod" >&2
  exit 2
fi

node dist/cli/drive.js "${SOURCE[@]}" ${PHASES:+--phases "$PHASES"} \
  --endpoint "$ENDPOINT" --model "$MODEL" --dry-run
