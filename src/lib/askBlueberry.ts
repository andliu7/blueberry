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
    /**
     * Read the body before deciding what went wrong.
     *
     * `functions.invoke` reports every non-2xx as an `error`, so the first
     * version of this mapped 401 to `not-signed-in` and flattened everything
     * else to `unreachable`. That turned "the assistant is not configured yet"
     * and "Blueberry could not answer just now" into "connection issue", which
     * is the same silent failure the Edge Function was built to remove, moved
     * one layer out.
     *
     * The response is on `error.context`. It can only be read once, so a failure
     * to parse falls through to the generic case rather than throwing here.
     */
    const ctx = (error as { context?: Response }).context;
    if (ctx?.status === 401) return { ok: false, error: "not-signed-in" };

    if (ctx) {
      try {
        const body = await ctx.json();
        if (typeof body?.error === "string") {
          console.error("Ask Blueberry failed:", ctx.status, body.error);
          return { ok: false, error: body.error };
        }
      } catch {
        // Not JSON. A gateway or CORS failure looks like this, and that really
        // is a connection problem.
      }
    }
    console.error("Ask Blueberry failed:", ctx?.status ?? "no response", error.message);
    return { ok: false, error: "unreachable" };
  }
  return data as { ok: boolean; text?: string; error?: string };
}
