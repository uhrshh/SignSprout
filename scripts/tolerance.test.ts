import assert from 'node:assert/strict';
import fs from 'node:fs';
import {matchStatic,matchGesture,HoldGate,type StaticBank,type GestureBank,type BodyFrame} from '../app/recognition/matching';
import {recoverHands} from '../app/recognition/two-hands';
const statics:StaticBank=JSON.parse(fs.readFileSync('public/models/static-signs.json','utf8'));
for(const id of ['letter-A','letter-B','letter-C','letter-G','letter-L','letter-V','letter-Y']){
 const angle=10*Math.PI/180;const p=statics[id][0].map(([x,y],i)=>({x:200+100*(x*Math.cos(angle)-y*Math.sin(angle))+(i===8?7:0),y:250+100*(x*Math.sin(angle)+y*Math.cos(angle))}));
 assert.equal(matchStatic(p,statics),id,'Tilted/jittered '+id);
}
const gate=new HoldGate();gate.update(true,0);for(let t=100;t<=800;t+=100)gate.update(true,t);assert(gate.update(null,900).progress>0);assert(gate.update(true,1000).progress>0);for(let t=1100;t<1700;t+=100)assert(!gate.update(true,t).completed);assert(gate.update(true,1700).completed);
gate.reset();gate.update(true,0);gate.update(true,100);assert.equal(gate.update(null,500).progress,0);assert.equal(gate.update(true,600).progress,0);
const bank:GestureBank=JSON.parse(fs.readFileSync('public/models/gesture-signs.json','utf8'));
for(const id of ['name','meet','help','friend']){
 const reference=bank[id][0],sequence=Array.from({length:24},(_,i)=>structuredClone(reference[Math.floor(i*reference.length/24)]));
 for(const i of [6,7,15])sequence[i].left=null;
 assert(matchGesture(sequence,bank,id).matched,'Brief occlusion '+id);
 assert(!matchGesture(sequence.map(f=>({...f,left:null})),bank,id).matched,'One-hand-only '+id);
}
const pose=Array.from({length:33},()=>({x:.5,y:.5,visibility:1}));pose[11].x=.3;pose[12].x=.7;pose[15].x=.25;pose[16].x=.75;
const hand=(x:number)=>Array.from({length:21},(_,i)=>({x:x+i*.001,y:.5-i*.002}));
const left=hand(.25),right=hand(.75);const body:BodyFrame={pose,left,right:null,aspect:4/3};
const candidate=(points:typeof left)=>({score:.9,keypoints:points.map(p=>({x:p.x*640,y:p.y*480}))});
const recovered=recoverHands(body,[candidate(left),candidate(right)],640,480);assert(recovered.left&&recovered.right);assert.equal(recovered.right[0].x,.75);
assert.equal(recoverHands(body,[candidate(left)],640,480).right,null,'Never duplicate the visible hand');
assert.equal(recoverHands(body,[{...candidate(right),score:.1}],640,480).right,null,'Reject weak candidates');
const both=recoverHands({...body,left:null},[candidate(right),candidate(left)],640,480);assert.equal(both.left![0].x,.25);assert.equal(both.right![0].x,.75);
assert.equal(recoverHands({...body,pose:null},[candidate(right)],640,480).right,null);
console.log('PASS: tilt/jitter tolerance, paused hold without awarding uncertain frames, prolonged-loss reset, brief two-hand occlusion, permanent missing-hand rejection, wrist assignment, duplicate prevention and low-confidence rejection.');

const crossedPose=pose.map(p=>({...p}));crossedPose[16].x=.28;const nearHand=hand(.28);const overlapping=recoverHands({...body,pose:crossedPose},[candidate(left),candidate(nearHand)],640,480);assert.equal(overlapping.right?.[0].x,.28,'Do not discard a distinct hand just because wrists overlap');
