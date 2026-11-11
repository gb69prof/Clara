# Clara — La tua scrivania didattica

Clara v9 è un pannello della conversazione ChatGPT: invia il testo alla chat che la ospita, senza un secondo chatbot o una nuova memoria conversazionale. **Le risposte appaiono nella conversazione ChatGPT, non automaticamente dentro la home.**

## Aprire e provare

Nella conversazione che vuoi continuare, con il plugin Clara disponibile, chiedi: **«Apri Clara accanto a questa chat»**. Lo strumento `clara_conversation` apre il pannello di conversazione. Scrivi e premi **Invia a ChatGPT**: il messaggio deve comparire nella stessa chat, seguito dalla risposta. Puoi continuare da Clara oppure dalla chat.

Il collegamento globale `clara_open` resta disponibile per la scrivania. Il [sito privato](https://clara-scrivania-gbprof.gbprof.chatgpt.site) conserva le funzioni didattiche, ma non ha una conversazione ospitante: l’invio è disabilitato e puoi copiare il testo nella chat. Non creare una nuova conversazione se vuoi conservare il contesto di quella corrente.

Il microfono è **dettatura**: se browser, host e permessi la consentono, prepara il testo da controllare e inviare. Non attiva Voice e non invia automaticamente. Quando non disponibile è disabilitato con una spiegazione. Per parlare con ChatGPT usa Voice nell’interfaccia ChatGPT, se disponibile nel tuo client.

## Funzioni conservate

Scrivania, Le mie classi, Lezioni e laboratori, Progetti in corso, Biblioteca, Scuola e calendario. Restano anche le Note di progetto (già “Memoria di Clara”), versioni delle bozze, revisione, approvazione, esportazioni e coda programmata. Le note sono dati espliciti del progetto, non memoria personale dell’account. Schede e orario dimostrativi restano segnalati.

La preparazione guidata produce schemi senza IA. “Lavora con ChatGPT” invia l’incarico alla chat; “Affida a Clara” usa la coda preesistente quando attiva. Vedi [esecuzione programmata](docs/esecuzione-programmata.md). Non sono stati migrati o cancellati dati, né attivate nuove connessioni esterne.

## Architettura

- Vinext 1.0.0-beta.5 / Vite, compatibilità Next 16 e React 19, Worker Sites con D1 `DB`, accesso privato del proprietario.
- `public/index.html`, `styles.css`, `home.js`: home essenziale con ritratto, scrittura, dettatura e stato di invio. `app.js`: sezioni didattiche.
- `public/bridge.js`: handshake MCP Apps, `ui/message` verso la chat e `tools/call` per l’archivio. Alias documentati `window.openai` solo quando la capacità standard non è disponibile. Nessun retry automatico dopo un invio ambiguo.
- `lib/clara-mcp.mjs`: 16 strumenti, entrypoint globale e di conversazione distinti, risorsa `ui://clara/scrivania-v9.html`; URI precedenti compatibili.
- `scripts/generate-ui.mjs`: genera `lib/clara-ui.ts` dagli stessi sorgenti. Build, dev e test lo eseguono automaticamente. CSS e JS incorporati; immagini già pubbliche da URL GitHub fissati a un commit e dichiarati nella CSP. Budget interno HTML 200 KB, non limite ufficiale della piattaforma.
- `lib/clara-store.mjs`, `clara-agent.mjs`: archivio privato, CAS, revisioni, coda. `clara-chat.mjs` e `/api/chat` restano per compatibilità con vecchi scambi; la nuova home non salva né interroga nuove conversazioni in D1.

Il frontend non riceve una copia automatica della cronologia, della memoria dell’account o degli strumenti connessi. ChatGPT può usare il contesto e gli strumenti effettivamente disponibili nella conversazione, secondo autorizzazioni. Nessuna API key per un modello separato è necessaria.

## Sviluppo e verifiche

Node >=22.13 e pnpm 11.25.0. Installare le dipendenze con il workflow Sites oppure `pnpm install --frozen-lockfile` in un ambiente Node compatibile.

```sh
pnpm test
pnpm typecheck
pnpm build
pnpm dev
```

Aprire l’URL locale mostrato dal server. Il sito locale non può provare il collegamento alla chat: serve il pannello pubblicato nell’host ChatGPT. L’archivio locale D1 è separato da quello di produzione; non copiarvi dati riservati per i test.

I test coprono trasporto e timeout, mancati permessi/capacità, dettatura e revisione del testo, HTML reale e identificativi, sezioni didattiche, persistenza, concorrenza, strumenti MCP, progetti e coda. Usano un host/DOM di prova: **non dimostrano da soli il ciclo completo nel client ChatGPT**. Vedi [analisi, capacità e collaudo](docs/integrazione-nativa.md).

## Pubblicazione e ripristino

Branch GitHub `feat/clara-live-integration`, [PR #2](https://github.com/gb69prof/Clara/pull/2). Backup prima di v9: `backup/clara-before-native-v9` al commit `7f0eb1257b146043db53fd81da75dd17ac13ff09`.

Un commit GitHub non pubblica automaticamente Clara. La pipeline Sites usa il checkout sincronizzato, `.openai/hosting.json`, build Worker, commit sorgente verificato e archivio di distribuzione corrispondente. Preservare il project_id esistente e l’accesso owner-only. Salvare/pubblicare con gli strumenti Sites e verificare lo stato terminale del deploy. Non salvare token nel repository.

Rollback applicativo: ripubblicare con Sites la versione precedente `appgprj_6acb4747a00881919a0f293cbce0b739~appgver_9ddfda219ca0819193a7c20b8afbbca9`. Rollback sorgente: ripartire dal branch di backup senza sovrascrivere lavori successivi. Nessuna migrazione D1 è richiesta da v9; il ripristino del codice non cancella i dati.
