export const REQUEST_TYPES = ['Khiếu nại', 'Tư vấn', 'Bảo hành'] as const;

export type RequestType = (typeof REQUEST_TYPES)[number];

export interface TicketCreateInput {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  provisionalType: RequestType;
  description: string;
}

export interface TicketRecord extends TicketCreateInput {
  id: string;
  code: string;
  customerId: string;
  status: 'WAITING' | 'IN_PROGRESS' | 'CLOSED';
  contactReviewRequired: boolean;
  confirmationEmailStatus?: 'PENDING' | 'SENT' | 'FAILED' | 'DEAD_LETTER';
  receivedAt: string;
  createdAt: string;
  updatedAt: string;
}

export type FieldErrors = Record<string, string[]>;

export class TicketValidationError extends Error {
  constructor(public readonly fieldErrors: FieldErrors) {
    super('Dữ liệu gửi lên chưa hợp lệ');
    this.name = 'TicketValidationError';
  }
}

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

export function normalizeVietnamesePhone(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  let normalized = value.trim().replace(/[\s.-]/g, '');
  if (normalized.startsWith('+84')) normalized = `0${normalized.slice(3)}`;
  else if (normalized.startsWith('84')) normalized = `0${normalized.slice(2)}`;
  return /^0\d{9,10}$/.test(normalized) ? normalized : null;
}

export function validateTicketCreateInput(value: unknown): TicketCreateInput {
  const body = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const errors: FieldErrors = {};
  const customerName = cleanText(body.customerName);
  const customerEmail = cleanText(body.customerEmail).toLowerCase();
  const customerPhone = normalizeVietnamesePhone(body.customerPhone);
  const provisionalType = cleanText(body.provisionalType);
  const description = typeof body.description === 'string' ? body.description.trim() : '';

  if (customerName.length < 2 || customerName.length > 120) {
    errors.customerName = ['Họ và tên phải có từ 2 đến 120 ký tự.'];
  }
  if (!customerPhone) {
    errors.customerPhone = ['Số điện thoại Việt Nam không đúng định dạng.'];
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail) || customerEmail.length > 254) {
    errors.customerEmail = ['Email không đúng định dạng.'];
  }
  if (!REQUEST_TYPES.includes(provisionalType as RequestType)) {
    errors.provisionalType = ['Hãy chọn Khiếu nại, Tư vấn hoặc Bảo hành.'];
  }
  if (description.length < 10 || description.length > 4000) {
    errors.description = ['Nội dung chi tiết phải có từ 10 đến 4000 ký tự.'];
  }

  const allowed = new Set(['customerName', 'customerPhone', 'customerEmail', 'provisionalType', 'description']);
  const unknown = Object.keys(body).filter((key) => !allowed.has(key));
  if (unknown.length > 0) errors.body = ['Yêu cầu chứa trường không được hỗ trợ.'];

  if (Object.keys(errors).length > 0) throw new TicketValidationError(errors);
  return {
    customerName,
    customerPhone: customerPhone!,
    customerEmail,
    provisionalType: provisionalType as RequestType,
    description,
  };
}

export function contactDetailsConflict(
  existing: { customerName: string; customerEmail: string },
  incoming: Pick<TicketCreateInput, 'customerName' | 'customerEmail'>,
): boolean {
  const canonicalName = (value: string) => value.normalize('NFC').trim().toLocaleLowerCase('vi');
  return canonicalName(existing.customerName) !== canonicalName(incoming.customerName)
    || existing.customerEmail.trim().toLowerCase() !== incoming.customerEmail.trim().toLowerCase();
}
