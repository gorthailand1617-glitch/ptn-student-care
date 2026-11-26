import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { isFirebaseConfigured, storage } from '../services/dataService';

const TARGET_SIZE = 400; // 400x400 px square

/**
 * Center-crops and compresses an Image or Video element into a 400x400 square
 * WebP/JPEG Data URL (<= ~80KB) using HTML5 Canvas.
 */
function renderSquareToDataUrl(
  source: HTMLImageElement | HTMLVideoElement,
  srcW: number,
  srcH: number,
  quality = 0.75
): string {
  const canvas = document.createElement('canvas');
  canvas.width = TARGET_SIZE;
  canvas.height = TARGET_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const side = Math.min(srcW, srcH);
  const sx = (srcW - side) / 2;
  const sy = (srcH - side) / 2;

  ctx.drawImage(source, sx, sy, side, side, 0, 0, TARGET_SIZE, TARGET_SIZE);

  // Prefer WebP; fall back to JPEG if browser doesn't support WebP encoding
  let dataUrl = canvas.toDataURL('image/webp', quality);
  if (!dataUrl.startsWith('data:image/webp')) {
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }
  return dataUrl;
}

export function compressProfileImageFile(file: File, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        resolve(renderSquareToDataUrl(img, img.width, img.height, quality));
      };
      img.onerror = reject;
      img.src = String(reader.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function captureVideoFrameAsSquare(video: HTMLVideoElement, quality = 0.75): string {
  const w = video.videoWidth || 400;
  const h = video.videoHeight || 400;
  return renderSquareToDataUrl(video, w, h, quality);
}

/**
 * Dual-Mode Storage Helper:
 * - Firebase Mode: uploads to /students/{studentCode}/{fileName} and returns download URL
 * - Demo Mode: returns the compressed Base64 Data URL for localStorage persistence
 */
export async function storeProfilePhoto(
  studentCode: string,
  fileName: string,
  compressedDataUrl: string
): Promise<string> {
  if (isFirebaseConfigured && storage) {
    try {
      const storageRef = ref(storage, `students/${studentCode}/${fileName}`);
      await uploadString(storageRef, compressedDataUrl, 'data_url');
      return await getDownloadURL(storageRef);
    } catch {
      return compressedDataUrl;
    }
  }
  return compressedDataUrl;
}
