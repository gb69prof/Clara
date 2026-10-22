'use strict';
(() => {
  const el=id=>document.getElementById(id), form=el('composer'), input=el('request'), voice=el('voice');
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  let caps=ClaraTransport.capabilities(), busy=false, uncertain=false, recognition=null, micTimer=0;
  const sent=[];
  function status(text, bad=false) {el('status').textContent=text; el('status').dataset.error=String(bad);}
  function micAvailable() {
    const policy=document.permissionsPolicy||document.featurePolicy;
    return !!Recognition && !!window.isSecureContext && caps.microphone && (!policy?.allowsFeature || policy.allowsFeature('microphone'));
  }
  function controls() {
    const listening=!!recognition;
    el('send').disabled=busy||listening||uncertain||!caps.canMessage;
    el('send').querySelector('span').textContent=busy?'Invio…':'Invia a ChatGPT';
    input.readOnly=busy||listening; form.setAttribute('aria-busy',String(busy));
    voice.disabled=busy||!micAvailable(); voice.setAttribute('aria-pressed',String(listening));
    el('voice-title').textContent=listening?'Ti ascolto…':'Detta il messaggio';
    el('voice-help').textContent=listening?'Tocca per terminare la dettatura.':micAvailable()?'Controlla il testo, poi invialo a ChatGPT.':'Dettatura non disponibile qui. Usa la tastiera o il suo microfono.';
    el('confirm-checked').hidden=!uncertain;
  }
  function connection(next) {
    caps=next;
    el('connection-status').textContent=caps.canMessage
      ? 'Collegata a ChatGPT · la risposta apparirà nella conversazione'
      : caps.embedded
        ? 'Collegamento alla conversazione non disponibile. Puoi copiare il messaggio nella chat.'
        : 'Questo è il sito di Clara. Per dialogare, apri Clara dentro la conversazione ChatGPT.';
    el('standalone-help').hidden=caps.canMessage;
    controls();
  }
  function renderSent() {
    el('sent-messages').replaceChildren();
    for(const message of sent) {
      const item=document.createElement('li'), label=document.createElement('strong'), text=document.createElement('p');
      label.textContent='Tu · inviato a ChatGPT'; text.textContent=message;
      item.append(label,text); el('sent-messages').append(item);
    }
    el('conversation').hidden=!sent.length;
  }
  form.addEventListener('submit', async event=>{
    event.preventDefault();
    if(busy||recognition||uncertain)return;
    const text=input.value.trim();
    if(!text||text.length>4000){status('Scrivi una richiesta da 1 a 4000 caratteri.',true);input.focus();return;}
    if(!caps.canMessage){status('Copia il testo nella conversazione ChatGPT che vuoi continuare.',true);return;}
    busy=true;controls();status('Invio alla conversazione…');
    try {
      await ClaraTransport.message(text);
      sent.push(text); if(sent.length>20)sent.shift(); renderSent(); input.value='';
      status('Messaggio accettato da ChatGPT. Leggi la risposta nella conversazione e continua lì oppure scrivi qui.');
    } catch(error) {
      uncertain=error.code==='DELIVERY_UNKNOWN';
      status(error.message||'Invio non riuscito. Il tuo testo è rimasto qui.',true);
    } finally {busy=false;controls();}
  });
  input.addEventListener('keydown',event=>{
    if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)&&!event.isComposing){event.preventDefault();form.requestSubmit();}
  });
  el('confirm-checked').addEventListener('click',()=>{uncertain=false;controls();status('Se il messaggio è già nella chat, cancella il testo qui. Altrimenti puoi riprovare.');});
  el('copy-message').addEventListener('click',async()=>{
    const text=input.value.trim();
    if(!text){status('Scrivi prima il messaggio da copiare.');input.focus();return;}
    try {await navigator.clipboard.writeText(text);status('Testo copiato. Incollalo nella conversazione ChatGPT che vuoi continuare.');}
    catch {input.focus();input.select();status('Testo selezionato: usa il comando Copia del dispositivo, poi incollalo in ChatGPT.');}
  });
  function stopMic() {const session=recognition;recognition=null;clearTimeout(micTimer);session?.abort();controls();}
  voice.addEventListener('click',()=>{
    if(busy||!micAvailable())return;
    if(recognition){recognition.stop();return;}
    let session;
    try {session=new Recognition();}catch {status('Il dispositivo non riesce ad avviare la dettatura.',true);return;}
    recognition=session;let transcript='',failed=false;const draft=input.value;
    session.lang='it-IT';session.continuous=false;session.interimResults=false;
    session.onresult=event=>{if(recognition===session)transcript=Array.from(event.results).filter(r=>r.isFinal).map(r=>r[0].transcript).join(' ').trim();};
    session.onerror=event=>{if(recognition!==session)return;failed=true;status(['not-allowed','service-not-allowed'].includes(event.error)?'Microfono non autorizzato. Puoi scrivere il messaggio.':'Dettatura non riuscita. Puoi riprovare oppure scrivere.',true);};
    session.onend=()=>{
      if(recognition!==session)return;recognition=null;clearTimeout(micTimer);controls();
      if(failed)return;
      if(transcript){input.value=[draft.trim(),transcript].filter(Boolean).join('\n').slice(0,4000);status('Dettatura completata. Controlla il testo prima di inviarlo.');input.focus();}
      else status('Non ho ricevuto parole. Puoi riprovare oppure scrivere.');
    };
    try {session.start();controls();status('Dettatura in corso. Il testo non verrà inviato automaticamente.');micTimer=setTimeout(()=>session.stop(),25000);}
    catch {recognition=null;controls();status('Non riesco ad avviare il microfono. Puoi scrivere.',true);}
  });
  async function readLegacy(id) {
    try {
      const {chat}=await ClaraTransport.chatRead(id);
      if(!input.value)input.value=chat.question;
      el('legacy-exchange').hidden=false;
      el('legacy-text').textContent=chat.reply||'Questa vecchia richiesta non ha una risposta salvata. Puoi inviarne il testo alla conversazione.';
    } catch {status('Il vecchio scambio non è più disponibile. Puoi iniziare dalla conversazione corrente.');}
  }
  window.addEventListener('clara:chat',event=>readLegacy(event.detail));
  window.addEventListener('clara:connection',event=>connection(event.detail));
  window.addEventListener('hashchange',stopMic);
  window.addEventListener('pagehide',stopMic);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopMic();});
  controls();
  ClaraTransport.ready().then(connection).catch(()=>connection(caps));
  const legacy=window.ClaraPendingChat||new URL(location.href).searchParams.get('chat');
  if(legacy&&/^[a-f\d-]{36}$/.test(legacy))readLegacy(legacy);
})();
