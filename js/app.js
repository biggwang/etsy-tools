/**
 * Etsy Mockup Automator — 메인 앱 로직
 * UI 이벤트 처리, 처리 흐름 제어
 */
import { PhotopeaEngine } from './engine.js';
import { FileManager } from './files.js';

// === 초기화 ===
const engine = new PhotopeaEngine('photopea');
const fm = new FileManager();

// === DOM 요소 ===
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

// === 아트워크 업로드 ===
artworkBtn.addEventListener('click', () => artworkInput.click());
artworkInput.addEventListener('change', (e) => {
    if (e.target.files[0]) handleArtworkFile(e.target.files[0]);
});

async function handleArtworkFile(file) {
    if (!file) return;
    // 이미지 파일 검증
    if (!file.type.startsWith('image/')) {
        alert('이미지 파일(PNG, JPG)만 업로드할 수 있습니다.');
        return;
    }
    const artwork = await fm.setArtwork(file);
    artworkPreview.innerHTML = `
        <img src="${artwork.url}" alt="${artwork.name}">
        <p>${artwork.name} (${FileManager.formatSize(artwork.buffer.byteLength)})</p>
    `;
    artworkPreview.hidden = false;
    artworkBtn.textContent = '변경';
    updateApplyButton();
}

// === 목업 업로드 ===
mockupBtn.addEventListener('click', () => mockupInput.click());
mockupInput.addEventListener('change', (e) => {
    Array.from(e.target.files).forEach(f => handleMockupFile(f));
    mockupInput.value = ''; // 같은 파일 재선택 허용
});

async function handleMockupFile(file) {
    if (!file) return;
    try {
        await fm.addMockup(file);
        renderMockupList();
        updateApplyButton();
    } catch (err) {
        alert(err.message);
    }
}

function renderMockupList() {
    if (fm.mockups.length === 0) {
        mockupList.innerHTML = '';
        return;
    }
    mockupList.innerHTML = fm.mockups.map((m, i) => `
        <li>
            <span>📄 ${m.name} (${FileManager.formatSize(m.buffer.byteLength)})</span>
            <button class="remove-btn" data-index="${i}" title="제거">✕</button>
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

// === 드래그앤드랍 ===
setupDropZone(artworkUpload, (files) => {
    const imgFile = Array.from(files).find(f => f.type.startsWith('image/'));
    if (imgFile) handleArtworkFile(imgFile);
});

setupDropZone(mockupUpload, (files) => {
    Array.from(files).forEach(f => {
        if (f.name.toLowerCase().endsWith('.psd')) handleMockupFile(f);
    });
});

function setupDropZone(el, callback) {
    el.addEventListener('dragover', (e) => {
        e.preventDefault();
        el.classList.add('drag-over');
    });
    el.addEventListener('dragleave', (e) => {
        // 자식 요소로의 이동은 무시
        if (el.contains(e.relatedTarget)) return;
        el.classList.remove('drag-over');
    });
    el.addEventListener('drop', (e) => {
        e.preventDefault();
        el.classList.remove('drag-over');
        callback(e.dataTransfer.files);
    });
}

// === 적용하기 (핵심 처리) ===
let isProcessing = false;

applyBtn.addEventListener('click', async () => {
    if (!fm.artwork || fm.mockups.length === 0 || isProcessing) return;

    isProcessing = true;
    document.body.classList.add('processing');

    // UI 상태 변경
    applyBtn.disabled = true;
    progress.hidden = false;
    previewSection.hidden = true;
    previewGrid.innerHTML = '';
    fm.results = [];

    // Photopea 준비 대기
    progressText.textContent = 'Photopea 로딩 중...';
    progressFill.style.width = '0%';

    try {
        await engine.waitReady();
    } catch (err) {
        progressText.textContent = '⚠️ Photopea 로딩 실패. 페이지를 새로고침해주세요.';
        isProcessing = false;
        document.body.classList.remove('processing');
        applyBtn.disabled = false;
        return;
    }

    const total = fm.mockups.length;
    let successCount = 0;

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
                const card = document.createElement('div');
                card.className = 'preview-card';
                card.innerHTML = `
                    <img src="${result.url}" alt="${result.name}">
                    <div class="card-label">${result.name} — ${mockup.name}</div>
                `;
                previewGrid.appendChild(card);
                successCount++;
            } else {
                throw new Error('JPG 추출 결과가 없습니다.');
            }
        } catch (err) {
            console.error(`[${mockup.name}] 처리 실패:`, err);
            const card = document.createElement('div');
            card.className = 'preview-card error';
            card.innerHTML = `
                <div class="card-label">⚠️ ${mockup.name} — 실패<br><small>${err.message}</small></div>
            `;
            previewGrid.appendChild(card);
        }
    }

    // 완료
    progressFill.style.width = '100%';
    progressText.textContent = `✅ 완료! ${successCount}/${total}개 성공`;
    previewSection.hidden = false;
    applyBtn.disabled = false;
    isProcessing = false;
    document.body.classList.remove('processing');
});

// === 내보내기 ===
exportBtn.addEventListener('click', () => {
    if (fm.results.length === 0) {
        alert('내보낼 결과가 없습니다.');
        return;
    }
    fm.downloadAll();
});

// === 초기 로그 ===
console.log('[App] Etsy Mockup Automator loaded');
console.log('[App] Photopea 로딩 대기 중...');
engine.waitReady().then(() => {
    console.log('[App] Photopea 준비 완료!');
});
