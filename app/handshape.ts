export type Point={x:number;y:number};
const dist=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
export function classify(p:Point[]):string|null{
 if(p.length!==21||p.some(point=>!Number.isFinite(point.x)||!Number.isFinite(point.y)))return null;
 const scale=dist(p[0],p[9]);if(scale<35)return null;
 const extended=[8,12,16,20].map(t=>dist(p[t],p[0])>dist(p[t-2],p[0])*1.25 && dist(p[t],p[t-3])>scale*.65);
 const thumb=dist(p[4],p[5])>scale*.65;
 const [i,m,r,k]=extended;
 if(i&&!m&&!r&&!k&&thumb)return 'L';
 if(!i&&!m&&!r&&k&&thumb)return 'Y';
 if(!i&&!m&&!r&&k&&!thumb)return 'I';
 if(i&&m&&!r&&!k&&!thumb&&dist(p[8],p[12])>scale*.3)return 'V';
 return null;
}
export const signs=[
 {letter:'L',title:'Make a little L.',instruction:'Point your index finger up and your thumb out. Fold your other three fingers into your palm.',tip:'Keep your thumb and index finger apart, like the two sides of an L.'},
 {letter:'Y',title:'Give your pinky some space.',instruction:'Extend your thumb and pinky. Curl your index, middle, and ring fingers into your palm.',tip:'Only your thumb and pinky should be extended. Face your palm forward.'},
 {letter:'I',title:'Small finger. Big moment.',instruction:'Raise your pinky. Fold your other fingers into your palm and rest your thumb across them.',tip:'Keep your thumb tucked in. The pinky is the only raised finger.'},
 {letter:'V',title:'A little room for two.',instruction:'Raise and separate your index and middle fingers. Fold your ring finger and pinky, with your thumb over them.',tip:'Separate your two raised fingers. Keep your palm facing the camera.'}
];
export function retrieve(question:string,current:number){
 const q=question.toLowerCase();
 const letter=q.match(/(?:letter|sign)\s+([lyiv])\b/)?.[1]?.toUpperCase();
 if(letter){const s=signs.find(s=>s.letter===letter)!;return s.instruction+' '+s.tip;}
 if(/camera|recogn|detect|light|working/.test(q))return 'Use bright, even light and a plain background. Keep one whole hand in frame with your palm forward. Hold still for about 1.5 seconds. This experimental checker compares finger positions; it can miss or misread signs.';
 if(/privacy|save|record|video/.test(q))return 'Your camera frames are processed in your browser and are not uploaded or recorded by this app. The hand model downloads when you enable the camera. Progress is saved only in this browser.';
 if(/left|dominant|right/.test(q))return 'Use whichever hand feels natural, and stay consistent. The preview is mirrored like a mirror. The checker uses distances between finger joints and supports either hand.';
 if(/asl|language|grammar/.test(q))return 'ASL is a complete language with its own grammar and culture. These four fingerspelling shapes are a starting point, not a full ASL course. Learn from Deaf teachers and fluent signers as you continue.';
 if(/help|hint|thumb|finger|how|shape/.test(q))return signs[current].instruction+' '+signs[current].tip;
 return 'I can help with the letters L, Y, I, and V, camera setup, either hand, and privacy. Try “How do I sign Y?” My answers come from this small lesson library; I do not generate answers outside it.';
}
