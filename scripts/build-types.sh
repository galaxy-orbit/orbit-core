#!/bin/bash
# Emits .d.ts for a package. Because tsconfig paths pull other workspace
# sources into the program, the emitted tree nests under
# .types-tmp/packages/<pkg>/src — we locate the entry index.d.ts (shortest
# path) and copy its folder contents into dist/.
set -e
pkg="${1:-}"
here="$(cd "$(dirname "$0")" && pwd)"
if [ -n "$pkg" ] && [ -d "$here/../packages/$pkg" ]; then
  # Monorepo layout: build the package from the workspace.
  cd "$here/../packages/$pkg"
else
  # Standalone repo layout (synced via sync-repo.sh): the repo root is the package.
  cd "$here/.."
fi
rm -rf .types-tmp
# Declaration builds must not type-check tests; several packages keep failing
# test types that would otherwise block `build:types` entirely. Also force
# --declarationDir because packages set it in tsconfig, overriding --outDir.
cat > .types-tsconfig.json <<'JSON'
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "dist", ".types-tmp", "**/*.test.ts", "**/*.spec.ts", "**/__tests__/**"]
}
JSON
TSC="$(cd "$here/.." && pwd)/node_modules/.bin/tsc"
if [ ! -f "$TSC" ]; then echo "tsc not found at $TSC" >&2; exit 1; fi
"$TSC" -p .types-tsconfig.json --emitDeclarationOnly --declarationMap false --outDir .types-tmp --declarationDir .types-tmp
rm -f .types-tsconfig.json
# Prefer the target package's own index.d.ts; fall back to the shortest path.
entry=$(find .types-tmp -path "*/$pkg/*" -name 'index.d.ts' | head -1)
if [ -z "$entry" ]; then
  entry=$(find .types-tmp -name 'index.d.ts' | awk '{print length, $0}' | sort -n | head -1 | cut -d' ' -f2-)
fi
if [ -z "$entry" ]; then echo "no index.d.ts emitted for $pkg" >&2; exit 1; fi
srcdir=$(dirname "$entry")
mkdir -p dist
cp -R "$srcdir"/. dist/
rm -rf .types-tmp
echo "declarations -> dist ($pkg)"
