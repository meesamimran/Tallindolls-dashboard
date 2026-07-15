// ============================================================
// Media upload — pushes a cropped image (data URL) to Cloudinary
// via an UNSIGNED upload preset and returns a public HTTPS URL.
// Meta's Graph API cannot accept direct uploads, so every asset
// must live at a public URL before publishing.
// ============================================================

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export function isUploadConfigured(): boolean {
  return Boolean(CLOUD_NAME && UPLOAD_PRESET);
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mime = /data:(.*?);/.exec(header)?.[1] || "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** Upload a data-URL image to Cloudinary; resolves to a public secure_url. */
export async function uploadToPublicUrl(dataUrl: string): Promise<string> {
  if (!isUploadConfigured()) {
    throw new Error(
      "Media hosting not configured. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET."
    );
  }

  const form = new FormData();
  form.append("file", dataUrlToBlob(dataUrl));
  form.append("upload_preset", UPLOAD_PRESET as string);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: form }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload failed: ${res.status} ${text.slice(0, 160)}`);
  }

  const json = await res.json();
  if (!json.secure_url) throw new Error("Upload succeeded but no URL returned");
  return json.secure_url as string;
}
