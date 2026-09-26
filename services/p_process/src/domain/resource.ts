/**
 * DX-LAB Process Core (P) - Resource Domain
 * Domain entities, types, and invariant rules for SOP and FAQ knowledge assets.
 * Copyright (C) 2026 DX-LAB Development Team
 * License: AGPL-3.0
 */

export type ResourceType = 'sop' | 'faq';
export type ResourceStatus = 'draft' | 'pending' | 'published' | 'rejected' | 'superseded';

export interface ResourceRecord {
  id: string;
  code: string;
  type: ResourceType;
  title: string;
  status: ResourceStatus;
  version: string;
  effectiveDate: string; // ISO date string YYYY-MM-DD
  approverName: string | null;
  publishedAt: Date | string | null;
  summary: string;
  content: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ResourceListItemDto {
  id: string;
  code: string;
  type: ResourceType;
  title: string;
  version: string;
  effectiveDate: string;
  status: ResourceStatus;
  statusLabel: string;
  approverName: string;
  publishedAt: string;
  summary: string;
}

export interface ResourceDetailDto extends ResourceListItemDto {
  content: string;
}

export interface AiResourceItemDto {
  id: string;
  code: string;
  type: ResourceType;
  title: string;
  version: string;
  effectiveDate: string;
  approverName: string;
  publishedAt: string;
  summary: string;
  content: string;
  provenance: {
    source: string;
    docCode: string;
    version: string;
    publishedAt: string;
  };
}

export class ResourceValidationError extends Error {
  constructor(
    message: string,
    public readonly fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = 'ResourceValidationError';
  }
}

export class ResourceNotFoundError extends Error {
  readonly statusCode = 404;

  constructor(message = 'Tài liệu không tồn tại hoặc chưa được công bố.') {
    super(message);
    this.name = 'ResourceNotFoundError';
  }
}

/**
 * Checks whether a resource version is published and currently in effect.
 */
export function isResourceEffective(record: Pick<ResourceRecord, 'status' | 'effectiveDate'>): boolean {
  if (record.status !== 'published') return false;
  if (!record.effectiveDate) return false;
  const today = new Date().toISOString().slice(0, 10);
  const effectiveDateStr = typeof record.effectiveDate === 'string'
    ? record.effectiveDate.slice(0, 10)
    : new Date(record.effectiveDate).toISOString().slice(0, 10);
  return effectiveDateStr <= today;
}

export function formatPublishedAt(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString();
}

export function formatEffectiveDate(date: Date | string): string {
  if (typeof date === 'string') return date.slice(0, 10);
  return date.toISOString().slice(0, 10);
}

export function toResourceListItemDto(record: ResourceRecord): ResourceListItemDto {
  return {
    id: record.id,
    code: record.code,
    type: record.type,
    title: record.title,
    version: record.version,
    effectiveDate: formatEffectiveDate(record.effectiveDate),
    status: record.status,
    statusLabel: record.status === 'published' ? 'Đang có hiệu lực' : record.status,
    approverName: record.approverName || '',
    publishedAt: formatPublishedAt(record.publishedAt),
    summary: record.summary || '',
  };
}

export function toResourceDetailDto(record: ResourceRecord): ResourceDetailDto {
  return {
    ...toResourceListItemDto(record),
    content: record.content || '',
  };
}

export function toAiResourceItemDto(record: ResourceRecord): AiResourceItemDto {
  const publishedAt = formatPublishedAt(record.publishedAt);
  return {
    id: record.id,
    code: record.code,
    type: record.type,
    title: record.title,
    version: record.version,
    effectiveDate: formatEffectiveDate(record.effectiveDate),
    approverName: record.approverName || '',
    publishedAt,
    summary: record.summary || '',
    content: record.content || '',
    provenance: {
      source: 'dx_core.resources',
      docCode: record.code,
      version: record.version,
      publishedAt,
    },
  };
}
