import { useMutation } from "@tanstack/react-query";

import { compressToBase64, type CompressOptions } from "@/lib/compress-image";

/**
 * Mutation that compresses a user-picked `File` to a JPEG base64 data-URL.
 *
 * The mutation does **one thing**: takes a `File`, returns a base64 string.
 * Whatever happens next — attaching it to a JSON body, putting it in a
 * store, etc. — is the caller's responsibility (typically via the
 * `onSuccess` option passed to `mutate`).
 *
 * @example
 *   const { mutate: compress, isPending } = useImageUpload();
 *
 *   compress(file, {
 *     onSuccess: (base64) => sendToBackend(base64),
 *     onError:   (err)    => toast.error(err.message),
 *   });
 */
export function useImageUpload(options?: CompressOptions) {
  return useMutation<string, Error, File>({
    mutationFn: (file) => compressToBase64(file, options),
  });
}
