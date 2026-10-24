import { rememberReturn } from "@/lib/returnTo";

/**
 * What a signed-out visitor sees at #/app/admin (owner, 23 Oct: "add a sign in
 * CTA"), instead of being bounced to the path with no word of why. Signing in
 * brings them back here (returnTo.ts), and the role then decides the rest.
 *
 * Under the #/app gate (src/components/AppGate.tsx) a signed-out visitor
 * normally meets the sign-in page first, which carries its own staff line. This
 * card covers a build without Supabase and the frame after a sign-out. Inline
 * styles because admin.css arrives with the lazy viewer, not with this card.
 */
export function AdminSignIn() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "24px 16px",
      }}
    >
      <div
        style={{
          maxWidth: 360,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          padding: 24,
          borderRadius: 24,
          border: "2px solid var(--bb-border)",
          background: "var(--bb-card)",
          color: "var(--bb-foreground)",
          textAlign: "center",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Sign in to open the lesson viewer</h1>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: "var(--bb-muted-foreground)" }}>
          The viewer is for course staff. Your role comes from the course roster.
        </p>
        <a href="#/signin" className="btn3d btn3d--primary" onClick={() => rememberReturn(window.location.hash)}>
          Sign in
        </a>
      </div>
    </main>
  );
}

export default AdminSignIn;
