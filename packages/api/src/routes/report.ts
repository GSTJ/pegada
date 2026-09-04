import type {
  ReportReason as ReportReasonName,
  ReportTargetType as ReportTargetTypeName,
} from "@pegada/shared/analytics/events";

import { ANALYTICS_EVENTS } from "@pegada/shared/analytics/events";
import { ReportReason, ReportTargetType } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { captureEvent } from "../shared/analytics";
import { createTRPCRouter, protectedProcedure } from "../trpc";

/**
 * The wire vocabulary is snake_case to match every other analytics property,
 * while the column is a Postgres enum in the house SCREAMING_SNAKE style. These
 * two maps are the only place the two spellings meet.
 */
const TARGET_TYPES: Record<ReportTargetTypeName, ReportTargetType> = {
  dog: ReportTargetType.DOG,
  user: ReportTargetType.USER,
};

const REASONS: Record<ReportReasonName, ReportReason> = {
  fake_profile: ReportReason.FAKE_PROFILE,
  harassment: ReportReason.HARASSMENT,
  inappropriate_photos: ReportReason.INAPPROPRIATE_PHOTOS,
  other: ReportReason.OTHER,
  spam: ReportReason.SPAM,
};

/** Long enough to describe what happened, short enough to stay readable. */
export const REPORT_DETAILS_MAX_LENGTH = 500;

export const reportTargetTypeSchema = z.enum(["dog", "user"]);

export const reportReasonSchema = z.enum([
  "fake_profile",
  "harassment",
  "inappropriate_photos",
  "other",
  "spam",
]);

const createReportSchema = z.object({
  targetType: reportTargetTypeSchema,
  targetId: z.string().min(1),
  reason: reportReasonSchema,
  // Trimmed first, so a box holding only spaces is stored as "no free text"
  // rather than as a blank complaint.
  details: z
    .string()
    .trim()
    .max(REPORT_DETAILS_MAX_LENGTH)
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export const reportRouter = createTRPCRouter({
  /**
   * Files one complaint. The row is the point: the kill criterion for the
   * seeded team dogs in #273 is a count of reports per profile, and until now a
   * report left the app as an email and was never counted.
   *
   * The target is checked before the row is written. `relationMode = "prisma"`
   * means the column has no foreign key of its own, so a typo would otherwise
   * land in the table as a complaint about a profile that does not exist.
   */
  create: protectedProcedure
    .input(createReportSchema)
    .mutation(async ({ ctx, input }) => {
      const reporterId = ctx.session.user.id;

      if (input.targetType === "dog") {
        const dog = await ctx.db.dog.findFirst({
          where: { id: input.targetId, deletedAt: null },
          select: { userId: true },
        });

        if (!dog) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Dog not found",
          });
        }

        if (dog.userId === reporterId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A dog cannot be reported by its own owner",
          });
        }
      } else {
        if (input.targetId === reporterId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "An account cannot be reported by itself",
          });
        }

        const user = await ctx.db.user.findFirst({
          where: { id: input.targetId, deletedAt: null },
          select: { id: true },
        });

        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }
      }

      const report = await ctx.db.report.create({
        data: {
          reporterId,
          targetType: TARGET_TYPES[input.targetType],
          targetId: input.targetId,
          reason: REASONS[input.reason],
          details: input.details ?? null,
        },
        select: { id: true, createdAt: true },
      });

      // Sent from here rather than from the app so it cannot be dropped by an
      // ad blocker, and so the event count and the table always agree.
      captureEvent(reporterId, ANALYTICS_EVENTS.REPORT_SUBMITTED, {
        reason: input.reason,
        target_id: input.targetId,
        target_type: input.targetType,
      });

      return { id: report.id, createdAt: report.createdAt };
    }),
});
