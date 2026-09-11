import type {HandDetector} from '@tensorflow-models/hand-pose-detection/dist/hand_detector';
import {classify} from './handshape';
export function prepareVideo(video:HTMLVideoElement){
 if(video.readyState<2||!video.videoWidth||!video.videoHeight)return false;
 video.width=video.videoWidth;video.height=video.videoHeight;return true;
}
export async function createTracker(maxHands=1){
 const tf=await import('@tensorflow/tfjs-core');
 const {load}=await import('@tensorflow-models/hand-pose-detection/dist/tfjs/detector');
 await import('@tensorflow/tfjs-backend-webgl');
 try{if(!await tf.setBackend('webgl'))throw new Error('GPU unavailable');await tf.ready()}
 catch{await import('@tensorflow/tfjs-backend-cpu');await tf.setBackend('cpu');await tf.ready()}
 const detector=await load({runtime:'tfjs',modelType:'lite',maxHands,detectorModelUrl:'/models/detector/model.json',landmarkModelUrl:'/models/landmark/model.json'});
 return {detector,backend:tf.getBackend()};
}
export async function checkTracker(detector:HandDetector){
 const results=[];
 for(const letter of ['l','y','i','v']){
  const image=new Image();image.src=`/references/${letter}.jpg`;await image.decode();
  const surface=document.createElement('canvas');surface.width=520;surface.height=Math.round(image.height/image.width*320)+200;
  const ctx=surface.getContext('2d')!;ctx.fillStyle='#777777';ctx.fillRect(0,0,surface.width,surface.height);ctx.drawImage(image,100,100,320,surface.height-200);
  // Exercise the same HTMLVideoElement input as the webcam, including its dimensions.
  const stream=surface.captureStream(10),video=document.createElement('video');
  video.muted=true;video.playsInline=true;video.srcObject=stream;
  let prediction;
  try{await video.play();if(!prepareVideo(video))throw new Error('Test video has no decoded frame');prediction=await detector.estimateHands(video,{staticImageMode:true});}
  finally{video.pause();stream.getTracks().forEach(track=>track.stop());video.srcObject=null;}

  const p=prediction[0]?.keypoints;
  const detected=p?classify(p):null;
  results.push(`${letter.toUpperCase()}: ${detected??'not recognized'}`);
 }
 detector.reset();
 return results;
}
