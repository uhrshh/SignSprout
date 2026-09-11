import assert from 'node:assert/strict';
import fs from 'node:fs';
import {matchRule,type TimedBody} from '../app/recognition/motion';
const bank=JSON.parse(fs.readFileSync('public/models/static-signs.json','utf8'));
const pose=Array.from({length:33},()=>({x:.5,y:.5,z:0}));pose[0]={x:.5,y:.2,z:0};pose[11]={x:.35,y:.4,z:0};pose[12]={x:.65,y:.4,z:0};
const hand=(id:string)=>bank[id][0].map(([x,y]:number[])=>({x:.67+x*.065,y:.25+y*.065,z:0}));
const history:TimedBody[]=Array.from({length:12},(_,i)=>({time:i*100,frame:{pose,left:null,right:hand(i<6?'letter-S':'number-1'),aspect:1}}));
assert(matchRule(history,'understand'));
assert(!matchRule(history.map(f=>({...f,frame:{...f.frame,right:hand('number-1')}})),'understand'),'Already-pointing finger must not pass');
assert(!matchRule(history.map(f=>({...f,frame:{...f.frame,right:hand('letter-S')}})),'understand'),'Closed fist must not pass');
assert(!matchRule(history.map(f=>({...f,frame:{...f.frame,right:f.frame.right!.map(p=>({...p,y:p.y+.5}))}})),'understand'),'Wrong location must not pass');
console.log('PASS: UNDERSTAND closed-to-index transition near forehead; reject static pointing, static fist and wrong location. Synthetic hand fixture.');
const raw=fs.existsSync('research/gesture-references-with-aspect.json')?JSON.parse(fs.readFileSync('research/gesture-references-with-aspect.json','utf8')):{};
for(const [id,rows] of Object.entries(raw) as [string,any[]][]){
 if(id==='understand'||id.startsWith('number-')||!rows.length)continue;
 const samples:TimedBody[]=Array.from({length:24},(_,i)=>{const r=rows[Math.floor(i*rows.length/24)],points=(k:string)=>r[k]?.map(([x,y,z]:number[])=>({x,y,z}))||null;return {time:i*100,frame:{pose:points('pose'),left:points('left'),right:points('right'),aspect:r.aspect}}});
 for(const n of [8,12,18,24,40])assert(!matchRule(samples.slice(-n),'understand'),id+' must not pass UNDERSTAND');
}
console.log(Object.keys(raw).length?'PASS: other extracted reference signs do not trigger UNDERSTAND.':'SKIP: optional raw-reference audit; research landmarks are not present.');
