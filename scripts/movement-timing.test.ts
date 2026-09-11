import assert from 'node:assert/strict';
import fs from 'node:fs';
import {matchAttempt} from '../app/recognition/attempts';
import {movementKeyframes,type GestureBank} from '../app/recognition/matching';
const bank:GestureBank=JSON.parse(fs.readFileSync('public/models/gesture-signs.json','utf8'));
for(const id of ['want','help','again','slow','understand','learn','deaf','hearing']){
 const path=bank[id][0];
 for(const repeat of [1,3,12]){
  const observations=path.flatMap((value,i)=>Array.from({length:repeat},(_,j)=>({value,time:(i+j/repeat)*800})));
  assert(matchAttempt(observations,bank,id).matched,`${id} with ${repeat} observations per pose`);
  assert.equal(movementKeyframes(observations.map(o=>o.value)).length,movementKeyframes(path).length,'Pauses do not add movement evidence');
  assert(!matchAttempt(observations.map(o=>({...o,value:path[0]})),bank,id).matched,'Repeated still pose cannot unlock '+id);
 }
}
console.log('PASS: affected signs retain acceptance across 1x, 3x and 12x observation density; still poses stay rejected. Synthetic/reference-derived timing tests, not live signing validation.');
