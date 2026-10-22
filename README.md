# Clara — Scrivania didattica

Repository ufficiale di sviluppo di **Clara**, assistente didattica personale.

## Obiettivo

Coordinare classi, lezioni, laboratori, biblioteca, progetti PWA e ambienti didattici 3D/VR in una scrivania unica, con controllo e approvazione del docente.

## Flusso di sviluppo

1. Raccogliere la richiesta del docente e verificare i file esistenti.
2. Sviluppare in questo repository, preferibilmente in un branch dedicato.
3. Eseguire i controlli possibili e documentare ciò che non è stato verificato.
4. Presentare una pull request per la revisione, salvo esplicita richiesta di commit diretto.
5. Integrare la versione approvata con il plugin ChatGPT e con l'eventuale applicazione ospitata.

**Importante:** il plugin ChatGPT già esistente non viene modificato automaticamente da ogni commit GitHub. Per un deploy sincronizzato occorre configurare un'integrazione CI/CD o un processo di rilascio apposito.

## Sezioni previste

- Scrivania
- Le mie classi
- Lezioni e laboratori
- Biblioteca
- Progetti in corso
- Scuola e calendario

## Sicurezza e riservatezza

Questo repository è **pubblico**. Non inserire dati identificativi degli studenti, credenziali, token, registri scolastici, documenti riservati o file personali. Usare dati dimostrativi anonimizzati e variabili d'ambiente per i segreti.

## Stato

Configurazione iniziale del repository. Il codice dell'app Clara esistente è attualmente ospitato separatamente; l'eventuale migrazione deve essere svolta verificando prima il codice sorgente, l'hosting e i collegamenti già attivi.
