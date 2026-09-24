---
title: 'H+P: Tiep nhan va trich xuat tai lieu rieng tu'
type: 'feature'
created: '2026-09-24'
status: 'in-progress'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '70770b9c557f27355512918c5e5fb3baefad08b7'
context:
  - _bmad-output/planning-artifacts/architecture/architecture-DX-LAB-2026-09-19/ARCHITECTURE-SPINE.md
  - _bmad-output/implementation-artifacts/spec-1-3-khach-tao-ticket-hop-le.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Luong ticket hien tai chi nhan mo ta JSON, khong nhan tai lieu va khong co du lieu da trich xuat de tien toi phan D. Dieu nay khong dap ung luong nguoi dung tai tai lieu trong so do da cung cap.

**Approach:** Mo rong luong Web/BFF -> P de nhan mot tai lieu dinh kem, kiem tra va luu rieng tu qua storage port cua P; worker Python + Unstructured trich xuat noi dung/bang va ghi ket qua co truy vet ve P/PostgreSQL. H+P hoan thanh truoc; D va I khong duoc goi.

## Boundaries & Constraints

**Always:** P la chu so huu duy nhat cua ticket, metadata, trang thai va ket qua trich xuat; browser chi goi BFF. Nhan mot tai lieu toi da 10 MB cung form ticket, chi chap nhan `.pdf`, `.docx`, `.xlsx`, `.png`, `.jpg`, `.jpeg`. Tep nam ngoai web root voi khoa mo, checksum SHA-256, MIME phat hien, kich thuoc va nguon goc; khong ghi PII/noi dung tep vao log. Kiem tra kich thuoc, ten phan mo rong, MIME va chu ky file truoc khi commit; upload, ticket, metadata va outbox co idempotency va co cleanup khi that bai. Pham vi demo chi kiem tra extension-MIME-signature, khong them dich vu malware/quarantine. Worker chi nhan job da commit, khong goi AI, va ghi trang thai trich xuat co the retry. Luu text, bang va provenance trong PostgreSQL de D co the su dung o chang sau.

**Never:** Khong dua file hay noi dung trich xuat vao Qdrant, OpenRouter, chatbot hoac Superset. Khong mo URL file cong khai, khong de Web/Odoo ghi truc tiep PostgreSQL, khong tin Content-Type/ten file tu trinh duyet, khong xoa hay sua tai lieu cu khi retry.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Upload hop le | Form ticket va mot tai lieu hop le | Tao/replay mot ticket, luu metadata va job trich xuat; UI bao ma ticket va trang thai | Tep rieng tu, co checksum va audit/outbox |
| Tep gia/qua gioi han | Ten, MIME hoac signature khong khop; vuot gioi han | Khong luu byte, khong tao ticket hay side effect | Loi theo truong, giu du lieu form |
| Trich xuat thanh cong | Job da commit | Luu text, bang va provenance du de doi chieu tai lieu | Cap nhat atomic trang thai ket qua |
| Trich xuat loi | Parser/worker loi hoac timeout | Ticket va file van ton tai, ket qua khong cong bo | Trang thai FAILED, retry gioi han, log da lam sach |
| Gui lai | Cung Idempotency-Key va cung payload/file | Tra lai dung ticket/metadata, khong tao ban sao byte/job | Payload hay checksum khac tra 409 |

</frozen-after-approval>

## Code Map

- `contracts/openapi/p-api.yaml` -- contract P hien chi co JSON ticket; phai la nguon chuan truoc BFF/P.
- `apps/web/app/ticket-form.tsx`, `apps/web/app/bff/tickets/route.ts` -- form JSON va proxy 32 KiB hien tai; giu a11y, Idempotency-Key va thay bang luong upload gioi han.
- `services/p_process/src/domain/ticket.ts`, `src/application/create-ticket.ts`, `src/adapters/http/routes/tickets.ts` -- validation va use case ticket hien co; mo rong bang attachment/extraction ports, khong dua adapter vao domain.
- `services/p_process/src/adapters/postgres/ticket-intake-store.ts`, `migrations/`, `src/index.ts` -- transaction, migration runner va DI; them metadata/job ket qua.
- `services/p_process/src/adapters/storage/` -- moi; filesystem private demo, co the thay bang S3 sau nay.
- `services/i_intelligence/` -- khong sua hay goi trong spec nay; Python extractor phai tach khoi RAG/AI.
- `docker-compose.yml` -- them volume private va worker/profile neu da chot.
- `services/p_process/test/`, `apps/web/test/`, `apps/web/e2e/` -- bo sung contract, boundary, idempotency, storage failure va a11y tests.

## Tasks & Acceptance

**Execution:**
- [ ] `contracts/openapi/p-api.yaml` va `contracts/events/` -- dinh nghia upload, metadata, trang thai extraction va event khong chua byte/PII.
- [ ] `apps/web/app/ticket-form.tsx`, `apps/web/app/bff/tickets/route.ts` -- nhan tep, gioi han stream va hien loi/trang thai truy cap duoc.
- [ ] `services/p_process/src/{domain,application,adapters}` -- storage/extraction ports, validation, idempotency, private filesystem adapter va Fastify boundary.
- [ ] `services/p_process/src/adapters/postgres/migrations/` -- them attachment, extraction/job va provenance co rang buoc, khong sua migration da ap dung.
- [ ] `services/document_extraction/` va `docker-compose.yml` -- worker Python/Unstructured private chi xu ly job da commit, khong co AI egress.
- [ ] `tests`, `README.md`, `BUILD.md`, `scripts/test-architecture.py` -- kiem thu va tai lieu van hanh/an toan.

**Acceptance Criteria:**
- Given tep hop le theo ma tran da chot, when khach gui ticket, then ticket, metadata, job va ket qua trich xuat co truy vet duoc tao chinh xac mot lan.
- Given tep bat hop le hoac worker that bai, when xu ly, then khong lo byte/PII; ticket da commit khong bi mat va retry khong tao ban sao.
- Given cung yeu cau duoc gui lai, when P xu ly, then metadata, file va job khong bi lap.
- Given core profile, when chay kiem thu, then khong can AI credential hay ket noi OpenRouter/Qdrant.

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Design Notes

File va PostgreSQL khong co transaction phan tan that su: dung staging key, commit metadata, finalize/compensate va reaper cho tep mo coi. File OOXML la ZIP, can co gioi han de tranh zip bomb; khong chap nhan MIME tu client.

## Verification

**Commands:**
- `npm test --prefix services/p_process` -- expected: domain, HTTP, storage va idempotency tests pass.
- `npm test --prefix apps/web` va `npm run test:e2e --prefix apps/web` -- expected: form upload/a11y pass.
- `python scripts/test-architecture.py` -- expected: ownership, private storage va khong egress AI pass.
