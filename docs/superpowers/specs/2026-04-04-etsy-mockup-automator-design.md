# Etsy Mockup Automator — 설계 문서

## 개요
Etsy 디지털 상품 셀러를 위한 **브라우저 기반 목업 자동화 도구**.
1개의 아트워크 이미지를 최대 10개의 PSD 목업 파일에 자동으로 적용하고, 결과를 미리보기한 뒤 JPG로 일괄 내보내기하는 웹 애플리케이션.

## 사용자 워크플로우

```
1. 브라우저에서 index.html 열기
2. 아트워크(디지털 상품) 이미지 1개 업로드
3. 목업 PSD 파일 최대 10개 업로드
4. "적용" 버튼 클릭
5. 각 목업에 아트워크가 적용된 결과를 미리보기 그리드로 확인
6. "모두 내보내기" 버튼 → p1.jpg, p2.jpg, ... 자동 다운로드
```

## 기술 아키텍처

### 전체 구조

```
┌─────────────────────────────────────────────┐
│  브라우저 (index.html)                        │
│                                             │
│  ┌──────────────┐    ┌───────────────────┐  │
│  │  UI 영역      │    │  Photopea iframe  │  │
│  │              │    │  (숨김, 처리 엔진)   │  │
│  │  - 파일 업로드 │◀──▶│                   │  │
│  │  - 미리보기    │    │  postMessage 통신  │  │
│  │  - 내보내기    │    │                   │  │
│  └──────────────┘    └───────────────────┘  │
└─────────────────────────────────────────────┘
         ▲                      ▲
         │                      │
    사용자 파일              Photopea.com
    (로컬 디스크)            (외부 서비스)
```

### 핵심 컴포넌트

#### 1. UI Layer (`index.html` + `index.css`)
- **아트워크 업로드 영역**: 드래그 앤 드랍 또는 파일 선택 (PNG/JPG, 1개)
- **목업 업로드 영역**: 드래그 앤 드랍 또는 파일 선택 (PSD, 최대 10개)
- **업로드된 파일 목록**: 파일명, 크기, 삭제 버튼
- **"적용" 버튼**: 처리 시작
- **진행 상태**: 현재 처리 중인 파일 번호 표시 (예: "3/7 처리 중...")
- **미리보기 그리드**: 적용 완료된 결과 이미지를 2열 또는 3열 그리드로 표시
- **"모두 내보내기" 버튼**: 결과 JPG 파일을 일괄 다운로드

#### 2. Photopea Engine (`engine.js`)
Photopea iframe과의 통신을 관리하는 모듈.

**핵심 함수들:**
- `initPhotopea()`: iframe 로드 및 `"done"` 메시지 대기
- `loadPSD(arrayBuffer)`: PSD 파일을 iframe에 전달
- `loadArtwork(arrayBuffer)`: 아트워크 이미지를 전달
- `runScript(scriptString)`: Photopea 스크립트 실행
- `exportJPG(quality)`: 결과를 JPG ArrayBuffer로 받아오기
- `waitForDone()`: Photopea의 `"done"` 메시지 대기 (Promise)

**스마트 오브젝트 교체 스크립트:**
```javascript
// 1. "모양 1" 스마트 오브젝트 레이어 선택
var layer = app.activeDocument.layers.getByName("모양 1");
app.activeDocument.activeLayer = layer;

// 2. 스마트 오브젝트 내부 열기
executeAction(stringIDToTypeID("placedLayerEditContents"));

// 3. 기존 내용 제거 (스마트 오브젝트 내부의 모든 레이어)
while(app.activeDocument.layers.length > 0) {
    app.activeDocument.layers[0].remove();
}
```

그 뒤:
```javascript
// 4. 아트워크를 ArrayBuffer로 postMessage 전달 (별도 단계)
// → Photopea가 새 레이어로 자동 열림

// 5. 스마트 오브젝트 캔버스에 맞게 리사이즈
var doc = app.activeDocument;
var layer = doc.activeLayer;
layer.resize(
    (doc.width / layer.bounds[2]) * 100,
    (doc.height / layer.bounds[3]) * 100
);

// 6. 저장 후 닫기 → 원본 목업에 반영
app.activeDocument.save();
app.activeDocument.close();
```

마지막:
```javascript
// 7. 결과를 JPG 80% 품질로 추출
app.activeDocument.saveToOE("jpg:0.8");
```

#### 3. File Manager (`files.js`)
- 사용자가 업로드한 파일을 `ArrayBuffer`로 변환하여 메모리에 보관
- 결과 JPG `ArrayBuffer`를 `Blob URL`로 변환하여 미리보기 표시
- 내보내기 시 각 Blob을 `<a download>` 트릭으로 다운로드

### 처리 흐름 (순차)

```
목업 PSD 10개 = [psd1, psd2, ..., psd10]
아트워크 = artwork.png

FOR EACH psd in 목업 리스트:
  1. loadPSD(psd)          → Photopea에 PSD 전달, 열기 대기
  2. runScript(스마트오브젝트열기) → "모양 1" SO 내부 진입
  3. runScript(기존내용삭제)     → SO 내부 비우기
  4. loadArtwork(artwork)    → 아트워크 이미지 삽입
  5. runScript(리사이즈+저장)   → SO 크기에 맞추고, 저장 후 닫기
  6. exportJPG(0.8)          → 결과 JPG를 ArrayBuffer로 수신
  7. 미리보기 그리드에 추가
  8. 다음 PSD로 진행
END FOR

"모두 내보내기" → p1.jpg, p2.jpg, ... 다운로드
```

### 파일 구조

```
etsy-tools/
├── index.html        # 메인 페이지
├── index.css         # 스타일
├── js/
│   ├── app.js        # 메인 앱 로직 (UI 이벤트, 흐름 제어)
│   ├── engine.js     # Photopea iframe 통신 엔진
│   └── files.js      # 파일 관리 (읽기, 변환, 다운로드)
└── docs/             # 문서
```

## 에러 처리

| 상황 | 처리 |
|---|---|
| "모양 1" 레이어가 없음 | 해당 PSD 건너뛰고, 에러 메시지 표시 |
| PSD 파일이 아닌 파일 업로드 | 업로드 시 확장자 검증 (.psd만 허용) |
| 아트워크 미업로드 상태에서 "적용" 클릭 | 버튼 비활성화 또는 경고 |
| Photopea iframe 로딩 실패 | 타임아웃 후 재시도 안내 |
| 처리 중 사용자가 새 파일 추가 | 처리 완료 전까지 업로드 영역 잠금 |

## 제약사항 및 고려사항

1. **Photopea 의존성**: 인터넷 연결 필수 (Photopea.com iframe 로드)
2. **순차 처리**: 한 번에 1개 PSD씩 처리 (Photopea iframe은 1개)
3. **처리 시간**: PSD 크기에 따라 파일당 5~15초 예상 (10개 = 1~2분)
4. **메모리**: 대형 PSD(100MB+)는 브라우저 메모리 한계에 도달할 수 있음
5. **스마트 오브젝트 레이어명**: "모양 1"로 고정 (다른 이름이면 실패)
6. **서버 불필요**: 모든 처리가 클라이언트에서 완료됨

## 출력 사양

- **형식**: JPG
- **품질**: 80%
- **해상도**: 원본 PSD 해상도 유지
- **파일명**: p1.jpg, p2.jpg, p3.jpg, ... (업로드 순서)
