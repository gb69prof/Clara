'use strict';
// The original portrait stays byte-for-byte intact. Animation is drawn at runtime.
// Browser speech events drive illustrative mouth motion, not phoneme-accurate lip sync.
(()=>{
const dlg=document.getElementById('voiceDialog');
const el=id=>document.getElementById(id);
const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
const synth=window.speechSynthesis;
const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;
let mode='idle',session=0,recognition=null,utterance=null,raf=0,imageReady=false,canvasReady=false,lastFrame=0,boundaryAt=0,mouth=0,openedAt=0,voiceWatch=0,micWatch=0,returnFocus=null;
const portrait=new Image();
const frame=el('portraitFrame'),canvas=el('portraitCanvas'),fallback=el('portraitFallback');
let ctx=null;
try{ctx=canvas.getContext('2d');}catch{}
let availableVoices=[];
const greeting=claraIntroduction();
let reply=greeting;
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
const moving=()=>el('motionEnabled').checked&&!reduced;
el('motionEnabled').checked=!reduced;if(reduced){el('motionEnabled').disabled=true;el('motionEnabled').title='Movimenti disattivati dalle impostazioni del dispositivo';}
el('speakDemo').innerHTML=icon('play')+' Ascolta Clara';
el('micDemo').innerHTML=icon('mic')+' Usa il microfono';
el('stopVoice').innerHTML=icon('x')+' Interrompi';
function setMode(next,message){mode=next;el('voiceStatus').textContent=message||({idle:'Clara è qui',preparing:'La voce si prepara…',speaking:'Clara sta parlando',listening:'Clara ti ascolta',error:'La prova vocale è in attesa'}[next]);el('voiceLight').className=['speaking','listening','error'].includes(next)?next:'';el('voiceWave').classList.toggle('active',next==='speaking'||next==='listening');frame.classList.toggle('is-moving',moving()&&dlg.open);frame.classList.toggle('is-speaking',moving()&&next==='speaking');el('speakDemo').disabled=!synth||!window.SpeechSynthesisUtterance||next==='preparing'||next==='speaking'||next==='listening';el('micDemo').disabled=!SpeechRecognition;el('stopVoice').hidden=next==='idle'||next==='error';el('micDemo').innerHTML=icon('mic')+(next==='listening'?' Termina l’ascolto':' Usa il microfono');}
function voices(){if(!synth)return;try{availableVoices=synth.getVoices().filter(v=>/^it(?:-|_)/i.test(v.lang));}catch{availableVoices=[];}const select=el('voiceChoice'),old=select.value;select.innerHTML='<option value="">Italiano · scelta automatica</option>'+availableVoices.map(v=>`<option value="${esc(v.voiceURI)}">${esc(v.name)}</option>`).join('');if(availableVoices.some(v=>v.voiceURI===old))select.value=old;}
function drawPortrait(openness=0){if(!imageReady||!ctx)return;const w=portrait.naturalWidth,h=portrait.naturalHeight;if(!w||!h)return;const scale=canvas.width/w;ctx.setTransform(scale,0,0,canvas.height/h,0,0);ctx.clearRect(0,0,w,h);ctx.drawImage(portrait,0,0,w,h);const open=clamp(openness,0,1);if(open<.025)return;
// The mouth anchors are specific to the user's 1024-square portrait.
// A smooth column field moves the actual lip pixels away from the smile seam.
const sx=w/1024,sy=h/1024,left=451,right=625,top=547,bottom=631,stride=3;
for(let x=left;x<right;x+=stride){const col=Math.min(stride,right-x),u=((x+col/2)-left)/(right-left),falloff=Math.pow(Math.sin(Math.PI*u),1.3),seam=568+12*Math.sin(Math.PI*u),gap=14*open*falloff,upperEnd=seam-gap*.28,lowerStart=seam+gap*.72;
ctx.fillStyle='#51252e';ctx.fillRect(x*sx,upperEnd*sy,col*sx+.25,(gap+1)*sy);
if(gap>5&&u>.19&&u<.82){ctx.fillStyle='#e9d8c9';ctx.fillRect(x*sx,(upperEnd+.6)*sy,col*sx+.15,Math.min(2.4,gap*.24)*sy);}
ctx.drawImage(portrait,x*sx,top*sy,col*sx,(seam-top)*sy,x*sx,top*sy,col*sx,(upperEnd-top)*sy);
ctx.drawImage(portrait,x*sx,seam*sy,col*sx,(bottom-seam)*sy,x*sx,lowerStart*sy,col*sx,(bottom-lowerStart)*sy);
}
}
function animate(ts){if(!dlg.open){raf=0;return;}if(!document.hidden&&ts-lastFrame>=40){lastFrame=ts;let target=0;if(mode==='speaking'&&moving()){const t=(ts-openedAt)/1000,wordPulse=Math.exp(-Math.max(0,ts-boundaryAt)/260),rhythm=.5+.5*Math.sin(t*17.7),slower=.78+.22*Math.sin(t*5.1);target=(.12+.63*rhythm)*slower+wordPulse*.14;}mouth+=(target-mouth)*.55;drawPortrait(mouth);}raf=requestAnimationFrame(animate);}
portrait.onload=()=>{imageReady=true;if(ctx){try{drawPortrait(0);canvas.hidden=false;fallback.hidden=true;canvasReady=true;}catch{canvas.hidden=true;fallback.hidden=false;}}};
portrait.onerror=()=>{canvas.hidden=true;fallback.hidden=false;};portrait.src='assets/clara.webp';
function stop(message){session++;clearTimeout(voiceWatch);clearTimeout(micWatch);const r=recognition;recognition=null;utterance=null;try{r?.abort();}catch{}try{synth?.cancel();}catch{}mouth=0;drawPortrait(0);setMode('idle',message);}
function open(){returnFocus=document.activeElement;if(document.querySelector('#modal')?.open)document.querySelector('#modal').close();if(!dlg.open)dlg.showModal();openedAt=performance.now();setMode('idle');voices();if(!SpeechRecognition){el('micDemo').disabled=true;el('voiceHint').textContent='La dettatura non è disponibile in questo browser. Puoi scrivere e provare la risposta vocale.';}else el('micDemo').disabled=false;if(!synth||!window.SpeechSynthesisUtterance){el('speakDemo').disabled=true;el('voiceHint').textContent='La voce del dispositivo non è disponibile. La vista e il messaggio restano consultabili.';}if(!raf)raf=requestAnimationFrame(animate);}
function close(){stop();if(raf){cancelAnimationFrame(raf);raf=0;}frame.classList.remove('is-moving','is-speaking');if(dlg.open)dlg.close();}
function speak(text=reply){stop();reply=text;el('voiceReply').textContent=reply;if(!synth||!window.SpeechSynthesisUtterance){setMode('error','Voce non disponibile');el('voiceHint').textContent='Questo browser non espone la lettura vocale. Puoi leggere la risposta qui.';return;}const ticket=session;const u=new SpeechSynthesisUtterance(text);utterance=u;u.lang='it-IT';u.rate=.94;u.pitch=1;voices();const selected=el('voiceChoice').value;u.voice=availableVoices.find(v=>v.voiceURI===selected)||availableVoices.find(v=>/Alice|Elsa|Federica|Paola|Lucia|Isabella/i.test(v.name))||availableVoices.find(v=>v.default)||availableVoices[0]||null;
setMode('preparing');el('voiceHint').textContent='Voce del dispositivo · risposta di esempio · animazione delle labbra illustrativa.';
u.onstart=()=>{if(ticket!==session||!dlg.open)return;clearTimeout(voiceWatch);openedAt=performance.now();boundaryAt=openedAt;setMode('speaking');};
u.onboundary=()=>{if(ticket===session)boundaryAt=performance.now();};
u.onend=()=>{if(ticket!==session)return;clearTimeout(voiceWatch);utterance=null;mouth=0;drawPortrait(0);setMode('idle','Ho finito. Da dove ripartiamo?');};
u.onerror=e=>{if(ticket!==session)return;clearTimeout(voiceWatch);utterance=null;mouth=0;drawPortrait(0);setMode('error','La voce non è partita');el('voiceHint').textContent=e.error==='not-allowed'?'Tocca di nuovo «Ascolta Clara» per consentire la riproduzione.':'Il sistema vocale non è disponibile in questo momento. Prova di nuovo «Ascolta Clara».';};
voiceWatch=setTimeout(()=>{if(ticket===session&&mode==='preparing'){stop('Tocca «Ascolta Clara» per riprovare');el('voiceHint').textContent='Il browser non ha avviato la voce. Controlla il volume e riprova con il pulsante.';}},8000);
try{synth.speak(u);}catch{stop('Voce non disponibile');el('voiceHint').textContent='Il dispositivo non ha avviato la lettura. Puoi consultare il testo.';}
}
function demoAnswer(text){const t=text.toLowerCase();if(/cosa.*(?:sai|puoi|fai)|che cosa|funzion|capacit|presentati|aiutarmi/.test(t))return claraIntroduction();if(/laborator|civilt|fium/.test(t))return 'Partiamo da una domanda che abbia senso per i ragazzi. Nella demo possiamo immaginare un laboratorio in tre momenti: osservare, scegliere e spiegare. Per conservarne l’idea, torna alla scrivania e crea un incarico nella sezione Progetti. Questa è una risposta di esempio; il motore didattico non è ancora collegato.';if(/pirandell|identit|sguard/.test(t))return 'Possiamo partire da una stessa persona descritta da punti di vista differenti. Nella demo troverai un’anteprima del percorso su identità e sguardi. La domanda può diventare prima un confronto e poi una composizione visiva. È un esempio predefinito, da sviluppare quando collegheremo il motore didattico.';if(/orari|calendar|scadenz/.test(t))return 'Nella sezione Scuola e calendario puoi provare ad aggiungere una scadenza. Ricorda che l’orario mostrato è inventato e non è il tuo calendario ufficiale. Il collegamento al calendario reale sarà un passaggio successivo.';return 'Ho ricevuto la tua idea, Gianfranco. Possiamo partire dalla domanda da portare in classe e dal risultato che vuoi ottenere. Per provare il flusso, crea un incarico dalla scrivania. Questa risposta è predefinita: stiamo provando il volto, la voce e il dialogo, prima di collegare l’intelligenza di Clara.';}
function respond(text){const clean=text.trim().slice(0,1000);if(!clean){el('voiceHint').textContent='Scrivi un messaggio oppure usa il microfono.';return;}el('yourWords').hidden=false;el('recognizedText').textContent=clean;el('voiceMessageLabel').textContent='CLARA · RISPOSTA PREDEFINITA';reply=demoAnswer(clean);el('voiceReply').textContent=reply;speak(reply);}
function microphone(){if(recognition&&mode==='listening'){try{recognition.stop();}catch{stop();}return;}stop();if(!SpeechRecognition){setMode('error','Dettatura non disponibile');el('voiceHint').textContent='Puoi scrivere il tuo messaggio nel pannello qui sotto.';return;}const ticket=session;let r;try{r=new SpeechRecognition();}catch{setMode('error','Dettatura non disponibile');return;}recognition=r;r.lang='it-IT';r.continuous=false;r.interimResults=true;let finalText='',failed=false;
r.onstart=()=>{if(ticket!==session||recognition!==r)return;setMode('listening');el('voiceHint').textContent='Parla ora. La dettatura usa il servizio vocale del browser; non viene salvata da Clara.';};
r.onresult=e=>{if(ticket!==session||recognition!==r)return;let interim='';finalText='';for(let i=0;i<e.results.length;i++){if(e.results[i].isFinal)finalText+=e.results[i][0].transcript+' ';else interim+=e.results[i][0].transcript+' ';}el('yourWords').hidden=false;el('recognizedText').textContent=(finalText+interim).trim();};
r.onerror=e=>{if(ticket!==session||recognition!==r)return;failed=true;clearTimeout(micWatch);setMode('error',e.error==='not-allowed'?'Microfono non autorizzato':'Dettatura non disponibile');el('voiceHint').textContent=['not-allowed','service-not-allowed'].includes(e.error)?'Il browser non ha consentito l’accesso. Puoi scrivere il messaggio e ascoltare la risposta di esempio.':e.error==='no-speech'?'Non ho ricevuto parole. Puoi riprovare oppure scrivere.':'Il servizio vocale non ha completato la dettatura. Puoi scrivere il messaggio.';};
r.onend=()=>{if(ticket!==session||recognition!==r)return;clearTimeout(micWatch);recognition=null;if(failed)return;if(finalText.trim())respond(finalText);else{setMode('idle','Non ho ricevuto parole');el('voiceHint').textContent='Puoi riprovare con il microfono o scrivere nel pannello qui sotto.';}};
setMode('preparing','Attendo il microfono…');el('voiceHint').textContent='Se richiesto, consenti al browser di usare il microfono. Puoi interrompere in qualsiasi momento.';
micWatch=setTimeout(()=>{if(ticket===session&&recognition===r){try{r.stop();}catch{stop('Ascolto terminato');}}},20000);
try{r.start();}catch{recognition=null;clearTimeout(micWatch);setMode('error','Microfono non disponibile');el('voiceHint').textContent='Il browser non ha avviato la dettatura. Puoi scrivere il messaggio.';}
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-voice]');if(!b)return;const a=b.dataset.voice;if(a==='open')open();else if(a==='introduce'){open();el('voiceMessageLabel').textContent='CLARA · PRESENTAZIONE DELLE FUNZIONI';speak(greeting);}else if(a==='close'){e.preventDefault();close();}else if(a==='speak')speak();else if(a==='mic')microphone();else if(a==='stop')stop('Prova interrotta');else if(a==='text')respond(el('voiceText').value);});
el('motionEnabled').addEventListener('change',()=>{setMode(mode,el('voiceStatus').textContent);if(!moving()){mouth=0;drawPortrait(0);}});
dlg.addEventListener('cancel',e=>{e.preventDefault();close();});dlg.addEventListener('close',()=>{stop();if(raf){cancelAnimationFrame(raf);raf=0;}frame.classList.remove('is-moving','is-speaking');if(returnFocus?.isConnected)returnFocus.focus();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&dlg.open)stop('Prova interrotta: la pagina non è più in primo piano');});window.addEventListener('pagehide',()=>stop());
try{synth?.addEventListener('voiceschanged',voices);}catch{}voices();
})();
