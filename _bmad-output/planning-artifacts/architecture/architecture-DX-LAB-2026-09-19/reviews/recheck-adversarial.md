# Adversarial architecture final recheck

**Artifact:** `ARCHITECTURE-SPINE.md`, revised with AD-21 through AD-24  
**Review lens:** Recheck ADV-1 through ADV-5 under independent team implementation.  
**Verdict:** **PASS** — no blocker or high-severity incompatibility remains.

## Final resolution

- **RE-1 resolved:** AD-21 now requires Node-RED to wait until Odoo commits the event to a durable inbox in the same projection transaction. Only Odoo's resulting `2xx` is relayed to P as delivery acknowledgement; a lost response is safe because the inbox deduplicates the retry.
- **RE-2 resolved:** AD-10 now makes P own reporting authorization and issue a short-lived signed scope grant. The BFF can only translate the grant's exact `group_id` values into Superset RLS and may not add scope.

The revised spine gives independent teams one authority for business state, identity, interface contracts, reporting scope and AI job state. No further blocker or high-severity change is required before story decomposition under this review lens.

## Previous findings

| Finding | Recheck status | Evidence |
| --- | --- | --- |
| ADV-1 — delegated Odoo identity | Resolved | AD-22 binds Keycloak token exchange, dual authorization/audit and rejects identity headers. |
| ADV-2 — event ordering and rebuild | Resolved | AD-21 adds aggregate versions, gap detection, checkpoints and resynchronization; its end-to-end acknowledgement rule closes RE-1. |
| ADV-3 — contract authority and compatibility | Resolved | AD-21 makes checked-in OpenAPI/JSON Schema authoritative and gates compatibility in CI. |
| ADV-4 — Superset scope contract | Resolved | AD-10 binds immutable scope keys, deny-by-default RLS and a signed P-issued scope grant, closing RE-2. |
| ADV-5 — AI/SOP asynchronous lifecycle | Resolved | AD-23 binds P-owned jobs, immutable correlation context, terminal states and stale-result rejection. |

## Historical findings, now resolved

### RE-1 — Node-RED acknowledgement could lose the last projection event [RESOLVED]

- **Severity:** High
- **Affected decisions:** AD-3, AD-7, AD-21
- **Failure mode:** AD-21 says a `2xx` from the Node-RED webhook acknowledges P outbox delivery, then Node-RED calls Odoo. It does not require Node-RED to finish the idempotent Odoo call or durably persist its own relay record before returning `2xx`. A compliant Node-RED team can acknowledge on receipt and perform the downstream call asynchronously in memory. A crash then loses the event. Aggregate gap detection does not repair the final missing event because no later version arrives to reveal the gap.
- **Required resolution:** Bind one relay guarantee: either Node-RED returns `2xx` only after Odoo has durably accepted the projection update, or Node-RED persists a delivery record before acknowledging and owns bounded retry/dead-letter state. Add periodic checkpoint reconciliation or a P-driven projection watermark check so a missing tail event is detectable. State which component owns the retry and alert.
- **Acceptance evidence:** An integration test kills Node-RED after inbound receipt but before Odoo acceptance and proves eventual Odoo convergence without manually creating another ticket event.

### RE-2 — BFF could become a second authorization authority for Superset [RESOLVED]

- **Severity:** High
- **Affected decisions:** AD-5, AD-6, AD-10
- **Failure mode:** P must validate authorization on every resource request, but Superset reads reporting views directly and AD-10 lets the BFF “derive” allowed group IDs. “The same policy vocabulary” does not require the same policy decision. A Web team can independently implement director, department-lead and employee scope and mint a syntactically valid but over-broad guest token, bypassing P's resource authorization. The Web and P implementations can both comply while disagreeing.
- **Required resolution:** Make P the decision point for reporting scope. The BFF should request a short-lived, signed reporting grant or exact allowed `group_id` set from a P authorization endpoint, then translate that grant mechanically into the Superset guest token. Alternatively, enforce equivalent database RLS from a P-issued context. Forbid BFF-local role-to-scope rules and bind token expiry, subject/client binding and maximum scope.
- **Acceptance evidence:** Contract tests change a user's group/role in the authoritative policy source and prove the BFF cannot mint broader Superset scope, including with forged group IDs or stale local mappings.

## Recheck acceptance recommendation

Proceed to story decomposition. Keep the durable-inbox relay and P-issued reporting grant in the contract and integration-test acceptance criteria.
