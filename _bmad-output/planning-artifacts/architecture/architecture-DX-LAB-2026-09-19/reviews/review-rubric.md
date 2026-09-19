# BMad Architecture Reviewer Gate — Rubric Walker

**Artifact:** `ARCHITECTURE-SPINE.md`  
**Reviewed:** 2026-09-19  
**Verdict:** **CHANGES REQUIRED** — The spine has a strong ownership model, broad PRD coverage, a credible brownfield transition, and a concrete demo operations envelope, but several central seams and domain invariants are still loose enough for independently implemented units to diverge.

## Critical findings

None.

## High findings

### H1 — The fair-assignment invariant is named but not bound to the PRD algorithm

**Evidence:** AD-2 says the domain owns “fair assignment,” while the capability map points FR-6 to AD-1/2/3. It does not bind the actual ordering and concurrency rules: eligible and ready staff in the temporary-type group, at most one active ticket per staff member, lowest official-assignment count first, ascending-ID rotation on ties, temporary reservation, FIFO queue when all are busy, and incrementing the count only on acceptance.

**Why this fails the gate:** Two P-core contributors can both obey AD-2 yet implement different assignment policies. This is a real product discriminator and a central concurrency invariant, so leaving it to story interpretation creates incompatible behavior and race handling.

**Recommended disposition:** **Autofix.** Extend AD-2 or add a dedicated AD that states the ordering, reservation/counting rules, FIFO behavior, and that selection plus reservation must be atomic under concurrency. Require deterministic domain tests for tie rotation and competing creates.

### H2 — The canonical lifecycle and SLA boundaries remain too implicit

**Evidence:** AD-2 assigns lifecycle and business-time SLA to the core, but does not bind the universal transition matrix or clock semantics from FR-7: `Chờ xử lý → Đang xử lý → Đóng`, only the assignee may close, result is mandatory, closed tickets do not reopen, follow-up uses a linked new ticket, SLA runs from receipt through queues/inspection/parts waiting until closure, and the configured work calendar controls elapsed time. The Deferred section correctly postpones per-type step names, but it does not distinguish those safe details from these already decided cross-cutting invariants.

**Why this fails the gate:** Adapters, tests, reports, and AI evidence can independently choose different definitions of “closed,” “overdue,” or elapsed business time while still appearing to obey the current spine.

**Recommended disposition:** **Autofix.** Bind the universal state machine, close guard, no-reopen rule, linked follow-up rule, and SLA start/stop/included-wait rules in AD-2 or a dedicated lifecycle AD. Keep only type-specific step names and completion conditions Deferred.

### H3 — The event seam does not choose a delivery protocol between P, Node-RED, and Odoo

**Evidence:** AD-3 defines an outbox, an event envelope, at-least-once delivery and deduplication. AD-7 says committed events refresh Odoo projections. The structure diagram sends P events to Node-RED, but no rule fixes whether the outbox worker invokes Node-RED by HTTP, Node-RED polls P, Odoo consumes directly, or another transport is introduced. There is no acknowledgement contract, service authentication convention, endpoint ownership, or source of consumer registration.

**Why this fails the gate:** `p_process`, `p_automation`, and `h_human` can each be built correctly against different transport assumptions and fail to integrate. The JSON event shape alone does not close the transport seam.

**Recommended disposition:** **Autofix.** Pick one demo transport. A consistent option is: P outbox worker sends signed/client-credential HTTP POSTs to a versioned Node-RED internal webhook; `2xx` acknowledges delivery; Node-RED invokes versioned idempotent Odoo projection endpoints using its own service credential; P remains owner of retries/dead letters and semantic send-once state. Put request/response and auth details in `contracts/openapi` and event payloads in `contracts/events`.

### H4 — AI failure and invocation behavior required by FR-5 is missing from the binding rules

**Evidence:** AD-8 limits AI inputs and powers, and AD-3 makes retries replay-safe. It does not state how a created ticket initiates classification, how timeouts/retries are represented, or the required fallback when AI returns no result: retain the customer-selected type for temporary assignment and still require employee confirmation before processing. AD-2 also does not explicitly prohibit entering `Đang xử lý` before classification confirmation.

**Why this fails the gate:** The Web, P worker, I service, and Odoo work item can disagree about synchronous versus asynchronous behavior, failure state, reassignment, and when work may start. A failed local model could block the core ticket journey even though the PRD defines a safe fallback.

**Recommended disposition:** **Autofix.** Define classification as an asynchronous P-owned job triggered after ticket commit, with typed status and bounded timeout/retry. Bind the customer-type fallback, the confirmation gate before processing, and the audited reassignment/temporary-reservation release when the confirmed type changes group. Add the P↔I contract to OpenAPI.

### H5 — Environment strategy is incomplete despite a good single-host deployment topology

**Evidence:** AD-11 defines one hardened Compose ingress and AD-14 defines component profiles (`core`, `demo`, `ai`). Profiles are not environments. The spine does not bind separate development, test, and judging/demo configuration, data, realms/clients, secrets, hostnames, TLS expectations, fixture loading, or promotion/rebuild behavior.

**Why this fails the gate:** The reviewer checklist requires the operational/environmental envelope to be decided or deferred. Contributors may treat `demo` as both a Compose profile and an environment, reuse secrets or identity configuration, or require manual edits that break the reproducible-release constraint.

**Recommended disposition:** **Autofix.** Add an environment convention: `dev`, isolated ephemeral `test`, and reproducible `demo`; each gets distinct generated secrets, databases/volumes and Keycloak client configuration; environment selection uses checked-in Compose overlays plus ignored secret files; fixtures are explicit and idempotent; no source edits are allowed for promotion. State demo TLS/hostname behavior or explicitly constrain the judged deployment to localhost/private LAN.

## Medium findings

### M1 — AD-11 contains an ingress wording contradiction

The rule says Caddy “proxies only Superset's embedded runtime at `/analytics/*`,” while the topology correctly shows Caddy routing Web, Odoo, Keycloak login, and Superset. Rewrite this as “for Superset, Caddy exposes only the embedded runtime route” so an implementer does not omit public application routes.

### M2 — The BFF session storage rule does not say whether cookies hold tokens or opaque session IDs

“Stores sessions in Secure, HttpOnly, SameSite=Lax cookies” permits either interpretation. Bind an opaque session identifier or encrypted server-side session strategy; do not place reusable service credentials in browser-readable or unsigned state. Also bind CSRF protection to cookie-authenticated mutations.

### M3 — The backup destination and key custody are not concrete enough for reproducible operations

AD-13 requires encryption and an off-host copy but gives no adapter/config interface, success criteria, or ownership for encryption keys. Add a backup target contract, configuration names, checksum verification, and documented restore-test evidence. A provider may remain configurable.

### M4 — Low-CSAT review creation is mapped but not stated as an invariant

FR-8 requires 1–2 stars to create one review work item for the ticket's team lead and to distinguish low score from no response. AD-16 covers delivery and AD-2 says CSAT generally, but neither binds this rule. Add it to the P-domain rules and cover it with a deterministic test.

### M5 — The current stack-verification claim needs durable source evidence in the deliverable set

The spine says versions were verified on 2026-09-19, while URLs live only in `.memlog.md` and several rows use `x` ranges. Preserve exact official release URLs and verification dates in a small companion manifest or source note, then pin exact package/container versions and digests in lockfiles before implementation. This allows future reviewers to distinguish a researched seed from an unsupported number.

## Low findings

### L1 — The capability map covers every FR, but it does not expose acceptance-condition coverage

Add a compact verification map from SM-1 through SM-5 or from the highest-risk acceptance clauses to their required tests. This is especially useful for the negative cases: invalid input creates nothing, closing without a result fails, exactly 60 minutes does not trigger, two tickets do not trigger, and rejected recommendations publish nothing.

### L2 — Service resource prerequisites remain unstated

AD-18 records model hardware profiles, but the demo host's minimum CPU/RAM/disk expectations and behavior when the `ai` profile is unavailable are not specified. Add these to the deployment runbook or Deferred with a decision deadline before demo packaging.

## Checklist assessment

| Gate criterion | Assessment |
| --- | --- |
| Real divergence points fixed | Partial — ownership and trust boundaries are strong; assignment, lifecycle, event transport, AI failure, and environments remain divergent. |
| AD rules enforce their Prevents clauses | Mostly — AD-1, 3–18 are generally enforceable; AD-2 is too broad for the behavior it claims to standardize. |
| Deferred items are safe | Mostly — type-specific step names, S3, production topology, enterprise data, offline features, retention, and future OLP prompt are safely bounded. Universal lifecycle rules must not remain implicit under per-type workflow detail. |
| Named technology verified current | Claimed and supported in memlog; durable source evidence and final exact pins are still needed. |
| Brownfield fit | Pass — existing components are retained conceptually, incompatible skeleton assumptions are explicitly migrated, and intentional upgrades are identified. |
| PRD capability coverage | Pass at FR map level; partial at acceptance-invariant level for FR-5/6/7/8. |
| Parent-spine compatibility | Not applicable — no inherited parent spine declared. |
| Operational/environmental envelope | Partial — topology, networking, observability, backup, profiles, and ingress are present; dev/test/demo separation is silent. |

## Recommended gate result

Apply H1–H5 and M1–M4 before marking the spine `final`. M5 may be satisfied by a checked-in version/source manifest during the same finalize pass. L1–L2 may be handled in implementation specifications or runbooks if their owners and timing are recorded.

---

## Final recheck — 2026-09-19

**Recheck verdict:** **PASS.** The revision resolves H1–H5 and materially resolves M1–M5. No blocker or high finding remains from this rubric review.

| Original finding | Recheck |
| --- | --- |
| H1 fair assignment | **Resolved.** AD-19 binds eligibility, one-slot capacity, lowest official count, deterministic ID rotation, FIFO, atomic reservation and counter timing. |
| H2 lifecycle and SLA | **Resolved.** AD-20 binds transitions, close guard, no reopen, linked follow-up, the two-business-hour deadline, calendar and included waiting periods. |
| H3 integration transport | **Resolved.** AD-21 binds authenticated HTTP delivery, acknowledgement, Odoo routing, schema authority, versions, gap recovery and compatibility. |
| H4 AI invocation/fallback | **Resolved.** AD-23 and AD-20 bind asynchronous jobs, immutable context, timeout/failure fallback, stale-result rejection, confirmation before processing and atomic reassignment. |
| H5 environment strategy | **Resolved.** AD-24 separates `dev`, ephemeral `test` and reproducible `demo`, including data/secrets/identity configuration, fixtures, TLS and clean-host rebuild. |
| M1 ingress wording | **Resolved** in AD-11. |
| M2 BFF session ambiguity | **Resolved** in AD-5. |
| M3 backup target/key evidence | **Resolved enough for this altitude** in AD-13. |
| M4 low-CSAT work item | **Resolved** in AD-20. |
| M5 technology evidence | **Resolved.** `TECHNOLOGY-SOURCES.md` records exact seeds and sources; lockfiles/digests are explicit pre-release gates. |

### Final gate result

AD-20 now makes the SLA deadline two business hours from valid receipt and retains the agreed clock/calendar semantics. The prior residual H2 finding is closed. **PASS for finalization.**
