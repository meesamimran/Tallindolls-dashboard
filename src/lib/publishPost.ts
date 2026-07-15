// ============================================================
// Shared publish helper — used by the composer (quick publish)
// and the approval queue (publish-on-approve). Hosts the
// formatted asset to a public URL, then calls the platform
// route. Returns a uniform result.
// ============================================================

import { uploadToPublicUrl, isUploadConfigured } from "@/lib/uploadMedia";

export interface PublishInput {
  platform: "instagram" | "facebook";
  surface: "feed" | "story" | "ad";
  imageDataUrl: string;
  captionText: string;
  /** optional permalink overrides handled by caller */
}

export interface PublishResult {
  ok: boolean;
  message: string;
  url?: string;
}

export async function publishPost(
  input: PublishInput
): Promise<PublishResult> {
  try {
    if (!isUploadConfigured()) {
      throw new Error("Media hosting not set (Cloudinary keys missing in .env.local).");
    }
    if (!input.imageDataUrl) throw new Error("No formatted image to publish.");

    // 1) host at a public HTTPS URL (Meta requirement)
    const imageUrl = await uploadToPublicUrl(input.imageDataUrl);

    // 2) publish via the platform route
    const endpoint =
      input.platform === "instagram"
        ? "/api/publish/instagram"
        : "/api/publish/facebook";
    const body =
      input.platform === "instagram"
        ? {
            imageUrl,
            caption: input.captionText,
            isStory: input.surface === "story",
          }
        : {
            imageUrl,
            message: input.surface === "story" ? undefined : input.captionText,
            isStory: input.surface === "story",
          };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Publish failed");

    return {
      ok: true,
      message: `Published to ${input.platform === "instagram" ? "Instagram" : "Facebook"} ${input.surface}.`,
      url: json.permalink,
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Publish failed",
    };
  }
}
