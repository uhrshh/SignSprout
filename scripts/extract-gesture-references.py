"""Extract local reference landmarks for experimental sequence matching.
Requires MediaPipe 0.10.21, OpenCV and Pillow in an isolated Python environment.
Reference media: ASL University / Dr. Bill Vicars, URLs retained in app/media.json.
"""
import json,cv2,numpy as np
from PIL import Image,ImageSequence
from pathlib import Path
import mediapipe as mp
manifest=json.loads(Path('app/media.json').read_text())
model=mp.solutions.holistic.Holistic(static_image_mode=True,model_complexity=1,min_detection_confidence=.3)
result={}
def landmarks(r):
 def pts(p): return [[round(v.x,5),round(v.y,5),round(v.z,5)] for v in p.landmark] if p else None
 return dict(pose=pts(r.pose_landmarks),left=pts(r.left_hand_landmarks),right=pts(r.right_hand_landmarks))
for key,media in manifest.items():
 if not media['src'].startswith('/'):continue
 path='public'+media['src'];frames=[]
 if path.endswith('.mp4'):
  cap=cv2.VideoCapture(path)
  while True:
   ok,im=cap.read()
   if not ok:break
   frames.append(cv2.cvtColor(im,cv2.COLOR_BGR2RGB))
  cap.release()
 else:
  with Image.open(path) as im:frames=[np.asarray(f.convert('RGB')) for f in ImageSequence.Iterator(im)]
 chosen=np.linspace(0,len(frames)-1,min(32,len(frames))).astype(int);out=[]
 for i in chosen:
  im=frames[i];h,w=im.shape[:2];im=cv2.resize(im,(round(w*640/h),640));out.append(landmarks(model.process(im)))
 result[key]=out
 print(key,len(out),'pose',sum(bool(x['pose']) for x in out),'hands',sum(bool(x['left'] or x['right']) for x in out),flush=True)
Path('research/gesture-references.json').write_text(json.dumps(result));model.close()
