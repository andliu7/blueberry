import { BlueberryGame } from "@/game/BlueberryGame";

/**
 * The game, as one of the site's pages.
 *
 * `.bb-game` is the class the game's own stylesheet was scoped to when it moved
 * in. It used to be a `body` rule, which would have repainted every page on the
 * site; here it paints exactly the subtree the game occupies and nothing else.
 * It is also what the game's `--bb-*` colour variables hang off, so this wrapper
 * is load bearing rather than decorative.
 *
 * Nothing else belongs in this file. The game brings its own header, its own tab
 * bar and its own router; a site header above it would be a second set of chrome
 * over an app that already has one.
 */
export default function GamePage() {
  return (
    <div className="bb-game">
      <BlueberryGame />
    </div>
  );
}
