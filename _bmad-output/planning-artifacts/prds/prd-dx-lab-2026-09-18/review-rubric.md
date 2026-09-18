# PRD Quality Review — DX-OS nguồn mở (DX-LAB)

## Overall verdict

**Adequate, with three high-impact gaps before story creation.** The PRD has a coherent competition demo thesis, concrete ticket and AI approval flows, explicit scope limits, and unusually useful acceptance consequences for most FRs. The access rule for customer contact data, the customer's promised tracking journey, and the definition of a “slow” workflow step still allow incompatible implementations of core behavior; resolve those before treating this as build-ready.

## Decision-readiness — adequate

The H → P → D → I demo slice, open-source contribution journey, two-hour completion SLA, human approval of AI proposals, and seeded historical data are stated as choices (§§1, 2.2, 4, 6). §6.2 makes exclusions visible, and §8 names real unresolved items rather than pretending they are complete. The proposed architecture remains correctly outside the PRD.

The main product tensions need explicit disposition. §2.1 promises that customers can track requests, while the functional scope only covers submitting a ticket, receiving email, and rating closure (§§4.2, 6.1). §4.3 does not resolve whether an employee may read customer phone/email on every group ticket or only one they accepted. Both affect interface, security, and demo scope.

### Findings

- **high** Customer tracking is promised but not specified (§§2.1, 4.2, 6.1) — No FR or acceptance condition gives a customer a status view, tracking link, or status notification between creation and closure. *Fix:* Add a scoped, securely authenticated tracking requirement, or remove “theo dõi” from the customer description and mark it explicitly outside the contest demo.
- **high** Customer contact visibility is ambiguous (§§4.3 FR-9, 5) — “Nhân viên xem ticket thuộc nhóm mình và thông tin cần thiết để xử lý ticket đã nhận” does not say whether unassigned group tickets expose phone/email. *Fix:* State the exact field-level rule for group members versus the responsible employee, then apply it consistently to API, ticket UI, dashboard drill-down, exports, and attachments.

## Substance over theater — strong

The five named user groups each influence a real requirement: customer intake and CSAT, employee assignment, management scope, director approval, and the contributor journey (§§2.1, 4). The open-source claims are backed by a concrete lightweight contribution path, a release requirement, dependency disclosure, and behavioral testing (§§1, 4.5, 5, 7). Quality constraints are mostly product-specific rather than generic slogans; the privacy, audit, and AI publication boundaries are tied to the actual workflow.

### Findings

- **medium** Backup operation remains mostly a presentation claim (§5, “Vận hành”) — The PRD requires explaining a backup schedule and covering database, attachments, and SOP, but gives no minimum schedule, retention or verification criterion despite the daily-data requirement. *Fix:* State the demo's required backup-plan fields and the chosen daily cadence, with retention and restoration checks clearly labeled as planned operations rather than live demo behavior.

## Strategic coherence — strong

The thesis is a traceable DX-Ticket example showing how H, P, D, and I connect for OLP judges, accompanied by a reproducible open-source project (§1). UJ-1, UJ-2, and UJ-3 each test one part of that thesis; SM-1 through SM-5 mirror them (§§2.2, 7). The choice to use preloaded historical tickets for the bottleneck demo avoids falsely claiming that a single newly created ticket proves a pattern. §6.2 excludes full ERP/CRM, predictive analytics without adequate history, and autonomous AI publication. Counter-metrics guard against artificially improving close rate, SLA, or CSAT.

### Findings

- **medium** The contest demo success gate has no explicit failure/recovery expectation (§§2.2 UJ-1, 7 SM-1) — A continuous live sequence across multiple services can fail for a transient reason; the PRD does not say whether a traceable preloaded ticket is an acceptable fallback or whether the live ticket must complete all phases. *Fix:* Define which steps must be live, which may use labeled seeded data, and which evidence must still share a ticket ID. This is a presentation-scope choice, not an architecture design.

## Done-ness clarity — adequate

Every FR has a stated “Điều kiện kiểm tra,” and many are genuinely verifiable: invalid intake creates no ticket (FR-4), AI labels and human confirmation are preserved (FR-5), FIFO is maintained when all staff are busy (FR-6), queue time counts toward SLA (FR-7), low CSAT creates review work (FR-8), and draft SOP is withheld from publication (FR-12). The business-hours calendar and most role rules are specific enough to derive tests.

The central bottleneck detection rule is less complete than it appears. Three overdue tickets at “the same slow step” is the product's key AI event, yet neither §3 nor FR-11 says how slowness is assigned to a step. Step timestamps alone do not prove which step caused an end-to-end SLA breach.

### Findings

- **high** “Same slow step” has no computable decision rule (§§3, 4.2 FR-7, 4.4 FR-11, 7 SM-2) — Implementers could choose longest step, a configurable per-step limit, or a manual diagnosis and all pass the wording while producing different recommendations. *Fix:* Define a demo rule or a controlled reviewer decision: step start/end events, business-time duration, threshold or comparison baseline, tie handling, and the exact seven-day window. Add a negative test just below the threshold.
- **medium** Core status transition acceptance is too permissive (§4.2 FR-7) — “Có thể chuyển mọi loại ticket qua Chờ xử lý, Đang xử lý và Đóng” does not specify allowed transitions, who can close, and whether a closed ticket may reopen. *Fix:* Give the common transition table and closure guard; leave category-specific substeps in the process design but name their minimum observable events here.
- **medium** Dashboard freshness is not measurable (§4.3 FR-10; §5 “Vận hành”) — “Xuất hiện ... trong ngày” might mean seconds or many hours, whereas the user wants timely anomaly detection. *Fix:* State a maximum allowed delay for ticket/state changes and urgent threshold alerts in the demo, and distinguish that from the end-of-day snapshot.

## Scope honesty — adequate

§6.2 is a useful non-goals list, and §9 correctly indexes all five inline `[ASSUMPTION]` tags. §8 names role switching, per-category steps, Odoo chat breadth, competition rule changes, retention, and pre-SLA alerts. The uncertain future OLP requirements are not presented as established contest obligations.

The open-question list contains at least one issue that blocks the stated acceptance condition rather than merely later architecture: category-specific step completion and the “slow step” rule are prerequisites for FR-11 and SM-2. The open-source scope is deliberately broad, but the demo's minimum Odoo chat capability is clear from FR-3; extra channels can remain open.

### Findings

- **medium** Product acceptance depends on an unresolved workflow definition (§8 question 2 vs. §§4.2 FR-7, 4.4 FR-11) — At least the warranty inspection step and its completion/slow conditions must be decided before the AI demonstration can be built or evaluated. *Fix:* Close the demo warranty step rule in the PRD or flag FR-11/SM-2 as conditional, while leaving other category substeps to downstream design.

## Downstream usability — adequate

The glossary defines Ticket, Nhóm, Người phụ trách, Bước kiểm tra, SLA, CSAT, Resources, SOP, and Bản chốt ngày (§3). FR-1 through FR-13, UJ-1 through UJ-3, and SM-1 through SM-5 are contiguous and unique. The addendum preserves detailed business rules without forcing database schema or tool choices into the FRs. The PRD can feed UX and architecture once the high-impact semantics are resolved.

The management role and low-CSAT task recipient drift across the text: §2.1/FR-9 say “trưởng phòng,” while FR-8 and the addendum say “trưởng nhóm.” This matters because the distinction is an access-control decision. UJ-2 identifies the director as protagonist but shifts to an unnamed SOP reviewer; that reviewer needs a named role in the glossary or acceptance rule.

### Findings

- **medium** Review and management roles drift (§§2.1, 4.2 FR-8, 4.3 FR-9, 4.4 FR-12; addendum “Quy tắc nghiệp vụ”) — “Trưởng phòng,” “trưởng nhóm,” and “người phụ trách rà soát” may be three roles or synonyms. *Fix:* Define who receives a 1–2 star review task, who reviews a draft SOP, and who has publication authority; use each term consistently.
- **low** UJ/FR cross-reference for AI classification is coarse (§7 SM-1) — SM-1 refers to FR-1–FR-10 even though its “H, P, D, I” arc includes AI classification in FR-5 and a management report but not the FR-11 recommendation. *Fix:* Spell out that I in UJ-1 means classification support, while I in UJ-2 means bottleneck recommendation; this prevents treating the single new ticket as evidence for FR-11.

## Shape fit — strong

The product spans customers, employees, management, a director, and outside contributors, so three protagonist-led journeys are warranted (§2.2). A contest demo that feeds UX, architecture, and story creation needs the explicit FR and SM structure present here. The brownfield aspect is handled sensibly: the addendum identifies Odoo, Node-RED, PostgreSQL, Superset, Qdrant, Haystack, and Ollama as an existing scaffold, while declining to claim they already implement the desired flows. The PRD is detailed without turning into a schema or implementation plan.

### Findings

- **low** UJ-2 has a role handoff without its own acceptance moment (§2.2 UJ-2; §4.4 FR-12) — The director accepts, then “người phụ trách” reviews and someone with rights publishes. *Fix:* Make the reviewer and publisher's handoff visible in UJ-2, especially if publishing the approved SOP is shown in the contest demo.

## Mechanical notes

- IDs are continuous and unique: UJ-1–3, FR-1–13, SM-1–5. The references checked resolve.
- Every inline `[ASSUMPTION]` appears once in §9, and every §9 entry maps to an inline tag.
- UJ-1 names Tiên as the demonstrator, UJ-2 names the director, and UJ-3 names a new contributor. UJ-2's reviewer role remains unnamed.
- Glossary drift: “trưởng phòng”/“trưởng nhóm”; “người phụ trách” can mean ticket owner or SOP reviewer. Define separate terms.
- The PRD and addendum have the sections needed for this demo and downstream planning. The high-impact findings above are semantic gaps, not missing section headers.
