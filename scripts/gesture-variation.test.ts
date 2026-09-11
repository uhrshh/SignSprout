import assert from 'node:assert/strict';
import fs from 'node:fs';
import {matchGesture,mirrorFeature,type GestureBank,type GestureFeature} from '../app/recognition/matching';
const bank:GestureBank=JSON.parse(fs.readFileSync('public/models/gesture-signs.json','utf8'));
const targets=['want','help','friend','name','what','nice','again','slow','understand','learn','deaf','hearing'];
let failures=0;
for(const id of targets){
 const reference=bank[id][0];
 // Deterministic variation, not a recording of an independent signer.
 const varied:GestureFeature[]=Array.from({length:32},(_,i)=>{
  const f=structuredClone(reference[Math.round((i/31)**1.3*(reference.length-1))]);
  const angle=12*Math.PI/180;
  for(const side of ['left','right'] as const)if(f[side]){const p=f[side]!;f[side]=p.map((v,j)=>1.08*(j%2?p[j-1]*Math.sin(angle)+v*Math.cos(angle):v*Math.cos(angle)-p[j+1]*Math.sin(angle))+.01*Math.sin(i+j));}
  f.positions=f.positions.map(p=>p?[p[0]*1.08+.12,p[1]*1.08+.1]:null);
  return f;
 });
 const result=matchGesture(varied,bank,id);if(!result.matched){console.log('FAIL variation',id,result);failures++;}
 assert(!matchGesture(Array.from({length:32},()=>varied[0]),bank,id).matched,'Stationary pose '+id);
 for(const wrong of targets.filter(x=>x!==id))assert(!matchGesture(varied,bank,wrong).matched,`${id} accepted as ${wrong}`);
 assert.equal(matchGesture(varied.map(mirrorFeature),bank,id).matched,result.matched,'Dominant hand mirror '+id);
}
assert.equal(failures,0);
console.log('PASS: 12 affected signs with angle, size, placement and pace variation, mirrored signing, stationary-pose rejection and wrong-sign checks. Synthetic regression tests only.');
