# REPORT.md — Clara 2.0 · Riavvio e primo aggiornamento
**Data:** 11 novembre 2026  
**Stato:** parzialmente implementato; il Site originale non è stato modificato nel codice.

## Obiettivo
Riconvertire Clara da prototipo dimostrativo a esecutrice di progetti con continuità fra sessioni, checkpoint, collaudo su Sites e pubblicazione su gbprof.it soltanto con approvazione; escludere tutte le precedenti attività.

## Operazioni eseguite
1. Consultati lo stato della scrivania Clara, la coda IA, i progetti e le memorie correnti.
2. Annullati i **sei** incarichi esistenti (4 azioni di annullamento aggiuntive, 2 già annullati). Verificati 6 stati `annullato`, 0 pending e 0 active.
3. Aggiornate due istruzioni della memoria di Clara e salvata una nuova decisione di riavvio che vieta di riprendere incarichi storici.
4. Aggiornata l'automazione `Automation_084ecea05bfc81918e81d6c68add1c3b` (oraria, Europe/Rome) con produzione per fasi, checkpoint, riaccodamento e blocco pubblicazione senza consenso. Lo scheduler risulta abilitato.
5. Aggiornata la skill `clara-orchestratore` nel plugin originale Sites `plugin_asdk_app_sites_99fcca34b9f48191be97bb7752c0ac6a` alla versione `2.0.0`, salvata e riletta.
6. Documentato qui il contratto da implementare nel Site originale, con test di accettazione nel file `docs/CLARA-2-0-CONTRATTO.md`.

## Riscontri
- Verifica del servizio Clara: sei progetti annullati, nessuno in attesa o in esecuzione; memoria aggiornata (revisione 53).
- Plugin Creator: release `pluginrel_6af40c4067588191af9c8e3117d85f48`, versione 2.0.0, file della skill riletto.
- Automations: aggiornamento della definizione confermato. La semplice modifica del prompt non prova la riuscita di una futura esecuzione con strumenti collegati.
- GitHub: questo documento e il contratto sono modifiche in branch da esaminare, **non** un deploy del Site.

## Limiti / questioni irrisolte
- L'API esposta attualmente da Clara consente `cancel`, ma **non** `delete_project` o `reset_projects`: le vecchie schede sono ancora archiviate e possono comparire nell'interfaccia.
- In questa sessione non è accessibile l'editor sorgente di ChatGPT Sites; la struttura del database e il codice dell'app esistente non sono modificabili attraverso gli strumenti disponibili.
- L'anteprima di produzione in Sites, la connessione completa a GitHub e il publish-gate non sono stati collaudati end-to-end; le regole aggiornate non sostituiscono un backend.
- Non è stata effettuata alcuna pubblicazione né alcuna modifica ai materiali didattici esterni.

## Decisioni e prossimi controlli
Conservare l'identità del Site originale e la sua relazione col plugin; non sostituirlo con una seconda Clara. Quando è accessibile l'editor originale: implementare reset amministrativo atomico, persistenza dei checkpoint, integrazioni di sviluppo e anteprima; poi eseguire i 10 test di accettazione prima di dichiarare la nuova versione pronta.

**Avvertenza di distribuzione:** questo REPORT.md resta nel repository e non deve essere esposto da gbprof.it.


## Verifica nella successiva sessione Work — 11 novembre 2026
- La scrivania originale risulta attiva alla versione Sites 10; è stata individuata la cronologia delle versioni 1–10, utile a un eventuale ripristino del codice. Questo non equivale a un backup o ripristino verificato dei dati D1.
- Il database D1 ha binding `DB` e tabella `clara_workspace`; la riga dello spazio privato contiene dati dei progetti. La lettura restituita è troncata: non è una verifica completa di tutti i contenuti.
- Gli strumenti di Clara confermano sei progetti annullati, zero in coda e zero attivi; la coda restituisce ancora tre vecchie consegne. Non è avvenuta alcuna cancellazione fisica.
- Confermata una sola automazione collegata al Site, abilitata ogni ora; la registrazione dell'ultima esecuzione non dimostra la riuscita del ciclo di produzione richiesto.
- Ottenuto l'accesso temporaneo al repository sorgente del Site tramite Sites, ma l'apertura del sorgente dal runtime Work è fallita per errore di rete `getaddrinfo() thread failed to start`. L'alternativa attraverso il browser Windows non è stata disponibile perché l'applicazione ha interrotto Computer Use: manca il supporto all'applicazione delle regole sugli URL per quel browser.
- Non sono stati creati incarichi di test: senza reset disponibile non sarebbe possibile assicurare la pulizia richiesta. Non sono stati modificati codice, database, plugin o applicazione, né pubblicato nulla su gbprof.it. Non esistono nuovi test end-to-end superati in questa sessione.
- Passo necessario: riprendere il lavoro in un ambiente Work con accesso di rete al repository sorgente di Sites e browser supportato, quindi implementare reset e modifiche nel Site originale, collaudare e verificare il database e l'interfaccia. Nessuna approvazione aggiuntiva del docente è richiesta per le modifiche e il reset già autorizzati; la pubblicazione su gbprof.it rimane soggetta a consenso esplicito sulla versione esatta.
