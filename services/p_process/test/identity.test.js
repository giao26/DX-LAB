import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../dist/adapters/http/app.js';
import { AuthenticationError } from '../dist/application/principal.js';
import { OidcIdentityVerifier } from '../dist/adapters/http/oidc-identity-verifier.js';
import { readFileSync } from 'node:fs';
test('identity uses dedicated scope, rechecks verifier, exposes no PII', async () => {
  let enabled = true; let calls = 0;
  const app = buildApp({ logger: false }, { identityVerifier: { async verify(header, scope) {
    calls++; assert.equal(scope,'portal:read');
    if (!header) throw new AuthenticationError('missing',401);
    if (!enabled) throw new AuthenticationError('revoked',403);
    return { sub:'staff',roles:['employee'],groupIds:['warranty'],clientId:'web',scopes:['portal:read'], email:'private@example.test' };
  } } });
  assert.equal((await app.inject('/api/v1/identity')).statusCode,401);
  const response = await app.inject({ url:'/api/v1/identity', headers:{authorization:'Bearer opaque'} });
  assert.deepEqual(response.json(),{ sub:'staff',roles:['employee'],groups:['warranty'] });
  assert.equal(response.headers['cache-control'],'private, no-store');
  enabled = false;
  assert.equal((await app.inject({ url:'/api/v1/identity', headers:{authorization:'Bearer opaque'} })).statusCode,403);
  assert.equal(calls,3); await app.close();
});
test('identity endpoint uses production online verifier for scope, disabled and revoked membership',async(t)=>{
  const config={issuer:'https://idp.test/realms/dxlab',introspectionUrl:'https://idp.test/introspect',tokenUrl:'https://idp.test/token',adminBaseUrl:'https://idp.test/admin/realms/dxlab',audience:'p-process',clientId:'p-process',clientSecret:'test-only',trustedClientIds:['web']};
  let scope='openid portal:read';let enabled=true;let roles=[{name:'employee'}];
  const original=globalThis.fetch;
  globalThis.fetch=async(url)=>{
    const path=String(url);
    if(path===config.introspectionUrl)return Response.json({active:true,iss:config.issuer,aud:['p-process','web'],sub:'staff',client_id:'web',scope});
    if(path===config.tokenUrl)return Response.json({access_token:'admin-only'});
    if(path.endsWith('/role-mappings/realm/composite'))return Response.json(roles);
    if(path.includes('/groups?'))return Response.json([{path:'/warranty'}]);
    if(path.endsWith('/users/staff'))return Response.json({enabled,email:'secret@example.test'});
    throw new Error('Unexpected IdP URL');
  };
  t.after(()=>{globalThis.fetch=original;});
  const app=buildApp({logger:false},{identityVerifier:new OidcIdentityVerifier(config)});t.after(()=>app.close());
  const request=()=>app.inject({url:'/api/v1/identity',headers:{authorization:'Bearer staff-access'}});
  const response=await request();assert.equal(response.statusCode,200);assert.deepEqual(response.json(),{sub:'staff',roles:['employee'],groups:['warranty']});
  scope='tickets:read';assert.equal((await request()).statusCode,403);
  scope='openid portal:read';enabled=false;assert.equal((await request()).statusCode,403);
  enabled=true;roles=[];assert.equal((await request()).statusCode,403);
});
test('realm Web client retains ticket scopes and provides portal scope plus Web/P audiences',()=>{
  const realm=JSON.parse(readFileSync(new URL('../../../infra/keycloak/dxlab-realm.json',import.meta.url),'utf8'));
  const web=realm.clients.find(client=>client.clientId==='web');
  for(const scope of ['portal:read','tickets:read','tickets:write'])assert.ok(web.defaultClientScopes.includes(scope));
  assert.ok(web.optionalClientScopes.includes('tickets:download'));
  assert.ok(realm.clientScopes.some(scope=>scope.name==='portal:read' && scope.attributes['include.in.token.scope']==='true'));
  const audiences=web.protocolMappers.filter(mapper=>mapper.protocolMapper==='oidc-audience-mapper').map(mapper=>mapper.config['included.client.audience']);
  assert.ok(audiences.includes('web'));assert.ok(audiences.includes('p-process'));
});
