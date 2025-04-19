import { useTranslation } from "react-i18next";

import { getFormattedYears } from "@pegada/shared/utils/getFormattedYears";

export const useGetFormattedYears = () => {
  const { i18n } = useTranslation();

  return (birthDate: string | Date) =>
    getFormattedYears({ birthDate, lng: i18n.language });
};
