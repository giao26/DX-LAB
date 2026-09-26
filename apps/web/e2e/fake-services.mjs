import { createServer } from 'node:http';
import { createHash, generateKeyPairSync, randomUUID, sign } from 'node:crypto';
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const issuer = 'http://localhost:3101/realms/test';
const codes = new Map(); const tokens = new Map(); const roles = new Map();
let unavailable = false;
function json(res, status, value) { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(value)); }
const server = createServer(async (req,res) => {
  const url = new URL(req.url, 'http://localhost:3101');
  if (url.pathname === '/') return json(res,200,{status:'ready'});
  if (url.pathname === '/control') { roles.set(url.searchParams.get('sub'), url.searchParams.get('role')); unavailable = url.searchParams.get('offline') === 'true'; return json(res,200,{}); }
  if (url.pathname.endsWith('/auth')) {
    if (!url.searchParams.has('user')) {
      res.writeHead(200, { 'Content-Type':'text/html; charset=utf-8' });
      return res.end(['employee','director','department_head','outsider','disabled'].map(user => { const link = new URL(url); link.searchParams.set('user',user); return `<a href="${link.pathname}${link.search}">${user}</a>`; }).join('<br>'));
    }
    const user = url.searchParams.get('user'); const code = randomUUID(); codes.set(code, Object.fromEntries(url.searchParams)); roles.set(user,user);
    const target = new URL(url.searchParams.get('redirect_uri')); target.search = new URLSearchParams({code,state:url.searchParams.get('state')}).toString(); res.writeHead(302,{Location:target.toString()}); return res.end();
  }
  if (url.pathname.endsWith('/certs')) return json(res,200,{keys:[{...publicKey.export({format:'jwk'}),kid:'fake'}]});
  if (url.pathname.endsWith('/token')) {
    let body=''; for await (const chunk of req) body+=chunk;
    const params = new URLSearchParams(body); const pending = codes.get(params.get('code')); codes.delete(params.get('code'));
    if (!pending || createHash('sha256').update(params.get('code_verifier') ?? '').digest('base64url') !== pending.code_challenge || pending.redirect_uri !== params.get('redirect_uri') || pending.client_id !== params.get('client_id')) return json(res,400,{});
    const head = Buffer.from(JSON.stringify({alg:'RS256',kid:'fake'})).toString('base64url');
    const claims = Buffer.from(JSON.stringify({iss:issuer,sub:pending.user,aud:'web',nonce:pending.nonce,exp:Math.floor(Date.now()/1000)+300,iat:Math.floor(Date.now()/1000)})).toString('base64url');
    const token = randomUUID(); tokens.set(token,pending.user);
    return json(res,200,{id_token:`${head}.${claims}.${sign('RSA-SHA256',Buffer.from(`${head}.${claims}`),privateKey).toString('base64url')}`,access_token:token,expires_in:300});
  }
  if (url.pathname === '/api/v1/identity') {
    if (unavailable) return json(res,503,{});
    const user=tokens.get(req.headers.authorization?.replace('Bearer ','')); const role=roles.get(user);
    if (!user || !['employee','director','department_head'].includes(role)) return json(res,403,{});
    return json(res,200,{sub:user,roles:[role],groups:[]});
  }
  return json(res,404,{});
});
server.listen(3101,'localhost');
function stop() { server.closeAllConnections(); server.close(() => process.exit(0)); }
process.on('SIGTERM',stop); process.on('SIGINT',stop);
