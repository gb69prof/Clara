import {contractOf,checkpointOf,deliveryOf,invalidateApproval,latestVersion,resetProjects,requireEpoch,publicationGrant,publicationPreflight} from './clara-production.mjs';
export const CLASSES=['1I','2AT','4I','2E'];
export const TYPES=['Lezione','PWA','Laboratorio','Dispensa','Verifica','App','Altro'];
export const now=()=>new Date().toISOString();
export const humanTime=()=>new Date().toLocaleString('it-IT',{timeZone:'Europe/Rome',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
const text=(v,max=3000)=>{if(typeof v!=='string'||!v.trim()||v.length>max)throw new Error('Testo assente o troppo lungo.');return v.trim();};
const member=(v,list)=>{if(!list.includes(v))throw new Error('Valore non ammesso.');return v;};
const id=()=>crypto.randomUUID();
const log=(s,p,message)=>{const item={text:message,at:humanTime(),iso:now(),...(p?{projectId:p.id}:{})};if(p)p.log=[...(p.log||[]),item].slice(-100);s.history=[item,...s.history].slice(0,150);};
export function seed(){return {version:1,projectEpoch:0,projects:[],memories:[],events:[],stars:[],history:[],requests:[],agent:{enabled:false,instructionsRevision:'clarabis-2026-11-11-v1'}};}
export function validateCommand(c){if(!c||typeof c!=='object'||typeof c.op!=='string')throw new Error('Comando non valido.');if(c.requestId!==undefined&&(typeof c.requestId!=='string'||c.requestId.length>100))throw new Error('Identificativo richiesta non valido.');}
export function applyCommand(s,c,revision,fingerprint,verification){
 validateCommand(c); s.requests??=[]; s.requestRecords??=[];
 const replay=c.requestId&&s.requestRecords.find(r=>r.id===c.requestId);
 if(replay){if(replay.fingerprint!==fingerprint)throw new Error('Identificativo già usato per una richiesta diversa.');return {...replay.result,replayed:true};}
 if(c.requestId&&s.requests.includes(c.requestId))return {replayed:true};
 let p;if(c.projectId){p=s.projects.find(x=>x.id===c.projectId);if(!p)throw new Error('Progetto non trovato.');}
 let result={};
 switch(c.op){
 case 'create_project':{
  requireEpoch(s,c.epoch); if(s.projects.length>=150)throw new Error('Archivio pieno.');
  const project={id:id(),title:text(c.title,120),brief:text(c.brief,12000),cls:text(c.cls,120),type:member(c.type,TYPES),status:'nuovo',progress:0,engine:'none',stage:'Salvato, da affidare',createdAt:now(),updatedAt:now(),log:[],artifacts:[],revisionNotes:[],runId:null,epoch:s.projectEpoch||0};
  if(c.contract)project.contract=contractOf(c.contract);
  s.projects.unshift(project);log(s,project,'Incarico creato: '+project.title);result={projectId:project.id};break;
 }
 case 'edit_project':{
  if(!p||['lavorazione','annullato','pubblicato'].includes(p.status))throw new Error('Modifica non disponibile in questa fase.');
  p.title=text(c.title,120);p.brief=text(c.brief,12000);p.cls=text(c.cls,120);p.type=member(c.type,TYPES);
  p.contract=c.contract?contractOf(c.contract):null;delete p.resume;delete p.checkpoint;invalidateApproval(p);p.status='nuovo';p.progress=0;p.background=false;p.runId=null;p.leaseUntil=null;p.stage='Incarico modificato, da affidare';log(s,p,'Incarico aggiornato; le bozze precedenti restano nello storico.');break;
 }
 case 'enqueue':{
  if(!p||['lavorazione','annullato','completato','approvazione','pronto','pubblicato'].includes(p.status))throw new Error('Questo progetto non può essere affidato adesso.');
  contractOf(p.contract);if(!s.agent?.enabled)throw new Error('Esecuzione programmata non attiva.');
  if(p.background&&p.status==='coda')return {skip:true,projectId:p.id};
  invalidateApproval(p);p.engine='scheduled';p.background=true;p.status='coda';p.stage='Affidato a Clara — in attesa del prossimo controllo';p.queuedAt=now();p.runId=null;p.leaseUntil=null;log(s,p,'Incarico affidato a Clara per l’esecuzione IA programmata.');break;
 }
 case 'run':throw new Error('Clara bis richiede una esecuzione reale: affida il progetto o lavora nella conversazione.');
 case 'resume':{
  if(!p?.background)throw new Error('Nessuna esecuzione programmata da riprendere.');
  if(!p||['annullato','completato','approvazione','pronto','pubblicato'].includes(p.status))throw new Error('Preparazione non disponibile in questa fase.');
  if(p.background&&c.op==='resume'){
   if(!['pausa','errore'].includes(p.status))throw new Error('L’incarico non è in pausa.');
   contractOf(p.contract);if(!s.agent?.enabled)throw new Error('Esecuzione programmata non attiva.');
   p.status='coda';p.engine='scheduled';p.runId=null;p.leaseUntil=null;p.stage='Ripreso — in attesa del prossimo controllo';p.queuedAt=now();log(s,p,'Incarico rimesso nella coda IA.');break;
  }
  throw new Error("Ripresa non disponibile.");
 }
 case 'pause':{
  if(!p||!['nuovo','coda','revisione','lavorazione'].includes(p.status))throw new Error('Questo progetto non può essere messo in pausa.');
  p.runId=null;p.leaseUntil=null;p.status='pausa';p.stage='In pausa';log(s,p,'Preparazione messa in pausa; checkpoint conservati.');break;
 }
 case 'cancel':{
  if(!p||['annullato','pubblicato'].includes(p.status))throw new Error('Annullamento non disponibile.');
  invalidateApproval(p);p.status='annullato';p.runId=null;p.leaseUntil=null;p.background=false;p.stage='Annullato';log(s,p,'Incarico annullato; risultati e cronologia conservati.');break;
 }
 case 'approve':{
  const a=latestVersion(p,c.versionId);if(p.status!=='approvazione'||c.confirm!=='APPROVE_VERSION')throw new Error('Conferma esplicita della versione richiesta.');
  invalidateApproval(p);p.approval={versionId:a.id,at:now()};p.approvedArtifactId=a.id;p.status='completato';p.stage='Versione approvata';log(s,p,'Versione '+a.id+' approvata. Pubblicazione non autorizzata.');break;
 }
 case 'revise':{
  if(!p||!['approvazione','completato','pronto','pubblicato','pausa'].includes(p.status))throw new Error('Revisione non disponibile in questa fase.');
  const note=text(c.note,3000);invalidateApproval(p);p.revisionNotes=[...(p.revisionNotes||[]),{text:note,at:humanTime()}].slice(-20);p.status='revisione';p.stage='Revisione richiesta';p.runId=null;p.leaseUntil=null;p.progress=0;p.queuedAt=now();log(s,p,'Revisione richiesta: '+note);break;
 }
 case 'checkpoint':{
  if(!p||['pausa','annullato','completato','approvazione','pronto','pubblicato'].includes(p.status)||p.engine==='guided'&&p.status==='lavorazione'||p.background&&p.status==='lavorazione')throw new Error('Progetto in pausa, concluso oppure occupato.');
  invalidateApproval(p);p.background=false;p.runId=null;p.leaseUntil=null;p.engine='chatgpt';p.status='lavorazione';
  if(!Number.isFinite(c.progress)||c.progress<0||c.progress>95)throw new Error('Avanzamento non valido.');
  p.progress=c.progress;p.stage=text(c.stage,160);p.checkpoint=text(c.content,60000);
  p.resume=checkpointOf(c.details,p);
  p.checkpoints=[...(p.checkpoints||[]),{stage:p.stage,content:p.checkpoint,details:p.resume||null,at:now()}].slice(-12);log(s,p,'Checkpoint ChatGPT: '+p.stage);break;
 }
 case 'save_artifact':{
  if(!p||['annullato','pausa','pubblicato'].includes(p.status)||p.engine==='guided'&&p.status==='lavorazione'||p.background&&p.status==='lavorazione')throw new Error('Progetto in pausa, annullato o occupato.');
  const artifact={id:id(),title:text(c.title,160),content:text(c.content,60000),source:c.source==='chatgpt'?'chatgpt':'user',at:now(),format:'markdown'};
  if(c.delivery)artifact.delivery=deliveryOf(c.delivery);
  invalidateApproval(p);p.runId=null;p.leaseUntil=null;p.background=false;p.artifacts=[artifact,...p.artifacts].slice(0,10);p.status='approvazione';p.progress=artifact.delivery?.verified?100:95;p.stage=artifact.delivery?.verified?'Consegna da revisionare':'Bozza da revisionare — collaudo incompleto';p.engine=c.source==='chatgpt'?'chatgpt':'manual';log(s,p,'Nuova versione salvata; approvazioni precedenti revocate.');result={projectId:p.id,artifactId:artifact.id};break;
 }
 case 'authorize_publication':{
  if(!p)throw new Error('Progetto richiesto.');publicationGrant(p,c);log(s,p,'Autorizzata la pubblicazione della versione '+c.versionId+' su '+p.publication.destination);break;
 }
 case 'revoke_publication':{
  if(!p||p.status!=='pronto')throw new Error('Nessuna pubblicazione autorizzata.');delete p.publication;p.status='completato';p.stage='Autorizzazione alla pubblicazione revocata';log(s,p,p.stage);break;
 }
 case 'record_publication':{
  const grant=publicationPreflight(p,c);
  if(!verification||verification.grantId!==grant.grantId||c.commit!==grant.commit)throw new Error('La versione o l’autorizzazione è cambiata durante il controllo.');
  p.publication={...p.publication,state:'published',receipt:text(c.receipt,1000),verification};p.status='pubblicato';p.stage='Pubblicazione verificata';log(s,p,'Pubblicazione della versione '+c.versionId+' verificata.');result={publication:p.publication};break;
 }
 case 'reset_all_projects':{result=resetProjects(s,c,revision);s.requestRecords=[];break;}
 case 'save_memory':{const kind=member(c.kind,['Metodo','Istruzione','Decisione']);const val=text(c.text,3000);const m=s.memories.find(x=>x.id===c.memoryId);if(m){m.text=val;m.kind=kind;m.at=humanTime();}else{if(s.memories.length>=200)throw new Error('Troppe note.');s.memories.unshift({id:id(),kind,text:val,at:humanTime()});}log(s,null,'Memoria aggiornata: '+val.slice(0,100));break;}
case 'delete_memory':{if(!s.memories.some(x=>x.id===c.memoryId))throw new Error('Nota non trovata.');s.memories=s.memories.filter(x=>x.id!==c.memoryId);log(s,null,'Nota rimossa dalla memoria di Clara.');break;}
case 'save_event':{const title=text(c.title,120);if(!/^\d{4}-\d{2}-\d{2}$/.test(c.date)||!/^\d{2}:\d{2}$/.test(c.time)||Number(c.time.slice(0,2))>23||Number(c.time.slice(3))>59||isNaN(Date.parse(c.date+'T12:00:00Z'))||new Date(c.date+'T12:00:00Z').toISOString().slice(0,10)!==c.date)throw new Error('Data o ora non valida.');const cls=member(c.cls,[...CLASSES,'Tutte']);const old=s.events.find(x=>x.id===c.eventId);if(old)Object.assign(old,{title,date:c.date,time:c.time,cls});else{if(s.events.length>=200)throw new Error('Troppe scadenze.');s.events.push({id:id(),title,date:c.date,time:c.time,cls});}log(s,null,'Scadenza salvata: '+title);break;}
case 'delete_event':{if(!s.events.some(x=>x.id===c.eventId))throw new Error('Scadenza non trovata.');s.events=s.events.filter(x=>x.id!==c.eventId);log(s,null,'Scadenza rimossa.');break;}
case 'star':{const key=text(c.resourceId,100);if(s.stars.includes(key))s.stars=s.stars.filter(x=>x!==key);else if(s.stars.length<500)s.stars.push(key);break;}
case 'reset':throw new Error('Il reset generale è disabilitato. Usa reset_all_projects per conservare note e scadenze.');
default:throw new Error('Operazione sconosciuta.');
}
if(p)p.updatedAt=now();if(c.requestId){s.requests=[...s.requests,c.requestId].slice(-120);s.requestRecords=[...s.requestRecords,{id:c.requestId,fingerprint,result:structuredClone(result)}].slice(-120);}return result;}
