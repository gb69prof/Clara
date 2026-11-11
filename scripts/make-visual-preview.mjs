// Local UI review only: no service calls and no changes to the production seed.
import fs from 'node:fs';
import path from 'node:path';
import {seed} from '../lib/clara-domain.mjs';
const state={state:seed(),revision:1,resetPreview:{revision:1,counts:{projects:0,versions:0,checkpoints:0,jobs:0}}};
const bridge=`window.ClaraTransport={load:async()=>(${JSON.stringify(state)}),capabilities:()=>({canMessage:false}),command:async()=>{throw Error('Anteprima visiva: salvataggio disattivato.');}};`;
const css=fs.readFileSync('public/styles.css','utf8'),js=fs.readFileSync('public/app.js','utf8');
const image='data:image/png;base64,'+fs.readFileSync('public/assets/clara-reference.png').toString('base64');
const html=fs.readFileSync('public/index.html','utf8').replace(/<script defer[^>]*><\/script>/g,'').replace(/<link rel="stylesheet"[^>]*>/,()=>'<style>'+css+'</style>').replace('</body>',()=>'<script>'+bridge+js.replaceAll('assets/clara-reference.png',()=>image).replaceAll('</script','<\\/script')+'</script></body>');
fs.mkdirSync('work',{recursive:true});fs.writeFileSync(path.resolve('work/visual-preview.html'),html);
