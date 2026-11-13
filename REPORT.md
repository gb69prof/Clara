# Clara bis — autonomia verificabile

## Aggiornamento 1.0.2 — 11 novembre 2026

**Obiettivo:** assegnare ed eseguire gli incarichi dalla scrivania locale attraverso Clara, evitando il passaggio manuale del testo alla conversazione.

**Fatto:** aggiunto `scripts/local-agent.mjs` per coda, claim esclusivo, lease, checkpoint e continuazione; abilitati enqueue/resume nell'API locale solo quando l'esecutore è configurato. Consegne locali: verifica dei file nella cartella del progetto, snapshot della versione, hash SHA-256, download e REPORT separato. Una consegna locale senza anteprima Sites resta al 95% e non può ottenere autorizzazione alla pubblicazione. L'interfaccia distingue configurazione e primo accesso periodico registrato.

**Collegamento effettivo:** creata l'automazione Work separata «Clara bis — esegui gli incarichi», con controllo ogni ora. L'avvio immediato dello strumento ha restituito un'esecuzione nella conversazione corrente, non una corsa indipendente: eseguite realmente probe e lettura della coda sul database locale. Collegamento configurato e incarico già presente affidato alla coda su richiesta del proprietario. Nessun contenuto dell'incarico è stato prodotto in questa prova.

**Prove:** 28 test automatici superati: persistenza, ripresa con nuovo runId, doppio claim escluso, idempotenza, annullamento/pausa, percorsi confinati, file mancanti, hash dopo modifica, report non esposto, versioni e blocco della pubblicazione. I test usano archivi isolati; nessun incarico dimostrativo nell'archivio del proprietario.

TypeScript superato sulla copia di collaudo isolata con dipendenze già installate. Per questa revisione il nuovo tentativo di build ufficiale Sites si ferma prima della compilazione: pnpm non presente nel PATH iniziale; con lo shim disponibile Corepack tenta il recupero di pnpm e incontra `ENOTFOUND registry.npmjs.org`. Non si riutilizza la vecchia build come prova della versione 1.0.2. Il server locale Node non dipende da pnpm e i relativi test sono eseguiti direttamente.

**Limiti:** la prima corsa periodica non è ancora stata osservata. Il servizio restituisce ambiente ereditato senza dettagli del dispositivo: non è una prova di raggiungibilità futura del PC. Il backend locale già in memoria deve essere riavviato per caricare i nuovi endpoint. Nessun collaudo visuale/live nuovo dichiarato. Pubblicazione privata Sites ancora da completare; nessun deploy su gbprof.it. La vecchia Clara, i suoi dati e la sua automazione restano intatti.

**Alternativa verificata e non attivata:** Codex CLI installato e autenticato; prova read-only interrotta per accesso negato alle directory di sessione e mancato accesso di rete. Non cambiati permessi, configurazione globale, credenziali o sandbox per aggirare il blocco.

**Fonti e decisioni:** codice locale, contratto, richiesta del proprietario, metadati effettivi degli strumenti Work. Scelta la coda periodica, dichiarandone la latenza; non attribuita un'esecuzione a un semplice badge. Prossimo riscontro: una vera corsa programmata che legga questo stesso archivio, acquisisca il lavoro e salvi un checkpoint o una consegna.

Data: 11 novembre 2026. Stato: disponibile sul PC con archivio persistente; pubblicazione privata Sites e collaudo online ancora bloccati. Non sostituisce ancora Clara.

## Obiettivo e decisione
La richiesta più recente è creare una nuova Clara indipendente, preservando quella precedente fino al collaudo. Nuovo Site registrato una sola volta: `appgprj_6af4ac01ef9c819192a5e8e26f9a9bbd`, slug `clara-bis-gbprof`. Archivio e prefisso MCP separati. Riutilizzati i moduli di gestione progetti già verificati, senza importare dati o incarichi.

## Operazioni
Nuova interfaccia italiana con ritratto approvato, scrivania vuota, contratti, progetti, registro, checkpoint, versioni, confronto, note e reset circoscritto. Rimossi generazione guidata simulata e strumenti chat legacy. Archivio D1 `clarabis_workspace`, riga `clarabis-owner`; seed vuoto e agente disattivato. Consegne, consensi e invalidazione degli esecutori controllati sul server. La vecchia app, i sei incarichi e la sua schedulazione non sono stati modificati.

## Fonti effettivamente usate
Richiesta corrente, sorgenti locali di `gb69prof/Clara` provenienti dalla PR #3, starter e strumenti ufficiali Sites, codice delle dipendenze già installate. Nessun servizio esterno per elaborare dati didattici; nessun dato degli studenti.

## Verifiche
- `npm test`: 24 test superati. SQLite reale in memoria/su file per persistenza, lease, concorrenza, idempotenza, reset e revoca delle versioni. Interfaccia eseguita in ambiente DOM simulato per nuovi incarichi, escaping, conferme vincolate alla versione/revisione visualizzata e invio al prefisso MCP nuovo.
- TypeScript: superato.
- Helper ufficiale `build-site.mjs`: build Vinext completata, sette endpoint compreso `/mcp`.
- Dipendenze: stesso lockfile dell'installazione già eseguita dal proprietario. L'installazione autonoma nella nuova cartella è bloccata da symlink/metadata offline del sandbox. Per il collaudo è stata usata una copia isolata del nuovo sorgente in `.sites-runtime/clara-bis-build` del checkout precedente, con risoluzione delle dipendenze già presenti e solo il percorso locale del comando build adattato. Nessuna modifica ai sorgenti o dati della vecchia app.
- Controlli visivi e live: NON superati né dichiarati completati. Computer Use si è fermato perché l'applicazione delle regole URL non è supportata per Firefox su Windows. L'anteprima locale HTML è solo uno strumento di revisione senza salvataggio.

## Aggiornamento: prova concreta sul PC
Aggiunto server Node senza dipendenze esterne, accessibile solo su 127.0.0.1:4177, e avvio `Apri-Clara-bis.cmd`. Archivio SQLite locale persistente, separato da entrambi i Site ed escluso da Git. Verificati creazione, nota e recupero dopo chiusura/riapertura del database, difesa da origini esterne, host estranei e accesso ai file privati. L’interfaccia indica esplicitamente la modalità locale e offre un passaggio alla conversazione Work; `local-project.mjs` consente lettura, checkpoint e consegne reali, senza approvazioni automatiche. Nessuna schedulazione attivata.

Il processo locale ha confermato l’ascolto HTTP. Il controllo visivo dal browser resta da effettuare dal proprietario, data la limitazione dello strumento già documentata.

## Blocco concreto
Il nuovo repository sorgente Sites restituisce lo stesso errore di rete (`getaddrinfo() thread failed to start`). Il nuovo Site non elimina la limitazione di questo ambiente. Nessun commit è stato inviato al repository gestito di Sites e nessuna versione è stata pubblicata. Il backup GitHub è distinto dalla pubblicazione Sites. Nessun token scritto nei file.

## Prossimo passo verificabile
Da un ambiente con accesso al repository Sites: installare dal lockfile, ricostruire, usare `site-workflow.mjs` con credenziale temporanea per questo stesso project_id, pubblicare privatamente il commit realmente inviato. Aprire la pagina e il pannello ChatGPT, collaudare la persistenza e i consensi, quindi collegare e verificare una nuova schedulazione prima di attivare la coda. Conservare la vecchia Clara fino al risultato del collaudo. Nessun deploy su gbprof.it è autorizzato.
