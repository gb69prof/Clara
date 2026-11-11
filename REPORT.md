# REPORT.md — Clara 2.0

**11 novembre 2026 — codice implementato e verificato con test locali; aggiornamento del Site e reset live ancora bloccati.**

## Obiettivo e autorizzazioni
Aggiornare la Clara privata originale come esecutrice di progetti, con ripresa tra sessioni, consegne verificabili, anteprime e controllo umano della pubblicazione. Aggiornamento dell’app e cancellazione definitiva dei sei vecchi incarichi già autorizzati. Nessuna autorizzazione a pubblicare su gbprof.it.

## Lavoro svolto
- Recuperato il sorgente dal clone eseguito dal docente sul PC. Integrato il branch feat/clara-live-integration della PR #2 nella continuazione della PR #3. Conservati identità Sites, archivio D1, home, ritratto, conversazione e strumenti esistenti.
- Implementato reset_all_projects: riepilogo numerico, conferma e revisione esatta, scrittura atomica, cancellazione di progetti/versioni/checkpoint/log e cache delle richieste; nuova epoca che invalida creazioni e acquisizioni obsolete. Note, calendario, preferiti e configurazione della schedulazione restano conservati.
- Separati salvataggio e affidamento del contratto. Claim esclusivi, rinnovo della lease, chiavi idempotenti controllate rispetto al contenuto, checkpoint strutturati e ripresa della corsa successiva. Annullamenti non riattivabili.
- Aggiunte consegne con repository, commit, manifest SHA-256, anteprima Sites, versione, controlli e limiti. Le bozze di solo testo e le tracce guidate rimangono indicate come incomplete.
- Approvazione e consenso alla pubblicazione distinti, entrambi riferiti alla versione esatta; nuova versione, modifica o revisione li revocano. Preflight dei file consentiti; registrazione del deploy solo con ricevuta, commit, risposta HTTP 200, hash della pagina corrispondente e REPORT.md non accessibile.
- Interfaccia: contratto dell’incarico, nuovi stati, link all’anteprima, riscontri, confronto delle ultime due versioni, autorizzazione specifica e reset con conteggi. Schemi MCP aggiornati, con controllo anche dei campi annidati.
- Esportatore scripts/export-project.mjs: copia soltanto i file del manifest dopo verifica hash, rifiuta attraversamenti di directory, link simbolici e REPORT.md. Non esegue pubblicazioni. Aggiunta protezione del report nel Worker di Clara.

## Verifiche e riscontri
- Suite Node: **31 test superati**. Comprende persistenza reale su SQLite riaperto dopo chiusura, concorrenza, lease scadute, idempotenza, reset, invalidazione delle approvazioni, ricevute di pubblicazione, esclusione del report e DOM simulato dell’interfaccia.
- Le richieste HTTP nei test di pubblicazione usano risposte simulate: **nessun deploy reale** e nessuna richiesta a gbprof.it per questi test.
- Le prove dell’interfaccia verificano comandi e markup; non equivalgono a collaudo visivo. Il server locale di prova è partito, ma il collegamento dal terminale è negato (EACCES su loopback) e il browser integrato ha restituito timeout. Server di prova arrestato; nessun dato aggiunto al Site.
- **Dipendenze installate, TypeScript e build superati.** Il docente ha eseguito Corepack/pnpm 11.25.0 con lockfile congelato; l’assistente ha eseguito `npm run typecheck` (uscita 0) e la build ufficiale Sites (uscita 0, tutti i cinque passaggi Vinext completati). Verificati sintassi di `dist/server/index.js`, binding D1, manifest con identità originale e assenza di REPORT.md in dist. Nessuna versione delle dipendenze modificata. Per la build è stata usata la cache Corepack già installata sul PC; nessun download aggiuntivo.
- get_site riconferma proprietà, accesso al solo proprietario, versione Sites **10** e URL originale. Con credenziale temporanea nuova, l’helper ufficiale ha ancora fallito l’accesso al Git originale con `getaddrinfo() thread failed to start`. Build riuscita e accesso al sorgente remoto sono passaggi distinti; il deploy non è stato avviato.

## Limiti effettivi
- **Il Site originale non ha ancora ricevuto questo codice. I sei incarichi sono annullati ma non cancellati.** Ultima lettura live completa precedente: revisione 53, sei annullati, zero pending, zero active, tre consegne storiche.
- Nessun ciclo autonomo completo con produzione di un progetto, anteprima, chiusura della sessione e ripresa cloud è stato collaudato. La schedulazione preesistente resta attiva; una configurazione salvata non prova l’esecuzione.
- Le API validano la struttura dei riscontri della consegna; è l’esecutore a dover controllare davvero repository, file e anteprima. Una dichiarazione di test superato non è una verifica indipendente del codice. Il controllo post-deploy confronta la pagina iniziale, non tutti gli asset pubblici.
- GitHub e gbprof.it vengono usati dall’esecutore tramite strumenti disponibili e autorizzati: il browser di Clara non contiene credenziali né un accesso diretto al server. Il flusso esterno deve rispettare il preflight immediatamente prima del deploy.
- La protezione amministrativa dipende dall’accesso Sites riservato al solo proprietario e dal canale di servizio autorizzato. Non condividere l’app senza introdurre ruoli e separazione degli archivi.

## Ripresa concreta
1. Dipendenze, TypeScript e build ora completati. Resta il collaudo browser in una sessione in cui sia raggiungibile il server di anteprima.
2. Aprire il sorgente originale Sites con il flusso ufficiale in un ambiente con rete funzionante; confrontare la base con la copia GitHub, applicare questa modifica, costruire e aggiornare **lo stesso Site privato**.
3. Rileggere API e interfaccia, verificare i sei incarichi, eseguire il reset già autorizzato e verificare zero progetti, versioni e lavori recuperabili.
4. Aggiornare l’unica automazione esistente per leggere epoch, checkpoint e istruzioni v2. Collaudare una consegna reale e la ripresa in due corse. Conservare prove e aggiornare questo report.
5. Eseguire un deploy su gbprof.it soltanto dopo consenso del docente sulla versione esatta. Il test reale di pubblicazione resta sospeso fino a quel consenso.

## Fonti e decisioni
Contratto in docs/CLARA-2-0-CONTRATTO.md; sorgente PR #2 4d1c9442b4de00d6d911155e215676ce12ab1812; documentazione e stato Sites; test presenti nel repository. La ricognizione precedente aveva controllato soltanto main e PR #3: la conclusione “repository senza sorgente” era incompleta ed è stata corretta individuando PR #2. La provenienza dalla versione Sites 10 è documentata dalla PR #2, non ancora confrontata byte per byte col Git privato.

**REPORT.md resta nel repository e va escluso dal pacchetto pubblico.** Il reset applicativo cancella i dati operativi; non elimina eventuali esportazioni già scaricate né risorse esterne.
