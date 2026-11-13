import {resetPreview,commandFingerprint,publicationPreflight,verifyPublication} from './clara-production.mjs';
import { seed,applyCommand,now } from './clara-domain.mjs';
// This is one shared workspace behind the platform's OWNER-ONLY Site policy.
// Service access does not impersonate a user or grant external app consent.
// Do not share this Site without implementing per-user membership and storage.
export async function readState(db){await db.prepare('INSERT OR IGNORE INTO clarabis_workspace (id,data,revision,updated_at) VALUES (?,?,?,?)').bind('clarabis-owner',JSON.stringify(seed()),1,now()).run();const row=await db.prepare('SELECT data,revision,updated_at FROM clarabis_workspace WHERE id=?').bind('clarabis-owner').first();return {state:JSON.parse(row.data),revision:row.revision,updatedAt:row.updated_at};}
export async function mutate(db,fn){for(let i=0;i<12;i++){const before=await readState(db);const state=structuredClone(before.state);const result=fn(state,before.revision)||{};if(result.replayed||result.skip)return {...before,...result};const encoded=JSON.stringify(state);if(new TextEncoder().encode(encoded).length>2000000)throw new Error('Archivio pieno. Esporta una copia e riduci i contenuti prima di salvare.');const saved=await db.prepare('UPDATE clarabis_workspace SET data=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?').bind(encoded,now(),'clarabis-owner',before.revision).run();if(saved.meta.changes)return {state,revision:before.revision+1,updatedAt:now(),...result};}throw new Error('Archivio occupato. Riprova: nessuna modifica è stata sovrascritta.');}
export async function command(db,payload){
 const fingerprint=await commandFingerprint(payload);
 if(payload.op==='publication_preflight'){
  const v=await readState(db);const p=v.state.projects.find(p=>p.id===payload.projectId);
  return {...v,preflight:publicationPreflight(p,payload)};
 }
 let verification;
 if(payload.op==='record_publication'){
  const before=await readState(db),replay=before.state.requestRecords?.find(r=>r.id===payload.requestId);
  if(replay){if(replay.fingerprint!==fingerprint)throw new Error('Identificativo già utilizzato.');return {...before,...replay.result,replayed:true};}
  const p=before.state.projects.find(p=>p.id===payload.projectId),preflight=publicationPreflight(p,payload);
  if(payload.commit!==preflight.commit||typeof payload.receipt!=='string'||!payload.receipt.trim()||payload.receipt.length>1000)throw new Error('Ricevuta e commit del deploy richiesti.');
  verification=await verifyPublication(preflight);
 }
 return mutate(db,(s,revision)=>applyCommand(s,payload,revision,fingerprint,verification));
}
export function clientState(v){const {requests,requestRecords,agentRequests,dialogues,...state}=v.state;return {state,revision:v.revision,updatedAt:v.updatedAt,resetPreview:resetPreview(v.state,v.revision),capabilities:{serverStorage:true,backgroundGuided:false,aiAutonomous:!!state.agent?.enabled,externalIntegrations:false,productionVersion:"1.0.0",versionedApprovals:true,projectReset:true}};}
