/**
 * 파일 관리 모듈
 * 아트워크, 목업 PSD, 결과 JPG 파일을 관리
 */
export class FileManager {
    constructor() {
        this.artwork = null;       // { name, buffer, url }
        this.mockups = [];         // [{ name, buffer }]
        this.results = [];         // [{ name, buffer, url }]
    }

    /**
     * File을 ArrayBuffer로 읽기
     */
    static readAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error(`파일 읽기 실패: ${file.name}`));
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * 아트워크 파일 설정
     */
    async setArtwork(file) {
        // 기존 URL 해제
        if (this.artwork?.url) URL.revokeObjectURL(this.artwork.url);

        const buffer = await FileManager.readAsArrayBuffer(file);
        const url = URL.createObjectURL(file);
        this.artwork = { name: file.name, buffer, url };
        return this.artwork;
    }

    /**
     * 목업 PSD 추가
     */
    async addMockup(file) {
        if (this.mockups.length >= 10) {
            throw new Error('목업은 최대 10개까지 추가할 수 있습니다.');
        }
        if (!file.name.toLowerCase().endsWith('.psd')) {
            throw new Error('PSD 파일만 업로드할 수 있습니다.');
        }
        const buffer = await FileManager.readAsArrayBuffer(file);
        const mockup = { name: file.name, buffer };
        this.mockups.push(mockup);
        return mockup;
    }

    /**
     * 목업 제거
     */
    removeMockup(index) {
        this.mockups.splice(index, 1);
    }

    /**
     * 결과 JPG 추가
     */
    addResult(jpgBuffer, index) {
        const blob = new Blob([jpgBuffer], { type: 'image/jpeg' });
        const url = URL.createObjectURL(blob);
        const name = `p${index + 1}.jpg`;
        this.results.push({ name, buffer: jpgBuffer, url });
        return { name, url };
    }

    /**
     * 모든 결과 JPG 다운로드
     */
    downloadAll() {
        this.results.forEach((result, i) => {
            // 약간의 딜레이를 두어 브라우저가 동시 다운로드를 처리할 수 있게
            setTimeout(() => {
                const a = document.createElement('a');
                a.href = result.url;
                a.download = result.name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }, i * 200);
        });
    }

    /**
     * 모든 파일 및 URL 정리
     */
    clear() {
        if (this.artwork?.url) URL.revokeObjectURL(this.artwork.url);
        this.results.forEach(r => URL.revokeObjectURL(r.url));
        this.artwork = null;
        this.mockups = [];
        this.results = [];
    }

    /**
     * 파일 크기를 읽기 좋은 형식으로 변환
     */
    static formatSize(bytes) {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1048576).toFixed(1)} MB`;
    }
}
