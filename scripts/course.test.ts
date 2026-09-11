import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {cards,byId,units,lookupLesson} from '../app/course';
import {parseProgress,initialProgress,completeCard,reviewCard,unitCompleted,dayKey,streak} from '../app/progress';
import {prepareVideo} from '../app/tracker';
import {classify} from '../app/handshape';
assert.equal(units.length,8);assert.equal(cards.length,71);assert.equal(new Set(cards.map(c=>c.id)).size,cards.length);
for(const unit of units){assert(unit.cards.length>=5);assert(unit.cards.every(id=>byId[id]),unit.id);}
assert(cards.every(c=>units.some(u=>u.cards.includes(c.id))),'All cards must be reachable');
for(const card of cards){assert(card.question.choices[card.question.answer]);assert.equal(new Set(card.question.choices).size,card.question.choices.length);assert(card.steps.length>=2);if(card.media?.src.startsWith('/'))assert(existsSync('public'+card.media.src),card.media.src);if(card.sequence)assert(card.sequence.every(id=>byId[id]));}
for(const c of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ')assert(byId['letter-'+c]);
for(let n=1;n<=10;n++)assert(byId['number-'+n]);
assert.equal(cards.filter(c=>c.camera).length,64);assert(cards.filter(c=>c.type!=='concept').every(c=>c.camera===c.id));
const p=parseProgress(null,'["L","L","bad","Y"]');assert.deepEqual(Object.keys(p.completed),['letter-L','letter-Y']);
const broken=parseProgress('{broken',null);assert.deepEqual(broken,initialProgress);
const malformed=parseProgress(JSON.stringify({version:2,completed:{fake:{method:'camera',at:'bad'}},unit:'bad',index:999,days:[null,'bad'],quizzes:{bad:100},reviews:{bad:{due:'bad'}}}),null);assert.equal(malformed.unit,units[0].id);assert.equal(Object.keys(malformed.completed).length,0);
let practiced=completeCard(initialProgress,'letter-L','camera');practiced=completeCard(practiced,'letter-L','self');assert.equal(Object.keys(practiced.completed).length,1);assert.equal(practiced.completed['letter-L'].method,'camera');assert(practiced.days.includes(dayKey()));
assert.equal(unitCompleted({...practiced,quizzes:{foundations:100}},'foundations'),false);
let unitDone=units[0].cards.reduce((p,id)=>completeCard(p,id,byId[id].camera?'camera':byId[id].type==='concept'?'read':'self'),initialProgress);assert.equal(unitCompleted(unitDone,'foundations'),false);unitDone={...unitDone,quizzes:{foundations:80}};assert(unitCompleted(unitDone,'foundations'));
const r=reviewCard(practiced,'letter-L',true);assert(r.reviews['letter-L'].due>dayKey());assert.equal(reviewCard(r,'letter-L',false).reviews['letter-L'].due,dayKey());assert.equal(streak([dayKey()]),1);
assert.match(lookupLesson('How do I sign THANK YOU?').text,/lips/);assert.match(lookupLesson('number 7').text,/ring/);assert.match(lookupLesson('letter Z').text,/Z/);assert.match(lookupLesson('camera').text,/J, Z/);assert.match(lookupLesson('stock predictions').text,/do not invent/);
const video={readyState:4,videoWidth:640,videoHeight:480,width:0,height:0};assert(prepareVideo(video as HTMLVideoElement));assert.equal(video.width,640);assert.equal(video.height,480);assert(!prepareVideo({...video,videoWidth:0} as HTMLVideoElement));
assert.equal(classify(Array.from({length:21},()=>({x:NaN,y:NaN}))),null);
console.log('PASS: course reachability, 71 cards, all media, questions, migration, malformed storage, no duplicate XP, unit mastery, review scheduling, retrieval, video dimensions, invalid landmarks.');

assert.equal(completeCard(initialProgress,'letter-L','self'),initialProgress);
assert.equal(completeCard(initialProgress,'welcome','camera'),initialProgress);
assert.equal(completeCard(initialProgress,'letter-A','self'),initialProgress);
