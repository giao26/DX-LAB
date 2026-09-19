# Reviewer gate resolution

Date: 2026-09-19

| Finding set | Resolution in spine |
| --- | --- |
| Superset route and scope | AD-10/AD-11 now bind `/analytics/*`, immutable `group_id`, read-only datasets, guest-token RLS and deny-by-default scope. |
| Brownfield path | Structural Seed now names the Node-RED move, Fastify replacement, DB ownership migration, version upgrades and Compose hardening. |
| Intake/CSAT tokens and version preconditions | AD-3 and AD-6 distinguish creation/update and anonymous intake/single-use CSAT token. |
| Open exports and email | AD-15 and AD-16 bind authorized portable exports and outbox-owned delivery state; Mailpit is pinned. |
| Odoo confidentiality and delegation | AD-7 masks projections; AD-22 binds Keycloak token exchange and audits user plus client. |
| Fair assignment, lifecycle and SLA | AD-19 and AD-20 define deterministic atomic assignment, universal lifecycle, calendar and low-CSAT work item. |
| Event transport, ordering and contract ownership | AD-21 binds authenticated HTTP routing, authoritative schemas, aggregate versions, gap recovery and compatibility rules. |
| AI invocation and stale results | AD-23 binds asynchronous jobs, fallback, immutable context and stale/terminal-result rejection. |
| Environments and accessibility | AD-17 and AD-24 bind accessibility acceptance and isolated dev/test/demo environments. |
| Operations, snapshots and backup | AD-10, AD-12 and AD-13 now bind snapshot metadata/idempotency, within-day alerts and backup target/checksum/key evidence. |
| Reproducible open-source release | AD-14/AD-18, exact Stack Seed, Verification Gates and TECHNOLOGY-SOURCES.md bind release/license/model/build evidence. |
| Technology currency | Unpublished/floating pins were replaced with exact published versions; Haystack connector packages and clients were added. |

All critical and high findings were applied. Medium findings were applied where they represented shared behavior; implementation artifacts such as lockfiles, image digests, model digests and resource measurements are explicit release gates because the corresponding code does not exist yet.
