#!/usr/bin/env bash
#
# Set up this repository on a new macOS or Linux machine: build it, fetch the neverwinter.nim tools, find the game
# folders, write nwn-mcp.env, optionally prepare an Ollama model, and check the result with a driver dry run.
#
#   scripts/setup-new-machine.sh                       everything it can find on its own
#   scripts/setup-new-machine.sh --ollama              also pull qwen2.5:7b and make the nwn-qwen model
#   scripts/setup-new-machine.sh --ollama qwen2.5:14b  ... from another base model
#   scripts/setup-new-machine.sh --game <dir> --user <dir> --tools <dir>   give folders it cannot find
#   scripts/setup-new-machine.sh --force               rewrite an existing nwn-mcp.env
#
# Safe to run again: it keeps an existing nwn-mcp.env (unless --force) and an existing tools download.
# Needs: git, node 20+ with npm, curl, unzip. Installs nothing system-wide; Ollama itself is not installed.
# The tools go to .tools/neverwinter-<version>/ in this repository (git-ignored). NIM_VERSION picks the release
# (default 2.1.2, the one the server is tested with).

set -euo pipefail
cd "$(dirname "$0")/.."
REPO="$(pwd)"

NIM_VERSION="${NIM_VERSION:-2.1.2}"
GAME="" USER_DIR="" TOOLS="" FORCE=0 OLLAMA_BASE=""
while [ $# -gt 0 ]; do
  case "$1" in
    --game) GAME="$2"; shift 2 ;;
    --user) USER_DIR="$2"; shift 2 ;;
    --tools) TOOLS="$2"; shift 2 ;;
    --force) FORCE=1; shift ;;
    --ollama)
      if [ $# -gt 1 ] && [[ "$2" != --* ]]; then OLLAMA_BASE="$2"; shift 2; else OLLAMA_BASE="qwen2.5:7b"; shift; fi ;;
    -h|--help) sed -n '2,17p' "$0"; exit 0 ;;
    *) echo "unknown option $1 (--help)" >&2; exit 2 ;;
  esac
done

say() { printf '\n== %s\n' "$*"; }
ok() { printf '   ok: %s\n' "$*"; }
warn() { printf '   !! %s\n' "$*"; }
die() { printf '\nerror: %s\n' "$*" >&2; exit 1; }

# ── 1. prerequisites ──
say "Prerequisites"
for cmd in git node npm curl unzip; do command -v "$cmd" >/dev/null || die "$cmd is not installed"; done
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 20 ] || die "node $(node --version) is too old: install node 20 or newer"
ok "node $(node --version), npm $(npm --version)"

OS="$(uname -s)" ARCH="$(uname -m)"
case "$OS" in
  Darwin) PLATFORM=macos; LIB=libnwnscriptcomp.dylib ;;
  Linux) PLATFORM=linux-gnu; LIB=libnwnscriptcomp.so ;;
  *) die "$OS is not supported by this script (on Windows set the paths in nwn-mcp.env by hand)" ;;
esac
case "$ARCH" in
  arm64|aarch64) CPU=aarch64 ;;
  x86_64|amd64) CPU=x86_64 ;;
  *) die "unsupported CPU $ARCH" ;;
esac
ok "$OS $ARCH"

# ── 2. build ──
say "Build"
npm install --no-fund --no-audit
npm run build
ok "dist/ built"

# ── 3. neverwinter.nim tools ──
say "neverwinter.nim tools"
REQUIRED=(nwn_erf nwn_gff nwn_resman_extract nwn_resman_cat nwn_script_comp nwn_tlk nwn_twoda)
tools_ok() {
  local d="$1"
  [ -n "$d" ] && [ -d "$d" ] || return 1
  for t in "${REQUIRED[@]}"; do [ -x "$d/$t" ] || return 1; done
  [ -f "$d/$LIB" ]
}
# The shared ../nwn-tools folder of the user's other NWN projects holds builds for arm64 macOS and x86_64 Linux.
SHARED=""
[ "$PLATFORM" = macos ] && [ "$CPU" = aarch64 ] && SHARED="$(cd .. && pwd)/nwn-tools/macos_arm64/neverwinter"
[ "$PLATFORM" = linux-gnu ] && [ "$CPU" = x86_64 ] && SHARED="$(cd .. && pwd)/nwn-tools/linux/neverwinter"
LOCAL="$REPO/.tools/neverwinter-$NIM_VERSION"
if [ -n "$TOOLS" ]; then
  tools_ok "$TOOLS" || die "--tools $TOOLS lacks one of ${REQUIRED[*]} or $LIB"
elif tools_ok "${NIM_FOLDER_NWTOOLS:-}"; then
  TOOLS="$NIM_FOLDER_NWTOOLS"
elif tools_ok "$SHARED"; then
  TOOLS="$SHARED"
elif tools_ok "$LOCAL"; then
  TOOLS="$LOCAL"
else
  ZIP="neverwinter-$CPU-$PLATFORM.zip"
  URL="https://github.com/niv/neverwinter.nim/releases/download/$NIM_VERSION/$ZIP"
  echo "   downloading $URL"
  mkdir -p "$LOCAL"
  TMP="$(mktemp -d)"
  curl -fsSL -o "$TMP/$ZIP" "$URL" || die "download failed: $URL"
  unzip -q -o "$TMP/$ZIP" -d "$LOCAL"
  rm -rf "$TMP"
  # A release zip may hold a folder; bring the tools up to $LOCAL.
  if [ ! -e "$LOCAL/nwn_gff" ]; then
    INNER="$(dirname "$(find "$LOCAL" -name nwn_gff -type f | head -1)")"
    [ -n "$INNER" ] && [ "$INNER" != "." ] && mv "$INNER"/* "$LOCAL"/
  fi
  chmod +x "$LOCAL"/nwn_* 2>/dev/null || true
  [ "$PLATFORM" = macos ] && xattr -dr com.apple.quarantine "$LOCAL" 2>/dev/null || true
  tools_ok "$LOCAL" || die "the download in $LOCAL lacks one of ${REQUIRED[*]} or $LIB"
  TOOLS="$LOCAL"
fi
"$TOOLS/nwn_gff" --version >/dev/null 2>&1 || die "$TOOLS/nwn_gff does not run on this machine (wrong CPU, or blocked by macOS: xattr -dr com.apple.quarantine $TOOLS)"
ok "$TOOLS"

# ── 4. game folders ──
say "Game folders"
first_with() { # first folder holding $1 (a relative path), from the rest of the arguments
  local want="$1"; shift
  for d in "$@"; do [ -e "$d/$want" ] && { printf '%s' "$d"; return 0; }; done
  return 1
}
if [ -z "$GAME" ]; then
  GAME="${NWN_FOLDER_DATA:-}"
  [ -n "$GAME" ] && [ -e "$GAME/data/nwn_base.key" ] || GAME="$(first_with data/nwn_base.key \
    "$HOME/Library/Application Support/Steam/steamapps/common/Neverwinter Nights" \
    "$HOME/Library/Application Support/Beamdog Client/00839" \
    "/Applications/Neverwinter Nights.app/Contents/Resources" \
    "$HOME/.local/share/Steam/steamapps/common/Neverwinter Nights" \
    "$HOME/.steam/steam/steamapps/common/Neverwinter Nights" \
    "$HOME/.var/app/com.valvesoftware.Steam/.local/share/Steam/steamapps/common/Neverwinter Nights" \
    "$HOME/.local/share/Beamdog Client/00839" \
    "$HOME/nwn-data" || true)"
fi
[ -n "$GAME" ] && [ -e "$GAME/data/nwn_base.key" ] || die "the NWN:EE install was not found: run again with --game <folder holding data/nwn_base.key>"
ok "game: $GAME"

if [ -z "$USER_DIR" ]; then
  USER_DIR="${NWN_FOLDER_USER:-}"
  [ -n "$USER_DIR" ] && [ -d "$USER_DIR" ] || USER_DIR="$(first_with modules \
    "$HOME/Documents/Neverwinter Nights" \
    "$HOME/.local/share/Neverwinter Nights" \
    "$HOME/nwn-data/user" || true)"
fi
if [ -z "$USER_DIR" ]; then
  USER_DIR="$([ "$PLATFORM" = macos ] && echo "$HOME/Documents/Neverwinter Nights" || echo "$HOME/.local/share/Neverwinter Nights")"
  warn "no user folder with modules/ found (has the game run once?); creating $USER_DIR/modules"
fi
mkdir -p "$USER_DIR/modules"
ok "user: $USER_DIR"

# ── 5. nwn-mcp.env ──
say "Settings file"
if [ -f nwn-mcp.env ] && [ "$FORCE" -ne 1 ]; then
  ok "nwn-mcp.env exists, kept (--force rewrites it); its values win over what was found above"
else
  cat > nwn-mcp.env <<EOF
# Written by scripts/setup-new-machine.sh on $(date +%Y-%m-%d). Keys: nwn-mcp.env.example.
NIM_FOLDER_NWTOOLS=$TOOLS
NWN_FOLDER_DATA=$GAME
NWN_FOLDER_USER=$USER_DIR
EOF
  ok "wrote nwn-mcp.env"
fi

# ── 6. setup check (the same one the driver runs) ──
say "Setup check"
node --input-type=module -e '
  const { loadSettingsFile } = await import("./dist/util/settings-file.js");
  const { setupProblems } = await import("./dist/util/setup-check.js");
  loadSettingsFile();
  const p = setupProblems();
  if (p.length) { for (const x of p) console.log("   !! " + x); process.exit(1); }
  console.log("   ok: tools and game folders in place");
' || die "fix the problems above (nwn-mcp.env), then run this script again"

# ── 7. Ollama (optional) ──
if [ -n "$OLLAMA_BASE" ]; then
  say "Ollama model nwn-qwen from $OLLAMA_BASE"
  if ! command -v ollama >/dev/null; then
    warn "ollama is not installed: get it from https://ollama.com/download, then run this script again with --ollama"
  else
    ollama pull "$OLLAMA_BASE"
    MF="$(mktemp)"
    printf 'FROM %s\nPARAMETER num_ctx 16384\nPARAMETER temperature 0.2\n' "$OLLAMA_BASE" > "$MF"
    ollama create nwn-qwen -f "$MF"
    rm -f "$MF"
    ok "model nwn-qwen ready (driver: --endpoint http://localhost:11434/v1 --model nwn-qwen)"
  fi
fi

# ── 8. dry run ──
say "Driver dry run on the example plot"
scripts/adventure-driver-dry-run.sh >/dev/null && ok "the driver can plan a build"

cat <<EOF

Done. Next:
  Build an adventure:   node dist/cli/drive.js --plot docs/specs/plot.example.json --endpoint http://localhost:11434/v1 --model nwn-qwen
  Build its .mod:       scripts/build-module-from-project.sh adventures/The-Mill-on-Blackwater
  Use from Claude Code: claude mcp add nwn-mcp -- node "$REPO/dist/index.js"   (it reads nwn-mcp.env)
EOF
