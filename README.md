# Clara bis

La nuova scrivania privata dei progetti di gbprof. Archivio vuoto e indipendente dalla vecchia Clara; interfaccia e strumenti MCP dedicati. Codice 1.0.0.

**Stato:** implementazione locale, 20 test e build superati. Il Site è registrato ma non ancora pubblicato: questo ambiente non raggiunge il repository sorgente gestito di Sites. Non è ancora pronta per sostituire la vecchia app.

## Flusso
1. Definisci il progetto con Libera: obiettivo, fonti, ambito e criteri.
2. Salva il contratto in Clara bis; l'affidamento alla coda è un'azione distinta.
3. Clara conserva risultati reali, checkpoint e il prossimo passo. La prosecuzione automatica richiede la schedulazione collegata e verificata; attualmente è disattivata.
4. Rivedi le consegne e la relativa anteprima Sites. Ogni versione conserva file, hash, commit, verifiche e limiti.
5. Approva una versione. Per gbprof.it serve un ulteriore consenso sulla versione esatta e sulla destinazione; una nuova versione invalida i consensi precedenti.

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
