#!/bin/bash
# Standalone repo: emit declarations into dist/ (same behavior as the
# monorepo's build-types.sh but rooted at this repository).
set -e
rm -rf .types-tmp
tsc --emitDeclarationOnly --declarationMap false --outDir .types-tmp
entry=$(find .types-tmp -name 'index.d.ts' | awk '{print length, $0}' | sort -n | head -1 | cut -d' ' -f2-)
if [ -z "$entry" ]; then echo "no index.d.ts emitted" >&2; exit 1; fi
srcdir=$(dirname "$entry")
mkdir -p dist
cp -R "$srcdir"/. dist/
rm -rf .types-tmp
echo "declarations -> dist"
