import json,numpy as np,cv2
from pathlib import Path
from PIL import Image
import mediapipe as mp
raw=json.loads(Path('research/static-references.json').read_text());static={}
for key,variants in raw.items():
 normalized=[]
 for points in variants:
  p=np.array(points);p-=p[0];p/=np.linalg.norm(p[9]);normalized.append(np.round(p,4).tolist())
 static[key]=normalized
# H uses the same two adjacent extended fingers as U, directed sideways.
# Geometric template, not a measured H reference; tracked separately in provenance.
static['letter-H']=[[[y,-x] for x,y in p] for p in static['letter-U']]
Path('public/models/static-signs.json').write_text(json.dumps(static,separators=(',',':')))
rawgestures=json.loads(Path('research/gesture-references.json').read_text());media=json.loads(Path('app/media.json').read_text())
for key,frames in rawgestures.items():
 if media[key]['src'].endswith('.mp4'):
  cap=cv2.VideoCapture('public'+media[key]['src']);ratio=cap.get(cv2.CAP_PROP_FRAME_WIDTH)/cap.get(cv2.CAP_PROP_FRAME_HEIGHT);cap.release()
 else:
  with Image.open('public'+media[key]['src']) as im:ratio=im.width/im.height
 for f in frames:f['aspect']=ratio
model=mp.solutions.holistic.Holistic(static_image_mode=True,model_complexity=1,min_detection_confidence=.2)
for word in ['yes','friend','understand','you']:
 paths=sorted(Path('research/gesture-images').glob(word+'-*.jpg'),key=lambda p:int(p.stem.split('-')[-1]))
 # First four FRIEND photos form one ordered performance; other sequences are variants.
 if word=='friend':paths=paths[:4]
 frames=[]
 for path in paths:
  im=cv2.imread(str(path));h,w=im.shape[:2];im=cv2.resize(im,(round(w*640/h),640));r=model.process(cv2.cvtColor(im,cv2.COLOR_BGR2RGB))
  def pts(p):return [[round(v.x,5),round(v.y,5),round(v.z,5)] for v in p.landmark] if p else None
  frames.append(dict(pose=pts(r.pose_landmarks),left=pts(r.left_hand_landmarks),right=pts(r.right_hand_landmarks),aspect=w/h))
 rawgestures[word]=frames;print(word,len(frames),'hands',sum(bool(f['left'] or f['right']) for f in frames))
model.close()
Path('research/gesture-references-with-aspect.json').write_text(json.dumps(rawgestures))
