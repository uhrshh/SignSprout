import type {BodyFrame,Landmark} from './matching';
type Hand={keypoints:Landmark[];score?:number};
/** Recover a missing Holistic hand from an independent two-hand detector.
 * Assign by pose wrists, not unstable left/right labels when hands cross.
 * Never copy the visible hand into both slots or carry old landmarks forward. */
export function recoverHands(body:BodyFrame,candidates:Hand[],width:number,height:number):BodyFrame{
 if(!body.pose||body.pose.length<17||!width||!height)return body;
 const result={...body};const ratio=width/height;
 const distance=(a:Landmark,b:Landmark)=>Math.hypot((a.x-b.x)*ratio,a.y-b.y);
 const shoulder=distance(body.pose[11],body.pose[12]);if(shoulder<.04)return body;
 const hands=candidates.filter(h=>(h.score??1)>=.55&&h.keypoints.length===21&&h.keypoints.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y))).map(h=>h.keypoints.map(p=>({x:p.x/width,y:p.y/height})));
 const used=new Set<number>();
 for(const side of ['left','right'] as const){
  if(!body[side])continue;
  const nearest=hands.map((h,i)=>({i,error:h.reduce((sum,p,j)=>sum+distance(p,body[side]![j]),0)/21})).filter(v=>!used.has(v.i)).sort((a,b)=>a.error-b.error)[0];
  if(nearest&&nearest.error<shoulder*.12)used.add(nearest.i);
 }
 const assignments=(['left','right'] as const).filter(side=>!body[side]).flatMap(side=>hands.map((hand,index)=>({side,index,hand,cost:distance(hand[0],body.pose![side==='left'?15:16])}))).sort((a,b)=>a.cost-b.cost);
 for(const a of assignments){
  const wrist=body.pose[a.side==='left'?15:16];
  if(result[a.side]||used.has(a.index)||a.cost>shoulder*.85||(wrist.visibility!==undefined&&wrist.visibility<.3))continue;
  result[a.side]=a.hand;used.add(a.index);
 }
 return result;
}
