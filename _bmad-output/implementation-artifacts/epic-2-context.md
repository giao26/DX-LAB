# Epic 2 Context: Truy cập không gian làm việc và tri thức đã duyệt

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Give company staff a clear, authorized path from DX-Portal to the H/P/D/I workspaces and effective SOP/FAQ knowledge. Users should reach the right work surface without remembering tool URLs, recognize the official document version, and never mistake a draft for published policy.

## Stories

- Story 2.1: Nhân sự công ty điều hướng qua bốn không gian H/P/D/I
- Story 2.2: Nhân viên tra cứu SOP và FAQ đang có hiệu lực
- Story 2.3: Nhân viên khởi tạo công việc từ trang tổng hợp H và P

## Requirements & Constraints

- Internal Portal routes require an active company identity and valid membership. Unauthenticated, disabled, or outside-company accounts must not receive internal content, navigation structure, notification metadata, or counts. Public ticket intake and confirmation confer no access to Portal, Resources, Odoo, or Dashboard.
- Every destination rechecks authorization, including direct URLs and links from notifications. Deny by default; revoked access must also invalidate access through old links. Portal visibility is never a substitute for resource authorization.
- H exposes company/group announcements within the viewer's scope, Resources, and Odoo. P lists permitted processes and lets users choose DX-Ticket before opening its public form. D and I enter the corresponding sections of one Dashboard application, subject to Dashboard authorization.
- Resources lists and searches only authorized, published SOP/FAQ versions. Present the effective version with its type, version, effective date, textual publication state, approver, and publication time. Keep versions distinct; drafts, pending/rejected versions, and replaced versions must not appear as current documents.
- Direct Resources URLs must not reveal unpublished content, sensitive metadata, or downloads. AI retrieval receives published versions and provenance only; unpublished knowledge cannot enter its retrieval index.
- Publication failure keeps the previous effective version available. A newly approved version remains “Đã duyệt — chưa xuất bản” in administration until publication succeeds, with retry available to the responsible actor.
- Approved knowledge must remain exportable in an open document format with approval metadata and the same authorization policy as online reads. Customer attachments never become published knowledge automatically.
- Use consistent ticket identifiers and state/type labels across Portal, P, and Odoo. Vietnamese is the primary product language; desktop and phone browsers are supported. Keep this epic focused on navigation and knowledge access, rather than building a full ERP or expanding Odoo chat features.

## Technical Decisions

- A single Next.js Web/BFF owns Portal, H/P pages, Resources access, public forms, and the unified D/I Dashboard. Keycloak is the sole OIDC issuer; use Authorization Code with PKCE for browser login and immutable `sub` for actor identity. Validate issuer, audience, scopes, roles, groups, and resource responsibility at the authoritative backend.
- Store reusable tokens server-side. Browser cookies carry only an opaque signed session identifier and use `Secure`, `HttpOnly`, and `SameSite=Lax`; cookie-authenticated mutations require CSRF protection. Do not expose privileged service endpoints or tokens to browser code.
- P owns canonical SOP lifecycle and publication. Odoo is the staff work/review surface and a minimized projection; it cannot independently approve or publish knowledge. Resources and I consume the same published-version boundary. P owns approval/publication audit with actor, UTC timestamp, correlation/causation, and intelligible before/after values.
- Integrations use APIs and committed events rather than private-table reads. Delivery is replay-safe through transactional outbox, durable consumer deduplication, aggregate versions, and bounded retry/dead-letter handling. Internal notifications retain authorized deep links without disclosing contact data or attachment URLs.
- Keep Caddy as the sole public ingress. Expose Web, Odoo UI, Keycloak login, and permitted embedded analytics runtime; administration and internal data/AI services remain private.
- API contracts use versioned OpenAPI/JSON Schema and `/api/v1`; errors use RFC 9457 problem details. Shared state/type vocabulary comes from versioned contracts rather than independent UI copies. Persist timestamps in UTC and display local business times using `Asia/Ho_Chi_Minh`.

## UX & Interaction Patterns

- Use the “Công nghệ mở / Xanh tin cậy” design direction: cobalt primary `#2854E8`, cyan accent `#16B8C9`, dark ink `#17233F`, white surfaces, and pale background `#F5F8FF`. Use Vietnamese-capable system fonts and semantic web components. Odoo retains its native conventions.
- Prioritize four fully clickable H→P→D→I tiles with full workspace names and brief descriptions. H and P are separate landing pages with a visible return to Portal. Each content block identifies its purpose and one clear next action.
- Resources search, type filters, results, and version/publication information need explicit labels. Empty states explain that nothing matches the current scope/filter and offer clear-filter or return navigation; never invent sample content.
- Loading preserves layout. An integration failure stays within its affected block with retry, while other links remain usable. Permission failures reveal no protected information and offer safe return/contact actions.
- Target WCAG 2.2 AA: semantic regions and links, logical keyboard order, visible focus, textual status, and accessible asynchronous announcements. After navigation, focus the new page's main heading; permission errors focus their error heading.
- Reflow at 320 CSS px and 200% zoom without horizontal scrolling for main tasks. Desktop begins at 1024 px, tablet spans 768–1023 px, and mobile uses one column below 768 px. Do not rely on hover or color alone; minimum targets are 24×24 CSS px with spacing, with 44×44 preferred for primary mobile actions.

## Cross-Story Dependencies

- Epic 1 supplies identity/authorization, the public ticket form from Stories 1.3–1.5, and scoped Odoo ticket access. Reuse those boundaries rather than creating another intake or authorization model.
- Story 2.1 establishes the navigation shell used by H/P landing pages and Resources. Story 2.3 connects those pages to the existing intake and staff surfaces; Story 2.2 supplies the approved-knowledge destination from H.
- The later SOP improvement/review workflow supplies publication transitions and new approved versions. This epic must preserve the effective-version and publication-failure contract before that workflow is integrated.
- Later Dashboard work supplies D/I content. Portal must preserve one Dashboard application and authorized section entry while its reporting and recommendation features are developed.
