/**
 * Shrink a photo in the browser before upload: longest edge capped at
 * MAX_EDGE px (never upscaled), re-encoded as JPEG. Falls back to the
 * original file when the browser cannot decode it or when re-encoding
 * would not make it smaller.
 */

const MAX_EDGE = 1200;
const JPEG_QUALITY = 0.8;

export type CompressedImage = {
  blob: Blob;
  ext: string;
  contentType: string;
};

type Decoded = {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
};

/** Scale (width, height) so the longest edge is at most `max`, never enlarging. */
export function fitWithin(width: number, height: number, max: number = MAX_EDGE) {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

async function decodeWithBitmap(file: File): Promise<Decoded> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  return {
    source: bitmap,
    width: bitmap.width,
    height: bitmap.height,
    release: () => bitmap.close(),
  };
}

function decodeWithImg(file: File): Promise<Decoded> {
  const url = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () =>
      resolve({
        source: img,
        width: img.naturalWidth,
        height: img.naturalHeight,
        release: () => URL.revokeObjectURL(url),
      });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image could not be decoded"));
    };
    img.src = url;
  });
}

async function decode(file: File): Promise<Decoded> {
  try {
    return await decodeWithBitmap(file);
  } catch {
    return decodeWithImg(file);
  }
}

function toJpegBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
}

export async function compressImage(file: File): Promise<CompressedImage> {
  const original: CompressedImage = {
    blob: file,
    ext: file.name.split(".").pop()?.toLowerCase() || "jpg",
    contentType: file.type || "application/octet-stream",
  };

  let decoded: Decoded;
  try {
    decoded = await decode(file);
  } catch {
    return original;
  }

  try {
    const { width, height } = fitWithin(decoded.width, decoded.height);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return original;
    ctx.drawImage(decoded.source, 0, 0, width, height);

    const blob = await toJpegBlob(canvas);
    if (!blob || blob.size >= file.size) return original;
    return { blob, ext: "jpg", contentType: "image/jpeg" };
  } catch {
    return original;
  } finally {
    decoded.release();
  }
}
