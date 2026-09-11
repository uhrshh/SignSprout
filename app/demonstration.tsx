'use client';
import {useState,useRef} from 'react';
import {Play,ArrowUpRight,Pause,RotateCcw} from 'lucide-react';
import type {Card} from './course';
export function Demonstration({card,hideLabel=false}:{card:Card;hideLabel?:boolean}){
 const [playing,setPlaying]=useState(false),[failed,setFailed]=useState(false),[animate,setAnimate]=useState(false),[repeat,setRepeat]=useState(0);const player=useRef<HTMLVideoElement>(null);const m=card.media;
 if(!m)return null;
 const gif=m.src.endsWith('.gif')&&m.animated!==false;
 return <figure className={'demo '+(hideLabel?'quiz-demo':'')}>
 {m.kind==='youtube'?playing?<iframe title={`${card.label} — ASL University demonstration`} src={`${m.src}?rel=0&playsinline=1`} allow="fullscreen; picture-in-picture" allowFullScreen/>:<button className="video-cover" onClick={()=>setPlaying(true)}><span><Play size={28}/></span><b>Watch {hideLabel?'the sign':card.label}</b><small>ASL University · loads YouTube</small></button>:m.kind==='video'?<><video ref={player} src={m.src} playsInline controls preload="metadata" onError={()=>setFailed(true)} aria-label={`${card.label} demonstration`}/><div className="media-controls"><button onClick={()=>{if(player.current)player.current.playbackRate=.5}}>0.5×</button><button onClick={()=>{if(player.current)player.current.playbackRate=1}}>1×</button></div></>:gif?<><div className="gif-frame">{animate?<img key={repeat} src={m.src} alt={hideLabel?'ASL sign to identify':`${card.label} demonstration`} onError={()=>setFailed(true)}/>:<button className="video-cover" onClick={()=>setAnimate(true)}><span><Play size={28}/></span><b>Play {hideLabel?'the sign':card.label}</b><small>ASL University demonstration</small></button>}</div>{animate&&<div className="media-controls"><button onClick={()=>setAnimate(false)}><Pause size={14}/>Stop</button><button onClick={()=>setRepeat(repeat+1)}><RotateCcw size={14}/>Replay</button></div>}</>:<img src={m.src} alt={hideLabel?'ASL handshape to identify':`${card.label}: ${card.description}`} width={225} height={235} onError={()=>setFailed(true)}/>}
 {failed&&<p className="error-note">The demonstration could not load. Open the original lesson below to view it.</p>}
 {!hideLabel&&<figcaption><a href={card.source} target="_blank" rel="noreferrer">{hideLabel?'View source after answering':'ASL University · Dr. Bill Vicars'}<ArrowUpRight size={13}/></a></figcaption>}
 </figure>
}
