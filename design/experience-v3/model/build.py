# 대체 소품 데이터셋 — Open Images v5 validation/test 의 박스 주석에서 소품과 비슷한 8가지를 골라 COCO 형식으로
import csv, collections, json, os, random, sys, urllib.request, concurrent.futures as cf
from PIL import Image
random.seed(7)
C={'/m/073bxn':'easel','/m/06z37_':'canvas','/m/0dtln':'lamp','/m/0fqt361':'stool','/m/01mzpv':'stool','/m/04dr76w':'mortar','/m/0bt_c3':'diary','/m/025dyy':'tube','/m/0584n8':'pochade','/m/01s55n':'pochade'}
NAMES=['easel','canvas','lamp','stool','mortar','diary','tube','pochade']
CAP=220
boxes=collections.defaultdict(list); split={}; hero=collections.defaultdict(set)
for f,sp in [('validation-bbox.csv','validation'),('test-bbox.csv','test')]:
    for r in csv.DictReader(open(f)):
        k=C.get(r['LabelName'])
        if not k or r['IsGroupOf']=='1': continue
        b=[float(r[x]) for x in ('XMin','XMax','YMin','YMax')]
        boxes[r['ImageID']].append((k,b)); split[r['ImageID']]=sp
        if (b[1]-b[0])*(b[3]-b[2])>0.04 and r['IsDepiction']=='0': hero[k].add(r['ImageID'])
pick=set()
for k in NAMES:
    ids=sorted(hero[k]); random.shuffle(ids); pick.update(ids[:CAP])
pick=sorted(pick); random.shuffle(pick)
os.makedirs('raw',exist_ok=True)
def get(i):
    p=f'raw/{i}.jpg'
    if os.path.exists(p): return i
    try:
        urllib.request.urlretrieve(f'https://open-images-dataset.s3.amazonaws.com/{split[i]}/{i}.jpg',p+'.tmp')
        im=Image.open(p+'.tmp').convert('RGB'); im.thumbnail((640,640)); im.save(p,quality=88); os.remove(p+'.tmp'); return i
    except Exception as e: return None
with cf.ThreadPoolExecutor(16) as ex: ok=[i for i in ex.map(get,pick) if i]
print('downloaded',len(ok),'of',len(pick))
nval=int(len(ok)*0.15)
for name,ids in [('val',ok[:nval]),('train',ok[nval:])]:
    d=f'ds/{name}'; os.makedirs(d+'/images',exist_ok=True)
    coco={'categories':[{'id':0,'name':'background'}]+[{'id':i+1,'name':n} for i,n in enumerate(NAMES)],'images':[],'annotations':[]}
    aid=0; per=collections.Counter()
    for n,i in enumerate(ids):
        im=Image.open(f'raw/{i}.jpg'); w,h=im.size
        os.replace(f'raw/{i}.jpg',f'{d}/images/{i}.jpg') if False else im.save(f'{d}/images/{i}.jpg',quality=88)
        coco['images'].append({'id':n,'file_name':f'{i}.jpg','width':w,'height':h})
        for k,(x0,x1,y0,y1) in boxes[i]:
            aid+=1; per[k]+=1
            coco['annotations'].append({'id':aid,'image_id':n,'category_id':NAMES.index(k)+1,'bbox':[x0*w,y0*h,(x1-x0)*w,(y1-y0)*h],'area':(x1-x0)*w*(y1-y0)*h,'iscrowd':0})
    json.dump(coco,open(f'{d}/labels.json','w'))
    print(name,len(ids),'images',dict(per))
