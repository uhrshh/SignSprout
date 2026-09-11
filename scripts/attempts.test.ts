import assert from 'node:assert/strict';
import fs from 'node:fs';
import {matchAttempt,type TimedFeature} from '../app/recognition/attempts';
import {matchGesture,mirrorFeature,type GestureBank} from '../app/recognition/matching';
const bank:GestureBank=JSON.parse(fs.readFileSync('public/models/gesture-signs.json','utf8'));
const targets=['want','help','again','slow','understand','learn','deaf','hearing'];
for(const id of targets){
 const reference=bank[id][0];
 const clip:TimedFeature[]=Array.from({length:6},(_,i)=>({time:i*180,value:structuredClone(reference[Math.round(i/5*(reference.length-1))])}));
 assert(matchGesture(clip.map(f=>f.value),bank,id).matched,'Movement must not require eight camera frames');
 assert(matchAttempt(clip,bank,id).matched,'Short observed attempt '+id);
 assert(matchAttempt(clip.map(f=>({...f,value:mirrorFeature(f.value)})),bank,id).matched,'Mirrored '+id);
 // Hands getting into position must not contaminate a completed attempt.
 const prep=Array.from({length:12},(_,i)=>({time:(i-12)*180,value:{...clip[0].value,positions:[[2,3],[-2,3]]}}));
 assert(matchAttempt([...prep,...clip],bank,id).matched,'Ignore preparation '+id);
 assert(!matchAttempt(clip.map(f=>({...f,value:clip[0].value})),bank,id).matched,'Still pose '+id);
 assert(!matchAttempt(clip.map((f,i)=>({...f,time:i*30})),bank,id).matched,'Too brief '+id);
 assert(!matchAttempt(clip.map((f,i)=>({...f,time:i*2500})),bank,id).matched,'Disconnected observations '+id);
 for(const wrong of Object.keys(bank).filter(k=>k!==id))assert(!matchAttempt(clip,bank,wrong).matched,id+' confused with '+wrong);
 if(['want','help','again','learn'].includes(id))assert(!matchAttempt(clip.map(f=>({...f,value:{...f.value,left:null}})),bank,id).matched,'Missing supporting hand '+id);
}
console.log('PASS: 8 affected signs at six observed frames; preparation, mirrors, wrong signs, stationary poses, too-short attempts, tracking gaps and missing supporting hands. Reference-derived logic tests, not independent signer accuracy.');
for(const [id,variants] of Object.entries(bank)){
 const reference=variants[0],clip=Array.from({length:24},(_,i)=>({time:i*100,value:reference[Math.round(i/23*(reference.length-1))]}));
 for(const wrong of Object.keys(bank).filter(k=>k!==id))assert(!matchAttempt(clip,bank,wrong).matched,id+' suffix accepted as '+wrong);
}
console.log('PASS: all 420 wrong-reference comparisons through the live attempt selector.');
