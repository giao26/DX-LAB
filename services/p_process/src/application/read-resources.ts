/**
 * DX-LAB Process Core (P) - Read Resources Use Case
 * Copyright (C) 2026 DX-LAB Development Team
 * License: AGPL-3.0
 */

import { AuthenticationError, type Principal } from './principal.js';
import type { IResourceStore, ListResourcesOptions } from '../adapters/postgres/resource-store.js';
import {
  toResourceListItemDto,
  toResourceDetailDto,
  toAiResourceItemDto,
  ResourceNotFoundError,
  ResourceValidationError,
  type ResourceListItemDto,
  type ResourceDetailDto,
  type AiResourceItemDto,
  type ResourceType,
} from '../domain/resource.js';

const PERMITTED_ROLES = ['employee', 'group_lead', 'department_head', 'director'];

export class ReadResourcesUseCase {
  constructor(private readonly resourceStore: IResourceStore) {}

  private assertAuthorized(principal: Principal): void {
    if (!principal || !principal.roles || !principal.roles.some((role) => PERMITTED_ROLES.includes(role))) {
      throw new AuthenticationError('Bạn không có quyền truy cập thư viện tri thức.', 403);
    }
  }

  async list(
    principal: Principal,
    options: { type?: string; search?: string; limit?: number; offset?: number } = {},
  ): Promise<{ items: ResourceListItemDto[]; total: number }> {
    this.assertAuthorized(principal);

    let validatedType: ResourceType | undefined;
    if (options.type !== undefined && options.type !== '') {
      if (options.type !== 'sop' && options.type !== 'faq') {
        throw new ResourceValidationError('Loại tài liệu không hợp lệ. Chỉ chấp nhận sop hoặc faq.');
      }
      validatedType = options.type;
    }

    const result = await this.resourceStore.listPublished({
      type: validatedType,
      search: options.search,
      limit: options.limit,
      offset: options.offset,
    });

    return {
      items: result.items.map(toResourceListItemDto),
      total: result.total,
    };
  }

  async detail(principal: Principal, idOrCode: string): Promise<ResourceDetailDto> {
    this.assertAuthorized(principal);

    if (!idOrCode || !idOrCode.trim()) {
      throw new ResourceNotFoundError('Định danh tài liệu không hợp lệ.');
    }

    const record = await this.resourceStore.getPublishedById(idOrCode.trim());
    if (!record) {
      throw new ResourceNotFoundError('Tài liệu không tồn tại hoặc chưa được công bố.');
    }

    return toResourceDetailDto(record);
  }

  async retrieveForAi(
    principal: Principal,
    query: string,
    limit?: number,
  ): Promise<{ query: string; results: AiResourceItemDto[] }> {
    this.assertAuthorized(principal);

    if (!query || typeof query !== 'string' || !query.trim()) {
      throw new ResourceValidationError('Tham số query bắt buộc và không được để trống.');
    }

    const records = await this.resourceStore.searchAiResources(query.trim(), limit);

    return {
      query: query.trim(),
      results: records.map(toAiResourceItemDto),
    };
  }
}
