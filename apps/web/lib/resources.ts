/**
 * DX-LAB Web BFF - Resources Data Fetching Client
 * Fetches published SOP/FAQ knowledge documents from P core service.
 * Copyright (C) 2026 DX-LAB Development Team
 * License: AGPL-3.0
 */

import type { Session } from './session';

export interface ResourceItem {
  id: string;
  code: string;
  type: 'sop' | 'faq';
  title: string;
  version: string;
  effectiveDate: string;
  status: string;
  statusLabel: string;
  approverName: string;
  publishedAt: string;
  summary: string;
}

export interface ResourceDetail extends ResourceItem {
  content: string;
}

export interface ResourceListResponse {
  items: ResourceItem[];
  total: number;
}

export class ResourceClientError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ResourceClientError';
  }
}

function getBaseUrl(): string {
  return process.env.P_PROCESS_BASE_URL ?? 'http://p-process:3000';
}

export async function fetchResources(
  session: Session,
  params: { type?: string; search?: string } = {},
): Promise<ResourceListResponse> {
  const url = new URL(`${getBaseUrl()}/api/v1/resources`);
  if (params.type && (params.type === 'sop' || params.type === 'faq')) {
    url.searchParams.set('type', params.type);
  }
  if (params.search && params.search.trim()) {
    url.searchParams.set('search', params.search.trim());
  }

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${session.token}`,
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      if (res.status === 401) throw new ResourceClientError(401, 'Phiên làm việc hết hạn hoặc không hợp lệ.');
      if (res.status === 403) throw new ResourceClientError(403, 'Bạn không có quyền truy cập thư viện tri thức.');
      throw new ResourceClientError(res.status >= 500 ? 503 : res.status, 'Dịch vụ tạm thời không khả dụng. Vui lòng thử lại.');
    }

    return (await res.json()) as ResourceListResponse;
  } catch (error) {
    if (error instanceof ResourceClientError) throw error;
    throw new ResourceClientError(503, 'Không thể kết nối đến máy chủ dịch vụ.');
  }
}

export async function fetchResourceDetail(
  session: Session,
  id: string,
): Promise<ResourceDetail | null> {
  if (!id || !id.trim()) return null;
  const url = `${getBaseUrl()}/api/v1/resources/${encodeURIComponent(id.trim())}`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${session.token}`,
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });

    if (res.status === 404) {
      return null;
    }

    if (!res.ok) {
      if (res.status === 401) throw new ResourceClientError(401, 'Phiên làm việc hết hạn hoặc không hợp lệ.');
      if (res.status === 403) throw new ResourceClientError(403, 'Bạn không có quyền truy cập tài liệu này.');
      throw new ResourceClientError(res.status >= 500 ? 503 : res.status, 'Dịch vụ tạm thời không khả dụng. Vui lòng thử lại.');
    }

    return (await res.json()) as ResourceDetail;
  } catch (error) {
    if (error instanceof ResourceClientError) throw error;
    throw new ResourceClientError(503, 'Không thể kết nối đến máy chủ dịch vụ.');
  }
}
