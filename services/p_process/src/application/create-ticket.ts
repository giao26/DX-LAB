import { createHash } from 'node:crypto';
import {
  TicketCreateInput,
  TicketRecord,
  validateTicketCreateInput,
} from '../domain/ticket.js';

export interface TicketIntakeResult {
  ticket: TicketRecord;
  replayed: boolean;
}

export interface TicketIntakeStore {
  lookupIdempotency(command: {
    idempotencyKey: string;
    requestHash: string;
  }): Promise<TicketIntakeResult | null>;
  createTicket(command: {
    input: TicketCreateInput;
    idempotencyKey: string;
    requestHash: string;
  }): Promise<TicketIntakeResult>;
  getTicketById?(id: string): Promise<TicketRecord | null>;
  getPublicTicketStatus?(id: string): Promise<Pick<TicketRecord, 'id' | 'code' | 'status' | 'confirmationEmailStatus'> | null>;
}

export class IdempotencyConflictError extends Error {
  constructor() {
    super('Idempotency-Key đã được sử dụng với dữ liệu khác.');
    this.name = 'IdempotencyConflictError';
  }
}

export class IdempotencyInProgressError extends Error {
  constructor() {
    super('Yêu cầu có cùng Idempotency-Key đang được xử lý.');
    this.name = 'IdempotencyInProgressError';
  }
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'undefined';
}

function stableHash(input: unknown): string {
  const canonical = canonicalJson(input);
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

function hashableBody(body: unknown): unknown {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return body;
  const value = body as Record<string, unknown>;
  const attachment = value.attachment;
  if (!attachment || typeof attachment !== 'object' || Array.isArray(attachment)) return body;
  const raw = attachment as Record<string, unknown>;
  if (typeof raw.data !== 'string') return body;
  return {
    ...value,
    attachment: {
      ...raw,
      data: createHash('sha256').update(raw.data, 'utf8').digest('hex'),
    },
  };
}

export class CreateTicketUseCase {
  constructor(private readonly store: TicketIntakeStore) {}

  async execute(body: unknown, idempotencyKey: string): Promise<TicketIntakeResult> {
    // Avoid retaining or repeatedly canonicalizing the full base64 payload while
    // preserving exact idempotency semantics for the uploaded bytes.
    const requestHash = stableHash(hashableBody(body));
    const replay = await this.store.lookupIdempotency({ idempotencyKey, requestHash });
    if (replay) return replay;
    const input = validateTicketCreateInput(body);
    return this.store.createTicket({ input, idempotencyKey, requestHash });
  }

  async getTicketById(id: string): Promise<TicketRecord | null> {
    if (this.store.getTicketById) {
      return this.store.getTicketById(id);
    }
    return null;
  }

  async getPublicTicketStatus(id: string) {
    return this.store.getPublicTicketStatus ? this.store.getPublicTicketStatus(id) : null;
  }
}

