import { beforeEach, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  fetchAnnouncements: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ get: () => ({ value: 'signed-cookie' }) })),
}));
vi.mock('../lib/session', () => ({
  SESSION_COOKIE: '__Host-dx-session',
  getSession: mocks.getSession,
}));
vi.mock('../lib/announcements', () => ({
  AnnouncementsRequestError: class AnnouncementsRequestError extends Error {
    constructor(public readonly status: number) { super(String(status)); }
  },
  fetchAnnouncements: mocks.fetchAnnouncements,
}));

import { GET } from '../app/api/announcements/route';
import { AnnouncementsRequestError } from '../lib/announcements';

const session = { sub: 'employee', token: 'token', csrf: 'csrf', expires: Date.now() + 60_000 };

beforeEach(() => vi.clearAllMocks());

test('BFF trả 401 và no-store khi không có session', async () => {
  mocks.getSession.mockReturnValue(undefined);
  const response = await GET();
  expect(response.status).toBe(401);
  expect(response.headers.get('cache-control')).toBe('private, no-store');
  expect(mocks.fetchAnnouncements).not.toHaveBeenCalled();
});

test.each([401, 403, 503])('BFF bảo toàn upstream status %i và no-store', async (status) => {
  mocks.getSession.mockReturnValue(session);
  mocks.fetchAnnouncements.mockRejectedValue(new AnnouncementsRequestError(status));
  const response = await GET();
  expect(response.status).toBe(status);
  expect(response.headers.get('cache-control')).toBe('private, no-store');
});

test('BFF success dùng private no-store', async () => {
  mocks.getSession.mockReturnValue(session);
  mocks.fetchAnnouncements.mockResolvedValue({ data: [] });
  const response = await GET();
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('private, no-store');
});

test('BFF trả 401 khi logout trong lúc upstream thất bại', async () => {
  mocks.getSession.mockReturnValueOnce(session).mockReturnValueOnce(undefined);
  mocks.fetchAnnouncements.mockRejectedValue(new AnnouncementsRequestError(503));
  const response = await GET();
  expect(response.status).toBe(401);
  expect(response.headers.get('cache-control')).toBe('private, no-store');
});

test('BFF trả 401 khi logout trong lúc upstream thành công', async () => {
  mocks.getSession.mockReturnValueOnce(session).mockReturnValueOnce(undefined);
  mocks.fetchAnnouncements.mockResolvedValue({ data: [] });
  const response = await GET();
  expect(response.status).toBe(401);
  expect(response.headers.get('cache-control')).toBe('private, no-store');
});
