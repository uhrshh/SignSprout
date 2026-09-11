import {byId,units} from './course';
export type Entry={method:'camera'|'self'|'read';at:string};
export type ProgressState={version:2;completed:Record<string,Entry>;quizzes:Record<string,number>;reviews:Record<string,{due:string;correct:number}>;days:string[];unit:string;index:number};
export const initialProgress:ProgressState={version:2,completed:{},quizzes:{},reviews:{},days:[],unit:units[0].id,index:0};
export function dayKey(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`}
export function parseProgress(raw:string|null,legacy:string|null):ProgressState{
 try{const p=JSON.parse(raw||'null');if(p?.version===2){
  const completed=Object.fromEntries(Object.entries(p.completed||{}).filter(([k,v]:[string,any])=>byId[k]&&['camera','self','read'].includes(v?.method)&&!Number.isNaN(Date.parse(v.at))));
  const quizzes=Object.fromEntries(Object.entries(p.quizzes||{}).filter(([k,v])=>units.some(u=>u.id===k)&&typeof v==='number'&&v>=0&&v<=100));
  const reviews=Object.fromEntries(Object.entries(p.reviews||{}).filter(([k,v]:[string,any])=>byId[k]&&typeof v?.due==='string'&&!Number.isNaN(Date.parse(v.due))&&Number.isInteger(v.correct)&&v.correct>=0));
  const unit=units.find(u=>u.id===p.unit)||units[0];
  return {...initialProgress,completed:completed as Record<string,Entry>,quizzes:quizzes as Record<string,number>,reviews:reviews as ProgressState['reviews'],days:Array.isArray(p.days)?p.days.filter((x:unknown)=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)):[],unit:unit.id,index:Number.isInteger(p.index)?Math.max(0,Math.min(unit.cards.length-1,p.index)):0};
 }}catch{}
 try{const old=JSON.parse(legacy||'[]');if(Array.isArray(old))return {...initialProgress,completed:Object.fromEntries(old.filter(x=>['L','Y','I','V'].includes(x)).map(x=>['letter-'+x,{method:'self',at:new Date().toISOString()}]))}}catch{}
 return {...initialProgress};
}
export function completeCard(p:ProgressState,id:string,method:Entry['method']):ProgressState{
 if(!byId[id]||(byId[id].camera&&method!=='camera')||(!byId[id].camera&&method==='camera'))return p;
 const day=dayKey();return {...p,completed:{...p.completed,[id]:(p.completed[id]?.method===method?p.completed[id]:{method,at:new Date().toISOString()})},days:[...new Set([...p.days,day])],reviews:{...p.reviews,[id]:p.reviews[id]||{due:day,correct:0}}};
}
export function reviewCard(p:ProgressState,id:string,correct:boolean):ProgressState{
 if(!byId[id])return p;const count=correct?(p.reviews[id]?.correct||0)+1:0;const date=new Date();date.setDate(date.getDate()+(correct?Math.min(14,2**Math.min(count-1,4)):0));
 return {...p,reviews:{...p.reviews,[id]:{due:dayKey(date),correct:count}},days:[...new Set([...p.days,dayKey()])]};
}
export function streak(days:string[]){const seen=new Set(days),date=new Date();if(!seen.has(dayKey(date)))date.setDate(date.getDate()-1);let n=0;while(seen.has(dayKey(date))){n++;date.setDate(date.getDate()-1)}return n}
export function unitCompleted(p:ProgressState,id:string){const unit=units.find(u=>u.id===id);return !!unit&&unit.cards.every(c=>p.completed[c])&&(p.quizzes[id]||0)>=80}
