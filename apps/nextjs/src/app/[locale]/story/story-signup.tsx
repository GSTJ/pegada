"use client";

import type { LeadFormState } from "./actions";
import type { StoryAttribution } from "./attribution";

import type { ReactNode } from "react";

import {
  useActionState,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import Link from "next/link";

import {
  trackAiStoryLandingCtaClicked,
  trackAiStoryLeadCaptured,
} from "@/services/analytics";

import { submitAiStoryLead } from "./actions";
import { ATTRIBUTION_PARAMS } from "./attribution";
import { EMAIL_FIELD, HONEYPOT_FIELD, LOCALE_FIELD } from "./fields";

export type StorySignupCopy = {
  cta: string;
  form: {
    description: string;
    failed: string;
    honeypot: string;
    invalid: string;
    label: string;
    placeholder: string;
    privacy: string;
    rateLimited: string;
    submit: string;
    submitting: string;
  };
  success: string;
};

/**
 * Nothing has been submitted yet. Declared here rather than beside the
 * action: a `"use server"` file may only export functions.
 */
const INITIAL_LEAD_STATE: LeadFormState = { status: "idle" };

type StorySignupProps = {
  attribution: StoryAttribution;
  copy: StorySignupCopy;
  locale: string;
  /** Where the line under the field points. Locale aware, so built on the page. */
  privacyHref: string;
  /**
   * The two store badges, rendered under the thank you.
   *
   * Taken as children rather than built here: nothing is going to mail this
   * address today, so the one useful thing to hand someone who just left it
   * is the app itself, and the page already knows how to link to a store.
   * A server component's markup crosses this boundary as a slot, which is why
   * it arrives as a node instead of a pair of URLs.
   */
  children: ReactNode;
};

/**
 * A honeypot that is `display: none` is one a modern form-filler skips, so it
 * is moved off screen instead and kept out of the tab order and the
 * accessibility tree by hand.
 */
const HONEYPOT_STYLE =
  "absolute left-[-9999px] top-auto h-px w-px overflow-hidden";

/** The three outcomes a person should be thanked for. */
const isSuccess = (status: LeadFormState["status"]) =>
  status === "already_listed" ||
  status === "captured" ||
  status === "ok_ignored";

const errorMessage = (
  status: LeadFormState["status"],
  copy: StorySignupCopy,
) => {
  if (status === "invalid") return copy.form.invalid;
  if (status === "rate_limited") return copy.form.rateLimited;
  if (status === "failed") return copy.form.failed;

  return undefined;
};

/**
 * The desktop ask: one button, and behind it one field.
 *
 * A phone visitor is one tap from the App Store and gets a store button
 * instead; a laptop has no install to offer, so the address is the only way
 * that visit can continue. The page renders this from the first breakpoint up.
 *
 * The form starts hidden because the button click is the middle step of the
 * funnel this page has always measured. Someone who opens the form and stops
 * is a different signal from someone who read the page and left, and the two
 * are indistinguishable if the field is on screen from the start.
 */
export const StorySignup = ({
  attribution,
  copy,
  locale,
  privacyHref,
  children,
}: StorySignupProps) => {
  const [state, formAction, isPending] = useActionState(
    submitAiStoryLead,
    INITIAL_LEAD_STATE,
  );
  const [isOpen, setIsOpen] = useState(false);
  const emailId = useId();
  const emailRef = useRef<HTMLInputElement>(null);

  const context = { locale, ...attribution };

  useEffect(() => {
    if (state.status !== "captured" && state.status !== "already_listed") {
      return;
    }

    trackAiStoryLeadCaptured({ ...context, status: state.status });
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- keyed on the answer the action returned.
  }, [state]);

  // Focusing the field is what scrolls it into view, and it means the next
  // thing a visitor does after the click is type.
  useEffect(() => {
    if (isOpen) emailRef.current?.focus();
  }, [isOpen]);

  const handleCtaClick = useCallback(() => {
    trackAiStoryLandingCtaClicked({ locale, ...attribution });
    setIsOpen(true);
  }, [attribution, locale]);

  if (isSuccess(state.status)) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p
          aria-live="polite"
          className="max-w-md text-lg font-semibold text-text"
        >
          {copy.success}
        </p>
        {children}
      </div>
    );
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={handleCtaClick}
        className="rounded-full bg-primary px-8 py-4 text-lg font-semibold text-white transition-transform duration-200 ease-in-out hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary motion-reduce:transition-none motion-reduce:hover:scale-100"
      >
        {copy.cta}
      </button>
    );
  }

  const error = errorMessage(state.status, copy);

  return (
    <form action={formAction} className="flex w-full max-w-md flex-col gap-3">
      <input type="hidden" name={LOCALE_FIELD} value={locale} />
      <input
        type="hidden"
        name={ATTRIBUTION_PARAMS.ref}
        value={attribution.ref ?? ""}
      />
      <input
        type="hidden"
        name={ATTRIBUTION_PARAMS.utmSource}
        value={attribution.utmSource ?? ""}
      />
      <input
        type="hidden"
        name={ATTRIBUTION_PARAMS.utmMedium}
        value={attribution.utmMedium ?? ""}
      />
      <input
        type="hidden"
        name={ATTRIBUTION_PARAMS.utmCampaign}
        value={attribution.utmCampaign ?? ""}
      />

      <div className={HONEYPOT_STYLE} aria-hidden>
        <label htmlFor={`${emailId}-website`}>{copy.form.honeypot}</label>
        <input
          id={`${emailId}-website`}
          name={HONEYPOT_FIELD}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>

      <label htmlFor={emailId} className="text-sm font-semibold text-subtitle">
        {copy.form.label}
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          ref={emailRef}
          id={emailId}
          name={EMAIL_FIELD}
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder={copy.form.placeholder}
          aria-describedby={error ? `${emailId}-error` : undefined}
          className="flex-1 rounded-2xl border border-border bg-white px-4 py-3 text-base text-text outline-none placeholder:text-placeholder focus-visible:border-primary"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-2xl bg-primary px-6 py-3 text-base font-semibold text-white transition-opacity duration-200 disabled:opacity-60"
        >
          {isPending ? copy.form.submitting : copy.form.submit}
        </button>
      </div>
      <p
        id={`${emailId}-error`}
        aria-live="polite"
        className="text-sm font-medium text-subtitle"
      >
        {error ?? copy.form.description} {/*
         * An address is personal data, and this is the only form on the site
         * that asks for one, so the policy has to be a click away from it.
         */}
        <Link
          href={privacyHref}
          className="underline decoration-primary decoration-2 underline-offset-4 hover:text-primary"
        >
          {copy.form.privacy}
        </Link>
      </p>
    </form>
  );
};
