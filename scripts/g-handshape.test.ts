import assert from 'node:assert/strict';
import {matchesGHandshape} from '../app/recognition/g-handshape';
// An articulated sideways G with visible thumb and folded fingers: a different
// projection from the back-of-hand reference used by the original matcher.
const world=[
 [0,0,0],[-.2,-.3,0],[.05,-.75,.1],[.55,-.76,.1],[1.05,-.77,.1],
 [0,-1,0],[.7,-1,0],[1.25,-1,0],[1.7,-1,0],
 [0,-.75,0],[.45,-.75,.1],[.35,-.65,.45],[.02,-.6,.3],
 [0,-.45,0],[.4,-.45,.1],[.32,-.35,.4],[.03,-.3,.3],
 [0,-.15,0],[.32,-.15,.1],[.25,-.08,.35],[.02,-.04,.25]
].map(([x,y,z])=>({x,y,z}));
const project=(p:typeof world)=>p.map(v=>({x:200+v.x*80,y:250+v.y*80}));
assert(matchesGHandshape(project(world),world));
const mirrored=world.map(p=>({...p,x:-p.x}));assert(matchesGHandshape(project(mirrored),mirrored));
const q=world.map(p=>({x:-p.y,y:p.x,z:p.z}));assert(!matchesGHandshape(project(q),q),'Downward Q must not pass as G');
const h=structuredClone(world);h[10]={x:.7,y:-.75,z:0};h[11]={x:1.2,y:-.75,z:0};h[12]={x:1.6,y:-.75,z:0};assert(!matchesGHandshape(project(h),h),'H has two extended fingers');
const l=structuredClone(world);l[3]={x:.05,y:-.2,z:.1};l[4]={x:.05,y:.4,z:.1};assert(!matchesGHandshape(project(l),l),'Perpendicular L thumb must be rejected');
const pinch=structuredClone(world);pinch[4]={...pinch[8]};assert(!matchesGHandshape(project(pinch),pinch),'Pinched fingertips must be rejected');
assert(!matchesGHandshape(project(world),undefined));assert(!matchesGHandshape(project(world),world.map(p=>({...p,z:NaN}))));
console.log('PASS: palm-view G, mirrored G, and rejection of Q, H, sideways L, pinch, absent depth and invalid landmarks. Synthetic articulation tests; live-user validation remains necessary.');
