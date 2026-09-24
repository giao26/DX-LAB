import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import {
  buildConfirmationEmail,
  buildConfirmationEmailIdempotencyKey,
  MAX_NOTIFICATION_RETRIES,
  sanitizeErrorMessage,
  sanitizeLogData,
} from '../dist/domain/notification.js';
import { ProcessNotificationsUseCase } from '../dist/application/process-notifications.js';
import { SmtpMailer } from '../dist/adapters/notification/smtp-mailer.js';

test('buildConfirmationEmail tạo email chứa đủ mã ticket, thời điểm và trạng thái "Chờ xử lý"', () => {
  const email = buildConfirmationEmail({
    ticketCode: 'TCK-2026-000001',
    receivedAt: '2026-09-24T12:00:00.000Z',
    customerName: 'Nguyễn Văn A',
  });

  assert.ok(email.subject.includes('TCK-2026-000001'));
  assert.ok(email.body.includes('Nguyễn Văn A'));
  assert.ok(email.body.includes('TCK-2026-000001'));
  assert.ok(email.body.includes('2026-09-24T12:00:00.000Z'));
  assert.ok(email.body.includes('Chờ xử lý'));
});

test('buildConfirmationEmailIdempotencyKey tạo khóa đúng chuẩn email:ticket-created:<id>', () => {
  const ticketId = 'a33e617f-9374-4df6-8a91-3caf987f0068';
  const key = buildConfirmationEmailIdempotencyKey(ticketId);
  assert.equal(key, 'email:ticket-created:a33e617f-9374-4df6-8a91-3caf987f0068');
});

test('sanitizeErrorMessage làm sạch mật khẩu, token, base64 và mô tả', () => {
  const dirty1 = 'SMTP auth failed: password=test-supersecretpass and token=sk-test-token-abcdef1234';
  const clean1 = sanitizeErrorMessage(dirty1);
  assert.ok(!clean1.includes('test-supersecretpass'));
  assert.ok(!clean1.includes('sk-test-token-abcdef1234'));
  assert.ok(clean1.includes('[REDACTED]'));

  const dirty2 = 'Error description="Khách hàng bảo sản phẩm cháy nổ"';
  const clean2 = sanitizeErrorMessage(dirty2);
  assert.ok(!clean2.includes('sản phẩm cháy nổ'));

  const dirty3 = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
  const clean3 = sanitizeErrorMessage(dirty3);
  assert.ok(!clean3.includes('eyJhbGciOi'));
});

test('sanitizeLogData loại bỏ các trường nhạy cảm khỏi metadata', () => {
  const metadata = {
    ticketId: 't-123',
    password: 'test_smtp_password_placeholder',
    token: 'test_bearer_token_dummy',
    description: 'Nội dung phản ánh của khách hàng',
    recipient: 'user@example.com',
  };
  const sanitized = sanitizeLogData(metadata);
  assert.equal(sanitized.ticketId, 't-123');
  assert.equal(sanitized.password, '[REDACTED]');
  assert.equal(sanitized.token, '[REDACTED]');
  assert.equal(sanitized.description, '[REDACTED]');
  assert.equal(sanitized.recipient, 'user@example.com');
});

test('gửi email thành công: cập nhật trạng thái SENT và ghi audit log an toàn', async () => {
  const audits = [];
  const statusUpdates = [];

  const mockStore = {
    async claimPendingNotifications() { return []; },
    async findByIdempotencyKey() { return null; },
    async findByTicketId() { return null; },
    async createNotification() { throw new Error('not implemented'); },
    async updateNotificationStatus(id, status, details) {
      statusUpdates.push({ id, status, details });
    },
  };

  const mockMailer = {
    async sendMail(opts) {
      return { messageId: '<msg-1@dx-lab.org>', accepted: [opts.to], response: '250 Queued' };
    },
  };

  const mockAudit = {
    async recordAudit(entry) {
      audits.push(entry);
    },
  };

  const notification = {
    id: 'n-1',
    idempotencyKey: 'email:ticket-created:t-1',
    ticketId: 't-1',
    recipientEmail: 'a@example.com',
    subject: 'Xác nhận ticket TCK-001',
    body: 'Nội dung email',
    status: 'PENDING',
    retryCount: 0,
    maxRetries: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const useCase = new ProcessNotificationsUseCase(mockStore, mockMailer, mockAudit);
  const result = await useCase.processNotification(notification);

  assert.equal(result.success, true);
  assert.equal(result.status, 'SENT');
  assert.equal(statusUpdates.length, 1);
  assert.equal(statusUpdates[0].status, 'SENT');
  assert.equal(statusUpdates[0].details.providerResponse.messageId, '<msg-1@dx-lab.org>');

  assert.equal(audits.length, 1);
  assert.equal(audits[0].action, 'notification.sent');
  assert.equal(audits[0].aggregateId, 't-1');
  assert.equal(audits[0].correlationId, 'email:ticket-created:t-1');
  assert.equal(audits[0].metadata.messageId, '<msg-1@dx-lab.org>');
  // Kiểm tra không lộ mật khẩu hay mô tả trong audit
  assert.equal(audits[0].metadata.password, undefined);
  assert.equal(audits[0].metadata.description, undefined);
});

test('lỗi SMTP và retry có giới hạn: chuyển FAILED rồi DEAD_LETTER sau 3 lần', async () => {
  const statusUpdates = [];
  const audits = [];

  const mockStore = {
    async claimPendingNotifications() { return []; },
    async findByIdempotencyKey() { return null; },
    async findByTicketId() { return null; },
    async createNotification() { throw new Error('not implemented'); },
    async updateNotificationStatus(id, status, details) {
      statusUpdates.push({ id, status, details });
    },
  };

  const mockMailer = {
    async sendMail() {
      throw new Error('Connection refused by SMTP password=test-secret123');
    },
  };

  const mockAudit = {
    async recordAudit(entry) {
      audits.push(entry);
    },
  };

  const useCase = new ProcessNotificationsUseCase(mockStore, mockMailer, mockAudit);

  // Lần 1: retryCount 0 -> 1, status FAILED
  const notif1 = {
    id: 'n-retry',
    idempotencyKey: 'email:ticket-created:t-retry',
    ticketId: 't-retry',
    recipientEmail: 'a@example.com',
    subject: 'Xác nhận ticket',
    body: 'Nội dung',
    status: 'PENDING',
    retryCount: 0,
    maxRetries: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const res1 = await useCase.processNotification(notif1);
  assert.equal(res1.success, false);
  assert.equal(res1.status, 'FAILED');
  assert.equal(statusUpdates[0].details.retryCount, 1);
  assert.ok(!statusUpdates[0].details.lastError.includes('test-secret123'));
  assert.ok(statusUpdates[0].details.lastError.includes('[REDACTED]'));

  // Lần 2: retryCount 1 -> 2, status FAILED
  const notif2 = { ...notif1, retryCount: 1, status: 'FAILED' };
  const res2 = await useCase.processNotification(notif2);
  assert.equal(res2.status, 'FAILED');
  assert.equal(statusUpdates[1].details.retryCount, 2);

  // Lần 3: retryCount 2 -> 3, status DEAD_LETTER
  const notif3 = { ...notif1, retryCount: 2, status: 'FAILED' };
  const res3 = await useCase.processNotification(notif3);
  assert.equal(res3.status, 'DEAD_LETTER');
  assert.equal(statusUpdates[2].details.retryCount, 3);
  assert.equal(statusUpdates[2].status, 'DEAD_LETTER');

  // Audit ghi nhận dead letter
  const deadLetterAudit = audits.find((a) => a.action === 'notification.dead_letter');
  assert.ok(deadLetterAudit);
  assert.equal(deadLetterAudit.aggregateId, 't-retry');
});

test('phát lại sự kiện ticket.created.v1: khóa idempotency chặn việc gửi email trùng', async () => {
  let mailSentCount = 0;
  const existingNotification = {
    id: 'n-sent',
    idempotencyKey: 'email:ticket-created:ticket-dup-1',
    ticketId: 'ticket-dup-1',
    recipientEmail: 'dup@example.com',
    subject: 'Xác nhận',
    body: 'Nội dung',
    status: 'SENT',
    retryCount: 0,
    maxRetries: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockStore = {
    async claimPendingNotifications() { return []; },
    async findByIdempotencyKey(key) {
      if (key === 'email:ticket-created:ticket-dup-1') return existingNotification;
      return null;
    },
    async findByTicketId() { return null; },
    async createNotification() { throw new Error('không được tạo thêm outbox'); },
    async updateNotificationStatus() {},
  };

  const mockMailer = {
    async sendMail() {
      mailSentCount++;
      return { messageId: '<dup@dx-lab.org>' };
    },
  };

  const useCase = new ProcessNotificationsUseCase(mockStore, mockMailer);

  const eventEnvelope = {
    event_id: 'e-1',
    event_type: 'ticket.created.v1',
    aggregate_id: 'ticket-dup-1',
    aggregate_version: 1,
    occurred_at: new Date().toISOString(),
    actor_sub: 'public-ticket-form',
    correlation_id: 'c-1',
    causation_id: 'c-1',
    payload: {
      ticket_id: 'ticket-dup-1',
      ticket_code: 'TCK-2026-000099',
    },
  };

  const result = await useCase.handleTicketCreatedEvent(eventEnvelope);
  assert.equal(result.ignored, true);
  assert.equal(result.reason, 'ALREADY_SENT');
  assert.equal(mailSentCount, 0); // Không gửi email lần hai!
});

test('SmtpMailer kết nối socket TCP và gửi email chuẩn', async (t) => {
  // Tạo mock SMTP TCP server cục bộ
  let receivedData = '';
  const server = net.createServer((socket) => {
    socket.setEncoding('utf8');
    socket.write('220 localhost ESMTP DxLabMockMailpit\r\n');

    socket.on('data', (data) => {
      receivedData += data;
      if (data.startsWith('EHLO')) {
        socket.write('250-localhost\r\n250 HELP\r\n');
      } else if (data.startsWith('MAIL FROM:')) {
        socket.write('250 2.1.0 Ok\r\n');
      } else if (data.startsWith('RCPT TO:')) {
        socket.write('250 2.1.5 Ok\r\n');
      } else if (data.startsWith('DATA')) {
        socket.write('354 End data with <CR><LF>.<CR><LF>\r\n');
      } else if (data.includes('\r\n.\r\n')) {
        socket.write('250 2.0.0 Ok: queued as mock123\r\n');
      } else if (data.startsWith('QUIT')) {
        socket.write('221 2.0.0 Bye\r\n');
        socket.end();
      }
    });
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());

  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;

  const mailer = new SmtpMailer({
    host: '127.0.0.1',
    port,
    timeoutMs: 2000,
  });

  const res = await mailer.sendMail({
    to: 'customer@example.com',
    subject: 'Xác nhận tiếp nhận yêu cầu hỗ trợ #TCK-2026-000001',
    text: 'Xin chào, yêu cầu của bạn đang ở trạng thái Chờ xử lý.',
  });

  assert.ok(res.accepted.includes('customer@example.com'));
  assert.ok(receivedData.includes('MAIL FROM:<no-reply@dx-lab.org>'));
  assert.ok(receivedData.includes('RCPT TO:<customer@example.com>'));
  assert.ok(receivedData.includes('Xin chào, yêu cầu của bạn đang ở trạng thái Chờ xử lý.'));
});

test('SmtpMailer xử lý lỗi kết nối và làm sạch lỗi', async () => {
  // Cố kết nối tới cổng không mở
  const mailer = new SmtpMailer({
    host: '127.0.0.1',
    port: 65432, // Unopened port
    timeoutMs: 500,
  });

  await assert.rejects(
    mailer.sendMail({
      to: 'customer@example.com',
      subject: 'Test',
      text: 'Test body',
    }),
    (err) => {
      assert.ok(err.message.includes('SMTP dispatch failed:'));
      return true;
    }
  );
});

test('processPending xử lý danh sách thông báo và trả về số lượng chính xác cho từng trạng thái', async () => {
  const statusUpdates = [];
  const claimed = [
    {
      id: 'n-1',
      idempotencyKey: 'email:ticket-created:t-1',
      ticketId: 't-1',
      recipientEmail: 'ok@example.com',
      subject: 'Xác nhận ticket 1',
      body: 'Nội dung 1',
      status: 'PROCESSING',
      retryCount: 0,
      maxRetries: 3,
      createdAt: '2026-09-24T12:00:00.000Z',
      updatedAt: '2026-09-24T12:00:00.000Z',
    },
    {
      id: 'n-2',
      idempotencyKey: 'email:ticket-created:t-2',
      ticketId: 't-2',
      recipientEmail: 'fail@example.com',
      subject: 'Xác nhận ticket 2',
      body: 'Nội dung 2',
      status: 'PROCESSING',
      retryCount: 0,
      maxRetries: 3,
      createdAt: '2026-09-24T12:00:00.000Z',
      updatedAt: '2026-09-24T12:00:00.000Z',
    },
    {
      id: 'n-3',
      idempotencyKey: 'email:ticket-created:t-3',
      ticketId: 't-3',
      recipientEmail: 'dead@example.com',
      subject: 'Xác nhận ticket 3',
      body: 'Nội dung 3',
      status: 'PROCESSING',
      retryCount: 2,
      maxRetries: 3,
      createdAt: '2026-09-24T12:00:00.000Z',
      updatedAt: '2026-09-24T12:00:00.000Z',
    },
  ];

  const mockStore = {
    async claimPendingNotifications(limit) {
      assert.equal(limit, 10);
      return claimed;
    },
    async updateNotificationStatus(id, status, details) {
      statusUpdates.push({ id, status, details });
    },
  };

  const mockMailer = {
    async sendMail(opts) {
      if (opts.to === 'ok@example.com') {
        return { messageId: '<msg-1@dx-lab.org>', accepted: [opts.to], response: '250 Ok' };
      }
      throw new Error(`SMTP temporary delivery failure for ${opts.to}`);
    },
  };

  const useCase = new ProcessNotificationsUseCase(mockStore, mockMailer);
  const result = await useCase.processPending(10);

  assert.deepEqual(result, {
    processed: 3,
    sent: 1,
    failed: 1,
    deadLetter: 1,
  });

  assert.equal(statusUpdates.length, 3);
  assert.equal(statusUpdates[0].id, 'n-1');
  assert.equal(statusUpdates[0].status, 'SENT');
  assert.equal(statusUpdates[1].id, 'n-2');
  assert.equal(statusUpdates[1].status, 'FAILED');
  assert.equal(statusUpdates[1].details.retryCount, 1);
  assert.equal(statusUpdates[2].id, 'n-3');
  assert.equal(statusUpdates[2].status, 'DEAD_LETTER');
  assert.equal(statusUpdates[2].details.retryCount, 3);
});
