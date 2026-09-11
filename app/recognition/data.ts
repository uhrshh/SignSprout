import type {StaticBank,GestureBank} from './matching';
let cache:Promise<{staticSigns:StaticBank;gestures:GestureBank}>|null=null;
export function loadReferences(){
 if(!cache)cache=Promise.all(['/models/static-signs.json','/models/gesture-signs.json'].map(async url=>{const r=await fetch(url);if(!r.ok)throw new Error('The sign reference library could not load.');return r.json()})).then(([staticSigns,gestures])=>({staticSigns:staticSigns as StaticBank,gestures:gestures as GestureBank})).catch(error=>{cache=null;throw error});
 return cache!;
}
