import assert from 'node:assert/strict';
import fs from 'node:fs';
import {cards} from '../app/course';
import {handFeature,matchStatic,matchGesture,bodyFeature,mirrorFeature,HoldGate,type StaticBank,type GestureBank,type BodyFrame} from '../app/recognition/matching';
import {matchLetterMotion,matchRule,type TimedHand,type TimedBody} from '../app/recognition/motion';
const bank:StaticBank=JSON.parse(fs.readFileSync('public/models/static-signs.json','utf8')),gestures:GestureBank=JSON.parse(fs.readFileSync('public/models/gesture-signs.json','utf8'));
assert.equal(Object.keys(bank).length,33);assert(Object.values(bank).every(v=>v.length>0));
const rules=['please','my','you','number-10'];
for(const c of cards.filter(c=>c.type==='sign'))assert(bank[c.id]||['letter-J','letter-Z',...rules].includes(c.id)||gestures[c.id],c.id+' missing recognizer');
assert.equal(handFeature(Array.from({length:21},()=>({x:0,y:0}))),null);
assert.equal(matchStatic(Array.from({length:21},()=>({x:NaN,y:2})),bank),null);
let staticCount=0;
for(const [id,samples] of Object.entries(bank)){
 const input=samples[0].map(([x,y])=>({x:x*100+200,y:y*100+300}));
 const detected=matchStatic(input,bank,id.startsWith('number-')?'number-':'letter-');
 assert.equal(detected,id,'Static reference '+id);staticCount++;
 assert.equal(matchStatic(input.map(p=>({x:800-p.x,y:p.y})),bank,id.startsWith('number-')?'number-':'letter-'),id,'Mirror '+id);
}
const gate=new HoldGate();assert.equal(gate.update(true,0).progress,0);for(let t=100;t<1500;t+=100)assert(!gate.update(true,t).completed);assert(gate.update(true,1500).completed);assert(!gate.update(true,1600).completed);
gate.reset();gate.update(true,0);gate.update(true,300);gate.update(false,400);assert.equal(gate.update(true,500).progress,0);assert.equal(gate.update(true,2000).progress,0,'A stale inference gap resets hold');
assert.equal(bodyFeature({pose:null,left:null,right:null,aspect:4/3}),null);
assert(!matchGesture([],gestures,'hello').matched);
let dynamicCount=0;
for(const [id,variants] of Object.entries(gestures)){
 const reference=variants[0],sequence=Array.from({length:24},(_,i)=>reference[Math.floor(i*reference.length/24)]);
 const result=matchGesture(sequence,gestures,id);
 assert(result.matched,id+' reference failed: '+JSON.stringify(result));dynamicCount++;
 assert(matchGesture(sequence.map(mirrorFeature),gestures,id).matched,id+' mirror rejected');
 for(const wrong of Object.keys(gestures).filter(x=>x!==id))assert(!matchGesture(sequence,gestures,wrong).matched,id+' falsely accepted as '+wrong);
}
function trajectory(path:number[][],tip:number):TimedHand[]{return path.map(([x,y],i)=>({time:i*100,points:Array.from({length:21},(_,j)=>j===tip?{x:x*100+200,y:y*100+100}:j===9?{x:200,y:200}:{x:200,y:100})}))}
const z=[[0,0],[.25,0],[.5,0],[.8,0],[1,0],[.75,.25],[.5,.5],[.25,.75],[0,1],[.25,1],[.5,1],[.8,1],[1,1]];
assert(matchLetterMotion(trajectory(z,8),'Z'));assert(matchLetterMotion(trajectory(z.map(([x,y])=>[-x,y]),8),'Z'));assert(!matchLetterMotion(trajectory(z.map((_,i)=>[0,i*.1]),8),'Z'));assert(!matchLetterMotion(trajectory(z.map(()=>[0,0]),8),'Z'));
const j=[[0,0],[0,.2],[0,.4],[0,.6],[0,.8],[.1,1],[.25,1.15],[.5,1.15],[.7,1],[.8,.8]];
assert(matchLetterMotion(trajectory(j,20),'J'));assert(!matchLetterMotion(trajectory(j.map(()=>[0,0]),20),'J'));
console.log(`PASS: ${staticCount} static reference cases and mirrors; ${dynamicCount} movement references and mirrors; ${dynamicCount*(dynamicCount-1)} wrong-word comparisons; blank/invalid input; J/Z trajectories; hold/reset/single award; complete course coverage. These are reference and logic tests, not independent-signer accuracy measurements.`);

const pose=Array.from({length:33},()=>({x:.5,y:.5,z:0}));pose[0]={x:.5,y:.2,z:0};pose[11]={x:.35,y:.4,z:0};pose[12]={x:.65,y:.4,z:0};
const open=bank['number-5'][0].map(([x,y]:number[])=>({x:.5+x*.07,y:.55+y*.07,z:0}));
const flat:BodyFrame={pose,left:null,right:open,aspect:1};const staticHistory:TimedBody[]=Array.from({length:24},(_,i)=>({frame:flat,time:i*100}));

const circle=staticHistory.map(({time,frame},i)=>({time,frame:{...frame,right:open.map(p=>({...p,x:p.x+Math.cos(i/23*Math.PI*2)*.045,y:p.y+Math.sin(i/23*Math.PI*2)*.045}))}}));
const pointing=bank['number-1'][0].map(([x,y]:number[])=>({x:.5+x*.07,y:.45+y*.07,z:0}));for(let i=6;i<=8;i++)pointing[i].z=-(i-5)*.04;
const youHistory=staticHistory.map(({time,frame})=>({time,frame:{...frame,right:pointing}}));
const fist=bank['letter-A'][0].map(([x,y]:number[])=>({x:x*.07,y:y*.07,z:0}));for(let i=1;i<=4;i++){const [x,y]=bank['letter-Y'][0][i];fist[i]={x:x*.07,y:y*.07,z:0};}
const tenHistory=staticHistory.map(({time,frame},i)=>{const a=Math.sin(i/23*Math.PI*4)*.8;return {time,frame:{...frame,right:fist.map(p=>({x:.5+p.x*Math.cos(a)-p.y*Math.sin(a),y:.5+p.x*Math.sin(a)+p.y*Math.cos(a),z:0}))}}});

assert(matchRule(staticHistory,'my'));assert(!matchRule(staticHistory,'please'));assert(!matchRule(staticHistory,'number-10'));assert(matchRule(circle,'please'));assert(matchRule(youHistory,'you'));assert(matchRule(tenHistory,'number-10'));assert(!matchRule(tenHistory.map(s=>({...s,frame:tenHistory[0].frame})),'number-10'));
for(const id of ['my','you','please','number-10'])assert(!matchRule([] ,id));
console.log('PASS: four geometric rule fixtures, absent input, stationary open palm vs PLEASE, and stationary thumb-up vs 10.');

for(const id of ['name','what','nice','meet','friend','want','help','again','learn']){const ref=gestures[id][0];const oneHand=Array.from({length:24},(_,i)=>({...ref[Math.floor(i*ref.length/24)],left:null}));assert(!matchGesture(oneHand,gestures,id).matched,'Missing second hand must reject '+id);}
