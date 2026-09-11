import {matchGesture,type GestureFeature,type GestureBank} from './matching';
export type TimedFeature={value:GestureFeature;time:number};
/** Evaluate actual observed frames; never invent frames to reach a minimum.
 * Attempts are chosen by elapsed time, not a quota of camera frames.
 * Movement, both hands where appropriate, and the best matching sign remain required. */
export function matchAttempt(history:TimedFeature[],bank:GestureBank,target:string){
 const end=history.at(-1)?.time;
 const waiting={matched:false,distance:Infinity,reason:'Show the complete movement.'};
 if(end===undefined)return waiting;
 const recent=history.filter(f=>end-f.time<=12000);
 const starts=new Set([0,...[500,750,1100,1600,2400,3600,5500,8000].map(duration=>recent.findIndex(f=>end-f.time<=duration)).filter(i=>i>=0)]);
 const outcomes=[];
 for(const start of starts){
  const clip=recent.slice(start);
  if(clip.length<2||end-clip[0].time<350)continue;
  // A lost tracking interval must not join two unrelated performances.
  if(clip.some((f,i)=>i>0&&f.time-clip[i-1].time>2000))continue;
  outcomes.push(matchGesture(clip.map(f=>f.value),bank,target));
 }
 // Prefer the strongest observed gesture; do not cherry-pick a weak suffix
 // that resembles the requested word when the complete movement says otherwise.
 return outcomes.sort((a,b)=>(a.winningDistance??a.distance)-(b.winningDistance??b.distance))[0]||waiting;
}
