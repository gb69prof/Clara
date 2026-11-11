import {readFile,lstat,realpath,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {relativeFile,sha256} from '../lib/clara-production.mjs';
import {isPrivatePath} from '../lib/private-paths.mjs';
// Copies only the exact manifest into a new empty directory. Never uploads.
export async function exportProject(root,manifest,destination){
 const base=await realpath(root),target=path.resolve(destination);
 if(target===base||target.startsWith(base+path.sep))throw new Error('Esporta fuori dal sorgente.');
 if(!Array.isArray(manifest.files)||!manifest.files.length)throw new Error('Manifest vuoto.');
 const output=[],seen=new Set();
 for(const file of manifest.files){
  const name=relativeFile(file.path),key=name.toLowerCase();
  if(isPrivatePath(name)||seen.has(key))throw new Error('File privato o duplicato: '+name);seen.add(key);
  let source=base;
  for(const part of name.split('/')){source=path.join(source,part);if((await lstat(source)).isSymbolicLink())throw new Error('Link non consentito: '+name);}
  const actual=await realpath(source);if(!actual.startsWith(base+path.sep)||!(await lstat(actual)).isFile())throw new Error('File fuori dal sorgente.');
  const bytes=await readFile(actual);if(createHash('sha256').update(bytes).digest('hex')!==sha256(file.sha256))throw new Error('Hash diverso: '+name);
  output.push({name,bytes});
 }
 // mkdir without recursive refuses existing directories, including old exports.
 await mkdir(target);
 for(const {name,bytes} of output){const dest=path.join(target,...name.split('/'));await mkdir(path.dirname(dest),{recursive:true});await writeFile(dest,bytes,{flag:'wx'});}
 return {directory:target,files:output.map(f=>f.name),excluded:['REPORT.md']};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const [root,manifest,destination]=process.argv.slice(2);
 if(!root||!manifest||!destination)throw new Error('Uso: node scripts/export-project.mjs <sorgente> <manifest.json> <nuova-cartella>');
 console.log(JSON.stringify(await exportProject(root,JSON.parse(await readFile(manifest,'utf8')),destination)));
}
