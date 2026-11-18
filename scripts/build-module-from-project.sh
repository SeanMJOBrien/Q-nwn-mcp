#!/usr/bin/env bash
#
# Build the playable .mod from a module project (adventures/<Title>/): every edit the tools and the driver make is
# saved there, and the .mod in the game's modules folder is only rebuilt by this (docs/tool-cli.md).
#
#   scripts/build-module-from-project.sh adventures/The-Mill-on-Blackwater
#       -> <NWN_FOLDER_USER>/modules/the-mill-on-blackwater.mod (replacing the one there)
#   scripts/build-module-from-project.sh adventures/The-Mill-on-Blackwater /tmp/mill.mod
#       -> that file
#
# Game paths come from nwn-mcp.env or the environment. Load the module in the game afterwards (a running game
# keeps the old copy until the module is loaded again).

set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT="${1:-}"
if [ -z "$PROJECT" ] || [ ! -d "$PROJECT" ]; then
  echo "usage: $0 adventures/<Title> [output.mod]" >&2
  [ -d adventures ] && { echo "projects:" >&2; ls -1d adventures/*/ 2>/dev/null | grep -v '/_' | sed 's|/$||; s|^|  |' >&2; }
  exit 2
fi
PROJECT="${PROJECT%/}"

[ -f dist/cli/tool.js ] || npm run build

OUT="${2:-}"
if [ -z "$OUT" ]; then
  # NWN_FOLDER_USER as the server sees it: the environment, else nwn-mcp.env.
  USER_DIR="$(node -e 'import("./dist/util/settings-file.js").then((s) => { s.loadSettingsFile(); process.stdout.write(process.env.NWN_FOLDER_USER || ""); })')"
  if [ -z "$USER_DIR" ]; then
    echo "error: NWN_FOLDER_USER is not set (nwn-mcp.env or the environment); give the output .mod as the second argument" >&2
    exit 2
  fi
  NAME="$(basename "$PROJECT" | tr '[:upper:]' '[:lower:]')"
  OUT="$USER_DIR/modules/$NAME.mod"
fi
mkdir -p "$(dirname "$OUT")"

node dist/cli/tool.js --module "$PROJECT" --build "$OUT"
echo "built $OUT" >&2
