export type InternalRole = 'employee' | 'group_lead' | 'department_head' | 'director';

export interface Principal {
  sub: string;
  clientId: string;
  roles: InternalRole[];
  groupIds: string[];
  scopes: string[];
}

export class AuthenticationError extends Error {
  constructor(
    message: string,
    public readonly statusCode: 401 | 403 = 401,
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class IdentityProviderUnavailableError extends Error {
  readonly statusCode = 503;

  constructor(message = 'Dịch vụ xác thực tạm thời không khả dụng.') {
    super(message);
    this.name = 'IdentityProviderUnavailableError';
  }
}

export interface IdentityVerifier {
  verify(authorization: string | undefined, requiredScope: string): Promise<Principal>;
}

export function hasOrganizationWideAccess(principal: Principal): boolean {
  return principal.roles.includes('department_head') || principal.roles.includes('director');
}

export function isGroupLead(principal: Principal): boolean {
  return principal.roles.includes('group_lead');
}
