# Clara bis — autonomia verificabile

Data: 11 novembre 2026. Stato: implementata e verificata automaticamente in locale; pubblicazione privata e collaudo online ancora bloccati. Non sostituisce ancora Clara.

## Obiettivo e decisione
La richiesta più recente è creare una nuova Clara indipendente, preservando quella precedente fino al collaudo. Nuovo Site registrato una sola volta: `appgprj_6af4ac01ef9c819192a5e8e26f9a9bbd`, slug `clara-bis-gbprof`. Archivio e prefisso MCP separati. Riutilizzati i moduli di gestione progetti già verificati, senza importare dati o incarichi.

## Operazioni
Nuova interfaccia italiana con ritratto approvato, scrivania vuota, contratti, progetti, registro, checkpoint, versioni, confronto, note e reset circoscritto. Rimossi generazione guidata simulata e strumenti chat legacy. Archivio D1 `clarabis_workspace`, riga `clarabis-owner`; seed vuoto e agente disattivato. Consegne, consensi e invalidazione degli esecutori controllati sul server. La vecchia app, i sei incarichi e la sua schedulazione non sono stati modificati.

## Fonti effettivamente usate
Richiesta corrente, sorgenti locali di `gb69prof/Clara` provenienti dalla PR #3, starter e strumenti ufficiali Sites, codice delle dipendenze già installate. Nessun servizio esterno per elaborare dati didattici; nessun dato degli studenti.

## Verifiche
- `npm test`: 20 test superati. SQLite reale in memoria/su file per persistenza, lease, concorrenza, idempotenza, reset e revoca delle versioni. Interfaccia eseguita in ambiente DOM simulato per nuovi incarichi, escaping, conferme vincolate alla versione/revisione visualizzata e invio al prefisso MCP nuovo.
- TypeScript: superato.
- Helper ufficiale `build-site.mjs`: build Vinext completata, sette endpoint compreso `/mcp`.
- Dipendenze: stesso lockfile dell'installazione già eseguita dal proprietario. L'installazione autonoma nella nuova cartella è bloccata da symlink/metadata offline del sandbox. Per il collaudo è stata usata una copia isolata del nuovo sorgente in `.sites-runtime/clara-bis-build` del checkout precedente, con risoluzione delle dipendenze già presenti e solo il percorso locale del comando build adattato. Nessuna modifica ai sorgenti o dati della vecchia app.
- Controlli visivi e live: NON superati né dichiarati completati. Computer Use si è fermato perché l'applicazione delle regole URL non è supportata per Firefox su Windows. L'anteprima locale HTML è solo uno strumento di revisione senza salvataggio.

## Blocco concreto
Il nuovo repository sorgente Sites restituisce lo stesso errore di rete (`getaddrinfo() thread failed to start`). Il nuovo Site non elimina la limitazione di questo ambiente. Nessun commit è stato inviato al repository gestito di Sites e nessuna versione è stata pubblicata. Il backup GitHub è distinto dalla pubblicazione Sites. Nessun token scritto nei file.

## Prossimo passo verificabile
Da un ambiente con accesso al repository Sites: installare dal lockfile, ricostruire, usare `site-workflow.mjs` con credenziale temporanea per questo stesso project_id, pubblicare privatamente il commit realmente inviato. Aprire la pagina e il pannello ChatGPT, collaudare la persistenza e i consensi, quindi collegare e verificare una nuova schedulazione prima di attivare la coda. Conservare la vecchia Clara fino al risultato del collaudo. Nessun deploy su gbprof.it è autorizzato.
