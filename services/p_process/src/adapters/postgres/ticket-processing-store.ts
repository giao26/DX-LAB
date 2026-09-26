import type pg from 'pg';
import type { ProcessingCommand, TicketProcessingStore } from '../../application/process-ticket.js';
import { applyProcessing, ProcessingError, workflowFor, type ProcessingState } from '../../domain/ticket-workflow.js';
import { businessDeadline, businessMinutes, parseBusinessCalendar, type BusinessCalendar } from '../../domain/business-calendar.js';
import { PostgresAssignmentStore } from './assignment-store.js';
export function processingState(row: Record<string, any>): ProcessingState {
  return { status: row.status, version: Number(row.version), workflow: row.workflow_snapshot ?? null, calendar: row.calendar_snapshot ?? null, steps: row.processing_steps ?? [], closedAt: row.closed_at ? new Date(row.closed_at).toISOString() : null, result: row.processing_result ?? null, slaDueAt: row.sla_due_at ? new Date(row.sla_due_at).toISOString() : null, slaOverdue: Boolean(row.sla_overdue) };
}
export async function backfillTicketProcessing(pool: pg.Pool, calendar = parseBusinessCalendar(process.env.SLA_HOLIDAYS)) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const rows = await client.query(`SELECT * FROM dx_core.tickets WHERE calendar_snapshot IS NULL OR sla_due_at IS NULL OR (status = 'IN_PROGRESS' AND workflow_snapshot IS NULL) OR (status = 'CLOSED' AND closed_at IS NULL) FOR UPDATE`);
    for (const row of rows.rows) {
      const snapshot = row.calendar_snapshot ?? calendar;
      const workflow = row.workflow_snapshot ?? (row.status === 'IN_PROGRESS' ? workflowFor(row.provisional_type) : null);
      const steps = row.status === 'IN_PROGRESS' && !row.workflow_snapshot ? [{...workflow.steps[0],startedAt:row.updated_at.toISOString(),endedAt:null,content:null,actorSub:row.assigned_sub ?? 'legacy'}] : row.processing_steps;
      const closedAt = row.closed_at ?? (row.status === 'CLOSED' ? row.updated_at : null);
      await client.query(`UPDATE dx_core.tickets SET calendar_snapshot=$2, workflow_snapshot=$3, processing_steps=$4, closed_at=$5, sla_due_at=COALESCE(sla_due_at,$6), sla_overdue=sla_overdue OR $7 WHERE id=$1`, [row.id,JSON.stringify(snapshot),JSON.stringify(workflow),JSON.stringify(steps),closedAt,businessDeadline(row.received_at,120,snapshot),businessMinutes(row.received_at,closedAt ?? new Date(),snapshot)>120]);
    }
    await client.query('COMMIT');
  } catch(error) { await client.query('ROLLBACK'); throw error; } finally {client.release();}
}
export class PostgresTicketProcessingStore implements TicketProcessingStore {
  constructor(private readonly pool: pg.Pool, private readonly calendar: BusinessCalendar = parseBusinessCalendar(process.env.SLA_HOLIDAYS), private readonly assignment = new PostgresAssignmentStore(pool)) {}
  async process(command: ProcessingCommand) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      // Serialize identical keys before taking ticket locks; key and replay belong to this transaction.
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [command.idempotencyKey]);
      const found = await client.query('SELECT * FROM dx_core.tickets WHERE id = $1::uuid FOR UPDATE', [command.ticketId]);
      const row = found.rows[0];
      if (!row) throw new ProcessingError(404, 'Không tìm thấy ticket.');
      if (row.assigned_sub !== command.principal.sub || !command.principal.groupIds.includes(row.group_id) || !command.principal.scopes.includes('tickets:write')) throw new ProcessingError(403, 'Chỉ người phụ trách còn quyền nhóm được sửa. Hãy tải lại hoặc liên hệ trưởng nhóm.');
      const endpoint = `/api/v1/tickets/${command.ticketId}/process`;
      const existing = await client.query('SELECT * FROM dx_core.idempotency_keys WHERE key = $1', [command.idempotencyKey]);
      if (existing.rowCount) {
        const saved = existing.rows[0];
        if (saved.target_endpoint !== endpoint || saved.request_hash !== command.requestHash) throw new ProcessingError(409, 'Khóa đã dùng cho nội dung khác. Hãy dùng khóa mới.');
        await client.query('COMMIT'); return { ticket: saved.response_body as ProcessingState, replayed: true };
      }
      const before = processingState(row);
      if (before.version !== command.version) throw new ProcessingError(409, 'Ticket đã thay đổi. Hãy tải lại trước khi tiếp tục.');
      const time = await client.query('SELECT clock_timestamp() AS now'); const now = time.rows[0].now.toISOString();
      const next = applyProcessing(before, command, row.provisional_type, command.principal.sub, now, this.calendar);
      next.calendar = before.calendar ?? next.calendar ?? this.calendar;
      const calendar = next.calendar;
      next.slaDueAt = before.slaDueAt ?? businessDeadline(row.received_at, 120, calendar);
      next.slaOverdue = before.slaOverdue || businessMinutes(row.received_at, next.closedAt ?? now, calendar) > 120;
      await client.query(`UPDATE dx_core.tickets SET status=$2, version=$3, workflow_snapshot=$4, calendar_snapshot=$5, processing_steps=$6, closed_at=$7, processing_result=$8, sla_due_at=$9, sla_overdue=$10, updated_at=$11 WHERE id=$1::uuid`, [command.ticketId,next.status,next.version,JSON.stringify(next.workflow),JSON.stringify(next.calendar),JSON.stringify(next.steps),next.closedAt,next.result,next.slaDueAt,next.slaOverdue,now]);
      await client.query(`INSERT INTO dx_core.audit_logs (actor_sub, action, aggregate_type, aggregate_id, correlation_id, causation_id, before_state, after_state, metadata) VALUES ($1,$2,'ticket',$3,$4,$5,$6,$7,$8)`, [command.principal.sub,`ticket.${command.action}`,command.ticketId,command.correlationId,command.idempotencyKey,JSON.stringify(before),JSON.stringify(next),JSON.stringify({clientId:command.principal.clientId,source:'p-api'})]);
      await client.query(`INSERT INTO dx_core.outbox_events (event_type,aggregate_id,aggregate_version,actor_sub,correlation_id,causation_id,payload) VALUES ('ticket.processing.v1',$1,$2,$3,$4,$5,$6)`, [command.ticketId,next.version,command.principal.sub,command.correlationId,command.idempotencyKey,JSON.stringify({ticket_id:command.ticketId,ticket_code:row.code,status:next.status,action:command.action,version:next.version})]);
      if (next.status === 'CLOSED') await this.assignment.assignNextQueuedTicket(row.group_id,command.correlationId,client);
      await client.query(`INSERT INTO dx_core.idempotency_keys (key,target_endpoint,request_hash,response_status,response_body,expires_at) VALUES ($1,$2,$3,200,$4,CURRENT_TIMESTAMP + INTERVAL '100 years')`, [command.idempotencyKey,endpoint,command.requestHash,JSON.stringify(next)]);
      await client.query('COMMIT'); return {ticket:next,replayed:false};
    } catch(error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }
}
