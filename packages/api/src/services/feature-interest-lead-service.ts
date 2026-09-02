import prisma from "@pegada/database";
import { Prisma } from "@prisma/client";
import { z } from "zod";

/**
 * Fake doors: pages that describe a feature we have not built and count how
 * many people ask for it. Each one owns a key here, and the key is what the
 * readout counts, so it has to stay stable once a page is live.
 */
export const INTEREST_FEATURES = {
  AI_STORY: "ai_story",
} as const;

export type InterestFeature =
  (typeof INTEREST_FEATURES)[keyof typeof INTEREST_FEATURES];

/**
 * How an address is stored, and therefore how the unique index reads it.
 * Without this, "Ana@Gmail.com " and "ana@gmail.com" are two rows and the
 * conversion rate the experiment reports is quietly inflated.
 */
export const normaliseEmail = (email: string) => email.trim().toLowerCase();

/**
 * Longest address RFC 5321 allows. Anything past it cannot be delivered to, so
 * it is either a typo or someone probing how much text the column takes.
 */
const MAX_EMAIL_LENGTH = 320;

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email()
  .max(MAX_EMAIL_LENGTH);

export type ParsedLeadSubmission =
  | { email: string; kind: "valid" }
  | { kind: "honeypot" }
  | { kind: "invalid" };

/**
 * Reads one submitted form. `honeypot` is whatever was typed into the decoy
 * field the form hides from people; the field's name is the web app's
 * business, so only its value gets this far.
 *
 * A filled honeypot is its own outcome rather than an error: the caller is
 * expected to answer a bot with the same success screen a person gets, so the
 * script has nothing to learn from trying again, and to write nothing down.
 */
export const parseLeadSubmission = ({
  email,
  honeypot,
}: {
  email: unknown;
  honeypot: unknown;
}): ParsedLeadSubmission => {
  if (typeof honeypot === "string" && honeypot.trim().length > 0) {
    return { kind: "honeypot" };
  }

  const parsed = emailSchema.safeParse(email);

  if (!parsed.success) return { kind: "invalid" };

  return { email: parsed.data, kind: "valid" };
};

export type FeatureInterestLeadInput = {
  email: string;
  feature: InterestFeature;
  locale: string;
  ref?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  userAgent?: string | null;
};

/**
 * `already_listed` is a success as far as the person is concerned: they are on
 * the list, which is what they asked for. It is a separate status only so the
 * funnel can tell a new address from a second visit by the same one.
 */
export type FeatureInterestLeadResult = {
  status: "already_listed" | "captured";
};

const isUniqueViolation = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === "P2002";

export class FeatureInterestLeadService {
  /**
   * Records one person's interest in one feature.
   *
   * An insert plus a caught P2002 rather than an upsert: an upsert would have
   * to decide what to overwrite on the second visit, and overwriting `ref` or
   * the utm columns would credit the last channel that touched someone instead
   * of the one that convinced them. The first row is the one that means
   * something, so the second write is dropped.
   */
  static async record({
    email,
    feature,
    locale,
    ref,
    utmSource,
    utmMedium,
    utmCampaign,
    userAgent,
  }: FeatureInterestLeadInput): Promise<FeatureInterestLeadResult> {
    try {
      await prisma.featureInterestLead.create({
        data: {
          email: normaliseEmail(email),
          feature,
          locale,
          ref: ref ?? null,
          utmSource: utmSource ?? null,
          utmMedium: utmMedium ?? null,
          utmCampaign: utmCampaign ?? null,
          userAgent: userAgent ?? null,
        },
      });

      return { status: "captured" };
    } catch (error) {
      if (isUniqueViolation(error)) return { status: "already_listed" };

      throw error;
    }
  }
}
