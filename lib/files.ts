/**
 * 파일 관리 모듈 (TypeScript 포팅)
 * 아트워크, 목업 PSD, 결과 JPG 파일을 관리
 */

export interface Artwork {
    name: string;
    buffer: ArrayBuffer;
    url: string;
}

export interface Mockup {
    name: string;
    buffer: ArrayBuffer;
}

export interface Result {
    name: string;
    buffer: ArrayBuffer;
    url: string;
}

export class FileManager {
    artwork: Artwork | null;
    mockups: Mockup[];
    results: Result[];

    constructor() {
        this.artwork = null;
        this.mockups = [];
        this.results = [];
    }

    /**
     * File을 ArrayBuffer로 읽기
     */
    static readAsArrayBuffer(file: File): Promise<ArrayBuffer> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as ArrayBuffer);
            reader.onerror = () => reject(new Error(`파일 읽기 실패: ${file.name}`));
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * 아트워크 파일 설정
     */
    async setArtwork(file: File): Promise<Artwork> {
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
    async addMockup(file: File): Promise<Mockup> {
        if (this.mockups.length >= 10) {
            throw new Error('목업은 최대 10개까지 추가할 수 있습니다.');
        }
        if (!file.name.toLowerCase().endsWith('.psd')) {
            throw new Error('PSD 파일만 업로드할 수 있습니다.');
        }
        const buffer = await FileManager.readAsArrayBuffer(file);
        const mockup: Mockup = { name: file.name, buffer };
        this.mockups.push(mockup);
        return mockup;
    }

    /**
     * 목업 제거
     */
    removeMockup(index: number): void {
        this.mockups.splice(index, 1);
    }

    /**
     * 결과 JPG 추가
     */
    addResult(jpgBuffer: ArrayBuffer, index: number): Result {
        const blob = new Blob([jpgBuffer], { type: 'image/jpeg' });
        const url = URL.createObjectURL(blob);
        const name = `p${index + 1}.jpg`;
        const result: Result = { name, buffer: jpgBuffer, url };
        this.results.push(result);
        return result;
    }

    /**
     * 모든 결과 JPG 다운로드
     */
    downloadAll(): void {
        this.results.forEach((result, i) => {
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
     * 단일 결과 다운로드
     */
    downloadOne(index: number): void {
        const result = this.results[index];
        if (!result) return;
        const a = document.createElement('a');
        a.href = result.url;
        a.download = result.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    /**
     * 모든 파일 및 URL 정리
     */
    clear(): void {
        if (this.artwork?.url) URL.revokeObjectURL(this.artwork.url);
        this.clearResults();
        this.artwork = null;
        this.mockups = [];
    }

    /**
     * 기존 결과 해제 및 초기화
     */
    clearResults(): void {
        this.results.forEach(r => URL.revokeObjectURL(r.url));
        this.results = [];
    }

    /**
     * 파일 크기를 읽기 좋은 형식으로 변환
     */
    static formatSize(bytes: number): string {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1048576).toFixed(1)} MB`;
    }
}
