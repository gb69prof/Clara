# Clara bis

## Stato corrente — codice 1.0.2
La coda locale dispone ora del collegamento a Work: «Affida a Clara», acquisizione esclusiva, checkpoint, ripresa e consegne scaricabili con copie e hash della versione. Un'automazione distinta, «Clara bis — esegui gli incarichi», controlla periodicamente la coda con il PC accessibile. La creazione dell'automazione e la prova locale sono riuscite; la prima esecuzione periodica indipendente deve ancora essere osservata. Non è un servizio continuo né una partenza immediata al clic.

28 test automatici superati. Le consegne locali prive di anteprima Sites restano esplicitamente incomplete per quel requisito e non autorizzano la pubblicazione. Per caricare il nuovo backend, chiudere la precedente istanza del server con Ctrl+C e riaprire Apri-Clara-bis.cmd (oppure lo stesso comando Node usato per avviarla). Dati e incarichi restano nello stesso database. ESECUTORE-LOCALE.md documenta il protocollo; i paragrafi successivi descrivono anche lo stato precedente.

La nuova scrivania privata dei progetti di gbprof. Archivio vuoto e indipendente dalla vecchia Clara; interfaccia e strumenti MCP dedicati. Codice 1.0.1.

**Stato:** disponibile sul PC con archivio SQLite persistente. 24 test automatici superati. La build della versione Sites è verificata separatamente. Il Site è registrato ma non ancora pubblicato: questo ambiente non raggiunge il repository sorgente gestito di Sites. Non è ancora pronta per sostituire la vecchia app.

## Flusso
1. Definisci il progetto con Libera: obiettivo, fonti, ambito e criteri.
2. Salva il contratto in Clara bis; l'affidamento alla coda è un'azione distinta.
3. Clara conserva risultati reali, checkpoint e il prossimo passo. La prosecuzione automatica richiede la schedulazione collegata e verificata; attualmente è disattivata.
4. Rivedi le consegne e la relativa anteprima Sites. Ogni versione conserva file, hash, commit, verifiche e limiti.
5. Approva una versione. Per gbprof.it serve un ulteriore consenso sulla versione esatta e sulla destinazione; una nuova versione invalida i consensi precedenti.

## Uso sul PC
Aprire `Apri-Clara-bis.cmd` e tenere aperta la finestra; poi visitare http://127.0.0.1:4177/. Richiede solo Node 22.13+, senza installazione di pacchetti aggiuntivi. Gli incarichi e le note sono salvati in `data-local/workspace.sqlite`, escluso da Git. Questa versione non si sincronizza con il Site.

Dal progetto scegliere **Lavora nella conversazione** per copiare il messaggio da incollare nella conversazione Work sul PC. L’assistente può leggere l’incarico e registrare checkpoint e consegne con `scripts/local-project.mjs`; approvazione e consensi restano nella scrivania. Non è una esecuzione automatica in background.

## Sviluppo
Node 22.13+ (test eseguiti con Node 24.14.1), pnpm 11.25.0 e lockfile incluso.

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm test
corepack pnpm typecheck
corepack pnpm dev
```

Per il pacchetto di produzione usare l'helper ufficiale Sites `build-site.mjs`; per salvare il sorgente sul Site usare `site-workflow.mjs` con il project_id già presente in `.openai/hosting.json`. Non creare un altro Site. Il branch GitHub è un backup del sorgente, distinto dal repository Sites.

`node scripts/make-visual-preview.mjs` crea una pagina locale di sola revisione in `work/visual-preview.html`: archivio vuoto, scritture disattivate e nessun collegamento ai dati live. Non è l'app operativa.

## Identità e accesso
Site `appgprj_6af4ac01ef9c819192a5e8e26f9a9bbd`; tabella D1 `clarabis_workspace`, riga `clarabis-owner`; strumenti MCP `clarabis_*`. Il confine di accesso è il Site privato del proprietario. Non abilitarne la condivisione senza implementare autorizzazioni e archivi per utente.

I file in `public/` sono l'interfaccia browser. `scripts/generate-ui.mjs` produce la risorsa incorporata per ChatGPT. Il ritratto è quello già approvato dal proprietario. Non sono presenti dati di esempio né un generatore di avanzamento simulato.

Leggere [CONTRATTO.md](CONTRATTO.md) e [REPORT.md](REPORT.md) per ambito, verifiche e ripresa del lavoro. REPORT.md rimane nel repository ed è escluso dalla pubblicazione. La vecchia Clara e i suoi dati restano intatti fino al collaudo della sostituta.
