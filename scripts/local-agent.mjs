// Bridge for a real Work execution against the local archive. Never runs an LLM itself.
import fs from 'node:fs';
import {openLocalDatabase,localDatabasePath} from '../lib/clara-local.mjs';
import {readState,command,mutate} from '../lib/clara-store.mjs';
import {agentQueue,agentCommand} from '../lib/clara-agent.mjs';
import {deliverLocal} from '../lib/clara-local-delivery.mjs';
import {appRoot} from '../lib/clara-local.mjs';
const [op,arg]=process.argv.slice(2);
if(!fs.existsSync(localDatabasePath))throw Error('Archivio locale assente: non creare un database sostitutivo.');
const db=openLocalDatabase();
try {
  let result;
  if(op==='queue') result=await agentQueue(db);
  else if(op==='probe') {
    const v=await mutate(db,s=>{s.localExecutor??={};s.localExecutor.lastProbeAt=new Date().toISOString();if(arg==='scheduled')s.localExecutor.lastScheduledProbeAt=s.localExecutor.lastProbeAt;return {probe:{ok:true,projects:s.projects.length,epoch:s.projectEpoch||0,at:s.localExecutor.lastProbeAt}};});
    result=v.probe;
  } else if(op==='connect'&&arg) {
    const v=await readState(db);if(!v.state.localExecutor?.lastProbeAt)throw Error('Verificare prima l’accesso al database con probe.');
    result=await agentCommand(db,{op:'configure',enabled:true,scheduleId:arg,requestId:crypto.randomUUID()});
    result=await mutate(db,s=>{s.agent.cadence='Ogni ora, con il PC acceso e collegato a Work';s.agent.executionMode='local-work';return {agent:s.agent};});
    result=result.agent;
  } else if(op==='disconnect') {
    result=await mutate(db,s=>{s.agent.enabled=false;return {agent:s.agent};});result=result.agent;
  } else if(op==='enqueue'&&arg) {
    result=await command(db,{op:'enqueue',projectId:arg,requestId:crypto.randomUUID()});
    result={projectId:arg,status:result.state.projects.find(p=>p.id===arg).status};
  } else if(op==='claim') {
    const v=await readState(db);
    result=await agentCommand(db,{op:'claim',epoch:v.state.projectEpoch||0,requestId:arg||crypto.randomUUID()});
    result={project:result.project,memories:result.memories,runId:result.runId,epoch:result.epoch};
  } else if(op==='apply'&&arg) {
    const payload=JSON.parse(fs.readFileSync(arg,'utf8'));
    if(!['checkpoint','heartbeat','continue','needs_input','complete','deliver_local'].includes(payload.op))throw Error('Operazione non consentita all’esecutore. I consensi restano al docente.');
    const c={...payload,requestId:payload.requestId||crypto.randomUUID()};
    result=payload.op==='deliver_local'?await deliverLocal(db,c,appRoot):await agentCommand(db,c);
    result={revision:result.revision,projectId:result.projectId,status:result.status,artifactId:result.artifactId};
  } else throw Error('Uso: node scripts/local-agent.mjs queue | probe | connect ID_AUTOMAZIONE | disconnect | enqueue ID | claim [ID_RICHIESTA] | apply FILE_JSON');
  console.log(JSON.stringify(result,null,2));
} finally {db.close();}
