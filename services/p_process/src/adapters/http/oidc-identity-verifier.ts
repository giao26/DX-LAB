import {
  AuthenticationError,
  IdentityProviderUnavailableError,
  type IdentityVerifier,
  type InternalRole,
  type Principal,
} from '../../application/principal.js';

interface IntrospectionResponse {
  active?: unknown;
  iss?: unknown;
  aud?: unknown;
  scope?: unknown;
  sub?: unknown;
  client_id?: unknown;
}

interface OidcVerifierConfig {
  introspectionUrl: string;
  tokenUrl: string;
  adminBaseUrl: string;
  issuer: string;
  audience: string;
  clientId: string;
  clientSecret: string;
  trustedClientIds: string[];
}

const ROLES = new Set<InternalRole>(['employee', 'group_lead', 'department_head', 'director']);

function defaultConfig(): OidcVerifierConfig {
  const issuer = process.env.OIDC_ISSUER ?? '';
  const origin = issuer.replace(/\/realms\/[^/]+\/?$/, '');
  const realm = issuer.match(/\/realms\/([^/]+)\/?$/)?.[1] ?? '';
  return {
    introspectionUrl: process.env.OIDC_INTROSPECTION_URL ?? `${issuer}/protocol/openid-connect/token/introspect`,
    tokenUrl: process.env.OIDC_TOKEN_URL ?? `${issuer}/protocol/openid-connect/token`,
    adminBaseUrl: process.env.OIDC_ADMIN_BASE_URL ?? `${origin}/admin/realms/${realm}`,
    issuer,
    audience: process.env.OIDC_AUDIENCE ?? 'p-process',
    clientId: process.env.OIDC_CLIENT_ID ?? '',
    clientSecret: process.env.OIDC_CLIENT_SECRET ?? '',
    trustedClientIds: (process.env.OIDC_TRUSTED_CLIENT_IDS ?? 'web,odoo')
      .split(',').map((value) => value.trim()).filter(Boolean),
  };
}

async function fetchIdp(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(5_000) });
  } catch {
    throw new IdentityProviderUnavailableError();
  }
}

async function jsonIdp(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new IdentityProviderUnavailableError('Dịch vụ xác thực trả dữ liệu không hợp lệ.');
  }
}

export class OidcIdentityVerifier implements IdentityVerifier {
  constructor(private readonly config: OidcVerifierConfig = defaultConfig()) {}

  async verify(authorization: string | undefined, requiredScope: string): Promise<Principal> {
    const bearer = authorization?.match(/^Bearer\s+(.+)$/i);
    if (!bearer) {
      throw new AuthenticationError('Bearer token bắt buộc.', 401);
    }
    if (!this.config.introspectionUrl || !this.config.tokenUrl || !this.config.adminBaseUrl
      || !this.config.issuer || !this.config.clientId || !this.config.clientSecret) {
      throw new IdentityProviderUnavailableError('Dịch vụ xác thực chưa được cấu hình.');
    }

    const token = bearer[1];
    const auth = `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`;
    const introspectionResponse = await fetchIdp(this.config.introspectionUrl, {
      method: 'POST',
      headers: { Authorization: auth, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({ token }),
    });
    if (!introspectionResponse.ok) {
      if (introspectionResponse.status >= 400) throw new IdentityProviderUnavailableError();
      throw new AuthenticationError('Không thể xác minh token.', 401);
    }
    const claims = await jsonIdp(introspectionResponse) as IntrospectionResponse;
    if (!claims || typeof claims !== 'object') throw new IdentityProviderUnavailableError('Dịch vụ xác thực trả dữ liệu không hợp lệ.');
    const audience = Array.isArray(claims.aud) ? claims.aud.filter((value): value is string => typeof value === 'string')
      : typeof claims.aud === 'string' ? [claims.aud] : [];
    const scopes = typeof claims.scope === 'string' ? claims.scope.split(/\s+/).filter(Boolean) : [];
    if (claims.active !== true || claims.iss !== this.config.issuer || !audience.includes(this.config.audience)
      || typeof claims.sub !== 'string' || !claims.sub || typeof claims.client_id !== 'string' || !claims.client_id) {
      throw new AuthenticationError('Token không hợp lệ.', 401);
    }
    if (!this.config.trustedClientIds.includes(claims.client_id)) {
      throw new AuthenticationError('Ứng dụng gọi không được tin cậy.', 403);
    }
    if (!scopes.includes(requiredScope)) throw new AuthenticationError('Token thiếu scope bắt buộc.', 403);

    const serviceTokenResponse = await fetchIdp(this.config.tokenUrl, {
      method: 'POST',
      headers: { Authorization: auth, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({ grant_type: 'client_credentials' }),
    });
    if (!serviceTokenResponse.ok) throw new IdentityProviderUnavailableError();
    const serviceTokenBody = await jsonIdp(serviceTokenResponse) as { access_token?: unknown };
    if (typeof serviceTokenBody.access_token !== 'string' || !serviceTokenBody.access_token) {
      throw new IdentityProviderUnavailableError('Dịch vụ xác thực không cấp token tra cứu quyền.');
    }
    const adminHeaders = { Authorization: `Bearer ${serviceTokenBody.access_token}`, Accept: 'application/json' };
    const userBase = `${this.config.adminBaseUrl}/users/${encodeURIComponent(claims.sub)}`;
    const [userResponse, rolesResponse] = await Promise.all([
      fetchIdp(userBase, { headers: adminHeaders }),
      fetchIdp(`${userBase}/role-mappings/realm/composite`, { headers: adminHeaders }),
    ]);
    if (userResponse.status === 404) throw new AuthenticationError('Quyền đã bị thu hồi.', 403);
    if (!userResponse.ok || !rolesResponse.ok) throw new IdentityProviderUnavailableError();
    const [user, roleValues] = await Promise.all([
      jsonIdp(userResponse), jsonIdp(rolesResponse),
    ]) as [{ enabled?: unknown }, unknown];
    const groupValues: unknown[] = [];
    const groupPageSize = 100;
    for (let first = 0; ; first += groupPageSize) {
      const groupsUrl = new URL(`${userBase}/groups`);
      groupsUrl.searchParams.set('first', String(first));
      groupsUrl.searchParams.set('max', String(groupPageSize));
      const groupsResponse = await fetchIdp(groupsUrl.toString(), { headers: adminHeaders });
      if (!groupsResponse.ok) throw new IdentityProviderUnavailableError();
      const page = await jsonIdp(groupsResponse);
      if (!Array.isArray(page)) throw new IdentityProviderUnavailableError();
      groupValues.push(...page);
      if (page.length < groupPageSize) break;
    }
    if (user.enabled !== true) throw new AuthenticationError('Quyền đã bị thu hồi.', 403);
    const roles = Array.isArray(roleValues) ? roleValues.flatMap((value) => {
      const name = value && typeof value === 'object' ? (value as { name?: unknown }).name : undefined;
      return typeof name === 'string' && ROLES.has(name as InternalRole) ? [name as InternalRole] : [];
    }) : [];
    const groupIds = Array.isArray(groupValues) ? groupValues.flatMap((value) => {
      if (!value || typeof value !== 'object') return [];
      const group = value as { path?: unknown; name?: unknown };
      const name = typeof group.name === 'string' ? group.name.trim() : '';
      const pathSegment = typeof group.path === 'string'
        ? group.path.split('/').filter(Boolean).at(-1)?.trim() ?? ''
        : '';
      const raw = name || pathSegment;
      return typeof raw === 'string'
        && /^[\p{L}\p{N}\p{M} _.:-]{1,100}$/u.test(raw)
        && raw.trim().length > 0
        ? [raw]
        : [];
    }) : [];
    if (roles.length === 0) throw new AuthenticationError('Không có vai trò được hỗ trợ.', 403);
    return { sub: claims.sub, clientId: claims.client_id, scopes, roles, groupIds };
  }
}
