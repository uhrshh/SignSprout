import fs from 'node:fs';
import {bodyFeature,type BodyFrame,type GestureBank} from '../app/recognition/matching';
const raw=JSON.parse(fs.readFileSync('research/gesture-references-with-aspect.json','utf8'));
const bank:GestureBank={};
for(const [key,rows] of Object.entries(raw) as [string,any[]][]){
 if(key.startsWith('number-'))continue;
 const features=rows.map(row=>{const points=(name:string)=>row[name]?.map(([x,y,z]:number[])=>({x,y,z}))||null;return bodyFeature({pose:points('pose'),left:points('left'),right:points('right'),aspect:row.aspect} as BodyFrame)}).filter(x=>x!==null);
 if(features.length>=2)bank[key]=[features];
 console.log(key,features.length,features.length>=2?'reference ready':'requires geometric rule');
}
fs.writeFileSync('public/models/gesture-signs.json',JSON.stringify(bank));
