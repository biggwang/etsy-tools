/**
 * Photopea iframe 통신 엔진 (TypeScript 포팅)
 * postMessage API를 사용하여 Photopea와 양방향 통신
 */
export class PhotopeaEngine {
    private iframe: HTMLIFrameElement;
    private window: Window;
    ready: boolean;

    constructor(iframe: HTMLIFrameElement) {
        this.iframe = iframe;
        this.window = iframe.contentWindow!;
        this.ready = false;

        // 글로벌 리스너: Photopea 준비 상태 감지
        window.addEventListener('message', (e: MessageEvent) => {
            if (e.source === this.window && e.data === 'done') {
                if (!this.ready) {
                    this.ready = true;
                    console.log('[Engine] Photopea ready');
                }
            }
        });
    }

    /**
     * Photopea iframe 로딩 대기
     */
    waitReady(timeoutMs = 120000): Promise<void> {
        if (this.ready) return Promise.resolve();
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Photopea 로딩 타임아웃 (120초)')), timeoutMs);
            const check = setInterval(() => {
                if (this.ready) {
                    clearInterval(check);
                    clearTimeout(timer);
                    resolve();
                }
            }, 200);
        });
    }

    /**
     * Photopea 스크립트 실행.
     * 스크립트 끝에 고유 UID를 echo하여 다른 "done" 메시지와 절대 혼동되지 않도록 함.
     */
    runScript(script: string, timeoutMs = 120000): Promise<(string | ArrayBuffer)[]> {
        const uid = 'SCRIPT_DONE_' + Math.random().toString(36).slice(2);
        const finalScript = script + `\napp.echoToOE("${uid}");`;

        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                window.removeEventListener('message', handler);
                reject(new Error('Photopea 스크립트 타임아웃'));
            }, timeoutMs);

            const results: (string | ArrayBuffer)[] = [];
            const handler = (event: MessageEvent) => {
                if (event.source !== this.window) return;
                const data = event.data;

                if (data === uid) {
                    clearTimeout(timer);
                    window.removeEventListener('message', handler);
                    resolve(results);
                } else if (data !== 'done' && !(typeof data === 'string' && data.startsWith('SCRIPT_DONE_'))) {
                    results.push(data);
                }
            };
            window.addEventListener('message', handler);
            this.window.postMessage(finalScript, '*');
        });
    }

    /**
     * 파일(ArrayBuffer)을 Photopea로 전송 → 새 문서로 열림
     */
    sendFile(arrayBuffer: ArrayBuffer, timeoutMs = 120000): Promise<void> {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                window.removeEventListener('message', handler);
                reject(new Error('Photopea 파일 로딩 타임아웃'));
            }, timeoutMs);

            const handler = (event: MessageEvent) => {
                if (event.source !== this.window) return;
                if (event.data === 'done') {
                    clearTimeout(timer);
                    window.removeEventListener('message', handler);
                    resolve();
                }
            };
            window.addEventListener('message', handler);
            this.window.postMessage(arrayBuffer, '*', [arrayBuffer]);
        });
    }

    /**
     * JPG 전용 추출: saveToOE가 보내는 ArrayBuffer를 올바르게 수신
     */
    exportJPG(quality = 0.8, timeoutMs = 120000): Promise<ArrayBuffer | null> {
        const uid = 'EXPORT_DONE_' + Math.random().toString(36).slice(2);
        const script = `app.activeDocument.saveToOE("jpg:${quality}");\napp.echoToOE("${uid}");`;

        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                window.removeEventListener('message', handler);
                reject(new Error('JPG 추출 타임아웃'));
            }, timeoutMs);

            let jpgBuffer: ArrayBuffer | null = null;
            const handler = (event: MessageEvent) => {
                if (event.source !== this.window) return;
                const data = event.data;

                if (data instanceof ArrayBuffer) {
                    jpgBuffer = data;
                } else if (data === uid) {
                    clearTimeout(timer);
                    window.removeEventListener('message', handler);
                    resolve(jpgBuffer);
                }
            };
            window.addEventListener('message', handler);
            this.window.postMessage(script, '*');
        });
    }

    /**
     * 열려있는 모든 문서 닫기
     */
    async closeAllDocuments(): Promise<void> {
        await this.runScript(`
            while (app.documents.length > 0) {
                app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);
            }
        `);
    }

    /**
     * 핵심 메서드: 스마트 오브젝트에 아트워크 교체 후 JPG 반환
     */
    async replaceSmartObject(
        psdBuffer: ArrayBuffer,
        artworkBuffer: ArrayBuffer,
        layerName = '모양 1'
    ): Promise<ArrayBuffer | null> {
        // 1. 기존 열린 문서 모두 닫기
        try { await this.closeAllDocuments(); } catch (_) {}

        // 2. PSD 파일 로드
        console.log('[Engine] PSD 열기...');
        await this.sendFile(psdBuffer.slice(0));

        const mainDocInfo = await this.runScript(`
            app.echoToOE("MAIN_DOC:" + app.activeDocument.name);
        `);
        const mainDocMessage = mainDocInfo.find(
            (entry) => typeof entry === 'string' && entry.startsWith('MAIN_DOC:')
        );
        const mainDocName = mainDocMessage ? (mainDocMessage as string).replace('MAIN_DOC:', '') : null;

        // 3. 스마트 오브젝트 레이어를 찾아 내부 편집 모드로 진입
        console.log('[Engine] 스마트 오브젝트 열기...');
        const soResult = await this.runScript(`
            try {
                var layer = app.activeDocument.layers.getByName("${layerName}");
                app.activeDocument.activeLayer = layer;
                executeAction(stringIDToTypeID("placedLayerEditContents"));
                app.echoToOE("SO_OPENED");
            } catch(e) {
                app.echoToOE("ERROR:" + e.message);
            }
        `);

        const soMessage = soResult.find(r => typeof r === 'string') as string | undefined;
        if (soMessage && soMessage.startsWith('ERROR:')) {
            throw new Error(`레이어 "${layerName}"를 찾을 수 없습니다: ${soMessage}`);
        }

        // 4. 스마트 오브젝트 내부: 기존 placeholder bounds를 먼저 읽고, 이후 레이어 정리
        console.log('[Engine] 기존 placeholder 분석...');
        const targetInfoResult = await this.runScript(`
            function readBounds(layer) {
                try {
                    var b = layer.bounds;
                    var left = b[0].value;
                    var top = b[1].value;
                    var right = b[2].value;
                    var bottom = b[3].value;
                    var width = right - left;
                    var height = bottom - top;
                    if (!(width > 0) || !(height > 0)) return null;
                    return {
                        left: left,
                        top: top,
                        right: right,
                        bottom: bottom,
                        width: width,
                        height: height,
                        area: width * height,
                        name: layer.name || ''
                    };
                } catch (e) {
                    return null;
                }
            }

            function visitVisibleLayers(layer, results) {
                if (!layer || layer.visible === false) return;
                var bounds = readBounds(layer);
                if (bounds) results.push(bounds);
                if (layer.layers && layer.layers.length) {
                    for (var i = 0; i < layer.layers.length; i++) {
                        visitVisibleLayers(layer.layers[i], results);
                    }
                }
            }

            var doc = app.activeDocument;
            var oldUnits = app.preferences.rulerUnits;
            app.preferences.rulerUnits = Units.PIXELS;

            var canvas = {
                left: 0,
                top: 0,
                width: doc.width.value,
                height: doc.height.value
            };
            canvas.right = canvas.left + canvas.width;
            canvas.bottom = canvas.top + canvas.height;
            canvas.area = canvas.width * canvas.height;

            var candidates = [];
            for (var i = 0; i < doc.layers.length; i++) {
                visitVisibleLayers(doc.layers[i], candidates);
            }

            function isUsableCandidate(candidate) {
                if (!candidate) return false;
                if (!(candidate.width > 0) || !(candidate.height > 0)) return false;
                if (candidate.area < canvas.area * 0.01) return false;
                if (candidate.area > canvas.area * 0.995) return false;
                return true;
            }

            var placeholder = null;

            var activeCandidate = null;
            try {
                if (doc.activeLayer && doc.activeLayer.visible !== false) {
                    activeCandidate = readBounds(doc.activeLayer);
                }
            } catch (e) {}

            if (isUsableCandidate(activeCandidate)) {
                placeholder = activeCandidate;
            }

            if (!placeholder) {
                for (var j = 0; j < candidates.length; j++) {
                    var candidate = candidates[j];
                    if (!isUsableCandidate(candidate)) continue;
                    if (!placeholder || candidate.area > placeholder.area) {
                        placeholder = candidate;
                    }
                }
            }

            if (!placeholder) placeholder = canvas;

            app.echoToOE("TARGET_BOUNDS:" + JSON.stringify({
                left: placeholder.left,
                top: placeholder.top,
                width: placeholder.width,
                height: placeholder.height,
                source: placeholder.name || "canvas",
                canvasWidth: canvas.width,
                canvasHeight: canvas.height
            }));

            app.preferences.rulerUnits = oldUnits;
        `);

        const targetMessage = targetInfoResult.find(
            (entry) => typeof entry === 'string' && entry.startsWith('TARGET_BOUNDS:')
        );

        let targetBounds: {
            left: number; top: number; width: number; height: number;
            source: string; canvasWidth: number; canvasHeight: number;
        } | null = null;

        if (targetMessage) {
            try {
                targetBounds = JSON.parse((targetMessage as string).replace('TARGET_BOUNDS:', ''));
            } catch (err) {
                console.warn('[Engine] placeholder bounds 파싱 실패, 캔버스 전체로 대체합니다.', err);
            }
        }

        console.log('[Engine] 기존 내용 정리...', targetBounds);
        await this.runScript(`
            var doc = app.activeDocument;
            while (doc.layers.length > 1) {
                doc.layers[0].remove();
            }
            if (doc.layers.length > 0) {
                doc.layers[0].visible = false;
            }
        `);

        // 5. 아트워크를 Base64로 변환
        console.log('[Engine] 아트워크 삽입 및 리사이즈...');
        const artworkDataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(new Blob([artworkBuffer]));
        });

        // 6. 아트워크를 현재 Smart Object 문서에 직접 삽입 후 target bounds 기준으로 cover 정렬
        await this.runScript(`
            var soDoc = app.activeDocument;

            var oldUnits = app.preferences.rulerUnits;
            app.preferences.rulerUnits = Units.PIXELS;

            var soW = soDoc.width.value;
            var soH = soDoc.height.value;
            var targetLeft = ${Number(targetBounds?.left ?? 0)};
            var targetTop = ${Number(targetBounds?.top ?? 0)};
            var targetW = ${JSON.stringify(targetBounds?.width ?? targetBounds?.canvasWidth ?? null)};
            var targetH = ${JSON.stringify(targetBounds?.height ?? targetBounds?.canvasHeight ?? null)};
            if (!(targetW > 0)) targetW = soW;
            if (!(targetH > 0)) targetH = soH;

            app.activeDocument = soDoc;
            app.open("${artworkDataUrl}", null, true);

            var doc = app.activeDocument;
            var layer = doc.activeLayer;

            var b = layer.bounds;
            var lw = b[2].value - b[0].value;
            var lh = b[3].value - b[1].value;

            if (lw > 0 && lh > 0) {
                var sx = (targetW / lw) * 100;
                var sy = (targetH / lh) * 100;
                var scale = Math.max(sx, sy) * 1.01;

                layer.resize(scale, scale, AnchorPosition.TOPLEFT);

                var nb = layer.bounds;
                var nw = nb[2].value - nb[0].value;
                var nh = nb[3].value - nb[1].value;
                var nLeft = nb[0].value;
                var nTop = nb[1].value;

                var cx = nLeft + nw / 2;
                var cy = nTop + nh / 2;
                layer.translate(targetLeft + targetW / 2 - cx, targetTop + targetH / 2 - cy);
            }

            app.preferences.rulerUnits = oldUnits;
        `);

        // 7. 스마트 오브젝트 저장 및 닫기 (메인 목업에 반영됨)
        console.log('[Engine] 스마트 오브젝트 저장 및 닫기...');
        await this.runScript(`
            app.activeDocument.save();
            app.activeDocument.close();
            if (app.documents.length > 0) {
                var restored = false;
                for (var i = 0; i < app.documents.length; i++) {
                    if (${JSON.stringify(mainDocName)} && app.documents[i].name === ${JSON.stringify(mainDocName)}) {
                        app.activeDocument = app.documents[i];
                        restored = true;
                        break;
                    }
                }
                if (!restored) {
                    var best = app.documents[0];
                    var bestArea = best.width.value * best.height.value;
                    for (var j = 1; j < app.documents.length; j++) {
                        var candidate = app.documents[j];
                        var area = candidate.width.value * candidate.height.value;
                        if (area > bestArea) {
                            best = candidate;
                            bestArea = area;
                        }
                    }
                    app.activeDocument = best;
                }
            }
        `);

        // 8. 메인 목업을 JPG로 추출
        console.log('[Engine] JPG 추출...');
        const jpgBuffer = await this.exportJPG(0.9);
        return jpgBuffer;
    }
}
