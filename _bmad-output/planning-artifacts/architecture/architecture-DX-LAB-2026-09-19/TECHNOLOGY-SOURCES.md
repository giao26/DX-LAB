# DX-LAB technology seed sources

Verified on **2026-09-19**. These sources establish that each seed version exists and fits the selected runtime line. Implementation lockfiles, OCA commit SHA, container digests and the model manifest must freeze the resolved build before the first release.

| Technology | Seed | Official source |
| --- | --- | --- |
| Node.js | 24.21.0 LTS | [Node.js release blog](https://nodejs.org/en/blog) |
| pnpm | 12.4.2 | [npm package](https://www.npmjs.com/package/pnpm) |
| TypeScript | 6.0.3 | [Microsoft releases](https://github.com/microsoft/TypeScript/releases) |
| Fastify | 5.12.5 | [Fastify releases](https://github.com/fastify/fastify/releases) |
| Drizzle ORM | 0.45.2 | [Drizzle releases](https://github.com/drizzle-team/drizzle-orm/releases) |
| Drizzle Kit | 0.31.8 | [npm package](https://www.npmjs.com/package/drizzle-kit) |
| node-postgres `pg` | 8.23.0 | [npm package](https://www.npmjs.com/package/pg) |
| Next.js | 16.3.5 | [npm package](https://www.npmjs.com/package/next) |
| React | 19.3 | [React versions](https://react.dev/versions) |
| PostgreSQL | 16.15 | [PostgreSQL support/version policy](https://www.postgresql.org/support/versioning/) |
| Keycloak | 26.7.4 | [Keycloak downloads](https://www.keycloak.org/downloads) |
| Odoo Community | 17.0 | [Odoo 17 documentation](https://www.odoo.com/documentation/17.0/) |
| OCA `auth_oidc` | 17.0.1.2.0 | [OCA module, branch 17.0](https://github.com/OCA/server-auth/tree/17.0/auth_oidc) |
| Node-RED | 5.0.7 | [Official image tags](https://hub.docker.com/r/nodered/node-red/tags) |
| Apache Superset | 6.0.0 | [Superset 6.0 documentation](https://superset.apache.org/user-docs/6.0.0/intro/) |
| Python | 3.13.15 | [Python 3.13.15 release](https://www.python.org/downloads/release/python-31315/) |
| FastAPI | 0.141.1 | [FastAPI release notes](https://fastapi.tiangolo.com/release-notes/) |
| Haystack | 3.1.1 | [Haystack releases](https://github.com/deepset-ai/haystack/releases) |
| `qdrant-haystack` | 10.5.0 | [PyPI](https://pypi.org/project/qdrant-haystack/) |
| `qdrant-client` | 1.19.1 | [PyPI](https://pypi.org/project/qdrant-client/) |
| `httpx` | 0.27.0 | [PyPI](https://pypi.org/project/httpx/0.27.0/) |
| Qdrant | 1.19.1 | [Qdrant releases](https://github.com/qdrant/qdrant/releases) |
| OpenRouter API | External HTTPS service | [OpenRouter API reference](https://openrouter.ai/docs/api/reference/overview) |
| Qwen3-8B | `qwen/qwen3-8b`, Apache-2.0 | [Model card](https://huggingface.co/Qwen/Qwen3-8B) |
| Caddy | 2.11.4 | [Caddy releases](https://github.com/caddyserver/caddy/releases) |
| Mailpit | 1.31.1 | [Mailpit releases](https://github.com/axllent/mailpit/releases) |

## Resolution evidence required before implementation acceptance

- Commit `pnpm-lock.yaml` for Web and P; package manifests use exact direct dependency versions.
- Commit `uv.lock` for I, including Haystack integrations and `qdrant-client`.
- Record immutable image digests for every Compose service and the exact OCA `auth_oidc` commit SHA.
- Run clean-host smoke tests for `core`, `demo` and `ai`; the AI test must index, retrieve and generate once using the pinned model manifest.
