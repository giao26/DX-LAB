import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TicketValidationError,
  contactDetailsConflict,
  normalizeVietnamesePhone,
  validateTicketCreateInput,
} from '../dist/domain/ticket.js';
import { AttachmentValidationError, validateAttachment } from '../dist/domain/attachment.js';
import { FilesystemAttachmentStorage } from '../dist/adapters/storage/filesystem-attachment-storage.js';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('chuẩn hóa số điện thoại Việt Nam theo quy tắc đã duyệt', () => {
  assert.equal(normalizeVietnamesePhone('+84 912.345-678'), '0912345678');
  assert.equal(normalizeVietnamesePhone('84912345678'), '0912345678');
  assert.equal(normalizeVietnamesePhone('0912 345 678'), '0912345678');
  assert.equal(normalizeVietnamesePhone('1234'), null);
});

test('từ chối payload thiếu, sai hoặc có trường ngoài hợp đồng', () => {
  assert.throws(() => validateTicketCreateInput({ title: 'không hỗ trợ' }), (error) => {
    assert.ok(error instanceof TicketValidationError);
    assert.ok(error.fieldErrors.body);
    assert.ok(error.fieldErrors.customerEmail);
    return true;
  });
});

test('phát hiện xung đột thông tin liên hệ nhưng không yêu cầu ghi đè', () => {
  assert.equal(contactDetailsConflict(
    { customerName: 'Nguyễn Văn A', customerEmail: 'a@example.com' },
    { customerName: 'Nguyễn Văn B', customerEmail: 'a@example.com' },
  ), true);
  assert.equal(contactDetailsConflict(
    { customerName: 'Nguyễn Văn A', customerEmail: 'A@example.com' },
    { customerName: 'nguyễn văn a', customerEmail: 'a@example.com' },
  ), false);
  assert.equal(contactDetailsConflict(
    { customerName: 'Nguye\u0302̃n Văn A', customerEmail: 'a@example.com' },
    { customerName: 'Nguyễn Văn A', customerEmail: 'a@example.com' },
  ), false);
});

test('xác minh phần mở rộng, MIME, chữ ký và checksum của tệp', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
  const attachment = validateAttachment({ fileName: '../minh-hoa.png', mimeType: 'image/png', data: png.toString('base64') });
  assert.equal(attachment.displayName, 'minh-hoa.png');
  assert.equal(attachment.detectedMime, 'image/png');
  assert.equal(attachment.sizeBytes, png.length);
  assert.match(attachment.checksumSha256, /^[0-9a-f]{64}$/);

  assert.throws(() => validateAttachment({ fileName: 'gia.pdf', mimeType: 'application/pdf', data: png.toString('base64') }), (error) => {
    assert.ok(error instanceof AttachmentValidationError);
    return true;
  });
});

test('từ chối nhiều tệp trước khi tạo ticket', () => {
  assert.throws(() => validateTicketCreateInput({
    customerName: 'Nguyễn Văn A', customerPhone: '0912345678', customerEmail: 'a@example.com',
    provisionalType: 'Tư vấn', description: 'Nội dung yêu cầu hợp lệ.', attachment: [{}, {}],
  }), (error) => {
    assert.equal(error.fieldErrors.attachment[0], 'Chỉ được phép đính kèm một tệp.');
    return true;
  });
});

test('filesystem storage dùng khóa mờ và xóa được file riêng tư', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dxlab-attachment-'));
  try {
    const storage = new FilesystemAttachmentStorage(root);
    const content = Buffer.from('private evidence');
    const key = await storage.save(content);
    assert.match(key, /^[0-9a-f-]{36}$/);
    assert.deepEqual(await readFile(join(root, key.slice(0, 2), key)), content);
    await storage.remove(key);
    await assert.rejects(readFile(join(root, key.slice(0, 2), key)), { code: 'ENOENT' });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
