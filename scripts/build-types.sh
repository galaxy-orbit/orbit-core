#!/bin/bash
# Emits .d.ts for a package. Because tsconfig paths pull other workspace
# sources into the program, the emitted tree nests under
# .types-tmp/packages/<pkg>/src — we locate the entry index.d.ts (shortest
# path) and copy its folder contents into dist/.
set -e
pkg="$1"
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root/packages/$pkg"
rm -rf .types-tmp
tsc --emitDeclarationOnly --declarationMap false --outDir .types-tmp
entry=$(find .types-tmp -name 'index.d.ts' | awk '{print length, $0}' | sort -n | head -1 | cut -d' ' -f2-)
if [ -z "$entry" ]; then echo "no index.d.ts emitted for $pkg" >&2; exit 1; fi
srcdir=$(dirname "$entry")
mkdir -p dist
cp -R "$srcdir"/. dist/
rm -rf .types-tmp
echo "declarations -> dist ($pkg)"
