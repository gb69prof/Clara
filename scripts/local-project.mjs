// Work-mode handoff to the same local archive. No scheduler or external credentials.
import fs from 'node:fs';
import {openLocalDatabase} from '../lib/clara-local.mjs';
import {readState,command} from '../lib/clara-store.mjs';
const [op,arg]=process.argv.slice(2),db=openLocalDatabase();
try{
  if(op==='read'){
    const v=await readState(db);
    if(arg){const p=v.state.projects.find(p=>p.id===arg);if(!p)throw Error('Progetto non trovato.');console.log(JSON.stringify({revision:v.revision,project:p,memories:v.state.memories},null,2));}
    else console.log(JSON.stringify({revision:v.revision,projects:v.state.projects.map(p=>({id:p.id,title:p.title,status:p.status}))},null,2));
  }else if(op==='apply'&&arg){
    const payload=JSON.parse(fs.readFileSync(arg,'utf8'));
    if(!['checkpoint','save_artifact'].includes(payload.op))throw Error('L’esecutore locale può salvare solo checkpoint e consegne. I consensi restano nella UI.');
    const result=await command(db,{...payload,source:'chatgpt',requestId:payload.requestId||crypto.randomUUID()});
    console.log(JSON.stringify({revision:result.revision,projectId:payload.projectId,artifactId:result.artifactId||null},null,2));
  }else throw Error('Uso: node scripts/local-project.mjs read [ID] | apply percorso-comando.json');
}finally{db.close();}
