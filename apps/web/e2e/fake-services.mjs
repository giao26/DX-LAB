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
  const sampleDocs = [
    { id: '60000000-0000-4000-8000-000000000001', code: 'SOP-TKT-001', type: 'sop', title: 'Quy trình tiếp nhận và phân công ticket', status: 'published', statusLabel: 'Đang có hiệu lực', version: '1.0.0', effectiveDate: '2026-01-01', approverName: 'Ban Giám đốc', publishedAt: '2026-01-01T08:00:00Z', summary: 'Quy định các bước tiếp nhận và phân công ticket.', content: 'Chi tiết quy trình tiếp nhận và phân công ticket.' },
    { id: '60000000-0000-4000-8000-000000000002', code: 'SOP-WAR-001', type: 'sop', title: 'Quy trình kiểm tra và xử lý bảo hành', status: 'published', statusLabel: 'Đang có hiệu lực', version: '1.0.0', effectiveDate: '2026-01-15', approverName: 'Trưởng phòng Kỹ thuật', publishedAt: '2026-01-15T09:00:00Z', summary: 'Hướng dẫn kiểm tra và xử lý bảo hành.', content: 'Chi tiết các bước thẩm định và bảo hành sản phẩm.' },
    { id: '60000000-0000-4000-8000-000000000003', code: 'FAQ-GEN-001', type: 'faq', title: 'Hướng dẫn dành cho nhân viên mới và câu hỏi thường gặp', status: 'published', statusLabel: 'Đang có hiệu lực', version: '1.0.0', effectiveDate: '2026-02-01', approverName: 'Phòng Nhân sự', publishedAt: '2026-02-01T08:30:00Z', summary: 'Giải đáp các thắc mắc phổ biến về DX-OS.', content: 'Nội dung các câu hỏi thường gặp FAQ.' },
  ];
  if (url.pathname === '/api/v1/resources') {
    if (unavailable) return json(res,503,{});
    const user=tokens.get(req.headers.authorization?.replace('Bearer ','')); const role=roles.get(user);
    if (!user || !['employee','director','department_head'].includes(role)) return json(res,403,{});
    let filtered = sampleDocs;
    const type = url.searchParams.get('type');
    const search = url.searchParams.get('search');
    if (type) filtered = filtered.filter(d => d.type === type);
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(d => d.title.toLowerCase().includes(q) || d.code.toLowerCase().includes(q) || d.summary.toLowerCase().includes(q));
    }
    return json(res,200,{ items: filtered, total: filtered.length });
  }
  if (url.pathname === '/api/v1/resources/ai/retrieve') {
    if (unavailable) return json(res,503,{});
    const user=tokens.get(req.headers.authorization?.replace('Bearer ','')); const role=roles.get(user);
    if (!user || !['employee','director','department_head'].includes(role)) return json(res,403,{});
    const query = url.searchParams.get('query') || '';
    if (!query.trim()) return json(res,400,{ type:'about:blank', title:'Bad Request', status:400, code:'VALIDATION_ERROR', detail:'query required' });
    const q = query.toLowerCase();
    const results = sampleDocs.filter(d => d.title.toLowerCase().includes(q) || d.code.toLowerCase().includes(q) || d.summary.toLowerCase().includes(q)).map(d => ({
      ...d,
      provenance: { source: 'dx_core.resources', docCode: d.code, version: d.version, publishedAt: d.publishedAt },
    }));
    return json(res,200,{ query, results });
  }
  if (url.pathname.startsWith('/api/v1/resources/')) {
    if (unavailable) return json(res,503,{});
    const user=tokens.get(req.headers.authorization?.replace('Bearer ','')); const role=roles.get(user);
    if (!user || !['employee','director','department_head'].includes(role)) return json(res,403,{});
    const id = url.pathname.replace('/api/v1/resources/','');
    const found = sampleDocs.find(d => d.id === id || d.code === id);
    if (!found) return json(res,404,{ type: 'about:blank', title: 'Not Found', status: 404, code: 'RESOURCE_NOT_FOUND', detail: 'Tài liệu không tồn tại' });
    return json(res,200,found);
  }
  return json(res,404,{});
});
server.listen(3101,'localhost');
function stop() { server.closeAllConnections(); server.close(() => process.exit(0)); }
process.on('SIGTERM',stop); process.on('SIGINT',stop);
