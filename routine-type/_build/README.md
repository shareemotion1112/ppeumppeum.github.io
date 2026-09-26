# 루틴 유형 테스트 빌드·검사

`_build/`는 GitHub Pages(Jekyll)가 배포하지 않는 폴더다.

## 빌드
문항·결과 문구는 `assets/data.json` 한 곳에서 고친다. 고친 뒤 결과 페이지를 다시 만든다.

```bash
cd routine-type
python3 _build/build.py                     # r/*.html 8개만
python3 _build/build.py --chars <캐릭터 PNG 폴더>   # + 캐릭터 WebP, OG JPG (Pillow·Pretendard 필요)
```

캐릭터 원본: `iroutine/docs/assets/routine-type/characters/{코드}.png`
전역 gitignore가 `*.png`라 배포 이미지는 WebP/JPG로 만든다.

## 로컬 확인
```bash
cd terms && python3 -m http.server 8765
# http://localhost:8765/routine-type/
```

## 채점 자동 검사
서버를 켠 상태에서:
```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --virtual-time-budget=120000 \
  --dump-dom "http://localhost:8765/routine-type/_build/qa/flow.html" | grep -E "OK|FAIL|DONE"
```
8유형 + 3:2 경계 2건이 모두 `OK`여야 한다.

## 배포 전 설정 (`assets/config.js`)
- `GA_ID`: GA4 웹 스트림 측정 ID
- `KAKAO_JS_KEY`: Kakao Developers JavaScript 키 (플랫폼 > Web에 배포 도메인 등록)
- `KAKAO_SDK_URL`: Kakao 문서의 최신 버전·integrity 확인
