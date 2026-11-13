import {readFileSync,realpathSync,lstatSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,relative,isAbsolute,join} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {mutate,readState} from './clara-store.mjs';
import {commandFingerprint,relativeFile,invalidateApproval} from './clara-production.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const text=(v,max)=>{if(typeof v!=='string'||!v.trim()||v.length>max)throw Error('Testo mancante o troppo lungo.');return v.trim();};
const inside=(root,file)=>{const rel=relative(root,file);if(rel.startsWith('..')||isAbsolute(rel))throw Error('File fuori dalla cartella autorizzata.');return file;};
function active(s,c){const p=s.projects.find(x=>x.id===c.projectId);if(!p?.background||p.status!=='lavorazione'||p.runId!==c.runId||!(Date.parse(p.leaseUntil)>Date.now()))throw Error('Presa in carico scaduta, in pausa o annullata.');return p;}
export async function deliverLocal(db,c,root){
  const fingerprint=await commandFingerprint(c);
  text(c.requestId,100);text(c.title,160);text(c.content,60000);
  const before=await readState(db),previous=before.state.agentRequests?.find(x=>x.id===c.requestId);
  if(previous){if(previous.fingerprint!==fingerprint)throw Error('Identificativo già usato.');return {...before,...previous.result,skip:true};}
  active(before.state,c);
  if(!Array.isArray(c.files)||!c.files.length||c.files.length>100)throw Error('Servono file reali.');
  const checks=(c.checks||[]).map(x=>({name:text(x.name,160),status:['passed','failed','not_run'].includes(x.status)?x.status:(()=>{throw Error('Verifica non valida.');})(),evidence:text(x.evidence,3000)}));
  if(!checks.length)throw Error('Registra le verifiche effettuate.');
  const limitations=(c.limitations||[]).map(x=>text(x,3000));
  // Only the job's own staging directory may be imported. Reject junctions/symlinks.
  if(!/^[a-f0-9-]{36}$/.test(c.projectId))throw Error('Progetto non valido.');
  const base=resolve(root,'work/jobs',c.projectId);
  const rootReal=realpathSync(root),baseReal=inside(rootReal,realpathSync(base));
  const names=c.files.map(relativeFile);
  if(new Set(names.map(x=>x.toLowerCase())).size!==names.length||names.some(x=>x.split('/').at(-1).toLowerCase()==='report.md'))throw Error('Elenco file non valido. REPORT.md resta separato.');
  let total=0;
  const read=name=>{const file=inside(baseReal,realpathSync(resolve(baseReal,name)));if(!lstatSync(file).isFile())throw Error('File non regolare.');const bytes=readFileSync(file);total+=bytes.length;if(total>50*1024*1024)throw Error('Consegna troppo grande.');return bytes;};
  const records=names.map(path=>{const bytes=read(path);return {path,bytes,sha256:hash(bytes)};});
  const report=read('REPORT.md');
  // Snapshot creation is inside the synchronous CAS callback. Pauses/cancellation are checked again.
  const snapshotId=randomUUID();let written=false;
  return mutate(db,s=>{
    const replay=s.agentRequests?.find(x=>x.id===c.requestId);
    if(replay){if(replay.fingerprint!==fingerprint)throw Error('Identificativo già usato.');return {...replay.result,skip:true};}
    const p=active(s,c);
    if(!written){
      const folder=resolve(root,'data-local/deliveries',snapshotId);mkdirSync(folder,{recursive:true});inside(rootReal,realpathSync(folder));
      for(const f of records){const file=resolve(folder,f.path);mkdirSync(resolve(file,'..'),{recursive:true});inside(realpathSync(folder),realpathSync(resolve(file,'..')));writeFileSync(file,f.bytes,{flag:'wx'});}
      writeFileSync(join(folder,'REPORT.md'),report,{flag:'wx'});written=true;
    }
    const at=new Date().toISOString(),artifact={id:snapshotId,title:c.title,content:c.content,source:'scheduled',at,format:'markdown',localDelivery:{snapshotId,files:records.map(({path,sha256})=>({path,sha256})),checks,limitations,reportSha256:hash(report),previewPending:true}};
    invalidateApproval(p);p.artifacts=[artifact,...p.artifacts].slice(0,10);p.runId=null;p.leaseUntil=null;p.status='approvazione';p.progress=95;p.stage='File locali consegnati — anteprima Sites da verificare';p.updatedAt=at;
    p.log.push({text:'Clara: file reali consegnati per la revisione. Anteprima Sites non certificata.',at,iso:at,projectId:p.id});
    s.agent.lastCompletedAt=at;s.agent.lastOutcome='Consegna locale: '+p.title;
    const result={projectId:p.id,artifactId:artifact.id,status:p.status};
    s.agentRequests=[...(s.agentRequests||[]),{id:c.requestId,op:'deliver_local',fingerprint,result}].slice(-120);
    return result;
  });
}
export function readLocalDelivery(state,artifactId,fileName,root){
  const a=state.projects.flatMap(p=>p.artifacts).find(a=>a.id===artifactId),d=a?.localDelivery;
  if(!d||d.snapshotId!==artifactId||!/^[a-f0-9-]{36}$/.test(artifactId))throw Error('Consegna non trovata.');
  const record=d.files.find(f=>f.path===fileName);if(!record)throw Error('File non trovato.');
  const base=realpathSync(resolve(root,'data-local/deliveries',artifactId));
  inside(realpathSync(resolve(root,'data-local/deliveries')),base);
  const file=inside(base,realpathSync(resolve(base,relativeFile(record.path))));
  const bytes=readFileSync(file);if(hash(bytes)!==record.sha256)throw Error('Il file non corrisponde alla versione consegnata.');
  return bytes;
}
