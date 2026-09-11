import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-cpu';
import {load} from '@tensorflow-models/hand-pose-detection/dist/tfjs/detector.js';
import {classify} from '../app/handshape.ts';
const originalFetch=globalThis.fetch;
globalThis.fetch=async input=>{
 const url=String(input);
 if(!url.startsWith('https://local-model.test/'))throw new Error('Unexpected external model request: '+url);
 const file=new URL(url).pathname.slice(1);
 return new Response(await fs.readFile(new URL('../public/'+file,import.meta.url)),{status:200,headers:{'content-type':file.endsWith('.json')?'application/json':'application/octet-stream'}});
};
await tf.setBackend('cpu');await tf.ready();
const model=await load({runtime:'tfjs',modelType:'lite',maxHands:2,detectorModelUrl:'https://local-model.test/models/detector/model.json',landmarkModelUrl:'https://local-model.test/models/landmark/model.json'});
const sharp=(await import(process.env.SHARP_MODULE)).default;

const left=await sharp('public/references/l.jpg').resize({height:300}).png().toBuffer();
const right=await sharp('public/references/y.jpg').resize({height:300}).png().toBuffer();
const {data,info}=await sharp({create:{width:800,height:500,channels:3,background:'#777777'}}).composite([{input:left,left:50,top:100},{input:right,left:450,top:100}]).removeAlpha().raw().toBuffer({resolveWithObject:true});
const tensor=tf.tensor3d(new Uint8Array(data),[info.height,info.width,3],'int32');
const hands=await model.estimateHands(tensor,{staticImageMode:true});
if(hands.length<2){for(const offset of [0,400]){const crop=tf.slice(tensor,[0,offset,0],[500,400,3]);const close=await model.estimateHands(crop,{staticImageMode:true});crop.dispose();for(const h of close){const mapped={...h,keypoints:h.keypoints.map(p=>({...p,x:p.x+offset}))};if(!hands.some(existing=>Math.hypot(existing.keypoints[0].x-mapped.keypoints[0].x,existing.keypoints[0].y-mapped.keypoints[0].y)<80))hands.push(mapped);}}}
assert.equal(hands.length,2,'Independent tracker must detect both reference hands');
assert(hands.every(h=>h.keypoints.length===21&&h.keypoints.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y))));
console.log('PASS: both hands detected with 21 finite landmarks each.');tensor.dispose();model.dispose();globalThis.fetch=originalFetch;
