# Spine Pair Review — DX-OS

## Overall verdict

The draft pair captures the agreed H→P→D→I demo route and the Portal/Odoo/Dashboard boundary, but is not yet a complete downstream UX contract. The main gaps are component name parity, actionable error/permission states, the contributor journey, and references to every imported visual. Findings refer to the drafts at this review pass; the parent may be producing mocks concurrently.

## 1. Flow coverage — thin

Checked PRD UJ-1–UJ-3 and FR-1–FR-13 against `EXPERIENCE.md` Key Flows. UJ-1 and UJ-2 have protagonists, numbered steps, climaxes, and failure branches. FR-13/UJ-3 has only a paragraph.

### Findings

- **high** UJ-3 lacks numbered steps, named contributor, climax, and failure path (`EXPERIENCE.md` → Key Flows → UJ-3). *Fix:* Give the contributor a named actor and a runnable sequence ending in a verified pull request, with setup/test failure recovery.
- **medium** PRD FR-9's group list versus assigned-owner detail boundary is stated but not exercised in any journey (`EXPERIENCE.md` → UJ-1 step 4). *Fix:* Add a moment showing the masked group row and the assigned person's detail, including what an unassigned employee cannot open.
- **medium** PRD FR-8's 1–2 star follow-up and FR-10's daily snapshot have IA rows or prose but no journey beat (`EXPERIENCE.md` → Key Flows). *Fix:* Add concise continuation or linked mini-flow with actor, outcome, and failure where the UX has a surface; keep snapshot backstage if no user interaction is intended.

## 2. Token completeness — thin

All current `{path.to.token}` references resolve to frontmatter entries. Color token values currently present are hex. Typography, radii, spacing, and the three frontmatter component entries have valid forms.

### Findings

- **high** Load-bearing focus, error, warning, success and border colors are deferred as `[NOTE FOR UX]`; no explicit contrast target is given for primary/on-primary, accent/on-accent, ink/surface or focus (`DESIGN.md` → Colors). *Fix:* Define role tokens with hex, verify contrast pairs, and state minimum targets before marking final.
- **medium** Only three components have frontmatter component tokens while the prose introduces form, chart, and AI recommendation without component token mapping (`DESIGN.md` → frontmatter `components`, Components). *Fix:* Either add named component entries where visual deltas matter or state the UI system/default inheritance that supplies them.

## 3. Component coverage — broken

Compared every named row in `DESIGN.md` Components and `EXPERIENCE.md` Component Patterns. The shared H/P/D/I tile is the only clearly corresponding pair; other names and boundaries differ.

### Findings

- **high** `DESIGN.md` has H/P/D/I tile, primary action, metric card, chart, ticket form and AI recommendation, while `EXPERIENCE.md` has tile, DX-Ticket card, form, Odoo notification, classification, processing, KPI/chart, AI recommendation and SOP task. The pair has no one-to-one visual/behavioral coverage (`DESIGN.md` and `EXPERIENCE.md` → Components). *Fix:* Use a canonical component name in both tables and give each meaningful anatomy/state and behavior, including Odoo-native components as inherited.
- **medium** SOP approval, Odoo notification, classification handoff, and ticket status actions lack visual states even though they carry trust and permission decisions (`DESIGN.md` → Components). *Fix:* Specify label hierarchy, pending/confirmed/failed appearance and explicit Odoo inheritance.

## 4. State coverage — thin

Walked all 11 IA surfaces. The common load, form error/success, queue, permission, stale dashboard and SOP pending states are covered; several surface-specific states are absent.

### Findings

- **high** AI classification failure, Odoo notification delivery failure, SOP publish failure, Dashboard decision save failure and CSAT submit failure have no recovery behavior (`EXPERIENCE.md` → State Patterns). *Fix:* For each, preserve input/decision, show current durable state, name retry owner and prevent duplicate side effects.
- **medium** Empty H announcements, empty Resources/search results, empty Odoo ticket list, and no CSAT response have no surface-specific copy/action (`EXPERIENCE.md` → State Patterns). *Fix:* Add concise rows tied to the IA surface.
- **medium** Online-only web has no offline/network-loss state, despite form and mobile Odoo use (`EXPERIENCE.md` → State Patterns, Responsive & Platform). *Fix:* State that submission/actions stop, entered data is preserved where feasible, and retry cannot silently duplicate a ticket.
- **medium** Focus is described globally but not for D/I tabs, filters, form validation, Odoo action dialogs or post-navigation focus (`EXPERIENCE.md` → State Patterns, Accessibility Floor). *Fix:* Define focus destination and announcement after navigation, filter updates and validation.

## 5. Visual reference coverage — thin

`imports/` contains `customer-form.png`, `director-dashboard.png`, `dx-portal-entry.png`, `dx-portal-library.png`, `staff-ticket-list.png`, and `ticket-database.png`. At review time `mockups/` and `wireframes/` contain no files. The spines-win-on-conflict rule is stated.

### Findings

- **medium** `imports/ticket-database.png` is not linked inline or explained (`DESIGN.md`/`EXPERIENCE.md`). *Fix:* Link near dashboard source drill-down or explain why the reference is intentionally unused.
- **low** Imported image links are mostly collected in Inspiration rather than placed beside the affected component/IA/flow; the Brand section only names the directory (`EXPERIENCE.md` → Inspiration; `DESIGN.md` → Brand & Style). *Fix:* Add contextual inline links at the decisions each image illustrates.
- **medium** The selected palette is linked to `.working/color-themes-1.html`, a working artifact that may not ship with final spines (`DESIGN.md` → Brand & Style). *Fix:* Promote a keeper to `mockups/` or remove the dependency once tokens fully capture the decision.

## 6. Bloat & overspecification — adequate

The two spines are reasonably concise, and most PRD facts are referenced rather than copied.

### Findings

- **low** `EXPERIENCE.md` repeats detailed ticket field limits, state order and the AI threshold from the PRD (`Component Patterns`, `Key Flows`). *Fix:* Keep only behavior needed for design/interaction and link to FR-4/7/11 for exact business rules.

## 7. Inheritance discipline — thin

Both `sources` links resolve to the final PRD. Core status/type terms are generally consistent, and current token cross-references resolve.

### Findings

- **high** UJ headings are paraphrased rather than copied verbatim from the PRD, contrary to the extraction contract (`EXPERIENCE.md` → Key Flows). *Fix:* Use the exact PRD UJ titles and add any shorter screen labels separately.
- **medium** The pair defers UI-system choice and Odoo inheritance details; downstream builders cannot tell which styling/behavior is custom versus Odoo native (`DESIGN.md` → Brand & Style; `EXPERIENCE.md` → Foundation). *Fix:* Declare whether Portal/form/Dashboard are standalone custom UI or inherit a named system, and explicitly scope Odoo deltas.

## 8. Shape fit — strong

`DESIGN.md` has all eight canonical sections in order. `EXPERIENCE.md` has all eight default sections plus Responsive & Platform and Inspiration & Anti-patterns, both triggered by the multi-surface/reference inputs. The invented content stays within relevant sections.

### Findings

None.

## Mechanical notes

- Both frontmatters have `name`, `status`, dates and resolving `sources`; DESIGN color values are hex and `{...}` references resolve.
- Canonical component naming is inconsistent across the two spines; see section 3.
- No Mermaid diagrams are present, so there is no Mermaid syntax to validate.
- The draft pair still contains multiple `[NOTE FOR UX]` items. These are open decisions, not finalized implementation rules.
