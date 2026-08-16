import { supabase } from "@/lib/supabase";

/**
 * Getting a picture from a TA's desktop onto a student's screen.
 *
 * Files go to the `lesson-media` bucket, which is public to read and staff only
 * to write. The URL that comes back is the file itself, which is the whole
 * point: a link somebody pastes from Google Drive serves an HTML viewer page
 * rather than image bytes, so it renders for the person who pasted it (their
 * browser is signed into Drive) and as a broken image for every student. That
 * failure is invisible to the only person in a position to notice it.
 */

const BUCKET = "lesson-media";

/** 10 MB, matching the bucket's own limit so the message is ours, not a 413. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const isImage = (file: File) => file.type.startsWith("image/");
export const isVideo = (file: File) => file.type.startsWith("video/");

/**
 * A safe, unique object name.
 *
 * Keeps the original extension so the browser gets a sensible content type, and
 * throws away the rest of the name: uploads are keyed by topic and a random id,
 * so two people dropping `screenshot.png` on the same day cannot collide, and a
 * filename with a slash or an accent in it cannot produce a broken path.
 */
function objectName(topicId: string, file: File): string {
  const ext = (file.name.split(".").pop() ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const safeTopic = topicId.replace(/[^a-zA-Z0-9_-]/g, "") || "lesson";
  return `${safeTopic}/${rand}${ext ? `.${ext}` : ""}`;
}

export async function uploadLessonMedia(
  file: File,
  topicId: string,
): Promise<{ url?: string; error?: string }> {
  if (!supabase) return { error: "Uploading is not configured for this build." };

  if (!isImage(file) && !isVideo(file)) {
    return { error: `${file.name} is not an image or a video.` };
  }
  // Checked here as well as by the bucket, so the message names the file and
  // the limit rather than arriving as a failed request.
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      error: `${file.name} is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 10 MB. For a long video, paste a YouTube link instead.`,
    };
  }

  const path = objectName(topicId, file);
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
  });

  if (error) {
    // The one worth translating: a student who somehow reached the editor.
    if (/row-level security|not authorized|Unauthorized/i.test(error.message)) {
      return { error: "Your account is not staff, so that upload was refused." };
    }
    return { error: error.message };
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl };
}

/**
 * A YouTube or Vimeo watch link turned into something embeddable.
 *
 * Returns null for anything else, and the caller then treats the URL as a
 * direct video file. Worth doing because the link a person copies from the
 * address bar is never the embed URL, and pasting the watch link into an
 * iframe shows YouTube's "refused to connect" page rather than the video.
 */
export function embedUrl(raw: string): string | null {
  const url = raw.trim();
  if (!url) return null;

  const youtube =
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/.exec(url);
  if (youtube) return `https://www.youtube.com/embed/${youtube[1]}`;

  const vimeo = /vimeo\.com\/(?:video\/)?(\d+)/.exec(url);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;

  return null;
}

/** Whether a URL points at a file we can put in a `<video>` rather than an iframe. */
export const isDirectVideo = (url: string) => /\.(mp4|webm|ogg)(\?|#|$)/i.test(url.trim());
