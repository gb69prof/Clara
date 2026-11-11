import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {openLocalDatabase,handleLocalRequest} from '../lib/clara-local.mjs';
import {command,readState} from '../lib/clara-store.mjs';
import {agentCommand} from '../lib/clara-agent.mjs';
import {deliverLocal,readLocalDelivery} from '../lib/clara-local-delivery.mjs';
import {contract,details} from './fixtures.mjs';
const req=()=>crypto.randomUUID();
async function setup(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'clarabis-agent-')),filename=path.join(root,'workspace.sqlite'),db=openLocalDatabase(filename);
 const created=await command(db,{op:'create_project',title:'Test isolato',brief:'Consegna locale',cls:'Docenti',type:'Dispensa',contract});
 await agentCommand(db,{op:'configure',enabled:true,scheduleId:'fixture-only',requestId:req()});
 await command(db,{op:'enqueue',projectId:created.projectId});
 const claim=await agentCommand(db,{op:'claim',epoch:0,requestId:req()});
 const folder=path.join(root,'work/jobs',created.projectId);fs.mkdirSync(folder,{recursive:true});
 fs.writeFileSync(path.join(folder,'dispensa.txt'),'Prodotto di test isolato');fs.writeFileSync(path.join(folder,'REPORT.md'),'Report di test');
 const payload={op:'deliver_local',projectId:created.projectId,runId:claim.runId,requestId:req(),title:'Consegna di test',content:'Prodotto verificabile',files:['dispensa.txt'],checks:[{name:'Esistenza file',status:'passed',evidence:'Fixture'}],limitations:['Fixture, nessun contenuto didattico reale']};
 return {db,root,folder,filename,payload,claim,cleanup(){try{db.close();}catch{}if(path.dirname(root)!==fs.realpathSync(os.tmpdir())&&!root.startsWith(path.resolve(os.tmpdir())+path.sep))throw Error('Percorso di pulizia non valido');fs.rmSync(root,{recursive:true,force:true});}};
}
test('esecutore: doppia acquisizione esclusa, checkpoint persistente e ripresa',async()=>{
 const x=await setup();try{
  assert.equal((await agentCommand(x.db,{op:'claim',epoch:0,requestId:req()})).project,null);
  await agentCommand(x.db,{op:'checkpoint',projectId:x.payload.projectId,runId:x.claim.runId,requestId:req(),stage:'Fonti',content:'Lettura verificata',progress:10,details});
  await agentCommand(x.db,{op:'continue',projectId:x.payload.projectId,runId:x.claim.runId,requestId:req()});
  const second=openLocalDatabase(x.filename);try{const y=await agentCommand(second,{op:'claim',epoch:0,requestId:req()});assert.notEqual(y.runId,x.claim.runId);assert.equal(y.project.checkpoint,'Lettura verificata');}finally{second.close();}
 }finally{x.cleanup();}
});
test('consegna locale: file immutabili, idempotenza, report escluso e pubblicazione bloccata',async()=>{
 const x=await setup();try{
  const r=await deliverLocal(x.db,x.payload,x.root),a=r.state.projects[0].artifacts[0];
  assert.equal(r.state.projects[0].status,'approvazione');assert.equal(r.state.projects[0].progress,95);
  fs.writeFileSync(path.join(x.folder,'dispensa.txt'),'Versione successiva');
  assert.equal(readLocalDelivery(r.state,a.id,'dispensa.txt',x.root).toString(),'Prodotto di test isolato');
  assert.throws(()=>readLocalDelivery(r.state,a.id,'REPORT.md',x.root),/non trovato/);
  assert.throws(()=>readLocalDelivery(r.state,a.id,'../../workspace.sqlite',x.root),/non trovato/);
  fs.unlinkSync(path.join(x.folder,'dispensa.txt'));
  const replay=await deliverLocal(x.db,x.payload,x.root);assert.equal(replay.artifactId,a.id);assert.equal(replay.state.projects[0].artifacts.length,1);
  await command(x.db,{op:'approve',projectId:x.payload.projectId,versionId:a.id,confirm:'APPROVE_VERSION'});
  await assert.rejects(command(x.db,{op:'authorize_publication',projectId:x.payload.projectId,versionId:a.id,confirm:'PUBLISH_EXACT_VERSION',destination:'https://gbprof.it/test/'}),/file, anteprima/);
  fs.writeFileSync(path.join(x.root,'data-local/deliveries',a.id,'dispensa.txt'),'Alterazione');
  assert.throws(()=>readLocalDelivery(r.state,a.id,'dispensa.txt',x.root),/non corrisponde/);
 }finally{x.cleanup();}
});
test('consegna locale respinge lease revocate, file mancanti e attraversamenti di percorso',async()=>{
 const x=await setup();try{
  await assert.rejects(deliverLocal(x.db,{...x.payload,files:['../workspace.sqlite']},x.root),/relativo/);
  await assert.rejects(deliverLocal(x.db,{...x.payload,files:['manca.pdf']},x.root),/ENOENT/);
  await command(x.db,{op:'pause',projectId:x.payload.projectId});
  await assert.rejects(deliverLocal(x.db,x.payload,x.root),/scaduta/);
  assert.equal((await readState(x.db)).state.projects[0].artifacts.length,0);
 }finally{x.cleanup();}
});
test('HTTP locale: affidamento funziona solo con esecutore configurato, configure resta inaccessibile',async()=>{
 const db=openLocalDatabase(':memory:');try{
  const p=await command(db,{op:'create_project',title:'Test',brief:'Goal',cls:'Docenti',type:'App',contract});
  const post=body=>handleLocalRequest(new Request('http://127.0.0.1:4177/api/command',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),db);
  assert.equal((await post({op:'enqueue',projectId:p.projectId})).status,400);
  assert.equal((await post({op:'configure',enabled:true})).status,400);
  await agentCommand(db,{op:'configure',enabled:true,scheduleId:'test-only',requestId:req()});
  const r=await post({op:'enqueue',projectId:p.projectId});assert.equal(r.status,200);
  const v=await r.json();assert.equal(v.state.projects[0].status,'coda');assert.equal(v.capabilities.aiAutonomous,true);
 }finally{db.close();}
});
