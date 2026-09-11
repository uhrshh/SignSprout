import type {Point} from '../handshape';
import {matchesGHandshape} from './g-handshape';
export type StaticBank=Record<string,number[][][]>;
export type Landmark={x:number;y:number;z?:number;visibility?:number};
export type BodyFrame={pose:Landmark[]|null;left:Landmark[]|null;right:Landmark[]|null;aspect:number};
export type GestureFeature={left:number[]|null;right:number[]|null;positions:(number[]|null)[]};
export type GestureBank=Record<string,GestureFeature[][]>;
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
export function handFeature(points:Point[]):number[]|null{
 if(points.length!==21||points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))return null;
 const scale=distance(points[0],points[9]);if(scale<.0001)return null;
 return points.flatMap(p=>[(p.x-points[0].x)/scale,(p.y-points[0].y)/scale]);
}
export function featureDistance(a:number[],b:number[],mirror=false){
 if(a.length!==b.length)return Infinity;
 let sum=0,weights=0;
 for(let i=0;i<a.length;i+=2){const w=[4,8,12,16,20].includes(i/2)?2:1;sum+=w*((a[i]*(mirror?-1:1)-b[i])**2+(a[i+1]-b[i+1])**2);weights+=w;}
 return Math.sqrt(sum/weights);
}
export function rankStatic(points:Point[],bank:StaticBank,prefix='letter-'){
 const feature=handFeature(points);if(!feature)return [];
 const variants=[-12,0,12].flatMap(degrees=>{const angle=degrees*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);return [.9,1,1.1].map(scale=>feature.flatMap((_,i)=>i%2?[]:[(feature[i]*c-feature[i+1]*s)*scale,(feature[i]*s+feature[i+1]*c)*scale]));});
 return Object.entries(bank).filter(([id])=>id.startsWith(prefix)).map(([id,samples])=>({id,distance:Math.min(...samples.flatMap(sample=>variants.map(v=>Math.min(featureDistance(v,sample.flat()),featureDistance(v,sample.flat(),true)))))})).sort((a,b)=>a.distance-b.distance);
}
export function matchStatic(points:Point[],bank:StaticBank,prefix='letter-',world?:Landmark[]){
 if(prefix==='letter-'&&matchesGHandshape(points,world))return 'letter-G';
 const ranked=rankStatic(points,bank,prefix),best=ranked[0];
 if(!best||best.distance>.38||(ranked[1]&&ranked[1].distance-best.distance<.02))return null;
 return best.id;
}
export function bodyFeature(frame:BodyFrame):GestureFeature|null{
 const p=frame.pose,ratio=frame.aspect;
 if(!p||p.length<13||!Number.isFinite(ratio)||ratio<=0)return null;
 const xy=(v:Landmark)=>({x:v.x*ratio,y:v.y});
 if([0,11,12].some(i=>!Number.isFinite(p[i].x)||!Number.isFinite(p[i].y)||(p[i].visibility!==undefined&&p[i].visibility!<.35)))return null;
 const scale=distance(xy(p[11]),xy(p[12]));if(scale<.04)return null;
 const nose=xy(p[0]);
 const hands=[frame.left,frame.right];
 const features=hands.map(hand=>hand?.length===21?handFeature(hand.map(xy)):null);
 if(!features.some(Boolean))return null;
 const positions=hands.map((hand,i)=>features[i]&&hand?[(hand[0].x*ratio-nose.x)/scale,(hand[0].y-nose.y)/scale]:null);
 return {left:features[0],right:features[1],positions};
}
export function mirrorFeature(f:GestureFeature):GestureFeature{
 const flip=(v:number[]|null)=>v?.map((x,i)=>i%2?x:-x)||null;
 return {left:flip(f.right),right:flip(f.left),positions:[flip(f.positions[1]),flip(f.positions[0])]};
}
/** Bounded pose adjustment: tolerate small camera/hand angles without making
 * orientation irrelevant (e.g. an upright and sideways hand still differ). */
function gestureHandDistance(actual:number[],expected:number[]){
 let dot=0,cross=0,norm=0;
 for(let i=0;i<actual.length;i+=2){dot+=actual[i]*expected[i]+actual[i+1]*expected[i+1];cross+=actual[i]*expected[i+1]-actual[i+1]*expected[i];norm+=actual[i]**2+actual[i+1]**2;}
 const angle=Math.max(-Math.PI/12,Math.min(Math.PI/12,Math.atan2(cross,dot)));
 const scale=Math.max(.85,Math.min(1.15,Math.hypot(dot,cross)/(norm||1)));
 const c=Math.cos(angle)*scale,s=Math.sin(angle)*scale;
 return featureDistance(actual.map((v,i)=>i%2?actual[i-1]*s+v*c:v*c-actual[i+1]*s),expected);
}
/** Keep observed changes, so a long pause does not outweigh a short sign. */
export function movementKeyframes(frames:GestureFeature[]){
 const result:GestureFeature[]=[];
 for(const frame of frames){
  const previous=result.at(-1);
  const changed=!previous||(['left','right'] as const).some((side,i)=>{
   const a=previous[side],b=frame[side],ap=previous.positions[i],bp=frame.positions[i];
   return !!a!==!!b||!!ap!==!!bp||a&&b&&featureDistance(a,b)>.025||ap&&bp&&featureDistance(ap,bp)>.02;
  });
  if(changed)result.push(frame);
 }
 return result;
}
/** Bound DTW cost and sample density independently of camera frame rate. */
export function resampleGesture(frames:GestureFeature[],count=24){
 if(frames.length<=count)return frames;
 return Array.from({length:count},(_,i)=>frames[Math.round(i*(frames.length-1)/(count-1))]);
}
export function frameDistance(a:GestureFeature,b:GestureFeature){
 let sum=0,n=0;
 for(let side=0;side<2;side++){
  const key=side===0?'left':'right',expected=b[key],actual=a[key];
  if(expected){if(!actual||!a.positions[side]||!b.positions[side]){sum+=.8;n++;continue;}sum+=gestureHandDistance(actual,expected)*.6+featureDistance(a.positions[side]!,b.positions[side]!)*.4;n++;}
 }
 return n?sum/n:3;
}
export function sequenceDistance(input:GestureFeature[],reference:GestureFeature[]){
 if(!input.length||!reference.length)return Infinity;
 input=resampleGesture(movementKeyframes(input));reference=resampleGesture(movementKeyframes(reference));
 let previous=new Array(reference.length+1).fill(Infinity);previous[0]=0;
 for(let i=0;i<input.length;i++){
  const next=new Array(reference.length+1).fill(Infinity);
  for(let j=0;j<reference.length;j++)next[j+1]=frameDistance(input[i],reference[j])+Math.min(previous[j],previous[j+1],next[j]);
  previous=next;
 }
 return previous[reference.length]/Math.max(input.length,reference.length);
}
export function movement(frames:GestureFeature[]){
 let max=0;
 for(let side=0;side<2;side++)for(let i=0;i<frames.length;i++)for(let j=i+1;j<frames.length;j++){
  const a=frames[i].positions[side],b=frames[j].positions[side];if(a&&b)max=Math.max(max,Math.hypot(a[0]-b[0],a[1]-b[1]));
  const key=side===0?'left':'right';if(frames[i][key]&&frames[j][key])max=Math.max(max,featureDistance(frames[i][key]!,frames[j][key]!));
 }
 return max;
}
export function matchGesture(frames:GestureFeature[],bank:GestureBank,target:string){
 if(frames.length<2)return {matched:false,distance:Infinity,reason:'Show the complete movement.'};
 const twoHands=['name','what','nice','meet','friend','want','help','again','learn'].includes(target);
 if(twoHands&&frames.filter(f=>f.left&&f.right).length<frames.length*.45)return {matched:false,distance:Infinity,reason:'Keep both signing hands visible.'};
 const references=bank[target];if(!references?.length)return {matched:false,distance:Infinity,reason:'No usable reference sequence is available.'};
 const mirrored=frames.map(mirrorFeature);
 const ranked=Object.entries(bank).map(([id,variants])=>({id,distance:Math.min(...variants.flatMap(ref=>[sequenceDistance(frames,ref),sequenceDistance(mirrored,ref)]))})).sort((a,b)=>a.distance-b.distance);
 const best=ranked[0],targetScore=ranked.find(r=>r.id===target)!;
 const requiredMotion=Math.min(...references.map(movement));
 if(requiredMotion>.1&&movement(frames)<Math.max(.08,requiredMotion*.35))return {matched:false,distance:targetScore.distance,reason:'Include the movement, not just the handshape.'};
 const matched=best.id===target&&best.distance<.50&&(!ranked[1]||ranked[1].distance-best.distance>.015);
 return {matched,distance:targetScore.distance,winningDistance:best.distance,recognized:best.id,reason:matched?'Reference movement matched.':'Match the handshape, location, and complete movement.'};
}
export class HoldGate{
 private start:number|null=null;private last:number|null=null;private finished=false;private paused:number|null=null;
 reset(){this.start=null;this.last=null;this.finished=false;this.paused=null;}
 update(correct:boolean|null,now:number){
  if(this.finished)return {progress:100,completed:false};
  if(correct===null){if(this.last===null||now-this.last>350){this.reset();return {progress:0,completed:false};}this.paused??=now;return {progress:Math.min(99,(this.last-this.start!)/15),completed:false};}
  if(this.paused!==null){if(this.last===null||now-this.last>350)this.reset();else if(this.start!==null)this.start+=now-this.last;this.paused=null;}
  if(!correct||this.last!==null&&now-this.last>450){this.start=null;this.last=null;if(!correct)return {progress:0,completed:false};}
  this.start??=now;this.last=now;const progress=Math.min(100,(now-this.start)/15);
  if(progress===100){this.finished=true;return {progress,completed:true};}
  return {progress,completed:false};
 }
}
