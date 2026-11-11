# Integrazione conversazionale nativa — 22 ottobre 2026

## Diagnosi ed evidenze

1. Nella vecchia home il simbolo SVG e il pulsante avevano entrambi `id="send"`. `getElementById` selezionava il simbolo; l’aggiornamento del testo del pulsante falliva prima dell’invio. Il test sull’HTML reale ha riprodotto il difetto ed è passato dopo la correzione. Gli identificativi dei simboli ora hanno prefisso `ch-icon-`.
2. Il flusso precedente salvava una domanda in D1, chiedeva al modello di eseguire `clara_chat_read` / `clara_chat_reply` e attendeva con polling. La presenza di una domanda nel database non provava l’esecuzione del modello. Una richiesta segnalata dall’utente è stata letta e risposta manualmente via MCP: prova del servizio, non del ciclo UI → chat → UI. I dati dello scambio non sono riportati nel repository.
3. Dal sito esterno il reindirizzamento apriva l’entrypoint globale, senza garanzia di conservare la conversazione desiderata. Eliminato dalla nuova home.
4. Il client ha mostrato “App non disponibile”. Non sono disponibili console o trace del client che ne provino la causa. Il payload delle immagini incorporato era oltre 3 MB: la risorsa ora usa immagini pubbliche fissate a commit e un budget di progetto sotto 200 KB. È una mitigazione, non una diagnosi certa di quell’errore.

## Percorso implementato

La UI avvia `ui/initialize`, legge le capacità dell’host e conclude l’handshake. Con `hostCapabilities.message.text` usa `ui/message`, ruolo `user`, contenuto originale. Aggiunge `_meta["openai/message"] = {target:"active",send:true}` soltanto se l’estensione è annunciata. Negli host standard usa la semantica predefinita; se la capacità standard manca ma l’alias ufficiale è presente usa `window.openai.sendFollowUpMessage`.

Il trasporto è scelto prima dell’invio. Dopo 12 secondi senza conferma il testo resta visibile e un nuovo invio richiede di controllare la chat: nessun tentativo automatico attraverso una seconda API. Un acknowledgement conferma l’accettazione del comando, non che il modello abbia già completato la risposta. Gli errori non producono risposte simulate.

La nuova home non usa `clara_chat_request`, non fa polling delle risposte e non scrive copie del dialogo nell’archivio. L’elenco dei testi inviati vive solo in memoria del pannello, fino alla sua chiusura. Gli strumenti delle vecchie conversazioni restano compatibili; non sono richiesti al modello per i nuovi messaggi.

`clara_conversation` è l’entrypoint thread per continuare una chat; `clara_open` è quello globale. L’archivio didattico continua a usare gli strumenti MCP autorizzati (`clara_state`, `clara_command`) o gli endpoint autenticati del sito. Nessuna chiave API o backend LLM indipendente è stato aggiunto.

## Capacità e limiti

| Capacità | Percorso effettivo | Limite |
| --- | --- | --- |
| Inviare testo | `ui/message` / alias documentato | Solo nell’host che espone la capacità; sito esterno: copia nella chat |
| Leggere la risposta | Conversazione nativa ChatGPT | Il bridge documentato non espone uno stream generale delle risposte del modello alla UI |
| Continuare il contesto | Invio alla conversazione attiva | Usa il contesto disponibile a ChatGPT; nessuna importazione delle vecchie chat |
| Memoria personale | Resta gestita da ChatGPT | Nessuna API della UI per leggere/modificare tutta la memoria dell’account; non garantita per ogni contesto |
| Cronologia precedente | Aprire in ChatGPT la conversazione pertinente | Il pannello non legge tutte le chat; eventuali riferimenti/documenti vanno forniti o recuperati con strumenti autorizzati |
| MCP Clara | `tools/call` con i permessi dell’host | Gli errori di autorizzazione restano visibili |
| GitHub, Drive, documenti | Strumenti disponibili nella chat e autorizzati | Non ereditati automaticamente dal sito o dal pannello; nessun nuovo collegamento attivato |
| Dettatura | Web Speech `SpeechRecognition`, se presente | Browser, connessione e permessi microfono; può usare un servizio del browser; prepara testo da confermare |
| Riproduzione delle risposte | Eventuali controlli nativi ChatGPT | Nessuna risposta acquisita dal pannello da leggere automaticamente |
| Voice bidirezionale | Interfaccia Voice di ChatGPT, se disponibile | Nessuna API documentata trovata per comandare Voice dal pannello; non simulata |
| Audio tramite API separata | Richiederebbe backend, credenziali e flusso dedicato | Non implementato: non eredita automaticamente memoria, voce o conversazione dell’account |
| Note di progetto | Archivio didattico già esistente | Esplicite note concordate, distinte dalla memoria dell’account; nessuna nuova memoria parallela del dialogo |

## Verifiche e limiti del collaudo

- Test server su SQLite/adattatore D1: persistenza, CAS, input, approvazioni, versioni, coda e compatibilità legacy.
- Test MCP: discovery, schemi, separazione entrypoint globale/thread e apertura senza mutare dati.
- Test bridge: handshake, invio attivo, host standard, alias, capacità mancanti, timeout, nessun doppio invio, messaggi provenienti da iframe estranei ignorati.
- Test home: ID ricavati dall’HTML reale, invio, conservazione bozza, testo sicuro, controlli disabilitati, dettatura da rivedere e permessi negati.
- Regressione delle sette sezioni; markup del sito e widget; sintassi JS; controllo TypeScript e build Vinext.

Le prove DOM/host sono simulazioni controllate. Il browser dell’ambiente era stato bloccato dalla policy: non è stato usato un percorso alternativo per aggirare il blocco. Apertura visiva del pannello pubblicato, input reale su iPad, dettatura e ciclo completo modello/risposta nella stessa chat restano da verificare nel client. Un deploy riuscito attesta la pubblicazione, non queste prove. Il criterio finale dell’utente resta aperto finché questo collaudo non riesce.

### Collaudo nel client

1. Nella conversazione esistente, con Clara disponibile, chiedere di aprirla accanto alla chat. Controllare che il pannello dichiari il collegamento.
2. Inviare una domanda breve; verificare un solo messaggio nella stessa chat e una risposta reale. Fare una seconda domanda riferita alla precedente.
3. Riaprire il pannello nella stessa conversazione: cronologia e risposte devono rimanere nella chat, senza duplicazioni D1.
4. Provare un incarico didattico esistente in sola lettura, poi navigare fra le sei aree principali e le Note di progetto.
5. Se la dettatura è disponibile, negare il permesso e verificare che il testo precedente rimanga. Autorizzare, dettare, rivedere e inviare esplicitamente. Se non supportata, il pulsante deve essere disabilitato.
6. Aprire il sito fuori dalla chat: invio disabilitato, copia disponibile e nessun reindirizzamento automatico.

Se l’entrypoint di conversazione non appare, verificare che il client abbia aggiornato il catalogo del plugin dopo la pubblicazione. La presenza del codice sul server non prova che una sessione già aperta abbia aggiornato quel catalogo.

## Fonti ufficiali consultate

- [OpenAI: UI MCP Apps, messaggi, strumenti e modalità di visualizzazione](https://developers.openai.com/plugins/build/chatgpt-ui)
- [OpenAI: riferimento delle API e alias window.openai](https://developers.openai.com/plugins/reference)
- [OpenAI: Extensions, entrypoint global e thread](https://developers.openai.com/plugins/build/extensions)
- [OpenAI: diagnosi dei problemi](https://developers.openai.com/plugins/troubleshooting)
- [OpenAI MCP Extensions: specifiche e pattern](https://github.com/openai/mcp-extensions)
- [MCP Apps: specifica](https://github.com/modelcontextprotocol/ext-apps)
- [MDN: SpeechRecognition e disponibilità dei browser](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)
- Workflow ufficiale Sites disponibile nell’ambiente: sorgente sincronizzata, build, archivio, versione e pubblicazione privata. Il runtime Sites e il bridge UI sono livelli distinti.
