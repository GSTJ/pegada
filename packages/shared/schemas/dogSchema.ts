import { isAfter, isBefore, parse } from "date-fns";
import { t } from "i18next";
import { z } from "zod";

const BIRTHDAY_FORMAT = "dd/MM/yyyy";

export const DOG_COLORS = [
  "BLACK",
  "WHITE",
  "BROWN",
  "TRICOLOR",
  "ALBINO",
  "GOLDEN"
] as const;

export const DOG_SIZES = [
  "EXTRASMALL",
  "SMALL",
  "MEDIUM",
  "LARGE",
  "GIANT"
] as const;

export const DOG_GENDERS = ["MALE", "FEMALE"] as const;

const MAX_AGE = 20;

const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 50;

const MAX_BIO_LENGTH = 500;

const MAX_WEIGHT = 150;

const dogSharedSchema = {
  name: z
    .string({
      errorMap: (a) => {
        if (a.code === "too_small") {
          return {
            message: t("formErrors.nameTooShort", { length: MIN_NAME_LENGTH })
          };
        }

        if (a.code === "too_big") {
          return {
            message: t("formErrors.nameTooLong", { length: MAX_NAME_LENGTH })
          };
        }

        return { message: a.message ?? "" };
      }
    })
    .min(2)
    .max(50),
  bio: z
    .string({
      errorMap: (a) => {
        if (a.code === "too_big") {
          return {
            message: t("formErrors.bioTooLong", { length: MAX_BIO_LENGTH })
          };
        }

        return { message: a.message ?? "" };
      }
    })
    .max(MAX_BIO_LENGTH),
  birthDate: z
    .string()
    .transform((value) => {
      // if it is already a date ISO string, return a date object
      if (value.includes("-")) {
        return new Date(value);
      }

      const date = parse(value, BIRTHDAY_FORMAT, new Date());

      return date;
    })
    .refine(
      (date) => {
        return !isNaN(date.getTime());
      },
      // t('formErrors.dateFormatWrong')
      { params: { i18n: "formErrors.dateFormatWrong" } }
    )
    .refine(
      (date) => {
        return isBefore(date, new Date());
      },
      // t('formErrors.dateIsAfterToday')
      { params: { i18n: "formErrors.dateIsAfterToday" } }
    )
    .refine(
      (date) => {
        const twentyYearsAgo = new Date();
        twentyYearsAgo.setFullYear(twentyYearsAgo.getFullYear() - MAX_AGE);
        return isAfter(date, twentyYearsAgo);
      },
      {
        params: {
          i18n: {
            key: "formErrors.birthDateTooOld",
            values: { years: MAX_AGE }
          }
        }
      }
    )
    .transform((date) => date.toISOString())
    .optional()
    .nullable()
    .or(z.literal("")),
  breedId: z
    .string({
      errorMap: (a) => {
        if (a.code === "too_small") {
          return { message: t("formErrors.selectBreed") };
        }

        return { message: a.message ?? "" };
      }
    })
    .min(1)
    .optional()
    .nullable()
    .or(z.literal("")),
  color: z.enum(DOG_COLORS).optional().nullable(),
  size: z.enum(DOG_SIZES).optional().nullable(),
  gender: z.enum(DOG_GENDERS),
  preferredMinAge: z.number().nullable().optional(),
  preferredMaxAge: z.number().nullable().optional(),
  preferredColor: z.enum(DOG_COLORS).optional().nullable(),
  preferredSize: z.enum(DOG_SIZES).nullable().optional(),
  preferredMaxDistance: z.number().nullable().optional(),
  preferredBreedId: z.string().nullable().optional(),
  weight: z.coerce
    .number({
      errorMap: (a) => {
        if (a.code === "too_big") {
          return {
            message: t("formErrors.weightTooBig", { weight: MAX_WEIGHT })
          };
        }

        return { message: a.message ?? "" };
      }
    })
    .max(MAX_WEIGHT)
    .optional()
    .nullable()
} as const;

export const IMAGE_STATUS = {
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  PENDING: "PENDING"
} as const;

export const dogServerSchema = z.object({
  ...dogSharedSchema,
  images: z
    .array(
      z.object({
        id: z.string().optional(),
        url: z.string(),
        position: z.number()
      })
    )
    .refine(
      (value) => {
        const hasImage = value.some((image) => image.url);
        return hasImage;
      },
      // t('formErrors.insertAtLeastOneImage')
      { params: { i18n: "formErrors.insertAtLeastOneImage" } }
    )
    .refine(
      (value) => {
        const imagesLoading = value.some(
          (image) => image.url && !image.url.startsWith("http")
        );
        return !imagesLoading;
      },
      // t('formErrors.waitImageUpload')
      { params: { i18n: "formErrors.waitImageUpload" } }
    )
});

const clientImages = z
  .array(
    z.object({
      id: z.string().optional(),
      url: z.string().optional()
    })
  )
  .refine(
    (value) => {
      const hasImage = value.some((image) => image.url);
      return hasImage;
    },
    // t('formErrors.insertAtLeastOneImage')
    { params: { i18n: "formErrors.insertAtLeastOneImage" } }
  )
  .refine(
    (value) => {
      const imagesLoading = value.some(
        (image) => image.url && !image.url.startsWith("http")
      );
      return !imagesLoading;
    },
    // t('formErrors.waitImageUpload')
    { params: { i18n: "formErrors.waitImageUpload" } }
  );

export const dogClientSchema = z.object({
  ...dogSharedSchema,
  images: clientImages
});

export const dogQuickClientSchema = z.object({
  name: dogSharedSchema.name,
  bio: dogSharedSchema.bio,
  gender: dogSharedSchema.gender,
  images: clientImages
});

export const dogCompleteClientSchema = z.object({
  size: dogSharedSchema.size,
  color: dogSharedSchema.color,
  breedId: dogSharedSchema.breedId,
  birthDate: dogSharedSchema.birthDate
});

export type DogServerSchema = z.infer<typeof dogServerSchema>;

export type DogClientSchema = z.infer<typeof dogClientSchema>;

export type DogQuickClientSchema = z.infer<typeof dogQuickClientSchema>;

export type DogCompleteClientSchema = z.infer<typeof dogCompleteClientSchema>;
