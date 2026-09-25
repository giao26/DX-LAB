/**
 * DX-LAB Process Core (P) - Fair Ticket Assignment Domain
 * Copyright (C) 2026 DX-LAB Development Team
 * License: AGPL-3.0
 */

export interface StaffMember {
  sub: string;
  groupId: string;
  isActive: boolean;
  officialAssignmentCount: number;
  lastAssignedAt: string | null;
}

export interface TicketAssignedEventPayload {
  ticket_id: string;
  ticket_code: string;
  assigned_sub: string;
  group_id: string;
  assignment_status: string;
  assigned_at: string;
  internal_ticket_url: string;
  ticketId?: string;
  ticketCode?: string;
  assignedSub?: string;
  groupId?: string;
}

export interface AssignmentResult {
  assigned: boolean;
  assignedSub: string | null;
  ticketId: string;
  ticketCode: string;
  groupId: string;
}

/**
 * Pure domain algorithm for selecting the fair recipient of a ticket.
 * Rules:
 * 1. Must be active and in the group.
 * 2. Must not have any active ticket (WAITING or IN_PROGRESS).
 * 3. Priority to candidate with lowest official_assignment_count.
 * 4. Tie-break: lowest last_assigned_at (least recently assigned, NULLS FIRST).
 * 5. Tie-break: ascending invariant sub.
 */
export function selectStaffForAssignment(
  candidates: StaffMember[],
  activeSubs: Set<string>,
): StaffMember | null {
  const eligible = candidates.filter((s) => s.isActive && !activeSubs.has(s.sub));
  if (eligible.length === 0) return null;

  eligible.sort((a, b) => {
    if (a.officialAssignmentCount !== b.officialAssignmentCount) {
      return a.officialAssignmentCount - b.officialAssignmentCount;
    }
    if (a.lastAssignedAt === null && b.lastAssignedAt !== null) return -1;
    if (a.lastAssignedAt !== null && b.lastAssignedAt === null) return 1;
    if (a.lastAssignedAt !== null && b.lastAssignedAt !== null) {
      const timeDiff = new Date(a.lastAssignedAt).getTime() - new Date(b.lastAssignedAt).getTime();
      if (timeDiff !== 0) return timeDiff;
    }
    return a.sub.localeCompare(b.sub);
  });

  return eligible[0];
}

/**
 * Construct safe event payload for TICKET_ASSIGNED event.
 * Note: Under NO circumstance should customer PII (email, phone, file URL) be included.
 */
export function buildTicketAssignedPayload(params: {
  ticketId: string;
  ticketCode: string;
  assignedSub: string;
  groupId: string;
  assignedAt?: string;
}): TicketAssignedEventPayload {
  const assignedAt = params.assignedAt ?? new Date().toISOString();
  const internalTicketUrl = `/dx/tickets/workspace/${params.ticketId}`;
  return {
    ticket_id: params.ticketId,
    ticket_code: params.ticketCode,
    assigned_sub: params.assignedSub,
    group_id: params.groupId,
    assignment_status: 'ASSIGNED',
    assigned_at: assignedAt,
    internal_ticket_url: internalTicketUrl,
    ticketId: params.ticketId,
    ticketCode: params.ticketCode,
    assignedSub: params.assignedSub,
    groupId: params.groupId,
  };
}
