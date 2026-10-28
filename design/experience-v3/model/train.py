# 대체 소품 물체 인식 학습 — MediaPipe Model Maker, MobileNet(COCO 사전학습)에 8가지 소품만 추가 학습
import sys, json, os
os.environ.setdefault('TF_CPP_MIN_LOG_LEVEL', '2')
from mediapipe_model_maker import object_detector
EPOCHS = int(sys.argv[1]) if len(sys.argv) > 1 else 30
train = object_detector.Dataset.from_coco_folder('ds/train', cache_dir='cache/train')
val = object_detector.Dataset.from_coco_folder('ds/val', cache_dir='cache/val')
print('train', train.size, 'val', val.size, flush=True)
hp = object_detector.HParams(export_dir='exported', epochs=EPOCHS, batch_size=8, learning_rate=0.3)
opts = object_detector.ObjectDetectorOptions(supported_model=object_detector.SupportedModels.MOBILENET_MULTI_AVG, hparams=hp)
model = object_detector.ObjectDetector.create(train_data=train, validation_data=val, options=opts)
loss, coco = model.evaluate(val, batch_size=8)
print('COCO', json.dumps({k: round(float(v), 3) for k, v in coco.items()}), flush=True)
model.export_model('props.tflite')
print('exported', flush=True)
