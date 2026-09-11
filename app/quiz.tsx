'use client';
import {useMemo,useState} from 'react';
import {ArrowRight,CheckCircle2,RotateCcw,Trophy,XCircle} from 'lucide-react';
import {Progress} from '@/components/ui/progress';
import {byId,type Unit} from './course';
import {Demonstration} from './demonstration';
export function Quiz({unit,onFinish,onBack,onNextUnit,onViewProgress}:{unit:Unit;onFinish:(score:number)=>void;onBack:()=>void;onNextUnit?:()=>void;onViewProgress:()=>void}){
 const [round,setRound]=useState(0),[index,setIndex]=useState(0),[selected,setSelected]=useState<number|null>(null),[correct,setCorrect]=useState(0),[finished,setFinished]=useState(false);
 const questions=useMemo(()=>{
  const ids=[...new Set(unit.cards)],count=Math.min(5,ids.length);
  return Array.from({length:count},(_,n)=>{
   const card=byId[ids[(Math.floor(n*ids.length/count)+round)%ids.length]];
   const receptive=card.id.startsWith('letter-');
   const distractors=ids.filter(id=>id.startsWith('letter-')&&id!==card.id).map(id=>byId[id].label).slice(0,2);
   const question=receptive&&distractors.length===2?{prompt:'Which letter is this handshape?',choices:[card.label,...distractors],answer:0,explanation:card.description}:card.question;
   const choices=question.choices.map((label,i)=>({label,correct:i===question.answer}));
   const offset=(card.id.split('').reduce((s,c)=>s+c.charCodeAt(0),0)+round+n)%choices.length;
   return {card,question,choices:[...choices.slice(offset),...choices.slice(0,offset)],receptive};
  });
 },[unit,round]);
 const item=questions[index];const score=Math.round(correct/questions.length*100);
 function choose(n:number){if(selected!==null)return;setSelected(n);if(item.choices[n].correct)setCorrect(x=>x+1)}
 function next(){if(index===questions.length-1){setFinished(true);onFinish(score)}else{setIndex(index+1);setSelected(null)}}
 if(finished)return <section className="quiz-result"><div className="result-icon"><Trophy size={36}/></div><p className="eyebrow">UNIT CHECKPOINT</p><h2>{score===100?'Perfect score!':score>=80?'A solid step forward.':'A little more practice.'}</h2><div className="score">{score}<span>%</span></div><p>{correct} of {questions.length} correct. {score>=80?'Checkpoint passed. Complete the practice cards to finish the unit.':'Review the demonstrations and try again. Aim for 80%.'}</p><div className="button-row">{score===100&&<button className="primary" onClick={onNextUnit||onViewProgress}>{onNextUnit?'Next unit':'View your progress'}<ArrowRight size={16}/></button>}<button className={score===100?'secondary':'primary'} onClick={onBack}>Back to the unit <ArrowRight size={16}/></button><button className="secondary" onClick={()=>{setRound(x=>x+1);setIndex(0);setSelected(null);setCorrect(0);setFinished(false)}}><RotateCcw size={16}/>Try again</button></div></section>;
 return <section className="quiz-card"><div className="section-top"><span className="pill">CHECKPOINT · {unit.title}</span><span>{index+1} / {questions.length}</span></div><Progress value={index/questions.length*100} aria-label="Quiz progress"/><h2>{item.question.prompt}</h2>{item.receptive&&<Demonstration key={item.card.id} card={item.card} hideLabel/>}<div className="answer-options">{item.choices.map((choice,n)=><button key={choice.label} disabled={selected!==null} onClick={()=>choose(n)} className={selected===null?'':choice.correct?'correct':selected===n?'incorrect':''}><span>{String.fromCharCode(65+n)}</span>{choice.label}{selected!==null&&choice.correct&&<CheckCircle2 size={20}/>}</button>)}</div>{selected!==null&&<div className="answer-explanation" role="status">{item.choices[selected].correct?<CheckCircle2 size={22}/>:<XCircle size={22}/>}<div><b>{item.choices[selected].correct?'That’s right.':'Let’s learn from this one.'}</b><p>{item.question.explanation}</p></div></div>}<div className="section-actions"><button className="text-button" onClick={onBack}>Exit checkpoint</button><button className="primary" disabled={selected===null} onClick={next}>{index===questions.length-1?'See results':'Next question'}<ArrowRight size={16}/></button></div></section>
}
