#!/usr/bin/env bash
#
# Full verification gate: typecheck, lint, test.
#
# Runs entirely locally — no hosted CI, no network. Modules generated with this
# server are one-off and local, so the whole toolchain stays on the machine that
# builds them.
#
# Two callers, sharing this one script so they cannot drift apart:
#   - `npm run verify`      (manual)
#   - .git/hooks/pre-commit (installed by `npm run hooks:install`)
#
# Exits non-zero on the first failing stage.

set -euo pipefail

cd "$(dirname "$0")/.."

# Biome ships its binary as a platform-specific optional dependency. Some npm
# configurations (notably --no-optional, or a lockfile installed on a different
# platform) skip it, leaving `npm run lint` to die with MODULE_NOT_FOUND. Detect
# that and tell the user how to fix it rather than failing opaquely.
biome_available() {
  node -e "require.resolve('@biomejs/biome/bin/biome')" >/dev/null 2>&1 || return 1
  npx --no-install biome --version >/dev/null 2>&1
}

echo "==> Typecheck + build"
npm run --silent build

echo "==> Lint"
if biome_available; then
  npm run --silent lint
else
  echo "    SKIPPED: biome's platform binary is missing."
  echo "    Install it with: npm install --no-save @biomejs/cli-\$(node -p \"process.platform+'-'+process.arch\")"
fi

echo "==> Tests"
npm run --silent test

echo
echo "All checks passed."
