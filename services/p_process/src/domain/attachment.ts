import { createHash } from 'node:crypto';
import { basename, extname } from 'node:path';

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export interface AttachmentCreateInput {
  displayName: string;
  sizeBytes: number;
  detectedMime: 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf';
  checksumSha256: string;
  content: Buffer;
}

export interface AttachmentRecord {
  id: string;
  displayName: string;
  sizeBytes: number;
  detectedMime: AttachmentCreateInput['detectedMime'];
  checksumSha256: string;
  createdAt: string;
}

type RawAttachment = { fileName?: unknown; mimeType?: unknown; data?: unknown };

export class AttachmentValidationError extends Error {
  constructor(public readonly message: string) {
    super(message);
    this.name = 'AttachmentValidationError';
  }
}

const EXTENSIONS: Record<AttachmentCreateInput['detectedMime'], Set<string>> = {
  'image/jpeg': new Set(['.jpg', '.jpeg']),
  'image/png': new Set(['.png']),
  'image/webp': new Set(['.webp']),
  'application/pdf': new Set(['.pdf']),
};

function detectMime(content: Buffer): AttachmentCreateInput['detectedMime'] | null {
  if (content.length >= 8 && content.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (content.length >= 4 && content[0] === 0xff && content[1] === 0xd8 && content[2] === 0xff
    && content[content.length - 2] === 0xff && content[content.length - 1] === 0xd9) return 'image/jpeg';
  if (content.length >= 12 && content.toString('ascii', 0, 4) === 'RIFF' && content.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  if (content.length >= 8 && content.toString('ascii', 0, 5) === '%PDF-'
    && content.subarray(Math.max(0, content.length - 1024)).includes(Buffer.from('%%EOF'))) return 'application/pdf';
  return null;
}

export function validateAttachment(value: unknown): AttachmentCreateInput | undefined {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) throw new AttachmentValidationError('Chỉ được phép đính kèm một tệp.');
  const raw = value && typeof value === 'object' ? value as RawAttachment : {};
  const rawName = typeof raw.fileName === 'string' ? raw.fileName : '';
  const displayName = basename(rawName.replace(/\\/g, '/')).replace(/[\u0000-\u001f\u007f]/g, '').trim();
  const declaredMime = typeof raw.mimeType === 'string' ? raw.mimeType.toLowerCase().trim() : '';
  if (!displayName || displayName.length > 255 || typeof raw.data !== 'string') {
    throw new AttachmentValidationError('Tệp đính kèm không hợp lệ.');
  }
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(raw.data) || raw.data.length % 4 !== 0) {
    throw new AttachmentValidationError('Nội dung tệp đính kèm không hợp lệ.');
  }
  const content = Buffer.from(raw.data, 'base64');
  if (content.length === 0) throw new AttachmentValidationError('Tệp đính kèm không được để trống.');
  if (content.length > MAX_ATTACHMENT_BYTES) {
    throw new AttachmentValidationError('Tệp đính kèm không được lớn hơn 10 MB.');
  }
  const detectedMime = detectMime(content);
  const extension = extname(displayName).toLowerCase();
  if (!detectedMime || !EXTENSIONS[detectedMime].has(extension) || declaredMime !== detectedMime) {
    throw new AttachmentValidationError('Tệp phải là JPG, PNG, WebP hoặc PDF; định dạng, MIME và chữ ký tệp phải khớp nhau.');
  }
  return {
    displayName,
    sizeBytes: content.length,
    detectedMime,
    checksumSha256: createHash('sha256').update(content).digest('hex'),
    content,
  };
}
