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
const model=await load({runtime:'tfjs',modelType:'lite',maxHands:1,detectorModelUrl:'https://local-model.test/models/detector/model.json',landmarkModelUrl:'https://local-model.test/models/landmark/model.json'});
const sharp=(await import(process.env.SHARP_MODULE)).default;
for(const letter of ['l','y','i','v']){
 const {data,info}=await sharp(fileURLToPath(new URL('../public/references/'+letter+'.jpg',import.meta.url))).resize({width:320}).extend({top:100,bottom:100,left:100,right:100,background:'#777777'}).removeAlpha().raw().toBuffer({resolveWithObject:true});
 const input=tf.tensor3d(new Uint8Array(data),[info.height,info.width,3],'int32');
 const hands=await model.estimateHands(input,{staticImageMode:true});
 assert.equal(hands.length,1,'Must detect a hand in '+letter);
 const result=classify(hands[0].keypoints);
 console.log(letter, '21 landmarks:',hands[0].keypoints.length,'classification:',result);
 await fs.writeFile('/tmp/asl-'+letter+'-landmarks.json',JSON.stringify(hands[0].keypoints));
 assert.equal(result,letter.toUpperCase(),'Reference classification '+letter);
 input.dispose();
}
const blank=tf.zeros([240,320,3],'int32');assert.equal((await model.estimateHands(blank,{staticImageMode:true})).length,0);blank.dispose();model.dispose();globalThis.fetch=originalFetch;
console.log('PASS: model assets, four real reference photos, and no-hand image.');
