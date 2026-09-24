/**
 * DX-LAB Process Core (P) - SMTP Mailer Adapter
 * Uses Node.js native socket (node:net / node:tls) for zero external dependencies.
 * Copyright (C) 2026 DX-LAB Development Team
 * License: AGPL-3.0
 */

import net from 'node:net';
import tls from 'node:tls';
import { randomUUID } from 'node:crypto';
import type { IMailerPort, SendMailOptions, SendMailResult } from '../../application/ports.js';
import { sanitizeErrorMessage } from '../../domain/notification.js';

export interface SmtpMailerConfig {
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;
  from?: string;
  timeoutMs?: number;
}

export class SmtpMailer implements IMailerPort {
  private readonly config: Required<SmtpMailerConfig>;

  constructor(config: SmtpMailerConfig = {}) {
    this.config = {
      host: config.host || process.env.SMTP_HOST || '127.0.0.1',
      port: config.port ?? Number(process.env.SMTP_PORT || process.env.MAILPIT_SMTP_PORT || 1025),
      secure: config.secure ?? (process.env.SMTP_SECURE === 'true'),
      user: config.user || process.env.SMTP_USER || '',
      pass: config.pass || process.env.SMTP_PASS || '',
      from: config.from || process.env.SMTP_FROM || 'no-reply@dx-lab.org',
      timeoutMs: config.timeoutMs ?? Number(process.env.SMTP_TIMEOUT_MS || 5000),
    };
  }

  async sendMail(options: SendMailOptions): Promise<SendMailResult> {
    const from = options.from || this.config.from;
    const to = options.to;
    const subject = options.subject;
    const text = options.text;
    const messageId = `<${randomUUID()}@dx-lab.org>`;

    // Validate email addresses against CRLF injection
    if (/[\r\n]/.test(to) || /[\r\n]/.test(from)) {
      throw new Error('Invalid email address containing CRLF characters');
    }

    let socket: net.Socket | null = null;

    try {
      socket = await this.connectSocket();
      const session = new SmtpSession(socket);

      // 1. Wait for server 220 banner
      await session.waitForResponse(220, this.config.timeoutMs);

      // 2. Send EHLO
      await session.sendCommand('EHLO localhost', 250, this.config.timeoutMs);

      // 3. Optional Authentication
      if (this.config.user && this.config.pass) {
        await session.sendCommand('AUTH LOGIN', 334, this.config.timeoutMs);
        await session.sendCommand(Buffer.from(this.config.user).toString('base64'), 334, this.config.timeoutMs);
        await session.sendCommand(Buffer.from(this.config.pass).toString('base64'), 235, this.config.timeoutMs);
      }

      // 4. MAIL FROM
      await session.sendCommand(`MAIL FROM:<${from}>`, 250, this.config.timeoutMs);

      // 5. RCPT TO
      await session.sendCommand(`RCPT TO:<${to}>`, 250, this.config.timeoutMs);

      // 6. DATA command
      await session.sendCommand('DATA', 354, this.config.timeoutMs);

      // 7. Send RFC 2822 payload with CRLF normalization & RFC 5321 dot-stuffing
      const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`;
      const dateHeader = new Date().toUTCString();
      const headers = [
        `From: ${from}`,
        `To: ${to}`,
        `Subject: ${encodedSubject}`,
        `Date: ${dateHeader}`,
        `Message-ID: ${messageId}`,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
      ].join('\r\n');

      const normalizedBody = text.replace(/\r?\n/g, '\r\n');
      const dotStuffedBody = normalizedBody.replace(/(^|\r\n)\./g, '$1..');
      const emailPayload = `${headers}\r\n\r\n${dotStuffedBody}\r\n.\r\n`;

      const dataResponse = await session.sendCommandData(emailPayload, 250, this.config.timeoutMs);

      // 8. QUIT
      try {
        await session.sendCommand('QUIT', 221, 2000);
      } catch {
        // Ignore errors on QUIT
      }

      return {
        messageId,
        accepted: [to],
        rejected: [],
        response: dataResponse.raw,
      };
    } catch (rawError) {
      const sanitized = sanitizeErrorMessage(rawError);
      throw new Error(`SMTP dispatch failed: ${sanitized}`);
    } finally {
      if (socket) {
        socket.destroy();
      }
    }
  }

  private connectSocket(): Promise<net.Socket> {
    return new Promise((resolve, reject) => {
      let settled = false;
      const { host, port, secure, timeoutMs } = this.config;

      const onError = (err: Error) => {
        if (!settled) {
          settled = true;
          reject(err);
        }
      };

      const socket: net.Socket = secure
        ? tls.connect({
            host,
            port,
            timeout: timeoutMs,
            rejectUnauthorized: process.env.NODE_ENV === 'production',
          }, () => {
            if (!settled) {
              settled = true;
              resolve(socket);
            }
          })
        : net.createConnection({ host, port, timeout: timeoutMs }, () => {
            if (!settled) {
              settled = true;
              resolve(socket);
            }
          });

      socket.once('error', onError);
      socket.setTimeout(timeoutMs, () => {
        if (!settled) {
          settled = true;
          socket.destroy();
          reject(new Error(`SMTP connection timed out after ${timeoutMs}ms`));
        }
      });
    });
  }
}

class SmtpSession {
  private buffer = '';
  private waitResolve: ((res: { code: number; lines: string[]; raw: string }) => void) | null = null;
  private waitReject: ((err: Error) => void) | null = null;
  private expectedCode: number | null = null;
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly socket: net.Socket) {
    this.socket.setEncoding('utf8');
    this.socket.on('data', (chunk: Buffer | string) => this.onData(chunk));
    this.socket.on('error', (err) => {
      if (this.waitReject) {
        const reject = this.waitReject;
        this.clearWait();
        reject(err);
      }
    });
    this.socket.on('close', () => {
      if (this.waitReject) {
        const reject = this.waitReject;
        this.clearWait();
        reject(new Error('SMTP socket closed prematurely'));
      }
    });
  }

  private clearWait() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.waitResolve = null;
    this.waitReject = null;
    this.expectedCode = null;
  }

  private onData(chunk: Buffer | string) {
    this.buffer += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
    this.tryFlushBuffer();
  }

  private tryFlushBuffer() {
    if (!this.waitResolve || !this.waitReject) return;
    const lines = this.buffer.split('\r\n');

    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i];
      // SMTP final response line format: 3 digits followed by a space or end of string
      const match = /^(\d{3})(?: (.*))?$/.exec(line);
      if (match) {
        const code = parseInt(match[1], 10);
        const allLines = lines.slice(0, i + 1);
        const raw = allLines.join('\r\n');
        this.buffer = lines.slice(i + 1).join('\r\n');

        const resolve = this.waitResolve;
        const reject = this.waitReject;
        const expected = this.expectedCode;
        this.clearWait();

        if (expected !== null && code !== expected && Math.floor(code / 100) !== Math.floor(expected / 100)) {
          reject(new Error(`SMTP code ${code} mismatch (expected ${expected}): ${line}`));
        } else {
          resolve({ code, lines: allLines, raw });
        }
        return;
      }
    }
  }

  waitForResponse(expectedCode?: number, timeoutMs = 5000): Promise<{ code: number; lines: string[]; raw: string }> {
    this.expectedCode = expectedCode ?? null;
    return new Promise((resolve, reject) => {
      this.timer = setTimeout(() => {
        if (this.waitReject) {
          const r = this.waitReject;
          this.clearWait();
          r(new Error(`SMTP command timed out after ${timeoutMs}ms`));
        }
      }, timeoutMs);

      this.waitResolve = resolve;
      this.waitReject = reject;

      // Process any response already sitting in the buffer
      this.tryFlushBuffer();
    });
  }

  async sendCommand(cmd: string, expectedCode?: number, timeoutMs = 5000): Promise<{ code: number; lines: string[]; raw: string }> {
    const promise = this.waitForResponse(expectedCode, timeoutMs);
    this.socket.write(cmd + '\r\n');
    return promise;
  }

  async sendCommandData(payload: string, expectedCode?: number, timeoutMs = 5000): Promise<{ code: number; lines: string[]; raw: string }> {
    const promise = this.waitForResponse(expectedCode, timeoutMs);
    this.socket.write(payload);
    return promise;
  }
}
