import {mutate,readState} from './clara-store.mjs';

// Same owner-only workspace and CAS rules as the existing project archive.
// No model API, credentials or demo answers live in this service.
const TTL=24*60*60*1000;
const validId=id=>typeof id==='string'&&/^[a-f\d-]{36}$/.test(id);
const clean=(value,max)=>{
  if(typeof value!=='string'||!value.trim()||value.length>max)throw new Error('Testo mancante o troppo lungo.');
  return value.trim();
};
function find(state,id){
  if(!validId(id))throw new Error('Richiesta non valida.');
  const item=(state.dialogues||[]).find(item=>item.id===id&&item.createdAt>Date.now()-TTL);
  if(!item)throw new Error('Richiesta scaduta o non trovata. Invia una nuova richiesta.');
  return item;
}
export async function createChat(db,{requestId,message,responseMode}){
  if(!validId(requestId))throw new Error('Identificativo non valido.');
  const question=clean(message,4000);
  if(!['voice','text'].includes(responseMode))throw new Error('Modalità non valida.');
  const result=await mutate(db,state=>{
    const existing=(state.dialogues||[]).find(item=>item.id===requestId);
    if(existing){
      if(existing.question!==question||existing.responseMode!==responseMode)throw new Error('Identificativo già usato per un’altra richiesta.');
      find(state,requestId);
      return {replayed:true,chat:existing};
    }
    const chat={id:requestId,question,responseMode,createdAt:Date.now(),status:'waiting',reply:''};
    state.dialogues=[chat,...(state.dialogues||[]).filter(item=>item.createdAt>Date.now()-TTL)].slice(0,10);
    return {chat};
  });
  return result.chat;
}
export async function readChat(db,requestId){return find((await readState(db)).state,requestId);}
export async function replyChat(db,{requestId,reply}){
  const answer=clean(reply,20000);
  const result=await mutate(db,state=>{
    const chat=find(state,requestId);
    if(chat.status==='answered'){
      if(chat.reply!==answer)throw new Error('Risposta già consegnata. Non sovrascrivere uno scambio completato.');
      return {replayed:true,chat};
    }
    chat.reply=answer;chat.status='answered';chat.answeredAt=Date.now();
    return {chat};
  });
  return result.chat;
}
