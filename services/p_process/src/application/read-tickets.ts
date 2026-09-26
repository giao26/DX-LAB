import type { AttachmentRecord } from '../domain/attachment.js';
import type { Principal } from './principal.js';
import { hasOrganizationWideAccess, isGroupLead } from './principal.js';
import { businessDeadline, businessMinutes, parseBusinessCalendar, type BusinessCalendar } from '../domain/business-calendar.js';
import type { ProcessingState } from '../domain/ticket-workflow.js';

export interface TicketListRow {
  id: string;
  code: string;
  provisionalType: string;
  status: 'WAITING' | 'IN_PROGRESS' | 'CLOSED';
  groupId: string;
  assignedSub: string | null;
  receivedAt: string;
  updatedAt: string;
  processing?: ProcessingState;
}

export interface ScopedTicketRow extends TicketListRow {
  description: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  attachment?: AttachmentRecord & { storageKey: string };
}

export interface TicketListItem {
  id: string;
  code: string;
  provisionalType: string;
  status: string;
  slaDueAt: string | null;
  slaOverdue: boolean;
  slaElapsedMinutes: number;
  summary: string;
}

export interface TicketDetail extends TicketListItem {
  description: string;
  groupId: string;
  assignedToMe: boolean;
  version: number;
  workflow: ProcessingState['workflow'];
  steps: Array<ProcessingState['steps'][number] & { businessMinutes: number }>;
  closedAt: string | null;
  result: string | null;
  allowedActions: string[];
  customer?: { name: string; phone: string; email: string };
  attachment?: Omit<AttachmentRecord, 'checksumSha256'>;
}

export interface TicketReadStore {
  listScoped(input: {
    groupIds: string[];
    organizationWide: boolean;
    status?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: TicketListRow[]; total: number }>;
  getScoped(input: {
    ticketId: string;
    sub: string;
    groupIds: string[];
    groupLead: boolean;
    organizationWide: boolean;
  }): Promise<ScopedTicketRow | null>;
  getAttachmentScoped(input: {
    attachmentId: string;
    sub: string;
    groupIds: string[];
    organizationWide: boolean;
  }): Promise<ScopedTicketRow | null>;
}

export interface ReadAuditPort {
  record(input: {
    actorSub: string;
    clientId: string;
    action: 'ticket.list' | 'ticket.read' | 'attachment.download';
    resourceId: string;
    correlationId: string;
    outcome: 'allowed';
  }): Promise<void>;
}

function safeSummary(row: TicketListRow): string {
  return `Yêu cầu ${row.provisionalType}`;
}

function listDto(row: TicketListRow, fallback: BusinessCalendar): TicketListItem {
  const state = row.processing;
  const calendar = state?.calendar ?? fallback;
  const elapsed = businessMinutes(row.receivedAt, state?.closedAt ?? new Date(), calendar);
  return {
    id: row.id,
    code: row.code,
    provisionalType: row.provisionalType,
    status: row.status,
    slaDueAt: state?.slaDueAt ?? businessDeadline(row.receivedAt, 120, calendar),
    slaOverdue: Boolean(state?.slaOverdue) || elapsed > 120,
    slaElapsedMinutes: elapsed,
    summary: safeSummary(row),
  };
}

export class ReadTicketsUseCase {
  constructor(
    private readonly store: TicketReadStore,
    private readonly audit: ReadAuditPort,
    private readonly calendar: BusinessCalendar = parseBusinessCalendar(process.env.SLA_HOLIDAYS),
  ) {}

  async list(principal: Principal, query: { status?: string; limit?: number; offset?: number }, correlationId: string) {
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
    const offset = Math.max(query.offset ?? 0, 0);
    const result = await this.store.listScoped({
      groupIds: principal.groupIds,
      organizationWide: hasOrganizationWideAccess(principal),
      status: query.status,
      limit,
      offset,
    });
    await this.audit.record({
      actorSub: principal.sub,
      clientId: principal.clientId,
      action: 'ticket.list',
      resourceId: 'ticket-list',
      correlationId,
      outcome: 'allowed',
    });
    return { items: result.rows.map(row => listDto(row, this.calendar)), total: result.total };
  }

  async detail(principal: Principal, ticketId: string, correlationId: string): Promise<TicketDetail | null> {
    const organizationWide = hasOrganizationWideAccess(principal);
    const row = await this.store.getScoped({
      ticketId,
      sub: principal.sub,
      groupIds: principal.groupIds,
      groupLead: isGroupLead(principal),
      organizationWide,
    });
    if (!row) return null;
    const sensitive = organizationWide || row.assignedSub === principal.sub;
    const state = row.processing;
    const canWrite = row.assignedSub === principal.sub && principal.groupIds.includes(row.groupId) && principal.scopes.includes('tickets:write') && row.status !== 'CLOSED';
    const steps = state?.steps ?? [];
    const current = steps.at(-1);
    const allowedActions = !canWrite ? [] : row.status === 'WAITING' ? ['start'] : !current?.endedAt ? ['complete-step'] : steps.length === state?.workflow?.steps.length ? ['close'] : ['start-step'];
    await this.audit.record({
      actorSub: principal.sub,
      clientId: principal.clientId,
      action: 'ticket.read',
      resourceId: row.id,
      correlationId,
      outcome: 'allowed',
    });
    return {
      ...listDto(row, this.calendar),
      version: state?.version ?? 1,
      workflow: state?.workflow ?? null,
      steps: steps.map(step => ({...step, content: sensitive ? step.content : null, businessMinutes: businessMinutes(step.startedAt, step.endedAt ?? state?.closedAt ?? new Date(), state?.calendar ?? this.calendar)})),
      closedAt: state?.closedAt ?? null,
      result: sensitive ? state?.result ?? null : null,
      allowedActions,
      description: row.description,
      groupId: row.groupId,
      assignedToMe: row.assignedSub === principal.sub,
      ...(sensitive ? {
        customer: { name: row.customerName, phone: row.customerPhone, email: row.customerEmail },
        ...(row.attachment ? { attachment: {
          id: row.attachment.id,
          displayName: row.attachment.displayName,
          sizeBytes: row.attachment.sizeBytes,
          detectedMime: row.attachment.detectedMime,
          createdAt: row.attachment.createdAt,
        } } : {}),
      } : {}),
    };
  }

  async attachment(principal: Principal, attachmentId: string) {
    const row = await this.store.getAttachmentScoped({
      attachmentId,
      sub: principal.sub,
      groupIds: principal.groupIds,
      organizationWide: hasOrganizationWideAccess(principal),
    });
    if (!row?.attachment) return null;
    return row.attachment;
  }

  async auditAttachmentDownload(principal: Principal, attachmentId: string, correlationId: string): Promise<void> {
    await this.audit.record({
      actorSub: principal.sub,
      clientId: principal.clientId,
      action: 'attachment.download',
      resourceId: attachmentId,
      correlationId,
      outcome: 'allowed',
    });
  }
}
