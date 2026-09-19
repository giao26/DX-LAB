# Adversarial architecture review — independent implementation compatibility

**Artifact:** `ARCHITECTURE-SPINE.md`  
**Review lens:** Assume separate teams implement Web, P, Odoo/Node-RED, D and I while complying with every current architecture decision. Identify where compliant implementations can still diverge.  
**Verdict:** **CHANGES REQUIRED**

The ownership model is strong: P is clearly the canonical authority, and adapters are prevented from writing its tables. The remaining risks are mostly boundary contracts. Several teams could independently make reasonable, compliant choices that either fail at integration or weaken authorization and audit guarantees.

## Findings

### ADV-1 — User identity is lost or forgeable on Odoo-to-P commands

- **Severity:** Critical
- **Affected decisions:** AD-5, AD-7, AD-12
- **Divergence:** AD-5 requires service calls to use client credentials, while AD-7 requires Odoo user actions to call P and AD-12 requires the audit actor's immutable Keycloak `sub`. An Odoo implementation using its service token gives P only the service account as subject. Another team may compensate with an `actor_sub` HTTP header, which is forgeable by the calling service. Both implementations comply with the current wording, yet neither provides trustworthy end-user attribution and assignment authorization.
- **Required resolution:** Bind one end-user delegation protocol for Odoo and other trusted backends. Define the token issuer, audience, actor/subject claims, who may mint or exchange the token, token lifetime, and whether P authorizes the end user, the calling client, or both. Explicitly forbid trusting caller-supplied identity headers. Separate machine-triggered commands from user-delegated commands in the OpenAPI security schemes and audit rules.
- **Acceptance evidence:** A contract test proves that an assigned employee can act through Odoo, an unassigned employee is denied, the audit record contains the employee Keycloak `sub` plus calling client ID, and changing an identity header cannot impersonate another employee.

### ADV-2 — At-least-once events have no ordering, version, or rebuild contract

- **Severity:** High
- **Affected decisions:** AD-3, AD-7, AD-10, Consistency Conventions
- **Divergence:** Consumers must deduplicate by `event_id`, but the event envelope has no aggregate sequence/version and there is no rule for out-of-order delivery. A compliant Odoo or D consumer can apply `ticket.closed.v1` and later overwrite its projection with a delayed `ticket.assigned.v1`. Teams can also disagree about whether a failed or stale projection is repaired by replay, snapshot, or a P query. This can produce a dashboard and Odoo view that disagree with P indefinitely without violating an AD.
- **Required resolution:** Add an immutable per-aggregate sequence or `aggregate_version` to every event and require consumers to reject stale events. Bind ordering scope, gap handling, replay behavior, projection checkpoints, and a P-owned snapshot/resynchronization endpoint or event stream. State whether projection freshness is eventual and define its measurable limit.
- **Acceptance evidence:** Contract tests deliver duplicate and deliberately reordered events, then verify that Odoo and reporting projections converge to the same P aggregate version. A rebuild test recreates a projection from an empty store.

### ADV-3 — Contract ownership and compatibility policy stop at filenames

- **Severity:** High
- **Affected decisions:** AD-3, AD-7, AD-8, Consistency Conventions, Structural Seed
- **Divergence:** The spine names `contracts/openapi` and `contracts/events`, but it does not say these files are the sole source of truth, who publishes generated clients, how breaking changes are identified, or which producer/consumer compatibility checks gate CI. Independent teams can hand-code DTOs that all appear consistent with the prose while differing in enum values, nullability, money/time representation, or SOP/AI state transitions. Dotted event names include a version while the envelope also includes `event_version`, leaving two possible authorities.
- **Required resolution:** Declare the checked-in OpenAPI and JSON Schemas as authoritative, select one event-version location, and define backward-compatible evolution rules. Generate or validate clients/types for Web, Odoo and I from those contracts. Require producer and consumer contract tests in CI and reject undocumented fields/enums or breaking changes without a new major contract version.
- **Acceptance evidence:** CI detects an incompatible enum removal, required-field addition, event payload change, and stale generated client before merge.

### ADV-4 — Superset scoping can be implemented in mutually incompatible or unsafe ways

- **Severity:** High
- **Affected decisions:** AD-4, AD-5, AD-6, AD-10, AD-11
- **Divergence:** AD-10 says the BFF derives scope before issuing a guest token, but it does not bind the guest-token claim/RLS contract to P reporting views. The D team may place group IDs in a guest-token RLS clause, while the P team exposes views keyed by assignment IDs or mutable group names. A second compliant implementation may depend on dashboard filters, which are not authorization. It is also unclear whether Superset reads P reporting views directly in the P database or a separately materialized reporting store, and which principal enforces row scope. These choices can cause empty dashboards, excessive access, or role behavior inconsistent with Web and Odoo.
- **Required resolution:** Define the reporting dataset contract with immutable scope keys, permitted columns, and the exact RLS predicate/guest-token claim mapping. State that dashboard filters are presentation only. Bind database location and read-only principal, prohibit access to private P tables, and add a deny-by-default rule for missing or unknown scope. Define a director/department-lead matrix against the same policy vocabulary used by P.
- **Acceptance evidence:** Automated tests create two groups and prove that an employee cannot retrieve the other group's rows through embedded chart queries or direct dataset exploration, while approved leaders receive the intended aggregate scope.

### ADV-5 — AI and SOP handoffs lack a complete asynchronous state contract

- **Severity:** Medium
- **Affected decisions:** AD-1, AD-3, AD-7, AD-8, AD-18
- **Divergence:** P owns recommendations and SOP lifecycle, and I returns typed results through a P command, but the architecture does not bind request/job/result identifiers, terminal states, cancellation/timeout behavior, evidence-key construction, or the rule for late responses after a human decision. I can retry a result after P has superseded the analysis; Odoo can display an earlier SOP draft; two teams can calculate different “one recommendation per evidence key” identities. All still satisfy the current high-level decisions.
- **Required resolution:** Define a P-owned AI job and proposal state machine with immutable `analysis_id`, `evidence_key`, input digest, requested model/prompt/source versions, attempt number, expiration and terminal status. I must echo that context. P must reject late, stale, mismatched or already-terminal results idempotently. Define which SOP version the Odoo work item references and how superseded drafts appear.
- **Acceptance evidence:** Integration tests cover duplicate results, timeout, retry, human rejection before a late result, changed evidence during analysis, and an Odoo review opened from a superseded work item.

## Acceptance recommendation

Resolve ADV-1 through ADV-4 before story decomposition because they determine shared contracts and security boundaries across teams. Resolve ADV-5 before implementing the AI/SOP workflow. After revision, rerun this lens using the concrete OpenAPI, event schema, authorization matrix and reporting dataset contract as evidence.
