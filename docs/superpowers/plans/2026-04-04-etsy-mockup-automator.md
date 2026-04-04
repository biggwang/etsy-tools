# Etsy Mockup Automator Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 브라우저에서 1개 아트워크 + 최대 10개 PSD 목업을 업로드하면, Photopea iframe으로 스마트 오브젝트를 자동 교체하고 JPG로 내보내는 웹 도구

**Architecture:** Vanilla HTML/CSS/JS 단일 페이지 앱. Photopea를 숨긴 iframe으로 삽입하고 postMessage API로 제어. 서버 불필요.

**Tech Stack:** HTML5, CSS3, Vanilla JavaScript (ES Modules), Photopea postMessage API

---

## Task 1: 프로젝트 기본 구조 및 HTML 스켈레톤

**Files:**
- Create: `index.html`
- Create: `index.css`
- Create: `js/engine.js`
- Create: `js/files.js`
- Create: `js/app.js`

- [ ] **Step 1: index.html 기본 구조 작성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Etsy Mockup Automator</title>
    <link rel="stylesheet" href="index.css">
</head>
<body>
    <div id="app">
        <header id="header">
            <h1>Etsy Mockup Automator</h1>
            <p>디지털 상품을 목업에 자동으로 적용하세요</p>
        </header>

        <main id="main">
            <!-- 업로드 영역 -->
            <section id="upload-section">
                <div id="artwork-upload" class="upload-zone">
                    <h2>아트워크</h2>
                    <p>디지털 상품 이미지를 드래그하세요 (PNG/JPG, 1개)</p>
                    <input type="file" id="artwork-input" accept=".png,.jpg,.jpeg" hidden>
                    <button id="artwork-btn" class="upload-btn">파일 선택</button>
                    <div id="artwork-preview" class="file-preview" hidden></div>
                </div>

                <div id="mockup-upload" class="upload-zone">
                    <h2>목업 PSD 파일</h2>
                    <p>PSD 파일을 드래그하세요 (최대 10개)</p>
                    <input type="file" id="mockup-input" accept=".psd" multiple hidden>
                    <button id="mockup-btn" class="upload-btn">파일 선택</button>
                    <ul id="mockup-list" class="file-list"></ul>
                </div>
            </section>

            <!-- 컨트롤 -->
            <section id="control-section">
                <button id="apply-btn" class="primary-btn" disabled>적용하기</button>
                <div id="progress" hidden>
                    <div id="progress-bar"><div id="progress-fill"></div></div>
                    <p id="progress-text">준비 중...</p>
                </div>
            </section>

            <!-- 미리보기 -->
            <section id="preview-section" hidden>
                <h2>결과 미리보기</h2>
                <div id="preview-grid"></div>
                <button id="export-btn" class="primary-btn">모두 내보내기 (JPG)</button>
            </section>
        </main>
    </div>

    <!-- Photopea iframe (숨김) -->
    <iframe id="photopea" src="https://www.photopea.com#%7B%22environment%22:%7B%22customIO%22:%7B%22save%22:%22app.echoToOE(%27save%27)%22%7D%7D%7D" style="display:none;" allow="cross-origin-isolated"></iframe>

    <script type="module" src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: 빈 JS 모듈 파일 생성**

`js/engine.js`:
```javascript
// Photopea iframe 통신 엔진
export class PhotopeaEngine {
    constructor() {
        this.iframe = null;
        this.ready = false;
    }
}
```

`js/files.js`:
```javascript
// 파일 관리 모듈
export class FileManager {
    constructor() {
        this.artwork = null;
        this.mockups = [];
        this.results = [];
    }
}
```

`js/app.js`:
```javascript
// 메인 앱 로직
import { PhotopeaEngine } from './engine.js';
import { FileManager } from './files.js';

console.log('Etsy Mockup Automator loaded');
```

- [ ] **Step 3: 브라우저에서 index.html 열어서 기본 구조 확인**

---

## Task 2: CSS 디자인 시스템

**Files:**
- Create: `index.css`

- [ ] **Step 1: CSS 변수 및 기본 레이아웃 작성**

```css
:root {
    --bg-primary: #0f0f0f;
    --bg-secondary: #1a1a2e;
    --bg-card: #16213e;
    --accent: #e94560;
    --accent-hover: #ff6b81;
    --text-primary: #eee;
    --text-secondary: #a0a0b0;
    --border: #2a2a4a;
    --success: #2ed573;
    --radius: 12px;
    --shadow: 0 8px 32px rgba(0,0,0,0.3);
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
    font-family: 'Inter', -apple-system, sans-serif;
    background: var(--bg-primary);
    color: var(--text-primary);
    min-height: 100vh;
}

#app {
    max-width: 960px;
    margin: 0 auto;
    padding: 2rem;
}

header { text-align: center; margin-bottom: 2rem; }
header h1 { font-size: 2rem; }
header p { color: var(--text-secondary); margin-top: 0.5rem; }
```

- [ ] **Step 2: 업로드 영역, 버튼, 미리보기 그리드 스타일 작성**

```css
/* 업로드 영역 */
#upload-section {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    margin-bottom: 2rem;
}

.upload-zone {
    background: var(--bg-card);
    border: 2px dashed var(--border);
    border-radius: var(--radius);
    padding: 2rem;
    text-align: center;
    transition: border-color 0.3s, background 0.3s;
}

.upload-zone.drag-over {
    border-color: var(--accent);
    background: rgba(233, 69, 96, 0.05);
}

.upload-zone h2 { font-size: 1.1rem; margin-bottom: 0.5rem; }
.upload-zone p { color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 1rem; }

.upload-btn {
    background: transparent;
    border: 1px solid var(--accent);
    color: var(--accent);
    padding: 0.5rem 1.5rem;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
}
.upload-btn:hover {
    background: var(--accent);
    color: white;
}

/* 버튼 */
.primary-btn {
    display: block;
    width: 100%;
    padding: 1rem;
    background: linear-gradient(135deg, var(--accent), #c44569);
    color: white;
    border: none;
    border-radius: var(--radius);
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.2s, transform 0.1s;
}
.primary-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
.primary-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* 진행 바 */
#progress-bar {
    width: 100%;
    height: 6px;
    background: var(--border);
    border-radius: 3px;
    margin: 1rem 0 0.5rem;
    overflow: hidden;
}
#progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--accent), var(--success));
    width: 0%;
    transition: width 0.3s;
}
#progress-text { color: var(--text-secondary); font-size: 0.85rem; text-align: center; }

/* 파일 리스트 */
.file-list {
    list-style: none;
    margin-top: 1rem;
    text-align: left;
}
.file-list li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0.75rem;
    background: rgba(255,255,255,0.03);
    border-radius: 6px;
    margin-bottom: 0.4rem;
    font-size: 0.85rem;
}
.file-list li .remove-btn {
    background: none;
    border: none;
    color: var(--accent);
    cursor: pointer;
    font-size: 1rem;
}

/* 미리보기 그리드 */
#preview-section h2 { margin-bottom: 1rem; }
#preview-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
}
.preview-card {
    background: var(--bg-card);
    border-radius: var(--radius);
    overflow: hidden;
    box-shadow: var(--shadow);
}
.preview-card img {
    width: 100%;
    display: block;
}
.preview-card .card-label {
    padding: 0.75rem;
    font-size: 0.85rem;
    color: var(--text-secondary);
    text-align: center;
}

/* 컨트롤 */
#control-section { margin-bottom: 2rem; }

/* 아트워크 미리보기 */
.file-preview img {
    max-width: 120px;
    max-height: 120px;
    border-radius: 8px;
    margin-top: 0.75rem;
}
```

- [ ] **Step 3: 브라우저에서 디자인 확인**

---

## Task 3: Photopea Engine (`engine.js`)

**Files:**
- Modify: `js/engine.js`

- [ ] **Step 1: PhotopeaEngine 클래스 — 초기화 및 메시지 리스너**

```javascript
export class PhotopeaEngine {
    constructor(iframeId) {
        this.iframe = document.getElementById(iframeId);
        this.window = this.iframe.contentWindow;
        this.ready = false;
        this._messageQueue = [];
        this._resolveNext = null;

        window.addEventListener('message', (e) => this._onMessage(e));
    }

    _onMessage(event) {
        if (event.source !== this.window) return;

        const data = event.data;

        if (data === 'done') {
            if (!this.ready) {
                this.ready = true;
                console.log('[Engine] Photopea ready');
            }
            if (this._resolveNext) {
                const resolve = this._resolveNext;
                this._resolveNext = null;
                resolve(this._messageQueue.splice(0));
            }
            return;
        }

        this._messageQueue.push(data);
    }

    waitReady() {
        if (this.ready) return Promise.resolve();
        return new Promise((resolve) => {
            const check = setInterval(() => {
                if (this.ready) { clearInterval(check); resolve(); }
            }, 200);
        });
    }
}
```

- [ ] **Step 2: 스크립트 실행 및 파일 전달 메서드**

```javascript
    // engine.js에 추가

    runScript(script) {
        return new Promise((resolve) => {
            this._resolveNext = resolve;
            this._messageQueue = [];
            this.window.postMessage(script, '*');
        });
    }

    sendFile(arrayBuffer) {
        return new Promise((resolve) => {
            this._resolveNext = resolve;
            this._messageQueue = [];
            this.window.postMessage(arrayBuffer, '*');
        });
    }

    async exportJPG(quality = 0.8) {
        const results = await this.runScript(
            `app.activeDocument.saveToOE("jpg:${quality}");`
        );
        // results에 ArrayBuffer가 포함되어야 함
        const jpgBuffer = results.find(r => r instanceof ArrayBuffer);
        return jpgBuffer;
    }

    async closeAllDocuments() {
        await this.runScript(`
            while (app.documents.length > 0) {
                app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);
            }
        `);
    }
```

- [ ] **Step 3: 스마트 오브젝트 교체 핵심 메서드**

```javascript
    // engine.js에 추가

    async replaceSmartObject(psdBuffer, artworkBuffer, layerName = '모양 1') {
        // 1. 기존 문서 모두 닫기
        await this.closeAllDocuments();

        // 2. PSD 열기
        await this.sendFile(psdBuffer);

        // 3. 스마트 오브젝트 레이어 선택 및 내부 열기
        await this.runScript(`
            var layer = app.activeDocument.layers.getByName("${layerName}");
            app.activeDocument.activeLayer = layer;
            executeAction(stringIDToTypeID("placedLayerEditContents"));
        `);

        // 4. 스마트 오브젝트 내부의 기존 레이어 삭제
        await this.runScript(`
            var doc = app.activeDocument;
            while (doc.layers.length > 0) {
                doc.layers[0].remove();
            }
        `);

        // 5. 아트워크 이미지 삽입
        await this.sendFile(artworkBuffer);

        // 6. 아트워크를 스마트 오브젝트 캔버스 크기에 맞게 리사이즈
        await this.runScript(`
            var doc = app.activeDocument;
            var layer = doc.activeLayer;
            var bounds = layer.bounds;
            var layerW = bounds[2].as("px") - bounds[0].as("px");
            var layerH = bounds[3].as("px") - bounds[1].as("px");
            var scaleX = (doc.width.as("px") / layerW) * 100;
            var scaleY = (doc.height.as("px") / layerH) * 100;
            var scale = Math.max(scaleX, scaleY);
            layer.resize(scale, scale, AnchorPosition.MIDDLECENTER);
        `);

        // 7. 저장 후 닫기 (원본 목업에 반영)
        await this.runScript(`
            app.activeDocument.save();
            app.activeDocument.close();
        `);

        // 8. 결과 JPG 추출
        const jpgBuffer = await this.exportJPG(0.8);
        return jpgBuffer;
    }
```

- [ ] **Step 4: 브라우저 콘솔에서 Photopea 로딩 확인**

---

## Task 4: File Manager (`files.js`)

**Files:**
- Modify: `js/files.js`

- [ ] **Step 1: 파일 읽기 유틸리티**

```javascript
export class FileManager {
    constructor() {
        this.artwork = null;       // { name, buffer, url }
        this.mockups = [];         // [{ name, buffer }]
        this.results = [];         // [{ name, buffer, url }]
    }

    static readAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    async setArtwork(file) {
        const buffer = await FileManager.readAsArrayBuffer(file);
        const url = URL.createObjectURL(file);
        this.artwork = { name: file.name, buffer, url };
        return this.artwork;
    }

    async addMockup(file) {
        if (this.mockups.length >= 10) {
            throw new Error('목업은 최대 10개까지 추가할 수 있습니다.');
        }
        const buffer = await FileManager.readAsArrayBuffer(file);
        const mockup = { name: file.name, buffer };
        this.mockups.push(mockup);
        return mockup;
    }

    removeMockup(index) {
        this.mockups.splice(index, 1);
    }

    addResult(jpgBuffer, index) {
        const blob = new Blob([jpgBuffer], { type: 'image/jpeg' });
        const url = URL.createObjectURL(blob);
        const name = `p${index + 1}.jpg`;
        this.results.push({ name, buffer: jpgBuffer, url });
        return { name, url };
    }

    downloadAll() {
        this.results.forEach((result) => {
            const a = document.createElement('a');
            a.href = result.url;
            a.download = result.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        });
    }

    clear() {
        if (this.artwork?.url) URL.revokeObjectURL(this.artwork.url);
        this.results.forEach(r => URL.revokeObjectURL(r.url));
        this.artwork = null;
        this.mockups = [];
        this.results = [];
    }
}
```

- [ ] **Step 2: 확인 — FileManager로 파일을 읽고 다시 Blob으로 변환 가능한지 콘솔에서 테스트**

---

## Task 5: 메인 앱 로직 (`app.js`)

**Files:**
- Modify: `js/app.js`

- [ ] **Step 1: UI 이벤트 바인딩 (업로드, 드래그앤드랍)**

```javascript
import { PhotopeaEngine } from './engine.js';
import { FileManager } from './files.js';

const engine = new PhotopeaEngine('photopea');
const fm = new FileManager();

// DOM 요소
const artworkInput = document.getElementById('artwork-input');
const artworkBtn = document.getElementById('artwork-btn');
const artworkPreview = document.getElementById('artwork-preview');
const artworkUpload = document.getElementById('artwork-upload');

const mockupInput = document.getElementById('mockup-input');
const mockupBtn = document.getElementById('mockup-btn');
const mockupList = document.getElementById('mockup-list');
const mockupUpload = document.getElementById('mockup-upload');

const applyBtn = document.getElementById('apply-btn');
const progress = document.getElementById('progress');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');

const previewSection = document.getElementById('preview-section');
const previewGrid = document.getElementById('preview-grid');
const exportBtn = document.getElementById('export-btn');

// --- 아트워크 업로드 ---
artworkBtn.addEventListener('click', () => artworkInput.click());
artworkInput.addEventListener('change', (e) => handleArtworkFile(e.target.files[0]));

// 드래그앤드랍
setupDropZone(artworkUpload, (files) => handleArtworkFile(files[0]));
setupDropZone(mockupUpload, (files) => {
    Array.from(files).forEach(f => handleMockupFile(f));
});

async function handleArtworkFile(file) {
    if (!file) return;
    const artwork = await fm.setArtwork(file);
    artworkPreview.innerHTML = `<img src="${artwork.url}" alt="${artwork.name}"><p>${artwork.name}</p>`;
    artworkPreview.hidden = false;
    updateApplyButton();
}

// --- 목업 업로드 ---
mockupBtn.addEventListener('click', () => mockupInput.click());
mockupInput.addEventListener('change', (e) => {
    Array.from(e.target.files).forEach(f => handleMockupFile(f));
});

async function handleMockupFile(file) {
    if (!file || !file.name.toLowerCase().endsWith('.psd')) return;
    try {
        await fm.addMockup(file);
        renderMockupList();
        updateApplyButton();
    } catch (err) {
        alert(err.message);
    }
}

function renderMockupList() {
    mockupList.innerHTML = fm.mockups.map((m, i) => `
        <li>
            <span>${m.name}</span>
            <button class="remove-btn" data-index="${i}">✕</button>
        </li>
    `).join('');

    mockupList.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            fm.removeMockup(parseInt(btn.dataset.index));
            renderMockupList();
            updateApplyButton();
        });
    });
}

function updateApplyButton() {
    applyBtn.disabled = !(fm.artwork && fm.mockups.length > 0);
}

// --- 드래그앤드랍 헬퍼 ---
function setupDropZone(el, callback) {
    el.addEventListener('dragover', (e) => {
        e.preventDefault();
        el.classList.add('drag-over');
    });
    el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
    el.addEventListener('drop', (e) => {
        e.preventDefault();
        el.classList.remove('drag-over');
        callback(e.dataTransfer.files);
    });
}
```

- [ ] **Step 2: 핵심 처리 로직 — "적용하기" 버튼**

```javascript
// app.js에 추가

applyBtn.addEventListener('click', async () => {
    if (!fm.artwork || fm.mockups.length === 0) return;

    // UI 잠금
    applyBtn.disabled = true;
    progress.hidden = false;
    previewSection.hidden = true;
    previewGrid.innerHTML = '';
    fm.results = [];

    // Photopea 준비 대기
    progressText.textContent = 'Photopea 로딩 중...';
    await engine.waitReady();

    const total = fm.mockups.length;

    for (let i = 0; i < total; i++) {
        const mockup = fm.mockups[i];
        progressText.textContent = `${i + 1}/${total} 처리 중... (${mockup.name})`;
        progressFill.style.width = `${((i) / total) * 100}%`;

        try {
            const jpgBuffer = await engine.replaceSmartObject(
                mockup.buffer,
                fm.artwork.buffer,
                '모양 1'
            );

            if (jpgBuffer) {
                const result = fm.addResult(jpgBuffer, i);
                // 미리보기 카드 추가
                const card = document.createElement('div');
                card.className = 'preview-card';
                card.innerHTML = `
                    <img src="${result.url}" alt="${result.name}">
                    <div class="card-label">${result.name}</div>
                `;
                previewGrid.appendChild(card);
            }
        } catch (err) {
            console.error(`[${mockup.name}] 처리 실패:`, err);
            const card = document.createElement('div');
            card.className = 'preview-card error';
            card.innerHTML = `<div class="card-label">⚠️ ${mockup.name} 실패</div>`;
            previewGrid.appendChild(card);
        }
    }

    // 완료
    progressFill.style.width = '100%';
    progressText.textContent = `완료! ${fm.results.length}/${total}개 성공`;
    previewSection.hidden = false;
    applyBtn.disabled = false;
});
```

- [ ] **Step 3: 내보내기 버튼**

```javascript
// app.js에 추가

exportBtn.addEventListener('click', () => {
    if (fm.results.length === 0) return;
    fm.downloadAll();
});
```

- [ ] **Step 4: 전체 통합 테스트 — 실제 PSD 파일과 아트워크로 동작 확인**

---

## Task 6: 에러 처리 및 폴리싱

**Files:**
- Modify: `js/engine.js`
- Modify: `js/app.js`
- Modify: `index.css`

- [ ] **Step 1: engine.js에 타임아웃 및 에러 처리 추가**

```javascript
    // engine.js의 runScript를 타임아웃 버전으로 교체
    runScript(script, timeoutMs = 30000) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this._resolveNext = null;
                reject(new Error('Photopea 스크립트 타임아웃'));
            }, timeoutMs);

            this._resolveNext = (results) => {
                clearTimeout(timer);
                resolve(results);
            };
            this._messageQueue = [];
            this.window.postMessage(script, '*');
        });
    }
```

- [ ] **Step 2: 레이어 이름 못 찾을 때 대응 — try-catch 스크립트**

```javascript
    // replaceSmartObject 내 스크립트를 try-catch로 감싸기
    await this.runScript(`
        try {
            var layer = app.activeDocument.layers.getByName("${layerName}");
            app.activeDocument.activeLayer = layer;
            executeAction(stringIDToTypeID("placedLayerEditContents"));
            app.echoToOE("SO_OPENED");
        } catch(e) {
            app.echoToOE("ERROR:" + e.message);
        }
    `);
```

- [ ] **Step 3: 로딩 애니메이션 CSS 추가**

```css
/* index.css에 추가 */
@keyframes pulse { 
    0%, 100% { opacity: 1; } 
    50% { opacity: 0.5; } 
}
#progress-text { animation: pulse 1.5s infinite; }

.preview-card { 
    animation: fadeIn 0.3s ease; 
}
@keyframes fadeIn { 
    from { opacity: 0; transform: translateY(10px); } 
    to { opacity: 1; transform: translateY(0); } 
}
```

- [ ] **Step 4: 최종 브라우저 테스트 — 실제 PSD + 아트워크로 E2E 확인**

---

## Self-Review 결과

- ✅ 설계 문서의 모든 요구사항이 태스크에 매핑됨
- ✅ 플레이스홀더 없음 (모든 스텝에 실제 코드 포함)
- ✅ 타입/함수명 일관성 확인 (`replaceSmartObject`, `FileManager`, `PhotopeaEngine`)
- ✅ 범위 적절 (6개 태스크, 각 2~5분 단위)
