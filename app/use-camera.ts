'use client';
import {useEffect,useRef,useState} from 'react';
import {classify,type Point} from './handshape';
import {createTracker,checkTracker,prepareVideo} from './tracker';
import {matchAttempt} from './recognition/attempts';
import {loadReferences} from './recognition/data';
import {createBodyTracker,checkBodyTracker} from './recognition/holistic';
import {bodyFeature,matchStatic,HoldGate,type GestureFeature} from './recognition/matching';
import {matchLetterMotion,matchRule,type TimedHand,type TimedBody} from './recognition/motion';
const chains=[[0,1,2,3,4],[0,5,6,7,8],[5,9,10,11,12],[9,13,14,15,16],[13,17,18,19,20],[0,17]];
function draw(canvas:HTMLCanvasElement|null,video:HTMLVideoElement,hands:Point[][]){
 const ctx=canvas?.getContext('2d');if(!ctx||!canvas)return;
 canvas.width=video.videoWidth;canvas.height=video.videoHeight;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.strokeStyle='#d0eca4';ctx.fillStyle='#d0eca4';ctx.lineWidth=3;
 for(const p of hands){for(const chain of chains){ctx.beginPath();chain.forEach((n,j)=>j?ctx.lineTo(p[n].x,p[n].y):ctx.moveTo(p[n].x,p[n].y));ctx.stroke()}for(const point of p){ctx.beginPath();ctx.arc(point.x,point.y,4,0,Math.PI*2);ctx.fill()}}
}
export function useCamera(target:string,onMatch:()=>void){
 const video=useRef<HTMLVideoElement>(null),canvas=useRef<HTMLCanvasElement>(null),stream=useRef<MediaStream|null>(null),run=useRef(0),timer=useRef<ReturnType<typeof setTimeout>|null>(null),dispose=useRef<(()=>void)|null>(null),busy=useRef(false),matchRef=useRef(onMatch);
 matchRef.current=onMatch;
 const [status,setStatus]=useState('off'),[feedback,setFeedback]=useState('Match the reference. Keep your entire hand visible.'),[hold,setHold]=useState(0),[tracking,setTracking]=useState('Camera off'),[check,setCheck]=useState(''),[checking,setChecking]=useState(false);
 const isBody=!!target&&!target.startsWith('letter-')&&(!target.startsWith('number-')||target==='number-10');
 function cleanup(){run.current++;busy.current=false;if(timer.current)clearTimeout(timer.current);stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;if(video.current)video.current.srcObject=null;dispose.current?.();dispose.current=null;}
 function stop(){cleanup();setTracking('Camera off');setStatus('off');setHold(0);setFeedback('Camera paused. Enable it whenever you’re ready.');}
 useEffect(()=>()=>cleanup(),[]);
 async function start(){
  if(busy.current||stream.current||checking)return;
  busy.current=true;const generation=++run.current;setStatus('loading');setFeedback('Opening camera…');
  try{
   if(!navigator.mediaDevices?.getUserMedia)throw new Error('Camera access needs a secure browser connection.');
   const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:640,height:480},audio:false});
   if(run.current!==generation){s.getTracks().forEach(t=>t.stop());return;}stream.current=s;s.getVideoTracks()[0].onended=()=>{if(run.current===generation)stop()};
   if(!video.current){s.getTracks().forEach(t=>t.stop());return;}video.current.srcObject=s;await video.current.play();
   setFeedback(isBody?'Loading hand and body tracking…':'Loading hand tracking…');
   const references=await loadReferences();if(run.current!==generation)return;
   const handTracker=isBody?null:await createTracker(),bodyTracker=isBody?await createBodyTracker(['name','what','nice','meet','friend','want','help','again','learn','slow'].includes(target)?2:1):null;
   const release=()=>{handTracker?.detector.dispose();void bodyTracker?.dispose().catch(console.error)};
   if(run.current!==generation){release();return;}dispose.current=release;
   busy.current=false;setStatus('live');setHold(0);
   const gate=new HoldGate();let verified=false,handHistory:TimedHand[]=[],bodyHistory:TimedBody[]=[],features:{value:GestureFeature;time:number}[]=[],lastVideoTime=-1,lastFrameAt=0,missingBodyFrames=0;
   async function tick(){
    if(run.current!==generation||!video.current)return;
    try{
     const v=video.current;
     if(!prepareVideo(v)||v.currentTime===lastVideoTime){timer.current=setTimeout(tick,100);return;}
     lastVideoTime=v.currentTime;
     const now=performance.now();if(now-lastFrameAt>(isBody?4000:700)){handHistory=[];bodyHistory=[];features=[];gate.reset();}lastFrameAt=now;
     let correct=false,uncertain=true,message='',hands:Point[][]=[];
     if(bodyTracker){
      const body=await bodyTracker.estimate(v);if(run.current!==generation)return;
      hands=[body.left,body.right].filter(h=>h?.length===21).map(h=>h!.map(p=>({x:p.x*v.videoWidth,y:p.y*v.videoHeight})));
      const feature=bodyFeature(body);
      if(!feature){if(++missingBodyFrames>=3){bodyHistory=[];features=[];}message='Step back so your face, shoulders, and signing hands are visible.';}
      else{
       missingBodyFrames=0;bodyHistory.push({frame:body,time:now});bodyHistory=bodyHistory.filter(s=>now-s.time<12000);
       features.push({value:feature,time:now});features=features.filter(s=>now-s.time<12000);
       const outcome=matchAttempt(features,references.gestures,target);
       const geometric=['please','my','you','number-10','understand'].includes(target)&&[750,1500,2500,4000,6500].some(duration=>matchRule(bodyHistory.filter(s=>now-s.time<=duration),target));
       correct=geometric||outcome.matched;message=outcome.reason;
      }
     }else if(handTracker){
      const predictions=await handTracker.detector.estimateHands(v,{flipHorizontal:false});if(run.current!==generation)return;
      const p=predictions[0]?.keypoints;
      const valid=p?.length===21&&Math.hypot(p[9].x-p[0].x,p[9].y-p[0].y)>=35&&p.every(point=>Number.isFinite(point.x)&&Number.isFinite(point.y));
      if(!valid){handHistory=[];if(p)handTracker.detector.reset();message='Bring one whole hand into the frame.';}
      else{
       hands=[p];const prefix=target.startsWith('number-')?'number-':'letter-';const found=matchStatic(p,references.staticSigns,prefix,predictions[0].keypoints3D);uncertain=found===null;
       if(target==='letter-J'||target==='letter-Z'){
        const scale=Math.hypot(p[9].x-p[0].x,p[9].y-p[0].y);
        const extended=[8,12,16,20].map(t=>Math.hypot(p[t].x-p[0].x,p[t].y-p[0].y)>Math.hypot(p[t-2].x-p[0].x,p[t-2].y-p[0].y)*1.2);
        const shape=target==='letter-J'?(classify(p)==='I'||found==='letter-I'):(extended[0]&&!extended.slice(1).some(Boolean));
        if(shape&&scale>=35){handHistory.push({points:p,time:now});handHistory=handHistory.filter(s=>now-s.time<12000);}else handHistory=[];
        correct=matchLetterMotion(handHistory,target==='letter-J'?'J':'Z');message=shape?'Trace the complete letter with your fingertip.':'Start with the handshape shown in the reference.';
       }else{correct=found===target;message=found?`I see ${found.replace(/^(letter|number)-/,'')}. ${correct?'Hold steady…':'Try '+target.replace(/^(letter|number)-/,'')+'.'}`:target==='letter-G'?'Point your index finger sideways, align your thumb with it, and curl the other three fingers.':'Follow the finger positions in the reference.';}
      }
     }
     draw(canvas.current,v,hands);setTracking(`${hands.length?hands.length+' hand'+(hands.length>1?'s':'')+' tracked':'Bring your hands into view'}`);
     const moving=isBody||target==='letter-J'||target==='letter-Z';
     if(!verified){
      if(moving){setHold(correct?100:0);if(correct){verified=true;matchRef.current();}}
      else{const result=gate.update(correct?true:uncertain?null:false,now);setHold(result.progress);if(result.completed){verified=true;matchRef.current();}}
     }
     setFeedback(verified?'Reference matched. Next is unlocked.':message);if(verified)setHold(100);
     lastFrameAt=performance.now();timer.current=setTimeout(tick,100);
    }catch(error){if(run.current!==generation)return;console.error('Recognition failed',error);cleanup();setStatus('error');setFeedback('Tracking stopped. Pause, then enable the camera to retry.');}
   }
   void tick();
  }catch(error){if(run.current!==generation)return;console.error('Camera startup failed',error);cleanup();setStatus('error');setFeedback(error instanceof DOMException&&error.name==='NotAllowedError'?'Camera permission was denied. Allow camera access in your browser, then retry.':'Could not start recognition: '+(error instanceof Error?error.message:String(error)));}
 }
 async function test(){
  if(busy.current||stream.current||checking)return;
  setChecking(true);const generation=run.current;setCheck('Checking video input with four reference photos…');let tracker:Awaited<ReturnType<typeof createTracker>>|null=null;
  try{if(isBody){const result=await checkBodyTracker();if(run.current===generation)setCheck(result);}else{tracker=await createTracker();const results=await checkTracker(tracker.detector);if(run.current===generation)setCheck(results.join(' · '));}}catch(error){if(run.current===generation)setCheck('Tracker check failed: '+(error instanceof Error?error.message:String(error)));}finally{tracker?.detector.dispose();if(run.current===generation)setChecking(false)}
 }
 return {video,canvas,status,feedback,hold,start,stop,tracking,check,checking,test,isBody};
}
