import {bodyFeature,matchGesture,type BodyFrame,type Landmark,type GestureFeature} from './matching';
import {createTracker} from '../tracker';
import {recoverHands} from './two-hands';
import {loadReferences} from './data';
type Result={poseLandmarks?:Landmark[];leftHandLandmarks?:Landmark[];rightHandLandmarks?:Landmark[]};
type Engine={setOptions:(v:object)=>void;initialize:()=>Promise<void>;onResults:(cb:(r:Result)=>void)=>void;send:(v:{image:HTMLVideoElement|HTMLCanvasElement})=>Promise<void>;close:()=>Promise<void>};
declare global{interface Window{Holistic:new(options:{locateFile:(file:string)=>string})=>Engine}}
let loading:Promise<void>|null=null;
function loadRuntime(){
 if(window.Holistic)return Promise.resolve();
 if(!loading)loading=new Promise<void>((resolve,reject)=>{const script=document.createElement('script');script.src='/models/holistic/holistic.js';script.onload=()=>resolve();script.onerror=()=>{script.remove();loading=null;reject(new Error('Could not load movement tracking. Please retry.'))};document.head.appendChild(script)});
 return loading;
}
export async function createBodyTracker(requiredHands:1|2=1){
 await loadRuntime();
 const engine=new window.Holistic({locateFile:file=>'/models/holistic/'+file});
 engine.setOptions({modelComplexity:1,smoothLandmarks:true,enableSegmentation:false,refineFaceLandmarks:false,minDetectionConfidence:.4,minTrackingConfidence:.4,selfieMode:false});
 let latest:Result={};engine.onResults(r=>{latest=r});
 let fallback:Awaited<ReturnType<typeof createTracker>>|null=null;
 try{await engine.initialize();fallback=await createTracker(2)}catch(error){await engine.close();throw error}
 const snapshot=document.createElement('canvas'),crop=document.createElement('canvas');crop.width=320;crop.height=320;
 return {async estimate(video:HTMLVideoElement):Promise<BodyFrame>{
  // All detectors must see the same instant, even when inference is slow.
  snapshot.width=video.videoWidth;snapshot.height=video.videoHeight;
  snapshot.getContext('2d')!.drawImage(video,0,0);
  latest={};await engine.send({image:snapshot});
  const body:BodyFrame={pose:latest.poseLandmarks||null,left:latest.leftHandLandmarks||null,right:latest.rightHandLandmarks||null,aspect:video.videoWidth/video.videoHeight};
  if(body.left&&body.right||requiredHands===1&&(body.left||body.right))return body;
  const detector=fallback!.detector;
  const hands=await detector.estimateHands(snapshot,{flipHorizontal:false,staticImageMode:false});
  let recovered=recoverHands(body,hands,video.videoWidth,video.videoHeight);
  // Small hands in a full upper-body frame need a closer detector view.
  // Crop around the observed pose wrist; map detections back to video pixels.
  const pose=body.pose;
  if(pose&&(!recovered.left&&!recovered.right||requiredHands===2)){for(const side of ['left','right'] as const){
   if(recovered[side])continue;
   const wrist=pose[side==='left'?15:16];if(!wrist||(wrist.visibility??1)<.4)continue;
   const w=video.videoWidth,h=video.videoHeight;
   const shoulder=Math.hypot((pose[11].x-pose[12].x)*w,(pose[11].y-pose[12].y)*h);
   const size=Math.min(w,h,Math.max(120,shoulder*1.5));
   const x=Math.max(0,Math.min(w-size,wrist.x*w-size/2)),y=Math.max(0,Math.min(h-size,wrist.y*h-size/2));
   crop.getContext('2d')!.drawImage(snapshot,x,y,size,size,0,0,320,320);
   const close=await detector.estimateHands(crop,{flipHorizontal:false,staticImageMode:true});
   const mapped=close.map(hand=>({...hand,keypoints:hand.keypoints.map(p=>({...p,x:x+p.x*size/320,y:y+p.y*size/320}))}));
   recovered=recoverHands(recovered,mapped,w,h);
  }}
  detector.reset();return recovered;
 },dispose:async()=>{fallback?.detector.dispose();await engine.close()}};
}
export async function checkBodyTracker(){
 const tracker=await createBodyTracker(),video=document.createElement('video');
 video.muted=true;video.playsInline=true;video.src='/demos/hello.mp4';
 try{
  await video.play();video.width=video.videoWidth;video.height=video.videoHeight;
  let pose=false,hand=false;const features:GestureFeature[]=[];video.pause();
  for(const fraction of Array.from({length:24},(_,i)=>(i+.5)/24)){
   await new Promise<void>((resolve,reject)=>{const timeout=setTimeout(()=>{video.onseeked=null;reject(new Error('Reference video did not decode in time.'))},5000);video.onseeked=()=>{clearTimeout(timeout);video.onseeked=null;resolve()};video.currentTime=video.duration*fraction;});
   const frame=await tracker.estimate(video);pose ||= !!frame.pose;hand ||= !!frame.left||!!frame.right;const feature=bodyFeature(frame);if(feature)features.push(feature);
  }
  if(!pose||!hand)throw new Error('The reference video did not produce both body and hand landmarks.');
  const references=await loadReferences();const result=matchGesture(features,references.gestures,'hello');
  if(!result.matched)throw new Error('Tracking loaded, but HELLO reference matching did not pass: '+result.distance.toFixed(2));
  return 'Body + hands + HELLO movement matching passed. This diagnostic does not complete your lesson.';
 }finally{video.pause();video.removeAttribute('src');video.load();await tracker.dispose()}
}
