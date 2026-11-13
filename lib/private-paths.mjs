// Defense in depth; production packages must also omit these files entirely.
export function isPrivatePath(pathname){
 let path=pathname;
 try{for(let i=0;i<3;i++){const next=decodeURIComponent(path);if(next===path)break;path=next;}}catch{return true;}
 return path.replaceAll('\\','/').split('/').some(segment=>segment.toLowerCase()==='report.md'||segment.startsWith('.'));
}
