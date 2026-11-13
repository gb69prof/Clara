import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {command,readState,mutate,clientState} from '../lib/clara-store.mjs';
import {agentCommand,agentQueue} from '../lib/clara-agent.mjs';
import {verifyPublication,deliveryOf} from '../lib/clara-production.mjs';
import {isPrivatePath} from '../lib/private-paths.mjs';
import {exportProject} from '../scripts/export-project.mjs';
import {contract,details,delivery} from './fixtures.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function database(file=':memory:'){
 const exists=file!==':memory:'&&fs.existsSync(file),sql=new DatabaseSync(file);
 if(!exists)sql.exec(fs.readFileSync('drizzle/0000_thick_ricochet.sql','utf8'));
 return {sql,prepare(q){return {bind(...a){const stmt=sql.prepare(q);return {async run(){return {meta:{changes:Number(stmt.run(...a).changes)}};},async first(){return stmt.get(...a)||null;}};}};}};
}
const create=(db,epoch=0)=>command(db,{op:'create_project',epoch,title:'Test sintetico',brief:'Contenuto di test',cls:'1I',type:'PWA',contract});
const agent=(db,op,args={})=>agentCommand(db,{op,requestId:crypto.randomUUID(),...args});
async function queue(db){const {projectId}=await create(db);await agent(db,'configure',{enabled:true,scheduleId:'test-only'});await command(db,{op:'enqueue',projectId});return projectId;}
const save=(db,projectId,extra={})=>command(db,{op:'save_artifact',projectId,title:'Versione',content:'Contenuto',delivery,...extra});
const approve=(db,projectId,versionId)=>command(db,{op:'approve',projectId,versionId,confirm:'APPROVE_VERSION'});
const grant=(db,projectId,versionId)=>command(db,{op:'authorize_publication',projectId,versionId,confirm:'PUBLISH_EXACT_VERSION',destination:'https://gbprof.it/test/'});

test('reset atomico con revisione esatta conserva collezioni e invalida ogni vecchia corsa',async()=>{
 const db=database(),projectId=await queue(db),claim=await agent(db,'claim');
 await agent(db,'checkpoint',{projectId,runId:claim.runId,stage:'Test',content:'CONTENUTO_DA_CANCELLARE',progress:30,details});
 await command(db,{op:'save_event',title:'Scadenza conservata',date:'2026-11-20',time:'12:00',cls:'1I'});
 const before=await readState(db),preview=clientState(before).resetPreview;
 assert.deepEqual(preview.counts,{projects:1,versions:0,checkpoints:1,jobs:1});
 await assert.rejects(command(db,{op:'reset_all_projects',expectedRevision:before.revision-1,confirm:'RESET_ALL_PROJECTS',requestId:'wrong'}));
 assert.deepEqual(await readState(db),before);
 const reset={op:'reset_all_projects',expectedRevision:before.revision,confirm:'RESET_ALL_PROJECTS',requestId:'reset'};
 await command(db,reset);const after=await readState(db);await command(db,reset);assert.deepEqual(await readState(db),after);
 assert.deepEqual(after.state.memories,before.state.memories);assert.deepEqual(after.state.events,before.state.events);
 assert.equal(after.state.agent.scheduleId,'test-only');assert.equal(after.state.projects.length,0);assert.equal(after.state.projectEpoch,1);
 assert(!JSON.stringify(after.state).includes('CONTENUTO_DA_CANCELLARE'));assert(!JSON.stringify(after.state).includes(projectId));
 assert.equal((await agentQueue(db)).pending.length,0);assert.equal((await agentQueue(db)).active.length,0);
 await assert.rejects(agent(db,'heartbeat',{projectId,runId:claim.runId}));
 await assert.rejects(agent(db,'claim',{epoch:0}));await assert.rejects(create(db,0));
 assert.equal((await agent(db,'claim',{epoch:1})).project,null);await create(db,1);
});

test('checkpoint sopravvive a chiusura SQLite e riparte nella nuova corsa',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'clara-persistence-')),file=path.join(dir,'state.sqlite');
 let db=database(file);const projectId=await queue(db),first=await agent(db,'claim');
 await agent(db,'checkpoint',{projectId,runId:first.runId,stage:'File creato',content:'Risultato concreto',progress:40,details:{...details,created_files:delivery.files}});
 await agent(db,'continue',{projectId,runId:first.runId});db.sql.close();db=database(file);
 const next=await agent(db,'claim');assert.notEqual(next.runId,first.runId);assert.deepEqual(next.project.resume.created_files,delivery.files);assert.equal(next.project.resume.next_action,details.next_action);
 await assert.rejects(agent(db,'continue',{projectId,runId:next.runId}),/parziale/);
 await agent(db,'heartbeat',{projectId,runId:next.runId});
 await mutate(db,s=>{s.projects[0].leaseUntil='invalid';});await assert.rejects(agent(db,'heartbeat',{projectId,runId:next.runId}));
 const reclaimed=await agent(db,'claim');assert.notEqual(reclaimed.runId,next.runId);db.sql.close();
 // Keep only this test's explicit temporary directory eligible for cleanup.
 assert.equal(path.dirname(dir),path.resolve(os.tmpdir()));fs.rmSync(dir,{recursive:true});
});

test('concorrenza, collisione idempotency key, annullamento e consegna incompleta',async()=>{
 const db=database(),projectId=await queue(db),claims=await Promise.all([agent(db,'claim'),agent(db,'claim')]);
 assert.equal(claims.filter(c=>c.project).length,1);const runId=claims.find(c=>c.project).runId;
 const c={projectId,runId,requestId:'stable',stage:'Test',content:'Un file',progress:30,details};
 await agent(db,'checkpoint',c);await assert.rejects(agent(db,'checkpoint',{...c,content:'Diverso'}),/Identificativo/);
 await assert.rejects(agent(db,'complete',{projectId,runId,title:'Solo testo',content:'Non una consegna'}));
 assert.equal((await readState(db)).state.projects[0].status,'lavorazione');
 await command(db,{op:'cancel',projectId});for(const op of ['resume','run','enqueue'])await assert.rejects(command(db,{op,projectId}));
 await assert.rejects(agent(db,'complete',{projectId,runId,title:'Stale',content:'Vecchio',delivery}));
});

test('approvazione esatta, consenso separato e revoca su ogni nuova versione',async()=>{
 const db=database(),{projectId}=await create(db);const a=await save(db,projectId);
 await assert.rejects(grant(db,projectId,a.artifactId));await assert.rejects(approve(db,projectId,'wrong'));
 await approve(db,projectId,a.artifactId);
 await assert.rejects(command(db,{op:'publication_preflight',projectId,versionId:a.artifactId}));
 await grant(db,projectId,a.artifactId);const preflight=await command(db,{op:'publication_preflight',projectId,versionId:a.artifactId});
 assert.equal(preflight.preflight.commit,delivery.commit);assert.deepEqual(preflight.preflight.exclude,['REPORT.md']);
 const b=await save(db,projectId);assert.notEqual(b.artifactId,a.artifactId);
 await assert.rejects(approve(db,projectId,a.artifactId));await assert.rejects(command(db,{op:'publication_preflight',projectId,versionId:b.artifactId}));
 assert.equal((await readState(db)).state.projects[0].publication,undefined);
 await approve(db,projectId,b.artifactId);await grant(db,projectId,b.artifactId);await command(db,{op:'revise',projectId,note:'Una nuova lettura'});
 assert.equal((await readState(db)).state.projects[0].approval,undefined);
});

test('ricevuta di pubblicazione richiede HTTP e contenuto esatto; nessun accesso prima del consenso',async()=>{
 const bytes='<h1>Pagina di prova</h1>',db=database(),{projectId}=await create(db);
 const {artifactId}=await save(db,projectId,{delivery:{...delivery,files:[{path:'index.html',sha256:hash(bytes)}]}});
 const original=globalThis.fetch;let requests=0;
 globalThis.fetch=async(url,options)=>{requests++;assert.equal(options.redirect,'error');if(url==='https://gbprof.it/test/REPORT.md')return new Response(null,{status:404});assert.equal(url,'https://gbprof.it/test/');return new Response(bytes);};
 try{
  const receipt={op:'record_publication',projectId,versionId:artifactId,commit:delivery.commit,receipt:'Test simulato, non un deploy reale',requestId:'receipt'};
  await assert.rejects(command(db,receipt));assert.equal(requests,0);
  await approve(db,projectId,artifactId);await grant(db,projectId,artifactId);
  await command(db,receipt);await command(db,receipt);assert.equal(requests,2);
  assert.equal((await readState(db)).state.projects[0].status,'pubblicato');
 }finally{globalThis.fetch=original;}
 await assert.rejects(verifyPublication({destination:'https://gbprof.it/test/',entrySha256:hash(bytes)},async()=>new Response('diverso')));
 await assert.rejects(verifyPublication({destination:'https://gbprof.it/test/',entrySha256:hash(bytes)},async()=>new Response(bytes,{status:403})));
 await assert.rejects(verifyPublication({destination:'https://gbprof.it/test/',entrySha256:hash(bytes)},async()=>new Response(bytes)),/REPORT.md/);
});

test('manifest di consegna respinge report, percorsi e anteprime estranee',()=>{
 for(const path of ['REPORT.md','docs/report.md','../segreto','.env','C:\\x','a/../../x'])assert.throws(()=>deliveryOf({...delivery,files:[{path,sha256:'b'.repeat(64)}],entryPath:path}));
 assert.throws(()=>deliveryOf({...delivery,preview:{...delivery.preview,url:'https://chatgpt.site.evil.test/'}}));
 assert.throws(()=>deliveryOf({...delivery,files:[...delivery.files,...delivery.files]}));
 assert.equal(deliveryOf({...delivery,checks:[{name:'Non eseguito',status:'not_run',evidence:'Da provare'}]}).verified,false);
 for(const path of ['/REPORT.md','/docs/report.md','/%52EPORT.md','/docs/%2572eport.md'])assert(isPrivatePath(path));
 assert(!isPrivatePath('/index.html'));
});

test('export copia solo file con hash corretto e lascia il report fuori',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'clara-export-')),source=path.join(dir,'source'),target=path.join(dir,'export');fs.mkdirSync(source);
 fs.writeFileSync(path.join(source,'index.html'),'pagina');fs.writeFileSync(path.join(source,'REPORT.md'),'non pubblico');
 const manifest={files:[{path:'index.html',sha256:hash('pagina')}]};
 const result=await exportProject(source,manifest,target);assert.deepEqual(result.files,['index.html']);assert.deepEqual(fs.readdirSync(target),['index.html']);
 await assert.rejects(exportProject(source,manifest,target));
 await assert.rejects(exportProject(source,{files:[{path:'REPORT.md',sha256:hash('non pubblico')}]},path.join(dir,'bad')));
 await assert.rejects(exportProject(source,{files:[{path:'index.html',sha256:'0'.repeat(64)}]},path.join(dir,'wrong')));
 assert(!fs.existsSync(path.join(dir,'wrong')));
 assert.equal(path.dirname(dir),path.resolve(os.tmpdir()));fs.rmSync(dir,{recursive:true});
});
