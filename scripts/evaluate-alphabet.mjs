import fs from 'node:fs/promises';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-cpu';
import {load} from '@tensorflow-models/hand-pose-detection/dist/tfjs/detector.js';
const sharp=(await import('../node_modules/.pnpm/sharp@0.34.5/node_modules/sharp/lib/index.js')).default;
globalThis.fetch=async input=>new Response(await fs.readFile('public/'+new URL(String(input)).pathname.slice(1)));
await tf.setBackend('cpu');await tf.ready();
const detector=await load({runtime:'tfjs',modelType:'lite',maxHands:1,detectorModelUrl:'https://local/models/detector/model.json',landmarkModelUrl:'https://local/models/landmark/model.json'});
// Capture normalized landmarks before the upstream public API removes depth.
let landmarks;const roi=detector.handLandmarksToRoi.bind(detector);detector.handLandmarksToRoi=(p,size)=>{landmarks=structuredClone(p);return roi(p,size)};
const meta=JSON.parse(await fs.readFile('research/alphabet/model.json'));
const bytes=await fs.readFile('research/alphabet/group1-shard1of1.bin');const buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
const weights=tf.io.decodeWeights(buffer,meta.weightsManifest[0].weights);const names=meta.weightsManifest[0].weights.map(w=>w.name);
const labels=JSON.parse(await fs.readFile('research/alphabet/labels.json'));
const results=[];
for(const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'){
 if('JZ'.includes(letter))continue;
 const {data,info}=await sharp('public/references/'+letter.toLowerCase()+'.jpg').resize({width:320}).extend({top:100,bottom:100,left:100,right:100,background:'#777'}).removeAlpha().raw().toBuffer({resolveWithObject:true});
 const image=tf.tensor3d(new Uint8Array(data),[info.height,info.width,3],'int32');landmarks=null;
 const hands=await detector.estimateHands(image,{staticImageMode:true});image.dispose();
 if(!hands.length||!landmarks){console.log(letter,'NO HAND');continue;}
 const feature=landmarks.flatMap(p=>[p.x,p.y,p.z]);
 const probs=tf.tidy(()=>{let x=tf.tensor2d([feature]);for(let i=0;i<6;i+=2){x=tf.add(tf.matMul(x,weights[names[i]]),weights[names[i+1]]);x=i<4?tf.relu(x):tf.softmax(x);}return Array.from(x.dataSync())});
 const ranked=probs.map((p,i)=>({label:labels[i],p})).sort((a,b)=>b.p-a.p);
 results.push({letter,landmarks,hands,ranked});console.log(letter,ranked.slice(0,3).map(x=>`${x.label}:${x.p.toFixed(2)}`).join(' '));
}
await fs.writeFile('research/alphabet/evaluation.json',JSON.stringify(results));detector.dispose();Object.values(weights).forEach(w=>w.dispose());
console.log('Correct',results.filter(r=>r.ranked[0].label===r.letter).length,'/',results.length);
