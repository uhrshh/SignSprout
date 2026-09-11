"""Extract static ASLU hand references, preserving original image orientation."""
import json,cv2,numpy as np
from pathlib import Path
import mediapipe as mp
models=[mp.solutions.hands.Hands(static_image_mode=True,max_num_hands=1,model_complexity=i,min_detection_confidence=.15) for i in [0,1]]
refs={};report={}
paths=[('letter-'+c,'public/references/'+c.lower()+'.jpg') for c in 'ABCDEFGHIKLMNOPQRSTUVWXY']+ [('number-'+str(n),'public/demos/number-'+str(n)+'.jpg') for n in range(1,10)]
for key,path in paths:
 im=cv2.imread(path);h,w=im.shape[:2];im=cv2.resize(im,(320,round(h*320/w)));im=cv2.copyMakeBorder(im,100,100,100,100,cv2.BORDER_CONSTANT,value=(128,128,128));h,w=im.shape[:2];samples=[]
 for turn in [0,1,3,2]:
  rotated=np.rot90(im,turn).copy();rh,rw=rotated.shape[:2]
  for model in models:
   r=model.process(cv2.cvtColor(rotated,cv2.COLOR_BGR2RGB))
   if not r.multi_hand_landmarks:continue
   points=np.array([[p.x*rw,p.y*rh] for p in r.multi_hand_landmarks[0].landmark])
   if turn==1:points=np.array([[w-y,x] for x,y in points])
   if turn==2:points=np.array([[w-x,h-y] for x,y in points])
   if turn==3:points=np.array([[y,h-x] for x,y in points])
   samples.append(np.round(points,3).tolist())
 refs[key]=samples;report[key]=len(samples);print(key,len(samples),flush=True)
Path('research/static-references.json').write_text(json.dumps(refs));Path('research/static-coverage.json').write_text(json.dumps(report));[m.close() for m in models]
