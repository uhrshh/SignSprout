import type {Point} from '../handshape';
type SpatialPoint=Point&{z?:number};
const d=(a:SpatialPoint,b:SpatialPoint)=>Math.hypot(a.x-b.x,a.y-b.y,(a.z||0)-(b.z||0));
/** An additional view-independent G check. The original photo hides the thumb
 * and folded fingertips, so matching only its 2D projection rejects palm views.
 * Use 3D finger articulation, but retain screen orientation to reject Q. */
export function matchesGHandshape(image:Point[],world:SpatialPoint[]|undefined){
 if(image.length!==21||!world||world.length!==21||[...image,...world].some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y))||world.some(p=>!Number.isFinite(p.z)))return false;
 const scale=d(world[0],world[9]);if(scale<.00001)return false;
 const straightness=(base:number,tip:number)=>d(world[base],world[tip])/Math.max(.000001,Array.from({length:tip-base},(_,i)=>d(world[base+i],world[base+i+1])).reduce((a,b)=>a+b,0));
 if(straightness(5,8)<.88||[9,13,17].some(base=>straightness(base,base+3)>.8))return false;
 const dx=image[8].x-image[5].x,dy=image[8].y-image[5].y;
 if(Math.abs(dx)<Math.abs(dy)*1.65||Math.hypot(dx,dy)<Math.hypot(image[0].x-image[9].x,image[0].y-image[9].y)*.7)return false;
 const index={x:world[8].x-world[5].x,y:world[8].y-world[5].y,z:world[8].z!-world[5].z!};
 const thumb={x:world[4].x-world[2].x,y:world[4].y-world[2].y,z:world[4].z!-world[2].z!};
 const cosine=(index.x*thumb.x+index.y*thumb.y+index.z*thumb.z)/(Math.hypot(index.x,index.y,index.z)*Math.hypot(thumb.x,thumb.y,thumb.z));
 const gap=d(world[4],world[8])/scale;
 return cosine>.7&&straightness(2,4)>.85&&d(world[4],world[2])/scale>.3&&gap>.12&&gap<1.6;
}
