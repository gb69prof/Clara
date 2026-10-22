# Esecuzione programmata esistente

La coda è separata dalla conversazione della home. Questo intervento non ne cambia programmazione, dati o autorizzazioni.

Istruzioni versionate in `lib/clara-agent.mjs`, pubblicate a `/api/agent/instructions`. Coda leggibile con GET `/api/agent`; writer POST sullo stesso percorso. Acquisizione dell’accesso supportato: ad ogni run `sites_get_site` del Site collegato, conferma owner-private, token di servizio effimero inviato solo al suo URL nell’header `OAI-Sites-Authorization`. Mai token in codice, prompt, file, output o argomenti. L’accesso di servizio non impersona l’utente e non autorizza app esterne. Conservare tutti i controlli della piattaforma.

Il writer gestisce `claim`, `checkpoint`, `complete`, `continue`, `needs_input`; `configure` registra il task nativo dopo la sua creazione verificata. Claim atomico tramite CAS D1, lease di 20 minuti rinnovata dai checkpoint, deduplicazione con requestId stabile. Le lease scadute vengono recuperate dal controllo successivo. Non è un processo continuo: latenza fino al controllo orario, più eventuali incarichi precedenti e continuazioni. Un task salvato prova la programmazione; soltanto una run cloud riuscita prova la disponibilità dei suoi strumenti e la consegna.

Ogni run deve scaricare le istruzioni aggiornate, produrre contenuto effettivo, salvare checkpoint e consegna, quindi rileggere il risultato. Nessuna bozza dimostrativa automatica se la coda è vuota. Se mancano materiali essenziali, mettere in pausa con una domanda al docente. Fonti soltanto se realmente consultate; risultati e fonti vanno revisionati prima dell’uso didattico.

