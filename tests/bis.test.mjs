import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {DatabaseSync} from 'node:sqlite';
import {seed} from '../lib/clara-domain.mjs';
import {readState,command,clientState} from '../lib/clara-store.mjs';
import {tools,handleMcp} from '../lib/clara-mcp.mjs';
import {contract,delivery} from './fixtures.mjs';
function database() {
  const sql=new DatabaseSync(':memory:'); sql.exec(fs.readFileSync('drizzle/0000_thick_ricochet.sql','utf8'));
  return {sql,prepare(q){return {bind(...a){const stmt=sql.prepare(q);return {async run(){return {meta:{changes:Number(stmt.run(...a).changes)}};},async first(){return stmt.get(...a)||null;}};}};}};
}
test('nuova identità e archivio vuoto, senza scrivere sulle tabelle di Clara precedente',async()=>{
  const db=database(); db.sql.exec("CREATE TABLE clara_workspace(id TEXT PRIMARY KEY,data TEXT); INSERT INTO clara_workspace VALUES('owner','OLD_UNTOUCHED')");
  const v=await readState(db); assert.equal(v.state.projects.length,0); assert.deepEqual(v.state.memories,[]); assert.deepEqual(v.state.events,[]); assert.equal(v.state.agent.enabled,false);
  const p=await command(db,{op:'create_project',title:'Progetto libero',brief:'Una app per il docente',cls:'Docenti / tutte le classi',type:'App',contract});
  assert.equal(p.state.projects[0].status,'nuovo'); assert.equal(p.state.projects[0].background,undefined);
  await assert.rejects(command(db,{op:'enqueue',projectId:p.projectId}),/non attiva/);
  await assert.rejects(command(db,{op:'run',projectId:p.projectId}),/esecuzione reale/);
  assert.equal(db.sql.prepare('SELECT data FROM clara_workspace').get().data,'OLD_UNTOUCHED');
  assert.equal(clientState(v).capabilities.backgroundGuided,false);
});
test('MCP nuovo non espone tool e risorse della vecchia app',async()=>{
  assert(tools.every(t=>t.name.startsWith('clarabis_'))); assert(!tools.some(t=>t.name.includes('chat_reply')));
  const send=(method,params)=>handleMcp(new Request('https://example.test/mcp',{method:'POST',body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})}),database(),()=>{},'<p>Bis</p>');
  const init=await (await send('initialize',{})).json(); assert.equal(init.result.serverInfo.name,'clara-bis');
  const old=await (await send('resources/read',{uri:'ui://clara/scrivania-v8.html'})).json(); assert(old.error);
  const list=await (await send('resources/list',{})).json(); assert.equal(list.result.resources[0].uri,'ui://clara-bis/workspace-v1.html');
});
function ui(initial) {
  const elements=new Map(), handlers={}, windowHandlers={}, writes=[], messages=[];
  const node=id=>{ if(!elements.has(id)) elements.set(id,{id,innerHTML:'',textContent:'',value:'',open:false,hidden:false,className:'',showModal(){this.open=true;},close(){this.open=false;},setAttribute(){},querySelector(){return {disabled:false};}});return elements.get(id);};
  const window={ClaraTransport:{load:async()=>initial,capabilities:()=>({canMessage:true}),command:async payload=>{writes.push(payload);return {...initial,revision:initial.revision+2};},message:async text=>{messages.push(text);return {accepted:true};}},addEventListener:(n,f)=>windowHandlers[n]=f};
  const document={getElementById:node,querySelectorAll:()=>[],addEventListener:(n,f)=>handlers[n]=f,visibilityState:'visible'};
  vm.runInNewContext(fs.readFileSync('public/app.js','utf8'),{window,document,location:{hash:''},crypto,URL,Blob,FormData:class {constructor(form){return new Map(Object.entries(form.data));}},setTimeout:()=>1,clearTimeout(){},setInterval(){}});
  const click=async(action,id='',extras={})=>handlers.click({target:{closest:()=>({dataset:{action,id,...extras}})}});
  const submit=async(id,data)=>handlers.submit({preventDefault(){},target:{id,data,querySelector:()=>({disabled:false})}});
  return {node,click,submit,writes,messages,change:v=>windowHandlers['clara:state']({detail:v}),settle:()=>new Promise(resolve=>setImmediate(resolve))};
}
function state(projects=[]) {return {state:{...seed(),projects},revision:1,resetPreview:{revision:1,counts:{projects:projects.length,versions:0,checkpoints:0,jobs:0}}};}
const example=()=>({id:'p1',title:'Titolo sicuro',brief:'Un progetto reale',cls:'4 AT',type:'PWA',status:'approvazione',progress:100,stage:'Consegna',updatedAt:new Date().toISOString(),artifacts:[{id:'version-1',title:'Consegna',content:'<script>alert(1)</script>',at:new Date().toISOString(),delivery}],log:[],contract});
test('UI parte vuota e conserva il contratto senza avviare lavori implicitamente',async()=>{
  const u=ui(state()); await u.settle(); assert.match(u.node('main').innerHTML,/Il tuo prossimo progetto/);
  await u.click('new'); await u.submit('projectForm',{title:'Prova',brief:'Goal',cls:'Docente',type:'App',target:'Sites',scope:'Una app\nUn manuale',sources:'Fonte',acceptance:'Navigabile'});
  assert.equal(u.writes.length,1); assert.equal(u.writes[0].op,'create_project'); assert.deepEqual([...u.writes[0].contract.scope],['Una app','Un manuale']); assert.equal(u.writes[0].epoch,0);
});
test('UI approva la versione visualizzata anche se arriva una nuova versione durante la conferma',async()=>{
  const p=example(),u=ui(state([p])); await u.settle(); await u.click('detail','p1');
  assert.match(u.node('main').innerHTML,/&lt;script&gt;/); assert(!u.node('main').innerHTML.includes('<script>alert'));
  await u.click('approve-confirm','p1'); const newer=structuredClone(p);newer.artifacts[0].id='version-2';u.change({...state([newer]),revision:2});
  await u.click('approve-now','p1');assert.equal(u.writes[0].versionId,'version-1');assert.equal(u.writes[0].confirm,'APPROVE_VERSION');
});
test('UI conserva la revisione mostrata nel reset, senza cancellare un archivio cambiato nel frattempo',async()=>{
  const u=ui(state([example()]));await u.settle();await u.click('reset');u.change({...state([example()]),revision:2});await u.submit('resetForm',{});
  assert.equal(u.writes[0].expectedRevision,1);assert.equal(u.writes[0].confirm,'RESET_ALL_PROJECTS');
});
test('UI invia il progetto al tool della nuova app nella conversazione e non alla vecchia Clara',async()=>{
  const u=ui(state([example()]));await u.settle();await u.click('chat-project','p1');assert.equal(u.messages.length,1);assert.match(u.messages[0],/clarabis_get_project/);assert(!u.messages[0].includes('clara_get_project'));
});
