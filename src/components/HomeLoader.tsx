import { useEffect, useState } from "react";
import { BlueberryMark } from "@/components/ui/blueberry-mark";

/**
 * Beat 0, the home loader (SITE-REPLAN.md section 7). Once per tab session, 900 ms at most.
 *
 * Two full-screen sheets in the deep violets slide off to the left, the back one 70 ms after
 * the front, while the berry drops in from above and squashes on landing. Ported from the
 * portfolio's loader: andliu-portfolio app/globals.css:446-460 (the sheets, the drop, the
 * reduced branch) and components/site/loader.tsx (the run-then-wipe sequence). The CSS is
 * the `.home-loader` block in src/components/home.css.
 *
 * WHY THE TIMING IS ALL CSS. The first version started the wipe from a 110 ms setTimeout and
 * measured it firing at 130 to 225 ms on the production build: the page is busy for a moment
 * after it mounts, and a JS timer waits for that. CSS animation delays run on the compositor
 * and do not wait, so the sheets now leave on time however busy the page is. The wipe starts
 * at 110 ms, the back sheet trails by 70 ms and the wipe takes --bb-dur-wipe (720 ms): the
 * last pixel clears at 900 ms. Reduced motion: the whole loader fades where it stands in
 * 120 ms and the berry is still.
 *
 * JS only removes the finished node, and when it does is invisible: by then the sheets are
 * off screen, and `pointer-events: none` means an impatient first click always lands on the
 * page underneath.
 */
const REMOVE_AT_MS = 1100;

export function HomeLoader() {
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setGone(true), REMOVE_AT_MS);
    return () => window.clearTimeout(id);
  }, []);

  if (gone) return null;
  return (
    <div aria-hidden className="home-loader">
      <div className="home-loader__sheet home-loader__sheet--back" />
      <div className="home-loader__sheet home-loader__sheet--front">
        <span className="home-loader__berry">
          <BlueberryMark eyes mood="happy" className="h-full w-full" />
        </span>
      </div>
    </div>
  );
}
