# 아틀리에 소품 인식 모델 (시험판)

- props.tflite — MediaPipe Object Detector(MobileNet, COCO 사전학습)에 8가지를 추가 학습. 대체 소품: Open Images v5 공개 사진 1,289장
  - easel=삼각대 · canvas=액자 · lamp=램프 · stool=스툴·의자 · mortar=병 · diary=책 · tube=상자 · pochade=서류가방·여행가방 (돼지 방광은 대체 분류 없음)
  - 검증 193장: AP50 0.55, 큰 물체 재현율 0.57
- 현장 소품으로 바꾸는 법: 소품마다 둘레를 도는 영상 30초~1분 → 1초 3장 추출 → 박스 표시(자동 + 검수) → ds/train·ds/val 에 COCO 형식 → train.py → props.tflite 교체. 웹(detect.js)은 그대로
- build.py: 공개 사진에서 데이터셋 만들기 / train.py: 학습(Python 3.10, mediapipe-model-maker, TF_USE_LEGACY_KERAS=1)
