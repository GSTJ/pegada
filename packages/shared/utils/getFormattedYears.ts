import { differenceInMonths, differenceInYears } from "date-fns";
import { t } from "i18next";

import { Language } from "../i18n/types/types";

export const getFormattedYears = ({
  birthDate,
  lng = Language.Default
}: {
  birthDate: string | Date;
  lng: string;
}) => {
  const parsedBirthDate = new Date(birthDate);
  const ageInMonths = differenceInMonths(new Date(), parsedBirthDate);
  const ageInYears = differenceInYears(new Date(), parsedBirthDate);
  const months = ageInMonths % 12;

  // Returns something like "1 year and 2 months"
  if (ageInYears === 0 && months !== 0) {
    return months !== 1
      ? t("dateFormatting.months", { replace: { unit: months }, lng })
      : t("dateFormatting.month", { replace: { unit: months }, lng });
  }

  if (ageInYears !== 0 && months === 0) {
    return ageInYears !== 1
      ? t("dateFormatting.years", { replace: { unit: ageInYears }, lng })
      : t("dateFormatting.year", { replace: { unit: ageInYears }, lng });
  }

  if (ageInYears !== 0 && months !== 0) {
    return `${
      ageInYears !== 1
        ? t("dateFormatting.years", { replace: { unit: ageInYears } })
        : t("dateFormatting.year", { replace: { unit: ageInYears } })
    } ${t("dateFormatting.and")} ${
      months !== 1
        ? t("dateFormatting.months", { replace: { unit: months } })
        : t("dateFormatting.month", { replace: { unit: months } })
    }`;
  }
};
