import fs from 'node:fs';
import {rankStatic,matchStatic,type StaticBank} from '../app/recognition/matching';
const bank:StaticBank=JSON.parse(fs.readFileSync('public/models/static-signs.json','utf8'));
const samples=JSON.parse(fs.readFileSync('research/alphabet/evaluation.json','utf8'));
for(const sample of samples){const p=sample.hands[0].keypoints;const rank=rankStatic(p,bank);console.log(sample.letter,matchStatic(p,bank),rank.slice(0,2).map(r=>r.id+':'+r.distance.toFixed(3)).join(' '));}
