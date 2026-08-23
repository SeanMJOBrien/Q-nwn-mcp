#!/usr/bin/env bash
#
# Install the repo's git hooks.
#
# Run once per clone:  npm run hooks:install
#
# Hooks live in scripts/hooks/ so they are version-controlled; .git/hooks is not.

set -euo pipefail

cd "$(dirname "$0")/.."

hook_dir=".git/hooks"
if [ ! -d "$hook_dir" ]; then
  echo "No $hook_dir — is this a git repository?" >&2
  exit 1
fi

for hook in scripts/hooks/*; do
  name="$(basename "$hook")"
  target="$hook_dir/$name"

  if [ -e "$target" ] && ! grep -q "nwn-mcp managed hook" "$target" 2>/dev/null; then
    echo "Refusing to overwrite existing $target (not one of ours)." >&2
    echo "Move it aside and re-run if you want the managed version." >&2
    continue
  fi

  cp "$hook" "$target"
  chmod +x "$target"
  echo "Installed $name"
done

echo
echo "Hooks installed. Bypass a hook for one commit with: git commit --no-verify"
