const MAX_BYTES = 10 * 1024 * 1024;

const allowed = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
} as const;

export type AttachmentMime = (typeof allowed)[keyof typeof allowed];

export class AttachmentValidationError extends Error {}

export function validateAttachment(name: string, mime: string, bytes: Buffer): AttachmentMime {
  const extension = name.slice(name.lastIndexOf('.')).toLowerCase() as keyof typeof allowed;
  const expected = allowed[extension];
  if (!expected || mime !== expected || bytes.length === 0 || bytes.length > MAX_BYTES) {
    throw new AttachmentValidationError('Tệp đính kèm không hợp lệ.');
  }
  const isPdf = bytes.subarray(0, 5).toString('ascii') === '%PDF-';
  const isPng = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
  if (!(isPdf || isPng || isJpeg || (isZip && (extension === '.docx' || extension === '.xlsx')))) {
    throw new AttachmentValidationError('Chữ ký tệp không hợp lệ.');
  }
  return expected;
}
