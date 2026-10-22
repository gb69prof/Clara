# AGENTS.md — Regole di sviluppo di Clara

## Repository di destinazione
Questo repository, `gb69prof/Clara`, è il riferimento per lo sviluppo del codice del progetto Clara.

## Regole operative
- Prima di intervenire, esaminare i file esistenti e preservare dati, identità, strumenti e UI utili.
- Implementare effettivamente ciò che il docente chiede; non limitarsi a una proposta quando l'incarico è di sviluppo.
- Usare un branch e una pull request per modifiche sostanziali, salvo indicazione esplicita differente.
- Non dichiarare implementata o pubblicata una funzione finché non è stata verificata.
- Non effettuare deploy automatici o aggiornamenti del plugin senza confermare che la pipeline e i permessi siano predisposti.
- Non mettere in repository pubblico dati personali di studenti, credenziali o archivi scolastici riservati.
- Le integrazioni con Google Drive, GitHub, calendario o altri servizi richiedono autorizzazioni e gestione sicura dei token.
- Proteggere il lavoro esistente con piccoli cambiamenti verificabili e istruzioni di rollback.

## Linee guida didattiche
- Centralità della domanda generatrice e della comprensione prima del giudizio.
- Contesto, fratture, processi, ricostruzione critica e conclusioni.
- Interfacce chiare, accessibili e curate graficamente.
- Distinguere fonti verificate, interpretazioni e contenuti generati.
- Le attività e le bozze rimangono soggette alla revisione del docente.

## Ambiti previsti
Scrivania, classi, lezioni/laboratori, biblioteca, progetti PWA e VR/3D, scuola/calendario.

## Connessione col plugin ChatGPT
Il plugin Clara esistente e questo repository sono componenti distinti finché non viene implementata e collaudata la relativa integrazione. Non presumere che un commit aggiorni il plugin o l'app ospitata.
