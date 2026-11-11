# Clara bis

Applicazione privata indipendente dalla vecchia Clara. Non migrare dati, non modificare né cancellare il Site precedente. La sua eventuale rimozione segue il collaudo online di Clara bis e la decisione del proprietario.

- Repository di lavoro: gb69prof/Clara, branch separato feat/clara-bis. Non confondere il backup GitHub con il repository sorgente gestito da Sites.
- Site: appgprj_6af4ac01ef9c819192a5e8e26f9a9bbd. Accesso riservato al proprietario; nessuna condivisione senza una nuova architettura di autorizzazione e isolamento per utente.
- Dati: tabella clarabis_workspace, riga clarabis-owner. Seed senza incarichi, note, scadenze o esempi. Tutti gli strumenti MCP iniziano con clarabis_.
- Ogni incarico richiede un contratto prima dell'affidamento: obiettivo, ambito, fonti, formato, destinazione dell'anteprima e criteri di accettazione.
- Salvare checkpoint reali e risultati verificabili. Nessuna progressione simulata o bozza spacciata per prodotto finito. La continuazione richiede un esecutore programmato realmente collegato e collaudato.
- Approvazione della consegna e autorizzazione a pubblicare sono consensi umani distinti, riferiti alla versione esatta. Una revisione o nuova consegna revoca i consensi precedenti. Non pubblicare su gbprof.it senza l'autorizzazione specifica.
- Conservare REPORT.md nel repository vicino al prodotto; escluderlo dagli asset pubblicati. Non inserire credenziali nei file, nei log, negli argomenti dei comandi o nel frontend.
- Verifiche: npm test, npm run typecheck, helper ufficiale Sites build-site.mjs, collaudo visivo e poi test dell'archivio e del plugin pubblicati. Documentare separatamente prove locali e live.
- Per riprendere leggere REPORT.md e CONTRATTO.md. Non ricreare il Site: esiste già e attende la prima pubblicazione.

## Prova locale
Il proprietario può usare http://127.0.0.1:4177/ avviando Apri-Clara-bis.cmd. Dati in data-local/workspace.sqlite, esclusi da Git. Leggere un incarico con `node scripts/local-project.mjs read ID`; salvare checkpoint o consegna con `node scripts/local-project.mjs apply file-comando.json`. Lo script accetta solo checkpoint e save_artifact; non sostituisce i consensi del docente. Nessuna sincronizzazione col Site e nessuna esecuzione automatica attiva.
