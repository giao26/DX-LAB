import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PostgresTicketProcessingStore, backfillTicketProcessing } from '../dist/adapters/postgres/ticket-processing-store.js';
import { PostgresAssignmentStore } from '../dist/adapters/postgres/assignment-store.js';
import { ProcessTicketUseCase } from '../dist/application/process-ticket.js';
import { parseBusinessCalendar } from '../dist/domain/business-calendar.js';
import { PostgresTicketReadStore } from '../dist/adapters/postgres/ticket-read-store.js';
import { ReadTicketsUseCase } from '../dist/application/read-tickets.js';
import { buildApp } from '../dist/adapters/http/app.js';

export async function processingIntegration(pool) {
  const group = `integration-${randomUUID()}`, sub = `staff-${randomUUID()}`;
  const principal = {sub,clientId:'odoo',roles:['employee'],groupIds:[group],scopes:['tickets:write']};
  const store = new PostgresTicketProcessingStore(pool,parseBusinessCalendar());
  const usecase = new ProcessTicketUseCase(store);
  const customer = (await pool.query(`INSERT INTO dx_core.customers (phone_normalized,full_name,email) VALUES ($1,'Test','test@example.invalid') RETURNING id`,[randomUUID().slice(0,20)])).rows[0].id;
  await pool.query('INSERT INTO dx_core.staff_roster (sub,group_id) VALUES ($1,$2)',[sub,group]);
  async function ticket(assigned, time) {return (await pool.query(`INSERT INTO dx_core.tickets (code,customer_id,description,provisional_type,group_id,assigned_sub,received_at) VALUES ($1,$2,'integration','Bảo hành',$3,$4,$5) RETURNING id`,[`TEST-${randomUUID().slice(0,20)}`,customer,group,assigned,time])).rows[0].id;}
  const legacy = await Promise.all(['WAITING','IN_PROGRESS','CLOSED'].map(async status => {
    const id = await ticket(null,'2026-01-01T01:00:00Z');
    await pool.query(`UPDATE dx_core.tickets SET status=$2,group_id=$3,updated_at='2026-01-02T02:00:00Z' WHERE id=$1`,[id,status,`legacy-${group}`]);
    return id;
  }));
  const preservedCalendar=parseBusinessCalendar('2026-01-05');
  await pool.query('UPDATE dx_core.tickets SET calendar_snapshot=$2,sla_due_at=$3 WHERE id=$1',[legacy[2],JSON.stringify(preservedCalendar),'2026-01-01T03:00:00Z']);
  await backfillTicketProcessing(pool,parseBusinessCalendar('2026-01-01'));
  const legacyRows=(await pool.query('SELECT * FROM dx_core.tickets WHERE id=ANY($1::uuid[]) ORDER BY id',[legacy])).rows;
  const byId=new Map(legacyRows.map(row=>[row.id,row]));
  assert.deepEqual(byId.get(legacy[0]).calendar_snapshot,parseBusinessCalendar('2026-01-01'));
  assert.equal(byId.get(legacy[0]).sla_due_at.toISOString(),'2026-01-02T03:00:00.000Z');
  assert.equal(byId.get(legacy[0]).workflow_snapshot,null);
  assert.equal(byId.get(legacy[1]).workflow_snapshot.steps.length,4);
  assert.equal(byId.get(legacy[1]).processing_steps.length,1);
  assert.equal(byId.get(legacy[1]).processing_steps[0].startedAt,'2026-01-02T02:00:00.000Z');
  assert.deepEqual(byId.get(legacy[2]).calendar_snapshot,preservedCalendar);
  assert.equal(byId.get(legacy[2]).sla_due_at.toISOString(),'2026-01-01T03:00:00.000Z');
  assert.equal(byId.get(legacy[2]).closed_at.toISOString(),'2026-01-02T02:00:00.000Z');
  await backfillTicketProcessing(pool,parseBusinessCalendar('2026-01-02'));
  assert.deepEqual((await pool.query('SELECT * FROM dx_core.tickets WHERE id=ANY($1::uuid[]) ORDER BY id',[legacy])).rows,legacyRows);
  const id = await ticket(sub,'2026-01-01T01:00:00Z');
  const queued = await ticket(null,'2026-01-02T01:00:00Z');
  const later = await ticket(null,'2026-01-03T01:00:00Z');
  await assert.rejects(usecase.execute(principal,queued,{version:1,action:'start'},randomUUID(),'c'),{statusCode:403});
  const keys=[randomUUID(),randomUUID()];
  const results=await Promise.allSettled(keys.map(key => usecase.execute(principal,id,{version:1,action:'start'},key,'c')));
  assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
  assert.equal(results.find(x=>x.status==='rejected').reason.statusCode,409);
  let state=results.find(x=>x.status==='fulfilled').value.ticket;
  const winningKey=keys[results.findIndex(x=>x.status==='fulfilled')];
  assert.equal((await usecase.execute(principal,id,{version:1,action:'start'},winningKey,'c')).replayed,true);
  await assert.rejects(usecase.execute(principal,id,{version:1,action:'start',content:'different'},winningKey,'c'),{statusCode:409});
  await assert.rejects(usecase.execute({...principal,groupIds:[]},id,{version:1,action:'start'},winningKey,'c'),{statusCode:403});
  await assert.rejects(usecase.execute({...principal,sub:'director',roles:['director']},id,{version:state.version,action:'close',result:'x'},randomUUID(),'c'),{statusCode:403});
  for(const step of state.workflow.steps) {
    if(step.id!=='1') state=(await usecase.execute(principal,id,{version:state.version,action:'start-step',stepId:step.id},randomUUID(),'c')).ticket;
    const stepKey=randomUUID();
    const stepCommand={version:state.version,action:'complete-step',stepId:step.id,content:'evidence'};
    const completed=await Promise.all([usecase.execute(principal,id,stepCommand,stepKey,'c'),usecase.execute(principal,id,stepCommand,stepKey,'c')]);
    assert.deepEqual(completed.map(x=>x.replayed).sort(),[false,true]);
    assert.deepEqual(completed[0].ticket,completed[1].ticket);
    state=completed[0].ticket;
  }
  const before=(await pool.query('SELECT * FROM dx_core.tickets WHERE id=$1',[id])).rows[0];
  const failingAssignment={async assignNextQueuedTicket(g,c,client){await new PostgresAssignmentStore(pool).assignNextQueuedTicket(g,c,client);throw new Error('injected after FIFO');}};
  const failure=new ProcessTicketUseCase(new PostgresTicketProcessingStore(pool,parseBusinessCalendar(),failingAssignment));
  const closeKey=randomUUID();
  await assert.rejects(failure.execute(principal,id,{version:state.version,action:'close',result:'resolved'},closeKey,'c'),/injected/);
  assert.deepEqual((await pool.query('SELECT * FROM dx_core.tickets WHERE id=$1',[id])).rows[0],before);
  assert.equal((await pool.query('SELECT assigned_sub FROM dx_core.tickets WHERE id=$1',[queued])).rows[0].assigned_sub,null);
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM dx_core.idempotency_keys WHERE key=$1',[closeKey])).rows[0].n,0);
  assert.equal((await pool.query(`SELECT count(*)::int AS n FROM dx_core.outbox_events WHERE aggregate_id=$1 AND event_type='ticket.processing.v1'`,[id])).rows[0].n,8);
  assert.equal((await pool.query(`SELECT count(*)::int AS n FROM dx_core.outbox_events WHERE aggregate_id=$1 AND payload->>'action'='close'`,[id])).rows[0].n,0);
  const closed=await usecase.execute(principal,id,{version:state.version,action:'close',result:'resolved'},closeKey,'c');
  assert.equal(closed.ticket.status,'CLOSED');assert.equal(closed.ticket.slaOverdue,true);
  assert.equal((await pool.query('SELECT assigned_sub FROM dx_core.tickets WHERE id=$1',[queued])).rows[0].assigned_sub,sub);
  assert.equal((await pool.query('SELECT assigned_sub FROM dx_core.tickets WHERE id=$1',[later])).rows[0].assigned_sub,null);
  assert.equal((await usecase.execute(principal,id,{version:state.version,action:'close',result:'resolved'},closeKey,'c')).replayed,true);
  await assert.rejects(usecase.execute(principal,id,{version:closed.ticket.version,action:'start'},randomUUID(),'c'),{statusCode:422});
  const events=(await pool.query(`SELECT aggregate_version,payload FROM dx_core.outbox_events WHERE aggregate_id=$1 AND event_type='ticket.processing.v1' ORDER BY aggregate_version`,[id])).rows;
  const actions=['start','complete-step','start-step','complete-step','start-step','complete-step','start-step','complete-step','close'];
  assert.equal(events.length,9);
  assert.deepEqual(events,actions.map((action,index)=>({aggregate_version:index+2,payload:{ticket_id:id,ticket_code:before.code,status:action==='close'?'CLOSED':'IN_PROGRESS',action,version:index+2}})));
  assert.equal((await pool.query('SELECT official_assignment_count FROM dx_core.staff_roster WHERE sub=$1',[sub])).rows[0].official_assignment_count,1);
  const httpId=await ticket(sub,'2026-01-01T01:00:00Z');
  const readStore=new PostgresTicketReadStore(pool);
  const app=buildApp({logger:false},{createTicket:{},readTickets:new ReadTicketsUseCase(readStore,readStore),processTicket:usecase,
    identityVerifier:{async verify(auth,scope){assert.equal(scope,'tickets:write');return auth==='Bearer forbidden'?{...principal,sub:'other'}:principal;}}});
  try {
    const httpKey=randomUUID(), url=`/api/v1/tickets/${httpId}/process`, payload={version:1,action:'start'};
    const request=(authorization,key,body=payload)=>app.inject({method:'POST',url,headers:{authorization,'idempotency-key':key},payload:body});
    assert.equal((await request('Bearer forbidden',randomUUID())).statusCode,403);
    const authorized=await request('Bearer authorized',httpKey); assert.equal(authorized.statusCode,200);assert.equal(authorized.json().version,2);
    const conflict=await request('Bearer authorized',randomUUID());assert.equal(conflict.statusCode,409);
    const replay=await request('Bearer authorized',httpKey);assert.equal(replay.statusCode,200);assert.equal(replay.headers['idempotency-replayed'],'true');assert.deepEqual(replay.json(),authorized.json());
    assert.equal((await request('Bearer forbidden',httpKey)).statusCode,403);
    assert.equal((await pool.query(`SELECT count(*)::int AS n FROM dx_core.outbox_events WHERE aggregate_id=$1 AND event_type='ticket.processing.v1'`,[httpId])).rows[0].n,1);
  } finally {await app.close();}
  console.log('Processing PostgreSQL concurrency/replay/permissions/FIFO/rollback: PASS');
}
