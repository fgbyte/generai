export interface CompressOptions {
  /**
   * Max dimension (width or height) the image will be scaled to. The longer
   * side is clamped to this value while preserving aspect ratio. Images
   * smaller than this are sent as-is.
   *
   * Defaults to `1024`, which is the sweet spot for vision models that need
   * enough detail to describe the image but don't benefit from 4K.
   */
  maxPx?: number;
  /**
   * JPEG encoder quality in the `0..1` range. Higher = larger payload.
   *
   * Defaults to `0.75`. For captions / general photo content this keeps the
   * payload around ~150–250 KB without visible degradation.
   */
  quality?: number;
}

/**
 * Compress a user-picked `File` down to a JPEG data-URL base64 string.
 *
 * Pure browser logic (canvas + `URL.createObjectURL`) — no NPM dependencies,
 * works inside the Tauri webview and any modern desktop/mobile browser.
 *
 * The returned string is a `data:image/jpeg;base64,...` URI ready to be
 * attached to a JSON body or stored in state. Always JPEG is used because
 * the production target (Tauri on Android + Safari iOS) supports it
 * everywhere, with smaller payloads than PNG for the same quality.
 *
 * @example
 *   const b64 = await compressToBase64(file, { maxPx: 1024, quality: 0.75 });
 */
export async function compressToBase64(
  file: File,
  { maxPx = 1024, quality = 0.75 }: CompressOptions = {},
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      // Free the original blob URL as soon as the bitmap is decoded —
      // we now own the image data via the canvas below.
      URL.revokeObjectURL(objectUrl);

      const longest = Math.max(img.width, img.height);
      const scale = longest > maxPx ? maxPx / longest : 1;
      const width = Math.round(img.width * scale);
      const height = Math.round(img.height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get 2D canvas context"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      try {
        resolve(canvas.toDataURL("image/jpeg", quality));
      } catch (err) {
        reject(err instanceof Error ? err : new Error("Failed to encode image"));
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not load image"));
    };

    img.src = objectUrl;
  });
}
