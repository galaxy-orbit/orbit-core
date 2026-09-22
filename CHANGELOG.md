# Changelog

All notable changes to `@galaxy-stack/orbit-core`. Releases are versioned with [Changesets](https://github.com/changesets/changesets).

## 0.1.8 — 2026-09-22

First release from the standalone `orbit-core` repository.

- Self-contained dist: bundles core source, all bare dependencies external (`reflect-metadata`, `@galaxy-stack/orbit-common`)
- Published via npm Trusted Publishing (OIDC) — no NPM_TOKEN
- Verified end-to-end from npm: DI container, controller routing, exception interop with orbit-common

## 0.1.7 — 2026-09-22

- Repository metadata added to package.json for npm provenance verification

## 0.1.6 — 2026-09-22

- `repository` metadata + publishConfig for npm publication
- Live integration suite added: CRUD + auth + cache + database, GraphQL over HTTP, federation, TCP microservices, CLI scaffold

## 0.1.5 — 2026-09-22

- Dependency manifests switched from `workspace:*` to published semver ranges (packages became installable outside the monorepo)
- ParseUUIDPipe and ParseEnumPipe builtin pipes added
- ModuleMetadata accepts lazy imports (`() => Type | DynamicModule`)

## 0.1.4 — 2026-09-22

- Port handling: `listen(0)` now reflects the ephemeral port Bun actually bound

## 0.1.3 — 2026-09-22

- Repository metadata for npm provenance

## 0.1.2 — 2026-09-21

- Stability release: 287 new tests (31 -> 318)
- TimeoutMiddleware no longer leaks a pending abort timer on fast requests
- ClusterManager covered by integration tests with real workers
- Versioning, circuit-breaker, static-middleware suites expanded
