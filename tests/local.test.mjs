import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,unlinkSync,rmdirSync,existsSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {openLocalDatabase,handleLocalRequest} from '../lib/clara-local.mjs';
import {contract} from './fixtures.mjs';
const base='http://127.0.0.1:4177';
const request=(pathname,method='GET',payload,headers={})=>new Request(base+pathname,{method,headers:{...(payload?{'Content-Type':'application/json'}:{}),...headers},...(payload?{body:JSON.stringify(payload)}:{})});
test('archivio locale: creazione di incarico e nota, riapertura e recupero persistente',async()=>{
  const dir=mkdtempSync(path.join(os.tmpdir(),'clara-bis-test-')),file=path.join(dir,'workspace.sqlite');let db=openLocalDatabase(file);
  try{
    const before=await (await handleLocalRequest(request('/api/state'),db)).json();assert.equal(before.state.projects.length,0);assert.equal(before.capabilities.localMode,true);
    const create={op:'create_project',epoch:0,title:'Test locale',brief:'Una prova isolata',cls:'Docente',type:'App',contract};
    const result=await handleLocalRequest(request('/api/command','POST',create),db);assert.equal(result.status,200);const saved=await result.json();
    await handleLocalRequest(request('/api/command','POST',{op:'save_memory',kind:'Metodo',text:'Nota persistente'}),db);
    db.close();db=openLocalDatabase(file);
    const reopened=await (await handleLocalRequest(request('/api/state'),db)).json();assert.equal(reopened.state.projects[0].id,saved.projectId);assert.equal(reopened.state.memories[0].text,'Nota persistente');assert.equal(reopened.state.agent.enabled,false);
  }finally{db.close();for(const suffix of ['','-wal','-shm'])if(existsSync(file+suffix))unlinkSync(file+suffix);rmdirSync(dir);}
});
test('accesso locale respinge richieste da origini esterne e host di DNS rebinding',async()=>{
  const db=openLocalDatabase(':memory:');try{
    assert.equal((await handleLocalRequest(new Request('http://evil.test:4177/api/state'),db)).status,403);
    assert.equal((await handleLocalRequest(request('/api/state','GET',null,{Origin:'https://evil.test'}),db)).status,403);
    assert.equal((await handleLocalRequest(request('/api/state','GET',null,{'Sec-Fetch-Site':'cross-site'}),db)).status,403);
    assert.equal((await handleLocalRequest(request('/api/state','GET',null,{Origin:base}),db)).status,200);
  }finally{db.close();}
});
test('server locale espone solo asset e API previsti, non sorgente, report o database',async()=>{
  const db=openLocalDatabase(':memory:');try{
    const home=await handleLocalRequest(request('/'),db);assert.equal(home.status,200);assert.match(await home.text(),/Clara bis/);assert.match(home.headers.get('content-security-policy'),/frame-ancestors 'none'/);
    for(const route of ['/REPORT.md','/data-local/workspace.sqlite','/lib/clara-local.mjs','/.git/config','/mcp'])assert.equal((await handleLocalRequest(request(route),db)).status,404);
  }finally{db.close();}
});
test('nessuna attivazione o consegna simulata tramite API locale',async()=>{
  const db=openLocalDatabase(':memory:');try{
    for(const op of ['configure','enqueue','run','save_artifact'])assert.equal((await handleLocalRequest(request('/api/command','POST',{op}),db)).status,400);
    assert.equal((await handleLocalRequest(new Request(base+'/api/command',{method:'POST',body:'{}'}),db)).status,415);
    const state=await (await handleLocalRequest(request('/api/state'),db)).json();assert.equal(state.state.agent.enabled,false);assert.equal(state.state.projects.length,0);
  }finally{db.close();}
});
