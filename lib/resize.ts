export interface ResizeTarget {
    id: string;
    label: string;
    shortLabel: string;
    slug: string;
    widthPx: number;
    heightPx: number;
    printSize: string;
    dpi: number;
}

export interface DecodedArtwork {
    image: CanvasImageSource;
    width: number;
    height: number;
    dispose: () => void;
}

export interface ContainPlacement {
    dx: number;
    dy: number;
    dw: number;
    dh: number;
}

export const RESIZE_TARGETS: ResizeTarget[] = [
    {
        id: '2-3',
        label: '2:3 Ratio',
        shortLabel: '24x36 in',
        slug: '2x3-24x36in',
        widthPx: 7200,
        heightPx: 10800,
        printSize: '24 x 36 inch',
        dpi: 300,
    },
    {
        id: 'iso-a1',
        label: 'ISO A1',
        shortLabel: '594 x 841 mm',
        slug: 'iso-a1',
        widthPx: 7016,
        heightPx: 9933,
        printSize: 'A1 (594 x 841 mm)',
        dpi: 300,
    },
    {
        id: '4-5',
        label: '4:5 Ratio',
        shortLabel: '24x30 in',
        slug: '4x5-24x30in',
        widthPx: 7200,
        heightPx: 9000,
        printSize: '24 x 30 inch',
        dpi: 300,
    },
    {
        id: '3-4',
        label: '3:4 Ratio',
        shortLabel: '18x24 in',
        slug: '3x4-18x24in',
        widthPx: 5400,
        heightPx: 7200,
        printSize: '18 x 24 inch',
        dpi: 300,
    },
    {
        id: '5x7',
        label: '5x7 Print',
        shortLabel: '5x7 in',
        slug: '5x7in',
        widthPx: 1500,
        heightPx: 2100,
        printSize: '5 x 7 inch',
        dpi: 300,
    },
    {
        id: '11x14',
        label: '11x14 Print',
        shortLabel: '11x14 in',
        slug: '11x14in',
        widthPx: 3300,
        heightPx: 4200,
        printSize: '11 x 14 inch',
        dpi: 300,
    },
];

export function buildResizeFileName(target: ResizeTarget): string {
    return `product-${target.slug}-${target.dpi}dpi.jpg`;
}

export function calculateContainPlacement(
    sourceWidth: number,
    sourceHeight: number,
    targetWidth: number,
    targetHeight: number,
): ContainPlacement {
    const sourceAspect = sourceWidth / sourceHeight;
    const targetAspect = targetWidth / targetHeight;

    if (sourceAspect > targetAspect) {
        const dw = targetWidth;
        const dh = targetWidth / sourceAspect;
        return {
            dx: 0,
            dy: (targetHeight - dh) / 2,
            dw,
            dh,
        };
    }

    const dh = targetHeight;
    const dw = targetHeight * sourceAspect;
    return {
        dx: (targetWidth - dw) / 2,
        dy: 0,
        dw,
        dh,
    };
}

export function getContainScaleFactor(sourceWidth: number, sourceHeight: number, target: ResizeTarget): number {
    return Math.min(target.widthPx / sourceWidth, target.heightPx / sourceHeight);
}

export async function decodeArtwork(file: Blob): Promise<DecodedArtwork> {
    if (typeof createImageBitmap === 'function') {
        const bitmap = await createImageBitmap(file);
        return {
            image: bitmap,
            width: bitmap.width,
            height: bitmap.height,
            dispose: () => bitmap.close(),
        };
    }

    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.decoding = 'async';
    image.src = objectUrl;
    await image.decode();

    return {
        image,
        width: image.naturalWidth,
        height: image.naturalHeight,
        dispose: () => URL.revokeObjectURL(objectUrl),
    };
}

export async function readArtworkDimensions(file: Blob): Promise<{ width: number; height: number }> {
    const decoded = await decodeArtwork(file);
    try {
        return { width: decoded.width, height: decoded.height };
    } finally {
        decoded.dispose();
    }
}

export async function renderResizeTarget(
    source: DecodedArtwork,
    target: ResizeTarget,
    quality = 0.92,
): Promise<Blob> {
    const canvas = document.createElement('canvas');
    canvas.width = target.widthPx;
    canvas.height = target.heightPx;

    const context = canvas.getContext('2d', { alpha: false });
    if (!context) {
        throw new Error('브라우저 캔버스를 초기화할 수 없습니다.');
    }

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';

    const placement = calculateContainPlacement(source.width, source.height, target.widthPx, target.heightPx);
    context.drawImage(
        source.image,
        placement.dx,
        placement.dy,
        placement.dw,
        placement.dh,
    );

    const baseBlob = await canvasToBlob(canvas, 'image/jpeg', quality);
    const densityPatched = patchJpegDensity(await baseBlob.arrayBuffer(), target.dpi);
    canvas.width = 0;
    canvas.height = 0;

    return new Blob([densityPatched], { type: 'image/jpeg' });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error('JPG 변환에 실패했습니다.'));
                return;
            }
            resolve(blob);
        }, type, quality);
    });
}

export function patchJpegDensity(buffer: ArrayBuffer, dpi: number): ArrayBuffer {
    const bytes = new Uint8Array(buffer.slice(0));
    if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
        return bytes.buffer;
    }

    let offset = 2;
    while (offset + 4 < bytes.length) {
        if (bytes[offset] !== 0xff) {
            break;
        }

        const marker = bytes[offset + 1];
        if (marker === 0xda || marker === 0xd9) {
            break;
        }

        const segmentLength = (bytes[offset + 2] << 8) | bytes[offset + 3];
        if (segmentLength < 2 || offset + 2 + segmentLength > bytes.length) {
            break;
        }

        const isJfifSegment =
            marker === 0xe0 &&
            bytes[offset + 4] === 0x4a &&
            bytes[offset + 5] === 0x46 &&
            bytes[offset + 6] === 0x49 &&
            bytes[offset + 7] === 0x46 &&
            bytes[offset + 8] === 0x00;

        if (isJfifSegment && segmentLength >= 16) {
            bytes[offset + 11] = 0x01;
            bytes[offset + 12] = (dpi >> 8) & 0xff;
            bytes[offset + 13] = dpi & 0xff;
            bytes[offset + 14] = (dpi >> 8) & 0xff;
            bytes[offset + 15] = dpi & 0xff;
            return bytes.buffer;
        }

        offset += 2 + segmentLength;
    }

    return bytes.buffer;
}
