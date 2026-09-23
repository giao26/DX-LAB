import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TicketValidationError,
  contactDetailsConflict,
  normalizeVietnamesePhone,
  validateTicketCreateInput,
} from '../dist/domain/ticket.js';

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
