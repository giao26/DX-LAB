import test from 'node:test';
import assert from 'node:assert/strict';
import { applyProcessing, workflowFor } from '../dist/domain/ticket-workflow.js';
import { parseBusinessCalendar } from '../dist/domain/business-calendar.js';
import { ProcessTicketUseCase } from '../dist/application/process-ticket.js';
import { buildApp } from '../dist/adapters/http/app.js';
import { ReadTicketsUseCase } from '../dist/application/read-tickets.js';
const initial = () => ({status:'WAITING',version:1,workflow:null,calendar:null,steps:[],closedAt:null,result:null,slaDueAt:null,slaOverdue:false});
const at = '2026-09-25T01:00:00Z';
const calendar = parseBusinessCalendar();
for (const type of ['Khiếu nại','Tư vấn','Bảo hành']) test(`${type}: ordered required steps, close and immutable snapshot`, () => {
  let state = applyProcessing(initial(), {action:'start'}, type,'staff',at,calendar);
  assert.equal(state.steps.length,1);
  assert.throws(() => applyProcessing(state,{action:'close',result:'done'},type,'staff',at,calendar));
  assert.throws(() => applyProcessing(state,{action:'start-step',stepId:'3'},type,'staff',at,calendar));
  for (const step of workflowFor(type).steps) {
    if (step.id !== '1') state = applyProcessing(state,{action:'start-step',stepId:step.id},type,'staff',at,calendar);
    assert.throws(() => applyProcessing(state,{action:'complete-step',stepId:step.id,content:' '},type,'staff',at,calendar));
    assert.throws(() => applyProcessing(state,{action:'complete-step',stepId:step.id,content:'x'},type,'staff','2026-09-24T01:00:00Z',calendar));
    state = applyProcessing(state,{action:'complete-step',stepId:step.id,content:'done'},type,'staff',at,calendar);
    if(step.id !== state.workflow.steps.at(-1).id) assert.throws(() => applyProcessing(state,{action:'start-step',stepId:String(Number(step.id)+1)},type,'staff','2026-09-24T01:00:00Z',calendar),{statusCode:422});
  }
  assert.throws(() => applyProcessing(state,{action:'close',result:'resolved'},type,'staff','2026-09-24T01:00:00Z',calendar),{statusCode:422});
  state = applyProcessing(state,{action:'close',result:'resolved'},type,'staff',at,calendar);
  assert.equal(state.status,'CLOSED'); assert.equal(state.result,'resolved');
  assert.throws(() => applyProcessing(state,{action:'start'},type,'staff',at,calendar));
  assert.equal(initial().steps.length,0);
});
test('read projection hides contact notes/result for lead and exposes real action matrix', async () => {
  const principal={sub:'staff',clientId:'odoo',roles:['employee'],groupIds:['warranty'],scopes:['tickets:write']};
  const row={id:'ticket',code:'TCK-1',provisionalType:'Tư vấn',status:'WAITING',groupId:'warranty',assignedSub:'staff',receivedAt:at,updatedAt:at,description:'safe',processing:initial()};
  const reads=new ReadTicketsUseCase({async getScoped(){return row;}},{async record(){}},calendar);
  assert.deepEqual((await reads.detail(principal,'ticket','c')).allowedActions,['start']);
  row.processing=applyProcessing(row.processing,{action:'start'},'Tư vấn','staff',at,calendar); row.status='IN_PROGRESS';
  assert.deepEqual((await reads.detail(principal,'ticket','c')).allowedActions,['complete-step']);
  const contact='0912345678 customer@example.test';
  row.processing=applyProcessing(row.processing,{action:'complete-step',stepId:'1',content:contact},'Tư vấn','staff',at,calendar);
  assert.deepEqual((await reads.detail(principal,'ticket','c')).allowedActions,['start-step']);
  for(const stepId of ['2','3']) {
    row.processing=applyProcessing(row.processing,{action:'start-step',stepId},'Tư vấn','staff',at,calendar);
    row.processing=applyProcessing(row.processing,{action:'complete-step',stepId,content:contact},'Tư vấn','staff',at,calendar);
  }
  assert.deepEqual((await reads.detail(principal,'ticket','c')).allowedActions,['close']);
  assert.deepEqual((await reads.detail({...principal,scopes:[]},'ticket','c')).allowedActions,[]);
  row.processing=applyProcessing(row.processing,{action:'close',result:contact},'Tư vấn','staff',at,calendar);row.status='CLOSED';
  assert.deepEqual((await reads.detail(principal,'ticket','c')).allowedActions,[]);
  const lead=await reads.detail({...principal,sub:'lead',roles:['group_lead']},'ticket','c');
  assert.equal(lead.result,null);assert.ok(lead.steps.every(s=>s.content===null));assert.equal(lead.steps[0].startedAt,at);
  assert.equal(JSON.stringify(lead).includes(contact),false);
  assert.equal((await reads.detail(principal,'ticket','c')).result,contact);
});
test('application validates scope/version/key before store', async () => {
  const principal={sub:'staff',clientId:'odoo',roles:['employee'],groupIds:['warranty'],scopes:['tickets:write']};
  let called=0; const usecase=new ProcessTicketUseCase({async process(command){called++;assert.match(command.requestHash,/^[0-9a-f]{64}$/);return {ticket:initial(),replayed:false};}});
  await assert.rejects(usecase.execute({...principal,scopes:[]},'id',{version:1,action:'start'},'key','c'),{statusCode:403});
  await assert.rejects(usecase.execute(principal,'id',{version:0,action:'start'},'key','c'),{statusCode:422});
  await usecase.execute(principal,'id',{version:1,action:'start'},'key','c');assert.equal(called,1);
});
test('HTTP processing authenticates write scope, returns replay and structured validation errors', async () => {
  const principal={sub:'staff',clientId:'odoo',roles:['employee'],groupIds:['warranty'],scopes:['tickets:write']};
  const scopes=[];
  const app=buildApp({logger:false},{createTicket:{},readTickets:{},identityVerifier:{async verify(_auth,scope){scopes.push(scope);return principal;}},processTicket:new ProcessTicketUseCase({async process(){return {ticket:initial(),replayed:true};}})});
  try {
    const url='/api/v1/tickets/11111111-1111-4111-8111-111111111111/process';
    const ok=await app.inject({method:'POST',url,headers:{authorization:'Bearer token','idempotency-key':'key'},payload:{version:1,action:'start'}});
    assert.equal(ok.statusCode,200);assert.equal(ok.headers['idempotency-replayed'],'true');assert.deepEqual(scopes,['tickets:write']);
    const invalid=await app.inject({method:'POST',url,headers:{authorization:'Bearer token'},payload:{version:1,action:'start'}});
    assert.equal(invalid.statusCode,422);assert.match(invalid.headers['content-type'],/application\/problem\+json/);
  } finally {await app.close();}
});
