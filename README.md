# Clara — scrivania didattica privata

Clara v4 conserva incarichi, risultati, revisioni, istruzioni e scadenze del docente in D1. Il Site resta privato del proprietario. Il plugin MCP ha l’Extension globale e di conversazione per l’interfaccia fullscreen. Ritratto originale, grafica e voce del dispositivo sono conservati. Le schede didattiche d’esempio e l’orario inventato sono distinti dagli incarichi reali.

## Uso

Creare un incarico indicando classe, formato, obiettivi e testi/fonti necessari. Dopo l’attivazione della programmazione, «Affida a Clara» inserisce esplicitamente il lavoro nella coda IA. Un task cloud collegato al Site controlla la coda ogni ora, anche quando ChatGPT è chiuso. Ogni esecuzione prende in carico un incarico; produce una bozza oppure salva un risultato parziale e rimette il lavoro in coda. I risultati attendono la revisione del docente. Le revisioni dei lavori affidati tornano nella coda. Pausa e annullamento invalidano la presa in carico.

«Lavora con ChatGPT» permette invece lo sviluppo immediato nella conversazione dopo il collegamento del plugin. «Prepara una traccia guidata» rimane una funzione separata: genera uno schema da modello didattico senza IA in circa sette secondi.

Aprire le bozze, creare nuove versioni, scaricare Markdown/HTML o stampare/PDF. L’HTML esportato è una scheda leggibile, non una PWA installabile. Per il formato PWA l’agente può consegnare progettazione e codice dichiarandone lo stato; build, verifica e pubblicazione dell’app sono separate. Memoria e agenda sono private di Clara; nessuna modifica alla memoria generale di ChatGPT o a Google Calendar.

## Esecuzione cloud

Istruzioni versionate in `lib/clara-agent.mjs`, pubblicate a `/api/agent/instructions`. Coda leggibile con GET `/api/agent`; writer POST sullo stesso percorso. Acquisizione dell’accesso supportato: ad ogni run `sites_get_site` del Site collegato, conferma owner-private, token di servizio effimero inviato solo al suo URL nell’header `OAI-Sites-Authorization`. Mai token in codice, prompt, file, output o argomenti. L’accesso di servizio non impersona l’utente e non autorizza app esterne. Conservare tutti i controlli della piattaforma.

Il writer gestisce `claim`, `checkpoint`, `complete`, `continue`, `needs_input`; `configure` registra il task nativo dopo la sua creazione verificata. Claim atomico tramite CAS D1, lease di 20 minuti rinnovata dai checkpoint, deduplicazione con requestId stabile. Le lease scadute vengono recuperate dal controllo successivo. Non è un processo continuo: latenza fino al controllo orario, più eventuali incarichi precedenti e continuazioni. Un task salvato prova la programmazione; soltanto una run cloud riuscita prova la disponibilità dei suoi strumenti e la consegna.

Ogni run deve scaricare le istruzioni aggiornate, produrre contenuto effettivo, salvare checkpoint e consegna, quindi rileggere il risultato. Nessuna bozza dimostrativa automatica se la coda è vuota. Se mancano materiali essenziali, mettere in pausa con una domanda al docente. Fonti soltanto se realmente consultate; risultati e fonti vanno revisionati prima dell’uso didattico.

## Architettura e limiti

- Vinext/Sites starter e cattura dei connettori mantenuti. UI sorgente in `public/`; `scripts/generate-ui.mjs` incorpora CSS/JS e ritratto nel widget MCP. Nessuna dipendenza grafica remota.
- D1 `clara_workspace`, archivio singleton dietro l’accesso owner-only. Non condividere senza membership e partizionamento per utente. Validazione, deduplicazione, revisione/CAS e retry. Limite 2 MB, 150 incarichi, 200 note/scadenze, 10 versioni per incarico, ultimi 6 checkpoint, 60.000 caratteri per documento. Esportare prima di svuotare l’archivio. Reset invalidante per gli scrittori e conservazione della configurazione del task.
- Preparazione guidata `waitUntil`, token e checkpoint, ripresa dopo 35 secondi se interrotta. È distinta dalla coda IA durevole controllata dal task cloud.
- `/mcp`: protocollo stateless, dodici strumenti, risorsa UI fullscreen con entrypoint global/thread. Strumenti per coda e azioni IA riutilizzano i writer D1. Il collegamento MCP OAuth è distinto dall’accesso di servizio Site.
- Voce SpeechSynthesis e SpeechRecognition se disponibili, risposte predefinite, ritratto in primo piano e movimento illustrativo delle labbra. Nessuna voce nativa ChatGPT/API vocale. Stop/chiusura/cambio pagina fermano l’audio; dettatura eventualmente fornita dai servizi del browser. Dialogo vocale non archiviato.
- Drive, GitHub, Google Calendar e gbprof.it non collegati; nessun file esterno modificato. Le note del docente restano subordinate ai vincoli correnti e alle istruzioni di sistema.

## Verifica

`node --test tests/server.test.mjs`: SQLite reale/adattatore D1, persistenza e CAS, input e concorrenza, tracce guidate, checkpoint/bozze, revisioni/approvazione, MCP discovery/UI/schema, claim esclusivi, retry idempotenti, continuazione, scadenza/ripresa delle lease, pause/annullamenti e reset.

`node tests/ui.test.cjs`: sette sezioni, payload, form, escape e Markdown, filtri, stato obsoleto e controlli. Typecheck e build Vinext. Test HTTP privato dopo pubblicazione: download istruzioni, accesso coda, writer/consegna/rilettura e blocco anonimo. La programmazione nativa e la prima run cloud vanno documentate separatamente: non confondere un test del writer con un task eseguito.

QA reale di resa, fullscreen, voce e microfono su iPad non effettuata: control-browser non disponibile. Nessun server di preview o browser improvvisato. Installazione/collegamento del plugin richiedono l’azione dell’utente nel suo account.

## Versione 6 — home essenziale e dialogo reale

La home usa il volto e la composizione del riferimento approvato: Clara al centro, comando vocale dominante, campo scritto con Vivavoce/Scritta e accessi Lezioni/Materiali/Progetti. Le sette sezioni, l’archivio D1, la coda, le bozze, le revisioni, la memoria e l’agenda sono mantenuti. Il menu in alto a sinistra apre anche le sezioni meno frequenti. Le lezioni e schede d’esempio preesistenti restano dichiarate come esempi.

### Come provare

Aprire Clara dal plugin in ChatGPT Work, oppure dalla pagina del plugin `clara_open`. Inviare una domanda breve. La home invia un messaggio reale alla conversazione con `ui/message`; ChatGPT legge lo scambio e restituisce la risposta con `clara_chat_reply`. Il pannello recupera il testo e lo legge se è stata scelta Vivavoce. Non vengono usate risposte predefinite né un servizio API aggiuntivo. Il plugin deve essere collegato e il client deve supportare l’invio dei messaggi dalle app.

Dal sito standalone, Invia conserva la richiesta e apre la stessa Clara dentro ChatGPT con il testo già pronto: premere **Invia a ChatGPT**. Nel link passa soltanto l’identificativo casuale, non il testo. La pagina web da sola non contiene un modello AI. Se gli strumenti aggiornati non compaiono nella conversazione già aperta, riaprire Clara in una nuova conversazione.

Il microfono usa SpeechRecognition, se disponibile e autorizzato; le risposte vengono lette con SpeechSynthesis del dispositivo. Il servizio di dettatura del browser può richiedere rete. Su iPad o in un iframe con permessi limitati può essere necessario il microfono della tastiera; se l’audio automatico non parte, toccare **Ascolta risposta**. Questa non è la modalità vocale nativa di ChatGPT e non è una sessione realtime continua.

### Integrazione

- `public/home.js`: interazione della home, invio al modello attraverso l’host, recupero della risposta, dettatura, lettura, interruzione, errori e handoff dal sito.
- `public/bridge.js`: trasporto MCP/HTTP, capacità dell’host e deep link della richiesta.
- `lib/clara-chat.mjs`: scambi privati con idempotenza e CAS nello stesso archivio owner-only. Massimo 10 scambi, leggibili per 24 ore; quelli scaduti vengono eliminati al successivo invio. Le risposte consegnate non vengono sovrascritte.
- Strumenti MCP `clara_chat_request`, `clara_chat_read`, `clara_chat_reply`. La consegna al pannello richiede l’esecuzione effettiva del tool da parte del modello. Il timeout non produce una risposta simulata: propone verifica della chat e controllo manuale.
- Il normale polling dello stato non sostituisce il DOM della home: la bozza scritta, il focus e lo stato vocale restano stabili. Il corpo della conversazione non è incluso nei risultati generali dell’archivio.
- `scripts/generate-ui.mjs`: incorpora gli stessi CSS, JS e fotografia nel widget MCP. La home del sito e quella del plugin provengono dallo stesso sorgente.
- Nuova `POST/GET /api/chat` per preparare una richiesta dal sito e riaprirla nel plugin. Non c’è un endpoint web pubblico per inventare o scrivere risposte del modello.

### Controlli della versione 6

`node --test tests/server.test.mjs`: 9 test, inclusi scambio reale domanda/risposta, concorrenza preesistente, capienza/scadenza, idempotenza, discovery e strumenti MCP. `node tests/ui.test.cjs`: regressione delle sezioni e delle azioni esistenti. `node tests/home.test.cjs`: invio embedded → callback → risposta, testo sicuro e handoff web; è una simulazione DOM, non un collaudo del client ChatGPT. Controllo sintattico, TypeScript e build completano la verifica.

L’ispezione visiva tramite browser dell’ambiente è stata bloccata da una policy. Microfono, voce e ciclo completo nel client ChatGPT su iPad restano da provare con il docente; non confondere i test server o DOM con questa verifica.

Per lo sviluppo: installare le dipendenze con il workflow Sites; eseguire `node scripts/generate-ui.mjs` prima di `npm run dev` o `npm run build`. Pubblicare con il workflow Sites mantenendo il project_id esistente e l’accesso privato. Il rollback consiste nel ripubblicare la versione precedente: i dati di progetto non sono migrati né eliminati da questo aggiornamento.

## Correzione del 22 ottobre — invio bloccato

Il simbolo SVG e il pulsante Invia condividevano `id="send"`: `getElementById` restituiva il simbolo, quindi `controls()` sollevava un errore prima di inviare una domanda, anche dopo la dettatura. I simboli ora hanno identificativi distinti. Il test `node tests/home-markup.test.mjs` verifica gli ID nell’HTML reale del sito e del widget, i riferimenti SVG e la sintassi degli script incorporati; riproduceva il difetto prima della correzione. Corretto anche il prefisso della fotografia incorporata (`./data:` non era un URL valido). Risorsa widget v7 e URL degli asset aggiornati per invalidare le copie precedenti.

I test precedenti simulavano elementi DOM senza leggere l’HTML e non rilevavano la collisione. I test locali non attestano ancora il ciclo completo nel client ChatGPT né l’audio su iPad. Il sito esterno continua a trasferire la richiesta al plugin: non dispone di un modello IA autonomo. Rollback: ripubblicare la versione Sites precedente.
