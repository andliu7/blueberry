"use client";

import React, { useId, useState } from "react";
import { Check, GraduationCap, User } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  STUDENT_LEVELS,
  profileStore,
  useProfile,
  type Profile,
  type StudentLevel,
} from "@/lib/profile";

/**
 * The floating-label field from the supplied component, kept and rebuilt.
 *
 * What was dropped and why:
 *
 * - The colours. It is written against shadcn tokens (`bg-background`,
 *   `border-border`, `text-muted-foreground`, `text-primary`) and this project
 *   defines none of them, so on the dark auth card it rendered as nothing.
 * - The particle canvas. Its cleanup removes the resize listener and never
 *   cancels the `requestAnimationFrame`, so the loop keeps running after the
 *   component unmounts, forever, holding the canvas alive with it. The page
 *   already has the aurora and the expanding circle behind this card; a third
 *   animated layer with a leak in it is not worth having.
 * - The GitHub, Twitter and LinkedIn buttons. There is no such sign-in, and
 *   each took a `name` prop it never rendered, so they were icon-only buttons
 *   with nothing for a screen reader to say.
 *
 * The label is a real `<label htmlFor>` rather than a floating `<span>`, so
 * clicking it focuses the field and a screen reader announces it.
 */
function Field({
  label,
  value,
  onChange,
  type = "text",
  icon,
  autoComplete,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  icon: React.ReactNode;
  autoComplete?: string;
  maxLength?: number;
}) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const lifted = focused || value.length > 0;

  return (
    <div className="relative">
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border bg-white/5 transition-colors duration-200",
          focused ? "border-white/45" : "border-white/12 hover:border-white/25",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 transition-colors duration-200",
            focused ? "text-white/80" : "text-white/40",
          )}
        >
          {icon}
        </span>

        <label
          htmlFor={id}
          className={cn(
            "pointer-events-none absolute left-10 transition-all duration-200 ease-out",
            lifted
              ? "top-1.5 text-[0.65rem] font-semibold tracking-wide text-white/60 uppercase"
              : "top-1/2 -translate-y-1/2 text-sm text-white/45",
          )}
        >
          {label}
        </label>

        <input
          id={id}
          type={type}
          value={value}
          maxLength={maxLength}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="min-h-11 w-full bg-transparent pt-5 pr-3 pb-1.5 pl-10 text-sm text-white outline-none"
        />
      </div>
    </div>
  );
}

/**
 * Name, name and level, saved locally.
 *
 * Deliberately not a password. There is no account server behind this site, so
 * the only place a password could go is a Google Sheet, and a study site is not
 * worth holding anyone's reused password in a spreadsheet. Google already
 * proves who you are and it does it without this page ever seeing a secret.
 */
export function ProfileFields({
  className,
  onSaved,
}: {
  className?: string;
  onSaved?: () => void;
}) {
  const saved = useProfile();
  const [draft, setDraft] = useState<Profile>(saved);
  const [justSaved, setJustSaved] = useState(false);

  const set = <K extends keyof Profile>(key: K, value: Profile[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setJustSaved(false);
  };

  const ready = Boolean(draft.firstName.trim() && draft.lastName.trim() && draft.level);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    profileStore.save({
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      username: draft.username.trim(),
      level: draft.level,
    });
    setJustSaved(true);
    onSaved?.();
  };

  return (
    <form onSubmit={submit} className={cn("space-y-3", className)}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="First name"
          value={draft.firstName}
          onChange={(v) => set("firstName", v)}
          icon={<User size={16} />}
          autoComplete="given-name"
          maxLength={60}
        />
        <Field
          label="Last name"
          value={draft.lastName}
          onChange={(v) => set("lastName", v)}
          icon={<User size={16} />}
          autoComplete="family-name"
          maxLength={60}
        />
      </div>

      <Field
        label="Username (optional)"
        value={draft.username}
        onChange={(v) => set("username", v)}
        icon={<User size={16} />}
        autoComplete="nickname"
        maxLength={30}
      />

      {/*
        A real `<select>`, not a custom listbox. It gets the platform's own
        picker on a phone, keyboard support for free, and nothing to get wrong.
      */}
      <div className="relative overflow-hidden rounded-xl border border-white/12 bg-white/5 transition-colors focus-within:border-white/45">
        <span aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-white/40">
          <GraduationCap size={16} />
        </span>
        <label
          htmlFor="blueberry-level"
          className="pointer-events-none absolute top-1.5 left-10 text-[0.65rem] font-semibold tracking-wide text-white/60 uppercase"
        >
          Where you are studying
        </label>
        <select
          id="blueberry-level"
          value={draft.level}
          onChange={(e) => set("level", e.target.value as StudentLevel | "")}
          className="min-h-11 w-full cursor-pointer appearance-none bg-transparent pt-5 pr-3 pb-1.5 pl-10 text-sm text-white outline-none [&>option]:bg-[#171327]"
        >
          <option value="">Choose one</option>
          {STUDENT_LEVELS.map((level) => (
            <option key={level.id} value={level.id}>
              {level.label}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={!ready}
        className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/25 px-4 text-sm font-semibold text-white transition duration-200 hover:border-white/60 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#171327] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45"
      >
        {justSaved ? (
          <>
            <Check className="size-4" /> Saved on this device
          </>
        ) : (
          "Save these details"
        )}
      </button>

      <p aria-live="polite" className="text-center text-xs leading-5 text-white/40">
        {justSaved
          ? "Kept in this browser for now. Signing in is what will carry it between machines."
          : "Saved in this browser. There are no accounts on the server yet."}
      </p>
    </form>
  );
}

export default ProfileFields;
