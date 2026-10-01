"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { HTMLAttributes, KeyboardEvent, ReactNode } from "react";
import { ArrowUpRight, BookOpen, Check, Layers, MoveUpRight, Route, Signal, Wifi, BatteryFull } from "lucide-react";
import { cn } from "@/lib/utils";
import "./cinematic-landing-hero.css";

const MODES = [
  { id: "learn", label: "Learn", icon: BookOpen, title: "Start with the idea.", detail: "Read the lesson. Then put it to work.", action: "Explore lessons", topic: "Organic chemistry", item: "The course, in order" },
  { id: "practice", label: "Practice", icon: Route, title: "Work through it.", detail: "Draw each step and see where it went wrong.", action: "Open the trainer", topic: "Mechanism practice", item: "Your arrows. Clear feedback." },
  { id: "review", label: "Review", icon: Layers, title: "Come back to it.", detail: "Flip a card. Check your answer. Try again.", action: "Browse study decks", topic: "Study decks", item: "A little practice, often" },
] as const;

export interface CinematicHeroProps extends HTMLAttributes<HTMLElement> {
  brandName?: string;
  cardHeading?: string;
  cardDescription?: ReactNode;
  /** Real app routes, or absolute URLs when embedded on another site. */
  lessonHref?: string;
  practiceHref?: string;
  reviewHref?: string;
}

/** The supplied cinematic card, scoped to a product section rather than a page takeover. */
export function CinematicHero({
  brandName = "blueberry",
  cardHeading = "A little study.\nA clearer picture.",
  cardDescription = "Learn the idea, work through a mechanism, then test what stuck.",
  lessonHref = "#/lessons",
  practiceHref = "#/app",
  reviewHref = "#/study-decks",
  className,
  ...props
}: CinematicHeroProps) {
  const rootRef = useRef<HTMLElement>(null);
  const [selected, setSelected] = useState(0);
  const uid = useId();
  const mode = MODES[selected];
  const hrefs = [lessonHref, practiceHref, reviewHref];

  // Load animation code near the section. Text and links work before it arrives.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let cancelled = false;
    let dispose: (() => void) | undefined;
    const observer = new IntersectionObserver(async (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      try {
        const [{ gsap }, { ScrollTrigger }] = await Promise.all([
          import("gsap"), import("gsap/ScrollTrigger"),
        ]);
        if (cancelled) return;
        gsap.registerPlugin(ScrollTrigger);
        const media = gsap.matchMedia();
        media.add({
          desktop: "(min-width: 900px) and (min-height: 700px)",
          reduce: "(prefers-reduced-motion: reduce)",
          pointer: "(hover: hover) and (pointer: fine)",
        }, (context) => {
          if (context.conditions?.reduce) return;
          const card = root.querySelector<HTMLElement>(".cinema-card")!;
          const phone = root.querySelector<HTMLElement>(".cinema-phone-tilt")!;
          const desktop = context.conditions?.desktop;
          const timeline = gsap.timeline({ scrollTrigger: {
            trigger: root,
            start: desktop ? "top 8%" : "top 85%",
            end: desktop ? "+=600" : "center center",
            pin: desktop ? root : false,
            scrub: 0.65,
            invalidateOnRefresh: true,
          } });
          timeline.fromTo(card, { scale: desktop ? 0.94 : 1 }, { scale: 1, duration: 1, ease: "none" }, 0)
            .fromTo(root.querySelector(".cinema-phone-scroll"),
              { y: desktop ? 65 : 30, rotationY: desktop ? -18 : 0, rotationX: desktop ? 8 : 0 },
              { y: 0, rotationY: 0, rotationX: 0, duration: 1, ease: "power2.out" }, 0)
            .fromTo(root.querySelectorAll(".cinema-badge"),
              { y: 25, scale: 0.94 }, { y: 0, scale: 1, stagger: 0.1, duration: 0.7 }, 0.2);

          if (!context.conditions?.pointer) return;
          const rotateX = gsap.quickTo(phone, "rotationX", { duration: 0.7, ease: "power3.out" });
          const rotateY = gsap.quickTo(phone, "rotationY", { duration: 0.7, ease: "power3.out" });
          const move = (event: PointerEvent) => {
            const bounds = card.getBoundingClientRect();
            const x = (event.clientX - bounds.left) / bounds.width;
            const y = (event.clientY - bounds.top) / bounds.height;
            rotateX((0.5 - y) * 8);
            rotateY((x - 0.5) * 10);
            card.style.setProperty("--cinema-mouse-x", `${x * 100}%`);
            card.style.setProperty("--cinema-mouse-y", `${y * 100}%`);
          };
          const reset = () => { rotateX(0); rotateY(0); };
          card.addEventListener("pointermove", move);
          card.addEventListener("pointerleave", reset);
          return () => {
            card.removeEventListener("pointermove", move);
            card.removeEventListener("pointerleave", reset);
            card.style.removeProperty("--cinema-mouse-x");
            card.style.removeProperty("--cinema-mouse-y");
          };
        }, root);
        dispose = () => media.revert();
      } catch (error) {
        // An unavailable motion chunk must not take the product links with it.
        console.warn("Phone showcase animation unavailable", error);
      }
    }, { rootMargin: "300px" });
    observer.observe(root);
    return () => { cancelled = true; observer.disconnect(); dispose?.(); };
  }, []);

  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % MODES.length;
    else if (event.key === "ArrowLeft") next = (index + MODES.length - 1) % MODES.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = MODES.length - 1;
    else return;
    event.preventDefault();
    setSelected(next);
    rootRef.current?.querySelector<HTMLButtonElement>(`[data-mode="${MODES[next].id}"]`)?.focus();
  };

  return (
    <section {...props} ref={rootRef} className={cn("cinema-showcase", className)} aria-labelledby={`${uid}-heading`}>
      <div className="cinema-card">
        <div className="cinema-grid" aria-hidden="true" />
        <div className="cinema-sheen" aria-hidden="true" />
        <div className="cinema-copy">
          <span className="cinema-eyebrow">{brandName} / a closer look</span>
          <h2 id={`${uid}-heading`}>{cardHeading}</h2>
          <p>{cardDescription}</p>
          <a className="cinema-cta" href={practiceHref}>Try a mechanism <ArrowUpRight size={18} aria-hidden="true" /></a>
          <span className="cinema-note">Works in your browser.</span>
        </div>

        <div className="cinema-device-stage">
          <div className="cinema-phone-scroll">
            <div className="cinema-phone-tilt">
              <div className="cinema-hardware cinema-hardware-left" aria-hidden="true" />
              <div className="cinema-hardware cinema-hardware-right" aria-hidden="true" />
              <div className="cinema-phone-screen">
                <div className="cinema-status" aria-hidden="true"><span>9:41</span><span><Signal size={12} /><Wifi size={12} /><BatteryFull size={15} /></span></div>
                <div className="cinema-island" aria-hidden="true" />
                <div className="cinema-screen-header"><span>{brandName}<span className="cinema-brand-dot">.</span></span><span className="cinema-preview-label">Preview</span></div>
                <div className="cinema-tabs" role="tablist" aria-label="Explore Blueberry">
                  {MODES.map((item, index) => (
                    <button type="button" role="tab" key={item.id} data-mode={item.id} id={`${uid}-${item.id}`} aria-selected={selected === index} aria-controls={`${uid}-panel`} tabIndex={selected === index ? 0 : -1} onClick={() => setSelected(index)} onKeyDown={(event) => onTabKey(event, index)}>{item.label}</button>
                  ))}
                </div>
                <div className="cinema-panel" id={`${uid}-panel`} role="tabpanel" aria-labelledby={`${uid}-${mode.id}`} tabIndex={0}>
                  <div className="cinema-orbit" aria-hidden="true">
                    <svg viewBox="0 0 160 160"><circle cx="80" cy="80" r="66" fill="none" stroke="currentColor" strokeWidth="5" /><circle className="cinema-ring" cx="80" cy="80" r="66" fill="none" strokeWidth="5" strokeDasharray="415" strokeDashoffset={415 * (1 - (selected + 1) / MODES.length)} /></svg>
                    <mode.icon size={42} strokeWidth={1.3} />
                  </div>
                  <h3>{mode.title}</h3>
                  <p>{mode.detail}</p>
                  <div className="cinema-topic"><mode.icon size={21} aria-hidden="true" /><div><strong>{mode.topic}</strong><span>{mode.item}</span></div></div>
                  <a className="cinema-screen-cta" href={hrefs[selected]}>{mode.action}<MoveUpRight size={17} aria-hidden="true" /></a>
                </div>
                <div className="cinema-home-indicator" aria-hidden="true" />
              </div>
            </div>
          </div>
          <div className="cinema-badge cinema-badge-top" aria-hidden="true"><Check size={18} /><span>One step<br /><strong>at a time.</strong></span></div>
          <div className="cinema-badge cinema-badge-bottom" aria-hidden="true"><Layers size={18} /><span>Learn it.<br /><strong>Come back to it.</strong></span></div>
        </div>

        <div className="cinema-aside"><span className="cinema-edition">01 / 03</span><span className="cinema-wordmark">{brandName}<span>.</span></span><p>Learn.<br />Practice.<br />Remember.</p><span className="cinema-note">Explore the screen.</span></div>
      </div>
    </section>
  );
}
