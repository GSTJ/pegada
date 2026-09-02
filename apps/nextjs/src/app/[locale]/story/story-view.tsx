"use client";

import type { StoryAttribution } from "./attribution";

import { useEffect } from "react";

import { trackAiStoryLandingViewed } from "@/services/analytics";

/**
 * The denominator, fired once per view of this page.
 *
 * It sits on its own rather than inside the sign-up form because the form is
 * only shown from the first breakpoint up: a phone gets the store button
 * instead, and a view that never rendered a form is still a view.
 *
 * Effects run twice under React's strict mode in development, which is why
 * this number is worth reading with `next build` before trusting it.
 */
export const StoryView = ({
  attribution,
  locale,
}: {
  attribution: StoryAttribution;
  locale: string;
}) => {
  useEffect(() => {
    trackAiStoryLandingViewed({ locale, ...attribution });
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- once per mount; the context is fixed for the life of the page.
  }, []);

  return null;
};
