"use client";

import type { ComponentProps } from "react";
import { SignInCard, type AuthCardMode } from "@/components/ui/sign-in-card-2";

export function Registration({
  mode = "signup",
  ...props
}: Omit<ComponentProps<typeof SignInCard>, "mode"> & { mode?: Extract<AuthCardMode, "signup" | "signin"> }) {
  return <SignInCard mode={mode} {...props} />;
}

export default Registration;
