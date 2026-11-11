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

## Ripresa dal PC Windows — 11 novembre 2026
**Esito:** accesso all'app riuscito; accesso al sorgente ancora bloccato. Nessuna modifica al codice o ai dati del Site.

| Controllo | Evidenza di questa sessione |
| --- | --- |
| PR di partenza | #3, branch `feat/clara-2-esecutrice-persistente`, commit `c0352c50aab34aa1999cdaa3ff775509609658f7`; letti AGENTS.md, contratto e report |
| Repository GitHub | Accessibile tramite connettore; sia main sia il branch della PR contengono solo documentazione, nessun sorgente dell'app |
| Repository originale Sites | Credenziale temporanea ottenuta; apertura con helper ufficiale `site-workflow.mjs` fallita con `getaddrinfo() thread failed to start` (uscita 1). Stesso errore per il clone di GitHub |
| Identità dell'app | Site `appgprj_6acb4747a00881919a0f293cbce0b739`, proprietario confermato, accesso privato conservato; versione 10, sorgente dichiarato `b0b0bb23d806331fe30c18d3d39d87bc95358770` |
| Archivio versione 10 | Metadati disponibili (78 file, 3.758.080 byte); nessun download del pacchetto disponibile attraverso i comandi Sites esposti. Non recuperato né ispezionato |
| API Clara | Revisione 53: 6 progetti annullati, 0 pending, 0 active, 3 consegne storiche ancora restituite |
| Interfaccia | Accesso con ChatGPT riuscito nel browser integrato; pagina Progetti ispezionata e dettaglio Foscolo aperto. Sei schede annullate ancora visibili; dettaglio con bozza, checkpoint e cronologia conservati. Nessun comando di eliminazione disponibile nelle viste ispezionate |
| Automazione | Una sola automazione oraria collegata, abilitata; nessuna nuova esecuzione di produzione collaudata |

### Decisioni, limiti e ripresa
- La verifica del browser supera il precedente problema di accesso all'interfaccia, ma non fornisce un editor del backend e non sblocca Git.
- Confermata l'autorizzazione del docente ad aggiornare l'app originale e cancellare definitivamente i sei incarichi. Non occorre richiederla di nuovo.
- Nessun reset, nuovo incarico, modifica del plugin, pubblicazione Sites o deploy su gbprof.it effettuato. Nessuna nuova funzione o prova end-to-end dichiarata riuscita; il test 1 del contratto resta non soddisfatto.
- Aggiornati soltanto questo report e la descrizione del blocco nel contratto, sul branch della PR #3, attraverso il connettore GitHub; nessuna modifica a main.
- Per riprendere serve un ambiente capace di leggere **e scrivere** il repository Git originale di Sites tramite il flusso supportato. Primo passo: nuova credenziale temporanea, apertura del sorgente originale, lettura del codice e delle regole locali; poi reset atomico e collaudo dei requisiti. Una copia di documentazione o il solo accesso alla scrivania non bastano.
- La pubblicazione su gbprof.it resta vietata fino a un'autorizzazione riferita alla versione esatta. REPORT.md deve rimanere escluso dal pacchetto pubblico.


## Correzione della ricognizione dei branch — 11 novembre 2026
- Il docente ha eseguito nel proprio PowerShell `git ls-remote https://github.com/gb69prof/Clara.git HEAD` con successo: HEAD `0574a3665d2000c38ebcd94e8f247f2c1c9aed9a`. Questo verifica GitHub dal terminale del PC, non ancora il repository privato Sites.
- **Correzione:** la precedente affermazione secondo cui il repository contiene soltanto documentazione era incompleta. Vale per main e per la PR #3, ma **la PR #2, branch `feat/clara-live-integration`, contiene il sorgente dell'app**, incluse interfaccia, API, persistenza D1, server MCP e test. La verifica precedente aveva omesso gli altri branch.
- Sorgente GitHub identificato al commit `4d1c9442b4de00d6d911155e215676ce12ab1812`; `.openai/hosting.json` conferma l'identità del Site originale. La PR #2 documenta il commit Sites `b0b0bb23d806331fe30c18d3d39d87bc95358770` e la stessa versione 10 restituita da Sites. Il collegamento è documentato, non ancora verificato mediante confronto byte per byte col repository privato.
- Il codice è leggibile dal connettore GitHub. Preparato il passaggio di clone manuale dal PC in una nuova cartella locale; clone non ancora osservato. Lo sviluppo può proseguire da questa copia, mantenendo il contratto della PR #3; la sincronizzazione finale con Sites resta da risolvere e verificare.
