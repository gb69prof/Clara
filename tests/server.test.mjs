import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import {command,readState,executeGuided,clientState} from '../lib/clara-store.mjs';
import {handleMcp,tools} from '../lib/clara-mcp.mjs';
function database(){
 const sql=new DatabaseSync(':memory:');
 sql.exec(fs.readFileSync('drizzle/0000_thick_ricochet.sql','utf8'));
 return {sql,prepare(q){return {bind(...a){
  const stmt=sql.prepare(q);
  return {async run(){const r=stmt.run(...a);return {meta:{changes:Number(r.changes)}};},async first(){return stmt.get(...a)||null;}};
 }};}};
}
const input={op:'create_project',title:'Un laboratorio <script>',brief:'Osservare e spiegare: nessuna fonte fornita.',cls:'1I',type:'Laboratorio'};
async function create(db){const r=await command(db,input);return r.projectId;}
test('Persistent projects, idempotency, safe validation, CAS concurrency',async()=>{const db=database();await command(db,{...input,requestId:'repeat-1'});await command(db,{...input,requestId:'repeat-1'});assert.equal((await readState(db)).state.projects.length,1);await Promise.all(Array.from({length:6},(_,i)=>command(db,{op:'save_memory',kind:'Decisione',text:'Nota '+i,requestId:'concurrent-'+i})));assert.equal((await readState(db)).state.memories.length,8);await assert.rejects(command(db,{...input,cls:'INVENTATA'}));await assert.rejects(command(db,{...input,title:'   '}));await assert.rejects(command(db,{op:'save_event',title:'Data falsa',cls:'1I',date:'2026-02-31',time:'15:00'}));const id=(await readState(db)).state.projects[0].id;await assert.rejects(command(db,{op:'approve',projectId:id}));assert(!('requests'in clientState(await readState(db)).state));});
test('Guided background produces actual artifact, pause prevents stale work, resume and revision preserve versions',async()=>{const db=database(),id=await create(db);const r=await command(db,{op:'run',projectId:id});await executeGuided(db,id,r.run.runId,async()=>{});let p=(await readState(db)).state.projects[0];assert.equal(p.status,'approvazione');assert.equal(p.progress,100);assert.match(p.artifacts[0].content,/BOZZA GUIDATA/);assert.match(p.artifacts[0].content,/Un laboratorio <script>/);assert.match(p.artifacts[0].content,/Nessuna fonte|fonti esterne/);await command(db,{op:'approve',projectId:id});await command(db,{op:'revise',projectId:id,note:'Più spazio al confronto'});const r2=await command(db,{op:'run',projectId:id});await command(db,{op:'pause',projectId:id});await executeGuided(db,id,r2.run.runId,async()=>{});p=(await readState(db)).state.projects[0];assert.equal(p.status,'pausa');assert.equal(p.artifacts.length,1);const r3=await command(db,{op:'resume',projectId:id});await executeGuided(db,id,r3.run.runId,async()=>{});p=(await readState(db)).state.projects[0];assert.equal(p.artifacts.length,2);assert.match(p.artifacts[0].content,/Più spazio al confronto/);await command(db,{op:'cancel',projectId:id});await assert.rejects(command(db,{op:'save_artifact',projectId:id,title:'X',content:'Contenuto'}));});
test('ChatGPT checkpoints and deliverables; manual versions revoke prior approval',async()=>{const db=database(),id=await create(db);await command(db,{op:'checkpoint',projectId:id,stage:'Fonti e scaletta',progress:40,content:'Primo risultato concreto.'});let p=(await readState(db)).state.projects[0];assert.equal(p.engine,'chatgpt');await command(db,{op:'save_artifact',projectId:id,title:'Lezione',content:'# Lezione\n\nContenuto prodotto.',source:'chatgpt'});await command(db,{op:'approve',projectId:id});await command(db,{op:'save_artifact',projectId:id,title:'Correzione',content:'Correzione del docente.'});p=(await readState(db)).state.projects[0];assert.equal(p.status,'approvazione');assert.equal(p.artifacts.length,2);assert.equal(p.artifacts[1].source,'chatgpt');await command(db,{op:'save_event',title:'Scadenza',cls:'4I',date:'2026-10-14',time:'15:30'});await assert.rejects(command(db,{op:'reset'}));});
async function rpc(db,method,params={}){const bg=[];const response=await handleMcp(new Request('https://clara.test/mcp',{method:'POST',body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})}),db,p=>bg.push(p),'<!doctype html><h1>Clara</h1>');return {response,value:await response.json(),bg};}
test('MCP discovery, fullscreen global entrypoint, schema validation and tools',async()=>{const db=database();const init=await rpc(db,'initialize',{protocolVersion:'2025-11-25'});assert.equal(init.value.result.protocolVersion,'2025-11-25');assert.match(init.value.result.instructions,/Non modificare/);const listing=await rpc(db,'tools/list');assert.equal(listing.value.result.tools.length,16);assert(tools.find(t=>t.name==='clara_open')._meta['openai/ui'].entrypoints.some(e=>e.type==='global'));const resource=await rpc(db,'resources/read',{uri:'ui://clara/scrivania-v3.html'});assert.equal(resource.value.result.contents[0]._meta['openai/ui'].availableDisplayModes[0],'fullscreen');const made=await rpc(db,'tools/call',{name:'clara_create_project',arguments:{title:'IA',brief:'Un risultato',cls:'4I',type:'Dispensa'}});assert(made.value.result.structuredContent.projectId);const wrong=await rpc(db,'tools/call',{name:'clara_create_project',arguments:{title:'IA',brief:'x',cls:'4I',type:'Dispensa',unexpected:true}});assert(wrong.value.result.isError);const open=await rpc(db,'tools/call',{name:'clara_open',arguments:{}});assert(open.value.result._meta.claraState.state);const missing=await rpc(db,'tools/call',{name:'clara_get_project',arguments:{projectId:'missing'}});assert(missing.value.result.isError);});

const {agentCommand,agentQueue,agentInstructions,AGENT_REVISION}=await import('../lib/clara-agent.mjs');
test('native conversation entrypoint is separate from global launcher and preserves data',async()=>{
 const db=database();await create(db);const before=await readState(db);
 const global=tools.find(t=>t.name==='clara_open'),thread=tools.find(t=>t.name==='clara_conversation');
 assert.deepEqual(global._meta['openai/ui'].entrypoints,[{type:'global'}]);
 assert.deepEqual(thread._meta['openai/ui'].entrypoints,[{type:'thread'}]);
 assert.equal(thread._meta.ui.resourceUri,'ui://clara/scrivania-v9.html');
 for(const name of ['clara_state','clara_command','clara_chat_read'])assert.equal(tools.find(t=>t.name===name)._meta['openai/widgetAccessible'],true);
 const result=await rpc(db,'tools/call',{name:'clara_conversation',arguments:{}});
 assert.equal(result.value.result.structuredContent.projects.length,1);
 assert.deepEqual(await readState(db),before);
});
const {mutate}=await import('../lib/clara-store.mjs');
let seq=0;const agent=(db,op,args={})=>agentCommand(db,{op,requestId:'agent-'+(++seq),...args});
test('AI queue claims are exclusive, retries are idempotent and checkpoints survive continuation',async()=>{
 const db=database(),id=await create(db);
 await assert.rejects(command(db,{op:'enqueue',projectId:id}));
 await agent(db,'configure',{enabled:true,scheduleId:'verified-test-schedule'});
 await command(db,{op:'enqueue',projectId:id});
 const claims=await Promise.all([agent(db,'claim'),agent(db,'claim')]);
 assert.equal(claims.filter(x=>x.project).length,1);
 const acquired=claims.find(x=>x.project),key={projectId:id,runId:acquired.runId};
 assert.equal((await agentQueue(db)).active.length,1);
 await agent(db,'checkpoint',{...key,stage:'Attività progettata',content:'Attività completa e consegna per gli studenti.',progress:45,requestId:'same-checkpoint'});
 await agent(db,'checkpoint',{...key,stage:'Attività progettata',content:'Attività completa e consegna per gli studenti.',progress:45,requestId:'same-checkpoint'});
 assert.equal((await readState(db)).state.projects[0].checkpoints.length,1);
 await agent(db,'continue',key);
 const next=await agent(db,'claim');assert.notEqual(next.runId,key.runId);assert.equal(next.project.checkpoint,'Attività completa e consegna per gli studenti.');
 await assert.rejects(agent(db,'complete',{...key,title:'Old',content:'Old result'}));
 const complete={projectId:id,runId:next.runId,title:'Lezione pronta',content:'# Lezione\n\nTesto disciplinare sviluppato.',requestId:'same-result'};
 await agent(db,'complete',complete);await agent(db,'complete',complete);
 let p=(await readState(db)).state.projects[0];assert.equal(p.artifacts.length,1);assert.equal(p.artifacts[0].source,'scheduled');assert.equal(p.status,'approvazione');assert.equal((await agentQueue(db)).pending.length,0);
 await command(db,{op:'approve',projectId:id});await command(db,{op:'revise',projectId:id,note:'Sviluppa un esempio concreto.'});assert.equal((await agentQueue(db)).pending.length,1);
 const c=await agent(db,'claim');assert.match(c.project.revisionNotes[0].text,/esempio/);await agent(db,'needs_input',{projectId:id,runId:c.runId,message:'Incolla il testo da analizzare.'});assert.equal((await readState(db)).state.projects[0].status,'pausa');
 await command(db,{op:'resume',projectId:id});assert.equal((await agentQueue(db)).pending.length,1);
 assert.equal(agentInstructions.revision,AGENT_REVISION);assert(!('agentRequests' in clientState(await readState(db)).state));
});
test('Expired jobs recover, cancellation invalidates writers, reset preserves schedule configuration',async()=>{
 const db=database(),id=await create(db);await agent(db,'configure',{enabled:true,scheduleId:'test'});await command(db,{op:'enqueue',projectId:id});
 const first=await agent(db,'claim',{requestId:'retry-claim'});const repeated=await agent(db,'claim',{requestId:'retry-claim'});assert.equal(first.runId,repeated.runId);
 await mutate(db,s=>{s.projects[0].leaseUntil='2000-01-01T00:00:00Z';});
 await assert.rejects(agent(db,'complete',{projectId:id,runId:first.runId,title:'Expired',content:'Reject.'}));
 const second=await agent(db,'claim');assert.notEqual(second.runId,first.runId);assert.equal(second.project.attempts,2);
 await command(db,{op:'pause',projectId:id});await assert.rejects(agent(db,'checkpoint',{projectId:id,runId:second.runId,stage:'Stale',content:'Reject.',progress:10}));
 await command(db,{op:'resume',projectId:id});const third=await agent(db,'claim');await command(db,{op:'cancel',projectId:id});await assert.rejects(agent(db,'complete',{projectId:id,runId:third.runId,title:'Canceled',content:'Reject.'}));
 await command(db,{op:'reset',confirm:'RESET_CLARA'});assert.equal((await readState(db)).state.projects.length,0);assert.equal((await readState(db)).state.agent.enabled,true);
});

const {createChat,readChat,replyChat}=await import('../lib/clara-chat.mjs');
test('Home dialogue uses durable requests, real replies and replay protection without altering projects',async()=>{
 const db=database(),project=await create(db),requestId=crypto.randomUUID();
 const payload={requestId,message:'Spiegami una metafora.',responseMode:'voice'};
 const first=await createChat(db,payload);assert.equal(first.reply,'');assert.equal(first.status,'waiting');
 assert.equal((await createChat(db,payload)).id,requestId);
 await assert.rejects(createChat(db,{...payload,message:'Different'}));
 const reply='Una metafora trasferisce il significato da un ambito a un altro: «un mare di compiti».';
 const result=await replyChat(db,{requestId,reply});assert.equal(result.reply,reply);assert.equal(result.responseMode,'voice');
 assert.equal((await readChat(db,requestId)).status,'answered');
 assert.equal((await replyChat(db,{requestId,reply})).reply,reply);
 await assert.rejects(replyChat(db,{requestId,reply:'Replacement'}));
 assert.equal((await readState(db)).state.projects[0].id,project);
 assert(!('dialogues' in clientState(await readState(db)).state));
});
test('Dialogue expiry, capacity and validation preserve the bounded private archive',async()=>{
 const db=database(),requestId=crypto.randomUUID();
 await assert.rejects(createChat(db,{requestId,message:' ',responseMode:'voice'}));
 await assert.rejects(createChat(db,{requestId,message:'x',responseMode:'bad'}));
 await assert.rejects(readChat(db,'not-an-id'));
 await createChat(db,{requestId,message:'x',responseMode:'text'});
 await mutate(db,s=>{s.dialogues[0].createdAt=1;});
 await assert.rejects(readChat(db,requestId));
 await assert.rejects(replyChat(db,{requestId,reply:'too late'}));
 for(let i=0;i<12;i++)await createChat(db,{requestId:crypto.randomUUID(),message:'question '+i,responseMode:'text'});
 assert.equal((await readState(db)).state.dialogues.length,10);
 assert(!(await readState(db)).state.dialogues.some(c=>c.id===requestId));
});
test('MCP discovers and returns actual dialogue delivery tools',async()=>{
 const db=database(),requestId=crypto.randomUUID();
 const discover=await rpc(db,'server/discover');assert(discover.value.result.supportedVersions.includes('2026-07-28'));
 const created=await rpc(db,'tools/call',{name:'clara_chat_request',arguments:{requestId,message:'Una prova',responseMode:'text'}});
 assert.equal(created.value.result.structuredContent.chat.id,requestId);
 const delivered=await rpc(db,'tools/call',{name:'clara_chat_reply',arguments:{requestId,reply:'Risposta effettiva'}});
 assert.equal(delivered.value.result.structuredContent.chat.status,'answered');
 const read=await rpc(db,'tools/call',{name:'clara_chat_read',arguments:{requestId}});
 assert.equal(read.value.result.structuredContent.chat.reply,'Risposta effettiva');
});
