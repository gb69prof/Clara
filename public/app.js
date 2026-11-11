'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const transport = window.ClaraTransport;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const lines = value => String(value || '').split('\n').map(s => s.trim()).filter(Boolean);
  const labels = {nuovo:'Da affidare',coda:'In coda',lavorazione:'In lavorazione',approvazione:'Da rivedere',revisione:'Da revisionare',completato:'Approvato',pronto:'Pubblicazione autorizzata',pubblicato:'Pubblicato',pausa:'In pausa',annullato:'Annullato',errore:'Interrotto'};
  let snapshot = null, view = 'scrivania', selected = null, filter = 'tutti', busy = false, reachable = false;
  let chatDraft = '', deliveryUnknown = false, toastTimer, modalContext = null, pendingMessage = false;
  const projects = () => snapshot?.state.projects || [];
  const project = id => projects().find(p => p.id === id);
  const date = value => { const d = new Date(value); return Number.isFinite(d.valueOf()) ? d.toLocaleString('it-IT',{dateStyle:'medium',timeStyle:'short'}) : String(value || ''); };
  function button(action, label, id = '', extra = '') { return `<button class="button" data-action="${action}" data-id="${esc(id)}" ${extra}>${label}</button>`; }
  function badge(p) { return `<span class="pill ${['completato','pubblicato'].includes(p.status)?'green':['approvazione','pausa','errore'].includes(p.status)?'amber':'blue'}">${esc(labels[p.status] || p.status)}</span>`; }
  function toast(text, error = false) { clearTimeout(toastTimer); $('toast').textContent=text; $('toast').className=error?'error':''; $('toast').hidden=false; toastTimer=setTimeout(()=>$('toast').hidden=true,7000); }
  function accept(value) {
    if (!value?.state || !Number.isInteger(value.revision) || value.revision < (snapshot?.revision || 0)) return;
    const changed = !snapshot || snapshot.revision !== value.revision;
    snapshot=value; reachable=true; $('syncStatus').textContent='Archivio collegato';
    if(changed) render();
  }
  async function load() {
    try { accept(await transport.load()); }
    catch(e) { reachable=false; $('syncStatus').textContent='Collegamento interrotto'; if(!snapshot) $('main').innerHTML=`<div class="panel empty"><h1>Il tuo spazio non è ancora raggiungibile</h1><p>L’archivio richiede la versione privata pubblicata di Clara bis.</p>${button('refresh','Riprova')}</div>`; toast(e.message,true); }
  }
  async function command(payload) {
    if(busy) return null;
    if(!reachable) throw new Error('Aggiorna lo stato prima di modificare l’archivio.');
    busy=true;
    try { const result=await transport.command({...payload,requestId:crypto.randomUUID()}); accept(result); return result; }
    catch(e) { reachable=false; $('syncStatus').textContent='Verifica il collegamento'; throw e; }
    finally { busy=false; }
  }
  function navigate(next,id=null) { view=['scrivania','progetti','memoria'].includes(next)?next:'scrivania'; selected=id; location.hash=view; render(); }
  function card(p) {
    return `<article class="project-card"><div class="row"><span class="eyebrow">${esc(p.type)} · ${esc(p.cls)}</span>${badge(p)}</div><h3><button class="text-button" data-action="detail" data-id="${esc(p.id)}">${esc(p.title)}</button></h3><p>${esc(p.brief.slice(0,170))}${p.brief.length>170?'…':''}</p><div class="project-meta">${esc(p.stage)}</div><div class="progress" role="progressbar" aria-label="Avanzamento dichiarato" aria-valuenow="${Number(p.progress)||0}" aria-valuemin="0" aria-valuemax="100"><span style="width:${Math.max(0,Math.min(100,Number(p.progress)||0))}%"></span></div><div class="project-bottom"><small>${p.artifacts.length} versioni · ${esc(date(p.updatedAt))}</small>${button('detail','Apri progetto →',p.id)}</div></article>`;
  }
  function empty() { return `<div class="panel empty"><div class="empty-symbol" aria-hidden="true">+</div><h3>Il tuo prossimo progetto comincia qui.</h3><p>Un obiettivo, i materiali di partenza e il risultato che vuoi vedere.</p>${button('new','Crea il primo incarico')}</div>`; }
  function queueNotice() {
    const a=snapshot.state.agent;
    if(snapshot.capabilities?.localMode) return `<div class="queue-note"><span class="status-dot" aria-hidden="true"></span><div><strong>Clara bis sul tuo PC</strong><p>Puoi creare e conservare incarichi e note. Per realizzare un progetto, aprilo e scegli “Lavora nella conversazione”. La prosecuzione automatica non è ancora collegata.</p></div></div>`;
    return `<div class="queue-note"><span class="status-dot ${a?.enabled?'on':''}" aria-hidden="true"></span><div><strong>${a?.enabled?'Esecuzione programmata collegata':'Esecuzione programmata da attivare'}</strong><p>${a?.enabled?esc(a.cadence || 'Controlli periodici')+' · Ultimo controllo: '+esc(a.lastCheckedAt?date(a.lastCheckedAt):'non ancora registrato'):'Gli incarichi restano salvati. La prosecuzione automatica sarà disponibile dopo il collaudo online.'}</p></div></div>`;
  }
  function home() {
    const ps=projects(), active=ps.filter(p=>['coda','lavorazione','revisione'].includes(p.status)).length;
    return `<section class="hero"><div class="hero-copy"><span class="eyebrow">IL TUO SPAZIO DI LAVORO</span><h1>Un’idea chiara.<br>Un lavoro che continua.</h1><p>Con Libera metti a fuoco il progetto. Qui lo affidi a Clara, segui i passaggi e rivedi ciò che ha realizzato.</p><div class="actions">${button('new','+ Nuovo incarico')}${button('projects','Guarda i progetti →')}</div></div><div class="hero-portrait"><img src="assets/clara-reference.png" alt="Clara, la tua assistente di progetto"><div class="portrait-caption"><strong>Clara bis</strong><span>Una nuova partenza, insieme.</span></div></div></section>
    <section class="metrics" aria-label="Riepilogo"><div class="metric"><strong>${active}</strong><span>incarichi affidati</span></div><div class="metric"><strong>${ps.filter(p=>p.status==='approvazione').length}</strong><span>consegne da rivedere</span></div><div class="metric"><strong>${ps.filter(p=>['completato','pronto','pubblicato'].includes(p.status)).length}</strong><span>versioni approvate</span></div></section>
    ${queueNotice()}<div class="section-heading"><div><span class="eyebrow">DALL’IDEA AL RISULTATO</span><h2>I tuoi progetti</h2></div>${ps.length?button('projects','Vedi tutti →'):''}</div>${ps.length?`<div class="project-grid">${ps.slice(0,4).map(card).join('')}</div>`:empty()}
    <section class="steps"><div class="step"><span>01</span><h3>Un incarico preciso</h3><p>Obiettivo, fonti e criteri. Il contratto accompagna ogni progetto.</p></div><div class="step"><span>02</span><h3>Passaggi verificabili</h3><p>Risultati parziali e prossimo passo, conservati nell’archivio.</p></div><div class="step"><span>03</span><h3>L’ultima parola a te</h3><p>Rivedi una versione. Approvarla e pubblicarla sono due scelte distinte.</p></div></section>
    <section class="panel chat-panel"><span class="eyebrow">NELLA CONVERSAZIONE</span><h2>Mettiamo a fuoco il prossimo passo.</h2><p>Il messaggio continua la chat ChatGPT in cui hai aperto Clara.</p><form id="chatForm" class="composer"><label class="sr-only" for="chatText">Messaggio per ChatGPT</label><textarea id="chatText" name="message" maxlength="20000" placeholder="Da quale idea partiamo?">${esc(chatDraft)}</textarea><div class="composer-actions"><small id="chatHint"></small><button id="chatSend" class="button primary" type="submit">Invia alla conversazione ↗</button></div></form>${deliveryUnknown?button('check-delivery','Ho controllato la conversazione'):''}</section>`;
  }
  function listing() {
    const ps=projects().filter(p=>filter==='tutti'||p.status===filter);
    return `<div class="section-heading"><div><span class="eyebrow">IL LAVORO, PASSO DOPO PASSO</span><h1>Progetti</h1></div>${button('new','+ Nuovo incarico')}</div>${queueNotice()}<div class="filters" aria-label="Filtra progetti">${[['tutti','Tutti'],['nuovo','Da affidare'],['lavorazione','Al lavoro'],['approvazione','Da rivedere'],['completato','Approvati'],['pausa','In pausa']].map(([k,v])=>`<button data-filter="${k}" class="filter ${filter===k?'active':''}" aria-pressed="${filter===k}">${v}</button>`).join('')}</div>${ps.length?`<div class="project-grid">${ps.map(card).join('')}</div>`:projects().length?'<div class="panel empty">Nessun progetto in questo gruppo.</div>':empty()}${projects().length?`<div class="section admin-actions"><small>Gestisci questo archivio di Clara bis</small>${button('reset','Azzera gli incarichi')}</div>`:''}`;
  }
  function safeLink(url,label) { try { const u=new URL(url); if(u.protocol!=='https:'||u.username||u.password) return ''; return `<a class="button" href="${esc(u.href)}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`; } catch { return ''; } }
  function delivery(a) {
    const d=a.delivery;
    if(!d) return '<div class="notice">Bozza di testo: file, anteprima e collaudo non ancora registrati.</div>';
    return `<div class="deliverable"><div class="row"><strong>${d.verified?'Verifiche registrate superate':'Collaudo incompleto'}</strong><span class="pill">${esc(d.preview.version)}</span></div><p>Commit <code>${esc(d.commit)}</code></p><div class="actions">${safeLink(d.preview.url,'Apri anteprima Sites')}${safeLink(d.repository+'/tree/'+d.commit,'Sorgente e REPORT.md')}</div><ul class="list">${d.checks.map(c=>`<li><strong>${esc(c.name)} · ${esc({passed:'superata',failed:'fallita',not_run:'non eseguita'}[c.status])}</strong><p>${esc(c.evidence)}</p></li>`).join('')}</ul>${d.limitations.length?`<p><strong>Limiti dichiarati:</strong> ${esc(d.limitations.join(' · '))}</p>`:''}<details><summary>File della consegna (${d.files.length})</summary><ul class="list">${d.files.map(f=>`<li>${esc(f.path)}<br><code>${esc(f.sha256)}</code></li>`).join('')}</ul></details></div>`;
  }
  function detail(p) {
    const a=p.artifacts[0], c=p.contract, canEnqueue=['nuovo','revisione','errore','pausa'].includes(p.status);
    return `<div class="section-heading"><div>${button('projects','← Tutti i progetti')}<p class="eyebrow">${esc(p.type)} · ${esc(p.cls)}</p><h1>${esc(p.title)}</h1></div>${badge(p)}</div><div class="panel"><p class="detail-brief">${esc(p.brief)}</p><p><strong>${esc(p.stage)}</strong> · ${Number(p.progress)||0}%</p><div class="actions">${canEnqueue?button('enqueue','Affida a Clara',p.id,!snapshot.state.agent?.enabled?'disabled title="Esecuzione programmata da attivare"':''):''}${['nuovo','revisione','lavorazione','errore'].includes(p.status)&&!p.background?button('chat-project','Lavora nella conversazione',p.id):''}${['nuovo','coda','revisione','lavorazione'].includes(p.status)?button('pause','Metti in pausa',p.id):''}${p.background&&['pausa','errore'].includes(p.status)?button('resume','Riprendi',p.id,!snapshot.state.agent?.enabled?'disabled':''):''}${!['lavorazione','annullato','pubblicato'].includes(p.status)?button('edit','Modifica incarico',p.id):''}${!['annullato','pubblicato'].includes(p.status)?button('cancel-confirm','Annulla incarico',p.id):''}</div>${c?`<details class="section"><summary>Contratto del progetto</summary><h3>Obiettivo</h3><p>${esc(c.goal)}</p><h3>Ambito</h3><ul>${c.scope.map(x=>'<li>'+esc(x)+'</li>').join('')}</ul><h3>Fonti</h3><ul>${c.sources.map(x=>'<li>'+esc(x)+'</li>').join('')||'<li>Da individuare e documentare durante il lavoro.</li>'}</ul><h3>Criteri di accettazione</h3><ul>${c.acceptance.map(x=>'<li>'+esc(x)+'</li>').join('')}</ul><p>Consegna: ${esc(c.deliverable)} · ${esc(c.target)}</p><p>${esc(c.security)}</p></details>`:''}</div>
    ${p.resume?`<section class="panel section"><span class="eyebrow">IL PUNTO DA CUI RIPARTIRE</span><h2>${esc(p.resume.next_action)}</h2><p>${esc(p.checkpoint)}</p>${['verified','not_verified','blockers'].map((k,i)=>p.resume[k]?.length?`<h3>${['Verificato','Da verificare','Ostacoli'][i]}</h3><ul>${p.resume[k].map(x=>'<li>'+esc(x)+'</li>').join('')}</ul>`:'').join('')}</section>`:''}
    <div class="section-heading"><h2>Consegne e versioni</h2><span>${p.artifacts.length} conservate</span></div>${a?`<section class="panel"><span class="eyebrow">ULTIMA VERSIONE · ${esc(date(a.at))}</span><h2>${esc(a.title)}</h2><p><small>Identificativo: <code>${esc(a.id)}</code></small></p>${delivery(a)}<div class="paper">${esc(a.content)}</div><div class="actions">${button('download','Scarica testo',p.id,`data-version="${esc(a.id)}"`)}${p.status==='approvazione'?button('approve-confirm','Approva questa versione',p.id):''}${['approvazione','completato','pronto','pubblicato','pausa'].includes(p.status)?button('revise','Chiedi una revisione',p.id):''}${p.status==='completato'&&a.delivery?.verified?button('publish-confirm','Autorizza la pubblicazione…',p.id):''}${p.status==='pronto'?button('revoke_publication','Revoca autorizzazione',p.id):''}</div>${p.publication?`<div class="notice">${p.publication.state==='published'?'Pubblicazione verificata':'Consenso registrato; pubblicazione non ancora verificata'}: ${esc(p.publication.destination)}<br>Versione ${esc(p.publication.versionId)}</div>`:''}</section>${p.artifacts.length>1?`<section class="panel section"><h3>Versioni precedenti</h3>${button('compare','Confronta le ultime due',p.id)}${p.artifacts.slice(1).map(v=>`<details><summary>${esc(v.title)} · ${esc(date(v.at))}</summary><p><code>${esc(v.id)}</code></p><div class="paper">${esc(v.content)}</div>${button('download','Scarica testo',p.id,`data-version="${esc(v.id)}"`)}</details>`).join('')}</section>`:''}`:'<div class="panel empty"><h3>Il risultato arriverà qui.</h3><p>Ogni consegna conserva contenuto, verifiche e versione.</p></div>'}
    <details class="panel section"><summary>Registro del progetto</summary><ol class="timeline">${(p.log||[]).slice().reverse().map(l=>`<li><time>${esc(l.at)}</time><p>${esc(l.text)}</p></li>`).join('')}</ol></details>`;
  }
  function memory() { return `<div class="section-heading"><div><span class="eyebrow">CIÒ CHE GUIDA IL LAVORO</span><h1>Note di progetto</h1><p>Metodo, istruzioni e decisioni conservati in Clara bis.</p></div>${button('memory','+ Aggiungi nota')}</div><div class="notes">${snapshot.state.memories.map(m=>`<article class="panel note"><span class="pill">${esc(m.kind)}</span><p>${esc(m.text)}</p><div class="row"><time>${esc(m.at)}</time><div class="actions">${button('memory','Modifica',m.id)}${button('delete-memory-confirm','Elimina',m.id)}</div></div></article>`).join('')||'<div class="panel empty"><h3>Una memoria nuova, tutta da costruire.</h3><p>Conserva qui le indicazioni che vuoi ritrovare nei prossimi incarichi.</p></div>'}</div>`; }
  function render() {
    if(!snapshot) return;
    if(selected&&!project(selected)) selected=null;
    document.querySelectorAll('[data-view]').forEach(el=>{const active=el.dataset.view===view; el.classList.toggle('active',active); el.setAttribute('aria-current',active?'page':'false');});
    $('projectCount').textContent=String(projects().length);
    $('breadcrumb').textContent={scrivania:'La tua scrivania',progetti:'I tuoi progetti',memoria:'Note di progetto'}[view];
    $('main').innerHTML=view==='scrivania'?home():view==='memoria'?memory():selected?detail(project(selected)):listing();
    refreshChat();
  }
  function refreshChat() { if(!$('chatSend')) return; const capable=transport.capabilities().canMessage; $('chatSend').disabled=!capable||pendingMessage||deliveryUnknown; $('chatHint').textContent=deliveryUnknown?'Invio incerto: controlla la chat prima di riprovare.':capable?'La risposta apparirà nella conversazione.':'Apri Clara bis dentro ChatGPT per inviare il messaggio.'; }
  function modal(title,html,context={}) { modalContext=context; $('modalTitle').textContent=title; $('modalBody').innerHTML=html; if(!$('modal').open) $('modal').showModal(); }
  function close() { $('modal').close(); modalContext=null; }
  const field=(name,label,value='',type='input',required=true)=>`<div class="field"><label for="f-${name}">${label}</label>${type==='textarea'?`<textarea id="f-${name}" name="${name}" ${required?'required':''} rows="3" maxlength="12000">${esc(value)}</textarea>`:`<input id="f-${name}" name="${name}" value="${esc(value)}" ${required?'required':''} maxlength="${name==='title'||name==='cls'?120:1000}">`}</div>`;
  function projectForm(id) {
    const p=project(id), c=p?.contract;
    modal(p?'Modifica incarico':'Un nuovo incarico',`<form id="projectForm"><div class="form-grid">${field('title','Titolo',p?.title)}${field('cls','Destinatari / classe',p?.cls||'Generale')}<div class="field"><label for="f-type">Formato</label><select name="type" id="f-type">${['PWA','Lezione','App','Dispensa','Laboratorio','Verifica','Altro'].map(t=>`<option ${p?.type===t?'selected':''}>${t}</option>`).join('')}</select></div>${field('target','Dove vedere il risultato',c?.target||'Anteprima privata Sites')}</div>${field('brief','Che cosa vuoi realizzare?',p?.brief,'textarea')}${field('scope','Che cosa deve comprendere? Una voce per riga.',c?.scope.join('\n'),'textarea')}${field('sources','Fonti e materiali di partenza — una voce per riga',c?.sources.join('\n'),'textarea',false)}${field('acceptance','Quando lo considererai riuscito? Un criterio per riga.',c?.acceptance.join('\n'),'textarea')}<p class="notice">${p?'La modifica revoca le approvazioni e richiede un nuovo affidamento.':'Il progetto viene salvato. Sarai tu ad affidarlo a Clara.'} Non inserire dati identificativi degli studenti.</p><div class="form-actions"><button class="button primary" type="submit">Salva incarico</button></div></form>`,{id});
  }
  async function sendMessage(text) { if(pendingMessage||deliveryUnknown) return; pendingMessage=true; refreshChat(); try { await transport.message(text); chatDraft=''; if($('chatText')) $('chatText').value=''; toast('Messaggio inviato: continua nella conversazione.'); } catch(e) { if(e.code==='DELIVERY_UNKNOWN') deliveryUnknown=true; toast(e.message,true); } finally { pendingMessage=false; refreshChat(); if(deliveryUnknown) render(); } }
  async function action(name,id,el) {
    const p=project(id);
    if(name==='refresh') return load();
    if(name==='close') return close();
    if(name==='projects') return navigate('progetti');
    if(name==='detail') return navigate('progetti',id);
    if(name==='new'||name==='edit') return projectForm(id);
    if(name==='enqueue'||name==='pause'||name==='resume'||name==='revoke_publication') { await command({op:name,projectId:id}); return toast('Progetto aggiornato.'); }
    if(name==='check-delivery') { deliveryUnknown=false; return render(); }
    if(name==='chat-project') {
      if(snapshot.capabilities?.localMode){
        const prompt=`Riprendi l'incarico locale di Clara bis “${p.title}”, ID ${p.id}. Cartella sul PC: ${snapshot.localProjectDirectory}. Leggi AGENTS.md, REPORT.md e il progetto nell'archivio locale usando node scripts/local-project.mjs read ${p.id}. Realizza il contratto con gli strumenti disponibili e conserva checkpoint e consegne reali nello stesso archivio con il comando apply del medesimo script. Lascio a me l'approvazione della versione e qualsiasi autorizzazione a pubblicare su gbprof.it. Non modificare la vecchia Clara. Dichiara accessi o verifiche mancanti.`;
        return modal('Continua il progetto con Libera',`<p>Copia questo messaggio nella nostra conversazione di lavoro sul PC. L’incarico resterà collegato al suo archivio locale.</p><textarea id="handoffPrompt" class="handoff-prompt" readonly rows="8">${esc(prompt)}</textarea><div class="form-actions">${button('copy-handoff','Copia messaggio')}</div>`);
      }
      return sendMessage(`Lavora nell'app Clara bis, progetto ${p.id}. Leggi clarabis_get_project e il contratto. Realizza l'incarico con gli strumenti disponibili, conserva checkpoint strutturati con clarabis_save_checkpoint e consegne reali con clarabis_save_artifact. Se manca un accesso, dichiara il blocco. Lascia a me l'approvazione della versione e qualsiasi autorizzazione a pubblicare su gbprof.it.`);
    }
    if(name==='copy-handoff') { const area=$('handoffPrompt'); try{await navigator.clipboard.writeText(area.value);toast('Messaggio copiato. Incollalo nella nostra conversazione.');}catch{area.focus();area.select();toast('Testo selezionato: premi Ctrl+C per copiarlo.');} return; }
    if(name==='approve-confirm') return modal('Approva questa versione',`<p>${esc(p.artifacts[0].title)}</p><p>Versione <code>${esc(p.artifacts[0].id)}</code></p><p>Confermi di aver esaminato questa consegna? L’approvazione non autorizza la pubblicazione.</p>${button('approve-now','Conferma approvazione',id)}`,{versionId:p.artifacts[0].id});
    if(name==='approve-now') { const result=await command({op:'approve',projectId:id,versionId:modalContext.versionId,confirm:'APPROVE_VERSION'}); if(result) close(); return; }
    if(name==='revise') return modal('Che cosa va rivisto?',`<form id="revisionForm">${field('note','Indicazioni per Clara','','textarea')}<button class="button primary" type="submit">Salva richiesta di revisione</button></form>`,{id});
    if(name==='publish-confirm') { const a=p.artifacts[0]; return modal('Autorizza una pubblicazione precisa',`<p><strong>${esc(a.title)}</strong></p><p>Versione <code>${esc(a.id)}</code><br>Commit <code>${esc(a.delivery.commit)}</code></p><form id="publicationForm">${field('destination','URL completo su gbprof.it','https://gbprof.it/')}<label class="check-label"><input type="checkbox" required> Autorizzo la pubblicazione di questa versione a questo indirizzo.</label><p class="notice">Il consenso viene registrato. Il deploy richiede l’esecuzione esterna e una verifica successiva.</p><button class="button primary" type="submit">Registra autorizzazione</button></form>`,{id,versionId:a.id}); }
    if(name==='cancel-confirm') return modal('Annulla questo incarico',`<p>${esc(p.title)}</p><p>Il lavoro si ferma. Consegne e cronologia restano consultabili.</p>${button('cancel-now','Conferma annullamento',id)}`);
    if(name==='cancel-now') { if(await command({op:'cancel',projectId:id})) close(); return; }
    if(name==='compare') return modal('Le ultime due versioni',`<div class="compare">${p.artifacts.slice(0,2).map((a,i)=>`<section><h3>${i?'Precedente':'Attuale'}</h3><p>${esc(date(a.at))}</p><div class="paper">${esc(a.content)}</div></section>`).join('')}</div>`);
    if(name==='download') { const a=p.artifacts.find(a=>a.id===el.dataset.version); if(!a) throw new Error('Versione non trovata.'); const link=document.createElement('a'),url=URL.createObjectURL(new Blob([a.content],{type:'text/markdown;charset=utf-8'})); link.href=url; link.download='clara-bis-'+a.id+'.md'; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); return; }
    if(name==='memory') { const m=snapshot.state.memories.find(m=>m.id===id); return modal(m?'Modifica nota':'Una nota per i progetti',`<form id="memoryForm"><div class="field"><label for="f-kind">Tipo di nota</label><select name="kind" id="f-kind">${['Metodo','Istruzione','Decisione'].map(k=>`<option ${m?.kind===k?'selected':''}>${k}</option>`).join('')}</select></div>${field('text','Nota',m?.text,'textarea')}<button class="button primary" type="submit">Salva nota</button></form>`,{id}); }
    if(name==='delete-memory-confirm') return modal('Elimina la nota',`<p>La nota verrà rimossa da Clara bis.</p>${button('delete-memory','Elimina definitivamente',id)}`);
    if(name==='delete-memory') { if(await command({op:'delete_memory',memoryId:id})) close(); return; }
    if(name==='reset') { await load(); if(!reachable) return; const r=snapshot.resetPreview; return modal('Azzera gli incarichi di Clara bis',`<p>Questa cancellazione è definitiva e riguarda soltanto il nuovo archivio.</p><div class="reset-counts">${Object.entries(r.counts).map(([k,v])=>`<div><strong>${v}</strong><span>${{projects:'progetti',versions:'versioni',checkpoints:'checkpoint',jobs:'lavori'}[k]}</span></div>`).join('')}</div><p>Le note di progetto restano. La vecchia Clara è separata.</p><form id="resetForm"><label class="check-label"><input type="checkbox" required> Confermo la cancellazione degli elementi elencati.</label><button class="button danger" type="submit">Cancella definitivamente</button></form>`,{revision:r.revision}); }
  }
  document.addEventListener('click',async event=>{
    const el=event.target.closest('button'); if(!el||el.disabled) return;
    try {
      if(el.dataset.view) return navigate(el.dataset.view);
      if(el.dataset.filter) { filter=el.dataset.filter; return render(); }
      if(el.dataset.action) await action(el.dataset.action,el.dataset.id,el);
    } catch(e) { toast(e.message,true); }
  });
  document.addEventListener('input',event=>{if(event.target.id==='chatText') chatDraft=event.target.value;});
  document.addEventListener('submit',async event=>{
    event.preventDefault(); const form=event.target, f=new FormData(form), data=Object.fromEntries(f), context=modalContext;
    if(form.id==='chatForm') return sendMessage(data.message);
    const submit=form.querySelector('[type="submit"]'); if(submit) submit.disabled=true;
    try {
      let result;
      if(form.id==='projectForm') result=await command({op:context.id?'edit_project':'create_project',...(context.id?{projectId:context.id}:{}),epoch:snapshot.state.projectEpoch||0,title:data.title,brief:data.brief,cls:data.cls,type:data.type,contract:{goal:data.brief,scope:lines(data.scope),sources:lines(data.sources),deliverable:data.type,target:data.target,acceptance:lines(data.acceptance)}});
      else if(form.id==='revisionForm') result=await command({op:'revise',projectId:context.id,note:data.note});
      else if(form.id==='publicationForm') result=await command({op:'authorize_publication',projectId:context.id,versionId:context.versionId,destination:data.destination,confirm:'PUBLISH_EXACT_VERSION'});
      else if(form.id==='memoryForm') result=await command({op:'save_memory',kind:data.kind,text:data.text,...(context.id?{memoryId:context.id}:{})});
      else if(form.id==='resetForm') result=await command({op:'reset_all_projects',expectedRevision:context.revision,confirm:'RESET_ALL_PROJECTS'});
      if(result) { close(); if(form.id==='projectForm') navigate('progetti',result.projectId||context.id); else if(form.id==='resetForm') navigate('progetti'); toast('Salvato nell’archivio.'); }
    } catch(e) { toast(e.message,true); } finally { if(submit) submit.disabled=false; }
  });
  window.addEventListener('clara:state',event=>accept(event.detail));
  window.addEventListener('clara:connection',refreshChat);
  window.addEventListener('clara:project',event=>navigate('progetti',event.detail));
  window.addEventListener('hashchange',()=>{const next=location.hash.slice(1); if(next!==view) navigate(next);});
  view=['scrivania','progetti','memoria'].includes(location.hash.slice(1))?location.hash.slice(1):'scrivania';
  load(); setInterval(()=>{if(document.visibilityState==='visible'&&!busy) load();},15000);
})();
