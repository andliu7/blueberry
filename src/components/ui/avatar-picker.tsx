import { useRef, useState } from "react";
import { Camera, Trash2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { profileStore, useProfile } from "@/lib/profile";

/**
 * Pick a picture, and keep a small square one.
 *
 * The file is drawn to a canvas at 256x256 with the short edge filling the
 * frame and the long edge cropped evenly from both sides, so the middle of the
 * photograph ends up in the middle of the circle. Letting CSS do the cropping
 * would look the same and still store the original, which for a phone photo is
 * several megabytes in a localStorage budget of a few for the whole origin.
 *
 * Re-encoded as WebP at 0.85, which is what the backgrounds already use.
 */
const SIZE = 256;

export function AvatarPicker({
  fallback,
  className,
}: {
  /** Shown when there is no picture: usually the Google one, else an icon. */
  fallback?: string;
  className?: string;
}) {
  const profile = useProfile();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const shown = profile.avatar ?? fallback;

  const pick = async (file: File) => {
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("That file is not an image.");
      return;
    }
    setBusy(true);
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no canvas");

      // Cover, then centre: scale by the *larger* ratio so neither axis leaves
      // a gap, and offset by half the overflow so the crop is even.
      const scale = Math.max(SIZE / bitmap.width, SIZE / bitmap.height);
      const w = bitmap.width * scale;
      const h = bitmap.height * scale;
      ctx.drawImage(bitmap, (SIZE - w) / 2, (SIZE - h) / 2, w, h);
      bitmap.close();

      profileStore.save({ ...profile, avatar: canvas.toDataURL("image/webp", 0.85) });
    } catch {
      setError("That image could not be read.");
    } finally {
      setBusy(false);
      // Cleared so choosing the same file twice still fires a change event.
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <div className="relative">
        <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-brand-from to-brand-to text-white">
          {shown ? (
            <img src={shown} alt="" className="size-full object-cover" />
          ) : (
            <User className="size-7" />
          )}
        </span>

        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          aria-label={shown ? "Change your picture" : "Add a picture"}
          className="absolute -right-1 -bottom-1 flex size-7 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:text-slate-900 disabled:opacity-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:text-stone-100"
        >
          <Camera className="size-3.5" />
        </button>

        <input
          ref={input}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void pick(file);
          }}
        />
      </div>

      <div className="min-w-0">
        <p className="text-xs text-slate-500 dark:text-stone-400">
          {busy ? "Reading that image…" : "A square crop from the middle, kept on this device."}
        </p>
        {profile.avatar && (
          <button
            type="button"
            onClick={() => profileStore.save({ ...profile, avatar: undefined })}
            className="mt-1 inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-slate-500 transition hover:text-red-600 dark:text-stone-400 dark:hover:text-red-400"
          >
            <Trash2 className="size-3" /> Remove
          </button>
        )}
        {error && (
          <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

export default AvatarPicker;
