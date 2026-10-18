/**
 * The lesson's plain exit, with no "your progress is saved" sheet first.
 *
 * LessonLeave (LeaveSheet.tsx) hands the runners an exit that asks before it
 * leaves. The resume screen must not ask: it already says the work is saved,
 * so its X opening a second "saved" sheet on top was two stacked screens
 * saying the same thing. LessonLeave provides its real leave here, and the
 * resume screen's X reads it, so no runner needed a new prop.
 *
 * React context: a value a parent provides to any descendant without passing
 * it through every component in between.
 */

import { createContext } from "react";

export const LeaveNow = createContext<(() => void) | null>(null);
