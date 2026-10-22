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

Il repository contiene la nuova **home essenziale di Clara**, in HTML, CSS e JavaScript senza dipendenze di produzione. Il riferimento visivo fornito dal docente guida la composizione: Clara in evidenza, comando vocale, scrittura con scelta Vivavoce/Scritta e tre accessi secondari.

Al momento dell'intervento il repository conteneva soltanto questo README e AGENTS.md: non c'erano una UI o componenti applicativi da migrare. Il codice dell'app e del plugin Clara esistenti resta ospitato separatamente. Questa home non modifica il plugin e non è ancora collegata ai suoi dati o servizi.

## Avviare la nuova home

Scaricare la branch `feat/clara-home-essenziale` (o `main` dopo il merge):

```sh
git clone --branch feat/clara-home-essenziale https://github.com/gb69prof/Clara.git
cd Clara
python3 -m http.server 4173 --bind 127.0.0.1 --directory public
```

Aprire **http://localhost:4173**. Su Windows, se Python è installato attraverso il launcher, usare `py -m http.server 4173 --bind 127.0.0.1 --directory public`. Con Node e Python disponibili si può usare anche `npm start`. Non occorrono `npm install`, build o chiavi API. Non aprire direttamente `index.html` con `file://`: i moduli JavaScript richiedono un server HTTP.

Per la pubblicazione futura basta servire la cartella `public/` con HTTPS. I percorsi relativi consentono anche una sottocartella. Il server Python è destinato alla sola anteprima locale.

## Cosa è attivo e cosa manca

| Funzione | Stato |
| --- | --- |
| Home, scrittura, scelta Vivavoce/Scritta | Implementate; risposta di esempio esplicitamente riconoscibile |
| Invio con Invia o Ctrl/Cmd + Invio | Implementato, con validazione e stato di attesa |
| Dettatura | Implementata tramite Web Speech API, disponibile solo nei browser/contesti compatibili e con permesso microfono |
| Lettura e interruzione della risposta | Implementate tramite sintesi vocale del browser, con pulsante per riascoltare |
| Lezioni, Materiali, Progetti | Accessi a pannelli informativi e spunti di scrittura; destinazioni reali configurabili |
| Risposte AI di Clara | Da collegare: la configurazione predefinita usa una demo locale dichiarata |
| Plugin, Drive, archivi e autenticazione | Non collegati; nessun contenuto reale viene recuperato o salvato |
| Conversazione vocale continua/realtime | Non implementata: il flusso è dettatura → risposta → lettura |

L'implementazione vocale non equivale a una prova audio superata su iPad: microfono e riproduzione vanno collaudati sul dispositivo di destinazione. Se la dettatura manca, la pagina propone la scrittura o il microfono della tastiera. Alcuni browser richiedono un nuovo tocco su **Ascolta risposta** dopo una richiesta asincrona. La risposta resta sempre leggibile.

## Collegamento all'app esistente

Modificare `public/js/config.js` solo quando il backend è disponibile:

```js
assistantEndpoint: '/api/chat',
areas: {
  lessons: '/lezioni/',
  materials: '/materiali/',
  projects: '/progetti/',
},
```

Questi sono esempi di contratto, **non route già esistenti**. L'endpoint deve essere sullo stesso dominio e accettare `POST` JSON `{ "message": "…", "responseMode": "voice" | "text" }`, restituendo `{ "reply": "…" }`. Il testo viene inserito in pagina come testo semplice, mai come HTML. In caso di errore la richiesta resta nel campo per poter riprovare.

Autenticazione, autorizzazioni, protezione CSRF, limiti delle richieste e accesso ai servizi esterni spettano al backend. Nessun token deve essere inserito nella configurazione pubblica. Vedere [note di integrazione e collaudo](docs/frontend.md).

## Struttura e verifiche

```text
public/
  index.html          Home semantica e pannelli secondari
  styles.css          Layout responsive, focus, palette e tipografia
  assets/             Riferimento visivo originale e favicon
  js/config.js        Punti di collegamento pubblici
  js/assistant.js     Adattatore demo / servizio reale
  js/app.js           Interazione, voce, stati ed errori
tests/                Test del contratto di integrazione
docs/frontend.md      Dettagli, limiti e checklist di rilascio
```

Con **Node.js 20 o successivo**:

```sh
npm run check
npm test
```

Controllo sintattico e sei test dell'adattatore superati. Il server di anteprima è stato avviato, ma l'ispezione nel browser di verifica è stata bloccata da una policy dell'ambiente: resa visiva desktop/mobile, tastiera e audio reale restano da verificare manualmente. Nessun deploy è stato effettuato.

## Rollback

La modifica è isolata in una branch e una PR. Prima del merge basta mantenere `main`. Dopo il merge, il revert della PR ripristina lo stato precedente; non è richiesta alcuna migrazione di dati. Un eventuale deploy futuro deve prevedere separatamente il ripristino della versione ospitata.
