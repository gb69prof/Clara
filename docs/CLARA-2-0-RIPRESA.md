# Ripresa di Clara 2.0

Questa copia conserva l’identità del Site originale. GitHub non pubblica automaticamente su Sites o gbprof.it.

## PC Windows
Dal PowerShell normale del docente:

```powershell
Set-Location "C:\Users\Utente\Documents\ChatGPT\Clara\clara-sorgente"
corepack pnpm install --frozen-lockfile
```

Non sostituire il lockfile o cambiare versioni se l’installazione fallisce. Dopo l’installazione:

```powershell
npm test
npm run typecheck
npm run build
npm run dev
```

Il dev server usa la porta 5173. Usare soltanto il database locale di prova: non copiare dati privati né credenziali di produzione. Il comando install:ci Linux preesistente richiede Bash; su Windows usare Corepack.

## Integrazione del Site
1. Verificare con Sites che appgprj_6acb4747a00881919a0f293cbce0b739 sia ancora privato del proprietario.
2. Ottenere una credenziale temporanea; passarla all’helper ufficiale tramite stdin senza stamparla o scriverla su disco. Aprire il Git originale in un checkout distinto.
3. Confrontare la base con feat/clara-live-integration e integrare la PR #3 senza sovrascrivere modifiche concorrenti. Conservare manifest, binding D1 e identità del plugin.
4. Completare build e collaudo; usare l’helper per commit/push/pacchetto e i comandi Sites per aggiornare lo stesso Site privato. Nessun deploy su gbprof.it in questo passaggio.
5. Controllare /api/health: productionVersion deve essere 2.0.0. Rileggere la scrivania e i conteggi, inviare reset_all_projects con expectedRevision attuale, confirm RESET_ALL_PROJECTS e UUID stabile. L’azione è già autorizzata dal docente.
6. Verificare API e UI vuote e rifiuto delle vecchie lease/epoch. Aggiornare l’automazione esistente, senza duplicarla, per usare le istruzioni v2.

## Prova di produzione
Creare un incarico di collaudo dichiarato con criteri misurabili. Prima corsa: file reali, checkpoint con hash e prossimo passo, poi continue. Seconda corsa: rilettura dei file, completamento e preview Sites realmente aperta. Conservare commit, versione della preview, controlli e limiti. Chiedere una revisione e confrontare le versioni. L’approvazione non autorizza la pubblicazione.

## Pubblicazione di un progetto didattico
Solo dopo consenso umano per versione e destinazione: leggere clara_publication con publication_preflight, controllare commit e file, costruire il pacchetto approvato. scripts/export-project.mjs crea una cartella nuova esterna al sorgente, verifica gli hash ed esclude REPORT.md. Per app dinamiche servono adattatore e collaudo specifici: l’esportatore copia file, non converte backend.

Registrare il deploy esterno con record_publication, versione, commit e ricevuta. Il server confronta HTTP e SHA-256 della pagina finale e verifica che REPORT.md restituisca 404/410. Un errore resta un blocco. Aggiornare REPORT.md con prove reali.

## Ripristino
Il codice Sites può tornare alla versione precedente conservata dalla piattaforma. Il reset è intenzionalmente irreversibile nell’app: il rollback del codice non ricrea i dati eliminati. Non ripristinare distruttivamente D1 per un semplice problema del codice.
