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
        this.window = this.iframe.contentWindow!;
        if (this.ready) return Promise.resolve();
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Photopea 로딩 타임아웃 (120초)')), timeoutMs);
            const probe = () => {
                if (this.ready) {
                    clearTimeout(timer);
                    resolve();
                    return;
                }

                const uid = 'READY_PROBE_' + Math.random().toString(36).slice(2);
                let settled = false;
                const handler = (event: MessageEvent) => {
                    if (event.source !== this.window) return;
                    if (event.data !== uid) return;
                    settled = true;
                    this.ready = true;
                    window.removeEventListener('message', handler);
                    clearTimeout(timer);
                    resolve();
                };

                window.addEventListener('message', handler);
                try {
                    this.window.postMessage(`app.echoToOE("${uid}");`, '*');
                } catch {
                    window.removeEventListener('message', handler);
                }

                setTimeout(() => {
                    window.removeEventListener('message', handler);
                    if (!settled && !this.ready) {
                        probe();
                    }
                }, 300);
            };

            probe();
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
        const operationId = Math.random().toString(36).slice(2);
        const mainDocMarker = `OMX_MAIN_${operationId}`;
        const smartObjectMarker = `OMX_SO_${operationId}`;
        const anchorLayerMarker = `OMX_ANCHOR_${operationId}`;

        // 1. 기존 열린 문서 모두 닫기
        try { await this.closeAllDocuments(); } catch {}

        // 2. PSD 파일 로드
        console.log('[Engine] PSD 열기...');
        await this.sendFile(psdBuffer.slice(0));
        await this.runScript(`
            app.activeDocument.name = ${JSON.stringify(mainDocMarker)};
        `);

        // 3. 스마트 오브젝트 레이어를 찾아 내부 편집 모드로 진입
        console.log('[Engine] 스마트 오브젝트 열기...');
        const soResult = await this.runScript(`
            try {
                var layer = app.activeDocument.layers.getByName("${layerName}");
                app.activeDocument.activeLayer = layer;
                executeAction(stringIDToTypeID("placedLayerEditContents"));
                app.activeDocument.name = ${JSON.stringify(smartObjectMarker)};
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

        // 5. 아트워크를 Data URL로 변환
        console.log('[Engine] 아트워크 로드...');
        const artworkDataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(new Blob([artworkBuffer]));
        });

        const anchorResult = await this.runScript(`
            try {
                var doc = app.activeDocument;
                var baselineCount = doc.layers.length;
                var mk = charIDToTypeID("Mk  ");
                var desc = new ActionDescriptor();
                var ref = new ActionReference();
                ref.putClass(charIDToTypeID("Lyr "));
                desc.putReference(charIDToTypeID("null"), ref);
                executeAction(mk, desc, DialogModes.NO);
                doc.activeLayer.name = ${JSON.stringify(anchorLayerMarker)};
                doc.activeLayer.visible = true;
                app.echoToOE("ANCHOR_READY:" + baselineCount + ":" + doc.layers.length);
            } catch (e) {
                app.echoToOE("ERROR:" + e.message);
            }
        `);
        const anchorMessage = anchorResult.find(r => typeof r === 'string') as string | undefined;
        if (anchorMessage?.startsWith('ERROR:')) {
            throw new Error(`아트워크 준비 실패: ${anchorMessage}`);
        }
        const baselineCount = anchorMessage && anchorMessage.startsWith('ANCHOR_READY:')
            ? Number((anchorMessage as string).split(':')[1])
            : NaN;
        if (!Number.isFinite(baselineCount)) {
            throw new Error('아트워크 준비 실패: baseline layer count를 읽지 못했습니다.');
        }

        const insertStartResult = await this.runScript(`
            try {
                app.open(${JSON.stringify(artworkDataUrl)}, null, true);
                app.echoToOE("INSERT_STARTED");
            } catch (e) {
                app.echoToOE("ERROR:" + e.message);
            }
        `);
        const insertStartMessage = insertStartResult.find(r => typeof r === 'string') as string | undefined;
        if (insertStartMessage?.startsWith('ERROR:')) {
            throw new Error(`아트워크 삽입 시작 실패: ${insertStartMessage}`);
        }

        const waitForInsertedLayer = async (timeoutMs = 15000): Promise<void> => {
            const startedAt = Date.now();
            while (Date.now() - startedAt < timeoutMs) {
                const statusResult = await this.runScript(`
                    try {
                        var doc = app.activeDocument;
                        var activeName = "";
                        try {
                            activeName = doc.activeLayer ? (doc.activeLayer.name || "") : "";
                        } catch (e) {}
                        app.echoToOE("INSERT_STATUS:" + doc.layers.length + ":" + activeName);
                    } catch (e) {
                        app.echoToOE("ERROR:" + e.message);
                    }
                `, 5000);
                const statusMessage = statusResult.find((entry) => typeof entry === 'string') as string | undefined;
                if (statusMessage?.startsWith('ERROR:')) {
                    throw new Error(`아트워크 삽입 대기 실패: ${statusMessage}`);
                }
                if (statusMessage?.startsWith('INSERT_STATUS:')) {
                    const [, countRaw, activeName = ''] = (statusMessage as string).split(':');
                    const currentCount = Number(countRaw);
                    if (Number.isFinite(currentCount) && currentCount > baselineCount && activeName !== anchorLayerMarker) {
                        return;
                    }
                }
                await new Promise((resolve) => setTimeout(resolve, 150));
            }
            throw new Error('아트워크 삽입 실패: Photopea가 새 레이어를 활성화하지 못했습니다.');
        };

        await waitForInsertedLayer();

        // 6. 삽입 완료된 레이어를 target bounds 기준으로 cover 정렬
        console.log('[Engine] 아트워크 삽입 및 리사이즈...');
        const insertResult = await this.runScript(`
            try {
                var doc = app.activeDocument;
                var layer = doc.activeLayer;
                if (!layer || (layer.name || "") === ${JSON.stringify(anchorLayerMarker)}) {
                    throw new Error("INSERTED_LAYER_NOT_ACTIVE");
                }

                try { layer.visible = true; } catch (e) {}

                var oldUnits = app.preferences.rulerUnits;
                try {
                    app.preferences.rulerUnits = Units.PIXELS;

                    var targetLeft = ${Number(targetBounds?.left ?? 0)};
                    var targetTop = ${Number(targetBounds?.top ?? 0)};
                    var targetW = ${JSON.stringify(targetBounds?.width ?? targetBounds?.canvasWidth ?? null)};
                    var targetH = ${JSON.stringify(targetBounds?.height ?? targetBounds?.canvasHeight ?? null)};
                    if (!(targetW > 0)) targetW = doc.width.value;
                    if (!(targetH > 0)) targetH = doc.height.value;

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

                    try {
                        if (layer.rasterize) {
                            layer.rasterize(RasterizeType.ENTIRELAYER);
                        }
                    } catch (e) {}

                    for (var i = 0; i < doc.layers.length; i++) {
                        if ((doc.layers[i].name || "") === ${JSON.stringify(anchorLayerMarker)}) {
                            doc.layers[i].remove();
                            break;
                        }
                    }
                } finally {
                    app.preferences.rulerUnits = oldUnits;
                }

                app.echoToOE("ARTWORK_INSERTED");
            } catch (e) {
                app.echoToOE("ERROR:" + e.message);
            }
        `);
        const insertMessage = insertResult.find(r => typeof r === 'string') as string | undefined;
        if (insertMessage?.startsWith('ERROR:')) {
            throw new Error(`아트워크 삽입 실패: ${insertMessage}`);
        }
        if (insertMessage !== 'ARTWORK_INSERTED') {
            throw new Error('아트워크 삽입 실패: Photopea 응답이 누락되었습니다.');
        }

        // 7. 스마트 오브젝트 저장 및 닫기 (메인 목업에 반영됨)
        console.log('[Engine] 스마트 오브젝트 저장 및 닫기...');
        await this.runScript(`
            app.activeDocument.close(SaveOptions.SAVECHANGES);
            if (app.documents.length > 0) {
                var restored = false;
                for (var i = 0; i < app.documents.length; i++) {
                    if (app.documents[i].name === ${JSON.stringify(mainDocMarker)}) {
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
        await new Promise((resolve) => setTimeout(resolve, 3000));
        await this.runScript(`
            if (app.documents.length > 0) {
                app.echoToOE("MAIN_DOC_READY:" + app.activeDocument.name);
            }
        `);

        // 8. 메인 목업을 JPG로 추출
        console.log('[Engine] JPG 추출...');
        const jpgBuffer = await this.exportJPG(0.9);
        return jpgBuffer;
    }
}
