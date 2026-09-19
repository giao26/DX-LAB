# Technology and Version Recheck

**Artifacts:** `ARCHITECTURE-SPINE.md`, `TECHNOLOGY-SOURCES.md`  
**Recheck date:** 2026-09-19  
**Verdict:** **PASS**

The revised Stack Seed resolves all blocker and major findings TV-1 through TV-5. The named versions exist, the selected runtime lines are mutually compatible at the package-metadata level, and the remaining lockfile, image-digest, OCA-commit and model-manifest work is now stated as an explicit implementation/release gate rather than falsely claimed as present evidence.

## Previous finding disposition

| Finding | Result | Evidence |
| --- | --- | --- |
| TV-1 — unpublished Drizzle ORM 0.45.3 | **Resolved** | Seed now uses published stable `drizzle-orm` 0.45.2. [npm](https://www.npmjs.com/package/drizzle-orm), [official releases](https://github.com/drizzle-team/drizzle-orm/releases). |
| TV-2 — floating/stale TypeScript, Node-RED and Python ranges | **Resolved** | Exact pins are now TypeScript 6.0.3, Node-RED 5.0.7 and Python 3.13.15. Node-RED 5 recommends Node 24 and the seed uses Node 24.21.0. [TypeScript releases](https://github.com/microsoft/TypeScript/releases), [Node-RED 5 release](https://nodered.org/blog/2026/06/09/version-5-0-released), [Node-RED tags](https://hub.docker.com/r/nodered/node-red/tags), [Python 3.13.15](https://www.python.org/downloads/release/python-31315/). |
| TV-3 — missing Haystack integration packages | **Resolved** | Exact `qdrant-haystack` 10.5.0, `qdrant-client` 1.19.1 and `ollama-haystack` 6.8.0 pins are present. Qdrant integration metadata requires `haystack-ai>=2.29.0` and `qdrant-client>=1.17.0`; Ollama integration requires `haystack-ai>=2.30.0` and Python >=3.10. Haystack 3.1.1, Qdrant client 1.19.1 and Python 3.13.15 satisfy them. [Qdrant package metadata](https://pypi.org/pypi/qdrant-haystack/10.5.0/json), [Ollama integration metadata](https://raw.githubusercontent.com/deepset-ai/haystack-core-integrations/main/integrations/ollama/pyproject.toml). |
| TV-4 — outdated exact runtime patches | **Resolved** | Seed now uses Next.js 16.3.5, Qdrant 1.19.1, Ollama 0.34.2 and Node-RED 5.0.7. [Next.js npm](https://www.npmjs.com/package/next), [Qdrant releases](https://github.com/qdrant/qdrant/releases), [Ollama releases](https://github.com/ollama/ollama/releases), [Node-RED tags](https://hub.docker.com/r/nodered/node-red/tags). |
| TV-5 — missing concrete runtime companions and freeze evidence | **Resolved at architecture level** | The seed now names pnpm 12.4.2, Drizzle Kit 0.31.8, `pg` 8.23.0 and the AI connector packages. `TECHNOLOGY-SOURCES.md` explicitly gates implementation acceptance on `pnpm-lock.yaml`, `uv.lock`, exact image digests, OCA commit SHA and clean-host profile smoke tests. [pnpm 12.4.2](https://github.com/pnpm/pnpm/releases), [`pg` 8.23.0](https://www.npmjs.com/package/pg), [Drizzle Kit versions](https://www.npmjs.com/package/drizzle-kit?activeTab=versions). |

## Compatibility result

- Node.js 24.21.0 satisfies Fastify 5 and Next.js 16 runtime minima and Node-RED 5's recommended Node 24 line.
- TypeScript 6.0.3 satisfies Next.js 16's TypeScript 5.1+ requirement; the separate package and image pins avoid coupling Odoo/Superset/Python runtimes to Node.
- Python 3.13.15 is declared by FastAPI 0.141.1, Haystack 3.1.1 and both selected Haystack integrations.
- `qdrant-haystack` 10.5.0 accepts Haystack 3.1.1 and `qdrant-client` 1.19.1 by its published dependency ranges.
- Odoo 17 and OCA `auth_oidc` 17.0.1.2.0 align by Odoo branch; the required immutable OCA commit SHA remains correctly deferred to build freezing.

## Remaining blocker/high findings

**None.** Lockfiles, image digests, model digests and clean-host smoke tests remain mandatory acceptance evidence during implementation, as already recorded in `TECHNOLOGY-SOURCES.md` and AD-11/AD-14/AD-18.
