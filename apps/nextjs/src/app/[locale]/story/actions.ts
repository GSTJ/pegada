"use server";

import { headers } from "next/headers";

import { sendError } from "@pegada/api/errors/errors";
import {
  FeatureInterestLeadService,
  INTEREST_FEATURES,
  parseLeadSubmission,
} from "@pegada/api/services/feature-interest-lead-service";

import { DEFAULT_LOCALE_SEGMENT, isLocaleSegment } from "@/lib/locales";
import { checkRateLimit, createRateLimiter } from "@/lib/rate-limit";

import { ATTRIBUTION_PARAMS, readAttribution } from "./attribution";
import { EMAIL_FIELD, HONEYPOT_FIELD, LOCALE_FIELD } from "./fields";

/**
 * What the form got back.
 *
 * `ok_ignored` is the honeypot: nothing was written, and the form is expected
 * to show the same screen a real signup gets, so a script learns nothing from
 * retrying. `already_listed` is a genuine success with a second row avoided.
 * `failed` is the only one that asks the visitor to try again for a reason
 * that is ours.
 *
 * A type and not a constant: a `"use server"` file may only export functions,
 * so the form's starting state is declared next to the form.
 */
export type LeadFormState = {
  status:
    | "already_listed"
    | "captured"
    | "failed"
    | "idle"
    | "invalid"
    | "ok_ignored"
    | "rate_limited";
};

/**
 * Five a minute per IP. The form is one field and nobody fills it twice on
 * purpose, so this only ever bites a script; the prefix keeps its keys out of
 * the tRPC endpoint's namespace.
 */
const leadRatelimit = createRateLimiter({
  limit: 5,
  prefix: "ai-story-lead",
  window: "1 m",
});

const readField = (formData: FormData, name: string) => {
  const value = formData.get(name);

  return typeof value === "string" ? value : undefined;
};

/**
 * Records one email against the AI story fake door.
 *
 * The order matters: the honeypot and the address are checked before the rate
 * limiter is asked anything, so a typo does not spend the visitor's budget and
 * a bot never reaches Redis at all.
 */
export const submitAiStoryLead = async (
  _previous: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> => {
  const submission = parseLeadSubmission({
    email: readField(formData, EMAIL_FIELD),
    honeypot: readField(formData, HONEYPOT_FIELD),
  });

  if (submission.kind === "honeypot") return { status: "ok_ignored" };
  if (submission.kind === "invalid") return { status: "invalid" };

  const requestHeaders = await headers();

  const { allowed } = await checkRateLimit({
    headers: requestHeaders,
    limiter: leadRatelimit,
  });

  if (!allowed) return { status: "rate_limited" };

  // The hidden fields are as forgeable as the query string they came from, so
  // the locale is checked against the ones this site actually serves instead
  // of being written down as sent.
  const submittedLocale = readField(formData, LOCALE_FIELD) ?? "";
  const locale = isLocaleSegment(submittedLocale)
    ? submittedLocale
    : DEFAULT_LOCALE_SEGMENT;

  const attribution = readAttribution({
    [ATTRIBUTION_PARAMS.ref]: readField(formData, ATTRIBUTION_PARAMS.ref),
    [ATTRIBUTION_PARAMS.utmCampaign]: readField(
      formData,
      ATTRIBUTION_PARAMS.utmCampaign,
    ),
    [ATTRIBUTION_PARAMS.utmMedium]: readField(
      formData,
      ATTRIBUTION_PARAMS.utmMedium,
    ),
    [ATTRIBUTION_PARAMS.utmSource]: readField(
      formData,
      ATTRIBUTION_PARAMS.utmSource,
    ),
  });

  try {
    return await FeatureInterestLeadService.record({
      email: submission.email,
      feature: INTEREST_FEATURES.AI_STORY,
      locale,
      ref: attribution.ref,
      utmCampaign: attribution.utmCampaign,
      utmMedium: attribution.utmMedium,
      utmSource: attribution.utmSource,
      userAgent: requestHeaders.get("user-agent"),
    });
  } catch (error) {
    // A dropped lead is the one failure worth showing, so this is the single
    // path that asks the visitor to try again.
    sendError(error);

    return { status: "failed" };
  }
};
