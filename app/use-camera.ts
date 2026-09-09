'use client';
import {useEffect,useRef,useState} from 'react';
import {classify} from './handshape';
export function useCamera(target:string,onMatch:()=>void){
 const video=useRef<HTMLVideoElement>(null),canvas=useRef<HTMLCanvasElement>(null);
 const stream=useRef<MediaStream|null>(null),detector=useRef<any>(null),run=useRef(0),timer=useRef<ReturnType<typeof setTimeout>|null>(null),targetRef=useRef(target),matchRef=useRef(onMatch),held=useRef(0),busy=useRef(false);
 const [status,setStatus]=useState('off'),[feedback,setFeedback]=useState('Face your palm toward the camera. Relax your shoulders.'),[hold,setHold]=useState(0);
 targetRef.current=target;matchRef.current=onMatch;
 useEffect(()=>{held.current=0;setHold(0)},[target]);
 function cleanup(){run.current++;busy.current=false;if(timer.current)clearTimeout(timer.current);stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;if(video.current)video.current.srcObject=null;held.current=0;setHold(0);}
 function stop(){cleanup();setStatus('off');setFeedback('Camera paused. Enable it whenever you’re ready.');}
 useEffect(()=>()=>{run.current++;stream.current?.getTracks().forEach(t=>t.stop());if(timer.current)clearTimeout(timer.current);detector.current?.dispose()},[]);
 async function start(){
  if(busy.current||stream.current)return;busy.current=true;const id=++run.current;setStatus('loading');setFeedback('Opening camera and downloading the hand model…');
  try{
   if(!navigator.mediaDevices?.getUserMedia)throw new Error('Camera access requires a secure browser connection.');
   const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:640,height:480},audio:false});
   if(run.current!==id){s.getTracks().forEach(t=>t.stop());return;}stream.current=s;
   s.getVideoTracks()[0].onended=()=>{if(run.current===id)stop()};
   if(video.current){video.current.srcObject=s;await video.current.play();}
   const [tf,hands]=await Promise.all([import('@tensorflow/tfjs-core'),import('@tensorflow-models/hand-pose-detection/dist/tfjs/detector')]);
   await import('@tensorflow/tfjs-backend-webgl');await tf.setBackend('webgl');await tf.ready();
   if(run.current!==id)return;
   if(!detector.current)detector.current=await hands.load({runtime:'tfjs',modelType:'lite',maxHands:1});
   if(run.current!==id){detector.current?.dispose();detector.current=null;return;}
   setStatus('live');busy.current=false;
   async function tick(){
    if(run.current!==id||!video.current)return;
    try{
     const v=video.current;
     if(v.readyState<2){timer.current=setTimeout(tick,150);return;}
     const predictions=await detector.current.estimateHands(v,{flipHorizontal:false});if(run.current!==id)return;
     const p=predictions[0]?.keypoints;const ctx=canvas.current?.getContext('2d');
     if(ctx&&canvas.current){canvas.current.width=v.videoWidth;canvas.current.height=v.videoHeight;ctx.clearRect(0,0,v.videoWidth,v.videoHeight);if(p){ctx.strokeStyle='#d0eca4';ctx.fillStyle='#d0eca4';ctx.lineWidth=3;for(const chain of [[0,1,2,3,4],[0,5,6,7,8],[5,9,10,11,12],[9,13,14,15,16],[13,17,18,19,20],[0,17]]){ctx.beginPath();chain.forEach((n,j)=>j?ctx.lineTo(p[n].x,p[n].y):ctx.moveTo(p[n].x,p[n].y));ctx.stroke()}for(const point of p){ctx.beginPath();ctx.arc(point.x,point.y,4,0,Math.PI*2);ctx.fill()}}}
     const found=p?classify(p):null;
     if(found===targetRef.current){if(!held.current)held.current=performance.now();const amount=Math.min(100,(performance.now()-held.current)/15);setHold(amount);setFeedback(amount>=100?'Nice shape! You earned 25 XP. Ready for the next sign?':'Looking good. Hold your hand steady…');if(amount>=100)matchRef.current();}
     else{held.current=0;setHold(0);setFeedback(!p?'Bring one whole hand into the frame.':found?`I see a ${found}-like shape. Try the letter ${targetRef.current}.`:'Hand found. Follow the finger positions on your lesson card.');}
     timer.current=setTimeout(tick,100);
    }catch{cleanup();setStatus('error');setFeedback('Hand tracking stopped. Try enabling the camera again, or use self-practice.');}
   }
   void tick();
  }catch(e){if(run.current!==id)return;cleanup();setStatus('error');setFeedback(e instanceof DOMException&&e.name==='NotAllowedError'?'Camera permission was denied. Allow camera access in your browser, then retry.':e instanceof DOMException&&e.name==='NotFoundError'?'No webcam was found. Connect a camera or use self-practice.':'Could not start hand tracking. Check your connection and camera, then retry. Self-practice is also available.');}
 }
 return {video,canvas,status,feedback,hold,start,stop};
}
