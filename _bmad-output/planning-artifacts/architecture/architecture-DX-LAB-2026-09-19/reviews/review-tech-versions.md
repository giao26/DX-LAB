# Technology and Version Reality Review

**Artifact:** `ARCHITECTURE-SPINE.md`  
**Review date:** 2026-09-19  
**Verdict:** **NEEDS CHANGES**

The main platform choices are real and broadly compatible, but the Stack Seed is not yet reproducible. One listed package version is not published, several entries are floating ranges without an existing lockfile or Compose digest, two runtime pins lag already released patches, and the Haystack integration packages required to connect Qdrant and Ollama are absent.

## Blocking and material findings

### TV-1 — Drizzle ORM `0.45.3` is not a published installable release (BLOCKER)

The upstream repository's `main` branch declares `0.45.3`, but the public npm package and official release list expose `0.45.2` as the latest published stable package. The spine therefore names a version that a clean build cannot install from npm.

- Evidence: [npm package reports 0.45.2](https://www.npmjs.com/package/drizzle-orm), [official GitHub releases report 0.45.2 latest](https://github.com/drizzle-team/drizzle-orm/releases), while [`main` already contains 0.45.3](https://github.com/drizzle-team/drizzle-orm/blob/main/drizzle-orm/package.json).
- Required resolution: change the seed to published `0.45.2` and pin its lockfile integrity, or select a later published stable release after rechecking. Do not pin the unreleased repository version unless the architecture explicitly chooses a source commit and records its immutable commit SHA.

### TV-2 — Floating tool/runtime entries contradict the reproducible-build rules (BLOCKER)

`TypeScript 5.x`, `Node-RED 5.0.x`, and `Python 3.13.x` are ranges, but AD-11 and AD-14 require pinned images, lockfiles and reproducible builds. The repository currently has no JavaScript lockfile or Compose lock/digest artifact, so the sentence saying those files become authoritative later does not make today's seed reproducible.

The ranges also conceal meaningful currency differences:

- TypeScript's current stable line is `7.0.2`; `5.x` is two majors behind. TypeScript 7 currently has tooling/API transition constraints, so a conservative `6.0.3` or `5.9.3` may be reasonable, but it must be an explicit, justified patch pin. [Official TypeScript releases](https://github.com/microsoft/TypeScript/releases), [TypeScript 7 transition notes](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/).
- Node-RED's official image currently provides `5.0.7` and recommends Node.js 24 for the 5.x line. Pin the exact tag and digest, not `5.0.x`. [Official Node-RED Docker tags](https://hub.docker.com/r/nodered/node-red/tags), [Node-RED 5.0 runtime requirements](https://nodered.org/blog/2026/06/09/version-5-0-released).
- The latest maintenance release in the selected Python 3.13 line is `3.13.15`; pin that patch and the base-image digest. [Python 3.13.15 release](https://www.python.org/downloads/release/python-31315/).

### TV-3 — Haystack cannot use Qdrant and Ollama from the named packages alone (BLOCKER)

`haystack-ai` does not bundle the Qdrant document store or Ollama generator/embedder. The official documentation requires the separate `qdrant-haystack` and `ollama-haystack` integration packages. Their versions, the Qdrant client version, and compatibility tests are absent from the seed, so the stated AI stack is not yet a resolvable dependency set.

- Evidence: [Haystack Qdrant installation](https://docs.haystack.deepset.ai/docs/qdrant-document-store), [Haystack Ollama installation](https://docs.haystack.deepset.ai/docs/ollamagenerator), [current `qdrant-haystack` package](https://pypi.org/project/qdrant-haystack/), [current `ollama-haystack` package](https://pypi.org/project/ollama-haystack/).
- Required resolution: add exact pins for both integration packages and their resolved transitive lock, then run an index/query/generation smoke test against the selected Qdrant and Ollama images. AD-18's model manifest must also name the generation and embedding model tags and immutable digests before the `ai` profile can be called reproducible.

### TV-4 — Four exact pins are already behind current stable patches (MAJOR)

The spine says the table was verified on 2026-09-19, but current upstream sources show newer stable patches:

| Component | Spine | Current evidence | Action |
| --- | ---: | ---: | --- |
| Next.js | 16.3.3 | 16.3.5 is published; 16.3.3 is still the cited August security floor | Prefer 16.3.5, or document why 16.3.3 is held and retest before release. |
| Qdrant | 1.18.2 | 1.19.1 latest | Prefer 1.19.1 with matching client/integration smoke tests; otherwise document the hold. |
| Ollama | 0.34.1 | 0.34.2 latest and includes a memory-growth fix | Move to 0.34.2 and pin image digest. |
| Node-RED | `5.0.x` | 5.0.7 image available | Resolve the range to 5.0.7 plus digest. |

Sources: [Next npm versions](https://www.npmjs.com/package/next?activeTab=versions), [Qdrant releases](https://github.com/qdrant/qdrant/releases), [Ollama releases](https://github.com/ollama/ollama/releases), [Node-RED image tags](https://hub.docker.com/r/nodered/node-red/tags).

This is not an instruction to chase every new major. PostgreSQL 16 and Odoo 17 are explicit brownfield/support choices. Patch lag is material here because the artifact asserts a same-day verification and separately requires secure, pinned builds.

### TV-5 — The seed omits exact runtime companions needed by named libraries (MAJOR)

Drizzle needs a concrete PostgreSQL driver such as `pg`, but the stack does not name or pin it. Fastify, Next.js, Haystack integrations and Superset also resolve substantial dependency graphs that must be represented by npm/Python lockfiles and image digests. Without those artifacts, "internally compatible enough" is an architectural intent rather than evidence.

Required resolution:

1. Name the Node package manager and commit one lockfile for Web and P.
2. Pin `pg` and the migration CLI/tool actually used with Drizzle.
3. Commit a `uv.lock` or equivalent for the AI service, including `haystack-ai`, `qdrant-haystack`, `ollama-haystack`, FastAPI and the Qdrant client.
4. Record immutable image digests for every Compose service and run the clean-host `core`, `demo` and `ai` profile smoke tests.

## Version-by-version check

| Named technology | Result | Evidence and compatibility note |
| --- | --- | --- |
| Node.js 24.21.0 LTS | PASS | Listed by the [official Node.js release blog](https://nodejs.org/en/blog). Meets Next.js 16's Node 20.9+ minimum and Node-RED 5's recommendation to use Node 24. |
| TypeScript 5.x | FAIL — floating/stale | Current stable is 7.0.2, while Next.js 16 requires only TS 5.1+. Select one exact supported patch after testing the chosen tooling. [TypeScript releases](https://github.com/microsoft/TypeScript/releases), [Next.js requirements](https://nextjs.org/docs/app/getting-started/installation). |
| Fastify 5.12.5 | PASS | Exists as an official security release; Fastify 5 supports Node 20+, so Node 24 is compatible. [Fastify releases](https://github.com/fastify/fastify/releases), [Fastify 5 migration guide](https://fastify.dev/docs/v5.6.x/Guides/Migration-Guide-V5/). |
| Drizzle ORM 0.45.3 | FAIL — unpublished | Repository `main` version only; npm stable is 0.45.2. See TV-1. |
| Next.js 16.3.3 / React 19.3 | PASS WITH UPDATE | Both releases exist and Node 24 satisfies Next.js. Next 16.3.3 is an Active LTS security release, but a newer 16.3.x patch is published. React 19.3 is current. [Next.js security release index](https://nextjs.org/blog), [React 19.3](https://react.dev/blog/2026/09/09/react-19-3). |
| PostgreSQL 16.15 | PASS | Official maintenance release dated 2026-08-13. A supported older major is acceptable for this brownfield seed. [PostgreSQL 16.15 notes](https://www.postgresql.org/docs/16/release-16-15.html). |
| Keycloak 26.7.4 | PASS | Current official download version. [Keycloak downloads](https://www.keycloak.org/downloads). |
| Odoo Community 17.0 / OCA `auth_oidc` 17.0 | PASS WITH SMOKE TEST | Both branches exist; the OCA module is version 17.0.1.2.0, depends on `auth_oauth`, and documents Keycloak authorization-code configuration. Pin both Odoo image digest and OCA commit SHA because a branch name is mutable. [Odoo 17 docs](https://www.odoo.com/documentation/17.0/), [OCA 17.0 module](https://github.com/OCA/server-auth/tree/17.0/auth_oidc), [module manifest](https://raw.githubusercontent.com/OCA/server-auth/17.0/auth_oidc/__manifest__.py). |
| Node-RED 5.0.x | FAIL — floating | Active supported major and compatible with Node 24, but exact current image is 5.0.7. See TV-2/TV-4. |
| Apache Superset 6.0.0 | PASS | Official 6.0 docs and quickstart tag exist. [Superset 6.0 documentation](https://superset.apache.org/docs/6.0.0/), [official quickstart](https://superset.apache.org/user-docs/quickstart/). |
| Python 3.13.x | FAIL — floating | Compatible with FastAPI and Haystack 3.1.1, but must resolve to an exact patch; 3.13.15 is current in the selected line. |
| FastAPI 0.141.1 | PASS | Official release notes list 0.141.1; its PyPI metadata includes Python 3.13. [FastAPI release notes](https://fastapi.tiangolo.com/release-notes/), [PyPI metadata](https://pypi.org/pypi/fastapi/0.141.1/json). |
| Haystack 3.1.1 | PASS CORE / FAIL STACK COMPLETENESS | Official stable release and Python 3.13 classifier exist. It still requires separately pinned Qdrant/Ollama integrations. [Haystack release](https://github.com/deepset-ai/haystack/releases), [PyPI metadata](https://pypi.org/pypi/haystack-ai/3.1.1/json). |
| Qdrant 1.18.2 | PASS WITH UPDATE | Real published image, but 1.19.1 is current. Upgrade or explicitly hold after testing the integration. [Qdrant releases](https://github.com/qdrant/qdrant/releases). |
| Ollama 0.34.1 | PASS WITH UPDATE | Real release, but 0.34.2 is current and contains a memory fix. [Ollama releases](https://github.com/ollama/ollama/releases). |
| Caddy 2.11.4 | PASS | Current signed official release. [Caddy releases](https://github.com/caddyserver/caddy/releases). |
| Mailpit 1.31.1 | PASS | Current official release with security hardening. [Mailpit releases](https://github.com/axllent/mailpit/releases). |

## Compatibility conclusion

The architecture choices can form a compatible seed after the five findings above are resolved. Node 24 works across Next.js 16 and Fastify 5 and is the recommended Node-RED 5 runtime. Python 3.13 is supported by FastAPI 0.141.1 and Haystack 3.1.1. Odoo 17 and the matching OCA 17.0 `auth_oidc` branch align. PostgreSQL 16.15 is a valid supported database choice.

The review cannot accept the current Stack Seed as build-ready because `drizzle-orm@0.45.3` is unavailable, the actual Haystack connector packages are missing, and no lockfile/image digest currently resolves the floating entries.
