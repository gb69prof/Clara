# Home essenziale di Clara

## Scelte e riferimento visivo

La home segue il riferimento fornito dal docente: titolo serif blu scuro, figura centrale in un ambiente luminoso, pannello morbido bianco/azzurro con microfono dominante, campo di scrittura e tre accessi in una fascia secondaria. Non vengono aggiunte statistiche, menu laterali o sezioni amministrative.

`public/assets/clara-reference.png` è l'allegato originale. Un viewport SVG mostra soltanto la fotografia (coordinate `0 105 1448 365`), escludendo titolo e comandi disegnati nel riferimento. L'immagine non viene deformata né ritoccata. Tutti i controlli visibili sono HTML interattivo, non aree cliccabili sovrapposte a uno screenshot. Il ritaglio mantiene la stessa Clara anche su schermi stretti. L'immagine originale pesa circa 2 MB; una futura fotografia sorgente senza UI potrà sostituirla mantenendo questa composizione.

Non sono richiesti font remoti, CDN, framework o dipendenze runtime. La home resta integrabile con il progetto ospitato senza imporre un nuovo framework. I blocchi hero, interazione, risposta, accessi e dialogo sono separati semanticamente; comportamento, configurazione e adattatore di servizio sono in moduli distinti.

## Interazione e dati

- La scelta Vivavoce/Scritta riguarda la richiesta scritta. Parla con Clara invia invece una richiesta con modalità `voice` dopo la fine della dettatura.
- La sintesi vocale legge la risposta anche in demo. Il testo resta visibile per accessibilità e recupero in caso di audio bloccato.
- La pagina non richiede automaticamente il microfono. Il browser gestisce il permesso al primo tocco.
- Il riconoscimento vocale può trasferire audio al fornitore del browser: non è garantito offline. La nota vicino alla home lo segnala.
- Non vengono usati localStorage, analytics o salvataggi di conversazioni. La demo non chiama un servizio AI. Le richieste restano solo nella pagina corrente.
- Un testo già scritto non viene cancellato dalla dettatura: le parole riconosciute vengono aggiunte e inviate insieme al testo presente. Il campo resta disponibile dopo la risposta; svuotarlo per iniziare una richiesta separata.
- Il massimo è 4000 caratteri per richiesta; attesa massima del servizio 30 secondi. Errori HTTP, risposta malformata e annullamento non diventano risposte simulate.
- `pagehide` interrompe riconoscimento, audio e richiesta pendente. I callback di sessioni vocali precedenti vengono ignorati.
- I pannelli secondari dichiarano l'assenza di contenuti collegati. Lo spunto inserisce un inizio di richiesta solo se il campo è vuoto.

## Contratto del servizio futuro

`assistantEndpoint: null` attiva la demo. Impostare una route dello stesso dominio solo dopo avere implementato e collaudato il backend; non è sufficiente inserire una chiave di un modello nel front-end. Nessuna integrazione del plugin ChatGPT viene presunta o creata automaticamente.

La chiamata è `POST`, con credenziali di sessione dello stesso sito e `Content-Type: application/json`:

```json
{ "message": "Prepara una lezione…", "responseMode": "text" }
```

Risposta attesa:

```json
{ "reply": "Testo della risposta di Clara…" }
```

Il backend deve gestire identità, autorizzazione, protezione CSRF, rate limiting e limiti di payload; tenere le chiavi sul server e rispettare la revisione del docente per azioni e materiali. Un 401 mostra l'invito ad accedere, ma questa versione non implementa una pagina di login. Le route delle aree devono essere HTTP(S) dello stesso dominio; anche i percorsi relativi alla sottocartella sono supportati.

## Verifiche eseguite

- `npm run check`: sintassi dei tre moduli valida.
- `npm test`: sei test superati (demo senza rete, contratto e modalità, restrizione dell'origine, validazione input, errori/risposte invalide, abort).
- Server di anteprima avviato. L'ambiente ha bloccato l'accesso del browser: non è stata possibile una verifica visiva o interattiva. Nessuna prova acustica o su iPad fisico eseguita.

## Collaudo manuale prima del rilascio

1. Aprire la home a 1440, 1024, 768, 390 e 320 px. Controllare volto, assenza di scrollbar orizzontali e comandi non tagliati; verificare anche zoom 200%.
2. Usare solo la tastiera: link di salto, microfono, campo, radio con frecce, invio, tre accessi. Nei dialoghi verificare focus, Escape e ritorno al controllo di apertura.
3. Inviare una richiesta vuota, solo spazi, una richiesta normale e una con caratteri `< > &`. Nessuna stringa deve essere interpretata come HTML.
4. Provare entrambe le modalità di risposta, ascolto manuale, interruzione, nuova richiesta durante la lettura e cambio a Scritta.
5. Su HTTPS/localhost provare permesso microfono accordato/negato, silenzio, interruzione volontaria e browser senza SpeechRecognition. Verificare la scrittura come alternativa.
6. Sul backend di staging provare risposta valida, 401, 500, JSON invalido, rete assente e attesa oltre 30 secondi; confermare che il testo non si perda e l'invio torni disponibile.
7. Provare Safari su iPad e almeno un browser desktop. Non dichiarare supporto vocale universale senza queste prove.

## Pubblicazione

Il contenuto da ospitare è `public/`. Nessun servizio worker, deploy automatico o modifica al plugin è incluso. Verificare prima hosting, route, permessi e integrazione, come richiesto da AGENTS.md. La PR resta il confine della consegna di questo intervento.
