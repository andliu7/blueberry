import { supabase } from "@/lib/supabase";

/**
 * One turn of Ask Blueberry, through the Edge Function.
 *
 * `functions.invoke` attaches the signed-in user's access token automatically,
 * which is the whole point of the move: the credential the browser already has
 * is one the server can actually verify. Apps Script could not, so it refused
 * every Supabase session and the UI reported nothing useful.
 */
export interface Turn {
  role: "user" | "assistant";
  content: string;
}

export async function askBlueberry(
  messages: Turn[],
): Promise<{ ok: boolean; text?: string; error?: string }> {
  if (!supabase) return { ok: false, error: "The assistant is not configured yet." };

  const { data, error } = await supabase.functions.invoke("chat", {
    body: { messages },
  });

  if (error) {
    // A non-2xx carries our own JSON body, and `not-signed-in` has to survive
    // so the caller can say something better than "that did not work".
    const ctx = (error as { context?: Response }).context;
    if (ctx?.status === 401) return { ok: false, error: "not-signed-in" };
    return { ok: false, error: "unreachable" };
  }
  return data as { ok: boolean; text?: string; error?: string };
}
