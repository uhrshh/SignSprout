import type {Point} from '../handshape';
import {handFeature,type BodyFrame,type Landmark} from './matching';
export type TimedHand={points:Point[];time:number};
/** Require a trajectory as well as a handshape; a static I or index finger cannot pass J/Z. */
export function matchLetterMotion(history:TimedHand[],letter:'J'|'Z'){
 if(history.length<8||history.at(-1)!.time-history[0].time<600)return false;
 const samples=history.slice(-40),scale=Math.hypot(samples[0].points[9].x-samples[0].points[0].x,samples[0].points[9].y-samples[0].points[0].y);
 if(scale<35)return false;
 const finger=letter==='J'?20:8,path=samples.map(s=>s.points[finger]);
 const minX=Math.min(...path.map(p=>p.x)),maxX=Math.max(...path.map(p=>p.x)),minY=Math.min(...path.map(p=>p.y)),maxY=Math.max(...path.map(p=>p.y));
 if(maxX-minX<scale*.55||maxY-minY<scale*.55)return false;
 const start=path[0],end=path.at(-1)!;
 if(letter==='J'){
  const bottom=path.reduce((best,p,i)=>p.y>path[best].y?i:best,0),low=path[bottom];
  return bottom>=Math.floor(path.length*.35)&&bottom<path.length-2&&low.y-start.y>scale*.65&&low.y-end.y>scale*.2&&Math.abs(end.x-start.x)>scale*.4&&Math.abs(path[Math.floor(bottom*.5)].x-start.x)<scale*.4;
 }
 for(const flip of [1,-1])for(let a=2;a<path.length-4;a++)for(let b=a+2;b<path.length-2;b++){
  const p=path[a],q=path[b];
  if((p.x-start.x)*flip>scale*.6&&(q.x-p.x)*flip< -scale*.5&&(end.x-q.x)*flip>scale*.6&&Math.abs(p.y-start.y)<scale*.28&&q.y-p.y>scale*.5&&Math.abs(end.y-q.y)<scale*.28)return true;
 }
 return false;
}
const dist3=(a:Landmark,b:Landmark,ratio:number)=>Math.hypot((a.x-b.x)*ratio,a.y-b.y,((a.z||0)-(b.z||0))*ratio);
export function fingerState(hand:Landmark[],ratio:number){
 const scale=dist3(hand[0],hand[9],ratio);if(scale<.015)return null;
 const extended=[8,12,16,20].map(t=>dist3(hand[t],hand[t-3],ratio)>scale*.65&&dist3(hand[t],hand[0],ratio)>dist3(hand[t-2],hand[0],ratio)*1.12);
 return {extended,thumb:dist3(hand[4],hand[5],ratio)>scale*.65,scale};
}
export type TimedBody={frame:BodyFrame;time:number};
export function matchRule(history:TimedBody[],target:string){
 if(history.length<2||history.at(-1)!.time-history[0].time<350)return false;
 const samples=history.filter(s=>history.at(-1)!.time-s.time<=6500);
 for(const side of ['left','right'] as const){
  const valid=samples.map(({frame})=>{
   const hand=frame[side],pose=frame.pose;if(!hand||!pose)return null;
   const state=fingerState(hand,frame.aspect);if(!state)return null;
   const width=Math.hypot((pose[11].x-pose[12].x)*frame.aspect,pose[11].y-pose[12].y);if(width<.08)return null;
   const chest={x:(pose[11].x+pose[12].x)/2,y:(pose[11].y+pose[12].y)/2+width*.45};
   return {state,hand,pose,ratio:frame.aspect,width,chest,x:(hand[0].x-chest.x)*frame.aspect/width,y:(hand[0].y-chest.y)/width};
  }).filter(v=>v!==null);
  if(valid.length<samples.length*.85)continue;
  const latest=valid.at(-1)!,fraction=(fn:(v:typeof latest)=>boolean)=>valid.filter(fn).length/valid.length;
  const open=(v:typeof latest)=>v.state.extended.every(Boolean),fist=(v:typeof latest)=>v.state.extended.every(x=>!x);
  const atChest=(v:typeof latest)=>Math.abs(v.x)<.55&&Math.abs(v.y)<.55;
  if(target==='my'&&fraction(v=>open(v)&&atChest(v))>.85)return true;
  if(target==='you'&&fraction(v=>v.state.extended[0]&&!v.state.extended.slice(1).some(Boolean)&&Math.abs(v.x)<.9&&v.y<.3&&v.y> -1)>.85){
   const h=latest.hand;const depth=(h[8].z||0)-(h[5].z||0);
   if(depth< -latest.state.scale*.35)return true;
  }
  if(target==='please'&&fraction(v=>open(v)&&atChest(v))>.8){
   const xs=valid.map(v=>v.x),ys=valid.map(v=>v.y);let turn=0;
   for(let i=1;i<valid.length-1;i++){const a=valid[i-1],b=valid[i],c=valid[i+1];turn+=(b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x);}
   if(Math.max(...xs)-Math.min(...xs)>.2&&Math.max(...ys)-Math.min(...ys)>.15&&Math.abs(turn)>.004)return true;
  }
  if(target==='yes'&&fraction(fist)>.85){
   const angles=valid.map(v=>Math.atan2((v.hand[9].z||0)-(v.hand[0].z||0),v.hand[0].y-v.hand[9].y));
   if(Math.max(...angles)-Math.min(...angles)>.65&&Math.abs(angles.at(-1)!-angles[0])<.5)return true;
  }
  if(target==='understand'){
   const split=Math.floor(valid.length/2),early=valid.slice(0,split),late=valid.slice(split);
   const nearTemple=(v:typeof latest)=>Math.abs(v.hand[0].y-v.pose[0].y)<v.width*.4&&v.hand[5].y<v.pose[0].y+v.width*.1&&Math.abs((v.hand[0].x-v.pose[0].x)*v.ratio)<v.width*.9;
   const indexUp=(v:typeof latest)=>v.state.extended[0]&&v.hand[8].y<v.hand[5].y-v.state.scale*.35/v.ratio;
   if(early.filter(v=>!v.state.extended[0]&&nearTemple(v)).length>early.length*.7&&late.filter(v=>indexUp(v)&&!v.state.extended.slice(1).some(Boolean)&&nearTemple(v)).length>late.length*.7)return true;
  }
  if(target==='number-10'&&fraction(v=>fist(v)&&v.state.thumb)>.85){
   const x=valid.map(v=>(v.hand[4].x-v.hand[0].x)*v.ratio/v.state.scale);if(Math.max(...x)-Math.min(...x)>.5&&Math.abs(x.at(-1)!-x[0])<.4)return true;
  }
 }
 return false;
}
