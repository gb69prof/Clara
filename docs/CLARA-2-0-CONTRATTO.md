# Clara 2.0 — Contratto di produzione, persistenza e collaudo
Stato del documento: 11 novembre 2026 · sviluppo in branch · **non è un deploy del Site**.

## Identità dei componenti
- **Sito esistente:** `https://clara-scrivania-gbprof.gbprof.chatgpt.site`. Conservare identità, grafica e URL quando verrà aggiornato il codice del Site.
- **App/plugin collegato:** `plugin_asdk_app_sites_99fcca34b9f48191be97bb7752c0ac6a`; la skill `clara-orchestratore` è stata aggiornata alla versione 2.0.0.
- **Esecutore:** automazione ChatGPT `Automation_084ecea05bfc81918e81d6c68add1c3b`, controllo orario Europe/Rome. Un turno non implica lavoro ininterrotto.
- **Repository:** `gb69prof/Clara` è la destinazione di sviluppo. `main` e la PR #3 contengono documentazione; il sorgente dell'app è nel branch `feat/clara-live-integration` (PR #2), commit `4d1c9442b4de00d6d911155e215676ce12ab1812`. La PR #2 documenta il deploy della versione Sites 10; non esiste un deploy automatico verificato da GitHub a Sites.
- **Pubblicazione finale:** repository del progetto didattico → gbprof.it, con controllo dell'esatta versione approvata.

## Decisione del docente
Libera + docente progettano contenuti e criteri; Clara realizza. Clara deve lavorare autonomamente su scelte esecutive e riprendere incarichi dopo la chiusura di ChatGPT. La pubblicazione finale avviene esclusivamente dopo assenso umano specifico per quella versione.

## Reset e nuova epoca
Il giorno 11/11/2026 i **sei** incarichi preesistenti sono stati annullati nel servizio Clara; la coda pendente e quella attiva sono vuote. Le schede storiche e i relativi allegati NON sono stati cancellati, perché l'interfaccia tool attuale espone `cancel` ma non `delete_project` o `reset_projects`. Qualsiasi esecutore deve ignorare incarichi antecedenti a questo reset; nessuna ripresa automatica.

### Requisito mancante nel Site (priorità zero)
Implementare un comando amministrativo `reset_all_projects` che:
1. Richieda autenticazione di proprietario e conferma esplicita di reset.
2. Mostri il numero di progetti, versioni, checkpoint e lavori da eliminare.
3. Arresti o invalìdi le lease e impedisca alla coda dell'esecutore di riprenderli.
4. Effettui una transazione atomica cancellando progetti, checkpoint, bozze, versioni, coda e log relativi; non cancelli asset esterni o altre collezioni non richieste.
5. Aggiorni la scrivania che deve apparire vuota.
6. Registri soltanto un evento tecnico minimo senza conservare contenuti dei vecchi progetti.
7. Verifichi via API e interfaccia che nessun incarico precedente sia visibile né eseguibile.

Il reset vero non è stato eseguito nel database del Site. Non indicarlo come completato.

## Stato dei progetti e passaggi consentiti
- `new` → `queued` solo dopo affidamento esplicito.
- `queued` → `running` tramite claim atomico con lease/idempotency key; due worker non possono prendere lo stesso lavoro.
- `running` → `queued` su `continue`, con checkpoint e passo successivo; o `blocked` su ostacolo essenziale.
- `running` → `review` solo quando è presente una consegna reale con riferimenti, controlli e limitazioni.
- `review` → `revision` su osservazioni del docente e poi nuova versione in `review`.
- `review` → `approved` con consenso esplicito sul contenuto esatto, hash o revisione.
- `approved` → `ready_to_publish` con **seconda autorizzazione** esplicita alla pubblicazione, che menzioni destinazione e versione.
- `ready_to_publish` → `published` esclusivamente dopo ricevuta di deploy e verifica post-deploy.
- Tutti gli stati non terminali → `cancelled` su richiesta del proprietario; nessun job cancellato può essere reclamato.

Non attribuire valore di collaudo a un badge di avanzamento.

## Esecuzione persistente
L'esecutore orario legge l'insieme di incarichi **nuovi e affidati**, riconcilia checkpoint, prende un solo incarico per run, svolge operazioni consentite e salva il progresso. La rinnovabilità della lease e l'idempotenza delle azioni devono essere verificate nell'app. In caso di errore, registrare cause, tentativi ed esito; riprovare solo operazioni sicure. Non inventare URL né file. Prima di aggiornare l'architettura dell'app, verificare la natura effettiva dei suoi storage e del deploy.

### Contratto minimo dell'incarico
```json
{
  "goal": "risultato osservabile",
  "scope": ["contenuti inclusi"],
  "sources": ["riferimenti consultabili"],
  "deliverable": "lezione | PWA | app | altro",
  "target": "Sites preview; successivo gbprof.it",
  "acceptance": ["criteri verificabili"],
  "security": "nessun dato identificativo degli studenti",
  "publish_authorized": false
}
```

### Contratto minimo del checkpoint
```json
{
  "project_id": "id",
  "run_id": "id",
  "stage": "fase in corso",
  "created_files": ["path, revisione, hash"],
  "verified": ["test eseguiti e ricevute"],
  "not_verified": ["test da fare"],
  "blockers": [],
  "next_action": "prossimo passaggio eseguibile",
  "publication_allowed": false
}
```

## Sites come anteprima
Usare il Site esistente come laboratorio navigabile quando il suo editor è accessibile. La skill del plugin non modifica l'app, né un commit sul repository ne aggiorna il codice. Prima di considerare la consegna valida, verificare che l'URL della preview apra davvero il prodotto e che l'app sia in grado di riprodurre gli stessi file e dati previsti nel deploy definitivo. Evitare dipendenze da servizi proprietari Sites non disponibili sul server finale, oppure progettare per tempo un adattatore verificato.

## GitHub e gbprof.it
Ogni progetto ha codice e contenuti sotto controllo versione, con branch di sviluppo e report `REPORT.md` accanto al materiale. Il `REPORT.md` deve restare nel repository, NON nel pacchetto distribuito su gbprof.it. Non modificare `main`, non avviare deploy e non alterare gbprof.it senza autorizzazione alla pubblicazione. Il documento di progetto non è una licenza di pubblicazione.

## Test di accettazione richiesti prima di dichiarare Clara 2.0 completa
1. **Reset:** la scrivania mostra 0 progetti dopo reset, API 0 elementi, coda 0 e nessuna ripresa di lavori storici.
2. **Nuovo incarico:** si crea un progetto dall'interfaccia e viene affidato esplicitamente; appare in coda una sola volta.
3. **Persistenza:** una prima corsa salva un checkpoint incompleto, si chiude la sessione, la corsa successiva riprende proprio dal checkpoint salvato.
4. **Produzione:** il worker genera davvero i file del progetto, conserva commit/ref e le prove di controllo.
5. **Anteprima:** il Site espone una preview navigabile e verificata, non un semplice resoconto in Markdown.
6. **Revisione:** l'utente può chiedere modifiche e confrontare versioni.
7. **Blocco publish:** senza approvazione esplicita non si modifica il sito pubblico, anche se la bozza è completa.
8. **Deploy controllato:** con approvazione sulla versione esatta avviene un deploy registrato, con verifica HTTP e contenuti.
9. **Report:** `REPORT.md` resta nel repository e non è accessibile dal sito pubblicato.
10. **Sicurezza:** nessun token esposto nel browser, nessun dato personale scolastico nel repository pubblico, reset protetto da ruolo amministrativo.

## Blocco attuale di integrazione
Il sorgente dell'app è stato individuato nel branch GitHub `feat/clara-live-integration` (PR #2), commit `4d1c9442b4de00d6d911155e215676ce12ab1812`. Il suo manifest conferma il Site originale e la PR #2 documenta il deploy della versione Sites 10. La precedente ricognizione aveva controllato solo main e la PR #3, producendo una conclusione incompleta, corretta nel REPORT.md. Il codice è ora leggibile tramite il connettore GitHub e può essere recuperato dal PC per proseguire lo sviluppo.

L'apertura del repository privato di Sites dal runtime dell'assistente continua a fallire con `getaddrinfo() thread failed to start`; il docente ha invece verificato l'accesso Git a GitHub dal proprio PowerShell. La sincronizzazione finale della copia modificata col repository originale Sites deve ancora essere risolta e verificata. Il browser integrato consente l'accesso all'app privata, non al sorgente del backend.

Il Site originale è ancora alla versione 10, con commit sorgente dichiarato `b0b0bb23d806331fe30c18d3d39d87bc95358770`. Sei incarichi risultano annullati ma non cancellati. Aggiornamento dell'app e reset definitivo sono già autorizzati; la pubblicazione su gbprof.it richiede consenso sulla versione esatta. **Questo documento non è una release funzionale della nuova app.**
