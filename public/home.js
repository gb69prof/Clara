'use strict';
(() => {
const el=id=>document.getElementById(id);
const form=el('composer'),input=el('request'),voice=el('voice'),play=el('play-reply');
const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
const synth=window.speechSynthesis;
const appUrl='https://chatgpt.com/plugins/plugin_asdk_app_sites_99fcca34b9f48191be97bb7752c0ac6a/app/clara_open';
let current=null,busy=false,listening=false,recognition=null,poll=0,deadline=0,version=0,speechTicket=0,utterance=null,speaking=false,voiceWatch=0,micWatch=0;
let lastSubmitted='';
function status(text,error=false){el('status').textContent=text;el('status').dataset.error=String(error);}
function controls(){
 el('send').disabled=busy||listening;voice.disabled=busy;input.readOnly=busy||listening;
 form.setAttribute('aria-busy',String(busy));voice.setAttribute('aria-pressed',String(listening));
 el('voice-title').textContent=listening?'Ti ascolto…':'Parla con Clara';
 el('voice-help').textContent=listening?'Tocca per terminare e inviare.':Recognition&&window.isSecureContext?'Tocca per parlare. Clara ti risponde a voce.':'Puoi usare il microfono della tastiera o scrivere.';
 el('send').querySelector('span').textContent=busy?'Attendi…':'Invia';
}
function stopAudio(){speechTicket++;clearTimeout(voiceWatch);synth?.cancel();utterance=null;speaking=false;play.textContent='Ascolta risposta';}
function speak(text){
 stopAudio();
 if(!synth||!window.SpeechSynthesisUtterance){status('La voce non è disponibile. Puoi leggere la risposta qui sotto.');return;}
 const ticket=speechTicket,u=new SpeechSynthesisUtterance(text);utterance=u;u.lang='it-IT';u.rate=.98;
 u.voice=synth.getVoices().find(v=>v.lang.startsWith('it'))||null;speaking=true;play.textContent='Interrompi voce';
 u.onstart=()=>{if(ticket===speechTicket)clearTimeout(voiceWatch);};
 u.onend=()=>{if(ticket!==speechTicket)return;clearTimeout(voiceWatch);utterance=null;speaking=false;play.textContent='Ascolta risposta';};
 u.onerror=()=>{if(ticket!==speechTicket)return;stopAudio();status('Tocca «Ascolta risposta» per avviare la lettura.');};
 voiceWatch=setTimeout(()=>{if(ticket===speechTicket){stopAudio();status('La risposta è pronta. Tocca «Ascolta risposta» per sentirla.');}},8000);
 try{synth.speak(u);}catch{stopAudio();status('Il dispositivo non ha avviato la voce. Puoi leggere la risposta.');}
}
function showReply(chat,autoplay=true){
 current=chat;busy=false;clearTimeout(poll);el('reply-text').textContent=chat.reply;el('reply-title').textContent='Clara';el('reply').hidden=false;play.hidden=!synth;
 el('check-reply').hidden=true;el('retry-chat').hidden=true;el('new-chat').hidden=false;controls();status('La risposta di Clara è pronta.');
 if(autoplay&&chat.responseMode==='voice'&&!document.hidden&&document.body.classList.contains('home-mode'))speak(chat.reply);
}
function chatPrompt(chat){return `Rispondi come Clara alla richiesta che ho appena inviato dalla sua home. Identificativo requestId: ${chat.id}. Leggi prima lo scambio con clara_chat_read; rispondi alla domanda qui sotto e consegna la risposta effettiva con clara_chat_reply usando lo stesso requestId, così posso leggerla nella home${chat.responseMode==='voice'?' e ascoltarla con la voce del dispositivo':''}. Non usare risposte dimostrative. Non dichiarare attività completate senza averle eseguite; lascia le bozze soggette alla mia revisione. Il salvataggio di questa risposta non autorizza azioni esterne ulteriori.\n\nLa mia richiesta:\n${chat.question}`;}
function schedule(ticket){clearTimeout(poll);poll=setTimeout(()=>check(ticket),2500);}
async function check(ticket=version,manual=false){
 if(!current||ticket!==version)return;
 if(document.hidden&&!manual){schedule(ticket);return;}
 try{
   const {chat}=await ClaraTransport.chatRead(current.id);
   if(ticket!==version)return;
   if(chat.status==='answered'){showReply(chat);return;}
   if(Date.now()>deadline){busy=false;controls();status('La risposta non è ancora arrivata. Controlla la conversazione di ChatGPT, poi tocca «Controlla risposta».');el('check-reply').hidden=false;return;}
   schedule(ticket);
 }catch(e){if(ticket!==version)return;busy=false;controls();status(e.message||'Non riesco a recuperare la risposta.',true);el('check-reply').hidden=false;}
}
async function deliver(chat){
 const ticket=++version;current=chat;busy=true;controls();el('retry-chat').hidden=true;el('new-chat').hidden=false;
 try{
  // A retry first checks for an already delivered answer; never overwrite it.
  const fresh=await ClaraTransport.chatRead(chat.id);if(ticket!==version)return;
  if(fresh.chat.status==='answered'){showReply(fresh.chat);return;}
  await ClaraTransport.message(chatPrompt(chat));if(ticket!==version)return;
  deadline=Date.now()+180000;status('Richiesta inviata a ChatGPT. La risposta comparirà qui.');schedule(ticket);
 }catch(e){if(ticket!==version)return;busy=false;controls();status(e.message||'Messaggio non inviato. Puoi riprovare.',true);el('retry-chat').hidden=false;el('check-reply').hidden=false;}
}
async function submit(message,mode){
 if(busy||listening)return;
 const text=message.trim();if(!text||text.length>4000){status('Scrivi una richiesta da 1 a 4000 caratteri.',true);input.focus();return;}
 stopAudio();busy=true;controls();el('reply').hidden=true;el('check-reply').hidden=true;el('retry-chat').hidden=true;
 const ticket=++version;clearTimeout(poll);status('Preparo la richiesta…');
 try{
  const {chat}=await ClaraTransport.chatCreate({requestId:crypto.randomUUID(),message:text,responseMode:mode});
  if(ticket!==version)return;current=chat;lastSubmitted=text;
  if(!ClaraTransport.embedded){
   status('Apro Clara in ChatGPT con la tua richiesta pronta da inviare.');
   location.assign(appUrl+'?path='+encodeURIComponent('/?chat='+chat.id));return;
  }
  await deliver(chat);
 }catch(e){if(ticket!==version)return;busy=false;controls();status(e.message||'Non riesco a inviare la richiesta. Riprova.',true);}
}
form.addEventListener('submit',e=>{e.preventDefault();submit(input.value,new FormData(form).get('responseMode'));});
input.addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)&&!e.isComposing){e.preventDefault();form.requestSubmit();}});
form.addEventListener('change',()=>{if(new FormData(form).get('responseMode')==='text')stopAudio();});
play.addEventListener('click',()=>speaking?stopAudio():current?.reply&&speak(current.reply));
el('check-reply').addEventListener('click',()=>{deadline=Date.now()+180000;busy=true;controls();status('Controllo la risposta…');check(version,true);});
el('retry-chat').addEventListener('click',()=>current&&deliver(current));
el('new-chat').addEventListener('click',()=>{version++;clearTimeout(poll);stopAudio();current=null;busy=false;input.value='';lastSubmitted='';el('reply').hidden=true;el('check-reply').hidden=true;el('retry-chat').hidden=true;el('new-chat').hidden=true;controls();status('');input.focus();});
function stopMic(){const r=recognition;recognition=null;clearTimeout(micWatch);r?.abort();listening=false;controls();}
voice.addEventListener('click',()=>{
 if(busy)return;
 if(listening){recognition?.stop();return;}
 if(!Recognition||!window.isSecureContext){status('La dettatura non è disponibile qui. Usa il microfono della tastiera oppure scrivi.');input.focus();return;}
 stopAudio();let session,transcript='',failed=false;
 try{session=new Recognition();}catch{status('Il microfono non è disponibile. Puoi scrivere.',true);return;}
 recognition=session;session.lang='it-IT';session.continuous=false;session.interimResults=false;
 session.onresult=e=>{if(recognition!==session)return;transcript=Array.from(e.results).filter(r=>r.isFinal).map(r=>r[0].transcript).join(' ').trim();};
 session.onerror=e=>{if(recognition!==session)return;failed=true;status(['not-allowed','service-not-allowed'].includes(e.error)?'Microfono non autorizzato. Puoi scrivere o usare la dettatura della tastiera.':e.error==='no-speech'?'Non ho sentito parole. Riprova oppure scrivi.':'La dettatura si è interrotta. Puoi riprovare o scrivere.',true);};
 session.onend=()=>{
  if(recognition!==session)return;clearTimeout(micWatch);recognition=null;listening=false;controls();
  if(failed)return;
  if(!transcript){status('Non ho sentito parole. Puoi riprovare.');return;}
  // Keep an unsent written draft; don't resend a previously submitted question.
  const draft=input.value.trim()===lastSubmitted?'':input.value.trim();input.value=[draft,transcript].filter(Boolean).join('\n');submit(input.value,'voice');
 };
 try{session.start();listening=true;controls();status('Ti ascolto. Dopo una pausa invierò la tua richiesta.');micWatch=setTimeout(()=>session.stop(),25000);}
 catch{recognition=null;listening=false;controls();status('Non riesco ad avviare il microfono. Puoi scrivere.',true);}
});
async function loadDraft(id){
 if(current?.id===id)return;
 try{const {chat}=await ClaraTransport.chatRead(id);current=chat;input.value=chat.question;form.querySelector(`input[value="${chat.responseMode}"]`).checked=true;el('new-chat').hidden=false;
  if(chat.status==='answered')showReply(chat,false);else{el('retry-chat').hidden=false;el('retry-chat').textContent='Invia a ChatGPT';status('La tua richiesta è pronta. Tocca «Invia a ChatGPT» per iniziare.');}
 }catch(e){status(e.message,true);}
}
window.addEventListener('clara:chat',e=>loadDraft(e.detail));
window.addEventListener('hashchange',()=>{stopMic();stopAudio();});
window.addEventListener('pagehide',()=>{version++;clearTimeout(poll);stopMic();stopAudio();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopMic();stopAudio();}else if(current?.status==='waiting'&&busy)check(version,true);});
// Secondary pages' old voice button now returns to the real conversation home.
if(!ClaraTransport.embedded)el('preview-note').textContent='Il dialogo si apre in ChatGPT · La richiesta ti segue, poi premi Invia';
if(window.ClaraPendingChat)loadDraft(window.ClaraPendingChat);
else {const id=new URL(location.href).searchParams.get('chat');if(id&&/^[a-f\d-]{36}$/.test(id))loadDraft(id);}
controls();
})();
