import { createHash } from 'node:crypto';
import type { Principal } from './principal.js';
import { ProcessingError, type ProcessingAction, type ProcessingState } from '../domain/ticket-workflow.js';
export interface ProcessingCommand { ticketId: string; version: number; action: ProcessingAction; stepId?: string; content?: string; result?: string; idempotencyKey: string; correlationId: string; principal: Principal; requestHash: string }
export interface TicketProcessingStore { process(command: ProcessingCommand): Promise<{ ticket: ProcessingState; replayed: boolean }> }
export class ProcessTicketUseCase {
  constructor(private readonly store: TicketProcessingStore) {}
  async execute(principal: Principal, ticketId: string, body: unknown, key: string | undefined, correlationId: string) {
    if (!principal.scopes.includes('tickets:write')) throw new ProcessingError(403, 'Bạn cần quyền tickets:write.');
    const input = body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : {};
    if (!key || !/^[A-Za-z0-9_.:-]{1,200}$/.test(key) || !Number.isInteger(input.version) || Number(input.version) < 1 || !['start', 'start-step', 'complete-step', 'close'].includes(String(input.action)) || Object.keys(input).some(k => !['version','action','stepId','content','result'].includes(k)) || ['stepId','content','result'].some(k => input[k] !== undefined && typeof input[k] !== 'string')) throw new ProcessingError(422, 'Lệnh cần version, action và Idempotency-Key hợp lệ.');
    const normalized = { version: Number(input.version), action: input.action as ProcessingAction, stepId: input.stepId as string | undefined, content: input.content as string | undefined, result: input.result as string | undefined };
    const requestHash = createHash('sha256').update(JSON.stringify({ ticketId, principal: principal.sub, client: principal.clientId, ...normalized })).digest('hex');
    return this.store.process({ ...normalized, principal, ticketId, idempotencyKey: key, correlationId, requestHash });
  }
}
